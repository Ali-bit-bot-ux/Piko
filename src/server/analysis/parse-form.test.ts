import { describe, expect, it } from "vitest";
import { parseAnalysisForm } from "./parse-form";

const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "f.png", {
  type: "image/png",
});

function form(entries: [string, string | File][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("parseAnalysisForm", () => {
  it("pairs frames with their times", async () => {
    const parsed = await parseAnalysisForm(
      form([
        ["intakeId", "i"],
        ["candidateId", "c"],
        ["frame", png()],
        ["time", "1.5"],
        ["frame", png()],
        ["time", "4"],
      ]),
    );
    expect(parsed?.intakeId).toBe("i");
    expect(parsed?.frames.map((f) => f.timeSec)).toEqual([1.5, 4]);
    expect(parsed?.frames[0].mimeType).toBe("image/png");
    expect(Array.from(parsed!.frames[0].data)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("refuses malformed forms", async () => {
    expect(await parseAnalysisForm(form([["candidateId", "c"]]))).toBeNull();
    expect(
      await parseAnalysisForm(
        form([
          ["intakeId", "i"],
          ["candidateId", "c"],
          ["frame", png()],
        ]),
      ),
    ).toBeNull();
    expect(
      await parseAnalysisForm(
        form([
          ["intakeId", "i"],
          ["candidateId", "c"],
          ["frame", "text"],
          ["time", "1"],
        ]),
      ),
    ).toBeNull();
  });

  it("turns a bad time into NaN so validation rejects it", async () => {
    const parsed = await parseAnalysisForm(
      form([
        ["intakeId", "i"],
        ["candidateId", "c"],
        ["frame", png()],
        ["time", ""],
      ]),
    );
    expect(parsed?.frames[0].timeSec).toBeNaN();
  });
});
