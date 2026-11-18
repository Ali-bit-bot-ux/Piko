import { afterEach, describe, expect, it, vi } from "vitest";
import { logFailure } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("logFailure", () => {
  it("logs the class and code, never the message or arguments", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("fullName: Иван Иванов"), {
      code: "P2002",
    });
    logFailure("saving failed", error);
    expect(spy).toHaveBeenCalledWith("saving failed", "Error P2002");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("Иван");
  });

  it("copes with values that are not errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logFailure("x", "just a string with Иван");
    logFailure("y", null);
    expect(spy).toHaveBeenNthCalledWith(1, "x", "unknown");
    expect(spy).toHaveBeenNthCalledWith(2, "y", "unknown");
  });
});
