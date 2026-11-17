import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { ConfigError, loadConfig } from "../config";

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Returns the shared Prisma client. Throws ConfigError when DATABASE_URL is missing. */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const { databaseUrl } = loadConfig();
    if (!databaseUrl) {
      throw new ConfigError("DATABASE_URL is not set");
    }
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
  }
  return globalForPrisma.prisma;
}
