import type { Metadata } from "next";
import {
  FeatureSection,
  PageIntro,
} from "@/components/features/landing/page-sections";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary().landing.pages.parents;

export const metadata: Metadata = {
  title: `${t.title} | Piko`,
  description: t.description,
};

export default function ParentsPage() {
  return (
    <>
      <PageIntro title={t.title} lead={t.lead} />
      <FeatureSection
        id="points-title"
        title={t.pointsTitle}
        items={t.points}
      />
    </>
  );
}
