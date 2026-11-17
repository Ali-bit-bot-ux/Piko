import { describe, expect, it } from "vitest";
import { ageProfileFor } from "./age-profile";

describe("ageProfileFor", () => {
  it.each([
    [2019, 2026, "U7_U9"],
    [2017, 2026, "U7_U9"],
    [2016, 2026, "U10_U11"],
    [2015, 2026, "U10_U11"],
    [2014, 2026, "U12_U14"],
    [2012, 2026, "U12_U14"],
  ])("birth %i in %i gives %s", (birth, tryout, expected) => {
    expect(ageProfileFor(birth, tryout)).toBe(expected);
  });

  it("returns null for children younger than 7 or older than 14", () => {
    expect(ageProfileFor(2020, 2026)).toBeNull();
    expect(ageProfileFor(2011, 2026)).toBeNull();
  });

  it("returns null for a birth year after the tryout year and for non-integers", () => {
    expect(ageProfileFor(2027, 2026)).toBeNull();
    expect(ageProfileFor(2015.5, 2026)).toBeNull();
    expect(ageProfileFor(Number.NaN, 2026)).toBeNull();
  });
});
