/**
 * Parses a plain calendar date "YYYY-MM-DD" as UTC midnight.
 * Returns null for anything that is not a real date: JavaScript would turn
 * "2015-02-31" into March 3, so the result is compared with the input.
 */
export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}
