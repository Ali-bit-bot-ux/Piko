// Turning test results (seconds, counts) into a 1..5 score by age norms.
// Norms come from a documented source only (numbers are never invented);
// a test or age without a norm answers null. Objective results do not
// influence the total yet: the coach still scores each criterion (D-019).

export type TrialKey =
  "sprint_30m" | "shuttle_5_10_5" | "dribbling" | "passing" | "shooting";

const timedTrials: readonly TrialKey[] = [
  "sprint_30m",
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
   * limits[0] may be null when the source gives no border for score 2: a
   * result weaker than the border of score 3 then has no score (null).
   */
  limits: readonly [number | null, number, number, number];
  /** "estimate": approximate, set by the team without a source (D-039). */
  basis?: "estimate";
};

/** Norms by age in whole years at the tryout (the source gives one row per year). */
export type TrialNorms = Partial<
  Record<TrialKey, Partial<Record<number, TrialNorm>>>
>;

/**
 * Sprint 30 m, seconds. Source: "Контрольные нормативы, отделение футбола",
 * five-point scale by age, file kontrolnyie-normativyi---otdelenie-futbola.docx
 * on media.siteedu.ru (D-038). A school football section's document, not a
 * federal standard. Ages 8-10 list scores 3-5 only. Age 11 and older: scores
 * 1-5 are 5.80/5.70/5.60/5.50/5.40 (11) and so on, stored as borders 2..5.
 */
const lower = "lower_is_better" as const;
const higher = "higher_is_better" as const;

/** The same norm for each listed age. */
function forAges(ages: readonly number[], norm: TrialNorm) {
  return Object.fromEntries(ages.map((age) => [age, norm]));
}

const est = "estimate" as const;

export const trialNorms: TrialNorms = {
  sprint_30m: {
    8: { direction: lower, limits: [null, 6.8, 6.7, 6.5] },
    9: { direction: lower, limits: [null, 6.4, 6.2, 6.0] },
    10: { direction: lower, limits: [null, 6.0, 5.85, 5.6] },
    11: { direction: lower, limits: [5.7, 5.6, 5.5, 5.4] },
    12: { direction: lower, limits: [5.3, 5.2, 5.1, 5.0] },
    13: { direction: lower, limits: [5.0, 4.9, 4.8, 4.7] },
    14: { direction: lower, limits: [4.9, 4.8, 4.7, 4.6] },
  },
  // 30 m with the ball: same document (D-038). The course must be 30 m.
  // Ages 8-10 list scores 3-5 only.
  dribbling: {
    8: { direction: lower, limits: [null, 9.0, 8.5, 8.0] },
    9: { direction: lower, limits: [null, 8.0, 7.5, 7.0] },
    10: { direction: lower, limits: [null, 6.9, 6.7, 6.5] },
    11: { direction: lower, limits: [6.3, 6.2, 6.1, 6.0] },
    12: { direction: lower, limits: [5.9, 5.8, 5.7, 5.5] },
    13: { direction: lower, limits: [5.3, 5.2, 5.1, 5.0] },
    14: { direction: lower, limits: [5.0, 4.9, 4.8, 4.7] },
  },
  // APPROXIMATE (D-039): no source found, set by the team; replace when a
  // real table appears. Bands follow the age profiles.
  shuttle_5_10_5: {
    ...forAges([8, 9], {
      direction: lower,
      basis: est,
      limits: [7.0, 6.6, 6.2, 5.8],
    }),
    ...forAges([10, 11], {
      direction: lower,
      basis: est,
      limits: [6.6, 6.2, 5.8, 5.4],
    }),
    ...forAges([12, 13, 14], {
      direction: lower,
      basis: est,
      limits: [6.2, 5.8, 5.4, 5.0],
    }),
  },
  // Successful passes out of 10. APPROXIMATE (D-039).
  passing: {
    ...forAges([8, 9], { direction: higher, basis: est, limits: [3, 5, 6, 8] }),
    ...forAges([10, 11], {
      direction: higher,
      basis: est,
      limits: [4, 6, 7, 9],
    }),
    ...forAges([12, 13, 14], {
      direction: higher,
      basis: est,
      limits: [5, 7, 8, 9],
    }),
  },
  // Hits out of 10 shots. APPROXIMATE (D-039): five of ten is a typical
  // enrolment minimum, which is taken as score 3 for the oldest group.
  shooting: {
    ...forAges([8, 9], { direction: higher, basis: est, limits: [1, 3, 4, 6] }),
    ...forAges([10, 11], {
      direction: higher,
      basis: est,
      limits: [2, 4, 5, 7],
    }),
    ...forAges([12, 13, 14], {
      direction: higher,
      basis: est,
      limits: [3, 5, 6, 8],
    }),
  },
};

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
  const known = limits.filter((limit): limit is number => limit !== null);
  if (known.length < 3 || limits.slice(1).some((limit) => limit === null)) {
    return false;
  }
  if (!known.every(Number.isFinite)) return false;
  for (let i = 1; i < known.length; i += 1) {
    const ordered =
      direction === "lower_is_better"
        ? known[i] < known[i - 1]
        : known[i] > known[i - 1];
    if (!ordered) return false;
  }
  return true;
}

/**
 * Score 1..5 of a result, or null when there is no (valid) norm for this
 * test and age, the value is not a finite number, or the source cannot tell
 * the score of such a weak result (ages without a border for score 2).
 */
export function normalizeTrialResult(
  trial: TrialKey,
  age: number,
  value: number,
  norms: TrialNorms = trialNorms,
): number | null {
  if (!Number.isFinite(value)) return null;
  const norm = norms[trial]?.[age];
  if (!norm || !isValidNorm(norm)) return null;

  const reaches = (limit: number) =>
    norm.direction === "lower_is_better" ? value <= limit : value >= limit;
  if (norm.limits[0] === null && !reaches(norm.limits[1])) return null;

  // A missing border of score 2 counts as reached: the gate above passed.
  const reached = norm.limits.filter(
    (limit) => limit === null || reaches(limit),
  ).length;
  return 1 + reached;
}
