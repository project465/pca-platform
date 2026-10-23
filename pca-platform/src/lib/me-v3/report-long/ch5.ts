/**
 * 05 지역에서 찾아보기. 공시로 확인한 자료가 있는 지역에서만 선다.
 *
 * 회사를 골라 보내지 않는다. 회사의 업종을 이 전공의 산업 묶음에 대고, 그 산업이
 * 쓰는 영역과 참여자의 묶음을 나란히 놓는다. `추천` 이라는 말을 쓰지 않고, 채용
 * 여부를 확인하지 않았다는 것과 지원은 본인이 한다는 것을 쪽마다 적는다.
 */
import type { Inputs } from "./types";
import type { X } from "./derive";
import { C, chain, hbars, moneyBars } from "./charts";
import { CYC, E, H, PAL, T, band, chapter, lines, note, paginate, rowsOf, ul, type Page } from "./kit";
import { REGION_LAW, groupTheme, tryOf, type FitGroup, type ROrg, type RegionView, type Tier } from "./region";
import { andJoin, cutQuote, j, okOr } from "./text";

export const TIER: Record<Tier, { head: string; lead: string; color: string }> = {
  A: { head: "내 결과와 잘 맞는 곳", lead: "그 산업이 쓰는 영역 가운데 참여자의 근거가 갖춰진 영역이 있습니다", color: PAL.blue },
  B: { head: "이어서 볼 곳", lead: "그 산업이 쓰는 영역 가운데 해 본 일이 확인된 영역이 있습니다", color: PAL.teal },
  C: { head: "넓혀 볼 곳", lead: "그 산업이 쓰는 영역의 판단이 이 결과에서는 아직 확인되지 않았습니다", color: "#8c97ab" },
};
const won = (v: number | null | undefined) => (v == null ? "공시 없음" : `${Math.round(v / 1e8).toLocaleString("ko-KR")}억 원`);
const short = (n: string) => n.replace(/\(주\)|주식회사|㈜/g, "").trim();
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const sector = (s: string) => s.replace(/^그 외 (기타 )?/, "").replace(/^기타 /, "").replace(/ 제조업$| 서비스업$/, "");

function why(x: Inputs, g: FitGroup): string {
  const core = g.core.length ? g.core : g.uses;
  const base = `${g.pack.name_ko} 쪽에서 ${x.major} 전공이 맡는 일은 ${andJoin(core.slice(0, 3))}에 많이 걸려 있습니다.`;
  if (g.tier === "A") return `${base} 그중 ${j(andJoin(g.z1.slice(0, 2)), "은는")} 이 결과에서 직접 판단과 결과물이 함께 확인됐습니다.`;
  if (g.tier === "B") return `${base} 그중 ${j(andJoin(g.z2.slice(0, 2)), "은는")} 해 본 일이 확인됐고, 결과물이나 비교 기록을 더 남길 자리입니다.`;
  return `${base} 이 결과에서는 그 영역의 판단이 아직 확인되지 않았습니다.`;
}
function themeTry(g: FitGroup): string {
  return tryOf(groupTheme(g.pack, g.orgs));
}

