import { notFound } from "next/navigation";
import { getSite } from "@/content";
import Shell from "@/components/shell";
import { University } from "@/components/sections";
import { NextLink, PageHead } from "@/components/visuals";

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
      {/* 지역 연계 절을 지웠다. 소재지 기관·기업 184곳을 적합도로 나눠
          준다고 적어 두었는데, `companies` 와 `jd_postings` 표가 **0줄**
          이고 기업을 적합도로 정렬하는 코드도 없다. 지금 받아 두는 것은
          희망 지역과 이동 범위와 정주·만족도 문항뿐이고, 그것은 위
          `University` 절이 이미 적는다. 자리만 비워 두지 않고 절째로
          내린 까닭은 사진과 단추까지 그 주장을 거드는 자리였기 때문이다 */}
      <section className="divided">
        <div className="wrap nextgrid">
          <NextLink label="adopt" title="도입 안내" href="/adopt" />
          <NextLink label="contact" title="도입·상담 문의" href="/contact" />
        </div>
      </section>
    </Shell>
  );
}
