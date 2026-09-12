import { getSite } from "@/content";
import Shell from "@/components/shell";
import { FaqSection, PricingSection, RegionsSection } from "@/components/sections";
import { NextLink, PageHead } from "@/components/visuals";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  const site = getSite();
  return (
    <Shell>
      <PageHead label={site.pricing.label} title={site.pricing.heading} lead={site.pricing.lead} />
      <PricingSection site={site} />
      <RegionsSection site={site} />
      <FaqSection site={site} />
      <section className="divided">
        <div className="wrap nextgrid">
          <NextLink label="pca" title={site.chrome.nextDiagnosis} href="/pca" />
          <NextLink label="contact" title={site.chrome.nextContact} href="/contact" />
        </div>
      </section>
    </Shell>
  );
}
