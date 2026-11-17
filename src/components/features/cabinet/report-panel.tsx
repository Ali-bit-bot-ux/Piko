import {
  createReportLinkAction,
  markReportSentAction,
} from "@/app/(app)/intakes/[id]/candidates/[candidateId]/report-actions";
import { Card } from "@/components/ui";
import { APP_TIME_ZONE, formatDate } from "@/lib/format";
import { getDictionary, interpolate } from "@/lib/i18n";
import type { SessionUser } from "@/server/auth/policy";
import { getReportPanelForUser } from "@/server/reports";
import {
  ReportPanelClient,
  type ReportStatusLine,
} from "./report-panel-client";

/**
 * "Report for the parent": status of the link and the buttons that issue it
 * and hand it to the admin for sending. Nothing is sent by the app. Shows
 * nothing for users who may not manage reports (coaches).
 */
export async function ReportPanel({
  user,
  intakeId,
  candidateId,
  parentContact,
}: {
  user: Pick<SessionUser, "id" | "role" | "organizationId">;
  intakeId: string;
  candidateId: string;
  parentContact: string;
}) {
  const data = await getReportPanelForUser(user, { intakeId, candidateId });
  if (!data) return null;
  const t = getDictionary().report.panel;
  const date = (value: Date) => formatDate(value, "ru-RU", APP_TIME_ZONE);

  const status: ReportStatusLine[] = [];
  if (data.report) {
    const { report } = data;
    status.push(
      {
        text: interpolate(t.statusCreated, { date: date(report.createdAt) }),
        tone: "done",
      },
      {
        text: interpolate(report.expired ? t.statusExpired : t.statusExpires, {
          date: date(report.expiresAt),
        }),
        tone: report.expired ? "warn" : "plain",
      },
      report.sentAt
        ? {
            text: interpolate(t.statusSent, { date: date(report.sentAt) }),
            tone: "done",
          }
        : { text: t.statusNotSent, tone: "plain" },
      report.openedAt
        ? {
            text: interpolate(t.statusOpened, { date: date(report.openedAt) }),
            tone: "done",
          }
        : { text: t.statusNotOpened, tone: "plain" },
    );
  }

  return (
    <Card className="flex flex-col gap-4" aria-labelledby="report-title">
      <div className="flex flex-col gap-1">
        <h2 id="report-title" className="text-lg font-bold tracking-tight">
          {t.title}
        </h2>
        <p className="text-sm text-ink-muted">{t.hint}</p>
      </div>
      {data.canCreate ? (
        <ReportPanelClient
          hasReport={data.report !== null}
          status={status}
          sent={data.report?.sentAt != null}
          contact={parentContact}
          create={createReportLinkAction.bind(null, intakeId, candidateId)}
          markSent={markReportSentAction.bind(null, intakeId, candidateId)}
          texts={t}
        />
      ) : (
        <p className="text-ink-muted">{t.noScore}</p>
      )}
    </Card>
  );
}
