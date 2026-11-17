import type { SendOutcome } from "./offline-queue";

/**
 * Decides what the offline queue does with a result after the server answered:
 * - saved (or already saved before): done;
 * - a server fault ("generic"): try again later;
 * - any other refusal (bad value, closed intake, attempt taken...): it will
 *   never be accepted as it is, so drop it and tell the coach.
 */
export function outcomeOf(
  result: { ok: true } | { ok: false; code: string },
): SendOutcome {
  if (result.ok) return "sent";
  return result.code === "generic" ? "retry" : "drop";
}
