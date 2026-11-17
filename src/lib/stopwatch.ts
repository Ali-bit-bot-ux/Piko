/** Stopwatch text for a number of milliseconds: "00:05.24" (minutes:seconds.hundredths). */
export function formatStopwatch(milliseconds: number): string {
  const safe = Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 0;
  const hundredths = Math.floor(safe / 10) % 100;
  const totalSeconds = Math.floor(safe / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
}

/** Seconds rounded to hundredths, the precision a hand stopwatch gives. */
export function toSeconds(milliseconds: number): number {
  return Math.round(Math.max(0, milliseconds) / 10) / 100;
}
