/**
 * 07 실행 로드맵 · 부록.
 *
 * 손으로 쓰는 표는 주간 점검표 하나만 둔다. 나머지 칸은 이미 계산된 할 일,
 * 직무 안내의 첫 프로젝트와 배울 순서, 내가 고른 항목으로 미리 채우고 `초안` 으로 적는다.
 * 채울 재료가 없는 상자는 `해당 없음` 을 찍지 않고 통째로 뺀다.
 *
 * 이 책은 학생 본인이 혼자 펴 보는 책이다(docs/metri/report-writing-rules.md 1절).
 * 상담 기록지와 응답 요약 쪽은 싣지 않으므로 함수도 두지 않는다.
 */
import type { Action, Gap } from "../result/model";
import type { Inputs } from "./types";
import { AXES, STEP_WORD, ZONE_WORD, type X } from "./derive";
import { C, chain, gantt } from "./charts";
import { E, H, PAL, T, ZC, band, card, howto, note, paginate, rowsOf, ul, type Page } from "./kit";
import { GAP_KIND, GAP_WHY, HORIZON_DAYS, actionHead, actionLine, actionOutput, askNoun, j, okOr, okText, polite } from "./text";

const P = (title: string, body: string): Page => ({ part: "07", partName: "실행 로드맵", title, body });
const A = (title: string, body: string): Page => ({ part: "", partName: "부록", title, body });

const DRAFT = `<span class="mut sm">초안</span>`;

/** 할 일이 걸린 영역의 이름과 사전 */
const actDn = (a: Action, d: X) => (a.domain ? d.name(a.domain) : "관심 영역");
const actDef = (a: Action, d: X) => (a.domain ? d.def(a.domain) : undefined);

/** 빈 자리를 채워야 하는 까닭. 단계 이름은 공용 이름(STEP_WORD)을 읽어 쓴다 */
const whyOf = (g: Pick<Gap, "kind" | "why">) =>
  g.kind === "PARTIAL_EVIDENCE" ? `근거를 하나 더 붙이면 ‘${STEP_WORD[3].tag}’ 단계로 올라갑니다` : GAP_WHY[g.why];

/** 목표 직무(없으면 가장 앞의 직무)와 그 직무 안내 */
function goalGuide(x: Inputs, d: X) {
  const role = d.goalRole ?? d.roleOrder[0] ?? null;
  const g = role ? x.guide.roles[role.code] : undefined;
  return { role, g, fp: g?.firstProject && g.firstProject.title ? g.firstProject : null };
}

/** 먼저 손댈 일의 사슬 그림에 쓰는 색. 그림과 읽는 법이 같은 값을 쓴다 */
const PRIO_C = { goal: C.navy, now: C.blue, act: C.teal, out: C.amber };

