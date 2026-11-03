import { Fragment } from "react";
import type { RegionView } from "@/lib/me-v3/report-long/region";
import { REGION_LAW } from "@/lib/me-v3/report-long/region";

/**
 * 지역에서 이 경험을 이어 볼 기업(웹). 책 01장과 같은 묶음(`regionView`)을 그대로 쓴다.
 *
 * - **고른 산업이 먼저**다. 경험이 덜 맞아도 회사를 보여 준다
 * - 회사 하나를 크게 띄우지 않는다(어느 결과에나 같은 회사가 서던 자리)
 * - 추천이 아니다: 채용 여부를 확인하지 않았고 지원은 본인이 한다(`REGION_LAW`)
 *
 * **새 class 를 짓지 않는다.** `rs-pack` 의 줄 모양을 그대로 쓴다
 */
const HEAD = { A: "내 결과와 잘 맞는 곳", B: "한 걸음 더 채우면 맞는 곳", C: "넓혀 볼 곳" } as const;
export const short = (n: string) => n.replace(/\(주\)|주식회사|㈜/g, "").trim();

/**
 * 묶음 넷(고른 산업 · 잘 맞는 곳 · 한 걸음 더 · 넓혀 볼 곳)과 그 설명. **결과 화면과 `/me/region` 이 같은 것을 읽는다**
 * (2026-11-03 지역 화면 카드 개편: 모양만 다르고 묶는 법 · 문구는 하나다)
 */
export function regionBlocks(v: RegionView, chosen: string[]): { key: string; title: string; note: string; groups: RegionView["groups"] }[] {
  const picked = v.groups.filter((g) => chosen.includes(g.pack.code));
  const rest = v.groups.filter((g) => !chosen.includes(g.pack.code));
  return [
    { key: "picked", title: "고르신 산업", note: "검사에서 고르신 산업이라 경험이 맞는 정도와 상관없이 먼저 보여 드려요.", groups: picked },
    { key: "A", title: HEAD.A, note: "그 산업이 쓰는 영역 가운데 근거가 확인된 영역이 있는 곳입니다.", groups: rest.filter((g) => g.tier === "A") },
    { key: "B", title: HEAD.B, note: "그 산업이 쓰는 영역에서 해 본 일은 확인됐지만 아직 정리가 덜 된 곳입니다.", groups: rest.filter((g) => g.tier === "B") },
    { key: "C", title: HEAD.C, note: "이번 검사에서 그 산업이 쓰는 영역의 판단을 아직 확인하지 못한 곳입니다.", groups: rest.filter((g) => g.tier === "C") },
  ].filter((b) => b.groups.length);
}

/** 산업 묶음 하나가 이 결과와 어떻게 이어지는가: 이름표와 영역 둘까지 */
export function groupLink(g: RegionView["groups"][number]): { label: string; domains: string[] } | null {
  if (g.z1.length) return { label: "이 결과에서 확인된 영역", domains: g.z1.slice(0, 2) };
  if (g.z2.length) return { label: "해 본 일이 있는 영역", domains: g.z2.slice(0, 2) };
  if (g.core.length) return { label: "이 산업이 주로 쓰는 영역", domains: g.core.slice(0, 2) };
  return null;
}

export default function RegionSection({ v, chosen }: { v: RegionView; chosen: string[] }) {
  const matched = v.groups.reduce((a, g) => a + g.orgs.length, 0);
  const block = (title: string, gs: typeof v.groups, note: string) => (gs.length ? (
    <div className="rs-pack">
      <h3>{title} {gs.reduce((a, g) => a + g.orgs.length, 0)}곳</h3>
      <p>{note}</p>
      {gs.map((g) => (
        <div key={g.pack.code}>
          <p className="rs-note"><strong>{g.pack.name_ko} · {g.orgs.length}곳</strong>
            {(() => { const k = groupLink(g); return k ? ` · ${k.label}: ${k.domains.join(" · ")}` : ""; })()}</p>
          <dl>
            {g.orgs.slice(0, 3).map((o) => (
              <div key={o.name}>
                <dt>{o.name}{o.listed ? ` · ${o.listed} 상장` : ""}</dt>
                <dd><span>{[o.sector, o.product ? `주력 품목 ${o.product}` : ""].filter(Boolean).join(" · ")}</span></dd>
              </div>
            ))}
          </dl>
          {g.orgs.length > 3 ? <p className="rs-others">같은 산업에 {g.orgs.length - 3}곳이 더 있습니다. {g.orgs.slice(3, 11).map((o) => short(o.name)).join(" · ")}{g.orgs.length > 11 ? " 등" : ""}</p> : null}
        </div>
      ))}
    </div>
  ) : null);
  if (!v.groups.length) {
    return (
      <section className="rs-sect" id="region-orgs">
        <h2>{v.label}에서 이 경험을 이어 볼 기업</h2>
        <p className="rs-note">
          공시(OpenDART)와 공개 명단에서 확인한 {v.label} 기업 {v.all.length}곳 가운데, 업종으로 이 전공의 산업에 이어지는
          곳을 아직 찾지 못했습니다. 짐작으로 채우지 않고, 공공기관 · 연구기관 명단을 더하면 이 절이 채워집니다.
        </p>
      </section>
    );
  }
  return (
    <section className="rs-sect" id="region-orgs">
      <h2>{v.label}에서 이 경험을 이어 볼 기업</h2>
      <p className="rs-note">
        공시(OpenDART)와 공개 명단에서 확인한 {v.label} 기업 {v.all.length}곳 가운데 {matched}곳을 업종으로 이 전공의
        산업에 나눠 넣고, 그 산업이 쓰는 영역을 내 결과에 대어 보았습니다. 점수나 순위가 아닙니다.
        {v.unmatched ? ` 업종만으로 어느 산업인지 정하기 어려운 ${v.unmatched}곳은 넣지 않았습니다.` : ""}
      </p>
      {regionBlocks(v, chosen).map((b) => <Fragment key={b.key}>{block(b.title, b.groups, b.note)}</Fragment>)}
      <p className="rs-others">{REGION_LAW.replace("이 장은", "이 절은")} 출처: {v.sources.join(" · ")}{v.checkedOn ? ` · 기준일 ${v.checkedOn}` : ""}</p>
    </section>
  );
}
