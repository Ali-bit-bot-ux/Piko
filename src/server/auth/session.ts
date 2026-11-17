import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { routes } from "@/lib/routes";
import { getPrisma } from "../db/client";
import { auth } from "./auth";
import { isStaff, type SessionUser } from "./policy";

/**
 * Data Access Layer entry point. Call it from a component rendered inside a
 * <Suspense> boundary (it reads cookies, see Next docs: authentication with
 * Cache Components).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  // Marks the render as request-time before anything random is generated
  // (Next.js: "blocking-prerender-crypto").
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  // Re-read the user so deleted accounts and role changes take effect at
  // once instead of when the 8-hour token expires.
  const user = await getPrisma().user.findUnique({ where: { id } });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };
}

/** Signed-in staff member of an academy, or a redirect to the login page. */
export async function requireStaff(): Promise<
  SessionUser & { organizationId: string }
> {
  const user = await getCurrentUser();
  if (!user || !isStaff(user) || user.organizationId === null) {
    redirect(routes.login);
  }
  return { ...user, organizationId: user.organizationId };
}
