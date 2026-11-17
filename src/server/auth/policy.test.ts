import { describe, expect, it } from "vitest";
import { canAccessOrganization, hasRole, isStaff } from "./policy";

describe("isStaff", () => {
  it("accepts admin, director and coach", () => {
    expect(isStaff({ role: "admin" })).toBe(true);
    expect(isStaff({ role: "director" })).toBe(true);
    expect(isStaff({ role: "coach" })).toBe(true);
  });

  it("rejects parents", () => {
    expect(isStaff({ role: "parent" })).toBe(false);
  });
});

describe("hasRole", () => {
  it("matches any of the given roles", () => {
    expect(hasRole({ role: "coach" }, "director", "coach")).toBe(true);
    expect(hasRole({ role: "coach" }, "director", "admin")).toBe(false);
  });
});

describe("canAccessOrganization", () => {
  it("allows the user's own academy", () => {
    expect(canAccessOrganization({ organizationId: "org-1" }, "org-1")).toBe(
      true,
    );
  });

  it("denies another academy, even for an admin", () => {
    expect(canAccessOrganization({ organizationId: "org-1" }, "org-2")).toBe(
      false,
    );
  });

  it("denies users without an academy", () => {
    expect(canAccessOrganization({ organizationId: null }, "org-1")).toBe(
      false,
    );
  });
});