export function prioPages(x: Inputs, d: X): Page[] {
  const gs = d.gaps.slice(0, 6);
  const { role, fp } = goalGuide(x, d);
  if (!gs.length) {
    const acts = x.m.actions.slice(0, 3);
    const fpCard = !acts.length && fp && role
      ? card(`<p class="k">${E(role.name_ko)} 쪽 첫 프로젝트 · 초안</p><h4>${E(fp.title)}</h4>${okText(polite(fp.goal)) ? `<p>${E(polite(fp.goal))}</p>` : ""}<p class="mut sm">남길 것: ${E(fp.output)}</p>`)
      : "";
    return [P("먼저 손댈 일",
      T("지금 바로 메워야 할 판단은 나오지 않았습니다", "이번 응답에서는 비어 있다고 나온 판단이 없었어요. 이럴 때는 이미 해 본 일을 다른 사람이 읽을 수 있는 문서로 옮겨 두는 것부터 해 보세요.") +
      acts.map((a) => card(`<p class="k">${E(HORIZON_DAYS[a.horizon])}</p><h4>${E(actionHead(a, actDn(a, d)))}</h4><p>${E(actionLine(a, actDn(a, d), actDef(a, d)))}</p>`)).join("") + fpCard)];
  }
  const goalName = d.goalRole ? `${d.goalRole.name_ko} 직무` : d.goalInd ? `${d.goalInd.name_ko} 산업` : null;
  const goal = goalName ?? `${x.major} 쪽 경험 쌓기`;
  const dek = `${goalName ? `목표로 적은 ${E(goalName)}에 다가가려면 어디부터 메워야 하는지 보고 차례를 정했어요. ` : "어디부터 메워야 근거가 빨리 쌓이는지 보고 차례를 정했어요. "}한 줄마다 지금 상태, 해 볼 일, 끝내면 손에 남을 것을 이어 읽으면 됩니다.`;
  const read = howto([
    [PRIO_C.goal, "목표로 적은 직무나 산업"], [PRIO_C.now, "그 영역의 지금 상태"], [PRIO_C.act, "해 볼 일"], [PRIO_C.out, "끝내면 손에 남는 것"],
    ["화살표", "왼쪽에서 오른쪽으로 읽는 차례"],
  ], "줄마다 상자 넷이 한 가지 할 일을 보여 줘요. 맨 앞 숫자는 먼저 손댈 차례이고, 오른쪽 위 날짜는 끝낼 때예요.");
  return paginate(gs, () => 1, 3).map((chunk, k) => P(`먼저 손댈 일${k ? ` (${k + 1})` : ""}`,
    (k ? `<p class="k">먼저 손댈 일 (계속)</p>` : T(`먼저 손댈 일 ${gs.length}가지를 급한 것부터 놓았습니다`, dek)) +
    chunk.map((g, i) => {
      const a = d.actionOf(g);
      const dn = d.name(g.domain), def = d.def(g.domain);
      return `<div class="prio"><div class="prio-h"><span>${k * 3 + i + 1}</span><b>${E(dn)}${g.axis ? ` · ${E(d.axisName(g.axis))}` : ""}</b><span class="mut">${a ? `${E(HORIZON_DAYS[a.horizon])} 안에` : ""}</span></div>
        ${chain([
          { head: "목표", body: goal, color: PRIO_C.goal },
          { head: "지금 상태", body: GAP_KIND[g.kind], color: PRIO_C.now },
          { head: "해 볼 일", body: a ? actionHead(a, dn) : "할 일 정하기", color: PRIO_C.act },
          { head: "남길 것", body: a ? actionOutput(a, def) : (def?.artifacts[0] ?? "결과 문서"), color: PRIO_C.out },
        ], { width: 700, height: 100 })}
        <p class="sm">${E(whyOf(g))}. ${a ? E(actionLine(a, dn, def)) : ""}</p></div>${i === 0 ? read : ""}`;
    }).join("")));
}

/** 90일 계획 막대 색. 기간마다 한 색이고, 직무 안내에서 가져온 초안만 따로 칠한다 */
const SPAN_C: Record<Action["horizon"] | "DRAFT", string> = { NOW: PAL.blue, NEXT: PAL.teal, LATER: PAL.violet, DRAFT: PAL.amber };

