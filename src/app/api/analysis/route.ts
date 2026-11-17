import { NextResponse } from "next/server";
import {
  analyzeCandidate,
  type AnalyzeCandidateError,
} from "@/server/analysis/analyze-candidate";
import {
  MAX_REQUEST_BYTES,
  parseAnalysisForm,
} from "@/server/analysis/parse-form";
import { isStaff } from "@/server/auth/policy";
import { getCurrentUser } from "@/server/auth/session";

const STATUS: Record<AnalyzeCandidateError, number> = {
  invalid: 400,
  too_large: 413,
  forbidden: 403,
  not_found: 404,
  closed: 409,
  unavailable: 503,
  failed: 502,
};

const fail = (code: AnalyzeCandidateError | "unauthorized" | "generic") =>
  NextResponse.json(
    { ok: false, code },
    {
      status:
        code === "unauthorized" ? 401 : code === "generic" ? 500 : STATUS[code],
    },
  );

/**
 * Receives video frames of one child (multipart/form-data) and answers with
 * AI score suggestions. The user comes from the session, never from the form.
 * Frames are processed in memory and not stored (AGENTS.md rule 4, D-020).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user) || user.organizationId === null) {
    return fail("unauthorized");
  }

  // Cheap check first: do not read an oversized body at all.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    return fail("too_large");
  }

  try {
    const form = await request.formData().catch(() => null);
    const input = form ? await parseAnalysisForm(form) : null;
    if (!input) return fail("invalid");

    const result = await analyzeCandidate(user, input);
    if (!result.ok) return fail(result.code);
    return NextResponse.json({
      ok: true,
      analysis: {
        id: result.analysisId,
        provider: result.provider,
        createdAt: result.createdAt.toISOString(),
        result: result.result,
      },
    });
  } catch (error) {
    // No request content in the log: it holds pictures of children.
    console.error(
      "analysis request failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return fail("generic");
  }
}
