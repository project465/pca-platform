/**
 * **PDF GOLD MASTER 2차 · 개인별 역량 프로파일.** 굳은 결과 모델과 그 학생이
 * 적어 둔 경험 기록을 읽어 리포트의 분석 장(章)이 쓸 값을 만든다.
 *
 * - **새 점수를 만들지 않는다.** 방사형 그래프의 반지름은 축 상태의 네 단계
 *   (해 본 적 없음 0 · 주어진 조건으로 해 봄 1 · 직접 해 봄 2 · 직접 결정 3)이고,
 *   묻지 않은 축은 `null` 이다. **0 으로 적지 않는다.**
 * - **차례는 까닭으로 세운다.** 개발 우선순위와 진로 방향은 목표 직무의 필수
 *   판단 · 목표 산업이 보는 판단 · 영역의 필수 판단 · 결과 모델의 빈자리 차례를
 *   보고 줄을 세우고, 그 까닭을 글자로 같이 들고 다닌다. 수는 종이에 적지 않는다.
 * - **채점 모듈을 부르지 않는다.** 읽는 것은 결과 모델 · 영역 사전 · 팩 · 경험 기록뿐이다.
 */
import type { Axis, AxisState, Band } from "../scoring/types";
import type { Action, Gap, ResultDomain, ResultModel } from "../result/model";
import { coreOf } from "../result/model";
import { withJosa } from "../result/josa";
import { actionKo } from "../result/text.ko";
import { content, domainName } from "../runtime/session";
import { packs } from "../core-registry";
import { axisWord } from "./lexicon";
import type { Experience } from "../platform";

export const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
export type Level = 0 | 1 | 2 | 3;
const LV: Record<AxisState, Level> = { NOT_OBSERVED: 0, PARTICIPATED: 1, CONFIRMED: 2, OWNED: 3 };
export const LEVEL_WORD: Record<Level, string> = {
  0: "응답에서 확인되지 않음", 1: "주어진 조건으로 해 봄", 2: "직접 해 봄", 3: "직접 기준을 정함",
};

export type RolePack = {
  code: string; name_ko: string; owns?: string; decides?: string[];
  required_axes?: Axis[]; application_material?: string[];
  differs_from?: { vs: string; line: string }[];
  core_ref?: { td: string[]; rf?: string[] };
  items?: { id: string; axis: Axis; domain: string; ask: string }[];
};
export type IndustryPack = {
  code: string; name_ko: string; demands: string[]; scene?: string;
  judgement_dimensions: { name: string; axis: Axis; domain: string; why: string }[];
};
type DomainDef = {
  code: string; name: string; required_axes: Axis[];
  workflow: { step: number; name: string; detail: string }[];
  artifacts: string[]; verify_targets: string[];
  axes: Record<Axis, { l2: string; l3: string }>;
  org_outcomes?: Record<string, string>;
};

export function asked(d: ResultDomain): boolean { return d.opened.deep || d.opened.probe; }
export function axisLevel(d: ResultDomain, ax: Axis): Level | null {
  if (!asked(d)) return null;
  const a = d.axes.find((x) => x.axis === ax);
  if (!a || a.missing === "NOT_ROUTED") return null;
  return LV[a.state];
}
function domainDef(core: string, td: string): DomainDef | undefined {
  return (content(core).domains.domains as unknown as DomainDef[]).find((d) => d.code === td);
}
export function flow(core: string, td: string, step: number): string {
  return domainDef(core, td)?.workflow.find((w) => w.step === step)?.detail ?? "";
}
export function rolePacks(core: string): RolePack[] { return packs<{ packs: RolePack[] }>(core, "role").packs; }
export function industryPacks(core: string): IndustryPack[] { return packs<{ packs: IndustryPack[] }>(core, "industry").packs; }

/* ── 방사형 그래프 ─────────────────────────────────────────────── */

export type RadarSeries = { code: string; name: string; deep: boolean; levels: (Level | null)[] };
export type Radar = {
  axes: { axis: Axis; label: string }[];
  series: RadarSeries[];
  /** 축마다 가장 높은 단계와 그 영역 (묻지 않았으면 null) */
  best: { axis: Axis; level: Level | null; where: string[] }[];
};

