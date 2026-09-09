import { notFound } from "next/navigation";
import { getSite } from "@/content";
import Shell from "@/components/shell";
import WorldMap from "@/components/world-map";
import { Localisation } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot } from "@/components/visuals";

export function generateMetadata() {
  return { title: getSite().ui.pageTitles.localisation ?? "" };
}

/** 글로벌 전용 */
export default function LocalisationPage() {
  const site = getSite();
  if (!site.localisation) notFound();
  const l = site.localisation;

  return (
    <Shell>
      <PageHead label={l.label} title={l.heading} lead={l.lead} />
      <Localisation site={site} bare />
      {site.map ? <WorldMap map={site.map} /> : null}
      <section className="divided">
        <div className="wrap photosplit">
          <PhotoSlot caption={site.ui.photos.localisation} ratio="4 / 3" />
          <div>
            <span className="label-sm">NEXT</span>
            <h2 style={{ margin: "16px 0 20px" }}>Who does what, and how a rollout starts</h2>
            <div className="nextgrid" style={{ gridTemplateColumns: "1fr" }}>
              <NextLink label="partnership" title="Partnership model" href="/partnership" />
              <NextLink label="contact" title="Talk to us" href="/contact" />
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
