import { describe, expect, it } from "vitest";
import { createLoginThrottle } from "./login-throttle";

function setup() {
  let time = 1_000;
  const throttle = createLoginThrottle({
    maxFailures: 3,
    windowMs: 60_000,
    now: () => time,
  });
  return { throttle, advance: (ms: number) => (time += ms) };
}

describe("login throttle", () => {
  it("blocks after the maximum number of failures", () => {
    const { throttle } = setup();
    throttle.recordFailure("a@example.invalid");
    throttle.recordFailure("a@example.invalid");
    expect(throttle.isBlocked("a@example.invalid")).toBe(false);
    throttle.recordFailure("a@example.invalid");
    expect(throttle.isBlocked("a@example.invalid")).toBe(true);
  });

  it("counts each key separately", () => {
    const { throttle } = setup();
    for (let i = 0; i < 3; i++) throttle.recordFailure("a@example.invalid");
    expect(throttle.isBlocked("b@example.invalid")).toBe(false);
  });

  it("forgets failures after the window passes", () => {
    const { throttle, advance } = setup();
    for (let i = 0; i < 3; i++) throttle.recordFailure("a@example.invalid");
    advance(60_001);
    expect(throttle.isBlocked("a@example.invalid")).toBe(false);
  });

  it("reset clears the counter", () => {
    const { throttle } = setup();
    for (let i = 0; i < 3; i++) throttle.recordFailure("a@example.invalid");
    throttle.reset("a@example.invalid");
    expect(throttle.isBlocked("a@example.invalid")).toBe(false);
  });
});