export function ganttPage(x: Inputs, d: X): Page {
  const acts = x.m.actions.slice(0, 8);
  const { role, fp } = goalGuide(x, d);
  const span: Record<string, [number, number]> = { NOW: [1, 30], NEXT: [31, 60], LATER: [61, 90] };
  type Row = { when: string; head: string; line: string; out: string; from: number; to: number; draft: boolean; color: string };
  const rows: Row[] = acts.map((a) => ({
    when: HORIZON_DAYS[a.horizon], head: actionHead(a, actDn(a, d)), line: actionLine(a, actDn(a, d), actDef(a, d)),
    out: actionOutput(a, actDef(a, d)), from: span[a.horizon][0], to: span[a.horizon][1], draft: false, color: SPAN_C[a.horizon],
  }));
  /* 마지막 30일이 비면 목표 직무의 첫 프로젝트를 초안으로 올린다. 할 일이 하나도 없으면 90일 전체에 */
  const lateEmpty = !acts.some((a) => a.horizon === "LATER");
  const addFp = !!fp && !!role && lateEmpty && rows.length < 8;
  if (addFp && fp && role) rows.push({
    when: rows.length ? "90일" : "1~90일", head: fp.title, line: `${role.name_ko} 쪽 첫 프로젝트입니다. ${okOr(polite(fp.goal))}`.trim(),
    out: fp.output, from: rows.length ? 61 : 1, to: 90, draft: true, color: SPAN_C.DRAFT,
  });
  const bars = rows.map((r) => ({ label: r.draft ? `${r.head} (초안)` : r.head, from: r.from, to: r.to, color: r.color, note: r.out }));
  /* 읽는 법에는 그림에 실제로 나온 색만 싣는다 */
  const has = (c: string) => bars.some((b) => b.color === c);
  const marks: [string, string][] = [
    ["가로축", "날짜. 1~30일, 31~60일, 61~90일 세 구간"],
    ["막대 길이", "그 일을 하는 기간"],
    ["막대 안 글", "끝냈을 때 손에 남는 결과물"],
    ...([[SPAN_C.NOW, "30일 안에 끝낼 일"], [SPAN_C.NEXT, "60일 안에 끝낼 일"], [SPAN_C.LATER, "90일 안에 끝낼 일"], [SPAN_C.DRAFT, "직무 안내의 첫 프로젝트로 채운 초안"]] as [string, string][]).filter(([c]) => has(c)),
  ];
  const dek = `30일, 60일, 90일 안에 끝낼 일을 나눠 두었고, 막대 안 글은 끝냈을 때 손에 남는 결과물이에요.${addFp && acts.length ? ` 마지막 30일이 비어 있어 ${E(role?.name_ko ?? "")} 쪽 첫 프로젝트를 초안으로 넣었습니다.` : ""}`;
  return P("90일 계획",
    T(acts.length ? `90일 동안 할 일 ${acts.length}가지를 달력에 올렸습니다` : "90일 계획 초안입니다", dek) +
    (bars.length ? `<div class="wide-art">${gantt(bars, { width: 710, label: 250 })}</div>${howto(marks, "줄마다 할 일 하나이고, 왼쪽 이름이 그 일이에요.")}` : "") +
    (rows.length ? `<table class="tb tb-xs"><thead><tr><th>기간</th><th>할 일</th><th>남길 것</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td class="w18">${E(r.when)}${r.draft ? `<br>${DRAFT}` : ""}</td><td><b>${E(r.head)}</b>${rows.length > 5 && i >= 4 ? "" : `<br><span class="mut">${E(r.line)}</span>`}</td><td class="w22">${E(r.out)}</td></tr>`).join("")}</tbody></table>` : "") +
    band("한 기간에", "결과물은 두 개까지만 잡아야 끝까지 가기 쉬워요. 끝낸 일은 내 CareerMatri 경험 기록에 올려 두세요."));
}

export function longPage(x: Inputs, d: X): Page {
  const s0 = d.strengths[0] ? d.name(d.strengths[0].code) : null;
  const next = x.m.domains.find((z) => z.interest === "HIGH" && !["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE"].includes(z.zone));
  const { role, fp } = goalGuide(x, d);
  const vt = next ? d.def(next.code)?.verify_targets[0] : undefined;
  const g0 = d.gaps[0];
  const nActs = x.m.actions.length;
  const months = [
    { when: "4개월", what: "90일 동안 남긴 결과물을 경험 기록에 올리고 지금 상태를 다시 보기", out: "바뀐 지금 상태",
      check: nActs ? `할 일 ${nActs}가지 가운데 몇 가지를 끝냈는지` : "경험 기록이 한 건 이상 늘었는지" },
    fp && role
      ? { when: "6개월", what: `${role.name_ko} 쪽 첫 프로젝트(${fp.title}) 마치기`, out: fp.output, check: okOr(askNoun(fp.check), "결과물마다 정한 근거를 댈 수 있는지") }
      : { when: "6개월", what: `${s0 ? `${j(s0, "을를")} 중심으로 ` : ""}포트폴리오 첫 장 정리하기`, out: "포트폴리오 첫 장",
        check: s0 ? `${s0}에서 직접 정한 것이 한 줄씩 붙어 있는지` : "결과물마다 직접 정한 것이 한 줄씩 붙어 있는지" },
    { when: "9개월", what: next ? `관심이 높게 나온 ${d.name(next.code)}에서 두 번째 과제 해 보기` : "다른 영역 하나에서 두 번째 과제 해 보기", out: "두 번째 영역의 결과물",
      check: vt ? `결과를 ${j(vt, "과와")} 비교한 기록이 남았는지` : "결과를 무엇과 비교했는지 적혀 있는지" },
    { when: "12개월", what: "같은 검사를 다시 보고 이번 결과와 영역별로 나란히 놓아 보기", out: "두 결과의 비교",
      check: g0 ? `처음에 비어 있던 ${d.name(g0.domain)}${g0.axis ? ` ${d.axisName(g0.axis)}` : ""} 자리가 채워졌는지` : `${j(ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag, "으로")} 바뀐 영역이 생겼는지` },
  ];
  return P("6개월 · 12개월 계획",
    T(fp ? "6개월 뒤에는 첫 프로젝트 결과물을, 12개월 뒤에는 다시 본 검사 결과를 손에 쥐는 계획입니다" : "6개월 뒤에는 포트폴리오 첫 장을, 12개월 뒤에는 다시 본 검사 결과를 손에 쥐는 계획입니다",
      "90일 계획에 이어지는 길을 분기마다 하나씩 적었어요. 응답과 직무 안내로 미리 채운 초안이라, 일정이 바뀌면 그대로 고쳐 써도 됩니다.") +
    chain(months.map((v, i) => ({ head: v.when, body: v.what, color: [PAL.blue, PAL.teal, PAL.amber, PAL.coral][i] })), { width: 700, height: 150 }) +
    howto([["상자 머리", "검사를 본 날부터 지난 달 수(4·6·9·12개월)"], ["상자 안 글", "그때까지 끝낼 일"], ["화살표", "앞의 일을 끝내고 다음 일로 넘어가는 차례"]],
      "색은 시점을 구분하려고 칠했고 따로 뜻은 없어요.") +
    H("분기마다 남길 것과 확인할 것", "초안 · 일정이 바뀌면 고쳐 쓰세요") +
    `<table class="tb tb-s"><thead><tr><th class="w18">시점</th><th>남길 것</th><th>확인할 것</th></tr></thead><tbody>${months.map((v) => `<tr><td>${E(v.when)}</td><td>${E(v.out)}</td><td>${E(v.check)}</td></tr>`).join("")}</tbody></table>`);
}

export function researchPage(x: Inputs, d: X): Page {
  const role = d.goalRole ?? d.roleOrder[0];
  const aliases = x.tax.job_aliases.filter((a) => a.td.some((t) => role.core_ref.td.includes(t))).slice(0, 6).map((a) => a.posting_name);
  /* 그 직무가 쓰는 영역마다: 공고에서 나오는 모습 · 지금 붙일 수 있는 근거(없으면 그 영역의 할 일) */
  const rows = x.rel.td_role.filter((r) => r.role === role.code && r.strength !== "드묾").map((r) => {
    const z = d.dom(r.td);
    const ev = z ? d.evidenceOf(z) : null;
    const have = ev ? [...ev.decisions, ...ev.artifacts].slice(0, 2) : [];
    const act = x.m.actions.find((a) => a.domain === r.td);
    return { td: r.td, seen: okOr(r.appears_as), have, act };
  }).filter((r) => r.have.length || r.act).slice(0, 6);
  const table = rows.length
    ? H("공고를 읽을 때 대어 볼 근거", "초안 · 공고를 보면서 고쳐 쓰세요") +
      `<table class="tb tb-xs"><thead><tr><th class="w22">영역</th><th>이 직무에서 맡는 자리</th><th class="w34">지금 붙일 수 있는 근거</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${E(d.name(r.td))}</b></td><td>${E(r.seen)}</td><td>${r.have.length ? E(r.have.join(" · ")) : `<span class="mut">근거를 만들 일: ${E(actionHead(r.act!, d.name(r.td)))}</span>`}</td></tr>`).join("")}</tbody></table>`
    : "";
  return P("공고로 직무 알아보기",
    T("관심 직무는 공고의 ‘담당 업무’ 문장으로 알아보는 편이 빠릅니다", `${E(role.name_ko)} 쪽 공고를 찾을 때 쓸 순서예요. 검색어는 이 전공 사전에 실린 공고 이름에서 골랐습니다.`) +
    `<ol class="lo big">
      <li><b>공고 다섯 건 모으기</b><span>${aliases.length ? `‘${E(aliases.join("’ · ‘"))}’ 같은 이름으로 찾아보세요.` : "직무 이름으로 찾아보세요."} 회사는 서로 달라도 괜찮아요.</span></li>
      <li><b>담당 업무 문장 옮기기</b><span>다섯 건 가운데 두 번 이상 나온 업무 문장만 따로 적어 두세요.</span></li>
      <li><b>내 근거 붙이기</b><span>업무 문장마다 이 책에서 확인된 경험이나 경험 기록 하나를 붙여 보세요. 붙일 만한 것을 아래 표에 먼저 골라 두었어요.</span></li>
      <li><b>근거가 없는 줄 고르기</b><span>근거를 못 붙인 업무 문장 가운데 하나를 07장 할 일에 더해 보세요.</span></li>
      <li><b>현직자에게 묻기</b><span>학과 선배나 학교 취업지원 부서에 부탁해, 그 업무에서 신입이 실제로 어디까지 맡는지 물어보세요.</span></li>
    </ol>` + table);
}

