/**
 * Why a result was corrected. A fixed list, not free text: the reason goes
 * into the append-only journal, where a typed name could never be removed.
 */
export const correctionReasons = [
  "late_start",
  "late_stop",
  "wrong_entry",
  "wrong_child",
  "other",
] as const;
export type CorrectionReason = (typeof correctionReasons)[number];
