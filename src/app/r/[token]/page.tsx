import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ReportView } from "@/components/features/report/report-view";
import { Card } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { openReport } from "@/server/reports";

const t = getDictionary().report;

export const metadata: Metadata = {
  title: t.page.title,
  robots: { index: false, follow: false, nocache: true },
};

export default function ReportPage(props: PageProps<"/r/[token]">) {
  return (
    <Suspense fallback={<p className="text-ink-muted">…</p>}>
      <ReportContent params={props.params} />
    </Suspense>
  );
}

async function ReportContent({
  params,
}: {
  params: PageProps<"/r/[token]">["params"];
}) {
  const { token } = await params;
  // The link is read at request time (it records the first open).
  await connection();
  const result = await openReport(token);

  // Wrong, replaced and expired links look exactly the same.
  if (!result.ok) {
    return (
      <Card className="flex w-full max-w-lg flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t.invalid.title}</h1>
        <p className="text-ink-muted">{t.invalid.text}</p>
      </Card>
    );
  }
  return <ReportView report={result.report} />;
}
