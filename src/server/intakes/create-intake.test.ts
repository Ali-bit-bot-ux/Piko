import { describe, expect, it } from "vitest";
import {
  createIntake,
  createIntakeSchema,
  ForbiddenError,
} from "./create-intake";

const today = new Date("2026-11-17T12:00:00Z");
const schema = createIntakeSchema(today);

const valid = {
  name: "Набор 2015",
  birthYear: "2015",
  tryoutDate: "2026-12-01",
};

function firstMessage(input: unknown, path: string): string | undefined {
  const result = schema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === path)?.message;
}

describe("createIntakeSchema", () => {
  it("accepts a valid form and converts the values", () => {
    const parsed = schema.parse(valid);
    expect(parsed.name).toBe("Набор 2015");
    expect(parsed.birthYear).toBe(2015);
    expect(parsed.tryoutDate.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("trims the name and rejects an empty or too long one", () => {
    expect(schema.parse({ ...valid, name: "  Набор  " }).name).toBe("Набор");
    expect(firstMessage({ ...valid, name: "   " }, "name")).toBe(
      "name_required",
    );
    expect(firstMessage({ ...valid, name: "x".repeat(101) }, "name")).toBe(
      "name_required",
    );
  });

  it("rejects an invalid birth year", () => {
    expect(firstMessage({ ...valid, birthYear: "abc" }, "birthYear")).toBe(
      "birth_year_invalid",
    );
    expect(firstMessage({ ...valid, birthYear: "20.5" }, "birthYear")).toBe(
      "birth_year_invalid",
    );
  });

  it("rejects a malformed or impossible date", () => {
    expect(
      firstMessage({ ...valid, tryoutDate: "01.12.2026" }, "tryoutDate"),
    ).toBe("tryout_date_invalid");
    expect(
      firstMessage({ ...valid, tryoutDate: "2026-13-45" }, "tryoutDate"),
    ).toBe("tryout_date_invalid");
  });

  it("accepts today but rejects a past date", () => {
    expect(
      schema.safeParse({ ...valid, tryoutDate: "2026-11-17" }).success,
    ).toBe(true);
    expect(
      firstMessage({ ...valid, tryoutDate: "2026-11-16" }, "tryoutDate"),
    ).toBe("tryout_date_past");
  });

  it("rejects ages outside 7..14 on the tryout date", () => {
    expect(firstMessage({ ...valid, birthYear: "2022" }, "birthYear")).toBe(
      "age_out_of_range",
    );
    expect(firstMessage({ ...valid, birthYear: "2010" }, "birthYear")).toBe(
      "age_out_of_range",
    );
  });
});

describe("createIntake permissions", () => {
  it("refuses coaches, parents and users without an academy before touching the database", async () => {
    // No prisma is passed: reaching the database would throw a different error.
    for (const user of [
      { role: "coach" as const, organizationId: "org" },
      { role: "parent" as const, organizationId: null },
      { role: "director" as const, organizationId: null },
    ]) {
      await expect(createIntake(user, valid, { today })).rejects.toThrow(
        ForbiddenError,
      );
    }
  });

  it("returns field errors without touching the database", async () => {
    const result = await createIntake(
      { role: "admin", organizationId: "org" },
      { name: "", birthYear: "abc", tryoutDate: "bad" },
      { today },
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        name: "name_required",
        birthYear: "birth_year_invalid",
        tryoutDate: "tryout_date_invalid",
      },
    });
  });
});
