import { NextResponse, type NextRequest } from "next/server";
import { routes } from "@/lib/routes";

// Optimistic check only: it looks for a session cookie so visitors without
// one get a real HTTP redirect. It does NOT prove the session is valid; every
// page and action still verifies the user on the server (src/server/auth/session.ts).
const SESSION_COOKIE = "authjs.session-token";

export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes(SESSION_COOKIE));

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/intakes/:path*"],
};
