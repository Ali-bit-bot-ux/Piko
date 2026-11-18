import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to max hits per key inside the window", () => {
    const time = 0;
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 1000,
      now: () => time,
    });
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(false);
    expect(limiter.allow("b")).toBe(true);
  });

  it("frees the key when the window has passed", () => {
    let time = 0;
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 1000,
      now: () => time,
    });
    expect(limiter.allow("a")).toBe(true);
    time = 500;
    expect(limiter.allow("a")).toBe(false);
    time = 1001;
    expect(limiter.allow("a")).toBe(true);
  });
});
