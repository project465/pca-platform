import { notFound } from "next/navigation";
import { getSite } from "@/content";
import Shell from "@/components/shell";
import { Partnership } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot } from "@/components/visuals";

export const metadata = { title: "Partnership" };

/** 글로벌 전용 */
export default function PartnershipPage() {
  const site = getSite();
  if (!site.partnership) notFound();
  const p = site.partnership;

  return (
    <Shell>
      <PageHead label={p.label} title={p.heading} lead={p.lead} />
      <Partnership site={site} />
      <section className="divided">
        <div className="wrap photorow">
          <PhotoSlot caption="Photo — partner briefing" />
          <PhotoSlot caption="Photo — pilot cohort sitting" />
          <PhotoSlot caption="Photo — results workshop" />
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
