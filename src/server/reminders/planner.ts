import { and, eq, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import type { DB } from "@/server/db";
import { reminderEvent, reminderEventAudit, task } from "@/server/db/schema";
import { REMINDER_OFFSETS_MINUTES } from "@/server/reminders/constants";

export type ReminderScheduleEntry = {
  minutesBeforeDue: number;
  scheduledFor: Date;
};

type SchedulableTask = {
  id: string;
  userId: string;
  dueAt: Date;
};

export function buildReminderSchedule(dueAt: Date, now: Date): ReminderScheduleEntry[] {
  if (dueAt.getTime() <= now.getTime()) {
    return [];
  }

  const entries = REMINDER_OFFSETS_MINUTES.map((minutesBeforeDue) => {
    return {
      minutesBeforeDue,
      scheduledFor: new Date(dueAt.getTime() - minutesBeforeDue * 60 * 1000),
    };
  }).filter((entry) => entry.scheduledFor.getTime() > now.getTime());

  const deduped = new Map<number, ReminderScheduleEntry>();
  for (const entry of entries) {
    deduped.set(entry.scheduledFor.getTime(), entry);
  }

  return [...deduped.values()].sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

export function buildReminderIdempotencyKey(input: {
  taskId: string;
  dueAt: Date;
  scheduledFor: Date;
  minutesBeforeDue: number;
}) {
  return [
    input.taskId,
    input.dueAt.toISOString(),
    input.scheduledFor.toISOString(),
    String(input.minutesBeforeDue),
  ].join(":");
}

async function addReminderAuditRows(
  db: DB,
  rows: Array<{
    reminderEventId: string;
    action: "planned" | "claimed" | "sent" | "failed" | "cancelled" | "skipped";
    details?: string;
  }>,
) {
  if (rows.length === 0) {
    return;
  }

  await db.insert(reminderEventAudit).values(
    rows.map((row) => ({
      id: crypto.randomUUID(),
      reminderEventId: row.reminderEventId,
      action: row.action,
      details: row.details,
    })),
  );
}

async function insertReminderEventsForTask(input: {
  db: DB;
  taskRow: SchedulableTask;
  now: Date;
  reason: string;
}) {
  const schedule = buildReminderSchedule(input.taskRow.dueAt, input.now);
  if (schedule.length === 0) {
    return 0;
  }

  const inserted = await input.db
    .insert(reminderEvent)
    .values(
      schedule.map((entry) => ({
        id: crypto.randomUUID(),
        taskId: input.taskRow.id,
        userId: input.taskRow.userId,
        dueSnapshotAt: input.taskRow.dueAt,
        scheduledFor: entry.scheduledFor,
        minutesBeforeDue: entry.minutesBeforeDue,
        idempotencyKey: buildReminderIdempotencyKey({
          taskId: input.taskRow.id,
          dueAt: input.taskRow.dueAt,
          scheduledFor: entry.scheduledFor,
          minutesBeforeDue: entry.minutesBeforeDue,
        }),
      })),
    )
    .onConflictDoNothing({ target: reminderEvent.idempotencyKey })
    .returning({ id: reminderEvent.id });

  await addReminderAuditRows(
    input.db,
    inserted.map((row) => ({
      reminderEventId: row.id,
      action: "planned" as const,
      details: input.reason,
    })),
  );

  return inserted.length;
}

export async function cancelPendingReminderEventsForTask(input: {
  db: DB;
  taskId: string;
  details: string;
}) {
  const pendingRows = await input.db
    .select({ id: reminderEvent.id })
    .from(reminderEvent)
    .where(and(eq(reminderEvent.taskId, input.taskId), eq(reminderEvent.status, "pending")));

  const pendingIds = pendingRows.map((row) => row.id);
  if (pendingIds.length === 0) {
    return 0;
  }

  await input.db
    .update(reminderEvent)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(inArray(reminderEvent.id, pendingIds));

  await addReminderAuditRows(
    input.db,
    pendingIds.map((id) => ({
      reminderEventId: id,
      action: "cancelled" as const,
      details: input.details,
    })),
  );

  return pendingIds.length;
}

async function cancelStalePendingReminderEvents(input: { db: DB; now: Date }) {
  const pendingRows = await input.db
    .select({
      reminderEventId: reminderEvent.id,
      dueSnapshotAt: reminderEvent.dueSnapshotAt,
      taskId: task.id,
      taskDueAt: task.dueAt,
      taskCompletedAt: task.completedAt,
    })
    .from(reminderEvent)
    .innerJoin(task, eq(reminderEvent.taskId, task.id))
    .where(eq(reminderEvent.status, "pending"));

  const staleIds = pendingRows
    .filter((row) => {
      if (row.taskCompletedAt) {
        return true;
      }
      if (!row.taskDueAt) {
        return true;
      }
      if (row.taskDueAt.getTime() <= input.now.getTime()) {
        return true;
      }
      return row.taskDueAt.getTime() !== row.dueSnapshotAt.getTime();
    })
    .map((row) => row.reminderEventId);

  if (staleIds.length === 0) {
    return 0;
  }

  await input.db
    .update(reminderEvent)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(inArray(reminderEvent.id, staleIds));

  await addReminderAuditRows(
    input.db,
    staleIds.map((id) => ({
      reminderEventId: id,
      action: "cancelled" as const,
      details: "task_due_state_changed",
    })),
  );

  return staleIds.length;
}

export async function syncReminderEventsForTask(input: {
  db: DB;
  taskId: string;
  now: Date;
  reason: string;
}) {
  const taskRow = await input.db.query.task.findFirst({
    where: and(eq(task.id, input.taskId), isNull(task.completedAt), isNotNull(task.dueAt), gt(task.dueAt, input.now)),
    columns: {
      id: true,
      userId: true,
      dueAt: true,
    },
  });

  if (!taskRow?.dueAt) {
    return 0;
  }

  await cancelPendingReminderEventsForTask({
    db: input.db,
    taskId: taskRow.id,
    details: `${input.reason}:replace_pending`,
  });

  return insertReminderEventsForTask({
    db: input.db,
    taskRow: {
      id: taskRow.id,
      userId: taskRow.userId,
      dueAt: taskRow.dueAt,
    },
    now: input.now,
    reason: input.reason,
  });
}

export async function syncReminderEventsForOpenTasks(input: { db: DB; now: Date }) {
  await cancelStalePendingReminderEvents(input);

  const openTasks = await input.db.query.task.findMany({
    where: and(isNull(task.completedAt), isNotNull(task.dueAt), gt(task.dueAt, input.now)),
    columns: {
      id: true,
      userId: true,
      dueAt: true,
    },
  });

  let insertedCount = 0;
  for (const openTask of openTasks) {
    if (!openTask.dueAt) {
      continue;
    }

    insertedCount += await insertReminderEventsForTask({
      db: input.db,
      taskRow: {
        id: openTask.id,
        userId: openTask.userId,
        dueAt: openTask.dueAt,
      },
      now: input.now,
      reason: "planner_sync",
    });
  }

  return insertedCount;
}

export { addReminderAuditRows };
