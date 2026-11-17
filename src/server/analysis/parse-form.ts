import { MAX_FRAMES_TOTAL_BYTES } from "./analyze-candidate";

/** Body limit of the route: all frames plus form overhead. */
export const MAX_REQUEST_BYTES = MAX_FRAMES_TOTAL_BYTES + 256 * 1024;

/**
 * Turns the multipart form of POST /api/analysis into the input of
 * analyzeCandidate (which validates it). `frame` files and `time` values
 * (seconds) go in pairs by position. Returns null when the form is malformed.
 */
export async function parseAnalysisForm(form: FormData): Promise<{
  intakeId: string;
  candidateId: string;
  frames: { timeSec: number; mimeType: string; data: Uint8Array }[];
} | null> {
  const intakeId = form.get("intakeId");
  const candidateId = form.get("candidateId");
  const files = form.getAll("frame");
  const times = form.getAll("time");
  if (typeof intakeId !== "string" || typeof candidateId !== "string") {
    return null;
  }
  if (files.length !== times.length) return null;

  const frames = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const time = times[index];
    if (typeof file === "string" || typeof time !== "string") return null;
    // Number("") is 0, so an empty time must be refused explicitly.
    const timeSec = time.trim() === "" ? Number.NaN : Number(time);
    frames.push({
      timeSec,
      mimeType: file.type,
      data: new Uint8Array(await file.arrayBuffer()),
    });
  }
  return { intakeId, candidateId, frames };
}
