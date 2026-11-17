import type { Locale } from "../config";
import { ru, type Dictionary } from "./ru";

export type { Dictionary };

// Record<Locale, ...> makes TypeScript fail until every locale has a dictionary.
export const dictionaries: Record<Locale, Dictionary> = { ru };