export function radar(m: ResultModel): Radar {
  const core = coreOf(m);
  const doms = m.domains.filter(asked).sort((a, b) => Number(b.opened.deep) - Number(a.opened.deep)).slice(0, 4);
  const series = doms.map((d) => ({
    code: d.code, name: domainName(core, d.code), deep: d.opened.deep,
    levels: AXES.map((ax) => axisLevel(d, ax)),
  }));
  const best = AXES.map((ax, i) => {
    const vals = series.map((s) => s.levels[i]).filter((v): v is Level => v !== null);
    if (!vals.length) return { axis: ax, level: null, where: [] };
    const top = Math.max(...vals) as Level;
    return { axis: ax, level: top, where: series.filter((s) => s.levels[i] === top).map((s) => s.name) };
  });
  return { axes: AXES.map((a) => ({ axis: a, label: axisWord(core, a) })), series, best };
}

/* ── 관심 × 근거 지도 (12 영역) ──────────────────────────────────── */

export type MapCell = { code: string; name: string; interest: Band | null; depth: Level | null; zone: string };
export function interestEvidenceMap(m: ResultModel): MapCell[] {
  const core = coreOf(m);
  return m.domains.map((d) => {
    let depth: Level | null = null;
    if (asked(d)) depth = d.owned.length ? 3 : d.confirmed.length ? 2 : d.axes.some((a) => a.state === "PARTICIPATED") ? 1 : 0;
    return { code: d.code, name: domainName(core, d.code), interest: d.interest, depth, zone: d.zone };
  });
}

/* ── 프로파일 해석 ─────────────────────────────────────────────── */

export type Reading = {
  strong: { axis: Axis; label: string; where: string[]; scene: string }[];
  weak: { axis: Axis; label: string; where: string[]; scene: string }[];
  unasked: string[];
  balance: string;
  evidence: string;
  caution: string | null;
  paragraphs: string[];
  /** 관심 × 근거 지도 아래에 붙는 해석 */
  mapLines: string[];
};

