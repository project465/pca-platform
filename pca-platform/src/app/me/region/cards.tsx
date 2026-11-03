import type { RegionView } from "@/lib/me-v3/report-long/region";
import { REGION_LAW } from "@/lib/me-v3/report-long/region";
import { groupLink, regionBlocks, short } from "@/app/v3/[attemptId]/result/region";

/**
 * `/me/region` 의 지역 회사 목록(2026-11-03 대표 "너무 글씨만 있고 붙어 있다").
 *
 * **모양만 바꾼다.** 묶는 법 · 산업 묶음 · 문구는 결과 화면(`result/region.tsx`)과 같은 함수에서 온다. 바뀐 것은
 * 회사 하나가 카드 하나라는 것, 묶음 제목에 수 배지, 이어지는 영역을 칩으로, 출처 · 안내를 본문 아래 상자로 뺀 것이다.
 * 새 색 · 장식을 들이지 않는다: 카드와 칩은 작업공간이 이미 쓰는 값(`--sf-*` · `.cm-chip`)을 그대로 쓴다.
 */
export default function RegionCards({ v, chosen }: { v: RegionView; chosen: string[] }) {
  const matched = v.groups.reduce((a, g) => a + g.orgs.length, 0);
  const blocks = regionBlocks(v, chosen);
  return (
    <div className="cm-rg">
      <p className="cm-rg-intro">
        {blocks.length
          ? `공시(OpenDART)와 공개 명단의 ${v.label} 기업 ${v.all.length}곳 가운데 ${matched}곳을 업종으로 산업에 나눠 내 결과에 대어 보았습니다. 점수나 순위가 아닙니다.`
          : `공시(OpenDART)와 공개 명단의 ${v.label} 기업 ${v.all.length}곳 가운데 이 전공의 산업에 이어지는 곳을 찾지 못했습니다.`}
      </p>
      {blocks.map((b) => (
        <section className="cm-rg-block" key={b.key}>
          <h3 className="cm-rg-h">
            {b.title}
            <span className="cm-rg-n">{b.groups.reduce((a, g) => a + g.orgs.length, 0)}곳</span>
          </h3>
          <p className="cm-rg-sub">{b.note}</p>
          {b.groups.map((g) => {
            const k = groupLink(g);
            return (
              <div className="cm-rg-ind" key={g.pack.code}>
                <h4>{g.pack.name_ko}<span>{g.orgs.length}곳</span></h4>
                {k ? (
                  <div className="cm-chips cm-rg-tags" aria-label={k.label}>
                    <span className="cm-rg-tl">{k.label}</span>
                    {k.domains.map((d) => <span className="cm-chip" key={d}>{d}</span>)}
                  </div>
                ) : null}
                <div className="cm-rg-grid">
                  {g.orgs.slice(0, 3).map((o) => (
                    <div className="cm-rg-co" key={o.name}>
                      <b>{o.name}</b>
                      {o.listed ? <span className="cm-rg-badge">{o.listed} 상장</span> : null}
                      <small>{[o.sector, o.product ? `주력 품목 ${o.product}` : ""].filter(Boolean).join(" · ")}</small>
                    </div>
                  ))}
                </div>
                {g.orgs.length > 3 ? (
                  <p className="cm-rg-more">
                    같은 산업 {g.orgs.length - 3}곳 더 · {g.orgs.slice(3, 11).map((o) => short(o.name)).join(" · ")}{g.orgs.length > 11 ? " 등" : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}
      <aside className="cm-rg-foot">
        {v.unmatched ? <p>업종만으로 어느 산업인지 정하기 어려운 {v.unmatched}곳은 넣지 않았습니다.</p> : null}
        <p>{REGION_LAW.replace("이 장은", "이 목록은")}</p>
        <p>출처: {v.sources.join(" · ")}{v.checkedOn ? ` · 기준일 ${v.checkedOn}` : ""}</p>
      </aside>
    </div>
  );
}
