import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config";

describe("loadConfig", () => {
  it("uses safe local defaults when nothing is set", () => {
    expect(loadConfig({})).toEqual({
      analysisProvider: "stub",
      storage: "local",
      storageLocalDir: ".data/storage",
    });
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
