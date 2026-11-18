import { profiles, SCALE_MAX, SCALE_MIN, type AgeProfileKey } from "./profiles";

export const decisions = ["enrolled", "reserve", "review", "rejected"] as const;
export type DecisionKey = (typeof decisions)[number];

/** Default decision thresholds (docs/scoring.md). */
export const ENROLLED_MIN = 4;
export const RESERVE_MIN = 3.5;
export const REVIEW_MIN = 3;

/**
 * "Strong disagreement between coaches": the gap between the highest and the
 * lowest rating of one criterion, from two coaches or more. The value 2 is
 * fixed (Q-7, D-040): a one-point gap is normal noise on a 1-5 scale, two
 * points or more means the coaches see a different level. The child then
 * goes to "review" however high the total is. Change it here only.
 */
export const DISAGREEMENT_THRESHOLD = 2;

/** Ratings of one criterion by each coach, keyed by criterion. */
export type RatingsByCriterion = Readonly<Record<string, readonly number[]>>;

export type CriterionResult = {
  key: string;
  weight: number;
  /** Median of the coaches' ratings (may end in .5 for an even count). */
  score: number;
  /** Highest minus lowest rating. */
  spread: number;
  /** All ratings, ascending. */
  ratings: number[];
};

export type ScoreResult = {
  /** Weighted total, 1.00..5.00, rounded to hundredths. */
  total: number;
  criteria: CriterionResult[];
  strongDisagreement: boolean;
  /** Some criterion has a median of 1 (blocks "enrolled"). */
  hasLowCriterion: boolean;
  decision: DecisionKey;
};

/** Median; for an even count, the mean of the two middle values. */
export function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new RangeError("median of an empty list");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function assertRating(value: number): void {
  if (!Number.isInteger(value) || value < SCALE_MIN || value > SCALE_MAX) {
    throw new RangeError(
      `Rating must be a whole number ${SCALE_MIN}..${SCALE_MAX}, got ${value}`,
    );
  }
}

/**
 * Status by the default rules. A rating of 1 forbids "enrolled" (the child
 * drops to "reserve"); strong disagreement between coaches always means a
 * second look, whatever the total is.
 */
export function decide(input: {
  total: number;
  strongDisagreement: boolean;
  hasLowCriterion: boolean;
}): DecisionKey {
  if (input.strongDisagreement) return "review";
  if (input.total >= ENROLLED_MIN) {
    return input.hasLowCriterion ? "reserve" : "enrolled";
  }
  if (input.total >= RESERVE_MIN) return "reserve";
  if (input.total >= REVIEW_MIN) return "review";
  return "rejected";
}

/**
 * Total and decision of one child. Returns null while some criterion of the
 * profile has no rating yet (the score is not complete). Keys outside the
 * profile are ignored.
 */
export function calculateScore(
  profile: AgeProfileKey,
  ratings: RatingsByCriterion,
): ScoreResult | null {
  const criteria: CriterionResult[] = [];

  for (const { key, weight } of profiles[profile]) {
    const given = ratings[key];
    if (!given || given.length === 0) return null;
    for (const rating of given) assertRating(rating);

    const sorted = [...given].sort((a, b) => a - b);
    criteria.push({
      key,
      weight,
      score: median(sorted),
      spread: sorted[sorted.length - 1] - sorted[0],
      ratings: sorted,
    });
  }

  // Medians are multiples of 0.5 and weights are whole, so this sum is exact.
  const weighted = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
  const total = Math.round(weighted) / 100;

  const strongDisagreement = criteria.some(
    (c) => c.spread >= DISAGREEMENT_THRESHOLD,
  );
  const hasLowCriterion = criteria.some((c) => c.score === SCALE_MIN);

  return {
    total,
    criteria,
    strongDisagreement,
    hasLowCriterion,
    decision: decide({ total, strongDisagreement, hasLowCriterion }),
  };
}
