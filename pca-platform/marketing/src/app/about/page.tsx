import { getSite } from "@/content";
import Shell from "@/components/shell";
import { About, Evidence, ProgramSection } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot } from "@/components/visuals";

export function generateMetadata() {
  return { title: getSite().ui.pageTitles.about ?? "" };
}

export default function AboutPage() {
  const site = getSite();
  const u = site.ui;
  return (
    <Shell>
      <PageHead label={site.about.label} title={site.about.heading} lead={site.about.body} />
      <About site={site} bare />
      <section className="divided tinted">
        <div className="wrap photorow">
          {u.photos.about.map((c, i) => (
            <PhotoSlot key={c} caption={c} src={`/photos/0${i + 4}.jpg`} tone="ink" />
          ))}
        </div>
      </section>
      <ProgramSection site={site} />
      <Evidence site={site} />
      <section className="divided">
        <div className="wrap nextgrid">
          <NextLink label="pca" title={site.nav.items[0].label} href={site.nav.items[0].href} />
          <NextLink
            label="contact"
            title={site.nav.items[site.nav.items.length - 1].label}
            href="/contact"
          />
        </div>
      </section>
    </Shell>
  );
}
