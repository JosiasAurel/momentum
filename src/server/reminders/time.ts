export function startOfUtcDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export function endOfUtcDay(input: Date) {
  const start = startOfUtcDay(input);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function addUtcDays(input: Date, days: number) {
  const result = new Date(input);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function mergeUtcDayWithTime(day: Date, timeSource: Date) {
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      timeSource.getUTCHours(),
      timeSource.getUTCMinutes(),
      timeSource.getUTCSeconds(),
      timeSource.getUTCMilliseconds(),
    ),
  );
}
