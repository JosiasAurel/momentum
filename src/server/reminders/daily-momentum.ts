import { and, asc, eq, gte, lt } from "drizzle-orm";
import type { DB } from "@/server/db";
import { dailyMomentumEmail, dailyPlanItem, task, user } from "@/server/db/schema";
import { addUtcDays, startOfUtcDay } from "@/server/reminders/time";
import type { ReminderEmailSender } from "@/server/reminders/sender";

const DAILY_RECAP_HOUR_UTC = 8;

export function shouldSendDailyMomentumForNow(now: Date) {
  const todayUtc = startOfUtcDay(now);
  const sendAfterUtc = new Date(todayUtc);
  sendAfterUtc.setUTCHours(DAILY_RECAP_HOUR_UTC, 0, 0, 0);
  return now.getTime() >= sendAfterUtc.getTime();
}

export async function sendDailyMomentumRecaps(input: {
  db: DB;
  now: Date;
  sender: ReminderEmailSender;
  dryRun: boolean;
}) {
  const todayUtc = startOfUtcDay(input.now);
  const yesterdayUtc = addUtcDays(todayUtc, -1);
  if (!shouldSendDailyMomentumForNow(input.now)) {
    return { sentCount: 0, failedCount: 0, skippedCount: 0 };
  }

  const users = await input.db.query.user.findMany({
    columns: { id: true, name: true, email: true },
    orderBy: [asc(user.createdAt)],
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const person of users) {
    const idempotencyKey = `daily-momentum:${person.id}:${todayUtc.toISOString()}`;

    const existing = await input.db.query.dailyMomentumEmail.findFirst({
      where: and(eq(dailyMomentumEmail.userId, person.id), eq(dailyMomentumEmail.recapDate, todayUtc)),
      columns: { id: true },
    });

    if (existing) {
      skippedCount += 1;
      continue;
    }

    const completedYesterday = await input.db.query.task.findMany({
      where: and(eq(task.userId, person.id), gte(task.completedAt, yesterdayUtc), lt(task.completedAt, todayUtc)),
      columns: { title: true },
      orderBy: [asc(task.completedAt)],
      limit: 12,
    });

    const plannedToday = await input.db
      .select({
        title: task.title,
        dueAt: task.dueAt,
      })
      .from(dailyPlanItem)
      .innerJoin(task, eq(dailyPlanItem.taskId, task.id))
      .where(and(eq(dailyPlanItem.userId, person.id), eq(dailyPlanItem.planDate, todayUtc)))
      .orderBy(asc(task.dueAt), asc(task.createdAt))
      .limit(12);

    if (input.dryRun) {
      await input.db.insert(dailyMomentumEmail).values({
        id: crypto.randomUUID(),
        userId: person.id,
        recapDate: todayUtc,
        status: "sent",
        idempotencyKey,
        providerMessageId: "dry-run",
        sentAt: input.now,
      });
      sentCount += 1;
      continue;
    }

    try {
      const sendResult = await input.sender.sendDailyMomentum({
        toEmail: person.email,
        toName: person.name,
        recapDate: todayUtc,
        completedYesterday,
        plannedToday,
        idempotencyKey,
      });

      await input.db.insert(dailyMomentumEmail).values({
        id: crypto.randomUUID(),
        userId: person.id,
        recapDate: todayUtc,
        status: "sent",
        idempotencyKey,
        providerMessageId: sendResult.providerMessageId,
        sentAt: input.now,
      });

      sentCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_daily_momentum_send_error";

      await input.db.insert(dailyMomentumEmail).values({
        id: crypto.randomUUID(),
        userId: person.id,
        recapDate: todayUtc,
        status: "failed",
        idempotencyKey,
        lastError: message,
      });

      failedCount += 1;
    }
  }

  return { sentCount, failedCount, skippedCount };
}
