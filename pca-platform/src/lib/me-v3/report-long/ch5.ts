/**
 * 05 지역에서 찾아보기. 공시로 확인한 자료가 있는 지역에서만 선다.
 *
 * 회사를 골라 보내지 않는다. 회사의 업종을 이 전공의 산업 묶음에 대고, 그 산업이
 * 쓰는 영역과 참여자의 묶음을 나란히 놓는다. `추천` 이라는 말을 쓰지 않는다.
 * 직업 정보일 뿐 알선이 없다는 것, 채용 여부를 확인하지 않았다는 것, 지원은 본인이
 * 한다는 것은 장의 첫 쪽에 한 번만 적는다. 쪽마다 되풀이하면 읽는 사람이 건너뛴다.
 *
 * 회사가 0곳인 묶음은 칸을 세우지 않는다. 쓰는 칸은 장 끝의 한 장 정리 하나만 두고,
 * 결과에 있는 값으로 채울 수 있는 줄은 초안으로 채워 둔다.
 */
import type { Inputs } from "./types";
import type { X } from "./derive";
import { C, chain, hbars, moneyBars } from "./charts";
import { E, H, PAL, T, band, chapter, note, paginate, rowsOf, ul, type Page } from "./kit";
import { REGION_LAW, groupTheme, tryOf, type FitGroup, type ROrg, type RegionView, type Tier } from "./region";
import { andJoin, cutQuote, j, okOr, polite } from "./text";

export const TIER: Record<Tier, { head: string; lead: string; color: string }> = {
  A: { head: "내 결과와 잘 맞는 곳", lead: "이 산업에서 많이 쓰는 영역 가운데, 직접 판단하고 결과물까지 남긴 영역이 이번 결과에서 확인된 회사들입니다", color: PAL.blue },
  B: { head: "이어서 볼 곳", lead: "이 산업에서 많이 쓰는 영역을 해 본 적은 있지만, 결과물이나 비교 기록이 아직 적은 회사들입니다. 그 영역에서 결과물 하나를 더 남기면 잘 맞는 곳으로 옮겨 갈 수 있습니다", color: PAL.teal },
  C: { head: "넓혀 볼 곳", lead: "이 산업에서 많이 쓰는 영역을 이번 검사에서는 아직 확인하지 못한 회사들입니다", color: "#8c97ab" },
};
const won = (v: number | null | undefined) => (v == null ? "공시 없음" : `${Math.round(v / 1e8).toLocaleString("ko-KR")}억 원`);
const short = (n: string) => n.replace(/\(주\)|주식회사|㈜/g, "").trim();
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const sector = (s: string) => s.replace(/^그 외 (기타 )?/, "").replace(/^기타 /, "").replace(/ 제조업$| 서비스업$/, "");

function why(x: Inputs, g: FitGroup): string {
  const core = g.core.length ? g.core : g.uses;
  const base = `${g.pack.name_ko} 분야에서 ${x.major} 전공자는 주로 ${andJoin(core.slice(0, 3))} 쪽 일을 맡습니다.`;
  if (g.tier === "A") return `${base} 이번 결과에서 ${j(andJoin(g.z1.slice(0, 2)), "은는")} 직접 정한 판단과 남긴 결과물이 함께 확인됐습니다.`;
  if (g.tier === "B") return `${base} 이번 결과에서는 ${andJoin(g.z2.slice(0, 2))} 쪽에서 해 본 일이 확인됐습니다.`;
  return `${base} 이 영역들은 이번 검사에서 아직 판단을 확인하지 못했습니다.`;
}
function themeTry(g: FitGroup): string {
  return tryOf(groupTheme(g.pack, g.orgs));
}