export function reading(m: ResultModel, exps: Experience[]): Reading {
  const core = coreOf(m);
  const r = radar(m);
  const nm = (td: string) => domainName(core, td);
  const codeOf = (name: string) => r.series.find((s) => s.name === name)?.code ?? "";
  const l2 = (td: string, ax: Axis) => domainDef(core, td)?.axes?.[ax]?.l2 ?? "";
  const strong = r.best.filter((b) => b.level === 3)
    .map((b) => ({ axis: b.axis, label: axisWord(core, b.axis), where: b.where, scene: l2(codeOf(b.where[0]), b.axis) }));
  const weak = r.best.filter((b) => b.level !== null && b.level <= 1)
    .map((b) => {
      const where = r.series.filter((s) => s.levels[AXES.indexOf(b.axis)] !== null).map((s) => s.name);
      return { axis: b.axis, label: axisWord(core, b.axis), where, scene: l2(codeOf(where[0] ?? ""), b.axis) };
    });
  const unasked = r.best.filter((b) => b.level === null).map((b) => axisWord(core, b.axis));

  const cells = r.series.flatMap((s) => s.levels.filter((v): v is Level => v !== null));
  const hi = cells.filter((v) => v >= 2).length;
  const z1 = m.domains.filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED").map((d) => nm(d.code));
  const z2 = m.domains.filter((d) => d.zone === "Z2_EVIDENCE_INCOMPLETE").map((d) => nm(d.code));
  const z3 = m.domains.filter((d) => d.zone === "Z3_EVIDENCE_LOW_INTEREST").map((d) => nm(d.code));
  const z4 = m.domains.filter((d) => d.zone === "Z4_INSUFFICIENT_EVIDENCE").map((d) => nm(d.code));

  let balance: string;
  if (!cells.length) balance = "이번 응답에서는 판단 단계를 물은 영역이 없어 프로파일의 모양을 말할 수 없습니다.";
  else if (hi === 0) balance = `물어본 판단 ${cells.length}칸 가운데 ‘직접 해 봄’ 이상으로 답한 칸이 없습니다. 지금은 모양보다 첫 경험 하나를 끝까지 가 보는 것이 먼저입니다.`;
  else if (z1.length >= 2) balance = `물어본 판단 ${cells.length}칸 가운데 ${hi}칸이 ‘직접 해 봄’ 이상입니다. 근거가 ${z1.join(" · ")} 두 갈래 이상에 퍼져 있어, 한 경험에 기대는 프로파일은 아닙니다.`;
  else if (z1.length === 1) balance = `물어본 판단 ${cells.length}칸 가운데 ${hi}칸이 ‘직접 해 봄’ 이상이고, 근거가 ${z1[0]} 한 곳에 모여 있습니다. 지원서에서 그 경험 하나가 많은 것을 맡게 됩니다.`;
  else balance = `물어본 판단 ${cells.length}칸 가운데 ${hi}칸이 ‘직접 해 봄’ 이상이지만, 결과물과 비교 기록까지 갖춘 영역은 아직 없습니다.`;

  const picks = m.domains.reduce((n, d) => n + d.did.length, 0);
  const arts = m.domains.reduce((n, d) => n + d.artifacts.length, 0);
  const vers = m.domains.reduce((n, d) => n + d.verifications.length, 0);
  const evidence = picks === 0 && exps.length === 0
    ? "체크리스트에서 고른 근거와 적어 둔 경험 기록이 모두 없습니다. 아래 판단은 응답 문항만으로 읽은 것입니다."
    : `체크리스트에서 고른 근거 ${picks}개(그중 결과물 ${arts}개 · 비교 대상 ${vers}개)와 적어 둔 경험 기록 ${exps.length}건을 함께 읽었습니다.${arts === 0 ? " 남긴 결과물을 하나도 고르지 않아, 지원서에서 ‘무엇을 만들었는가’에 답할 내용이 비어 있습니다." : ""}`;

  const q = m.response_quality;
  const caution = q.reasons.includes("CHECKLIST_MISMATCH_HIGH")
    ? "‘내가 정했고 그 결과가 쓰였다’고 답한 판단이 많은데, 그 판단을 받쳐 줄 체크리스트 근거를 고르지 않았습니다. 그래서 그 판단들은 ‘직접 해 봄’까지만 적었습니다. 면접에서 같은 질문을 받으면 장면 하나를 들어 설명할 수 있는지 먼저 확인해 보세요."
    : q.reasons.includes("CHECKLIST_MISMATCH_LOW")
      ? "‘해 본 적 없다’고 답한 판단에 체크리스트 근거를 고른 경우가 있습니다. 응답 쪽을 따랐습니다."
      : q.reasons.includes("LOW_VARIANCE_GRID")
        ? "열두 영역에 거의 같은 값으로 답하셔서 관심만으로는 영역 사이 차이를 읽기 어렵습니다."
        : null;

  const P: string[] = [];
  if (strong.length) {
    const s = strong.slice(0, 2);
    P.push(`가장 높게 나온 판단은 ${s.map((x) => `‘${x.label}’(${x.where.join(" · ")})`).join("과 ")}입니다. 이 단계는 ‘${s[0].scene}’ 같은 일을 직접 기준을 정해 했다고 답하고, 같은 장면을 체크리스트에서도 둘 이상 고른 경우에만 나옵니다.`);
  } else if (hi) {
    P.push("‘직접 기준을 정함’ 단계까지 올라간 판단은 아직 없습니다. 직접 해 본 판단은 있으므로, 다음 과제에서는 그 가운데 하나를 골라 기준을 내가 정하고 그 근거를 남기는 쪽이 한 단계를 올리는 가장 짧은 길입니다.");
  }
  if (weak.length) {
    const w = weak.slice(0, 2);
    P.push(`낮게 나온 판단은 ${w.map((x) => `‘${x.label}’`).join("과 ")}입니다. 물어본 영역(${[...new Set(w.flatMap((x) => x.where))].join(" · ")})에서 ‘${w[0].scene}’ 같은 일을 했다는 응답이 아직 없다는 뜻이고, 능력이 없다는 뜻은 아닙니다.`);
  }
  if (z3.length) P.push(`${withJosa(z3.join(" · "), "은는")} 해 본 근거가 있는데 관심이 낮게 나왔습니다. 진로를 그쪽으로 정할 필요는 없지만, 이미 해 본 일이므로 지원서에서 협업 경험이나 기본기로 쓸 수 있습니다.`);
  if (z4.length) P.push(`${withJosa(z4.join(" · "), "은는")} 관심은 높은데 근거가 아직 적습니다. 지금 이 영역은 ‘잘하는 일’이 아니라 ‘해 보고 싶은 일’로 읽는 것이 정확합니다.`);
  if (z2.length && !z1.length) P.push(`${z2.join(" · ")}에서 해 본 일은 응답으로 확인되지만, 결과물이나 비교 기록이 받쳐 주지 않아 ‘근거가 섰다’고 적지 않았습니다.`);
  const cells2 = interestEvidenceMap(m);
  const names = (f: (c: MapCell) => boolean) => cells2.filter(f).map((c) => c.name);
  const use = names((c) => c.interest === "HIGH" && (c.depth ?? 0) >= 2);
  const base = names((c) => c.interest !== "HIGH" && (c.depth ?? 0) >= 2);
  const tryIt = names((c) => c.interest === "HIGH" && c.depth !== null && c.depth <= 1);
  const later = names((c) => c.interest === "HIGH" && c.depth === null);
  const recTd = new Set(exps.flatMap((e) => e.td_codes));
  const laterRec = cells2.filter((c) => c.interest === "HIGH" && c.depth === null && recTd.has(c.code)).map((c) => c.name);
  const ML: string[] = [];
  if (use.length) ML.push(`꺼내 쓸 강점 칸에 선 영역은 ${use.join(" · ")}입니다. 관심과 근거가 같은 쪽을 가리키므로 지원서의 중심 경험으로 둘 수 있습니다.`);
  if (base.length) ML.push(`${withJosa(base.join(" · "), "은는")} 해 본 근거는 있지만 관심이 높지 않았습니다. 주력 경험으로 내세우기보다, 팀 과제에서 맡은 기본기로 짧게 쓰는 편이 자연스럽습니다.`);
  if (tryIt.length) ML.push(`${withJosa(tryIt.join(" · "), "은는")} 관심이 높은데 근거가 아직 적어 ‘먼저 겪어 볼 영역’에 섰습니다. 짧게 끝나는 과제 하나가 이 칸을 위로 올립니다.`);
  if (later.length) ML.push(`${later.join(" · ")}에도 관심을 높게 답했지만 이번 검사에서는 그 영역의 판단을 깊게 묻지 않았습니다.${laterRec.length ? ` 그중 ${laterRec.join(" · ")}은 경험 기록이 있어 다음 검사에서 확인할 첫 후보입니다.` : " 지도에서 아래 줄에 놓인 것은 묻지 않았기 때문이고, 근거가 없다는 뜻은 아닙니다."}`);
  return { strong, weak, unasked, balance, evidence, caution, paragraphs: P, mapLines: ML };
}

