import { getSite } from "@/content";
import Shell from "@/components/shell";
import { About, Evidence, ProgramSection } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot } from "@/components/visuals";

export const metadata = { title: "About" };

export default function AboutPage() {
  const site = getSite();
  return (
    <Shell>
      <PageHead label={site.about.label} title={site.about.heading} lead={site.about.body} />
      <About site={site} />
      <section className="divided tinted">
        <div className="wrap photorow">
          {site.chrome.photosAbout.map((caption) => (
            <PhotoSlot key={caption} caption={caption} tone="ink" />
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
