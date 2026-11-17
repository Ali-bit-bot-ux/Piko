import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI does not read Next.js env files, so load them here.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Not required for `prisma generate` (runs in postinstall without a database);
    // migrate and seed fail with a clear connection error when it is missing.
    url: process.env.DATABASE_URL ?? "postgresql://missing-database-url",
  },
});
