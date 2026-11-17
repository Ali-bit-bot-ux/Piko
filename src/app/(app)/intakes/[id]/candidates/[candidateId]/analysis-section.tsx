import {
  AnalysisPanel,
  type AnalysisView,
} from "@/components/features/cabinet/analysis-panel";
import { getDictionary } from "@/lib/i18n";
import type { SessionUser } from "@/server/auth/policy";
import { getLatestAnalysisForUser } from "@/server/db/analyses";
import { scoreCriterionAction } from "./actions";

const { analysis: t, results } = getDictionary();
const { criteria: criterionTitles, scale } = results;

/** Server part of the AI hints: loads the last saved analysis for the panel. */
export async function AnalysisSection({
  user,
  intakeId,
  candidateId,
  criteria,
  canScore,
}: {
  user: Pick<SessionUser, "role" | "organizationId">;
  intakeId: string;
  candidateId: string;
  criteria: readonly { key: string; mine: number | null }[];
  canScore: boolean;
}) {
  const stored = await getLatestAnalysisForUser(user, intakeId, candidateId);
  const initial: AnalysisView | null = stored
    ? {
        provider: stored.provider,
        createdAt: stored.createdAt.toISOString(),
        suggestions: stored.result.suggestions,
        summary: stored.result.summary,
        keyMoments: stored.result.keyMoments,
      }
    : null;

  return (
    <AnalysisPanel
      intakeId={intakeId}
      candidateId={candidateId}
      criteria={criteria.map((c) => ({
        key: c.key,
        mine: c.mine,
        title: criterionTitles[c.key as keyof typeof criterionTitles],
      }))}
      initial={initial}
      disabled={!canScore}
      save={scoreCriterionAction.bind(null, intakeId, candidateId)}
      texts={t}
      scale={scale}
    />
  );
}
