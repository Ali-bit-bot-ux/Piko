import { Badge, Card, type BadgeVariant } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getDictionary, interpolate } from "@/lib/i18n";
import type { AgeProfile, IntakeStatus } from "@/generated/prisma/enums";

const statusVariant: Record<IntakeStatus, BadgeVariant> = {
  draft: "neutral",
  open: "success",
  testing: "accent",
  finished: "neutral",
};

export type IntakeCardData = {
  id: string;
  name: string;
  birthYear: number;
  ageProfile: AgeProfile;
  tryoutDate: Date;
  status: IntakeStatus;
  candidateCount: number;
};

export function IntakeCard({ intake }: { intake: IntakeCardData }) {
  const t = getDictionary().intakes;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">{intake.name}</h2>
        <Badge variant={statusVariant[intake.status]}>
          {t.status[intake.status]}
        </Badge>
      </div>
      <div className="flex flex-col gap-1 text-sm text-ink-muted">
        <p>
          {t.ageProfiles[intake.ageProfile]} ·{" "}
          {interpolate(t.birthYear, { year: intake.birthYear })}
        </p>
        <p>
          {interpolate(t.tryoutDate, { date: formatDate(intake.tryoutDate) })}
        </p>
        <p>{interpolate(t.candidates, { count: intake.candidateCount })}</p>
      </div>
    </Card>
  );
}
