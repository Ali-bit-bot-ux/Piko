import { describe, expect, it } from "vitest";
import {
  bestAttempt,
  normalizeTrialResult,
  trialNorms,
  type TrialNorms,
} from "./index";

// Made-up numbers, only to exercise the code. Real norms are open (Q-6).
const testNorms: TrialNorms = {
  sprint_20m: {
    U10_U11: { direction: "lower_is_better", limits: [5.0, 4.6, 4.2, 3.9] },
  },
  passing: {
    U10_U11: { direction: "higher_is_better", limits: [3, 5, 7, 9] },
  },
};

describe("bestAttempt", () => {
  it("takes the lowest time for timed tests", () => {
    expect(bestAttempt("sprint_20m", [4.2, 4.0])).toBe(4);
    expect(bestAttempt("dribbling", [12])).toBe(12);
  });

  it("takes the highest count for counted tests", () => {
    expect(bestAttempt("passing", [6, 8])).toBe(8);
    expect(bestAttempt("shooting", [0, 0])).toBe(0);
  });

  it("is null without attempts", () => {
    expect(bestAttempt("sprint_20m", [])).toBeNull();
  });
});

describe("normalizeTrialResult", () => {
  it("maps a time to 1..5, a lower time is better", () => {
    const score = (value: number) =>
      normalizeTrialResult("sprint_20m", "U10_U11", value, testNorms);
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
      normalizeTrialResult("passing", "U10_U11", value, testNorms);
    expect(score(0)).toBe(1);
    expect(score(2)).toBe(1);
    expect(score(3)).toBe(2);
    expect(score(5)).toBe(3);
    expect(score(7)).toBe(4);
    expect(score(10)).toBe(5);
  });

  it("returns null when there is no norm, instead of inventing one", () => {
    expect(
      normalizeTrialResult("shooting", "U10_U11", 5, testNorms),
    ).toBeNull();
    expect(normalizeTrialResult("passing", "U7_U9", 5, testNorms)).toBeNull();
  });

  it("returns null for a malformed norm or a bad value", () => {
    const broken: TrialNorms = {
      passing: {
        U10_U11: { direction: "higher_is_better", limits: [5, 3, 7, 9] },
      },
    };
    expect(normalizeTrialResult("passing", "U10_U11", 5, broken)).toBeNull();
    expect(
      normalizeTrialResult("passing", "U10_U11", Number.NaN, testNorms),
    ).toBeNull();
  });

  it("ships with no norms until the source is chosen (Q-6)", () => {
    expect(trialNorms).toEqual({});
    expect(normalizeTrialResult("sprint_20m", "U10_U11", 4)).toBeNull();
  });
});
