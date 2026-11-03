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
/**
 * 주력 품목 원문(`광고 제작, 대행, 기획/건축리모델링공사,실내건축공사/`)을 낱말로 가른다. 괄호 안의 쉼표는 가르지
 * 않고, 끝의 빗금 · 겹친 쉼표 · 같은 낱말은 떨군다. 원문 낱말을 고치거나 줄이지는 않는다.
 */
export function productTerms(text: string): string[] {
  const out: string[] = [];
  let cur = "", depth = 0;
  const push = () => { const t = cur.replace(/^[\s·]+|[\s·]+$/g, ""); if (t && !out.includes(t)) out.push(t); cur = ""; };
  for (const ch of text) {
    if (ch === "(" || ch === "（") depth += 1;
    if (ch === ")" || ch === "）") depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === "," || ch === "/" || ch === "，" || ch === "、")) { push(); continue; }
    cur += ch;
  }
  push();
  return out;
}

/** 앞 셋은 칩으로, 나머지는 `더 보기` 안에 */
function Products({ text }: { text: string }) {
  const terms = productTerms(text ?? "");
  if (!terms.length) return null;
  const head = terms.slice(0, 3), rest = terms.slice(3);
  return (
    <div className="cm-rg-pd" aria-label="주력 품목">
      {head.map((t) => <span className="cm-chip" key={t}>{t}</span>)}
      {rest.length ? (
        <details className="cm-rg-pdx">
          <summary>더 보기 {rest.length}</summary>
          <div className="cm-rg-pd">{rest.map((t) => <span className="cm-chip" key={t}>{t}</span>)}</div>
        </details>
      ) : null}
    </div>
  );
}

export default function RegionCards({ v, chosen }: { v: RegionView; chosen: string[] }) {
  const matched = v.groups.reduce((a, g) => a + g.orgs.length, 0);
  const blocks = regionBlocks(v, chosen);
  return (
    <div className="cm-rg">
      <p className="cm-rg-intro">
        {blocks.length
          ? `${v.label} 기업 ${v.all.length}곳 중 ${matched}곳 · 업종 기준 산업 분류 · 순위 아님`
          : `${v.label} 기업 ${v.all.length}곳 중 이 전공 산업과 이어지는 곳 0`}
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
                      {o.sector ? <small className="cm-rg-sec" title={o.sector}>{o.sector}</small> : null}
                      <Products text={o.product} />
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
        {v.unmatched ? <p>업종으로 산업을 정하기 어려운 {v.unmatched}곳 제외</p> : null}
        <p>{REGION_LAW.replace("이 장은", "이 목록은")}</p>
        <p>출처: {v.sources.join(" · ")}{v.checkedOn ? ` · 기준일 ${v.checkedOn}` : ""}</p>
      </aside>
    </div>
  );
}