/* ── 검사 × 경험 기록 교차 ─────────────────────────────────────── */

export type CrossKind = "BOTH" | "TEST_ONLY" | "RECORD_ONLY" | "CONFLICT" | "CHECK";
export const CROSS_KO: Record<CrossKind, string> = {
  BOTH: "검사와 기록이 함께 가리킴",
  TEST_ONLY: "검사 응답은 강하나 기록이 없음",
  RECORD_ONLY: "기록은 있으나 검사에서 확인되지 않음",
  CONFLICT: "검사 응답과 기록이 어긋남",
  CHECK: "근거 확인이 필요함",
};
export type DomainCross = { code: string; name: string; kind: CrossKind; note: string; next: string };
export type ExpRead = {
  title: string; kind: string; period: string; domains: string[];
  did: string; capable: string[]; unknown: string[]; jobs: string[];
  needs: string[]; use: string;
};

const EXP_KIND: Record<string, string> = {
  course: "수업", assignment: "과제", capstone: "캡스톤", research: "연구", paper: "논문",
  internship: "현장실습·인턴", project: "프로젝트·활동", work: "근무", credential: "자격",
};

export function cross(m: ResultModel, exps: Experience[]): { domains: DomainCross[]; records: ExpRead[] } {
  const core = coreOf(m);
  const nm = (td: string) => domainName(core, td);
  const roles = rolePacks(core);
  const recorded = new Set(exps.flatMap((e) => e.td_codes));
  const recOf = (td: string) => exps.find((e) => e.td_codes.includes(td));
  const out: DomainCross[] = [];
  const mismatch = m.response_quality.reasons.includes("CHECKLIST_MISMATCH_HIGH");
  for (const d of m.domains) {
    const has = recorded.has(d.code);
    const strongTest = d.confirmed.length > 0;
    if (has && strongTest) {
      const e = recOf(d.code)!;
      const miss = [!e.artifacts.length && "남은 결과물", !e.verifications.length && "비교 대상", !e.decisions.length && "직접 정한 것"]
        .filter((x): x is string => !!x);
      const fromTest = d.verifications[0] ?? d.artifacts[0];
      out.push({ code: d.code, name: nm(d.code), kind: "BOTH",
        note: `응답으로 ${d.confirmed.length}개 판단이 확인되고, 경험 기록 ‘${e.title}’도 이 영역을 가리킵니다.`,
        next: miss.length
          ? `그 기록에는 ${miss.join(" · ")}이 비어 있습니다.${fromTest ? ` 검사에서 고른 ‘${fromTest}’를 기록에도 옮겨 두면 서류와 면접에서 같은 이야기를 하게 됩니다.` : ""}`
          : "응답과 기록이 같은 판단을 말하고 있어, 이 영역은 지원서 문단으로 바로 옮길 수 있습니다." });
    } else if (has && !asked(d)) {
      out.push({ code: d.code, name: nm(d.code), kind: d.experience === "NONE" ? "CONFLICT" : "RECORD_ONLY",
        note: d.experience === "NONE"
          ? "영역 훑기에서 ‘해 본 적 없다’고 답했는데, 적어 둔 경험 기록에는 이 영역이 있습니다."
          : `이번 검사에서 이 영역의 판단은 깊게 묻지 않았고, 경험 기록 ‘${recOf(d.code)!.title}’에만 있습니다.`,
        next: d.experience === "NONE"
          ? "그 경험에서 실제로 무엇을 맡았는지 다시 떠올려 보세요. 참여만 했다면 기록의 ‘직접 정한 것’을 비우는 것이 정확합니다."
          : `${d.interest === "HIGH" ? "관심도 높게 답한 영역이라, " : ""}다음 검사에서 이 영역이 깊게 열리면 기록이 판단으로 확인됩니다. 그 전까지는 기록에 적은 ‘직접 정한 것’이 면접에서 말할 근거입니다.` });
    } else if (strongTest && mismatch && d.owned.length === 0 && d.did.length === 0) {
      out.push({ code: d.code, name: nm(d.code), kind: "CHECK",
        note: "판단은 ‘직접 해 봄’으로 확인됐지만, 그 판단을 받칠 체크리스트 근거를 하나도 고르지 않았습니다.",
        next: "어떤 과제에서 그 일을 했는지 한 줄씩 적어 보세요. 적을 장면이 없다면 응답을 한 단계 낮춰 읽는 것이 맞습니다." });
    } else if (strongTest && !has) {
      out.push({ code: d.code, name: nm(d.code), kind: "TEST_ONLY",
        note: `응답으로 ${d.confirmed.length}개 판단이 확인되지만, 적어 둔 경험 기록에는 이 영역이 없습니다.`,
        next: d.did[0]
          ? `‘${d.did[0]}’를 고른 그 과제를 경험 기록으로 남기면, 같은 판단을 면접에서 언제·어디서 한 일인지까지 말할 수 있습니다.`
          : "어느 과제에서 한 일인지 경험 기록으로 남기면, 같은 판단을 면접에서 장면으로 말할 수 있습니다." });
    }
  }
  const records: ExpRead[] = exps.map((e) => {
    const cap: string[] = [];
    if ((e.problems ?? []).length) cap.push(`${axisWord(core, "J1")} — ${(e.problems ?? [])[0]}`);
    if (e.decisions.length) cap.push(`${axisWord(core, "J3")} — ${e.decisions[0]}`);
    if (e.artifacts.length) cap.push(`${axisWord(core, "J5")} — ${e.artifacts.join(" · ")}`);
    if (e.verifications.length) cap.push(`${axisWord(core, "J6")} — ${e.verifications[0]}`);
    const covered = new Set<Axis>([
      ...((e.problems ?? []).length ? ["J1" as Axis] : []), ...(e.decisions.length ? ["J3" as Axis] : []),
      ...(e.artifacts.length ? ["J5" as Axis] : []), ...(e.verifications.length ? ["J6" as Axis] : []),
    ]);
    const req = [...new Set(e.td_codes.flatMap((td) => domainDef(core, td)?.required_axes ?? []))];
    const unknown = req.filter((a) => !covered.has(a)).map((a) => axisWord(core, a));
    const jobs = roles.filter((r) => (r.core_ref?.td ?? []).some((td) => e.td_codes.includes(td))).map((r) => r.name_ko).slice(0, 3);
    const needs: string[] = [];
    if (!e.artifacts.length) needs.push("남은 결과물(문서·표·발표 자료)이 무엇인지");
    if (!e.verifications.length) needs.push("결과를 무엇과 비교했는지(목표 · 지난 실적 · 다른 안)");
    if (!e.decisions.length) needs.push("그 안에서 내가 직접 정한 것 하나");
    needs.push("기간과 내가 맡은 범위, 결과 수치(직접 기입)");
    const period = [e.started_on?.slice(0, 7), e.ended_on?.slice(0, 7) ?? "진행 중"].filter(Boolean).join(" ~ ");
    const use = e.decisions.length && e.artifacts.length
      ? `지원서에서는 ‘${e.decisions[0]}’를 첫 문장에 두고, ${withJosa(e.artifacts[0], "을를")} 그 판단의 결과로 붙이면 한 문단이 됩니다.`
      : e.decisions.length
        ? `‘${e.decisions[0]}’는 면접 답변의 첫 장면이 될 수 있습니다. 남은 결과물을 함께 적어야 지원서 문단이 됩니다.`
        : "지금 기록만으로는 수업을 들었다는 사실까지 말할 수 있습니다. 그 수업에서 내가 정한 것 하나를 찾아 적으면 서류에서 쓸 수 있는 경험이 됩니다.";
    return {
      title: e.title, kind: EXP_KIND[e.kind] ?? e.kind, period,
      domains: e.td_codes.map(nm),
      did: e.title,
      capable: cap, unknown, jobs, needs, use,
    };
  });
  return { domains: out, records };
}