/** 30일 할 일을 네 주로 나눈 초안. 재료가 없으면 빈 배열 */
function weekPlan(x: Inputs, d: X): string[] {
  const nows = x.m.actions.filter((a) => a.horizon === "NOW");
  const acts = (nows.length ? nows : x.m.actions).slice(0, 2);
  const out: string[] = [];
  if (acts.length) {
    const outs = [...new Set(acts.map((a) => actionOutput(a, actDef(a, d))))];
    out.push(actionHead(acts[0], actDn(acts[0], d)));
    out.push(acts[1] ? actionHead(acts[1], actDn(acts[1], d)) : `${outs[0]} 초안 만들기`);
    out.push(`${outs.join(", ")} 다듬고 소리 내어 한 번 읽어 보기`);
    out.push("끝낸 것을 경험 기록에 올리고 다음 달에 이어 갈 일 고르기");
    return out;
  }
  const { fp } = goalGuide(x, d);
  return fp ? fp.steps.slice(0, 4).map((s) => polite(s).replace(/\.$/, "")).filter(okText) : [];
}

export function weeklyPage(x?: Inputs, d?: X): Page {
  const plan = x && d ? weekPlan(x, d) : [];
  const head = plan.length
    ? `<th style="width:7%">주</th><th style="width:27%">이번 주 할 일 ${DRAFT}</th><th>한 일 · 직접 정한 것</th><th>남긴 것</th><th>막힌 것 · 다음 주</th>`
    : `<th style="width:7%">주</th><th>이번 주 한 일</th><th>직접 정한 것</th><th>남긴 것</th><th>막힌 것</th><th>다음 주</th>`;
  const row = (w: number) => plan.length
    ? `<tr><td style="text-align:center">${w}주</td><td style="vertical-align:top" class="sm">${E(plan[w - 1] ?? "")}</td><td></td><td></td><td></td></tr>`
    : `<tr><td style="text-align:center">${w}주</td><td></td><td></td><td></td><td></td><td></td></tr>`;
  return { keep: true, ...P("주간 점검표",
    T("한 주에 한 번, 몇 줄만 적어 두세요", plan.length
      ? "30일 할 일을 주마다 나눠 왼쪽 칸에 초안으로 적어 두었고, 나머지 칸은 그 주가 끝날 때 직접 적으면 돼요. 네 주가 지나면 첫 결과물 하나가 나와 있는 것이 목표입니다."
      : "30일 할 일을 주마다 나눠 점검하는 표예요. 네 주가 지나면 첫 결과물 하나가 나와 있는 것이 목표입니다.") +
    `<table class="tb ws wk"><thead><tr>${head}</tr></thead><tbody>${[1, 2, 3, 4].map(row).join("")}</tbody></table>` +
    `<div class="two">${note("막혔을 때", ul(["결과물 이름부터 정하고 표의 틀 먼저 만들기", "기준을 고르기 어려우면 버릴 안부터 적기", "막힌 까닭을 한 줄 적어 두고 다음 주 첫 줄로 옮기기"]))}${note("끝났을 때", ul(["결과물을 경험 기록에 올리기", "직접 정한 것 한 줄과 비교한 대상 한 줄 붙이기", "내 CareerMatri에서 지금 상태가 어떻게 바뀌었는지 보기"]), true)}</div>`) };
}

