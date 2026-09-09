import { notFound } from "next/navigation";
import { getSite } from "@/content";
import Shell from "@/components/shell";
import { ProcessSection } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot } from "@/components/visuals";

export function generateMetadata() {
  return { title: getSite().ui.pageTitles.adopt ?? "" };
}

export default function AdoptPage() {
  const site = getSite();
  if (!site.process) notFound();
  const p = site.process;
  const u = site.ui;

  return (
    <Shell>
      <PageHead label={p.label} title={p.heading} lead={p.lead} />
      <ProcessSection site={site} bare />
      <section className="divided">
        <div className="wrap photosplit">
          <PhotoSlot caption={u.photos.adopt} ratio="4 / 3" />
          <div>
            <span className="label-sm">누가 무엇을 하나</span>
            <h2 style={{ margin: "16px 0 18px" }}>학과가 할 일은 링크를 나눠주는 것뿐입니다</h2>
            <div className="splitcol" style={{ padding: 0, border: 0 }}>
              <ul>
                <li>계정 생성·명단 업로드가 필요 없습니다</li>
                <li>개인 결과지는 응시 직후 자동 발송됩니다</li>
                <li>기관 리포트는 응시가 쌓이는 대로 갱신됩니다</li>
                <li>결과 공개 시점은 학과가 정할 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="divided">
        <div className="wrap nextgrid">
          {site.university ? (
            <NextLink label="anchor" title={u.linkTitles.anchor} href="/anchor" />
          ) : null}
          <NextLink label="contact" title={u.linkTitles.contact} href="/contact" />
        </div>
      </section>
    </Shell>
  );
}
