import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { ClaudeAnalysisProvider, type ClaudeClient } from "./claude-provider";
import {
  AnalysisError,
  MAX_FRAMES_PER_REQUEST,
  type AnalysisFrame,
  type AnalysisInput,
} from "./types";

const frame = (timeSec: number): AnalysisFrame => ({
  timeSec,
  mimeType: "image/jpeg",
  data: new Uint8Array([1, 2, 3]),
});

const input: AnalysisInput = {
  criteria: ["ball_control", "passing"],
  frames: [frame(1.5), frame(12)],
  eventLog: "12 с: передача партнёру",
};

const goodOutput = {
  suggestions: [
    { criterionKey: "ball_control", score: 4, comment: "Держит мяч." },
    { criterionKey: "passing", score: 3, comment: "Передачи точные." },
  ],
  summary: "Уверенная игра.",
  keyMoments: [{ timeSec: 12, description: "Передача партнёру" }],
};

function fakeClient(response: unknown | Error) {
  // The parameter only types `mock.calls[n][0]` in the tests below.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parse = vi.fn(async (_request: unknown) => {
    if (response instanceof Error) throw response;
    return response;
  });
  return { client: { messages: { parse } } as unknown as ClaudeClient, parse };
}

const reply = (overrides: Record<string, unknown> = {}) => ({
  stop_reason: "end_turn",
  parsed_output: goodOutput,
  usage: { input_tokens: 4200, output_tokens: 310 },
  ...overrides,
});

const make = (client: ClaudeClient) =>
  new ClaudeAnalysisProvider({ model: "claude-haiku-5-5", client });

describe("ClaudeAnalysisProvider request", () => {
  it("sends the model, a system prompt, captioned frames, criteria and the event log", async () => {
    const { client, parse } = fakeClient(reply());
    await make(client).analyze(input);

    const request = parse.mock.calls[0][0] as unknown as {
      model: string;
      system: string;
      messages: { role: string; content: Record<string, unknown>[] }[];
      output_config: { format: unknown };
    };
    expect(request.model).toBe("claude-haiku-5-5");
    expect(request.system).toContain("помощник тренера");
    expect(request.output_config.format).toBeDefined();

    const content = request.messages[0].content;
    const images = content.filter((block) => block.type === "image");
    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({
      source: { type: "base64", media_type: "image/jpeg", data: "AQID" },
    });
    const texts = content
      .filter((block) => block.type === "text")
      .map((block) => block.text as string);
    expect(texts[0]).toBe("Кадр на 1.5 с");
    expect(texts[1]).toBe("Кадр на 12.0 с");
    expect(texts.at(-1)).toContain("ball_control, passing");
    expect(texts.at(-1)).toContain("<event_log>");
  });

  it("does not send an event log block when there is none", async () => {
    const { client, parse } = fakeClient(reply());
    await make(client).analyze({ ...input, eventLog: undefined });
    const request = parse.mock.calls[0][0] as unknown as {
      messages: { content: { type: string; text?: string }[] }[];
    };
    const last = request.messages[0].content.at(-1)!;
    expect(last.text).not.toContain("event_log");
  });
});

describe("ClaudeAnalysisProvider result", () => {
  it("returns suggestions with token usage taken from the API response", async () => {
    const { client } = fakeClient(reply());
    const result = await make(client).analyze(input);
    expect(result.suggestions.map((s) => s.criterionKey)).toEqual([
      "ball_control",
      "passing",
    ]);
    expect(result.usage).toEqual({ inputTokens: 4200, outputTokens: 310 });
    expect(result.keyMoments).toHaveLength(1);
  });

  it("drops criteria that were not asked for and repeated ones", async () => {
    const { client } = fakeClient(
      reply({
        parsed_output: {
          ...goodOutput,
          suggestions: [
            { criterionKey: "ball_control", score: 4, comment: "Первая." },
            { criterionKey: "ball_control", score: 1, comment: "Повтор." },
            { criterionKey: "made_up", score: 5, comment: "Лишний ключ." },
          ],
        },
      }),
    );
    const result = await make(client).analyze(input);
    expect(result.suggestions).toEqual([
      { criterionKey: "ball_control", score: 4, comment: "Первая." },
    ]);
  });

  it("is an error when a score is outside 1..5", async () => {
    const { client } = fakeClient(
      reply({
        parsed_output: {
          ...goodOutput,
          suggestions: [
            { criterionKey: "passing", score: 9, comment: "Слишком много." },
          ],
        },
      }),
    );
    await expect(make(client).analyze(input)).rejects.toThrow(AnalysisError);
  });
});

describe("ClaudeAnalysisProvider failures", () => {
  it("reports a refusal, a cut-off answer and an unparsable answer", async () => {
    await expect(
      make(fakeClient(reply({ stop_reason: "refusal" })).client).analyze(input),
    ).rejects.toThrow(/declined/);
    await expect(
      make(fakeClient(reply({ stop_reason: "max_tokens" })).client).analyze(
        input,
      ),
    ).rejects.toThrow(/max_tokens/);
    await expect(
      make(fakeClient(reply({ parsed_output: null })).client).analyze(input),
    ).rejects.toThrow(/expected format/);
  });

  it("wraps API errors without leaking the response body", async () => {
    const error = new Anthropic.RateLimitError(
      429,
      {
        type: "error",
        error: { type: "rate_limit_error", message: "secret body" },
      },
      "secret body",
      new Headers(),
    );
    const { client } = fakeClient(error);
    const failure = await make(client)
      .analyze(input)
      .catch((e: Error) => e);
    expect(failure).toBeInstanceOf(AnalysisError);
    expect((failure as Error).message).toBe("Claude request failed (HTTP 429)");
    expect((failure as Error).message).not.toContain("secret");
  });

  it("wraps network errors too", async () => {
    const { client } = fakeClient(new TypeError("fetch failed"));
    await expect(make(client).analyze(input)).rejects.toThrow(
      /Claude request failed \(TypeError\)/,
    );
  });

  it("checks the limits before calling the API", async () => {
    const { client, parse } = fakeClient(reply());
    const frames = Array.from({ length: MAX_FRAMES_PER_REQUEST + 1 }, (_, i) =>
      frame(i),
    );
    await expect(
      make(client).analyze({ criteria: ["passing"], frames }),
    ).rejects.toThrow(/Too many frames/);
    await expect(
      make(client).analyze({ criteria: [], frames: [] }),
    ).rejects.toThrow(/criterion/);
    expect(parse).not.toHaveBeenCalled();
  });
});