/* ── 부록 ── */

export function tracePages(x: Inputs, d: X): Page[] {
  type Row = { sec: string; claim: string; ev: string };
  const rows: Row[] = [];
  for (const z of x.m.domains.filter((v) => v.zone !== "NOT_EXPLORED")) {
    const ev = d.evidenceOf(z);
    rows.push({ sec: "03 영역별 해설", claim: `${d.name(z.code)}: ${ZONE_WORD[z.zone as keyof typeof ZONE_WORD]?.tag ?? ""}`, ev: [...ev.decisions, ...ev.artifacts, ...ev.comparisons].slice(0, 4).join(" · ") || `확인된 판단 ${z.confirmed.length}가지 (응답)` });
  }
  for (const g of d.gaps.slice(0, 6)) rows.push({ sec: "07 실행 로드맵", claim: `${d.name(g.domain)}${g.axis ? ` · ${d.axisName(g.axis)}` : ""}: 먼저 손댈 일`, ev: `${GAP_KIND[g.kind]} · ${whyOf(g)}` });
  if (d.goalRole) rows.push({ sec: "04 직무 탐색", claim: `목표 직무: ${d.goalRole.name_ko}`, ev: "응답에 적은 목표" });
  if (d.goalInd) rows.push({ sec: "04 직무 탐색", claim: `목표 산업: ${d.goalInd.name_ko}`, ev: "응답에 적은 목표" });
  for (const e of x.exps.slice(0, 3)) rows.push({ sec: "03 경험 기록", claim: e.title, ev: [...e.decisions, ...e.artifacts].slice(0, 3).join(" · ") || "경험 기록" });
  return paginate(rows, (r) => Math.max(rowsOf(r.ev, 40), rowsOf(r.claim, 22)), 34, 29).map((chunk, k) => A(`결론과 근거 추적${k ? ` (${k + 1})` : ""}`,
    (k ? `<p class="k">결론과 근거 추적 (계속)</p>` : T("결론마다 어느 응답에서 나왔는지 적었습니다", "왜 이렇게 나왔는지 궁금한 결론이 있으면 이 표에서 찾아보세요. 맨 오른쪽에 그 결론을 만든 응답과 체크리스트 항목이 있어요.")) +
    `<table class="tb tb-xs"><thead><tr><th class="w18">장</th><th class="w34">결론</th><th>근거</th></tr></thead><tbody>${chunk.map((r) => `<tr><td>${E(r.sec)}</td><td><b>${E(r.claim)}</b></td><td class="mut">${E(r.ev)}</td></tr>`).join("")}</tbody></table>`));
}

