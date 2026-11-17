export type ThrottleOptions = {
  maxFailures: number;
  windowMs: number;
  /** Injectable clock for tests. */
  now?: () => number;
};

/**
 * In-memory limiter for failed sign-ins, keyed by e-mail.
 * Good enough for one server process; with several instances each keeps
 * its own count, so move it to the database or a cache before scaling out.
 */
export function createLoginThrottle({
  maxFailures,
  windowMs,
  now = Date.now,
}: ThrottleOptions) {
  const failures = new Map<string, number[]>();

  const recent = (key: string): number[] => {
    const cutoff = now() - windowMs;
    const kept = (failures.get(key) ?? []).filter((time) => time > cutoff);
    if (kept.length > 0) failures.set(key, kept);
    else failures.delete(key);
    return kept;
  };

  return {
    isBlocked: (key: string): boolean => recent(key).length >= maxFailures,
    recordFailure: (key: string): void => {
      failures.set(key, [...recent(key), now()]);
    },
    reset: (key: string): void => {
      failures.delete(key);
    },
  };
}

export type LoginThrottle = ReturnType<typeof createLoginThrottle>;
