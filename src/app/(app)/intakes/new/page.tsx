import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { canManageIntakes } from "@/server/auth/policy";
import { requireStaff } from "@/server/auth/session";
import { NewIntakeForm } from "./new-intake-form";

const { intakeForm: t, intakes } = getDictionary();

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

export default async function NewIntakePage() {
  const user = await requireStaff();
  if (!canManageIntakes(user)) redirect(routes.dashboard);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
      <Card>
        <NewIntakeForm
          cancelHref={routes.dashboard}
          texts={{
            name: t.name,
            namePlaceholder: t.namePlaceholder,
            birthYear: t.birthYear,
            tryoutDate: t.tryoutDate,
            ageProfileHint: t.ageProfileHint,
            submit: t.submit,
            submitting: t.submitting,
            cancel: t.cancel,
            errorForbidden: t.errorForbidden,
            errors: t.errors,
            ageProfiles: intakes.ageProfiles,
          }}
        />
      </Card>
    </div>
  );
}