export function sourcesPage(x: Inputs, d: X, regionSources: string[]): Page {
  const gs = x.guide.status === "OK" ? "직무 여덟 개의 일반 안내" : x.guide.status === "PARTIAL" ? `직무 ${Object.keys(x.guide.roles).length}개의 일반 안내(나머지 직무는 직무 자료만 실음)` : "안내 준비 중(직무 자료만 실음)";
  return A("출처와 확인 범위",
    T("이 책에 쓴 자료와 쓰지 않은 자료", "결과는 내 응답과 경험 기록, 전공 사전으로만 만들었고, 일반 안내와 공개 자료는 읽을거리로만 붙였어요.") +
    `<table class="tb tb-s"><thead><tr><th>자료</th><th>무엇에 썼나</th><th>기준</th></tr></thead><tbody>
      <tr><td><b>CareerMatri 검사 응답 · 결과</b></td><td>판단 단계, 영역 나눔(강점 영역 등), 비어 있는 판단, 할 일</td><td>${E(x.answeredOn)} 응답, 고정된 결과</td></tr>
      <tr><td><b>내 경험 기록</b></td><td>경험 시간표, 응답과 맞춰 보기, 자기소개서 재료</td><td>결과가 나온 ${E(x.builtOn)}까지 저장된 기록 ${x.exps.length}건</td></tr>
      <tr><td><b>${E(x.major)} 전공 사전</b></td><td>영역의 일 흐름, 결과물, 공고 이름, 경계, 조직 유형</td><td>결과와 함께 저장된 판본</td></tr>
      <tr><td><b>${E(x.major)} 직무 · 산업 자료</b></td><td>직무와 산업이 쓰는 영역, 묻는 판단</td><td>결과와 함께 저장된 판본</td></tr>
      <tr><td><b>직무 일반 안내</b></td><td>${E(gs)}</td><td>검사와 결과 계산에는 쓰지 않음</td></tr>
      ${regionSources.map((s) => `<tr><td><b>지역 자료</b></td><td>${E(s)}</td><td>공개 자료</td></tr>`).join("")}
    </tbody></table>` +
    H("싣지 않은 것") + `<div class="two"><div>${ul(["제3자 기업정보 서비스의 신용·재무 자료", "채용 계획, 채용 인원, 근무지", "보도로만 확인한 사업장"])}</div><div>${ul(["내 학번과 연락처", "임금과 연봉 정보"])}</div></div>` +
    band("판본", "검사지, 판단 규칙, 결과 판본이 이 결과와 함께 저장되어 있어서 같은 응답을 넣으면 언제든 같은 결과가 다시 나옵니다."));
}

/** 결과가 만들어지는 길 그림의 색. 그림과 읽는 법이 같은 값을 쓴다 */
const PATH_C = [C.navy, C.blue, C.teal, C.amber, C.rose];

