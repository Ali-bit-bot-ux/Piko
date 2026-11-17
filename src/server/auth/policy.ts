import type { Role } from "@/generated/prisma/enums";

/** The signed-in user as the rest of the server sees it. */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Null for users that are not tied to an academy (parents). */
  organizationId: string | null;
};

/** Roles that work in the cabinet. Parents use report links, not accounts. */
export const STAFF_ROLES: readonly Role[] = ["admin", "director", "coach"];

export function isStaff(user: Pick<SessionUser, "role">): boolean {
  return STAFF_ROLES.includes(user.role);
}

export function hasRole(
  user: Pick<SessionUser, "role">,
  ...roles: readonly Role[]
): boolean {
  return roles.includes(user.role);
}

/**
 * Data belongs to one academy. A user may touch it only when it is their
 * own academy; no role crosses that line (docs/architecture.md).
 */
export function canAccessOrganization(
  user: Pick<SessionUser, "organizationId">,
  organizationId: string,
): boolean {
  return user.organizationId !== null && user.organizationId === organizationId;
}