export function regionPages(x: Inputs, d: X, r: RegionView): Page[] {
  const part = (title: string, body: string): Page => ({ part: "05", partName: `${r.area}에서 찾아보기`, title, body });
  const out: Page[] = [];
  const matched = r.groups.reduce((a, g) => a + g.orgs.length, 0);
  const cnt = (t: Tier) => r.groups.filter((g) => g.tier === t).reduce((a, g) => a + g.orgs.length, 0);
  /* 회사가 한 곳도 없는 묶음은 칸도 이름도 세우지 않는다 */
  const tiers = (["A", "B", "C"] as Tier[]).filter((t) => cnt(t) > 0);
  const venture = r.all.filter((o) => o.source !== "dart").length;
  const dart = r.all.filter((o) => o.source !== "venture").length;

  out.push(chapter("05", `${r.area}에서 찾아보기`,
    `공시(OpenDART)와 공개 명단에서 확인한 ${E(r.label)} 기업 ${r.all.length}곳을 ${E(x.major)} 전공자가 일하는 산업별로 묶고, 내 결과와 얼마나 맞는지에 따라 나눠 실었습니다.`,
    [`${r.label} 기업과 내 결과`, ...tiers.map((t) => TIER[t].head), r.listed.length ? `${r.label} 본점 상장사의 공시 숫자` : "", "기관 한 곳을 조사하는 법"].filter(Boolean),
    `<svg viewBox="0 0 200 200" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="150" r="46" fill="none" stroke="#3c5a96" stroke-width="2"/><circle cx="100" cy="150" r="26" fill="none" stroke="#3c5a96" stroke-width="2"/><path d="M100 30c-26 0-44 19-44 43 0 32 44 77 44 77s44-45 44-77c0-24-18-43-44-43z" fill="#c9a227"/><circle cx="100" cy="73" r="16" fill="#14264d"/></svg>`));

  const sorted = r.groups;
  const card = (t: Tier) => `<div class="b4" style="--c:${TIER[t].color}"><b>${TIER[t].head} · ${cnt(t)}곳</b><p>${E(TIER[t].lead)}.</p><p class="mut">${E(r.groups.filter((g) => g.tier === t).map((g) => g.pack.name_ko).join(" · "))}</p></div>`;
  const cards = tiers.length > 1 ? `<div class="g${tiers.length}">${tiers.map(card).join("")}</div>` : tiers.map(card).join("");
  out.push(part(`${r.label} 기업과 내 결과`,
    T(`${E(r.label)} 기업 ${r.all.length}곳 가운데 ${matched}곳이 ${E(x.major)} 전공자가 일하는 산업과 이어집니다`,
      `${venture ? `중소벤처기업부 벤처기업 확인 명단에서 소재지가 ${E(r.label)}인 회사 ${venture}곳과, ` : ""}공시로 본점이 ${E(r.label)}임을 확인한 회사 ${dart}곳${venture ? "을 합쳤습니다. 두 자료에 다 있는 회사는 한 번만 셌고," : "입니다."} 업종명과 주력 품목은 원래 자료에 적힌 대로 옮겼습니다.`) +
    chain([
      { head: "회사의 업종", body: "명단과 공시에 적힌 업종명과 주력 품목", color: C.navy },
      { head: "이 전공의 산업", body: `${x.major} 산업 ${x.inds.length}개 가운데 가장 가까운 하나로 묶음`, color: C.blue },
      { head: "그 산업이 쓰는 영역", body: "그 산업에서 이 전공자가 주로 맡는 영역", color: C.teal },
      { head: "내 결과와 맞춰 보기", body: "판단과 결과물이 있으면 잘 맞는 곳, 해 본 일만 있으면 이어서 볼 곳", color: C.amber },
    ], { width: 700, height: 120 }) +
    (sorted.length ? `<div class="wide-art">${hbars(sorted.map((g) => ({ label: g.pack.name_ko, value: g.orgs.length, color: TIER[g.tier].color })), { max: Math.max(...sorted.map((g) => g.orgs.length)) * 1.15, width: 700, label: 190, row: 22, valueText: (b) => `${b.value}곳` })}</div>` : `<div class="na-box"><b>이 전공의 산업과 이어지는 회사를 명단에서 찾지 못했습니다</b>명단에 적힌 업종이 ${E(x.major)} 전공의 산업과 겹치지 않았습니다. 뒤쪽의 상장사 숫자와 조사 방법은 그대로 쓰실 수 있습니다.</div>`) +
    cards +
    (r.unmatched ? `<p class="mut sm">나머지 ${r.unmatched}곳은 업종명만으로는 ${E(x.major)} 전공의 어느 산업에 넣을지 가르기 어려워 이 장에서 묶지 않았습니다.</p>` : "") +
    band("알아 두실 점", REGION_LAW)));

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
      (k === 0 ? T(`${TIER[t].head} ${cnt(t)}곳`, `${E(TIER[t].lead)}. 산업마다 상장사를 먼저 싣고, 나머지는 가나다순으로 적었습니다.`) : `<p class="k">${E(TIER[t].head)} · 이어서</p>`) +
      `<table class="tb tb-xs sj"><thead><tr><th class="w30">회사</th><th class="w30">업종</th><th>주력 품목</th></tr></thead><tbody>${chunk.map((rw) => rw.kind === "m"
        ? `<tr><td colspan="3" class="mut">같은 산업에 ${rw.n}곳이 더 있습니다. ${E(rw.g.orgs.slice(CAP).map((o) => short(o.name)).slice(0, 14).join(" · "))}${rw.n > 14 ? " 등" : ""}</td></tr>`
        : rw.kind === "g"
        ? `<tr class="sj-g"><td colspan="3"><b>${E(rw.g.pack.name_ko)} · ${rw.g.orgs.length}곳</b><span>${E(why(x, rw.g))}</span><em>해 볼 것: ${E(themeTry(rw.g))}</em></td></tr>`
        : `<tr><td><b>${E(rw.o.name)}</b>${rw.o.listed ? ` <span class="sj-l">${E(rw.o.listed)}</span>` : ""}</td><td>${E(cut(sector(rw.o.sector), 22))}</td><td class="mut">${E(cut(okOr(rw.o.product) || (rw.o.listed ? "사업보고서 ‘사업의 개요’에서 확인" : "명단에 품목이 적혀 있지 않음"), 34))}</td></tr>`).join("")}</tbody></table>` +
      (k === all.length - 1 && rest.length ? `<p class="mut sm">나머지 ${rest.length}개 산업(${E(rest.map((g) => `${g.pack.name_ko} ${g.orgs.length}곳`).join(" · "))})은 이 장 첫 쪽 그래프에 회사 수만 적었습니다.</p>` : ""))));
  }
  const cg = r.groups.filter((g) => g.tier === "C");
  if (cg.length) {
    const blocks = cg.map((g) => ({ g, h: 2 + Math.ceil(g.orgs.map((o) => short(o.name)).join(" · ").length / 95) }));
    paginate(blocks, (b) => b.h, 30).forEach((chunk, k) => out.push(part(`${TIER.C.head}${k ? ` (${k + 1})` : ""}`,
      (k === 0 ? T(`${TIER.C.head} ${cnt("C")}곳`, `${E(TIER.C.lead)}. 그 영역에서 작은 과제 하나를 해 두면 다음 검사에서 이어서 볼 곳으로 옮겨 올 수 있습니다.`) : `<p class="k">${E(TIER.C.head)} · 이어서</p>`) +
      chunk.map(({ g }) => `<div class="sj-c"><p class="sj-ch"><b>${E(g.pack.name_ko)} · ${g.orgs.length}곳</b><span>${E(why(x, g))}</span></p><p class="sj-cl">${g.orgs.map((o) => `${E(short(o.name))}${o.listed ? "<sup>상장</sup>" : ""}`).join(" · ")}</p></div>`).join("") +
      (k === 0 ? `<div class="two" style="margin-top:3mm">${note("넓혀 보려면", `관심 가는 회사 한 곳의 주력 품목을 골라, ${E(andJoin(cg[0].core.slice(0, 2)))} 쪽에서 어떤 판단이 필요할지 짐작해 적어 보세요. 맞았는지는 그 회사 누리집과 공고에서 확인하면 됩니다.`)}${note("다음 검사에서", "그 영역의 짧은 과제를 하나 해서 경험 기록에 더하시면, 이 회사들이 ‘이어서 볼 곳’으로 옮겨 올 수 있습니다.", true)}</div>` : ""))));
  }

  if (r.listed.length) {
    const fin = [...r.listed].filter((o) => o.fin?.sales != null).sort((a, b) => (b.fin!.sales ?? 0) - (a.fin!.sales ?? 0));
    const top = fin.slice(0, 9);
    const strong = d.strengths[0] ? d.name(d.strengths[0].code) : d.radarDoms[0] ? d.name(d.radarDoms[0].code) : "관심 영역";
    /* 표를 먼저 둔다. 표는 줄 단위로 나뉘어 앞 쪽의 남은 자리를 채우고, 막대 그림은 통째로 다음 쪽에 선다 */
    const tableAt = out.length;
    out.push(part(`${r.label} 본점 상장사의 공시 숫자`,
      T(`${E(r.label)}에 본점을 둔 상장사 ${Math.min(fin.length, 12)}곳의 공시 숫자입니다`, "사업보고서의 주요 계정과 ‘직원 등의 현황’에서 옮겼습니다. 연결 재무제표가 있는 회사는 연결 기준, 없는 회사는 별도 기준이고, 금액은 억 원 단위로 반올림했습니다.") +
      `<table class="tb tb-xs"><thead><tr><th>회사</th><th>매출액</th><th>영업이익</th><th>당기순이익</th><th>직원</th><th>기준</th></tr></thead><tbody>${fin.slice(0, 12).map((o) => `<tr><td><b>${E(o.name)}</b></td><td>${won(o.fin!.sales)}</td><td>${won(o.fin!.op)}</td><td>${won(o.fin!.net)}</td><td>${o.staff != null ? `${o.staff.toLocaleString("ko-KR")}명` : "공시 없음"}</td><td class="mut">${E(o.fin!.year)} ${E(o.fin!.basis)}</td></tr>`).join("")}</tbody></table><p class="mut sm">직원 수는 사업보고서 ‘직원 등의 현황’의 합계라서 본사와 공장과 영업 인원이 다 들어 있습니다. 이 지역에서 일하는 사람 수와는 다를 수 있습니다.</p>` +
      note("표를 읽는 법", ul(["당기순이익에는 본업 밖의 손익과 세금이 들어가서, 영업이익과 방향이 반대로 나오는 해도 있습니다.", "사업부문별 직원 수를 보면 그 회사 사람들이 어느 부문에 많이 모여 있는지 알 수 있습니다.", `채용 공고의 근무 부서가 어느 사업부문에 속하는지 맞춰 보면 ${E(x.major)} 전공자가 갈 자리를 짐작하기 쉬워집니다.`, "직원이 많은 회사라고 신입을 많이 뽑는 것은 아니니, 뽑는 인원은 그해 공고에서 보시면 됩니다."]))));
    /* 회사가 적으면 막대 쪽을 표 앞에 둔다. 장 끝에 막대 하나만 남으면 쪽 절반이 빈다 */
    if (fin.length <= 8) out.splice(tableAt, 0, out.pop()!);
    out.push(part(`${r.label} 본점 상장사의 매출과 영업이익`,
      H(`매출이 큰 ${top.length}곳을 막대로 놓았습니다`, "막대는 모두 같은 눈금입니다") +
      `<div class="wide-art">${moneyBars(top.map((o) => ({ label: cut(short(o.name), 12), values: [{ name: "매출액", v: o.fin!.sales, color: PAL.blue }, { name: "영업이익", v: o.fin!.op, color: PAL.amber }] })), { width: 700 })}</div>` +
      `<div class="two">${note("숫자를 읽는 법", "매출은 회사의 덩치를, 영업이익은 본업으로 남긴 돈을 보여 줍니다. 영업이익이 마이너스인 해는 연구개발이나 설비에 먼저 돈을 쓴 해인 경우가 많습니다.")}${note(`${x.major} 전공이라면`, `관심 가는 회사의 사업보고서 ‘사업의 내용’에서 ${E(j(strong, "과와"))} 이어지는 제품이나 공정을 하나 찾아 표시해 두세요. 면접에서 그 회사를 왜 골랐는지 말할 거리가 됩니다.`, true)}</div>`));
    /* 회사가 적으면 막대 쪽을 표 앞에 둔다. 표는 줄 단위로 나뉘어 남는 자리를 채우지만, 막대 쪽이 장 끝에 남으면 쪽 절반이 빈다 */
    if (fin.length <= 8) out.splice(tableAt, 0, out.pop()!);
  }
  if (r.neighbor.length) {
    out.push(part("가까운 대전·충청 상장사",
      T("생활권이 겹치는 대전·충청 상장사도 같이 실었습니다", "본점이 대전이나 충청으로 공시된 상장사이고, 숫자는 사업보고서에서 옮겼습니다.") +
      `<table class="tb tb-xs"><thead><tr><th>회사</th><th>본점</th><th>매출액</th><th>영업이익</th><th>사업부문별 직원</th><th>사업보고서</th></tr></thead><tbody>${r.neighbor.slice(0, 8).map((o) => `<tr><td><b>${E(o.name)}</b></td><td class="mut">${E((o.adres ?? "").split(" ").slice(0, 2).join(" "))}</td><td>${won(o.fin?.sales)}</td><td>${won(o.fin?.op)}</td><td>${E(o.segments.slice(0, 3).map((s) => `${s.segment} ${s.count.toLocaleString("ko-KR")}명`).join(" · "))}</td><td class="mut">${E(o.report ? `${o.report.name} · 접수 ${o.report.dt}` : "")}</td></tr>`).join("")}</tbody></table>` +
      note("고를 때 먼저 볼 칸", `사업부문별 직원 칸에서 ${E(x.major)} 전공자가 일할 만한 부문에 사람이 얼마나 있는지 보세요. 그 부문 이름으로 회사 누리집의 채용 쪽을 찾으면 공고에 적히는 직무 이름도 알 수 있습니다.`)));
  }
  if (r.big.length) {
    out.push(part(`${r.label}에 본점을 둔 큰 회사`,
      T(`${E(r.label)}에 본점을 둔 큰 회사입니다`, "본점 주소는 OpenDART 기업개황으로 확인했습니다. 본점은 다른 지역에 있고 이곳에는 공장만 둔 회사는 공시로 가려낼 수 없어 넣지 않았습니다.") +
      `<table class="tb tb-s"><thead><tr><th>회사</th><th>어디</th><th>하는 일</th></tr></thead><tbody>${r.big.map((o) => `<tr><td><b>${E(o.name)}</b></td><td>${E(o.where)}</td><td>${E(o.what)}</td></tr>`).join("")}</tbody></table>`));
  }
  const ovs = r.overview.map((o) => ({ ...o, cut: cutQuote(o.excerpt, 170) })).filter((o) => o.cut).slice(0, 4);
  if (ovs.length) {
    out.push(part("사업보고서 ‘사업의 개요’ 읽기",
      T("사업보고서 첫 장만 읽어도 그 회사가 무엇으로 돈을 버는지 알 수 있습니다", "‘II. 사업의 내용’ 가운데 ‘1. 사업의 개요’ 첫머리를 옮겼습니다. 원문의 뜻이 바뀌지 않도록 앞에서부터 잘라 내기만 했습니다.") +
      `<div class="g2">${ovs.map((o) => `<div class="card"><h4>${E(o.name)}</h4><p class="quote">${E(o.cut)}</p><p class="mut sm">${E(o.report)} · 접수 ${E(o.dt)}</p></div>`).join("")}</div>` +
      note("읽으면서 표시해 둘 것", ul(["사업부문이 몇 개이고, 매출이 가장 큰 부문은 어디인지", `${E(x.major)} 전공자가 맡을 만한 일이 어느 부문에 있는지`, "그렇게 본 근거가 보고서의 어느 문장인지"]))));
  }
  if (r.publicOrgs.length) {
    out.push(part(`${r.label}의 공기업 개황`,
      T("본사가 이 지역에 있는 공기업은 공시 기업개황으로 확인했습니다", "공기업은 상장하지 않아 사업보고서 숫자가 공시에 없습니다. 그래서 본점과 설립 연도와 업종만 확인했고, 경영 정보는 공공기관 경영정보 공개시스템(ALIO)에서 직접 찾아보셔야 합니다.") +
      `<table class="tb tb-s"><thead><tr><th>기관</th><th>본점 주소</th><th>설립</th><th>업종</th></tr></thead><tbody>${r.publicOrgs.map((o) => `<tr><td><b>${E(o.name)}</b></td><td>${E(o.adres ?? "")}</td><td>${E(o.est ?? "")}</td><td>${E(o.sector)}</td></tr>`).join("")}</tbody></table>` +
      note("ALIO 에서 볼 것", ul(["기관 일반 현황과 조직도", "경영 목표와 주요 사업", "신입 채용 공고와 직무기술서의 담당 업무", "경영평가 결과(공개된 범위 안에서)", `직무기술서의 담당 업무 가운데 ${E(x.major)} 전공으로 설명할 수 있는 줄`]))));
  }

  /* 장의 쓰는 칸은 이 한 장뿐이다. 결과에 있는 값으로 채울 수 있는 줄은 초안으로 채운다 */
  const goal = d.goalRole;
  const gd = goal ? x.guide.roles[goal.code] : undefined;
  const st = d.strengths[0];
  const ev = st ? d.evidenceOf(st) : null;
  const rec = st ? x.exps.find((e) => e.td_codes.includes(st.code)) : x.exps[0];
  const l2 = st ? (st.confirmed.map((a) => d.def(st.code)?.axes?.[a]?.l2).find(Boolean) ?? null) : null;
  const draft = (s: string) => `<span class="mut sm">초안 · ${s}</span>`;
  const roleRow = goal ? draft(E(`${goal.name_ko}${gd?.responsibilities?.[0] ? `: ${gd.responsibilities[0]}` : ""}. 공고에 적힌 담당 업무로 바꿔 쓰세요.`)) : "";
  const expRow = rec || st ? draft(E([rec ? rec.title : "", st ? `${d.name(st.code)}에서 ${ev?.decisions[0] ? polite(ev.decisions[0]) : l2 ? polite(l2) : "해 본 일이 확인됐습니다."}` : ""].filter(Boolean).join(" · "))) : "";
  /* 정한 것은 위 줄이 이미 옮겼으면 다시 쓰지 않는다 */
  const madeRow = ev?.artifacts[0] ? draft(E(`남긴 것: ${ev.artifacts.slice(0, 2).join(", ")}`)) : "";
  /* 한 쪽으로 읽는 안내라 나누지 않는다. 나누면 미리 옮긴 줄만 다음 쪽에 혼자 남는다 */
  out.push({ ...part("기관 한 곳을 직접 조사하는 법",
    T("관심 가는 기관 하나는 세 군데 자료로 알아봅니다", "사업보고서, 누리집, 채용 공고를 차례로 읽고 그 기관의 일과 내 경험이 닿는 곳을 찾아 두세요. 이렇게 해 두면 면접에서 ‘우리 회사를 어떻게 알게 됐느냐’는 질문에 자료를 들어 답할 수 있습니다.") +
    `<div class="g3">${[
      ["사업보고서", "사업의 개요와 사업부문별 매출을 읽고 무엇으로 돈을 버는 회사인지 한 줄로 적어 둡니다."],
      ["누리집", "제품과 서비스, 조직도를 보고 지원할 직무가 어느 부서에 있는지 찾습니다."],
      ["채용 공고", "담당 업무와 필요한 지식을 읽고, 내 경험과 겹치는 줄에 표시해 둡니다."],
    ].map(([h, t], i) => `<div class="card"><p class="k">${i + 1}단계</p><h4>${h}</h4><p>${t}</p></div>`).join("")}</div>` +
    (() => {
      /* 세 단계를 바로 해 볼 수 있게, 가장 잘 이어지는 묶음의 회사 몇 곳을 명단 값 그대로 붙인다 */
      const g0 = [...r.groups].sort((a, b) => "ABC".indexOf(a.tier) - "ABC".indexOf(b.tier))[0];
      const os = g0 ? [...g0.orgs].sort((a, b) => Number(!!b.url) - Number(!!a.url)).slice(0, 3) : [];
      return os.length ? H(`이 순서로 먼저 알아보기 좋은 곳`, `${E(g0.pack.name_ko)} 묶음 · 명단과 공시 값 그대로`) +
        `<table class="tb tb-xs"><thead><tr><th>회사</th><th>업종</th><th>주력 품목</th><th>누리집</th></tr></thead><tbody>${os.map((o) => `<tr><td><b>${E(o.name)}</b>${o.listed ? ` <span class="mut sm">${E(o.listed)}</span>` : ""}</td><td>${E(o.sector)}</td><td class="mut">${E((o.product || "").length > 30 ? `${(o.product || "").slice(0, 29)}…` : o.product || "")}</td><td class="mut sm">${E((o.url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, ""))}</td></tr>`).join("")}</tbody></table>` : "";
    })() +
    (roleRow || expRow || madeRow ? note("내 결과에서 미리 옮겨 둔 것", ul([roleRow && `지원할 직무 · ${roleRow}`, expRow && `이어지는 경험 · ${expRow}`, madeRow].filter(Boolean) as string[])) : "") +
    band("상담 연계", `알아본 내용을 들고 ${E(x.issuer)} 상담에 오시면 지역 일자리와 지원 사업을 함께 찾아볼 수 있습니다.`)) });
  /* 조사하는 법은 회사 목록 바로 뒤, 공시 숫자 앞에 둔다. 장 끝에 두면 뒤에서 끌어올 쪽이 없어 반쪽이 빈 채로 끝난다 */
  const research = out.pop()!;
  const at = out.findIndex((p) => /상장사|공기업|사업의 개요/.test(p.title));
  out.splice(at > 0 ? at : out.length, 0, research);
  /* 공기업 개황도 짧은 쪽이라 장 끝에 두지 않는다. 조사하는 법 바로 뒤로 옮긴다 */
  const pi = out.findIndex((p) => /공기업/.test(p.title));
  if (pi > 0 && pi === out.length - 1) {
    const pub = out.splice(pi, 1)[0];
    out.splice(out.indexOf(research) + 1, 0, pub);
  }
  /* 사업의 개요 읽기(통째로 읽는 쪽)도 장 끝에 두지 않는다. 장은 줄 단위로 나눌 수 있는 표로 끝나야 남는 자리가 생기지 않는다 */
  const oi = out.findIndex((p) => /사업의 개요/.test(p.title));
  if (oi > 0 && oi === out.length - 1) {
    const ov = out.splice(oi, 1)[0];
    out.splice(out.indexOf(research) + 1, 0, ov);
  }
  return out;
}