export function methodPage(x: Inputs, d: X): Page {
  const steps = [
    { head: "응답", body: "영역마다 관심과 경험, 판단마다 해 본 단계" },
    { head: "근거", body: "체크리스트에서 직접 고른 항목과 결과물" },
    { head: "단계", body: "응답과 근거가 함께 있을 때만 올림" },
    { head: "영역 나누기", body: "꼭 필요한 판단과 결과물을 보고 강점 영역 같은 이름을 붙임" },
    { head: "할 일", body: "비어 있는 판단에서 고름" },
  ];
  return A("방법과 한계",
    T("이 검사가 하는 일과 하지 않는 일") +
    `<div class="two">
      ${card(`${H("하는 일")}${ul([`${d.counts.domains}개 ${E(x.domainWord)}마다 관심과 경험, 배울 뜻을 묻고, 고른 영역은 문제를 정하는 일부터 결과를 다음 결정에 쓰이게 하는 일까지 한 단계씩 더 깊게 묻습니다.`, `‘${E(STEP_WORD[3].tag)}’ 단계는 응답만으로 주지 않고, 체크리스트에서 고른 근거가 함께 있을 때만 줍니다.`, "할 일은 응답에서 비어 있다고 나온 판단에서만 만듭니다."])}`)}
      ${card(`${H("하지 않는 일")}${ul(["직무 적합도와 연봉, 합격 가능성은 계산하지 않습니다.", "다른 사람과 비교한 순위는 내지 않습니다. 비교할 기준 집단이 아직 없기 때문입니다.", "성격 유형이나 적성을 진단하지 않습니다.", "CareerMatri는 직업정보제공사업 신고 사업자로, 취업 알선은 하지 않고 회사를 골라 보내지도 않습니다."])}`)}
    </div>` +
    H("결과가 만들어지는 길") + chain(steps.map((s, i) => ({ ...s, color: PATH_C[i] })), { width: 700, height: 118 }) +
    howto([["상자 머리", "걸음 이름"], ["상자 안 글", "그 걸음에서 하는 일"], ["화살표", "앞 걸음의 결과를 받아 다음 걸음으로 넘어가는 차례"]],
      "왼쪽 내 응답에서 시작해 오른쪽 할 일까지, 이 책의 결과가 만들어지는 차례예요. 색은 걸음을 구분하려고 칠했고 따로 뜻은 없어요.") +
    H("검증 상태") + `<p>문항 설계와 판정 규칙의 내부 점검은 마쳤고, 지금은 전공자 검토와 실제 학생을 대상으로 한 시범 운영을 하고 있습니다. 시범 운영 결과가 나오면 판본 정보와 함께 공개할 예정이며, 그 전까지는 이 검사를 ‘검증된 검사’로 소개하지 않습니다.</p>`);
}

export function wordsPage(x: Inputs, d: X): Page {
  /* 이 책에서 처음 보는 말만 싣는다. 영역과 단계의 이름은 공용 이름(ZONE_WORD · STEP_WORD)을 읽는다 */
  const zones = Object.keys(ZONE_WORD) as (keyof typeof ZONE_WORD)[];
  const ws: [string, string][] = [
    [E(x.domainWord), E(`${x.major} 일을 ${d.counts.domains}가지로 나눈 것: ${x.m.domains.map((z) => d.name(z.code)).join(", ")}`)],
    ["판단", E(`일하면서 되풀이해 내리는 결정이에요. 이 검사는 ${j(AXES.map((a) => d.axisName(a)).join(", "), "을를")} 봐요.`)],
    ["판단의 단계", E(`한 판단을 얼마나 깊이 해 봤는지예요. ${([0, 1, 2, 3] as const).map((k) => STEP_WORD[k].tag).join(" → ")} 차례로, 오른쪽으로 갈수록 내가 정한 몫이 커요.`)],
    /* 영역 이름표는 줄을 넘겨 쓴다. 한 줄로 두면 긴 이름이 풀이 칸까지 넘어간다 */
    ...zones.map((z) => [`<span class="ztag" style="--z:${ZC[z]};white-space:normal">${E(ZONE_WORD[z].tag)}</span>`, E(`${ZONE_WORD[z].said}.`)] as [string, string]),
    ["비어 있는 판단", "아직 직접 해 본 장면이 나오지 않아서 먼저 채우면 좋은 판단"],
    ["체크리스트 항목", "검사 중에 해 봤다고 고른 구체적인 일과 결과물. 단계를 올리는 근거로 써요."],
    ["결과물", "판단을 다른 사람이 읽고 쓸 수 있게 남긴 표나 문서"],
    ["30일 · 60일 · 90일", "07장 할 일을 끝낼 때. 검사를 본 날부터 센 날수이고, 늦어져도 결과가 바뀌지는 않아요."],
    ["초안", "내 응답과 직무 안내로 미리 채워 둔 글. 내 상황에 맞게 고치거나 지워도 돼요."],
    ["밑줄 · 점선", "06장 초안에서 밑줄은 내가 고르거나 답한 말을 그대로 옮긴 곳, 점선은 응답에 없어 비워 둔 곳이에요."],
    ["경험 기록", "내가 플랫폼에 직접 적어 둔 활동. 검사 응답과 따로 받아요."],
    ["직무 안내", "직무가 보통 하는 일을 적은 설명. 나를 판정한 내용은 들어 있지 않아요."],
    ["OpenDART · 사업보고서", "금융감독원 전자공시시스템의 공개 자료와, 상장사가 해마다 내는 보고서. ‘사업의 내용’에 사업부문과 매출 구조가 적혀 있어요."],
    ["매출액 · 영업이익", "매출액은 판 금액의 합, 영업이익은 본업에서 남긴 돈. 공시 숫자는 억 원 단위로 반올림했어요."],
    ["다시 검사", "같은 검사를 다시 보아 지난 결과와 영역별로 나란히 놓고 보는 일. 지난 결과는 그대로 남아요."],
  ];
  return A("용어 풀이", T("이 책에서 처음 보는 말을 풀었습니다") + `<dl class="dl">${ws.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>`);
}

