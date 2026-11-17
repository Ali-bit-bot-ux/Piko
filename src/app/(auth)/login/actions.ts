"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { routes } from "@/lib/routes";
import { signIn } from "@/server/auth/auth";

export type LoginState = {
  error?: "input" | "invalid" | "throttled";
};

const inputSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = inputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "input" };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: routes.dashboard,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = (error as { code?: string }).code;
      return { error: code === "throttled" ? "throttled" : "invalid" };
    }
    // A successful sign-in redirects by throwing: let Next.js handle it.
    throw error;
  }
  return {};
}
