/** One saved (or still waiting) result of a child in a test. */
export type Attempt = {
  id: string;
  attempt: number;
  value: number;
  /** True while the result is only on the phone, waiting for a connection. */
  pending?: boolean;
  /** Client event id of a pending result: how it is matched after sending. */
  eventId?: string;
};

export type AttemptsOwner = { candidateId: string; attempts: Attempt[] };

/** Adds an attempt to a child unless that attempt number is already there. */
export function addAttempt<T extends AttemptsOwner>(
  owners: readonly T[],
  candidateId: string,
  attempt: Attempt,
): T[] {
  return owners.map((owner) =>
    owner.candidateId === candidateId &&
    !owner.attempts.some((existing) => existing.attempt === attempt.attempt)
      ? { ...owner, attempts: [...owner.attempts, attempt] }
      : owner,
  );
}

/** Pending attempts that reached the server get their real id and stop being pending. */
export function markSent<T extends AttemptsOwner>(
  owners: readonly T[],
  sent: readonly { eventId: string; measurementId: string }[],
): T[] {
  if (sent.length === 0) return [...owners];
  const byEvent = new Map(sent.map((s) => [s.eventId, s.measurementId]));
  return owners.map((owner) => ({
    ...owner,
    attempts: owner.attempts.map((attempt) => {
      const real = attempt.eventId ? byEvent.get(attempt.eventId) : undefined;
      if (!real) return attempt;
      return { id: real, attempt: attempt.attempt, value: attempt.value };
    }),
  }));
}

/** Pending attempts the server refused are removed again. */
export function dropPending<T extends AttemptsOwner>(
  owners: readonly T[],
  eventIds: readonly string[],
): T[] {
  if (eventIds.length === 0) return [...owners];
  const dropped = new Set(eventIds);
  return owners.map((owner) => ({
    ...owner,
    attempts: owner.attempts.filter(
      (attempt) => !(attempt.eventId && dropped.has(attempt.eventId)),
    ),
  }));
}