export function closePage(x: Inputs, d: X): Page {
  const nows = x.m.actions.filter((a) => a.horizon === "NOW");
  const acts = (nows.length ? nows : x.m.actions).slice(0, 3);
  /* 다시 펼쳤을 때 먼저 볼 세 줄. 재료가 없는 상자는 싣지 않는다 */
  const st = d.strengths.map((z) => d.name(z.code));
  const gp = d.gaps.slice(0, 3).map((g) => `${d.name(g.domain)}${g.axis ? ` · ${d.axisName(g.axis)}` : ""}`);
  const goal = [d.goalRole ? `${d.goalRole.name_ko} 직무` : "", d.goalInd ? `${d.goalInd.name_ko} 산업` : ""].filter(Boolean);
  const recap = [
    st.length ? card(`<p class="k">${E(ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag)}</p><h4>${E(st[0])}</h4>${st.length > 1 ? `<p class="sm mut">함께 볼 영역: ${E(st.slice(1).join(", "))}</p>` : ""}<p class="sm">지원서와 면접에서 먼저 꺼낼 경험이 이 영역에 있어요.</p>`) : "",
    gp.length ? card(`<p class="k">먼저 손댈 자리</p><h4>${E(gp[0])}</h4>${gp.length > 1 ? `<p class="sm mut">그다음: ${E(gp.slice(1).join(", "))}</p>` : ""}<p class="sm">07장 맨 앞의 할 일이 이 자리를 채우는 일이에요.</p>`) : "",
    goal.length ? card(`<p class="k">목표로 적은 것</p><h4>${E(goal.join(" · "))}</h4><p class="sm">12개월 뒤 다시 볼 때도 이 목표를 기준으로 달라진 점을 봐요.</p>`) : "",
  ].filter(Boolean);
  return { keep: true, ...A("맺으며",
    T(acts.length ? "다음 달까지 이것만 해 보세요" : "다음 달에 해 볼 일",
      "가장 먼저 끝낼 할 일과 그때 남길 결과물을 다시 모았어요. 하나 끝낼 때마다 내 CareerMatri 경험 기록에 올려 두면, 지금 상태가 어떻게 달라졌는지 바로 볼 수 있습니다.") +
    (acts.length ? `<table class="tb tb-s"><thead><tr><th style="width:11%">때</th><th>할 일</th><th style="width:30%">남길 것</th></tr></thead><tbody>${acts.map((a) => `<tr><td>${E(HORIZON_DAYS[a.horizon])}</td><td><b>${E(actionHead(a, actDn(a, d)))}</b></td><td>${E(actionOutput(a, actDef(a, d)))}</td></tr>`).join("")}</tbody></table>` : "") +
    (recap.length ? H("이 책에서 가져갈 것") + `<div class="${recap.length === 3 ? "g3" : recap.length === 2 ? "g2" : ""}">${recap.join("")}</div>` : "") +
    `<div class="close-box"><p class="k">${E(x.issuer === "CareerMatri" ? "CareerMatri" : `${x.issuer} × CareerMatri`)}</p><h3>결과는 ${E(x.person)} 님이 먼저 받습니다</h3><p>기관에는 내가 동의한 경우에만 개인 결과가 가고, 그 밖에는 다섯 명 이상이 모인 집계만 가요.</p></div>` +
    `<div class="two">${note("한 달 뒤에 다시 볼 것", ul(["30일 할 일로 남긴 결과물", "적어 둔 주간 점검표", "새로 적은 경험 기록 한 건"]))}${note("플랫폼에서 이어 하기", ul(["경험 기록에 결과물 올리기", "내 CareerMatri에서 바뀐 판단 확인하기", "12개월 뒤 같은 검사로 다시 보기"]), true)}</div>`) };
}

export const ch7 = { prioPages, ganttPage, longPage, researchPage, weeklyPage };
export const appendix = { tracePages, sourcesPage, methodPage, wordsPage, closePage };
