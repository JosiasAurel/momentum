import { describe, expect, it } from "bun:test";
import { shouldSendDailyMomentumForNow } from "@/server/reminders/daily-momentum";

describe("shouldSendDailyMomentumForNow", () => {
  it("does not send before 08:00 UTC", () => {
    const now = new Date("2026-03-20T07:59:59.000Z");
    expect(shouldSendDailyMomentumForNow(now)).toBe(false);
  });

  it("sends at or after 08:00 UTC", () => {
    const atBoundary = new Date("2026-03-20T08:00:00.000Z");
    const later = new Date("2026-03-20T12:30:00.000Z");

    expect(shouldSendDailyMomentumForNow(atBoundary)).toBe(true);
    expect(shouldSendDailyMomentumForNow(later)).toBe(true);
  });
});
