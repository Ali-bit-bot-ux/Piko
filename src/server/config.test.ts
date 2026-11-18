import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config";

describe("loadConfig", () => {
  it("uses safe local defaults when nothing is set", () => {
    expect(loadConfig({})).toEqual({
      analysisProvider: "stub",
      storage: "local",
      storageLocalDir: ".data/storage",
      appUrl: "http://localhost:3000",
      anthropicModel: "claude-haiku-5-5",
      kaspi: {},
    });
  });

  it("reads the Kaspi payment details", () => {
    const config = loadConfig({
      KASPI_PHONE: "+7 700 000 00 00",
      KASPI_RECIPIENT: "ТОО Пример",
      KASPI_QR_URL: "https://example.invalid/qr.png",
    });
    expect(config.kaspi).toEqual({
      phone: "+7 700 000 00 00",
      recipient: "ТОО Пример",
      qrUrl: "https://example.invalid/qr.png",
    });
  });

  it("reads the Claude key and model", () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: "key",
      ANTHROPIC_MODEL: "claude-sonnet-5-5",
    });
    expect(config.anthropicApiKey).toBe("key");
    expect(config.anthropicModel).toBe("claude-sonnet-5-5");
    expect(loadConfig({}).anthropicApiKey).toBeUndefined();
  });

  it("reads the public address and drops trailing slashes", () => {
    expect(loadConfig({ APP_URL: "https://piko.example/" }).appUrl).toBe(
      "https://piko.example",
    );
    expect(() => loadConfig({ APP_URL: "not a url" })).toThrow(/APP_URL/);
  });

  it("reads values from the environment", () => {
    const config = loadConfig({
      ANALYSIS_PROVIDER: "claude",
      STORAGE: "cloud",
      STORAGE_LOCAL_DIR: "var/files",
    });
    expect(config.analysisProvider).toBe("claude");
    expect(config.storage).toBe("cloud");
    expect(config.storageLocalDir).toBe("var/files");
  });

  it("reads the database URL when present and leaves it unset otherwise", () => {
    expect(loadConfig({}).databaseUrl).toBeUndefined();
    expect(
      loadConfig({ DATABASE_URL: "postgresql://u:p@localhost:5432/piko" })
        .databaseUrl,
    ).toBe("postgresql://u:p@localhost:5432/piko");
  });

  it("treats empty values as unset", () => {
    expect(loadConfig({ ANALYSIS_PROVIDER: "", STORAGE: "" })).toEqual(
      loadConfig({}),
    );
  });

  it("rejects an unknown provider with a clear message", () => {
    expect(() => loadConfig({ ANALYSIS_PROVIDER: "gpt" })).toThrow(ConfigError);
    expect(() => loadConfig({ ANALYSIS_PROVIDER: "gpt" })).toThrow(
      /ANALYSIS_PROVIDER/,
    );
  });
});
