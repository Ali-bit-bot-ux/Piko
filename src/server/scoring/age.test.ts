import { describe, expect, it } from "vitest";
import { ageOnDate } from "./age";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("ageOnDate", () => {
  it("counts whole years", () => {
    expect(ageOnDate(d("2015-05-05"), d("2026-12-01"))).toBe(11);
  });

  it("does not count the year before the birthday", () => {
    expect(ageOnDate(d("2015-12-02"), d("2026-12-01"))).toBe(10);
    expect(ageOnDate(d("2015-06-02"), d("2026-06-01"))).toBe(10);
  });

  it("counts the birthday itself", () => {
    expect(ageOnDate(d("2015-12-01"), d("2026-12-01"))).toBe(11);
  });
});
