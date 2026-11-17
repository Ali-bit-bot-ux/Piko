import { createHmac } from "node:crypto";

/**
 * Keyed hash for identifiers that go into the journal (IP address, device id):
 * the journal never stores them in the clear (docs/event-log.md).
 */
export function hashIdentifier(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set");
    }
    return createHmac("sha256", "dev-only-secret").update(value).digest("hex");
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}
