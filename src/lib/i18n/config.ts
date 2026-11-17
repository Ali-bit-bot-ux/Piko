/**
 * Supported locales. Russian is the first locale; Kazakh is planned (D-005).
 * To add "kk": append it here, then TypeScript requires a Dictionary for it
 * in dictionaries/index.ts.
 */
export const locales = ["ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}
