import { describe, expect, it } from "vitest";
import { escapeLike, parseCandidateFilters } from "./candidates";

describe("escapeLike", () => {
  it("escapes the LIKE wildcards and the escape character", () => {
    expect(escapeLike("100%_ok\\")).toBe("100\\%\\_ok\\\\");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeLike("Алихан")).toBe("Алихан");
  });
});

describe("parseCandidateFilters", () => {
  it("accepts a search text and a known status", () => {
    expect(
      parseCandidateFilters({ q: "  Али ", status: "checked_in" }),
    ).toEqual({
      q: "Али",
      status: "checked_in",
    });
  });

  it("ignores an unknown status and an empty or huge search", () => {
    expect(parseCandidateFilters({ q: "   ", status: "hacked" })).toEqual({
      q: undefined,
      status: undefined,
    });
    expect(parseCandidateFilters({ q: "x".repeat(101) }).q).toBeUndefined();
  });

  it("ignores values that are not text (repeated parameters, missing)", () => {
    expect(
      parseCandidateFilters({ q: ["a", "b"], status: ["registered"] }),
    ).toEqual({
      q: undefined,
      status: undefined,
    });
    expect(parseCandidateFilters({})).toEqual({
      q: undefined,
      status: undefined,
    });
  });
});
