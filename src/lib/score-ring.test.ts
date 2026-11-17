import { describe, expect, it } from "vitest";
import { ringGeometry } from "./score-ring";

describe("ringGeometry", () => {
  it("computes the ratio of value to max", () => {
    expect(ringGeometry(2.5, 5, 40).ratio).toBe(0.5);
  });

  it("leaves a full dash offset at zero and none at max", () => {
    const empty = ringGeometry(0, 5, 40);
    const full = ringGeometry(5, 5, 40);
    expect(empty.dashOffset).toBeCloseTo(empty.circumference);
    expect(full.dashOffset).toBe(0);
  });

  it("clamps values outside the range", () => {
    expect(ringGeometry(9, 5, 40).ratio).toBe(1);
    expect(ringGeometry(-1, 5, 40).ratio).toBe(0);
  });

  it("returns zero for invalid input", () => {
    expect(ringGeometry(3, 0, 40).ratio).toBe(0);
    expect(ringGeometry(Number.NaN, 5, 40).ratio).toBe(0);
  });
});
