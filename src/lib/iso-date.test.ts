import { describe, expect, it } from "vitest";
import { parseIsoDate } from "./iso-date";

describe("parseIsoDate", () => {
  it("parses a real date as UTC midnight", () => {
    expect(parseIsoDate("2026-12-01")?.toISOString()).toBe(
      "2026-12-01T00:00:00.000Z",
    );
  });

  it("accepts a leap day only in a leap year", () => {
    expect(parseIsoDate("2024-02-29")).not.toBeNull();
    expect(parseIsoDate("2025-02-29")).toBeNull();
  });

  it.each([
    "2015-02-31",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-12-00",
  ])("rejects the impossible date %s", (value) => {
    expect(parseIsoDate(value)).toBeNull();
  });

  it.each(["", "01.12.2026", "2026-1-1", "2026-12-01T00:00", "abc"])(
    "rejects the malformed value %j",
    (value) => {
      expect(parseIsoDate(value)).toBeNull();
    },
  );
});
