/**
 * In-memory limiter: at most `max` hits per key within `windowMs`. One server
 * process only; with several instances each keeps its own count, so move it
 * to the database or a cache before scaling out (see docs/handoff.md).
 */
export function createRateLimiter({
  max,
  windowMs,
  now = Date.now,
}: {
  max: number;
  windowMs: number;
  /** Injectable clock for tests. */
  now?: () => number;
}) {
  const hits = new Map<string, number[]>();

  return {
    /** Counts one hit; false when the key is over the limit (not counted). */
    allow(key: string): boolean {
      const cutoff = now() - windowMs;
      const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      hits.set(key, [...recent, now()]);
      return true;
    },
  };
}
