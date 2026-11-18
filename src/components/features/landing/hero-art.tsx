import Image from "next/image";
import { Badge, Card, ScoreRing } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { CheckIcon } from "./icons";

const cardBase = "flex flex-col gap-2.5 p-3.5";

/**
 * Photo of a young player with example cards of a result, a parent report and
 * the criteria. On a wide screen the cards stand beside the photo and never
 * cover the boy; on a phone the photo comes first and the cards follow. The
 * numbers are examples (no real child's result is shown) and say so below.
 */
export function HeroArt() {
  const t = getDictionary().landing.hero;

  return (
    <div
      role="img"
      aria-label={t.illustrationLabel}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[10.5rem_14rem_10.5rem] lg:items-center lg:justify-center">
        <div className="relative mx-auto h-80 w-full max-w-sm overflow-hidden rounded-3xl bg-primary sm:col-span-2 sm:h-96 lg:order-2 lg:col-span-1 lg:h-[28rem] lg:max-w-none">
          {/* Photo from the owner's reference sketch; replace with a licensed photo before launch. */}
          <Image
            src="/images/hero-boy.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 224px, 384px"
            className="object-cover object-top"
          />
        </div>

        <div className="flex flex-col gap-4 lg:order-1">
          <Card className={cardBase}>
            <span className="text-sm font-semibold">{t.result.title}</span>
            <div className="flex flex-wrap items-center gap-2">
              <ScoreRing value={4.2} size="sm" label={t.result.ringLabel} />
              <div className="flex flex-col gap-1">
                <Badge variant="success">{t.result.status}</Badge>
                <span className="text-xs text-ink-muted">{t.result.group}</span>
              </div>
            </div>
          </Card>

          <Card className={cardBase}>
            <span className="text-sm font-semibold">{t.report.title}</span>
            <div className="flex flex-col gap-2 text-xs">
              <p>
                <span className="font-semibold text-success">
                  {t.report.strengthLabel}:
                </span>{" "}
                <span className="text-ink-muted">{t.report.strength}</span>
              </p>
              <p>
                <span className="font-semibold text-warning">
                  {t.report.growthLabel}:
                </span>{" "}
                <span className="text-ink-muted">{t.report.growth}</span>
              </p>
            </div>
          </Card>
        </div>

        <Card className={`${cardBase} lg:order-3`}>
          <span className="text-sm font-semibold">{t.criteria.title}</span>
          <ul className="flex flex-col gap-2">
            {t.criteria.items.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-1.5 text-xs text-ink"
              >
                <CheckIcon className="size-4 shrink-0 text-success" />
                <span className="flex-1">{item.name}</span>
                <span className="text-sm font-semibold">{item.score}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="text-center text-xs text-ink-muted">{t.exampleNote}</p>
    </div>
  );
}
