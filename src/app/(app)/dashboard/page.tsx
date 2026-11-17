import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { getDictionary, interpolate } from "@/lib/i18n";
import { requireStaff } from "@/server/auth/session";

const t = getDictionary().dashboard;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

// Placeholder: the real cabinet (list of intakes) arrives in T-020.
export default async function DashboardPage() {
  const user = await requireStaff();

  return (
    <Card>
      <h1 className="text-2xl font-bold tracking-tight">
        {interpolate(t.welcome, { name: user.name })}
      </h1>
      <p className="mt-2 text-ink-muted">
        {t.roleLabel}: {t.roles[user.role]}
      </p>
    </Card>
  );
}
