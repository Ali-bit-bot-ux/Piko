"use server";

import { headers } from "next/headers";
import {
  registerCandidate,
  type RegistrationErrorCode,
  type RegistrationField,
} from "@/server/intakes/register-candidate";

export type JoinFormState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<RegistrationField, RegistrationErrorCode>>;
  code?: "closed" | "duplicate" | "full" | "throttled" | "generic";
};

/** Public action (no account): everything is validated on the server. */
export async function registerAction(
  intakeId: string,
  _previous: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || undefined;

  const form: Record<string, unknown> = {};
  for (const key of [
    "fullName",
    "birthDate",
    "parentName",
    "parentContact",
    "consent",
    "website",
  ]) {
    const value = formData.get(key);
    if (typeof value === "string") form[key] = value;
  }

  try {
    const result = await registerCandidate(intakeId, form, { ip });
    if (result.ok) return { status: "success" };
    return { status: "error", errors: result.errors, code: result.code };
  } catch (error) {
    console.error("registration failed", error);
    return { status: "error", code: "generic" };
  }
}
