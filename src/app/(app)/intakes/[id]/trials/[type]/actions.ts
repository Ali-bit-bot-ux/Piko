"use server";

import { requireStaff } from "@/server/auth/session";
import {
  recordMeasurement,
  type RecordMeasurementInput,
  type RecordMeasurementResult,
} from "@/server/trials/record-measurement";

/** Saves one stopwatch result. Re-checks the session: actions can be called directly. */
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
