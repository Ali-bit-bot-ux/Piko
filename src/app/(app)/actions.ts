"use server";

import { routes } from "@/lib/routes";
import { signOut } from "@/server/auth/auth";

export async function logoutAction() {
  await signOut({ redirectTo: routes.login });
}
