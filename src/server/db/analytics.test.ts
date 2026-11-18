import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { getAnalyticsForUser } from "./analytics";

// A client that fails if it is touched: access must be refused before any query.
const untouchable = new Proxy(
  {},
  {
    get() {
      throw new Error("the database must not be queried");
    },
  },
) as PrismaClient;

describe("getAnalyticsForUser", () => {
  it("refuses coaches, parents and users without an academy before any query", async () => {
    for (const user of [
      { role: "coach" as const, organizationId: "o1" },
      { role: "parent" as const, organizationId: null },
      { role: "director" as const, organizationId: null },
    ]) {
      expect(await getAnalyticsForUser(user, untouchable)).toBeNull();
    }
  });
});
