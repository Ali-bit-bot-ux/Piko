import { describe, expect, it } from "vitest";
import { REFERENCE_PATTERN, generateReference } from "./payments";

describe("generateReference", () => {
  it("looks like PK-XXXXXX without confusing characters", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateReference();
      expect(code).toMatch(REFERENCE_PATTERN);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("uses the given random source", () => {
    expect(generateReference(() => 0)).toBe("PK-222222");
  });
});

describe("REFERENCE_PATTERN", () => {
  it("rejects anything that is not a code", () => {
    for (const bad of [
      "",
      "pk-222222",
      "PK-22222",
      "PK-2222222",
      "XX-222222",
      "PK-2220O2",
    ]) {
      expect(REFERENCE_PATTERN.test(bad)).toBe(false);
    }
  });
});
