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
  /** Cabinet home: the list of intakes. */
  dashboard: "/dashboard",
  intakeNew: "/intakes/new",
} as const;

/** Cabinet page of one intake. */
export const intakePath = (id: string) => `/intakes/${id}`;

/** Stopwatch screen of one test of an intake. */
export const trialPath = (intakeId: string, type: string) =>
  `/intakes/${intakeId}/trials/${type}`;

/** Public registration page of one intake (the QR code points here). */
export const joinPath = (id: string) => `/join/${id}`;

/** Main navigation order. Keys match `nav` in the dictionary. */
export const mainNav = [
  { key: "about", href: routes.about },
  { key: "academies", href: routes.academies },
  { key: "parents", href: routes.parents },
  { key: "pricing", href: routes.pricing },
] as const;
