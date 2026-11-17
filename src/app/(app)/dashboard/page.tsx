import type { Metadata } from "next";
import { IntakeCard } from "@/components/features/cabinet/intake-card";
import { ButtonLink, Card } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { canManageIntakes } from "@/server/auth/policy";
import { requireStaff } from "@/server/auth/session";
import { listIntakesForUser } from "@/server/db/intakes";

const { intakes: t, intakeForm } = getDictionary();

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

// Cabinet home: intakes of the signed-in user's academy.
// Creating an intake arrives in T-021.
export default async function DashboardPage() {
  const user = await requireStaff();
  const intakes = await listIntakesForUser(user);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        {canManageIntakes(user) ? (
          <ButtonLink href={routes.intakeNew} variant="accent">
            {intakeForm.create}
          </ButtonLink>
        ) : null}
      </div>

      {intakes.length === 0 ? (
        <Card variant="muted">
          <p className="text-ink-muted">{t.empty}</p>
        </Card>
      ) : (
        <ul aria-label={t.listLabel} className="grid gap-4 md:grid-cols-2">
          {intakes.map((intake) => (
            <li key={intake.id}>
              <IntakeCard
                intake={{
                  id: intake.id,
                  name: intake.name,
                  birthYear: intake.birthYear,
                  ageProfile: intake.ageProfile,
                  tryoutDate: intake.tryoutDate,
                  status: intake.status,
                  candidateCount: intake._count.candidates,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
