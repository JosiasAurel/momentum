import { describe, expect, test } from "bun:test";
import {
  buildReminderIdempotencyKey,
  buildReminderSchedule,
} from "@/server/reminders/planner";

describe("buildReminderSchedule", () => {
  test("creates increasing-frequency reminders as due date approaches", () => {
    const now = new Date("2026-03-20T09:00:00.000Z");
    const dueAt = new Date("2026-03-23T12:00:00.000Z");

    const schedule = buildReminderSchedule(dueAt, now);

    expect(schedule.map((item) => item.minutesBeforeDue)).toEqual([
      4320,
      1440,
      360,
      60,
      0,
    ]);
    expect(schedule[0]?.scheduledFor.toISOString()).toBe("2026-03-20T12:00:00.000Z");
    expect(schedule.at(-1)?.scheduledFor.toISOString()).toBe("2026-03-23T12:00:00.000Z");
  });

  test("keeps only reminders still in the future", () => {
    const now = new Date("2026-03-20T11:45:00.000Z");
    const dueAt = new Date("2026-03-20T12:00:00.000Z");

    const schedule = buildReminderSchedule(dueAt, now);

    expect(schedule).toHaveLength(1);
    expect(schedule[0]).toEqual({
      minutesBeforeDue: 0,
      scheduledFor: new Date("2026-03-20T12:00:00.000Z"),
    });
  });

  test("returns empty schedule when task is already due", () => {
    const now = new Date("2026-03-20T12:00:00.000Z");
    const dueAt = new Date("2026-03-20T12:00:00.000Z");

    expect(buildReminderSchedule(dueAt, now)).toEqual([]);
  });
});

describe("buildReminderIdempotencyKey", () => {
  test("is deterministic for the same reminder event", () => {
    const payload = {
      taskId: "task-1",
      dueAt: new Date("2026-03-23T12:00:00.000Z"),
      scheduledFor: new Date("2026-03-23T11:00:00.000Z"),
      minutesBeforeDue: 60,
    };

    expect(buildReminderIdempotencyKey(payload)).toBe(buildReminderIdempotencyKey(payload));
  });

  test("changes when reminder timing changes", () => {
    const dueAt = new Date("2026-03-23T12:00:00.000Z");
    const first = buildReminderIdempotencyKey({
      taskId: "task-1",
      dueAt,
      scheduledFor: new Date("2026-03-23T11:00:00.000Z"),
      minutesBeforeDue: 60,
    });
    const second = buildReminderIdempotencyKey({
      taskId: "task-1",
      dueAt,
      scheduledFor: new Date("2026-03-23T06:00:00.000Z"),
      minutesBeforeDue: 360,
    });

    expect(first).not.toBe(second);
  });
});
