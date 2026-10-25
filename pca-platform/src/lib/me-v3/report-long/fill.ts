/**
 * 장마다 붙는 채움 쪽. 쪽 모으기가 남은 자리가 넓은 쪽을 찾아 들어가는 만큼만 싣고, 들어갈
 * 자리가 없으면 싣지 않는다. 그래서 쪽 수를 늘리지 않는다.
 *
 * 재료는 전부 이미 있는 자료다: 참여자의 응답과 고른 항목, 그 Core 의 사전과 체크리스트,
 * 직무 안내, 지역 자료의 출처. 어디에나 붙는 일반론 문장은 넣지 않는다.
 */
import type { Axis } from "../scoring/types";
import type { Inputs } from "./types";
import { AXES, STEP_WORD, ZONE_WORD, type X, NOT_ASKED } from "./derive";
import { E, H, chips, ul, type Page } from "./kit";
import { j, polite, politeList, politePara } from "./text";
import type { FitGroup, ROrg } from "./region";

const F = (part: string, partName: string, title: string, sub: string, body: string): Page =>
  ({ part, partName, title, kind: "fill", body: H(title, sub) + body });
/** 채움 쪽 머리의 한 줄: 이 쪽에서 무엇을 보고 무엇을 하면 되는지 */
const lead = (t: string) => `<p class="mut sm" style="margin:0 0 2mm">${t}</p>`;
/** 사전에서 온 여러 문장 문단은 한 줄에 한 문장씩 목록으로 */
const sentences = (s: string | null | undefined) => (s ? politeList(s).map(E) : []);

