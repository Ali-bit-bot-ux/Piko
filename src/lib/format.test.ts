import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats a date in Russian", () => {
    expect(formatDate(new Date("2026-12-01T00:00:00Z"))).toMatch(
      /^1 декабря 2026/,
    );
  });

  it("does not shift a plain date back a day", () => {
    // Midnight UTC would be Nov 30 in time zones west of UTC without timeZone: "UTC".
    expect(formatDate(new Date("2026-12-01T00:00:00Z"))).toContain("1 декабря");
    expect(formatDate(new Date("2026-03-10T00:00:00Z"))).toContain("10 марта");
  });
});
