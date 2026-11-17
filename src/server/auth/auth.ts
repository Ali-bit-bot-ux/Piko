import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { routes } from "@/lib/routes";
import { getPrisma } from "../db/client";
import { authenticate } from "./credentials";
import { createLoginThrottle } from "./login-throttle";

/** Shown to the user as "too many attempts" instead of "wrong password". */
export class ThrottledSignin extends CredentialsSignin {
  code = "throttled";
}

const throttle = createLoginThrottle({
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
});

// JWT sessions: the Credentials provider does not support database sessions.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: routes.login },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const result = await authenticate(credentials, {
          prisma: getPrisma(),
          throttle,
        });
        if (result.status === "ok") return result.user;
        if (result.status === "throttled") throw new ThrottledSignin();
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      return session;
    },
  },
});
