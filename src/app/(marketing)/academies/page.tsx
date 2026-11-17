import type { Metadata } from "next";
import { CtaBanner } from "@/components/features/landing/cta-banner";
import {
  FeatureSection,
  PageIntro,
} from "@/components/features/landing/page-sections";
import { ArrowRightIcon, ButtonLink } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";

const t = getDictionary().landing.pages.academies;

export const metadata: Metadata = {
  title: `${t.title} | Piko`,
  description: t.description,
};

export default function AcademiesPage() {
  return (
    <>
      <PageIntro title={t.title} lead={t.lead}>
        <ButtonLink href={routes.signup} size="lg">
          {t.cta}
          <ArrowRightIcon className="size-5" />
        </ButtonLink>
      </PageIntro>
      <FeatureSection id="roles-title" title={t.rolesTitle} items={t.roles} />
      <CtaBanner />
    </>
  );
}
