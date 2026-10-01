// The server runs in UTC, but advisors work in Uruguay/Argentina (UTC-3). Using
// `new Date().toISOString().slice(0, 10)` for "today" rolls over at 21:00 local
// time, so a task due today showed as overdue for the last 3 hours of the day.
export const ADVISOR_TIME_ZONE = "America/Montevideo";

const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: ADVISOR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "Today" as YYYY-MM-DD in the advisors' time zone. */
export function todayIso(now: Date = new Date()): string {
  return ymd.format(now);
}

/** Current month as YYYY-MM in the advisors' time zone. */
export function currentMonthIso(now: Date = new Date()): string {
  return todayIso(now).slice(0, 7);
}
