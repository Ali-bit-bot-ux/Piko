import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Input,
  Select,
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { contactHref } from "@/lib/contact";
import { APP_TIME_ZONE, formatDate } from "@/lib/format";
import { getDictionary, interpolate } from "@/lib/i18n";
import { candidatePath } from "@/lib/routes";
import type { CandidateStatus, IntakeStatus } from "@/generated/prisma/enums";
import {
  candidateStatuses,
  type CandidateFilters,
} from "@/server/db/candidates";

const statusVariant: Record<CandidateStatus, BadgeVariant> = {
  registered: "neutral",
  checked_in: "accent",
  evaluated: "success",
  decided: "success",
};

export type CandidateRow = {
  id: string;
  fullName: string;
  birthDate: Date;
  parentName: string;
  parentContact: string;
  status: CandidateStatus;
  createdAt: Date;
};

type Props = {
  intakeId: string;
  /** Path of the page the filter form sends to (a plain GET form, no scripts needed). */
  action: string;
  intakeStatus: IntakeStatus;
  filters: CandidateFilters;
  total: number;
  items: readonly CandidateRow[];
};

export function CandidateList({
  intakeId,
  action,
  intakeStatus,
  filters,
  total,
  items,
}: Props) {
  const { candidates: t, results } = getDictionary();
  const filtered = Boolean(filters.q || filters.status);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="candidates-title">
      <h2 id="candidates-title" className="text-lg font-bold tracking-tight">
        {t.title}
      </h2>

      {total > 0 ? (
        <form
          action={action}
          method="get"
          className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end"
        >
          <Input
            label={t.searchLabel}
            name="q"
            type="search"
            placeholder={t.searchPlaceholder}
            defaultValue={filters.q ?? ""}
            maxLength={100}
          />
          <Select
            label={t.statusLabel}
            name="status"
            defaultValue={filters.status ?? ""}
            options={[
              { value: "", label: t.allStatuses },
              ...candidateStatuses.map((value) => ({
                value,
                label: t.status[value],
              })),
            ]}
          />
          <div className="flex gap-2">
            <Button type="submit">{t.apply}</Button>
            {filtered ? (
              <ButtonLink href={action} variant="ghost">
                {t.reset}
              </ButtonLink>
            ) : null}
          </div>
        </form>
      ) : null}

      {total > 0 ? (
        <p role="status" className="text-sm text-ink-muted">
          {interpolate(t.found, { shown: items.length, total })}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Card variant="muted">
          <p className="text-ink-muted">
            {total > 0
              ? t.emptyFiltered
              : intakeStatus === "draft"
                ? t.emptyDraft
                : t.empty}
          </p>
        </Card>
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col gap-3">
          {items.map((candidate) => {
            const href = contactHref(candidate.parentContact);
            return (
              <li key={candidate.id}>
                <Card className="flex flex-col gap-2 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-bold">
                      {candidate.fullName}
                    </h3>
                    <Badge variant={statusVariant[candidate.status]}>
                      {t.status[candidate.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-ink-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
                    <p>
                      {interpolate(t.birthDate, {
                        date: formatDate(candidate.birthDate),
                      })}
                    </p>
                    <p>
                      {interpolate(t.parent, { name: candidate.parentName })}
                    </p>
                    <p>
                      {href ? (
                        <a
                          href={href}
                          className="inline-flex min-h-11 items-center text-primary underline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-0"
                        >
                          {candidate.parentContact}
                        </a>
                      ) : (
                        candidate.parentContact
                      )}
                    </p>
                    <p>
                      {interpolate(t.registeredAt, {
                        date: formatDate(
                          candidate.createdAt,
                          "ru-RU",
                          APP_TIME_ZONE,
                        ),
                      })}
                    </p>
                  </div>
                  <div>
                    <ButtonLink
                      href={candidatePath(intakeId, candidate.id)}
                      variant="secondary"
                      className="w-full sm:w-auto"
                    >
                      {results.candidate.open}
                      <span className="sr-only">: {candidate.fullName}</span>
                    </ButtonLink>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
