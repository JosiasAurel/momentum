import { and, asc, eq, lte, sql } from "drizzle-orm";
import { env } from "@/env";
import type { DB } from "@/server/db";
import { db } from "@/server/db";
import { reminderEvent, task, user } from "@/server/db/schema";
import { DEFAULT_WORKER_BATCH_SIZE } from "@/server/reminders/constants";
import {
  addReminderAuditRows,
  syncReminderEventsForOpenTasks,
} from "@/server/reminders/planner";
import { rescheduleOverdueTasks } from "@/server/reminders/rescheduler";
import {
  createReminderEmailSender,
  type ReminderEmailSender,
} from "@/server/reminders/sender";
import { sendDailyMomentumRecaps } from "@/server/reminders/daily-momentum";

export type ReminderWorkerResult = {
  dryRun: boolean;
  plannedCount: number;
  rescheduledCount: number;
  followupReminderCount: number;
  dailyMomentumSentCount: number;
  dailyMomentumFailedCount: number;
  dailyMomentumSkippedCount: number;
  processedCount: number;
  sentCount: number;
  failedCount: number;
  cancelledCount: number;
  skippedCount: number;
};

export async function runReminderWorker(input?: {
  db?: DB;
  now?: Date;
  limit?: number;
  dryRun?: boolean;
  sender?: ReminderEmailSender;
}): Promise<ReminderWorkerResult> {
  const now = input?.now ?? new Date();
  const configuredLimit = env.REMINDER_WORKER_BATCH_SIZE
    ? Number(env.REMINDER_WORKER_BATCH_SIZE)
    : DEFAULT_WORKER_BATCH_SIZE;
  const limit = input?.limit ?? configuredLimit;
  const database = input?.db ?? db;
  const dryRun = input?.dryRun ?? false;
  const sender = input?.sender ?? createReminderEmailSender({ dryRun });
  const dailyMomentumResult = await sendDailyMomentumRecaps({
    db: database,
    now,
    sender,
    dryRun,
  });

  const plannedCount = await syncReminderEventsForOpenTasks({ db: database, now });
  const rescheduleResult = await rescheduleOverdueTasks({ db: database, now, limit });

  const dueRows = await database
    .select({ id: reminderEvent.id })
    .from(reminderEvent)
    .where(and(eq(reminderEvent.status, "pending"), lte(reminderEvent.scheduledFor, now)))
    .orderBy(asc(reminderEvent.scheduledFor))
    .limit(limit);

  let sentCount = 0;
  let failedCount = 0;
  let cancelledCount = 0;
  let skippedCount = 0;

  for (const dueRow of dueRows) {
    const outcome = await processReminderEvent({
      db: database,
      now,
      eventId: dueRow.id,
      sender,
      dryRun,
    });

    if (outcome === "sent") {
      sentCount += 1;
      continue;
    }
    if (outcome === "failed") {
      failedCount += 1;
      continue;
    }
    if (outcome === "cancelled") {
      cancelledCount += 1;
      continue;
    }

    skippedCount += 1;
  }

  return {
    dryRun,
    plannedCount,
    rescheduledCount: rescheduleResult.rescheduledCount,
    followupReminderCount: rescheduleResult.followupReminderCount,
    dailyMomentumSentCount: dailyMomentumResult.sentCount,
    dailyMomentumFailedCount: dailyMomentumResult.failedCount,
    dailyMomentumSkippedCount: dailyMomentumResult.skippedCount,
    processedCount: sentCount + failedCount + cancelledCount + skippedCount,
    sentCount,
    failedCount,
    cancelledCount,
    skippedCount,
  };
}

