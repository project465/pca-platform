import { getSite } from "@/content";
import Shell from "@/components/shell";
import ResultSheet from "@/components/result-sheet";
import { Analyze, Choose, FieldsSection, Styles, Why } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot } from "@/components/visuals";

export function generateMetadata() {
  return { title: getSite().ui.pageTitles.metri };
}

export default function PcaPage() {
  const site = getSite();
  const u = site.ui;
  return (
    <Shell>
      <PageHead label={site.analyze.label} title={site.analyze.heading} lead={site.analyze.lead} />
      <Analyze site={site} bare />
      <FieldsSection site={site} />
      <Styles site={site} />
      <Why site={site} />
      <ResultSheet site={site} />
      <Choose site={site} />
      <section className="divided">
        <div className="wrap photosplit">
          <PhotoSlot
            caption={u.photos.metri}
            src="/photos/07.jpg"
            ratio="4 / 3"
          />
          <div>
            <span className="label-sm">{u.nextLabel}</span>
            <h2 style={{ margin: "16px 0 20px" }}>
              {u.nextHeading}
            </h2>
            <div className="nextgrid" style={{ gridTemplateColumns: "1fr" }}>
              {site.nav.items.slice(1, 3).map((i) => (
                <NextLink key={i.href} label={i.href.replace("/", "")} title={i.label} href={i.href} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
