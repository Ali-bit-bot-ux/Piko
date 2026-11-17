import { describe, expect, it } from "vitest";
import { outcomeOf } from "./send-outcome";

describe("outcomeOf", () => {
  it("treats a saved result as sent", () => {
    expect(outcomeOf({ ok: true })).toBe("sent");
  });

  it("retries a server fault", () => {
    expect(outcomeOf({ ok: false, code: "generic" })).toBe("retry");
  });

  it.each(["invalid", "forbidden", "not_found", "closed", "attempt_taken"])(
    "drops the final refusal %s",
    (code) => {
      expect(outcomeOf({ ok: false, code })).toBe("drop");
    },
  );
});
