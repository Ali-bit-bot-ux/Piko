import { describe, expect, it } from "vitest";
import {
  ageProfileKeys,
  calculateScore,
  criterionKeys,
  decide,
  DISAGREEMENT_THRESHOLD,
  median,
  profiles,
  SCALE_MAX,
  SCALE_MIN,
} from "./index";

/** Every criterion of the profile rated the same by one coach. */
function uniform(profile: keyof typeof profiles, score: number) {
  return Object.fromEntries(
    criterionKeys(profile).map((key) => [key, [score]]),
  );
}

describe("profiles", () => {
  it("has the three age profiles of docs/scoring.md", () => {
    expect([...ageProfileKeys]).toEqual(["U7_U9", "U10_U11", "U12_U14"]);
  });

  it.each(ageProfileKeys)("%s: weights add up to 100%%", (profile) => {
    const sum = profiles[profile].reduce((acc, c) => acc + c.weight, 0);
    expect(sum).toBe(100);
  });

  it.each(ageProfileKeys)(
    "%s: keys are stable snake_case and unique",
    (profile) => {
      const keys = criterionKeys(profile);
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys) expect(key).toMatch(/^[a-z]+(_[a-z]+)*$/);
    },
  );

  it("matches the criteria counts and weights from the docs", () => {
    expect(profiles.U7_U9.map((c) => c.weight)).toEqual([25, 25, 25, 25]);
    expect(profiles.U10_U11.map((c) => c.weight)).toEqual([
      20, 20, 15, 20, 10, 15,
    ]);
    expect(profiles.U12_U14.map((c) => c.weight)).toEqual([
      15, 15, 10, 20, 15, 10, 15,
    ]);
  });
});

describe("median", () => {
  it("takes the middle value", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4])).toBe(4);
  });

  it("averages the two middle values of an even count", () => {
    expect(median([2, 3])).toBe(2.5);
    expect(median([1, 5, 4, 4])).toBe(4);
  });

  it("is not pulled by an outlier like the mean would be", () => {
    expect(median([4, 4, 1])).toBe(4);
  });

  it("does not modify its input", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });

  it("rejects an empty list", () => {
    expect(() => median([])).toThrow(RangeError);
  });
});

describe("calculateScore", () => {
  // docs/scoring.md says this example gives 3.80, but 0.8+0.6+0.6+0.6+0.4+0.75 = 3.75.
  it("computes the U10-U11 example from docs/scoring.md (3.75, the doc says 3.80)", () => {
    const result = calculateScore("U10_U11", {
      ball_control: [4],
      passing: [3],
      speed_agility: [4],
      game_thinking: [3],
      learnability: [4],
      attitude: [5],
    });
    expect(result).not.toBeNull();
    expect(result!.total).toBe(3.75);
    expect(result!.decision).toBe("reserve");
  });

  it("uses the median across coaches for each criterion", () => {
    const result = calculateScore("U7_U9", {
      ball_comfort: [4, 4, 5],
      coordination_agility: [3],
      activity_desire: [3, 4],
      learnability: [5, 5],
    });
    expect(result!.criteria.map((c) => c.score)).toEqual([4, 3, 3.5, 5]);
    // (4 + 3 + 3.5 + 5) * 0.25 = 3.875 -> 3.88
    expect(result!.total).toBe(3.88);
  });

  it("is incomplete (null) until every criterion has a rating", () => {
    const partial = uniform("U10_U11", 4);
    delete partial.passing;
    expect(calculateScore("U10_U11", partial)).toBeNull();
    expect(calculateScore("U10_U11", { ...partial, passing: [] })).toBeNull();
    expect(calculateScore("U10_U11", {})).toBeNull();
  });

  it("ignores keys that are not in the profile", () => {
    const ratings = { ...uniform("U7_U9", 3), tactics: [1] };
    expect(calculateScore("U7_U9", ratings)!.total).toBe(3);
  });

  it("returns 1.00 and 5.00 at the ends of the scale", () => {
    expect(calculateScore("U12_U14", uniform("U12_U14", 1))!.total).toBe(1);
    expect(calculateScore("U12_U14", uniform("U12_U14", 5))!.total).toBe(5);
  });

  it("rejects ratings outside 1..5 or not whole", () => {
    for (const bad of [0, 6, 2.5, Number.NaN]) {
      expect(() =>
        calculateScore("U7_U9", {
          ...uniform("U7_U9", 3),
          ball_comfort: [bad],
        }),
      ).toThrow(RangeError);
    }
  });

  it("reports the spread between coaches per criterion", () => {
    const result = calculateScore("U7_U9", {
      ...uniform("U7_U9", 3),
      ball_comfort: [2, 5],
    });
    const comfort = result!.criteria.find((c) => c.key === "ball_comfort")!;
    expect(comfort.spread).toBe(3);
    expect(comfort.ratings).toEqual([2, 5]);
    expect(result!.strongDisagreement).toBe(true);
    expect(result!.decision).toBe("review");
  });
});

