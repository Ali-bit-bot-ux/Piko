import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { Card } from "@/components/ui";
import { getDictionary, interpolate } from "@/lib/i18n";
import { getPrisma } from "@/server/db/client";
import { JoinForm } from "./join-form";

const t = getDictionary().join;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

export default function JoinPage(props: PageProps<"/join/[intakeId]">) {
  return (
    <Suspense fallback={<p className="text-ink-muted">…</p>}>
      <JoinContent params={props.params} />
    </Suspense>
  );
}

async function JoinContent({
  params,
}: {
  params: PageProps<"/join/[intakeId]">["params"];
}) {
  const { intakeId } = await params;

  // Public page: read only what a parent needs, never the academy or staff.
  const intake = z.uuid().safeParse(intakeId).success
    ? await getPrisma().intake.findUnique({
        where: { id: intakeId },
        select: { name: true, birthYear: true, status: true },
      })
    : null;

  if (!intake || intake.status !== "open") {
    return (
      <Card className="flex w-full max-w-lg flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t.closedTitle}</h1>
        <p className="text-ink-muted">{t.closedText}</p>
      </Card>
    );
  }

  return (
    <Card className="flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="font-medium">
          {interpolate(t.intro, { name: intake.name })}
        </p>
        <p className="text-sm text-ink-muted">
          {interpolate(t.group, { year: intake.birthYear })}
        </p>
      </div>
      <JoinForm
        intakeId={intakeId}
        birthYear={intake.birthYear}
        texts={{
          childName: t.childName,
          childBirthDate: t.childBirthDate,
          parentName: t.parentName,
          parentContact: t.parentContact,
          parentContactHint: t.parentContactHint,
          consent: t.consent,
          consentNote: t.consentNote,
          submit: t.submit,
          submitting: t.submitting,
          successTitle: t.successTitle,
          successText: t.successText,
          errors: t.errors,
          codes: t.codes,
        }}
      />
    </Card>
  );
}
