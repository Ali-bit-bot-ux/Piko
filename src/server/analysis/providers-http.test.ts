import { describe, expect, it, vi } from "vitest";
import { FallbackAnalysisProvider } from "./fallback-provider";
import { GeminiAnalysisProvider } from "./gemini-provider";
import { GROQ_MAX_IMAGES, GroqAnalysisProvider } from "./groq-provider";
import { parseJsonAnswer, sampleFrames } from "./shared";
import {
  AnalysisError,
  type AnalysisFrame,
  type AnalysisProvider,
} from "./types";

const frames = (count: number): AnalysisFrame[] =>
  Array.from({ length: count }, (_, i) => ({
    timeSec: i,
    mimeType: "image/jpeg" as const,
    data: new Uint8Array([1, 2, 3]),
  }));

const modelJson = {
  suggestions: [
    { criterionKey: "passing", score: 4, comment: "Хорошая передача" },
    { criterionKey: "passing", score: 2, comment: "дубль" },
    { criterionKey: "unknown_key", score: 5, comment: "лишний ключ" },
  ],
  summary: "Итог",
  keyMoments: [{ timeSec: 3, description: "Передача" }],
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const geminiReply = (text: string, extra: Record<string, unknown> = {}) =>
  reply({
    candidates: [{ content: { parts: [{ text }] }, ...extra }],
    usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 120 },
  });

const input = (n = 3) => ({
  criteria: ["passing", "ball_control"],
  frames: frames(n),
});

const asFetch = (impl: unknown) => impl as typeof fetch;

