import { describe, expect, it } from "vitest";
import { canonicalJson, hashPayload } from "./canonical-json";
import { eventInputSchema, findPersonalDataKey } from "./types";

describe("canonicalJson", () => {
  it("sorts object keys at every level", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":3,"d":2},"b":1}',
    );
  });

  it("keeps array order and skips undefined fields", () => {
    expect(canonicalJson({ list: [3, 1, 2], skip: undefined })).toBe(
      '{"list":[3,1,2]}',
    );
  });

  it("handles primitives and null", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson("текст")).toBe('"текст"');
    expect(canonicalJson(5)).toBe("5");
  });
});

describe("hashPayload", () => {
  it("does not depend on key order", () => {
    expect(hashPayload({ a: 1, b: [1, 2] })).toBe(
      hashPayload({ b: [1, 2], a: 1 }),
    );
  });

  it("changes when the data changes", () => {
    expect(hashPayload({ value: 4.05 })).not.toBe(hashPayload({ value: 4.06 }));
  });

  it("returns 64 hex characters", () => {
    expect(hashPayload({})).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("findPersonalDataKey", () => {
  it("finds personal-data keys at any depth and in any spelling", () => {
    expect(findPersonalDataKey({ fullName: "x" })).toBe("fullName");
    expect(findPersonalDataKey({ a: { parent_contact: "x" } })).toBe(
      "parent_contact",
    );
    expect(findPersonalDataKey({ list: [{ Email: "x" }] })).toBe("Email");
  });

  it("accepts pseudonymous and numeric data", () => {
    expect(
      findPersonalDataKey({ trialId: "t", value: 4.05, attempt: 1 }),
    ).toBeUndefined();
  });
});

describe("eventInputSchema", () => {
  const valid = {
    id: "11111111-1111-4111-8111-111111111111",
    type: "measurement_recorded",
    organizationId: "22222222-2222-4222-8222-222222222222",
    occurredAtDevice: "2026-12-01T10:00:00.000Z",
    payload: { value: 4.05 },
    source: "mobile_offline",
  };

  it("accepts a valid event and turns the device time into a Date", () => {
    const parsed = eventInputSchema.parse(valid);
    expect(parsed.occurredAtDevice).toBeInstanceOf(Date);
  });

  it("rejects an unknown type, a bad id and a missing payload", () => {
    expect(
      eventInputSchema.safeParse({ ...valid, type: "other" }).success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({ ...valid, id: "not-a-uuid" }).success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({ ...valid, payload: undefined }).success,
    ).toBe(false);
  });
});
