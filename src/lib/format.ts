/**
 * Formats a calendar date for the interface, e.g. "1 декабря 2026 г.".
 * Dates stored as a plain date (no time) are UTC midnight, so format in UTC
 * to avoid showing the previous day in time zones west of UTC.
 */
export function formatDate(date: Date, locale = "ru-RU"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
