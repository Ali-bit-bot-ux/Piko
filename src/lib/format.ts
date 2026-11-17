/** Time zone people in Kazakhstan live in; used for moments in time (not plain dates). */
export const APP_TIME_ZONE = "Asia/Almaty";

/**
 * Formats a calendar date for the interface, e.g. "1 декабря 2026 г.".
 * Dates stored as a plain date (no time) are UTC midnight, so they are
 * formatted in UTC by default to avoid showing the previous day in time zones
 * west of UTC. For a moment in time (a timestamp) pass APP_TIME_ZONE.
 */
export function formatDate(
  date: Date,
  locale = "ru-RU",
  timeZone = "UTC",
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(date);
}
