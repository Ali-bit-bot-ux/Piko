"use server";

import { redirect } from "next/navigation";
import { intakePath } from "@/lib/routes";
import { requireStaff } from "@/server/auth/session";
import { ForbiddenError } from "@/server/intakes/create-intake";
import { publishIntake } from "@/server/intakes/publish-intake";

/** Opens registration for an intake of the signed-in user's academy. */
export async function publishIntakeAction(intakeId: string): Promise<void> {
  // Re-checks the session here: a server action can be called directly.
  const user = await requireStaff();
  try {
    await publishIntake(user, intakeId);
  } catch (error) {
    // Hidden buttons are not security; a forbidden call just changes nothing.
    if (!(error instanceof ForbiddenError)) throw error;
  }
  redirect(intakePath(intakeId));
}
