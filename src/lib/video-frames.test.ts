import { describe, expect, it } from "vitest";
import { MAX_FRAMES_PER_REQUEST } from "@/server/analysis/types";
import {
  FRAME_COUNT_DEFAULT,
  FRAME_COUNT_MAX,
  clampFrameCount,
  fitFrameSize,
  frameTimes,
} from "./video-frames";

describe("video frames math", () => {
  it("keeps the client limit equal to the server limit", () => {
    expect(FRAME_COUNT_MAX).toBe(MAX_FRAMES_PER_REQUEST);
  });

  it("clamps the frame count", () => {
    expect(clampFrameCount(12)).toBe(12);
    expect(clampFrameCount(0)).toBe(1);
    expect(clampFrameCount(500)).toBe(FRAME_COUNT_MAX);
    expect(clampFrameCount(7.6)).toBe(8);
    expect(clampFrameCount(Number.NaN)).toBe(FRAME_COUNT_DEFAULT);
  });

  it("takes the middle of equal parts of the video", () => {
    expect(frameTimes(60, 4)).toEqual([7.5, 22.5, 37.5, 52.5]);
    expect(frameTimes(10, 1)).toEqual([5]);
  });

  it("returns no moments without a duration and caps the count", () => {
    expect(frameTimes(0, 5)).toEqual([]);
    expect(frameTimes(Number.POSITIVE_INFINITY, 5)).toEqual([]);
    expect(frameTimes(100, 999)).toHaveLength(FRAME_COUNT_MAX);
  });

  it("keeps every moment inside the video", () => {
    const times = frameTimes(3.3, 40);
    expect(Math.min(...times)).toBeGreaterThan(0);
    expect(Math.max(...times)).toBeLessThan(3.3);
  });

  it("fits the longer side and never enlarges", () => {
    expect(fitFrameSize(1920, 1080)).toEqual({ width: 1024, height: 576 });
    expect(fitFrameSize(1080, 1920)).toEqual({ width: 576, height: 1024 });
    expect(fitFrameSize(640, 480)).toEqual({ width: 640, height: 480 });
    expect(fitFrameSize(0, 480)).toEqual({ width: 0, height: 0 });
    expect(fitFrameSize(5000, 1)).toEqual({ width: 1024, height: 1 });
  });
});
