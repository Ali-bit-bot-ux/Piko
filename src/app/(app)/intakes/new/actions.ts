"use server";

import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { requireStaff } from "@/server/auth/session";
import {
  createIntake,
  ForbiddenError,
  type IntakeErrorCode,
} from "@/server/intakes/create-intake";

export type IntakeFormState = {
  errors?: Partial<
    Record<"name" | "birthYear" | "tryoutDate", IntakeErrorCode>
  >;
  forbidden?: boolean;
};

export async function createIntakeAction(
  _previous: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  // Re-checks the session here: a server action can be called directly.
  const user = await requireStaff();

  const result = await createIntake(user, {
    name: String(formData.get("name") ?? ""),
    birthYear: String(formData.get("birthYear") ?? ""),
    tryoutDate: String(formData.get("tryoutDate") ?? ""),
  }).catch((error: unknown) => {
    if (error instanceof ForbiddenError) return "forbidden" as const;
    throw error;
  });

  if (result === "forbidden") return { forbidden: true };
  if (!result.ok) return { errors: result.errors };
  redirect(routes.dashboard);
}
