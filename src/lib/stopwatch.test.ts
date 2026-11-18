import { describe, expect, it } from "vitest";
import { formatStopwatch, toSeconds } from "./stopwatch";

describe("formatStopwatch", () => {
  it("formats minutes, seconds and hundredths", () => {
    expect(formatStopwatch(0)).toBe("00:00.00");
    expect(formatStopwatch(5240)).toBe("00:05.24");
    expect(formatStopwatch(65_990)).toBe("01:05.99");
    expect(formatStopwatch(600_000)).toBe("10:00.00");
  });

  it("cuts, not rounds, so the display never runs ahead of the clock", () => {
    expect(formatStopwatch(5249)).toBe("00:05.24");
  });

  it("treats negative and invalid values as zero", () => {
    expect(formatStopwatch(-50)).toBe("00:00.00");
    expect(formatStopwatch(Number.NaN)).toBe("00:00.00");
  });
});

describe("toSeconds", () => {
  it("cuts to hundredths of a second, like the display", () => {
    expect(toSeconds(4052)).toBe(4.05);
    expect(toSeconds(4059)).toBe(4.05);
    expect(toSeconds(0)).toBe(0);
  });

  it("saves exactly what the stopped clock shows", () => {
    for (const ms of [5006, 5009, 4999, 12_345, 65_990, 3]) {
      const shown = formatStopwatch(ms);
      const [minutes, rest] = shown.split(":");
      expect(toSeconds(ms)).toBe(Number(minutes) * 60 + Number(rest));
    }
  });

  it("never returns a negative time", () => {
    expect(toSeconds(-100)).toBe(0);
  });
});
