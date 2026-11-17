import type { Metadata } from "next";
import { AudienceStrip } from "@/components/features/landing/audience-strip";
import { Benefits } from "@/components/features/landing/benefits";
import { CtaBanner } from "@/components/features/landing/cta-banner";
import { Hero } from "@/components/features/landing/hero";
import { ProcessSteps } from "@/components/features/landing/process-steps";
import { getDictionary } from "@/lib/i18n";

const { home } = getDictionary().landing;

export const metadata: Metadata = {
  title: home.title,
  description: home.description,
};

export default function Home() {
  return (
    <>
      <Hero />
      <AudienceStrip />
      <Benefits />
      <ProcessSteps />
      <CtaBanner />
    </>
  );
}
