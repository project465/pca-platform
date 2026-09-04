import { getSite } from "@/content";
import Shell from "@/components/shell";
import { FaqSection, PricingSection, RegionsSection } from "@/components/sections";
import { NextLink, PageHead } from "@/components/visuals";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  const site = getSite();
  const kr = site.key === "kr";
  return (
    <Shell>
      <PageHead label={site.pricing.label} title={site.pricing.heading} lead={site.pricing.lead} />
      <PricingSection site={site} />
      <RegionsSection site={site} />
      <FaqSection site={site} />
      <section className="divided">
        <div className="wrap nextgrid">
          <NextLink label="pca" title={kr ? "PCA 진단 자세히" : "The diagnosis"} href="/pca" />
          <NextLink label="contact" title={kr ? "도입·상담 문의" : "Talk to us"} href="/contact" />
        </div>
      </section>
    </Shell>
  );
}
