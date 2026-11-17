import { z } from "zod";

const envSchema = z.object({
  ANALYSIS_PROVIDER: z.enum(["stub", "claude", "google"]).default("stub"),
  STORAGE: z.enum(["local", "cloud"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().min(1).default(".data/storage"),
  DATABASE_URL: z.string().min(1).optional(),
  APP_URL: z.url().default("http://localhost:3000"),
});

export type AppConfig = {
  analysisProvider: "stub" | "claude" | "google";
  storage: "local" | "cloud";
  storageLocalDir: string;
  /** Postgres connection string. Optional so tools that do not need the database still start. */
  databaseUrl?: string;
  /** Public address of the site, used in links and QR codes (no trailing slash). */
  appUrl: string;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

type Env = Record<string, string | undefined>;

/** Reads and validates server settings. Empty values count as unset. */
export function loadConfig(env: Env = process.env): AppConfig {
  const present = Object.fromEntries(
    Object.entries(env).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new ConfigError(`Invalid environment: ${details}`);
  }
  return {
    analysisProvider: parsed.data.ANALYSIS_PROVIDER,
    storage: parsed.data.STORAGE,
    storageLocalDir: parsed.data.STORAGE_LOCAL_DIR,
    databaseUrl: parsed.data.DATABASE_URL,
    appUrl: parsed.data.APP_URL.replace(/\/+$/, ""),
  };
}
