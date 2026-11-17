import Link from "next/link";
import { Badge, Card, type BadgeVariant } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getDictionary, interpolate } from "@/lib/i18n";
import { intakePath } from "@/lib/routes";
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
  /** Null when the number is not loaded (hides the line). */
  candidateCount: number | null;
};

type Props = {
  intake: IntakeCardData;
  /** In a list the title links to the intake; on its own page it is the page heading. */
  headingLevel?: 1 | 2;
};

export function IntakeCard({ intake, headingLevel = 2 }: Props) {
  const t = getDictionary().intakes;
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Heading className="text-lg font-bold tracking-tight">
          {headingLevel === 2 ? (
            <Link
              href={intakePath(intake.id)}
              className="hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              {intake.name}
            </Link>
          ) : (
            intake.name
          )}
        </Heading>
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
        {intake.candidateCount !== null ? (
          <p>{interpolate(t.candidates, { count: intake.candidateCount })}</p>
        ) : null}
      </div>
    </Card>
  );
}