describe("GeminiAnalysisProvider", () => {
  const make = (impl: () => Promise<Response>) =>
    new GeminiAnalysisProvider({
      apiKey: "k",
      model: "m",
      fetchImpl: asFetch(impl),
    });

  it("sends frames with the key in a header and returns a cleaned result", async () => {
    const fetchImpl = vi.fn(async () => geminiReply(JSON.stringify(modelJson)));
    const provider = new GeminiAnalysisProvider({
      apiKey: "secret-key",
      model: "gemini-test",
      fetchImpl: asFetch(fetchImpl),
    });
    const result = await provider.analyze(input());

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/models/gemini-test:generateContent");
    expect(url).not.toContain("secret-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "secret-key",
    );
    const body = JSON.parse(init.body as string);
    const images = body.contents[0].parts.filter(
      (part: { inlineData?: unknown }) => part.inlineData,
    );
    expect(images).toHaveLength(3);

    // One suggestion per asked criterion, unknown keys dropped, usage from the API.
    expect(result.suggestions).toEqual([
      { criterionKey: "passing", score: 4, comment: "Хорошая передача" },
    ]);
    expect(result.usage).toEqual({ inputTokens: 900, outputTokens: 120 });
  });

  it("accepts an answer wrapped in a json code fence", async () => {
    const fence = "`".repeat(3);
    const fenced = `${fence}json\n${JSON.stringify(modelJson)}\n${fence}`;
    const result = await make(async () => geminiReply(fenced)).analyze(input());
    expect(result.summary).toBe("Итог");
  });

  it("fails with a short message that holds no reply body", async () => {
    const provider = make(async () => reply({ error: "child Иван" }, 429));
    const error = await provider.analyze(input()).catch((e) => e);
    expect(error).toBeInstanceOf(AnalysisError);
    expect(error.message).toBe("Gemini request failed (HTTP 429)");
  });

  it("fails on a blocked answer, a cut answer, bad JSON and a network error", async () => {
    await expect(
      make(async () =>
        reply({ candidates: [{ finishReason: "SAFETY" }] }),
      ).analyze(input()),
    ).rejects.toThrow(/no answer \(SAFETY\)/);
    await expect(
      make(async () =>
        geminiReply("{}", { finishReason: "MAX_TOKENS" }),
      ).analyze(input()),
    ).rejects.toThrow(/cut off/);
    await expect(
      make(async () => geminiReply("not json")).analyze(input()),
    ).rejects.toThrow(/valid JSON/);
    await expect(
      make(async () => geminiReply(JSON.stringify({ summary: "x" }))).analyze(
        input(),
      ),
    ).rejects.toThrow(/expected format/);
    await expect(
      make(async () => {
        throw new TypeError("fetch failed: Иван");
      }).analyze(input()),
    ).rejects.toThrow("Gemini request failed (TypeError)");
  });

  it("refuses an empty request and too many frames before any call", async () => {
    const fetchImpl = vi.fn();
    const provider = new GeminiAnalysisProvider({
      apiKey: "k",
      model: "m",
      fetchImpl: asFetch(fetchImpl),
    });
    await expect(
      provider.analyze({ criteria: [], frames: frames(1) }),
    ).rejects.toThrow(AnalysisError);
    await expect(provider.analyze(input(41))).rejects.toThrow(
      /Too many frames/,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("GroqAnalysisProvider", () => {
  const groqReply = (text: string, finish = "stop") =>
    reply({
      choices: [{ finish_reason: finish, message: { content: text } }],
      usage: { prompt_tokens: 500, completion_tokens: 80 },
    });
  const make = (impl: () => Promise<Response>) =>
    new GroqAnalysisProvider({
      apiKey: "k",
      model: "m",
      fetchImpl: asFetch(impl),
    });

  it("looks at no more images than Groq allows, spread over the video", async () => {
    const fetchImpl = vi.fn(async () => groqReply(JSON.stringify(modelJson)));
    const provider = new GroqAnalysisProvider({
      apiKey: "gk",
      model: "groq-test",
      fetchImpl: asFetch(fetchImpl),
    });
    const result = await provider.analyze(input(30));

    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer gk",
    );
    const body = JSON.parse(init.body as string);
    const images = body.messages[1].content.filter(
      (part: { type: string }) => part.type === "image_url",
    );
    expect(images).toHaveLength(GROQ_MAX_IMAGES);
    expect(result.usage).toEqual({ inputTokens: 500, outputTokens: 80 });
  });

  it("fails on HTTP errors, cut answers and empty answers", async () => {
    await expect(
      make(async () => reply({}, 503)).analyze(input()),
    ).rejects.toThrow("Groq request failed (HTTP 503)");
    await expect(
      make(async () => groqReply("{}", "length")).analyze(input()),
    ).rejects.toThrow(/cut off/);
    await expect(
      make(async () => groqReply("")).analyze(input()),
    ).rejects.toThrow(/no answer/);
  });
});

describe("FallbackAnalysisProvider", () => {
  const ok = (name: string): AnalysisProvider => ({
    name,
    analyze: async () => ({
      suggestions: [],
      summary: name,
      keyMoments: [],
      usage: { inputTokens: 1, outputTokens: 1 },
    }),
  });
  const broken = (name: string): AnalysisProvider => ({
    name,
    analyze: async () => {
      throw new AnalysisError(`${name} request failed (HTTP 429)`);
    },
  });

  it("uses the main provider when it works", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = new FallbackAnalysisProvider(ok("gemini"), ok("groq"));
    expect((await provider.analyze(input())).summary).toBe("gemini");
    expect(provider.name).toBe("gemini");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("asks the backup when the main one fails and says who answered", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = new FallbackAnalysisProvider(broken("gemini"), ok("groq"));
    expect((await provider.analyze(input())).summary).toBe("groq");
    expect(provider.name).toBe("groq");
    expect(JSON.stringify(spy.mock.calls)).toContain("HTTP 429");
    spy.mockRestore();
  });

  it("fails when both fail", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = new FallbackAnalysisProvider(
      broken("gemini"),
      broken("groq"),
    );
    await expect(provider.analyze(input())).rejects.toThrow(
      /groq request failed/,
    );
    spy.mockRestore();
  });
});

describe("shared helpers", () => {
  it("sampleFrames keeps order, first and last, and never invents frames", () => {
    expect(sampleFrames([1, 2, 3], 5)).toEqual([1, 2, 3]);
    const picked = sampleFrames(
      Array.from({ length: 30 }, (_, i) => i),
      5,
    );
    expect(picked).toEqual([0, 7, 15, 22, 29]);
    expect(sampleFrames([1, 2, 3], 1)).toEqual([1]);
    expect(sampleFrames([1, 2, 3], 0)).toEqual([]);
  });

  it("parseJsonAnswer reads plain and fenced JSON and rejects text", () => {
    const fence = "`".repeat(3);
    expect(parseJsonAnswer('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonAnswer(`${fence}\n{"a":2}\n${fence}`)).toEqual({ a: 2 });
    expect(() => parseJsonAnswer("hello")).toThrow(AnalysisError);
  });
});
