/**
 * Public site paths. Some pages do not exist yet and will be added by
 * later tasks (see TASKS.md: T-014 for about/academies/parents/pricing).
 */
export const routes = {
  home: "/",
  about: "/about",
  academies: "/academies",
  parents: "/parents",
  pricing: "/pricing",
  login: "/login",
  signup: "/signup",
} as const;

/** Main navigation order. Keys match `nav` in the dictionary. */
export const mainNav = [
  { key: "about", href: routes.about },
  { key: "academies", href: routes.academies },
  { key: "parents", href: routes.parents },
  { key: "pricing", href: routes.pricing },
] as const;
