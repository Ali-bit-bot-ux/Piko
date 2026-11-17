import { createHash, randomBytes } from "node:crypto";

/** How long a report link works. */
export const REPORT_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 32 random bytes as base64url: 43 characters, unguessable. */
export function generateReportToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Shape check, so obviously wrong links never reach the database. */
export function isReportTokenShape(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

/** SHA-256 of the token, hex. Only this is stored (D-024). */
export function hashReportToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function reportExpiry(from: Date): Date {
  return new Date(from.getTime() + REPORT_TTL_DAYS * DAY_MS);
}

export function isReportExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}
