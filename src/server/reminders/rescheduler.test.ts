import { describe, expect, test } from "bun:test";
import { selectNextAvailableDueAt } from "@/server/reminders/rescheduler";

describe("selectNextAvailableDueAt", () => {
  test("picks the first day below the allocation cap and preserves time-of-day", async () => {
    const now = new Date("2026-03-20T08:00:00.000Z");
    const originalDueAt = new Date("2026-03-19T14:30:00.000Z");

    const dayLoads = new Map<string, number>([
      ["2026-03-21T00:00:00.000Z", 5],
      ["2026-03-22T00:00:00.000Z", 5],
      ["2026-03-23T00:00:00.000Z", 3],
    ]);

    const nextDueAt = await selectNextAvailableDueAt({
      originalDueAt,
      now,
      maxTasksPerDay: 5,
      getTaskCountForUtcDay: async (dayStart) => dayLoads.get(dayStart.toISOString()) ?? 0,
    });

    expect(nextDueAt.toISOString()).toBe("2026-03-23T14:30:00.000Z");
  });

  test("throws when no available day exists in the search window", async () => {
    await expect(
      selectNextAvailableDueAt({
        originalDueAt: new Date("2026-03-19T14:30:00.000Z"),
        now: new Date("2026-03-20T08:00:00.000Z"),
        maxTasksPerDay: 5,
        maxSearchDays: 2,
        getTaskCountForUtcDay: async () => 5,
      }),
    ).rejects.toThrow("Unable to find an available reschedule day");
  });
});