export function regionPages(x: Inputs, d: X, r: RegionView): Page[] {
  const part = (title: string, body: string): Page => ({ part: "05", partName: `${r.area}에서 찾아보기`, title, body });
  const out: Page[] = [];
  const matched = r.groups.reduce((a, g) => a + g.orgs.length, 0);
  const cnt = (t: Tier) => r.groups.filter((g) => g.tier === t).reduce((a, g) => a + g.orgs.length, 0);
  const venture = r.all.filter((o) => o.source !== "dart").length;
  const dart = r.all.filter((o) => o.source !== "venture").length;

  out.push(chapter("05", `${r.area}에서 찾아보기`,
    `공시(OpenDART)와 공개 명단으로 확인한 ${E(r.label)} 기업 ${r.all.length}곳을 ${E(x.major)} 전공의 산업 묶음에 대고, 내 결과와 이어지는 정도로 나눴습니다. 채용 여부는 확인하지 않았습니다.`,
    [`${r.label} 기업과 내 결과`, ...(["A", "B", "C"] as Tier[]).filter((t) => cnt(t)).map((t) => TIER[t].head), r.listed.length ? `${r.label} 본점 상장사의 공시 숫자` : "", "기관 한 곳을 조사하는 법"].filter(Boolean),
    `<svg viewBox="0 0 200 200" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="150" r="46" fill="none" stroke="#3c5a96" stroke-width="2"/><circle cx="100" cy="150" r="26" fill="none" stroke="#3c5a96" stroke-width="2"/><path d="M100 30c-26 0-44 19-44 43 0 32 44 77 44 77s44-45 44-77c0-24-18-43-44-43z" fill="#c9a227"/><circle cx="100" cy="73" r="16" fill="#14264d"/></svg>`));

  const sorted = r.groups;
  out.push(part(`${r.label} 기업과 내 결과`,
    T(`${E(r.label)} 기업 ${r.all.length}곳 가운데 ${matched}곳이 ${E(x.major)} 전공의 산업 묶음과 이어집니다`, `${venture ? `중소벤처기업부 벤처기업 확인 명단에서 소재지가 ${E(r.label)}인 회사 ${venture}곳과 ` : ""}공시로 본점을 확인한 회사 ${dart}곳입니다(겹치는 회사는 한 번만 셌습니다). 업종명과 주력 품목은 명단과 공시 값 그대로입니다.`) +
    chain([
      { head: "회사의 업종", body: "명단과 공시의 업종명과 주력 품목", color: C.navy },
      { head: "이 전공의 산업", body: `${x.major} 산업팩 ${x.inds.length}개 가운데 하나에 댄다`, color: C.blue },
      { head: "그 산업이 쓰는 영역", body: "관계표의 중심 · 있음 영역", color: C.teal },
      { head: "내 결과와 겹치나", body: "근거 갖춤이면 잘 맞는 곳, 해 본 일이면 이어서 볼 곳", color: C.amber },
    ], { width: 700, height: 120 }) +
    (sorted.length ? `<div class="wide-art">${hbars(sorted.map((g) => ({ label: g.pack.name_ko, value: g.orgs.length, color: TIER[g.tier].color })), { max: Math.max(...sorted.map((g) => g.orgs.length)) * 1.15, width: 700, label: 190, row: 22, valueText: (b) => `${b.value}곳` })}</div>` : `<div class="na-box"><b>이 전공의 산업 묶음과 이어지는 회사를 명단에서 찾지 못했습니다</b>명단의 업종이 ${E(x.major)} 전공의 산업팩과 겹치지 않았습니다. 아래 상장사 숫자와 조사 양식은 그대로 쓸 수 있습니다.</div>`) +
    `<div class="g3">${(["A", "B", "C"] as Tier[]).map((t) => `<div class="b4" style="--c:${TIER[t].color}"><b>${TIER[t].head} · ${cnt(t)}곳</b><p>${E(TIER[t].lead)}</p><p class="mut">${E(r.groups.filter((g) => g.tier === t).map((g) => g.pack.name_ko).join(" · ") || "해당 없음")}</p></div>`).join("")}</div>` +
    (r.unmatched ? `<p class="mut sm">나머지 ${r.unmatched}곳은 명단의 업종만으로는 ${E(x.major)} 전공의 어느 산업과 이어지는지 가리기 어려워 묶지 않았습니다.</p>` : "") +
    band("읽는 법", REGION_LAW)));

  for (const t of ["A", "B"] as Tier[]) {
    /* 표에 싣는 묶음은 여섯까지. 나머지 묶음은 첫 쪽의 그래프에 수로 나와 있다 */
    const gs = r.groups.filter((g) => g.tier === t).slice(0, 6);
    const rest = r.groups.filter((g) => g.tier === t).slice(6);
    if (!gs.length) continue;
    type Row = { kind: "g"; g: FitGroup } | { kind: "o"; o: ROrg };
    const CAP = 3;
    type Row2 = Row | { kind: "m"; n: number; g: FitGroup };
    const rows: Row2[] = gs.flatMap((g) => [{ kind: "g" as const, g }, ...g.orgs.slice(0, CAP).map((o) => ({ kind: "o" as const, o })), ...(g.orgs.length > CAP ? [{ kind: "m" as const, n: g.orgs.length - CAP, g }] : [])]);
    paginate(rows, (rw) => (rw.kind === "g" ? 4.8 : rw.kind === "m" ? 1.2 : Math.max(1, rowsOf(rw.o.product || "", 26), rowsOf(rw.o.name, 15))), 34, 27).forEach((chunk, k, all) => out.push(part(`${TIER[t].head}${k ? ` (${k + 1})` : ""}`,
      (k === 0 ? T(`${TIER[t].head} ${cnt(t)}곳`, `${E(TIER[t].lead)}. 상장사를 먼저, 그다음은 가나다순입니다.`) : `<p class="k">${E(TIER[t].head)} · 이어서</p>`) +
      `<table class="tb tb-xs sj"><thead><tr><th class="w30">회사</th><th class="w30">업종</th><th>주력 품목</th></tr></thead><tbody>${chunk.map((rw) => rw.kind === "m"
        ? `<tr><td colspan="3" class="mut">같은 묶음에 ${rw.n}곳이 더 있습니다: ${E(rw.g.orgs.slice(CAP).map((o) => short(o.name)).slice(0, 14).join(" · "))}${rw.n > 14 ? " 등" : ""}</td></tr>`
        : rw.kind === "g"
        ? `<tr class="sj-g"><td colspan="3"><b>${E(rw.g.pack.name_ko)} · ${rw.g.orgs.length}곳</b><span>${E(why(x, rw.g))}</span><em>해 볼 것: ${E(themeTry(rw.g))}</em></td></tr>`
        : `<tr><td><b>${E(rw.o.name)}</b>${rw.o.listed ? ` <span class="sj-l">${E(rw.o.listed)}</span>` : ""}</td><td>${E(cut(sector(rw.o.sector), 22))}</td><td class="mut">${E(cut(okOr(rw.o.product) || (rw.o.listed ? "사업보고서의 ‘사업의 개요’ 참고" : "명단에 적힌 품목 없음"), 34))}</td></tr>`).join("")}</tbody></table>` +
      (k === all.length - 1 && rest.length ? `<p class="mut sm">나머지 ${rest.length}개 묶음(${E(rest.map((g) => `${g.pack.name_ko} ${g.orgs.length}곳`).join(" · "))})은 이 장 첫 쪽의 그래프에 수로 적었습니다.</p>` : "") +
      band("확인 범위", REGION_LAW))));
  }
  const cg = r.groups.filter((g) => g.tier === "C");
  if (cg.length) {
    const blocks = cg.map((g) => ({ g, h: 2 + Math.ceil(g.orgs.map((o) => short(o.name)).join(" · ").length / 95) }));
    paginate(blocks, (b) => b.h, 30).forEach((chunk, k) => out.push(part(`${TIER.C.head}${k ? ` (${k + 1})` : ""}`,
      (k === 0 ? T(`${TIER.C.head} ${cnt("C")}곳`, `지금 결과로는 겹치는 근거가 적지만, 그 산업이 쓰는 영역의 판단을 새로 쌓으면 이어질 수 있는 곳입니다.`) : `<p class="k">${E(TIER.C.head)} · 이어서</p>`) +
      chunk.map(({ g }) => `<div class="sj-c"><p class="sj-ch"><b>${E(g.pack.name_ko)} · ${g.orgs.length}곳</b><span>${E(why(x, g))}</span></p><p class="sj-cl">${g.orgs.map((o) => `${E(short(o.name))}${o.listed ? "<sup>상장</sup>" : ""}`).join(" · ")}</p></div>`).join("") +
      `<div class="two" style="margin-top:3mm">${note("넓혀 보려면", `관심 있는 회사 한 곳의 주력 품목을 골라, 그 산업이 쓰는 영역(${E(andJoin(cg[0].core.slice(0, 2)))})에서 어떤 판단이 필요할지 가설로 적어 봅니다.`)}${note("다음 결과에서", "그 영역의 짧은 과제를 하나 해서 경험 기록에 더하면 이 회사들이 ‘이어서 볼 곳’으로 옮겨 갈 수 있습니다.", true)}</div>` +
      band("확인 범위", REGION_LAW))));
  }

  if (r.listed.length) {
    const fin = [...r.listed].filter((o) => o.fin?.sales != null).sort((a, b) => (b.fin!.sales ?? 0) - (a.fin!.sales ?? 0));
    const top = fin.slice(0, 9);
    const strong = d.strengths[0] ? d.name(d.strengths[0].code) : d.radarDoms[0] ? d.name(d.radarDoms[0].code) : "관심 영역";
    out.push(part(`${r.label} 본점 상장사의 매출과 영업이익`,
      T(`${E(r.label)}에 본점을 둔 상장사 가운데 매출이 큰 ${top.length}곳의 공시 숫자입니다`, `사업보고서의 주요 계정입니다(연결 재무제표가 있으면 연결, 없으면 별도). 금액은 억 원 단위로 반올림했고, 막대는 같은 눈금이라 규모 차이가 그대로 보입니다.`) +
      `<div class="wide-art">${moneyBars(top.map((o) => ({ label: cut(short(o.name), 12), values: [{ name: "매출액", v: o.fin!.sales, color: PAL.blue }, { name: "영업이익", v: o.fin!.op, color: PAL.amber }] })), { width: 700 })}</div>` +
      `<div class="two">${note("숫자를 읽는 법", "매출은 회사의 규모를, 영업이익은 본업에서 남긴 돈을 보여 줍니다. 영업이익이 마이너스인 해는 연구개발이나 설비에 먼저 돈을 쓰는 해일 수 있습니다.")}${note(`${x.major} 전공이라면`, `관심 있는 회사의 사업보고서 ‘사업의 내용’에서 ${E(j(strong, "과와"))} 이어지는 제품이나 공정을 찾아 한 줄로 적어 봅니다.`, true)}</div>`));
    /* 직원 수는 같은 표에 칸으로 싣는다(쪽을 따로 두면 같은 회사 목록이 두 번 나온다) */
    out.push(part(`${r.label} 본점 상장사의 공시 숫자`, H("공시 숫자", "사업보고서 주요 계정 · 직원 등의 현황") + `<table class="tb tb-xs"><thead><tr><th>회사</th><th>매출액</th><th>영업이익</th><th>당기순이익</th><th>직원</th><th>기준</th></tr></thead><tbody>${fin.slice(0, 12).map((o) => `<tr><td><b>${E(o.name)}</b></td><td>${won(o.fin!.sales)}</td><td>${won(o.fin!.op)}</td><td>${won(o.fin!.net)}</td><td>${o.staff != null ? `${o.staff.toLocaleString("ko-KR")}명` : "공시 없음"}</td><td class="mut">${E(o.fin!.year)} ${E(o.fin!.basis)}</td></tr>`).join("")}</tbody></table><p class="mut sm">직원 수는 사업보고서 ‘직원 등의 현황’의 합계입니다. 본사, 공장, 영업 인원이 모두 들어 있어 이 지역에서 일하는 인원과는 다를 수 있습니다.</p>` +
      note("표를 읽는 법", ul(["당기순이익은 본업 밖의 손익과 세금까지 반영한 값이라 영업이익과 방향이 다를 수 있습니다.", "사업부문별 직원 수를 보면 그 회사의 일이 어느 부문에 몰려 있는지 보입니다.", `${E(x.major)} 전공이 맡을 일이 어느 부문에 있을지 공고의 근무 부서와 맞춰 봅니다.`, "숫자가 크다고 신입 채용이 많다는 뜻은 아닙니다. 채용은 공고 원문으로 확인합니다."]))));
  }
  if (r.neighbor.length) {
    out.push(part("가까운 대전·충청 상장사",
      T("생활권이 겹치는 대전·충청의 상장사도 함께 봅니다", "공시로 본점이 대전·충청인 것을 확인한 상장사의 사업보고서 숫자입니다.") +
      `<table class="tb tb-xs"><thead><tr><th>회사</th><th>본점</th><th>매출액</th><th>영업이익</th><th>사업부문별 직원</th><th>사업보고서</th></tr></thead><tbody>${r.neighbor.slice(0, 8).map((o) => `<tr><td><b>${E(o.name)}</b></td><td class="mut">${E((o.adres ?? "").split(" ").slice(0, 2).join(" "))}</td><td>${won(o.fin?.sales)}</td><td>${won(o.fin?.op)}</td><td>${E(o.segments.slice(0, 3).map((s) => `${s.segment} ${s.count.toLocaleString("ko-KR")}명`).join(" · "))}</td><td class="mut">${E(o.report ? `${o.report.name} · 접수 ${o.report.dt}` : "")}</td></tr>`).join("")}</tbody></table>` +
      H("한 곳을 골라 적기", "참여자가 채웁니다") +
      `<table class="tb ws"><tbody>${["고른 회사와 그 까닭", "사업부문별 직원에서 내 전공이 일할 부문", "누리집 채용 쪽에서 찾은 직무 이름"].map((h) => `<tr><th>${h}</th><td></td></tr>`).join("")}</tbody></table>` +
      band("출처", "금융감독원 전자공시(OpenDART) 기업개황과 사업보고서 주요 계정입니다. 채용 여부와 근무지는 확인하지 않았습니다.")));
  }
  if (r.big.length) {
    out.push(part(`${r.label}에 본점을 둔 큰 회사`,
      T(`${E(r.label)}에 본점을 둔 큰 회사입니다`, "본점은 공시(OpenDART) 기업개황으로 확인했습니다. 다른 지역에 본점을 두고 이 지역에 공장만 있는 회사는 공시로 확인할 수 없어 싣지 않았습니다.") +
      `<table class="tb tb-s"><thead><tr><th>회사</th><th>어디</th><th>하는 일</th></tr></thead><tbody>${r.big.map((o) => `<tr><td><b>${E(o.name)}</b></td><td>${E(o.where)}</td><td>${E(o.what)}</td></tr>`).join("")}</tbody></table>` +
      band("출처", "OpenDART 기업개황(본점 주소). 이 목록은 지원을 권하는 목록이 아닙니다.")));
  }
  const ovs = r.overview.map((o) => ({ ...o, cut: cutQuote(o.excerpt, 170) })).filter((o) => o.cut).slice(0, 4);
  if (ovs.length) {
    /* 인용과 적는 칸을 한 쪽에 둔다. 쪼개면 적는 칸만 다음 쪽에 혼자 남는다 */
    out.push({ keep: true, ...part("사업보고서 ‘사업의 개요’ 읽기",
      T("사업보고서 첫 장을 읽으면 그 회사가 무엇으로 돈을 버는지 보입니다", "사업보고서 ‘II. 사업의 내용 > 1. 사업의 개요’의 첫 부분을 옮겼습니다. 원문의 뜻을 바꾸지 않으려고 앞에서부터 줄이기만 했습니다.") +
      `<div class="g2">${ovs.map((o) => `<div class="card"><h4>${E(o.name)}</h4><p class="quote">${E(o.cut)}</p><p class="mut sm">${E(o.report)} · 접수 ${E(o.dt)}</p></div>`).join("")}</div>` +
      H("읽고 나서 적을 것", "참여자가 채웁니다") +
      `<table class="tb ws"><tbody>${["읽은 회사와 보고서", "사업부문은 몇 개이고 가장 큰 것은", `${E(x.major)} 전공이 맡을 일 하나`, "그렇게 본 근거 한 줄"].map((h) => `<tr><th>${h}</th><td></td></tr>`).join("")}</tbody></table>`) });
  }
  if (r.publicOrgs.length) {
    out.push(part(`${r.label}의 공기업 개황`,
      T("본사를 둔 공기업은 공시 기업개황으로 확인했습니다", "공기업은 주식시장에 상장하지 않아 사업보고서 숫자가 공시에 없습니다. 기업개황(본점·설립·업종)만 확인했고, 경영 정보는 공공기관 경영정보 공개시스템(ALIO)에서 직접 봅니다.") +
      `<table class="tb tb-s"><thead><tr><th>기관</th><th>본점 주소</th><th>설립</th><th>업종</th></tr></thead><tbody>${r.publicOrgs.map((o) => `<tr><td><b>${E(o.name)}</b></td><td>${E(o.adres ?? "")}</td><td>${E(o.est ?? "")}</td><td>${E(o.sector)}</td></tr>`).join("")}</tbody></table>` +
      note("ALIO 에서 볼 것", ul(["기관 일반 현황과 조직도", "경영 목표와 주요 사업", "신입 채용 공고와 직무기술서", "경영평가 결과(공개 범위 안에서)"])) +
      H("ALIO 에서 한 기관을 읽고 적기", "참여자가 채웁니다") +
      `<table class="tb ws big"><tbody>${["기관 이름 · 확인한 날", "경영 목표와 주요 사업", "신입 채용 직무와 직무기술서의 담당 업무", `${E(x.major)} 전공이 맡을 일과 이어지는 내 경험`].map((h) => `<tr><th>${h}</th><td></td></tr>`).join("")}</tbody></table>` +
      band("확인 범위", "OpenDART 기업개황입니다. 채용 계획과 인원은 확인하지 않았습니다.")));
  }
  out.push({ keep: true, ...part("기관 한 곳을 직접 조사하는 법",
    T("관심 기관 하나를 정해 공식 자료로 한 장을 만들어 봅니다", "이 리포트가 공시로 보여 준 것은 출발점입니다. 아래 순서로 직접 확인하면 면접에서 그 기관을 어떻게 알게 됐는지 근거를 들어 답할 수 있습니다.") +
    chain([
      { head: "공시(DART)", body: "사업보고서의 사업의 개요 · 사업부문 · 매출 구조", color: C.navy },
      { head: "누리집", body: "제품과 서비스 · 조직 · 보도자료", color: C.blue },
      { head: "채용 공고", body: "직무기술서의 담당 업무와 필요 지식·기술", color: C.teal },
      { head: "한 장 정리", body: "사업 · 직무 · 내 경험을 한 표로 잇기", color: C.amber },
    ], { width: 700, height: 130 }) +
    H("한 장 정리", "참여자가 채웁니다") +
    `<table class="tb ws big"><tbody>
      <tr><th>기관 이름</th><td></td><th>확인한 날</th><td></td></tr>
      <tr><th>무엇으로 일하나(사업)</th><td colspan="3"></td></tr>
      <tr><th>지원할 직무와 담당 업무</th><td colspan="3"></td></tr>
      <tr><th>그 업무와 이어지는 내 경험</th><td colspan="3"></td></tr>
      <tr><th>내가 정한 것 · 남긴 것</th><td colspan="3"></td></tr>
      <tr><th>아직 확인하지 못한 것</th><td colspan="3"></td></tr>
    </tbody></table>` + band("상담 연계", `이 한 장을 ${E(x.issuer)} 상담에 가져오면 지역 일자리와 지원 사업을 함께 찾아볼 수 있습니다.`)) });
  return out;
}
