import { notFound } from "next/navigation";
import { getSite } from "@/content";
import Shell from "@/components/shell";
import { University } from "@/components/sections";
import { NextLink, PageHead, PhotoSlot, PullQuote } from "@/components/visuals";

export const metadata = { title: "지역·앵커" };

/** 한국 전용. 다른 나라 원고에는 이 절이 없다 */
export default function AnchorPage() {
  const site = getSite();
  if (!site.university) notFound();
  const u = site.university;

  return (
    <Shell>
      <PageHead label={u.label} title={u.heading} lead={u.lead} />
      <University site={site} />
      <section className="divided tinted">
        <div className="wrap photosplit">
          <div>
            <span className="label-sm">지역 연계</span>
            <h2 style={{ margin: "16px 0 18px" }}>
              소재지의 실제 기관·기업으로 이어집니다
            </h2>
            <PullQuote source="실제 결과지 · 섹션 9 도입부">
              대전광역시 내 소재 기관·기업 184곳을 적합도(높음 144 · 보통 40 · 낮음 0)로
              나누어 정리했습니다.
            </PullQuote>
            <div style={{ marginTop: 24 }}>
              <a className="btn lg solid" href="/pca">
                결과지 9번 섹션 보기
              </a>
            </div>
          </div>
          <PhotoSlot caption="사진 자리 — 지역 기관·기업 방문 또는 지역 채용 행사" ratio="4 / 3" />
        </div>
      </section>
      <section className="divided">
        <div className="wrap nextgrid">
          <NextLink label="adopt" title="도입 안내" href="/adopt" />
          <NextLink label="contact" title="도입·상담 문의" href="/contact" />
        </div>
      </section>
    </Shell>
  );
}
