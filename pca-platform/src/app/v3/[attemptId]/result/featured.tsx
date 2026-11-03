import { factRows, type FeaturedView } from "@/lib/featured";
import { featuredText } from "@/lib/featured/text";

/**
 * 기관 프로그램의 중점 기업 카드(웹 결과 · `/me/region` · 웹을 인쇄한 종이).
 * 지역 절 맨 위에 선다. 값은 전부 `featuredView` 가 들고 오고 여기서 만들지 않는다.
 *
 * **새 class 를 짓지 않는다.** `rs-pack` · `rs-note` · `rs-others` 의 줄 모양을 그대로 쓴다.
 */
export default function FeaturedCard({ f }: { f: FeaturedView }) {
  const co = f.company;
  const tx = featuredText(f.program.audience);
  const l = f.link;
  return (
    <div className="rs-pack" id="featured-company" data-program={f.program.code}>
      <p className="rs-note"><strong>{f.program.title}</strong></p>
      <h3>{co.name} · {co.region}</h3>
      <p>{f.lead}</p>
      <dl>
        {factRows(co).map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd><span>{r.value}</span><span className="rs-others">{r.src}</span></dd>
          </div>
        ))}
        {l.z1.length || l.z2.length ? (
          <div>
            <dt>내 결과에서 이어지는 영역{l.pack ? ` · ${l.pack}` : ""}</dt>
            <dd><span>
              {[...l.z1.map((z) => tx.linkZ1(z.name, z.picks)), ...l.z2.map((z) => tx.linkZ2(z.name, z.picks))].join(" / ")}
              {l.chosen ? ` ${tx.chosen}` : ""}
            </span></dd>
          </div>
        ) : l.pack && l.uses.length ? (
          <div>
            <dt>{l.pack} 산업이 주로 쓰는 영역</dt>
            <dd><span>{l.uses.join(" · ")}{l.chosen ? ` ${tx.chosen}` : ""}</span></dd>
          </div>
        ) : null}
        <div>
          <dt>방문 전에 준비할 것</dt>
          {f.prep.map((p, i) => <dd key={i}><span>{i + 1}. {p}</span></dd>)}
        </div>
        {f.onsite.length ? (
          <div>
            <dt>현장에서 확인할 것</dt>
            {f.onsite.map((q, i) => <dd key={i}><span>{i + 1}. {q}</span></dd>)}
            <dd><span className="rs-others">{f.onsiteSrc}</span></dd>
          </div>
        ) : null}
      </dl>
      <p className="rs-others">{tx.law} {f.sourceLine}</p>
    </div>
  );
}
