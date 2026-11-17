// Turning test results (seconds, counts) into a 1..5 score by age norms.
// The norms are NOT defined yet (Q-6): numbers must not be invented, so the
// config below is empty and every function answers "no norm" with null.
// Objective results do not influence the total until the norms exist (T-044).

import type { AgeProfileKey } from "./profiles";

export type TrialKey =
  "sprint_20m" | "shuttle_5_10_5" | "dribbling" | "passing" | "shooting";

const timedTrials: readonly TrialKey[] = [
  "sprint_20m",
  "shuttle_5_10_5",
  "dribbling",
];

export type TrialNorm = {
  /** Time: lower is better. Count: higher is better. */
  direction: "lower_is_better" | "higher_is_better";
  /**
   * Borders of scores 2, 3, 4 and 5, from weakest to strongest. A result
   * reaching limits[0] earns 2, limits[3] earns 5, anything weaker earns 1.
   * "Reaching" means <= for times and >= for counts.
   */
  limits: readonly [number, number, number, number];
};

export type TrialNorms = Partial<
  Record<TrialKey, Partial<Record<AgeProfileKey, TrialNorm>>>
>;

// TODO(Q-6): fill from the age-norm source once the owner names it.
export const trialNorms: TrialNorms = {};

/** The better of the attempts: the lowest time or the highest count. */
export function bestAttempt(
  trial: TrialKey,
  values: readonly number[],
): number | null {
  if (values.length === 0) return null;
  return timedTrials.includes(trial)
    ? Math.min(...values)
    : Math.max(...values);
}

function isValidNorm(norm: TrialNorm): boolean {
  const { limits, direction } = norm;
  if (!limits.every(Number.isFinite)) return false;
  for (let i = 1; i < limits.length; i += 1) {
    const ordered =
      direction === "lower_is_better"
        ? limits[i] < limits[i - 1]
        : limits[i] > limits[i - 1];
    if (!ordered) return false;
  }
  return true;
}

/**
 * Score 1..5 of a result, or null when there is no (valid) norm for this
 * test and age profile, or the value is not a finite number.
 */
export function normalizeTrialResult(
  trial: TrialKey,
  profile: AgeProfileKey,
  value: number,
  norms: TrialNorms = trialNorms,
): number | null {
  if (!Number.isFinite(value)) return null;
  const norm = norms[trial]?.[profile];
  if (!norm || !isValidNorm(norm)) return null;

  const reached = norm.limits.filter((limit) =>
    norm.direction === "lower_is_better" ? value <= limit : value >= limit,
  ).length;
  return 1 + reached;
}
