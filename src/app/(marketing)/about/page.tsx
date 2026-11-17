import type { Metadata } from "next";
import { CtaBanner } from "@/components/features/landing/cta-banner";
import {
  FeatureSection,
  PageIntro,
} from "@/components/features/landing/page-sections";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary().landing.pages.about;

export const metadata: Metadata = {
  title: `${t.title} | Piko`,
  description: t.description,
};

export default function AboutPage() {
  return (
    <>
      <PageIntro title={t.title} lead={t.lead} />
      <FeatureSection
        id="principles-title"
        title={t.principlesTitle}
        items={t.principles}
      />
      <CtaBanner />
    </>
  );
}
