/**
 * 장마다 덧붙일 거리. 쪽 모으기가 남은 자리가 넓은 쪽을 찾아 들어가는 만큼만 싣고, 들어갈
 * 자리가 없으면 싣지 않는다. 그래서 쪽 수를 늘리지 않는다.
 *
 * 거리는 전부 이미 있는 자료다: 결과 모델(참여자의 응답과 고른 항목), 그 Core 의 사전과
 * 체크리스트, 직무 안내, 지역 자료의 출처. 일반론 문장은 넣지 않는다.
 */
import type { Axis } from "../scoring/types";
import type { Inputs } from "./types";
import { AXES, STEP_WORD, type X } from "./derive";
import { E, H, chips, ul, type Page } from "./kit";
import { polite } from "./text";
import type { FitGroup } from "./region";

const F = (part: string, partName: string, title: string, sub: string, body: string): Page =>
  ({ part, partName, title, kind: "fill", body: H(title, sub) + body });

/** 장 이름(partName)마다 덧붙일 거리. 차례가 곧 먼저 쓰는 차례다 */
export function fillPages(x: Inputs, d: X, part3: string, region: { name: string; sources: string[]; groups: FitGroup[] } | null): Record<string, Page[]> {
  const out: Record<string, Page[]> = {};
  const add = (p: Page) => { (out[p.partName] ??= []).push(p); };

  /* 들어가며 */
  add(F("", "들어가며", "이번 응답의 범위", "결과 모델에서 센 수",
    `<table class="tb tb-xs"><tbody>${[
      [`${x.domainWord}`, `${d.counts.domains}가지 가운데 판단 여덟 가지를 물은 곳 ${d.counts.asked}곳`],
      ["고른 근거 항목", `${d.counts.items}개`],
      ["확인된 판단 · 기준까지 정한 판단", `${d.counts.confirmed}칸 · ${d.counts.owned}칸`],
      ["남긴 결과물", `${d.counts.artifacts}가지`],
      ["결과를 굳힌 때까지 적은 경험 기록", `${d.counts.records}건`],
    ].map(([a, b]) => `<tr><th class="w30">${E(a)}</th><td>${E(b)}</td></tr>`).join("")}</tbody></table>`));

  /* 01 한눈에 보기 */
  const goal = x.m.targets.goal;
  const tRows: [string, string][] = [
    ["목표 직무", goal.role ? d.roleName(goal.role) : ""],
    ["목표 산업", goal.industry ? d.indName(goal.industry) : ""],
    ["관심 직무", x.m.targets.roles.map(d.roleName).filter(Boolean).join(" · ")],
    ["관심 산업", x.m.targets.industries.map(d.indName).filter(Boolean).join(" · ")],
  ].filter((r) => r[1]) as [string, string][];
  if (tRows.length) add(F("01", "한눈에 보기", "검사에서 고른 목표와 관심", "참여자가 고른 그대로",
    `<table class="tb tb-xs"><tbody>${tRows.map(([a, b]) => `<tr><th class="w22">${E(a)}</th><td>${E(b)}</td></tr>`).join("")}</tbody></table>`));

  /* 02 판단 프로파일 */
  add(F("02", "판단 프로파일", "판단 여덟 가지가 묻는 것", "뜻 · 가장 깊은 단계 · 나온 곳",
    `<table class="tb tb-xs"><thead><tr><th class="w16">판단</th><th>묻는 것</th><th class="w16">가장 깊은 단계</th><th class="w12">나온 곳</th></tr></thead><tbody>${d.best.map((b) => `<tr><td><b>${E(d.axisName(b.axis))}</b></td><td>${E(d.axisWhat(b.axis))}</td><td>${b.level == null ? "이번에 묻지 않음" : STEP_WORD[b.level].tag}</td><td>${b.where.length}곳</td></tr>`).join("")}</tbody></table>`));
  const pickRows = AXES.map((a) => {
    const all = x.m.domains.flatMap((z) => d.picks(z.code, a).map((t) => ({ t, z: z.code })));
    return { a, n: all.length, ex: all[0] };
  }).filter((r) => r.n);
  if (pickRows.length) add(F("02", "판단 프로파일", "판단마다 고른 근거", "체크리스트에서 직접 고른 문장 수와 그 하나",
    `<table class="tb tb-xs"><thead><tr><th class="w16">판단</th><th class="w12">고른 수</th><th>고른 문장 하나</th></tr></thead><tbody>${pickRows.map((r) => `<tr><td><b>${E(d.axisName(r.a))}</b></td><td>${r.n}개</td><td>${r.ex ? `${E(r.ex.t)} <span class="mut">(${E(d.name(r.ex.z))})</span>` : ""}</td></tr>`).join("")}</tbody></table>`));

  /* 03 영역별 해설: 깊게 물은 영역에서 체크리스트에 있는데 고르지 않은 장면 */
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
    add(F("03", part3, `${d.name(z.code)}에서 이번에 고르지 않은 장면`, "체크리스트 원문 · 해 본 적이 있으면 경험 기록에 적습니다",
      `<table class="tb tb-xs"><tbody>${rows.map((r) => `<tr><td class="w16"><b>${E(d.axisName(r.a))}</b></td><td>${E(r.t)}</td></tr>`).join("")}</tbody></table>`));
  }

  /* 03: 깊게 묻지 않은 영역에서 판단 여덟 가지가 나타나는 모습(전공 사전) */
  for (const z of x.m.domains.filter((v) => !d.asked(v)).slice(0, 8)) {
    const def = d.def(z.code);
    if (!def?.axes) continue;
    add(F("03", part3, `${d.name(z.code)}에서 판단 여덟 가지가 나타나는 모습`, "이번에 묻지 않음 · 전공 사전",
      `<table class="tb tb-xs ax2"><tbody>${[0, 2, 4, 6].map((k) => `<tr>${[AXES[k], AXES[k + 1]].map((a) => `<td class="w16"><b>${E(d.axisName(a))}</b></td><td>${E(def.axes?.[a]?.l2 ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`));
  }

  /* 04: 직무가 영역을 보는 까닭(직무 안내의 lens) */
  for (const r of d.roleOrder.slice(0, 3)) {
    const g = x.guide.roles[r.code] as unknown as { lens?: Record<string, { why?: string }> } | undefined;
    const lens = Object.entries(g?.lens ?? {}).filter(([, v]) => v?.why);
    if (lens.length < 2) continue;
    add(F("04", "직무 탐색", `${r.name_ko}이 ${x.domainWord}을 보는 까닭`, "직무 안내",
      `<table class="tb tb-xs"><tbody>${lens.slice(0, 6).map(([td, v]) => `<tr><td class="w22"><b>${E(d.name(td))}</b></td><td>${E(v.why ?? "")}</td></tr>`).join("")}</tbody></table>`));
  }

  /* 04 직무 탐색: 깊게 다루지 않은 직무의 공고 읽기와 알아 둘 것(직무 안내) */
  for (const r of d.roleOrder.slice(1)) {
    const g = x.guide.roles[r.code];
    if (!g) continue;
    add(F("04", "직무 탐색", `${r.name_ko} 공고를 읽을 때`, "직무 안내",
      `<div class="two"><div>${ul(g.postingCheck.slice(0, 4).map(E))}</div><div><p>${E(g.watch)}</p>${chips(g.portfolio.slice(0, 4), "art")}</div></div>`));
  }

  /* 05 지역: 잘 맞는 묶음에서 표에 다 싣지 못한 회사(명단과 공시 값 그대로) */
  if (region) for (const g of region.groups.filter((v) => v.tier === "A" && v.orgs.length > 4).slice(0, 3)) {
    const more = g.orgs.slice(4, 14);
    add(F("05", region.name, `${g.pack.name_ko} 묶음의 다른 회사`, `${g.orgs.length}곳 가운데 표에 싣지 못한 곳 · 명단과 공시 값 그대로`,
      `<table class="tb tb-xs"><tbody>${more.map((o) => `<tr><td class="w30"><b>${E(o.name)}</b>${o.listed ? ` <span class="mut sm">${E(o.listed)}</span>` : ""}</td><td>${E(o.sector)}</td><td class="mut">${E((o.product || "").length > 40 ? `${(o.product || "").slice(0, 39)}…` : o.product || "")}</td></tr>`).join("")}</tbody></table>`));
  }

  /* 05 지역: 자료의 출처와 확인일 */
  if (region?.sources.length) add(F("05", region.name, "이 장의 자료", "출처와 확인일", ul(region.sources.map(E))));

  /* 06 자기소개서·면접 준비: 다른 관심 직무의 면접 질문(직무 안내) */
  for (const r of d.roleOrder.filter((v) => v.code !== (d.goalRole ?? d.roleOrder[0]).code).slice(0, 3)) {
    const g = x.guide.roles[r.code];
    if (!g?.interview?.length) continue;
    add(F("06", "자기소개서·면접 준비", `${r.name_ko} 면접 질문`, "직무 안내 · 묻는 까닭",
      `<table class="tb tb-xs"><tbody>${g.interview.slice(0, 3).map((v) => `<tr><td class="w16"><b>${E(d.axisName(v.axis))}</b></td><td><b>${E(v.q)}</b><br><span class="mut">${E(v.why)}</span></td></tr>`).join("")}</tbody></table>`));
  }

  /* 07: 목표 직무와 다음 직무가 반기는 경험(직무 안내) · 참여자가 표시합니다 */
  for (const r of d.roleOrder.slice(0, 3)) {
    const g = x.guide.roles[r.code] as unknown as { experiences?: string[] } | undefined;
    if (!g?.experiences?.length) continue;
    add(F("07", "실행 로드맵", `${r.name_ko} 쪽에서 반기는 경험`, "직무 안내 · 해 본 것에 표시합니다",
      `<ul class="cb">${g.experiences.slice(0, 5).map((t) => `<li><i></i>${E(t)}</li>`).join("")}</ul>`));
  }

  /* 07: 다음 직무 쪽으로 갈 때 배울 순서(직무 안내 · 첫 직무의 순서는 04장에 있다) */
  for (const r of d.roleOrder.slice(1, 3)) {
    const g = x.guide.roles[r.code];
    if (!g?.learnOrder?.length) continue;
    add(F("07", "실행 로드맵", `${r.name_ko} 쪽으로 갈 때 배울 순서`, "직무 안내",
      `<table class="tb tb-xs"><tbody>${g.learnOrder.slice(0, 5).map((v, i) => `<tr><td class="w30"><b>${i + 1}. ${E(v.step)}</b></td><td>${E(v.why)}</td></tr>`).join("")}</tbody></table>`));
  }

  /* 부록: 산업마다 쓰는 말(산업팩의 용어) */
  const voc = x.inds.filter((p) => (p.vocabulary ?? []).length);
  if (voc.length) add(F("", "부록", "산업마다 쓰는 말", "산업팩의 용어 · 공고와 사업보고서에서 이 말로 나옵니다",
    `<table class="tb tb-xs"><tbody>${voc.map((p) => `<tr><td class="w22"><b>${E(p.name_ko)}</b></td><td>${E((p.vocabulary ?? []).slice(0, 10).join(" · "))}</td></tr>`).join("")}</tbody></table>`));

  /* 부록: 이 리포트에 나온 직무 한 줄 풀이(직무 안내 · 직무팩) */
  add(F("", "부록", "직무 한 줄 풀이", "직무 안내와 직무팩의 설명",
    `<table class="tb tb-xs"><tbody>${x.roles.map((r) => `<tr><td class="w22"><b>${E(r.name_ko)}</b></td><td>${E(x.guide.roles[r.code]?.summary ?? polite(r.owns))}</td></tr>`).join("")}</tbody></table>`));

  /* 부록: 영역의 세부 이름(사전) */
  add(F("", "부록", `${x.domainWord}의 세부 이름`, "전공 사전 · 공고와 수업에서 이 이름으로도 불립니다",
    `<table class="tb tb-xs"><tbody>${x.tax.technical_domains.map((t) => `<tr><td class="w22"><b>${E(t.name)}</b></td><td>${E((t.subareas ?? []).join(" · "))}</td></tr>`).join("")}</tbody></table>`));
  return out;
}
