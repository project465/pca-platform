import { notFound } from "next/navigation";
import { getSite } from "@/content";
import Shell from "@/components/shell";
import { Partnership } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot } from "@/components/visuals";

export function generateMetadata() {
  return { title: getSite().ui.pageTitles.partnership ?? "" };
}

/** 글로벌 전용 */
export default function PartnershipPage() {
  const site = getSite();
  if (!site.partnership) notFound();
  const p = site.partnership;

  return (
    <Shell>
      <PageHead label={p.label} title={p.heading} lead={p.lead} />
      <Partnership site={site} bare />
      <section className="divided">
        <div className="wrap photorow">
          <PhotoSlot caption="A partner briefing" src="/photos/11.jpg" />
          <PhotoSlot caption="A pilot cohort sitting the assessment" src="/photos/12.jpg" />
          <PhotoSlot caption="A workshop reading the results" src="/photos/13.jpg" />
        </div>
      </section>
      <section className="divided">
        <div className="wrap nextgrid">
          <NextLink label="localisation" title="What travels, and what gets rebuilt" href="/localisation" />
          <NextLink label="contact" title="Talk to us" href="/contact" />
        </div>
      </section>
    </Shell>
  );
}
