import { describe, expect, it } from "vitest";
import {
  AnalysisError,
  MAX_FRAMES_PER_REQUEST,
  FallbackAnalysisProvider,
  GeminiAnalysisProvider,
  StubAnalysisProvider,
  createAnalysisProvider,
  parseAnalysisResult,
  type AnalysisFrame,
} from "./index";

const frame = (timeSec: number): AnalysisFrame => ({
  timeSec,
  mimeType: "image/jpeg",
  data: new Uint8Array([1, 2, 3]),
});

const validResult = {
  suggestions: [{ criterionKey: "ball_control", score: 4, comment: "Хорошо" }],
  summary: "Итог",
  keyMoments: [{ timeSec: 12, description: "Передача" }],
  usage: { inputTokens: 100, outputTokens: 20 },
};

describe("parseAnalysisResult", () => {
  it("accepts a valid result", () => {
    expect(parseAnalysisResult(validResult)).toEqual(validResult);
  });

  it("rejects a score outside 1..5", () => {
    const bad = {
      ...validResult,
      suggestions: [{ criterionKey: "ball_control", score: 6, comment: "x" }],
    };
    expect(() => parseAnalysisResult(bad)).toThrow(AnalysisError);
  });

  it("rejects a non-integer score and a missing summary", () => {
    const fractional = {
      ...validResult,
      suggestions: [{ criterionKey: "a", score: 3.5, comment: "x" }],
    };
    expect(() => parseAnalysisResult(fractional)).toThrow(AnalysisError);
    expect(() =>
      parseAnalysisResult({ ...validResult, summary: undefined }),
    ).toThrow(/summary/);
  });

  it("rejects non-object input", () => {
    expect(() => parseAnalysisResult("text")).toThrow(AnalysisError);
  });
});

describe("StubAnalysisProvider", () => {
  const provider = new StubAnalysisProvider();

  it("suggests one valid score per requested criterion", async () => {
    const result = await provider.analyze({
      criteria: ["ball_control", "passing"],
      frames: [frame(0)],
    });
    expect(result.suggestions.map((s) => s.criterionKey)).toEqual([
      "ball_control",
      "passing",
    ]);
    expect(result.suggestions.every((s) => s.score === 3)).toBe(true);
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("is deterministic", async () => {
    const input = { criteria: ["passing"], frames: [frame(1)] };
    expect(await provider.analyze(input)).toEqual(
      await provider.analyze(input),
    );
  });

  it("rejects an empty criteria list", async () => {
    await expect(
      provider.analyze({ criteria: [], frames: [] }),
    ).rejects.toThrow(/criterion/);
  });

  it("rejects more frames than the limit", async () => {
    const frames = Array.from({ length: MAX_FRAMES_PER_REQUEST + 1 }, (_, i) =>
      frame(i),
    );
    await expect(
      provider.analyze({ criteria: ["passing"], frames }),
    ).rejects.toThrow(/Too many frames/);
  });

  it("accepts exactly the limit", async () => {
    const frames = Array.from({ length: MAX_FRAMES_PER_REQUEST }, (_, i) =>
      frame(i),
    );
    await expect(
      provider.analyze({ criteria: ["passing"], frames }),
    ).resolves.toBeDefined();
  });
});

describe("createAnalysisProvider", () => {
  it("returns the stub provider", () => {
    expect(
      createAnalysisProvider({
        analysisProvider: "stub",
        anthropicModel: "claude-haiku-5-5",
      }).name,
    ).toBe("stub");
  });

  it("builds the Claude provider when a key is configured", () => {
    const provider = createAnalysisProvider({
      analysisProvider: "claude",
      anthropicApiKey: "test-key",
      anthropicModel: "claude-haiku-5-5",
    });
    expect(provider.name).toBe("claude");
  });

  it("asks for the API key when Claude is chosen without one", () => {
    expect(() =>
      createAnalysisProvider({
        analysisProvider: "claude",
        anthropicModel: "claude-haiku-5-5",
      }),
    ).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("builds Gemini and Groq when their keys are configured", () => {
    const base = { anthropicModel: "claude-haiku-5-5" };
    expect(
      createAnalysisProvider({
        ...base,
        analysisProvider: "gemini",
        geminiApiKey: "k",
      }).name,
    ).toBe("gemini");
    expect(
      createAnalysisProvider({
        ...base,
        analysisProvider: "groq",
        groqApiKey: "k",
      }).name,
    ).toBe("groq");
  });

  it("asks for the key of the chosen provider and of the backup", () => {
    const base = { anthropicModel: "claude-haiku-5-5" };
    expect(() =>
      createAnalysisProvider({ ...base, analysisProvider: "gemini" }),
    ).toThrow(/GEMINI_API_KEY/);
    expect(() =>
      createAnalysisProvider({
        ...base,
        analysisProvider: "gemini",
        geminiApiKey: "k",
        analysisFallback: "groq",
      }),
    ).toThrow(/GROQ_API_KEY/);
  });

  it("wraps the main provider with a backup only when it is a different one", () => {
    const base = {
      anthropicModel: "claude-haiku-5-5",
      geminiApiKey: "k",
      groqApiKey: "k",
    };
    const same = createAnalysisProvider({
      ...base,
      analysisProvider: "gemini",
      analysisFallback: "gemini",
    });
    expect(same).toBeInstanceOf(GeminiAnalysisProvider);
    const both = createAnalysisProvider({
      ...base,
      analysisProvider: "gemini",
      analysisFallback: "groq",
    });
    expect(both).toBeInstanceOf(FallbackAnalysisProvider);
    expect(both.name).toBe("gemini");
  });
});