async function processReminderEvent(input: {
  db: DB;
  now: Date;
  eventId: string;
  sender: ReminderEmailSender;
  dryRun: boolean;
}): Promise<"sent" | "failed" | "cancelled" | "skipped"> {
  const [claimed] = await input.db
    .update(reminderEvent)
    .set({
      status: "processing",
      lockedAt: input.now,
      attemptCount: sql`${reminderEvent.attemptCount} + 1`,
      updatedAt: input.now,
    })
    .where(and(eq(reminderEvent.id, input.eventId), eq(reminderEvent.status, "pending")))
    .returning({
      id: reminderEvent.id,
    });

  if (!claimed) {
    return "skipped";
  }

  await addReminderAuditRows(input.db, [
    {
      reminderEventId: claimed.id,
      action: "claimed",
      details: "worker_claim",
    },
  ]);

  const [joined] = await input.db
    .select({
      reminderId: reminderEvent.id,
      idempotencyKey: reminderEvent.idempotencyKey,
      minutesBeforeDue: reminderEvent.minutesBeforeDue,
      dueSnapshotAt: reminderEvent.dueSnapshotAt,
      taskDueAt: task.dueAt,
      taskCompletedAt: task.completedAt,
      taskTitle: task.title,
      userEmail: user.email,
      userName: user.name,
    })
    .from(reminderEvent)
    .innerJoin(task, eq(reminderEvent.taskId, task.id))
    .innerJoin(user, eq(reminderEvent.userId, user.id))
    .where(eq(reminderEvent.id, input.eventId));

  if (!joined) {
    await input.db
      .update(reminderEvent)
      .set({ status: "failed", lastError: "joined_data_missing", updatedAt: input.now })
      .where(eq(reminderEvent.id, input.eventId));

    await addReminderAuditRows(input.db, [
      {
        reminderEventId: input.eventId,
        action: "failed",
        details: "joined_data_missing",
      },
    ]);

    return "failed";
  }

  const dueHasChanged =
    !joined.taskDueAt || joined.taskDueAt.getTime() !== joined.dueSnapshotAt.getTime();
  const taskNoLongerOpen = Boolean(joined.taskCompletedAt);

  if (dueHasChanged || taskNoLongerOpen) {
    await input.db
      .update(reminderEvent)
      .set({ status: "cancelled", updatedAt: input.now })
      .where(eq(reminderEvent.id, input.eventId));

    await addReminderAuditRows(input.db, [
      {
        reminderEventId: input.eventId,
        action: "cancelled",
        details: dueHasChanged ? "due_changed" : "task_completed",
      },
    ]);

    return "cancelled";
  }

  if (input.dryRun) {
    await input.db
      .update(reminderEvent)
      .set({
        status: "sent",
        providerMessageId: "dry-run",
        sentAt: input.now,
        updatedAt: input.now,
      })
      .where(eq(reminderEvent.id, input.eventId));

    await addReminderAuditRows(input.db, [
      {
        reminderEventId: input.eventId,
        action: "skipped",
        details: "dry_run_marked_sent",
      },
    ]);

    return "sent";
  }

  try {
    const sendResult = await input.sender.sendReminder({
      toEmail: joined.userEmail,
      toName: joined.userName,
      taskTitle: joined.taskTitle,
      dueAt: joined.dueSnapshotAt,
      minutesBeforeDue: joined.minutesBeforeDue,
      idempotencyKey: joined.idempotencyKey,
    });

    await input.db
      .update(reminderEvent)
      .set({
        status: "sent",
        providerMessageId: sendResult.providerMessageId,
        sentAt: input.now,
        updatedAt: input.now,
      })
      .where(eq(reminderEvent.id, input.eventId));

    await addReminderAuditRows(input.db, [
      {
        reminderEventId: input.eventId,
        action: "sent",
        details: sendResult.providerMessageId ? `provider:${sendResult.providerMessageId}` : "provider:ok",
      },
    ]);

    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_send_failure";

    await input.db
      .update(reminderEvent)
      .set({
        status: "failed",
        lastError: message,
        updatedAt: input.now,
      })
      .where(eq(reminderEvent.id, input.eventId));

    await addReminderAuditRows(input.db, [
      {
        reminderEventId: input.eventId,
        action: "failed",
        details: message,
      },
    ]);

    return "failed";
  }
}