/* ── 강점 활용 전략 ───────────────────────────────────────────── */

export type Strength = {
  code: string; name: string; zone: string;
  shown: string[]; owned: string[]; artifacts: string[]; verifications: string[];
  jobs: string[]; industryLines: string[];
  howShow: string; prove: string[]; question: string;
};

export function strengths(m: ResultModel): Strength[] {
  const core = coreOf(m);
  const roles = rolePacks(core);
  const goalInd = industryPacks(core).find((p) => p.code === (m.targets.goal.industry ?? m.industry_context?.code));
  const order = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"];
  const doms = m.domains.filter((d) => order.includes(d.zone) && d.confirmed.length)
    .sort((a, b) => order.indexOf(a.zone) - order.indexOf(b.zone) || b.owned.length - a.owned.length).slice(0, 3);
  return doms.map((d) => {
    const nm = domainName(core, d.code);
    const shown = d.decided.filter((t) => !d.artifacts.includes(t) && !d.verifications.includes(t)).slice(0, 2);
    const gapHere = m.gaps.filter((g) => g.domain === d.code);
    const prove = gapHere.slice(0, 2).map((g) => g.axis
      ? `‘${axisWord(core, g.axis)}’ — ${domainDef(core, d.code)?.axes[g.axis]?.l2 ?? ""}`
      : `결과물 근거 — ${domainDef(core, d.code)?.artifacts[0] ?? ""}`);
    const art = d.artifacts[0];
    const ver = d.verifications[0];
    const howShow = art
      ? `${withJosa(art, "을를")} 결과로 보여 주고${ver ? `, ${withJosa(ver, "과와")} 비교한 기록을 근거로 붙입니다` : ", 무엇과 비교했는지는 아직 비어 있어 면접 전에 채워 두어야 합니다"}.`
      : `이 영역은 남긴 결과물을 고르지 않았습니다. ${domainDef(core, d.code)?.artifacts[0] ?? "결과물"} 같은 형태로 한 장을 남기면 서류에서 보여 줄 것이 생깁니다.`;
    return {
      code: d.code, name: nm, zone: d.zone,
      shown: shown.length ? shown : d.did.slice(0, 2),
      owned: d.owned.map((a) => axisWord(core, a)),
      artifacts: d.artifacts.slice(0, 3), verifications: d.verifications.slice(0, 2),
      jobs: roles.filter((r) => (r.core_ref?.td ?? []).includes(d.code)).map((r) => r.name_ko),
      industryLines: goalInd?.judgement_dimensions.filter((j) => j.domain === d.code).map((j) => j.name) ?? [],
      howShow, prove,
      question: shown[0]
        ? `“${shown[0].replace(/다$/, "")}다고 했는데, 그때 기준은 무엇이었고 다른 안은 왜 버렸나요?”`
        : `“${nm}에서 맡았던 일 가운데 결과가 기대와 달랐던 적이 있나요?”`,
    };
  });
}

