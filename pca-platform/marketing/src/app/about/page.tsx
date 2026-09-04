import { getSite } from "@/content";
import Shell from "@/components/shell";
import { About, Evidence, ProgramSection } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot } from "@/components/visuals";

export const metadata = { title: "About" };

export default function AboutPage() {
  const site = getSite();
  const kr = site.key === "kr";
  return (
    <Shell>
      <PageHead label={site.about.label} title={site.about.heading} lead={site.about.body} />
      <About site={site} />
      <section className="divided tinted">
        <div className="wrap photorow">
          <PhotoSlot caption={kr ? "사진 자리 — 대학 행사 운영" : "Photo — university event"} tone="ink" />
          <PhotoSlot caption={kr ? "사진 자리 — 전문가 초청 특강" : "Photo — invited speaker"} tone="ink" />
          <PhotoSlot caption={kr ? "사진 자리 — 팀 또는 사무 공간" : "Photo — the team"} tone="ink" />
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
