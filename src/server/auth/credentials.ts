import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import type { LoginThrottle } from "./login-throttle";
import { hashPassword, verifyPassword } from "./password";
import { isStaff, type SessionUser } from "./policy";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

export type AuthResult =
  | { status: "ok"; user: SessionUser }
  | { status: "invalid_input" | "invalid" | "throttled" };

// Verified against when the e-mail is unknown, so a missing account takes
// about as long as a wrong password (no account enumeration by timing).
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

type Deps = { prisma: PrismaClient; throttle: LoginThrottle };

/** Checks e-mail and password. Only staff accounts with a password can sign in. */
export async function authenticate(
  input: { email?: unknown; password?: unknown },
  { prisma, throttle }: Deps,
): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid_input" };
  const { email, password } = parsed.data;

  if (throttle.isBlocked(email)) return { status: "throttled" };

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await verifyPassword(
    password,
    user?.passwordHash ?? (await getDummyHash()),
  );

  if (!user || !user.passwordHash || !passwordOk || !isStaff(user)) {
    throttle.recordFailure(email);
    return { status: "invalid" };
  }

  throttle.reset(email);
  return {
    status: "ok",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
  };
}
