// Browser-only: cuts JPEG frames out of a video file chosen by the user. The
// file is played into a hidden <video> through an object URL; nothing is
// uploaded and the URL is always released.
import {
  FRAME_JPEG_QUALITY,
  FRAME_MAX_SIDE,
  fitFrameSize,
  frameTimes,
} from "@/lib/video-frames";

export type ExtractedFrame = { timeSec: number; blob: Blob };

export type ExtractErrorCode = "unreadable" | "no_duration" | "cancelled";

export class ExtractError extends Error {
  constructor(readonly code: ExtractErrorCode) {
    super(code);
    this.name = "ExtractError";
  }
}

const STEP_TIMEOUT_MS = 15_000;

function waitFor(
  video: HTMLVideoElement,
  event: "loadedmetadata" | "seeked",
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, onDone);
      video.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onDone = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new ExtractError("unreadable"));
    };
    const onAbort = () => {
      cleanup();
      reject(new ExtractError("cancelled"));
    };
    const timer = setTimeout(onError, STEP_TIMEOUT_MS);
    video.addEventListener(event, onDone, { once: true });
    video.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ExtractError("unreadable"))),
      "image/jpeg",
      FRAME_JPEG_QUALITY,
    );
  });
}

/**
 * Cuts `count` frames at equal intervals. Calls `onProgress(done, total)`
 * after each frame. Rejects with ExtractError (also on abort).
 */
export async function extractFrames(
  file: File,
  count: number,
  options: {
    signal: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<ExtractedFrame[]> {
  const { signal, onProgress } = options;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await waitFor(video, "loadedmetadata", signal);

    const times = frameTimes(video.duration, count);
    if (times.length === 0) throw new ExtractError("no_duration");
    const size = fitFrameSize(
      video.videoWidth,
      video.videoHeight,
      FRAME_MAX_SIDE,
    );
    if (size.width === 0) throw new ExtractError("unreadable");

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new ExtractError("unreadable");

    const frames: ExtractedFrame[] = [];
    for (const timeSec of times) {
      if (signal.aborted) throw new ExtractError("cancelled");
      const seeked = waitFor(video, "seeked", signal);
      video.currentTime = timeSec;
      await seeked;
      context.drawImage(video, 0, 0, size.width, size.height);
      frames.push({ timeSec, blob: await toJpeg(canvas) });
      onProgress?.(frames.length, times.length);
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
