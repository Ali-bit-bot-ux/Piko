import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { IntakeCard } from "@/components/features/cabinet/intake-card";
import { Button, Card } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { canManageIntakes } from "@/server/auth/policy";
import { requireStaff } from "@/server/auth/session";
import { loadConfig } from "@/server/config";
import { findIntakeForUser } from "@/server/db/intakes";
import { qrSvg, registrationUrl } from "@/server/intakes/qr";
import { publishIntakeAction } from "./actions";

const t = getDictionary().intakeDetail;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function IntakePage(props: PageProps<"/intakes/[id]">) {
  const user = await requireStaff();
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();

  // Another academy's intake looks exactly like a missing one.
  const intake = await findIntakeForUser(user, id);
  if (!intake) notFound();

  const url = registrationUrl(loadConfig().appUrl, intake.id);
  const qr = intake.status === "open" ? await qrSvg(url) : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={routes.dashboard}
        className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        ← {t.back}
      </Link>

      <IntakeCard
        intake={{
          id: intake.id,
          name: intake.name,
          birthYear: intake.birthYear,
          ageProfile: intake.ageProfile,
          tryoutDate: intake.tryoutDate,
          status: intake.status,
          candidateCount: null,
        }}
        headingLevel={1}
      />

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">
          {t.registrationTitle}
        </h2>

        {intake.status === "draft" ? (
          <>
            <p className="text-ink-muted">{t.draftNote}</p>
            {canManageIntakes(user) ? (
              <form action={publishIntakeAction.bind(null, intake.id)}>
                <Button type="submit">{t.publish}</Button>
              </form>
            ) : null}
          </>
        ) : qr ? (
          <>
            <p className="text-ink-muted">{t.registrationHint}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL, nothing to optimize */}
            <img
              src={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`}
              alt={t.qrAlt}
              width={224}
              height={224}
              className="size-56 rounded-xl border border-line"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{t.linkLabel}</span>
              <a
                href={url}
                className="break-all text-primary underline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {url}
              </a>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
