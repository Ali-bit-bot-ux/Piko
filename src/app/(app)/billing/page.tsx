import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getDictionary, interpolate } from "@/lib/i18n";
import { requireStaff } from "@/server/auth/session";
import { loadConfig } from "@/server/config";
import { listPaymentsForUser } from "@/server/db/payments";

const { billing: t } = getDictionary();

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = {
  pending: "warning",
  paid: "success",
  cancelled: "neutral",
} as const;

// Directors and admins only: how to pay through Kaspi and the academy's bills.
export default async function BillingPage() {
  const user = await requireStaff();
  const data = await listPaymentsForUser(user);
  if (!data) notFound();
  const { kaspi } = loadConfig();
  const hasDetails = Boolean(kaspi.phone || kaspi.qrUrl);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-ink-muted">{t.intro}</p>
        <p className="font-semibold">
          {interpolate(t.plan, { plan: t.plans[data.organization.plan] })}
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">{t.howTitle}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          {t.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {hasDetails ? (
          <dl className="flex flex-col gap-2 rounded-xl bg-surface-muted p-4">
            {kaspi.phone ? (
              <div>
                <dt className="text-sm text-ink-muted">{t.phone}</dt>
                <dd className="text-lg font-bold tabular-nums">
                  {kaspi.phone}
                </dd>
              </div>
            ) : null}
            {kaspi.recipient ? (
              <div>
                <dt className="text-sm text-ink-muted">{t.recipient}</dt>
                <dd className="font-semibold">{kaspi.recipient}</dd>
              </div>
            ) : null}
            {kaspi.qrUrl ? (
              <div>
                <dt className="text-sm text-ink-muted">{t.qr}</dt>
                <dd>
                  {/* eslint-disable-next-line @next/next/no-img-element -- address comes from the server config */}
                  <img
                    src={kaspi.qrUrl}
                    alt={t.qrAlt}
                    width={192}
                    height={192}
                    className="mt-1 h-48 w-48 rounded-lg bg-white"
                  />
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-ink-muted">{t.detailsMissing}</p>
        )}
      </Card>

      <section aria-labelledby="bills-title" className="flex flex-col gap-3">
        <h2 id="bills-title" className="text-lg font-bold tracking-tight">
          {t.listTitle}
        </h2>
        {data.payments.length === 0 ? (
          <Card variant="muted">
            <p className="text-ink-muted">{t.empty}</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.payments.map((payment) => (
              <li key={payment.id}>
                <Card className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xl font-bold tabular-nums">
                      {interpolate(t.amount, {
                        amount: payment.amountKzt.toLocaleString("ru-RU"),
                      })}
                    </span>
                    <Badge variant={STATUS_VARIANT[payment.status]}>
                      {t.status[payment.status]}
                    </Badge>
                  </div>
                  <p>{payment.description}</p>
                  <p className="text-sm text-ink-muted">
                    {interpolate(t.reference, { code: payment.reference })}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {payment.paidAt
                      ? interpolate(t.paidAt, {
                          date: formatDate(payment.paidAt),
                        })
                      : interpolate(t.created, {
                          date: formatDate(payment.createdAt),
                        })}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