/* ── 역량 개발 우선순위 ───────────────────────────────────────── */

const LEARN: Record<string, string> = {
  DEEPEN_OWNERSHIP: "진행 중인 과제에서 기준을 내가 정하고 근거를 남기는 실습",
  BUILD_OUTPUT: "결과물 한 장을 직접 만들어 보는 작업",
  ADD_VERIFICATION: "끝난 과제를 목표·지난 실적·다른 안과 비교해 보는 검토",
  TRY_SHORT_EXPERIENCE: "짧게 끝나는 실전 경험(공모전·학회 과제·현장실습)",
  STUDY_NEXT: "수업·온라인 강의로 기본기 채우기",
  FILL_AXIS: "다음 과제에서 그 판단 한 가지를 맡아 보는 연습",
  RECHECK_DIRECTION: "관심과 경험이 어긋나는 영역을 다시 살펴보기",
  EXPLORE_BROADLY: "영역 몇 곳을 짧게 겪어 보기",
};
export type Priority = {
  order: number; domain: string; what: string; why: string[]; jobs: string[];
  method: string; learn: string; check: string; when: string;
  /** 이 할 일이 남길 결과물 (그 할 일의 재료에서) */
  keep: string;
};
export function priorities(m: ResultModel): Priority[] {
  const core = coreOf(m);
  const roles = rolePacks(core);
  const goalRole = roles.find((r) => r.code === m.targets.goal.role) ?? roles.find((r) => r.code === m.role_context?.code);
  const goalInd = industryPacks(core).find((p) => p.code === (m.targets.goal.industry ?? m.industry_context?.code));
  const actById = new Map(m.actions.map((a) => [a.id, a]));
  const H: Record<string, string> = { NOW: "1~30일", NEXT: "31~90일", LATER: "4~6개월" };
  type Row = Priority & { w: number };
  const rows: Row[] = m.gaps.map((g: Gap) => {
    const why: string[] = [];
    let w = 0;
    if (goalRole && g.axis && goalRole.required_axes?.includes(g.axis) && goalRole.core_ref?.td.includes(g.domain)) {
      w += 3; why.push(`목표 직무 ${goalRole.name_ko}의 필수 판단입니다`);
    }
    const dim = goalInd?.judgement_dimensions.find((j) => j.domain === g.domain && j.axis === g.axis);
    if (dim) { w += 2; why.push(`목표 산업 ${goalInd!.name_ko}에서 ‘${dim.name}’를 봅니다`); }
    if (g.kind === "REQUIRED_AXIS") { w += 1; why.push("이 영역에서 꼭 있어야 하는 판단입니다"); }
    if (g.kind === "PARTIAL_EVIDENCE") why.push("해 본 것은 확인됐고 어디까지 직접 정했는지가 아직입니다");
    if (g.kind === "OUTPUT" || g.kind === "OUTPUT_EVIDENCE") why.push("남은 결과물이 확인되지 않아 경험을 서류로 보여 줄 수 없습니다");
    if (g.kind === "VERIFICATION") why.push("결과를 무엇과 비교했는지가 없어 성과를 말하기 어렵습니다");
    const a: Action | undefined = g.action_id ? actById.get(g.action_id) : undefined;
    const ver = a?.material.verify_targets[0] ?? domainDef(core, g.domain)?.verify_targets[0];
    return {
      order: 0, w: w * 100 - g.rank,
      domain: domainName(core, g.domain),
      what: g.axis ? axisWord(core, g.axis) : "결과물 근거",
      why: why.length ? why : ["결과 모델이 먼저 채울 것으로 고른 판단입니다"],
      jobs: roles.filter((r) => (r.core_ref?.td ?? []).includes(g.domain) && (!g.axis || r.required_axes?.includes(g.axis))).map((r) => r.name_ko),
      method: a ? actionKo(a, domainName(core, g.domain), m.stage).do : (domainDef(core, g.domain)?.axes[g.axis!]?.l2 ?? ""),
      learn: a ? (LEARN[a.code] ?? "") : "",
      check: ver ? `끝난 뒤 ${withJosa(ver, "과와")} 비교한 기록이 남았는지` : "검토한 사람의 의견이 남았는지",
      when: a ? H[a.horizon] : "",
      keep: a?.material.artifacts[0] ?? a?.material.workflow?.output ?? domainDef(core, g.domain)?.artifacts[0] ?? "정리한 문서",
    };
  });
  return rows.sort((a, b) => b.w - a.w).slice(0, 6).map((r, i) => {
    const { w: _w, ...rest } = r; void _w; return { ...rest, order: i + 1 };
  });
}