/** 장 이름(partName)마다 채움 쪽. 차례가 곧 먼저 쓰는 차례다 */
export function fillPages(x: Inputs, d: X, part3: string, region: { name: string; sources: string[]; groups: FitGroup[]; neighbor?: ROrg[]; listed?: ROrg[]; label?: string } | null): Record<string, Page[]> {
  const out: Record<string, Page[]> = {};
  const add = (p: Page) => { (out[p.partName] ??= []).push(p); };

  /* 들어가며 */
  const ne = d.counts.domains - d.counts.asked;
  add(F("", "들어가며", "이 책이 읽은 내 응답", "응답에서 센 수",
    lead(`뒤의 모든 쪽은 아래 응답에서 나왔어요. 수가 적은 줄이 있다면 경험 기록을 더한 뒤 다시 받아 보세요.`) +
    `<table class="tb tb-xs"><tbody>${[
      [`${x.domainWord}`, `${d.counts.domains}개 가운데 판단까지 물은 곳 ${d.counts.asked}곳${ne > 0 ? ` · ${ZONE_WORD.NOT_EXPLORED.tag} ${ne}곳` : ""}`],
      ["체크리스트에서 고른 항목", `${d.counts.items}개`],
      [`‘${STEP_WORD[2].tag}’로 확인된 판단`, `${d.counts.confirmed}개 (영역마다 따로 셈)`],
      [`‘${STEP_WORD[3].tag}’인 판단`, `${d.counts.owned}개`],
      ["남긴 결과물", `${d.counts.artifacts}가지`],
      ["결과가 나온 날까지 적은 경험 기록", `${d.counts.records}건`],
    ].map(([a, b]) => `<tr><th class="w30">${E(a)}</th><td>${E(b)}</td></tr>`).join("")}</tbody></table>`));

  /* 01 한눈에 보기 */
  const goal = x.m.targets.goal;
  const tRows: [string, string][] = [
    ["목표 직무", goal.role ? d.roleName(goal.role) : ""],
    ["목표 산업", goal.industry ? d.indName(goal.industry) : ""],
    ["관심 직무", x.m.targets.roles.map(d.roleName).filter(Boolean).join(" · ")],
    ["관심 산업", x.m.targets.industries.map(d.indName).filter(Boolean).join(" · ")],
  ].filter((r) => r[1]) as [string, string][];
  if (tRows.length) add(F("01", "한눈에 보기", "검사에서 적은 목표와 관심", "응답 그대로",
    lead("04장에서 이 직무와 산업을 한 걸음 더 들어가 봐요. 목표가 바뀌었다면 다시 검사할 때 고쳐 적어 보세요.") +
    `<table class="tb tb-xs"><tbody>${tRows.map(([a, b]) => `<tr><th class="w22">${E(a)}</th><td>${E(b)}</td></tr>`).join("")}</tbody></table>`));

  /* 02 판단 프로파일 */
  add(F("02", "판단 프로파일", "판단마다 묻는 것과 내가 가장 깊이 해 본 단계", "판단의 뜻과 내 응답",
    lead("단계가 낮은 판단이 다음 과제에서 직접 맡아 볼 자리예요.") +
    `<table class="tb tb-xs"><thead><tr><th class="w16">판단</th><th>묻는 것</th><th class="w16">가장 깊은 단계</th><th class="w12">그 단계인 영역</th></tr></thead><tbody>${d.best.map((b) => `<tr><td><b>${E(d.axisName(b.axis))}</b></td><td>${E(d.axisWhat(b.axis))}</td><td>${b.level == null ? NOT_ASKED : STEP_WORD[b.level].tag}</td><td>${b.where.length}곳</td></tr>`).join("")}</tbody></table>`));
  const pickRows = AXES.map((a) => {
    const all = x.m.domains.flatMap((z) => d.picks(z.code, a).map((t) => ({ t, z: z.code })));
    return { a, n: all.length, ex: all[0] };
  }).filter((r) => r.n);
  if (pickRows.length) add(F("02", "판단 프로파일", "판단마다 고른 체크리스트 항목", "고른 수와 그 가운데 하나",
    lead("고른 항목은 자기소개서와 면접에서 그대로 꺼내 쓸 수 있는 장면이에요.") +
    `<table class="tb tb-xs"><thead><tr><th class="w16">판단</th><th class="w12">고른 수</th><th>고른 항목 하나</th></tr></thead><tbody>${pickRows.map((r) => `<tr><td><b>${E(d.axisName(r.a))}</b></td><td>${r.n}개</td><td>${r.ex ? `${E(r.ex.t)} <span class="mut">(${E(d.name(r.ex.z))})</span>` : ""}</td></tr>`).join("")}</tbody></table>`));

  /* 03 영역별 해설: 깊게 물은 영역에서 체크리스트에 있는데 고르지 않은 항목 */
  const asked = x.m.domains.filter((z) => d.asked(z));
  for (const z of asked.slice(0, 4)) {
    const rows: { a: Axis; t: string }[] = [];
    const order = [...AXES].sort((a, b) => d.picks(z.code, a).length - d.picks(z.code, b).length);
    for (const a of order) {
      const mine = new Set(d.picks(z.code, a));
      for (const t of d.scenes(z.code, a).filter((s) => !mine.has(s)).slice(0, 2)) rows.push({ a, t });
      if (rows.length >= 10) break;
    }
    if (rows.length < 4) continue;
    add(F("03", part3, `${d.name(z.code)}에서 아직 고르지 않은 장면`, "해 본 적이 있다면 경험 기록에 더해 보세요",
      `<table class="tb tb-xs"><tbody>${rows.map((r) => `<tr><td class="w16"><b>${E(d.axisName(r.a))}</b></td><td>${E(r.t)}</td></tr>`).join("")}</tbody></table>`));
  }

  /* 03: 깊게 묻지 않은 영역에서 판단마다 하는 일(전공 사전) */
  for (const z of x.m.domains.filter((v) => !d.asked(v)).slice(0, 8)) {
    const def = d.def(z.code);
    if (!def?.axes) continue;
    add(F("03", part3, `${d.name(z.code)}에서 일하며 내리는 판단`, `${ZONE_WORD.NOT_EXPLORED.tag} · 전공 사전의 예`,
      `<table class="tb tb-xs ax2"><tbody>${[0, 2, 4, 6].map((k) => `<tr>${[AXES[k], AXES[k + 1]].map((a) => `<td class="w16"><b>${E(d.axisName(a))}</b></td><td>${E(def.axes?.[a]?.l2 ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`));
  }

  /* 04: 직무가 영역을 보는 까닭(직무 안내의 lens) */
  for (const r of d.roleOrder.slice(0, 3)) {
    const g = x.guide.roles[r.code] as unknown as { lens?: Record<string, { why?: string }> } | undefined;
    const lens = Object.entries(g?.lens ?? {}).filter(([, v]) => v?.why);
    if (lens.length < 2) continue;
    add(F("04", "직무 탐색", `${r.name_ko} 쪽이 눈여겨보는 ${j(x.domainWord, "과와")} 그 까닭`, "직무 안내",
      `<table class="tb tb-xs"><tbody>${lens.slice(0, 6).map(([td, v]) => `<tr><td class="w22"><b>${E(d.name(td))}</b></td><td>${E(politePara(v.why ?? ""))}</td></tr>`).join("")}</tbody></table>`));
  }

  /* 04 직무 탐색: 깊게 다루지 않은 직무의 공고 읽기와 알아 둘 것(직무 안내) */
  for (const r of d.roleOrder.slice(1)) {
    const g = x.guide.roles[r.code];
    if (!g) continue;
    add(F("04", "직무 탐색", `${r.name_ko} 공고를 읽을 때`, "직무 안내",
      `<div class="two"><div><p class="k">공고에서 먼저 볼 것</p>${ul(g.postingCheck.slice(0, 4).map(E))}</div><div>${g.watch ? `<p class="k">알아 둘 것</p>${ul(sentences(g.watch))}` : ""}${g.portfolio.length ? `<p class="k" style="margin-top:2mm">결과물로 보여 줄 것</p>${chips(g.portfolio.slice(0, 4), "art")}` : ""}</div></div>`));
  }

  /* 05 지역: 표에 다 싣지 못한 회사(명단과 공시 값 그대로). 다섯 곳씩 나눠 두어 남은 자리 크기에 맞춰 들어가게 한다.
     겹치지 않게 잘라서, 두 조각이 함께 실려도 같은 회사가 두 번 나오지 않는다 */
  if (region) for (const g of region.groups.filter((v) => (v.tier === "A" || v.tier === "B") && v.orgs.length > 4).slice(0, 4)) {
    for (let k = 4; k < Math.min(g.orgs.length, 24); k += 5) {
      const more = g.orgs.slice(k, k + 5);
      add(F("05", region.name, `${g.pack.name_ko} 쪽 회사${k > 4 ? " (계속)" : " 더 보기"}`, `${g.orgs.length}곳 가운데 ${more.length > 1 ? `${k + 1}~${k + more.length}` : k + 1}번째 · 공개 명단과 공시 값`,
        `<table class="tb tb-xs"><tbody>${more.map((o) => `<tr><td class="w30"><b>${E(o.name)}</b>${o.listed ? ` <span class="mut sm">${E(o.listed)}</span>` : ""}</td><td>${E(o.sector)}</td><td class="mut">${E((o.product || "").length > 40 ? `${(o.product || "").slice(0, 39)}…` : o.product || "")}</td></tr>`).join("")}</tbody></table>`));
    }
  }

  /* 05 지역: 앞의 표에 다 싣지 못한 상장사(공시 값 그대로). 대전·충청처럼 명단 회사가 적은 지역에서 장 끝을 채운다 */
  const won = (v: number | null | undefined) => (v == null ? "" : `${Math.round(v / 1e8).toLocaleString("ko-KR")}억 원`);
  const lrow = (o: ROrg) => `<tr><td class="w30"><b>${E(o.name)}</b></td><td>${E(o.sector)}</td><td class="mut">${E([won(o.fin?.sales) && `매출 ${won(o.fin?.sales)}`, o.segments?.[0] ? `${o.segments[0].segment} ${o.segments[0].count.toLocaleString("ko-KR")}명` : ""].filter(Boolean).join(" · "))}</td></tr>`;
  if (region?.neighbor && region.neighbor.length > 8) for (let k = 8; k < Math.min(region.neighbor.length, 28); k += 5) {
    const more = region.neighbor.slice(k, k + 5);
    add(F("05", region.name, `가까운 상장사 (계속)`, `${region.neighbor.length}곳 가운데 ${more.length > 1 ? `${k + 1}~${k + more.length}` : k + 1}번째 · 공시 값`, `<table class="tb tb-xs"><tbody>${more.map(lrow).join("")}</tbody></table>`));
  }
  if (region?.listed && region.listed.length > 12) for (let k = 12; k < Math.min(region.listed.length, 32); k += 5) {
    const more = region.listed.slice(k, k + 5);
    add(F("05", region.name, `${region.label ?? ""} 본점 상장사 (계속)`, `${region.listed.length}곳 가운데 ${more.length > 1 ? `${k + 1}~${k + more.length}` : k + 1}번째 · 공시 값`, `<table class="tb tb-xs"><tbody>${more.map(lrow).join("")}</tbody></table>`));
  }

  /* 05 지역: 이 장에서 확인한 것을 순서로 묶는다. 숫자는 이 장의 명단과 공시에서 센 것만 쓴다 */
  if (region) {
    const gs = region.groups.filter((g) => g.orgs.length);
    const n = gs.reduce((a, g) => a + g.orgs.length, 0);
    const g0 = [...gs].sort((a, b) => "ABC".indexOf(a.tier) - "ABC".indexOf(b.tier) || b.orgs.length - a.orgs.length)[0];
    const firsts = g0 ? g0.orgs.slice(0, 3).map((o) => o.name) : [];
    const lst = (region.listed ?? []).length, nb = (region.neighbor ?? []).length;
    const steps = [
      n ? `이 장에는 ${x.major} 전공의 산업과 이어지는 회사 ${n}곳을 산업 ${gs.length}개로 나눠 실었어요.` : "",
      g0 ? `먼저 ${g0.pack.name_ko} 쪽${firsts.length ? `(${firsts.join(", ")} 등)` : ""}에서 한 곳을 골라 앞의 세 단계로 알아보세요.` : "",
      lst || nb ? `공시 숫자는 ${region.label ?? "이 지역"} 본점 상장사 ${lst}곳${nb ? `, 가까운 지역 상장사 ${nb}곳` : ""}에 대해 실었어요. 매출과 사업부문별 직원 수를 보면 그 회사에서 ${x.major} 전공자가 일할 부문을 짐작해 볼 수 있어요.` : "",
      "알아본 회사 가운데 한 곳은 07장 계획의 할 일과 이어서, 그 회사 공고의 담당 업무에 맞춘 결과물을 하나 남겨 보세요.",
    ].filter(Boolean);
    if (steps.length >= 3) add(F("05", region.name, `${region.label ?? ""} 회사는 이 순서로 알아보세요`, "이 장의 명단과 공시에서 정리", `<ol class="x-ol">${steps.map((t) => `<li>${E(t)}</li>`).join("")}</ol>`));
  }

  /* 05 지역: 목표 직무 공고를 이 지역에서 읽을 때 확인할 것(직무 안내) */
  if (region) {
    const gr = d.goalRole ?? d.roleOrder[0];
    const g = gr ? x.guide.roles[gr.code] : undefined;
    if (g?.postingCheck?.length) add(F("05", region.name, `${region.label ?? ""} 회사의 ${gr!.name_ko} 공고를 읽을 때`, "직무 안내 · 공고에서 먼저 확인할 것",
      ul(g.postingCheck.slice(0, 5).map(E))));
  }

  /* 05 지역: 자료의 출처와 확인일 */
  if (region?.sources.length) add(F("05", region.name, "이 장의 자료", "출처와 확인일", ul(region.sources.map(E))));

  /* 05 지역: 알아본 회사를 적어 두는 표. 남은 자리가 있을 때만 실리고, 실리면 쓰는 줄이 남은 자리만큼 늘어난다 */
  if (region) add(F("05", region.name, "알아본 회사를 여기 적어 두세요", "직접 쓰는 칸",
    lead("한 곳을 알아볼 때마다 한 줄씩 채워 보세요. 내 경험이 닿는 곳을 적어 두면 자기소개서의 지원 동기와 면접 답변에 그대로 쓸 수 있어요.") +
    `<table class="tb ws"><thead><tr><th>회사</th><th>하는 일 · 주력 품목</th><th>내 경험이 닿는 곳</th><th>다음에 할 일</th></tr></thead><tbody>${[1, 2, 3].map((n) => `<tr><th>${n}</th><td></td><td></td><td></td></tr>`).join("")}</tbody></table>`));

  /* 06 자기소개서·면접 준비: 다른 관심 직무의 면접 질문(직무 안내) */
  for (const r of d.roleOrder.filter((v) => v.code !== (d.goalRole ?? d.roleOrder[0]).code).slice(0, 3)) {
    const g = x.guide.roles[r.code];
    if (!g?.interview?.length) continue;
    add(F("06", "자기소개서·면접 준비", `${r.name_ko} 면접 질문`, "직무 안내 · 면접에서 이 질문을 하는 까닭",
      `<table class="tb tb-xs"><tbody>${g.interview.slice(0, 3).map((v) => `<tr><td class="w16"><b>${E(d.axisName(v.axis))}</b></td><td><b>${E(v.q)}</b><br><span class="mut">${E(polite(v.why))}</span></td></tr>`).join("")}</tbody></table>`));
  }

  /* 06: 직무마다 포트폴리오에 넣을 결과물(직무 안내). 지원서에 붙일 자료를 고를 때 쓴다 */
  for (const r of d.roleOrder.slice(0, 4)) {
    const g = x.guide.roles[r.code];
    if (!g?.portfolio?.length) continue;
    add(F("06", "자기소개서·면접 준비", `${r.name_ko} 쪽 포트폴리오에 넣을 것`, "직무 안내",
      ul(g.portfolio.slice(0, 4).map(E))));
  }

  /* 07: 목표 직무와 다음 직무가 반기는 경험(직무 안내). 표시 칸 없이 목록으로 싣는다 */
  for (const r of d.roleOrder.slice(0, 3)) {
    const g = x.guide.roles[r.code] as unknown as { experiences?: string[] } | undefined;
    if (!g?.experiences?.length) continue;
    add(F("07", "실행 로드맵", `${r.name_ko} 쪽에서 반기는 경험`, "직무 안내 · 6개월 계획을 고칠 때 이 가운데서 골라 보세요",
      ul(g.experiences.slice(0, 5).map(E))));
  }

  /* 07: 다음 직무 쪽으로 갈 때 배울 순서(직무 안내 · 첫 직무의 순서는 04장에 있다) */
  for (const r of d.roleOrder.slice(1, 3)) {
    const g = x.guide.roles[r.code];
    if (!g?.learnOrder?.length) continue;
    add(F("07", "실행 로드맵", `${r.name_ko} 쪽으로 갈 때 배울 순서`, "직무 안내",
      `<table class="tb tb-xs"><tbody>${g.learnOrder.slice(0, 5).map((v, i) => `<tr><td class="w30"><b>${i + 1}. ${E(v.step)}</b></td><td>${E(politePara(v.why))}</td></tr>`).join("")}</tbody></table>`));
  }

  /* 부록: 산업마다 쓰는 말(산업팩의 용어) */
  const voc = x.inds.filter((p) => (p.vocabulary ?? []).length);
  if (voc.length) add(F("", "부록", "산업마다 쓰는 말", "산업팩의 용어 · 공고와 사업보고서에 이 말로 자주 나옵니다",
    `<table class="tb tb-xs"><tbody>${voc.map((p) => `<tr><td class="w22"><b>${E(p.name_ko)}</b></td><td>${E((p.vocabulary ?? []).slice(0, 10).join(" · "))}</td></tr>`).join("")}</tbody></table>`));

  /* 부록: 이 리포트에 나온 직무 한 줄 풀이(직무 안내 · 직무팩) */
  add(F("", "부록", "직무 한 줄 풀이", "직무 안내와 직무팩의 설명",
    `<table class="tb tb-xs"><tbody>${x.roles.map((r) => `<tr><td class="w22"><b>${E(r.name_ko)}</b></td><td>${E(politePara(x.guide.roles[r.code]?.summary ?? r.owns))}</td></tr>`).join("")}</tbody></table>`));

  /* 부록: 영역의 세부 이름(사전) */
  add(F("", "부록", `${x.domainWord}의 세부 이름`, "전공 사전 · 공고와 수업에서는 이 이름으로도 부릅니다",
    `<table class="tb tb-xs"><tbody>${x.tax.technical_domains.map((t) => `<tr><td class="w22"><b>${E(t.name)}</b></td><td>${E((t.subareas ?? []).join(" · "))}</td></tr>`).join("")}</tbody></table>`));
  return out;
}
