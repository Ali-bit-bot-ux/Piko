import { describe, expect, it } from "vitest";
import {
  recordMeasurement,
  recordMeasurementSchema,
} from "./record-measurement";

const valid = {
  intakeId: "11111111-1111-4111-8111-111111111111",
  trialType: "sprint_20m",
  candidateId: "22222222-2222-4222-8222-222222222222",
  attempt: 1,
  value: 4.056,
  clientEventId: "33333333-3333-4333-8333-333333333333",
};

describe("recordMeasurementSchema", () => {
  it("accepts a valid result and rounds the time to hundredths", () => {
    expect(recordMeasurementSchema.parse(valid).value).toBe(4.06);
  });

  it("allows attempts 1 and 2 only", () => {
    expect(
      recordMeasurementSchema.safeParse({ ...valid, attempt: 2 }).success,
    ).toBe(true);
    expect(
      recordMeasurementSchema.safeParse({ ...valid, attempt: 3 }).success,
    ).toBe(false);
    expect(
      recordMeasurementSchema.safeParse({ ...valid, attempt: 0 }).success,
    ).toBe(false);
    expect(
      recordMeasurementSchema.safeParse({ ...valid, attempt: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects impossible times", () => {
    for (const value of [0, -1, 0.05, 301, Number.NaN, Infinity]) {
      expect(
        recordMeasurementSchema.safeParse({ ...valid, value }).success,
      ).toBe(false);
    }
  });

  it("rejects counted tests, which have their own form (T-031), and bad ids", () => {
    expect(
      recordMeasurementSchema.safeParse({ ...valid, trialType: "passing" })
        .success,
    ).toBe(false);
    expect(
      recordMeasurementSchema.safeParse({ ...valid, candidateId: "x" }).success,
    ).toBe(false);
    expect(
      recordMeasurementSchema.safeParse({ ...valid, clientEventId: undefined })
        .success,
    ).toBe(false);
  });
});

describe("recordMeasurement without a database", () => {
  it("refuses a parent or a user without an academy", async () => {
    for (const user of [
      { id: "u", role: "parent" as const, organizationId: null },
      { id: "u", role: "coach" as const, organizationId: null },
    ]) {
      expect(await recordMeasurement(user, valid)).toEqual({
        ok: false,
        code: "forbidden",
      });
    }
  });

  it("returns invalid for malformed input before touching the database", async () => {
    expect(
      await recordMeasurement(
        { id: "u", role: "coach", organizationId: "org" },
        { ...valid, value: -5 },
      ),
    ).toEqual({ ok: false, code: "invalid" });
  });
});