describe("decide", () => {
  const calm = { strongDisagreement: false, hasLowCriterion: false };

  it("uses the default thresholds", () => {
    expect(decide({ total: 5, ...calm })).toBe("enrolled");
    expect(decide({ total: 4, ...calm })).toBe("enrolled");
    expect(decide({ total: 3.99, ...calm })).toBe("reserve");
    expect(decide({ total: 3.5, ...calm })).toBe("reserve");
    expect(decide({ total: 3.49, ...calm })).toBe("review");
    expect(decide({ total: 3, ...calm })).toBe("review");
    expect(decide({ total: 2.99, ...calm })).toBe("rejected");
    expect(decide({ total: 1, ...calm })).toBe("rejected");
  });

  it("does not enrol when a criterion is rated 1: it drops to reserve", () => {
    expect(
      decide({ total: 4.5, strongDisagreement: false, hasLowCriterion: true }),
    ).toBe("reserve");
    expect(
      decide({ total: 3.7, strongDisagreement: false, hasLowCriterion: true }),
    ).toBe("reserve");
  });

  it("sends a strong disagreement to a second look", () => {
    expect(
      decide({ total: 4.6, strongDisagreement: true, hasLowCriterion: false }),
    ).toBe("review");
    expect(
      decide({ total: 2.0, strongDisagreement: true, hasLowCriterion: false }),
    ).toBe("review");
  });
});

describe("calculateScore decisions", () => {
  it("blocks enrolment when a criterion median is 1 even with a high total", () => {
    const result = calculateScore("U10_U11", {
      ...uniform("U10_U11", 5),
      attitude: [1],
    });
    // 5 * 0.85 + 1 * 0.15 = 4.40
    expect(result!.total).toBe(4.4);
    expect(result!.decision).toBe("reserve");
  });

  it("enrols at 4.00 exactly with no ones", () => {
    expect(calculateScore("U7_U9", uniform("U7_U9", 4))!.decision).toBe(
      "enrolled",
    );
  });

  it("rejects below 3.00", () => {
    expect(calculateScore("U7_U9", uniform("U7_U9", 2))!.decision).toBe(
      "rejected",
    );
  });

  it("exposes the disagreement threshold as a named constant (Q-7)", () => {
    expect(DISAGREEMENT_THRESHOLD).toBe(2);
    const atLimit = calculateScore("U7_U9", {
      ...uniform("U7_U9", 5),
      ball_comfort: [5, 3],
    });
    expect(atLimit!.strongDisagreement).toBe(true);
    const below = calculateScore("U7_U9", {
      ...uniform("U7_U9", 5),
      ball_comfort: [5, 4],
    });
    expect(below!.strongDisagreement).toBe(false);
    expect(SCALE_MIN).toBe(1);
    expect(SCALE_MAX).toBe(5);
  });
});
