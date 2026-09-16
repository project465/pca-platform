import { getSite } from "@/content";
import Shell from "@/components/shell";
import { FaqSection, PricingSection, RegionsSection } from "@/components/sections";
import { NextLink, PageHead } from "@/components/visuals";

export function generateMetadata() {
  return { title: getSite().ui.pageTitles.pricing ?? "" };
}

export default function PricingPage() {
  const site = getSite();
  const u = site.ui;
  return (
    <Shell>
      <PageHead label={site.pricing.label} title={site.pricing.heading} lead={site.pricing.lead} />
      <PricingSection site={site} bare />
      <RegionsSection site={site} />
      <FaqSection site={site} />
      <section className="divided">
        <div className="wrap nextgrid">
          <NextLink label="metri" title={u.linkTitles.metri} href="/metri" />
          <NextLink label="contact" title={u.linkTitles.contact} href="/contact" />
        </div>
      </section>
    </Shell>
  );
}
