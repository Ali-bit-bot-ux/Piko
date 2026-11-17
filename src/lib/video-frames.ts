// Pure math for cutting frames out of a video in the browser. The video itself
// never leaves the device: only the JPEG frames are sent (D-020).

/** Same as MAX_FRAMES_PER_REQUEST on the server (checked by a test). */
export const FRAME_COUNT_MAX = 40;
export const FRAME_COUNT_MIN = 1;
export const FRAME_COUNT_DEFAULT = 12;
/** Longest side of a frame, pixels. Enough for a pose, cheap to send. */
export const FRAME_MAX_SIDE = 1024;
export const FRAME_JPEG_QUALITY = 0.7;

/** A whole number within the allowed range; the default for junk input. */
export function clampFrameCount(value: number): number {
  if (!Number.isFinite(value)) return FRAME_COUNT_DEFAULT;
  return Math.min(
    FRAME_COUNT_MAX,
    Math.max(FRAME_COUNT_MIN, Math.round(value)),
  );
}

/**
 * Moments (seconds) at the middle of `count` equal parts of the video, so the
 * first and last frames are not black fade-in or fade-out. Empty for a video
 * without a known duration.
 */
export function frameTimes(durationSec: number, count: number): number[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return [];
  const n = clampFrameCount(count);
  const step = durationSec / n;
  return Array.from(
    { length: n },
    (_, i) => Math.round((i + 0.5) * step * 1000) / 1000,
  );
}

/** Size that fits `maxSide` on the longer side, never enlarging. */
export function fitFrameSize(
  width: number,
  height: number,
  maxSide: number = FRAME_MAX_SIDE,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
