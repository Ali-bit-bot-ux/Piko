/**
 * Logs a failure without the error message: Prisma and library errors can
 * echo the arguments of the call (names and contacts of children, AGENTS.md
 * rule 4). Only the error class and a short code are written.
 */
export function logFailure(what: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "unknown";
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;
  console.error(what, code ? `${name} ${code}` : name);
}
