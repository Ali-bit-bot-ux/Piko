import { defaultLocale, type Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

export { defaultLocale, isLocale, locales } from "./config";
export type { Locale } from "./config";
export type { Dictionary } from "./dictionaries";

/** Returns the dictionary for a locale (default locale when omitted). */
export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

/** Fills {name} placeholders. A missing variable keeps its placeholder. */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
