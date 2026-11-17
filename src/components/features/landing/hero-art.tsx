import { Badge, Card, ScoreRing } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { CheckIcon } from "./icons";

/** Vector pitch used instead of a photo (no real children, D-013). */
function Pitch() {
  return (
    <svg
      viewBox="0 0 480 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="size-full"
    >
      <defs>
        <linearGradient id="pitch-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f9a1f" />
          <stop offset="1" stopColor="#17610f" />
        </linearGradient>
      </defs>
      <rect width="480" height="400" fill="url(#pitch-bg)" />
      {[0, 80, 160, 240, 320].map((x) => (
        <rect
          key={x}
          x={x}
          width="40"
          height="400"
          fill="#ffffff"
          opacity="0.05"
        />
      ))}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3">
        <rect x="30" y="30" width="420" height="340" rx="6" />
        <path d="M240 30v340" />
        <circle cx="240" cy="200" r="52" />
        <rect x="30" y="130" width="70" height="140" />
        <rect x="380" y="130" width="70" height="140" />
      </g>
      <circle cx="240" cy="200" r="7" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

const cardBase = "flex flex-col gap-3 p-4 sm:p-5 lg:absolute";

/**
 * Decorative illustration: a pitch with floating cards. On small screens the
 * cards sit under the pitch, from lg they float over it. All figures are
 * examples and are marked as such.
 */
export function HeroArt() {
  const t = getDictionary().landing.hero;

  return (
    <div role="img" aria-label={t.illustrationLabel} className="relative">
      <div className="h-48 overflow-hidden rounded-3xl sm:h-64 lg:h-[30rem]">
        <Pitch />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:mt-0 lg:block">
        <Card
          className={`${cardBase} items-start lg:left-[-1.5rem] lg:top-10 lg:w-56`}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t.result.title}</span>
            <Badge variant="accent" className="px-2 py-0.5 text-xs">
              {t.exampleBadge}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing value={4.2} size="sm" label={t.result.ringLabel} />
            <div className="flex flex-col gap-1">
              <Badge variant="success">{t.result.status}</Badge>
              <span className="text-xs text-ink-muted">{t.result.group}</span>
            </div>
          </div>
        </Card>

        <Card className={`${cardBase} lg:right-[-1rem] lg:top-4 lg:w-64`}>
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t.criteria.title}</span>
            <Badge variant="accent" className="px-2 py-0.5 text-xs">
              {t.exampleBadge}
            </Badge>
          </div>
          <ul className="flex flex-col gap-2">
            {t.criteria.items.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <CheckIcon className="size-5 shrink-0 text-success" />
                <span className="flex-1">{item.name}</span>
                <span className="font-semibold">{item.score}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          className={`${cardBase} sm:col-span-2 lg:bottom-[-1rem] lg:left-16 lg:right-auto lg:w-72`}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t.report.title}</span>
            <Badge variant="accent" className="px-2 py-0.5 text-xs">
              {t.exampleBadge}
            </Badge>
          </div>
          <div className="flex flex-col gap-2 text-sm">
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
    </div>
  );
}
