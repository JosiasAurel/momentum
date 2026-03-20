import { and, count, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";
import type { DB } from "@/server/db";
import { overdueRescheduleEvent, reminderEvent, task } from "@/server/db/schema";
import {
  MAX_RESCHEDULE_SEARCH_DAYS,
  MAX_TASKS_PER_DAY,
} from "@/server/reminders/constants";
import {
  addUtcDays,
  endOfUtcDay,
  mergeUtcDayWithTime,
  startOfUtcDay,
} from "@/server/reminders/time";
import { syncReminderEventsForTask } from "@/server/reminders/planner";

export async function selectNextAvailableDueAt(input: {
  originalDueAt: Date;
  now: Date;
  maxTasksPerDay?: number;
  maxSearchDays?: number;
  getTaskCountForUtcDay: (dayStart: Date, dayEnd: Date) => Promise<number>;
}) {
  const maxTasksPerDay = input.maxTasksPerDay ?? MAX_TASKS_PER_DAY;
  const maxSearchDays = input.maxSearchDays ?? MAX_RESCHEDULE_SEARCH_DAYS;
  const tomorrowStart = addUtcDays(startOfUtcDay(input.now), 1);

  for (let offset = 0; offset < maxSearchDays; offset += 1) {
    const dayStart = addUtcDays(tomorrowStart, offset);
    const dayEnd = endOfUtcDay(dayStart);
    const countOnDay = await input.getTaskCountForUtcDay(dayStart, dayEnd);

    if (countOnDay < maxTasksPerDay) {
      return mergeUtcDayWithTime(dayStart, input.originalDueAt);
    }
  }

  throw new Error("Unable to find an available reschedule day within the configured search window");
}

export async function rescheduleOverdueTasks(input: { db: DB; now: Date; limit: number }) {
  const overdueTasks = await input.db.query.task.findMany({
    where: and(isNull(task.completedAt), isNotNull(task.dueAt), lt(task.dueAt, input.now)),
    orderBy: [task.dueAt],
    columns: {
      id: true,
      userId: true,
      dueAt: true,
    },
    limit: input.limit,
  });

  let rescheduledCount = 0;
  let followupReminderCount = 0;

  for (const overdueTask of overdueTasks) {
    if (!overdueTask.dueAt) {
      continue;
    }

    const taskId = overdueTask.id;
    const didReschedule = await input.db.transaction(async (tx) => {
      const currentTask = await tx.query.task.findFirst({
        where: and(eq(task.id, taskId), isNull(task.completedAt), isNotNull(task.dueAt), lt(task.dueAt, input.now)),
        columns: {
          id: true,
          userId: true,
          dueAt: true,
        },
      });

      if (!currentTask?.dueAt) {
        return false;
      }

      const nextDueAt = await selectNextAvailableDueAt({
        originalDueAt: currentTask.dueAt,
        now: input.now,
        getTaskCountForUtcDay: async (dayStart, dayEnd) => {
          const [row] = await tx
            .select({ value: count(task.id) })
            .from(task)
            .where(
              and(
                eq(task.userId, currentTask.userId),
                isNull(task.completedAt),
                isNotNull(task.dueAt),
                gte(task.dueAt, dayStart),
                lt(task.dueAt, dayEnd),
              ),
            );

          return Number(row?.value ?? 0);
        },
      });

      const [auditRecord] = await tx
        .insert(overdueRescheduleEvent)
        .values({
          id: crypto.randomUUID(),
          taskId: currentTask.id,
          userId: currentTask.userId,
          overdueDueAt: currentTask.dueAt,
          rescheduledDueAt: nextDueAt,
          idempotencyKey: `${currentTask.id}:${currentTask.dueAt.toISOString()}`,
          reason: "overdue_auto_reschedule",
        })
        .onConflictDoNothing({
          target: [overdueRescheduleEvent.taskId, overdueRescheduleEvent.overdueDueAt],
        })
        .returning({ id: overdueRescheduleEvent.id });

      if (!auditRecord) {
        return false;
      }

      const [updatedTask] = await tx
        .update(task)
        .set({
          dueAt: nextDueAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(task.id, currentTask.id),
            eq(task.dueAt, currentTask.dueAt),
            isNull(task.completedAt),
          ),
        )
        .returning({ id: task.id });

      if (!updatedTask) {
        throw new Error("Failed to atomically reschedule overdue task");
      }

      await tx
        .update(reminderEvent)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(and(eq(reminderEvent.taskId, currentTask.id), eq(reminderEvent.status, "pending")));

      return true;
    });

    if (!didReschedule) {
      continue;
    }

    rescheduledCount += 1;
    followupReminderCount += await syncReminderEventsForTask({
      db: input.db,
      taskId,
      now: input.now,
      reason: "overdue_reschedule_follow_up",
    });
  }

  return {
    rescheduledCount,
    followupReminderCount,
  };
}
