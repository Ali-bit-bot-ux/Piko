import { describe, expect, it } from "vitest";
import { createLoginThrottle } from "../auth/login-throttle";
import { registrationUrl } from "./qr";
import {
  createRegistrationSchema,
  registerCandidate,
} from "./register-candidate";

const today = new Date("2026-11-17T12:00:00Z");
const schema = createRegistrationSchema(today);

const valid = {
  fullName: "Демо Ребёнок",
  birthDate: "2015-04-20",
  parentName: "Демо Родитель",
  parentContact: "+7 700 000 00 00",
  consent: "on",
};

function message(input: unknown, field: string): string | undefined {
  const result = schema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === field)?.message;
}

describe("registration schema", () => {
  it("accepts a valid form", () => {
    const parsed = schema.parse(valid);
    expect(parsed.birthDate.toISOString()).toBe("2015-04-20T00:00:00.000Z");
  });

  it("requires names of two or more characters", () => {
    expect(message({ ...valid, fullName: " a " }, "fullName")).toBe(
      "name_required",
    );
    expect(message({ ...valid, parentName: "" }, "parentName")).toBe(
      "parent_name_required",
    );
  });

  it("accepts a phone number or an e-mail address and rejects other contacts", () => {
    expect(
      schema.safeParse({ ...valid, parentContact: "parent@example.invalid" })
        .success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...valid, parentContact: "8 (700) 123-45-67" })
        .success,
    ).toBe(true);
    for (const bad of ["abc", "123", "+", "a@b", "7".repeat(30)]) {
      expect(message({ ...valid, parentContact: bad }, "parentContact")).toBe(
        "contact_invalid",
      );
    }
  });

  it("rejects a malformed or future birth date", () => {
    expect(message({ ...valid, birthDate: "20.04.2015" }, "birthDate")).toBe(
      "birth_date_invalid",
    );
    expect(message({ ...valid, birthDate: "2026-11-18" }, "birthDate")).toBe(
      "birth_date_invalid",
    );
    expect(message({ ...valid, birthDate: "2015-02-31" }, "birthDate")).toBe(
      "birth_date_invalid",
    );
  });

  it("requires the consent checkbox", () => {
    expect(message({ ...valid, consent: undefined }, "consent")).toBe(
      "consent_required",
    );
    expect(message({ ...valid, consent: "off" }, "consent")).toBe(
      "consent_required",
    );
  });
});

describe("registerCandidate without a database", () => {
  const options = {
    today,
    throttle: createLoginThrottle({ maxFailures: 2, windowMs: 60_000 }),
  };

  it("treats a malformed intake id as a closed registration", async () => {
    expect(await registerCandidate("nope", valid, options)).toEqual({
      ok: false,
      code: "closed",
    });
  });

  it("silently accepts bot submissions (honeypot) and stores nothing", async () => {
    const id = crypto.randomUUID();
    expect(
      await registerCandidate(
        id,
        { ...valid, website: "http://spam" },
        options,
      ),
    ).toEqual({ ok: true });
  });

  it("returns field errors before touching the database", async () => {
    const result = await registerCandidate(
      crypto.randomUUID(),
      { ...valid, fullName: "", consent: undefined },
      {
        today,
        throttle: createLoginThrottle({ maxFailures: 5, windowMs: 60_000 }),
      },
    );
    expect(result).toEqual({
      ok: false,
      errors: { fullName: "name_required", consent: "consent_required" },
    });
  });

  it("blocks a flood from one address", async () => {
    const id = crypto.randomUUID();
    const throttle = createLoginThrottle({ maxFailures: 2, windowMs: 60_000 });
    const opts = { today, throttle, ip: "203.0.113.5" };
    const bad = { ...valid, fullName: "" };
    await registerCandidate(id, bad, opts);
    await registerCandidate(id, bad, opts);
    expect(await registerCandidate(id, bad, opts)).toEqual({
      ok: false,
      code: "throttled",
    });
    // Another address is not affected.
    const other = await registerCandidate(id, bad, {
      ...opts,
      ip: "203.0.113.6",
    });
    expect(other).toMatchObject({ ok: false, errors: expect.any(Object) });
  });
});

describe("registrationUrl", () => {
  it("builds the join link without double slashes", () => {
    expect(registrationUrl("https://piko.example/", "abc")).toBe(
      "https://piko.example/join/abc",
    );
    expect(registrationUrl("http://localhost:3000", "abc")).toBe(
      "http://localhost:3000/join/abc",
    );
  });
});
