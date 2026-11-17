import { describe, expect, it } from "vitest";
import { defaultLocale, getDictionary, interpolate, isLocale } from "./index";

describe("interpolate", () => {
  it("replaces placeholders with values", () => {
    expect(interpolate("из {max}", { max: 5 })).toBe("из 5");
  });

  it("replaces every occurrence and several variables", () => {
    expect(interpolate("{a}-{b}-{a}", { a: "x", b: 2 })).toBe("x-2-x");
  });

  it("keeps a placeholder when the variable is missing", () => {
    expect(interpolate("из {max}", {})).toBe("из {max}");
  });

  it("returns the template unchanged when there are no placeholders", () => {
    expect(interpolate("Привет", { a: 1 })).toBe("Привет");
  });
});

describe("isLocale", () => {
  it("accepts supported locales", () => {
    expect(isLocale("ru")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("getDictionary", () => {
  it("uses the default locale when none is given", () => {
    expect(defaultLocale).toBe("ru");
    expect(getDictionary()).toBe(getDictionary("ru"));
  });

  it("has all four decision statuses from docs/scoring.md", () => {
    const { status } = getDictionary("ru");
    expect(Object.keys(status).sort()).toEqual(
      ["enrolled", "rejected", "reserve", "review"].sort(),
    );
  });

  it("has no empty strings", () => {
    const walk = (value: unknown): string[] =>
      typeof value === "string"
        ? [value]
        : Object.values(value as object).flatMap(walk);
    expect(walk(getDictionary("ru")).every((text) => text.trim() !== "")).toBe(
      true,
    );
  });
});
