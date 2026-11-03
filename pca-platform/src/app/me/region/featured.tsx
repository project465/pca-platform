import { factRows, type FeaturedView } from "@/lib/featured";
import { featuredText } from "@/lib/featured/text";

/**
 * `/me/region` 의 중점 기업 카드(기관 프로그램 참여자만). 결과 화면 카드(`v3/[attemptId]/result/featured.tsx`)와 같은
 * 값(`featuredView`)을 이 쪽의 지역 카드 모양(`cm-rg-*`)으로 세운다. 지역 화면을 카드로 바꾸면서(9eb9c07d) 빠졌던 자리다.
 * **새 class 를 짓지 않는다.**
 */
export default function RegionFeatured({ f }: { f: FeaturedView }) {
  const co = f.company;
  const tx = featuredText(f.program.audience);
  const l = f.link;
  const linked = l.z1.length || l.z2.length
    ? [...l.z1.map((z) => tx.linkZ1(z.name, z.picks)), ...l.z2.map((z) => tx.linkZ2(z.name, z.picks))]
    : l.pack && l.uses.length ? [l.uses.join(" · ")] : [];
  return (
    <section className="cm-rg-block" id="featured-company" data-program={f.program.code}>
      <h3 className="cm-rg-h">{co.name} · {co.region}</h3>
      <p className="cm-rg-sub">{f.program.title}</p>
      <p className="cm-rg-intro">{f.lead}</p>
      <div className="cm-rg-ind">
        {factRows(co).map((r) => (
          <p key={r.label}><b>{r.label}</b> {r.value} <small className="cm-rg-sec">{r.src}</small></p>
        ))}
      </div>
      {linked.length ? (
        <div className="cm-rg-ind">
          <h4>{l.z1.length || l.z2.length ? `내 결과에서 이어지는 영역${l.pack ? ` · ${l.pack}` : ""}` : `${l.pack} 산업이 주로 쓰는 영역`}</h4>
          {linked.map((x, i) => <p key={i}>{x}</p>)}
          {l.chosen ? <p>{tx.chosen(l.pack)}</p> : null}
        </div>
      ) : null}
      <div className="cm-rg-ind">
        <h4>방문 전에 준비할 것</h4>
        {f.prep.map((p, i) => <p key={i}>{i + 1}. {p}</p>)}
      </div>
      {f.onsite.length ? (
        <div className="cm-rg-ind">
          <h4>현장에서 확인할 것</h4>
          {f.onsite.map((q, i) => <p key={i}>{i + 1}. {q}</p>)}
          <p className="cm-rg-sub">{f.onsiteSrc}</p>
        </div>
      ) : null}
      <aside className="cm-rg-foot"><p>{tx.law} {f.sourceLine}</p></aside>
    </section>
  );
}
