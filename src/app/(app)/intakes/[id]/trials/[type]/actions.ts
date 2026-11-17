"use server";

import { requireStaff } from "@/server/auth/session";
import {
  correctMeasurement,
  type CorrectMeasurementInput,
  type CorrectMeasurementResult,
} from "@/server/trials/correct-measurement";
import {
  recordMeasurement,
  type RecordMeasurementInput,
  type RecordMeasurementResult,
} from "@/server/trials/record-measurement";

/** Saves one result. Re-checks the session: actions can be called directly. */
export async function recordMeasurementAction(
  input: RecordMeasurementInput,
): Promise<RecordMeasurementResult | { ok: false; code: "generic" }> {
  const user = await requireStaff();
  try {
    return await recordMeasurement(user, input);
  } catch (error) {
    console.error("recording a measurement failed", error);
    return { ok: false, code: "generic" };
  }
}

/** Corrects a saved result (reason required). Re-checks the session. */
export async function correctMeasurementAction(
  input: CorrectMeasurementInput,
): Promise<CorrectMeasurementResult | { ok: false; code: "generic" }> {
  const user = await requireStaff();
  try {
    return await correctMeasurement(user, input);
  } catch (error) {
    console.error("correcting a measurement failed", error);
    return { ok: false, code: "generic" };
  }
}
