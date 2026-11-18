import { describe, expect, it } from "vitest";
import {
  bestAttempt,
  normalizeTrialResult,
  trialNorms,
  type TrialKey,
  type TrialNorms,
} from "./index";

// Made-up numbers, only to exercise the code (the shipped norms are tested below).
const testNorms: TrialNorms = {
  sprint_30m: {
    10: { direction: "lower_is_better", limits: [5.0, 4.6, 4.2, 3.9] },
  },
  passing: {
    10: { direction: "higher_is_better", limits: [3, 5, 7, 9] },
  },
};

describe("bestAttempt", () => {
  it("takes the lowest time for timed tests", () => {
    expect(bestAttempt("sprint_30m", [4.2, 4.0])).toBe(4);
    expect(bestAttempt("dribbling", [12])).toBe(12);
  });

  it("takes the highest count for counted tests", () => {
    expect(bestAttempt("passing", [6, 8])).toBe(8);
    expect(bestAttempt("shooting", [0, 0])).toBe(0);
  });

  it("is null without attempts", () => {
    expect(bestAttempt("sprint_30m", [])).toBeNull();
  });
});

describe("normalizeTrialResult", () => {
  it("maps a time to 1..5, a lower time is better", () => {
    const score = (value: number) =>
      normalizeTrialResult("sprint_30m", 10, value, testNorms);
    expect(score(5.5)).toBe(1);
    expect(score(5.0)).toBe(2);
    expect(score(4.7)).toBe(2);
    expect(score(4.6)).toBe(3);
    expect(score(4.2)).toBe(4);
    expect(score(3.9)).toBe(5);
    expect(score(3.0)).toBe(5);
  });

  it("maps a count to 1..5, a higher count is better", () => {
    const score = (value: number) =>
      normalizeTrialResult("passing", 10, value, testNorms);
    expect(score(0)).toBe(1);
    expect(score(2)).toBe(1);
    expect(score(3)).toBe(2);
    expect(score(5)).toBe(3);
    expect(score(7)).toBe(4);
    expect(score(10)).toBe(5);
  });

  it("returns null when there is no norm, instead of inventing one", () => {
    expect(normalizeTrialResult("shooting", 10, 5, testNorms)).toBeNull();
    expect(normalizeTrialResult("passing", 9, 5, testNorms)).toBeNull();
  });

  it("returns null for a malformed norm or a bad value", () => {
    const broken: TrialNorms = {
      passing: {
        10: { direction: "higher_is_better", limits: [5, 3, 7, 9] },
      },
    };
    expect(normalizeTrialResult("passing", 10, 5, broken)).toBeNull();
    expect(
      normalizeTrialResult("passing", 10, Number.NaN, testNorms),
    ).toBeNull();
  });

  it("has no norm for the tests the source does not cover", () => {
    expect(normalizeTrialResult("passing", 15, 8)).toBeNull();
    expect(normalizeTrialResult("sprint_30m", 15, 4.5)).toBeNull();
    expect(normalizeTrialResult("sprint_30m", 7, 6)).toBeNull();
  });

  it("scores the 30 m sprint by the age table (D-038)", () => {
    const score = (age: number, value: number) =>
      normalizeTrialResult("sprint_30m", age, value);
    // Age 11: 5.80/5.70/5.60/5.50/5.40 seconds are scores 1..5.
    expect(score(11, 5.8)).toBe(1);
    expect(score(11, 5.7)).toBe(2);
    expect(score(11, 5.6)).toBe(3);
    expect(score(11, 5.5)).toBe(4);
    expect(score(11, 5.4)).toBe(5);
    expect(score(11, 5.3)).toBe(5);
    // Age 14: 5.0/4.90/4.80/4.70/4.60.
    expect(score(14, 5.0)).toBe(1);
    expect(score(14, 4.8)).toBe(3);
    expect(score(14, 4.6)).toBe(5);
  });

  it("ages 8-10 list scores 3-5 only: a weaker result has no score", () => {
    const score = (age: number, value: number) =>
      normalizeTrialResult("sprint_30m", age, value);
    expect(score(9, 6.4)).toBe(3);
    expect(score(9, 6.2)).toBe(4);
    expect(score(9, 6.0)).toBe(5);
    expect(score(9, 6.5)).toBeNull();
    expect(score(10, 5.85)).toBe(4);
  });

  it("the shipped table is well ordered and gets faster with age", () => {
    const norms = trialNorms.sprint_30m ?? {};
    for (const [age, norm] of Object.entries(norms)) {
      expect(norm, `age ${age}`).toBeDefined();
      expect(normalizeTrialResult("sprint_30m", Number(age), 1)).toBe(5);
    }
    const fiveByAge = [8, 9, 10, 11, 12, 13, 14].map(
      (age) => norms[age]?.limits[3] ?? 0,
    );
    expect([...fiveByAge].sort((a, b) => b - a)).toEqual(fiveByAge);
  });

  it("null first border is only valid with three known borders", () => {
    const broken: TrialNorms = {
      sprint_30m: {
        9: {
          direction: "lower_is_better",
          limits: [null, null as never, 6, 5],
        },
      },
    };
    expect(normalizeTrialResult("sprint_30m", 9, 5.5, broken)).toBeNull();
  });

  it("every shipped norm is valid for ages 8-14 and gets harder with age", () => {
    for (const trial of Object.keys(trialNorms) as TrialKey[]) {
      const norms = trialNorms[trial] ?? {};
      for (let age = 8; age <= 14; age += 1) {
        const norm = norms[age];
        expect(norm, `${trial} ${age}`).toBeDefined();
        const best = norm!.direction === "lower_is_better" ? 0 : 99;
        expect(normalizeTrialResult(trial, age, best)).toBe(5);
      }
      // The border of score 5 never gets easier with age.
      const fives = [8, 9, 10, 11, 12, 13, 14].map(
        (age) => norms[age]!.limits[3],
      );
      const sorted = [...fives].sort((a, b) =>
        norms[8]!.direction === "lower_is_better" ? b - a : a - b,
      );
      expect(sorted).toEqual(fives);
    }
  });

  it("marks the approximate norms and keeps the documented ones unmarked", () => {
    expect(trialNorms.sprint_30m?.[11]?.basis).toBeUndefined();
    expect(trialNorms.dribbling?.[11]?.basis).toBeUndefined();
    for (const trial of ["shuttle_5_10_5", "passing", "shooting"] as const) {
      expect(trialNorms[trial]?.[10]?.basis).toBe("estimate");
    }
  });

  it("scores counted tests by the approximate table", () => {
    expect(normalizeTrialResult("shooting", 13, 5)).toBe(3);
    expect(normalizeTrialResult("shooting", 13, 2)).toBe(1);
    expect(normalizeTrialResult("passing", 10, 9)).toBe(5);
    expect(normalizeTrialResult("shuttle_5_10_5", 10, 6.2)).toBe(3);
  });
});