/* ── 진로 탐색 방향 ───────────────────────────────────────────── */

export type Readiness = "근거 있음" | "일부 있음" | "아직 적음";
export type Direction = {
  code: string; name: string; goal: boolean; owns: string; decides: string[];
  environment: string; basis: string[]; need: string[]; readiness: Readiness;
  prereq: string; tds: string[]; asks: string[]; differs: string[]; material: string[];
};

export function directions(m: ResultModel): Direction[] {
  const core = coreOf(m);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const roles = rolePacks(core);
  const goal = m.targets.goal.role;
  const interestRoles = new Set([goal, ...m.targets.roles]);
  const scored = roles.map((r) => {
    const tds = r.core_ref?.td ?? [];
    let w = 0;
    for (const td of tds) {
      const d = byCode.get(td);
      if (!d) continue;
      if (d.zone === "Z1_EVIDENCE_ESTABLISHED") w += 3;
      else if (d.zone === "Z2_EVIDENCE_INCOMPLETE" || d.zone === "Z3_EVIDENCE_LOW_INTEREST") w += 2;
      if (d.interest === "HIGH") w += 1;
    }
    if (r.code === goal) w += 4; else if (interestRoles.has(r.code)) w += 2;
    return { r, w };
  }).sort((a, b) => b.w - a.w);
  const pick = scored.slice(0, 3).map((x) => x.r);
  const goalPack = roles.find((r) => r.code === goal);
  if (goalPack && !pick.includes(goalPack)) pick[2] = goalPack;
  const org = m.targets.goal.org ?? "OC1";
  return pick.map((r) => {
    const tds = r.core_ref?.td ?? [];
    const req = r.required_axes ?? [];
    const best = (ax: Axis) => Math.max(-1, ...tds.map((td) => {
      const d = byCode.get(td); return d ? (axisLevel(d, ax) ?? -1) : -1;
    }));
    const basis = tds.flatMap((td) => {
      const d = byCode.get(td);
      if (!d || !d.confirmed.length) return [];
      return [`${domainName(core, td)} — ${d.owned.length ? `직접 정한 판단 ${d.owned.length}개` : `직접 해 본 판단 ${d.confirmed.length}개`}`];
    });
    const need = req.filter((ax) => best(ax) < 2).map((ax) => {
      const lv = best(ax);
      return `${axisWord(core, ax)}${lv === -1 ? " (이번 검사에서 묻지 않음)" : ` (지금 ${LEVEL_WORD[lv as Level]})`}`;
    });
    const ok = req.filter((ax) => best(ax) >= 2).length;
    /* 필수 판단이 다 서도 그 직무가 함께 보는 영역·판단이 비어 있을 수 있다 */
    if (!need.length) {
      for (const td of tds) { const d = byCode.get(td); if (!d || !asked(d)) need.push(`${domainName(core, td)} 쪽 판단 (이번 검사에서 깊게 묻지 않음)`); }
      const askAxes = [...new Set((r.items ?? []).map((x) => x.axis))].filter((ax) => !req.includes(ax) && best(ax) >= 0 && best(ax) < 2);
      for (const ax of askAxes.slice(0, 2)) need.push(`${axisWord(core, ax)} (지금 ${LEVEL_WORD[best(ax) as Level]})`);
    }
    const reqWords = req.map((a) => `‘${axisWord(core, a)}’`).join(" · ");
    const readiness: Readiness = ok === req.length && req.length ? "근거 있음" : ok > 0 || basis.length ? "일부 있음" : "아직 적음";
    const env = domainDef(core, tds[0] ?? "")?.org_outcomes?.[org];
    return {
      code: r.code, name: r.name_ko, goal: r.code === goal, owns: r.owns ?? "", decides: r.decides ?? [],
      environment: env ? `고르신 조직 유형에서는 ‘${env}’이 이 일의 결과물입니다.` : "",
      basis, need, readiness,
      prereq: readiness === "근거 있음"
        ? (need.length
          ? `필수 판단 ${reqWords}이 확인됐고, 이 직무가 함께 보는 ${need[0].split(" (")[0]}이 다음 과제입니다.`
          : `필수 판단 ${reqWords}이 확인됐습니다. 이 직무 쪽으로는 경험을 서류 언어로 옮기는 일만 남았습니다.`)
        : readiness === "일부 있음"
          ? `필수 판단 ${req.length}개 가운데 ${ok}개가 확인됐습니다. 나머지는 다음 과제에서 맡아 볼 수 있는 크기입니다.`
          : "이 직무와 이어지는 영역에서 아직 확인된 판단이 없습니다. 짧은 실전 경험 하나로 먼저 겪어 보는 것이 맞습니다.",
      tds, asks: (r.items ?? []).slice(0, 3).map((x) => x.ask),
      differs: (r.differs_from ?? []).map((x) => x.line), material: r.application_material ?? [],
    };
  });
}

export type { Experience };
