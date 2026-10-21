/**
 * **PDF GOLD MASTER 3차 · 분석 문장.** 굳은 결과 모델과 경험 기록을 읽어, 리포트의
 * 분석 장이 쓸 **문장과 구조**를 만든다.
 *
 * 2차 판의 문장이 반려된 까닭을 규칙으로 바꿔 둔다.
 *
 * 1. **주어는 학생이거나 학생이 한 일이다.** `근거가 섰다` · `깊게 열리면` · `견줄
 *    자리` 처럼 채점 쪽 이름이 문장의 주어·술어가 되지 않는다(`words.ts`).
 * 2. **확인된 사실 → 그 뜻 → 해석의 한계 → 할 일** 차례로 쓴다. 넷을 매번 다 쓰지는
 *    않지만, 사실 없이 뜻을 말하지 않고 한계를 숨기지 않는다.
 * 3. **학생이 고른 말을 그대로 돌려준다.** 해석은 그 말 옆에 붙는다.
 * 4. **새 점수와 판정을 만들지 않는다.** 묶음 · 축 상태 · 빈자리 · 할 일은 결과
 *    모델이 정한 그대로다. 채점 모듈을 부르지 않는다.
 */
import type { Axis, Band } from "../scoring/types";
import type { Gap, ResultDomain, ResultModel } from "../result/model";
import { coreOf } from "../result/model";
import { withJosa } from "../result/josa";
import { content, domainName } from "../runtime/session";
import { asked, axisLevel, AXES, industryPacks, rolePacks, type Level, type RolePack } from "./profile";
import { JUDGE, STEP, ZONE_SAID } from "./words";
import type { Experience } from "../platform";
import { roleGuide, type RoleGuide } from "./guide";

type DomainDef = {
  code: string; name: string; required_axes: Axis[];
  workflow: { step: number; name: string; detail: string }[];
  artifacts: string[]; verify_targets: string[];
  axes: Record<Axis, { l2: string; l3: string }>;
  org_outcomes?: Record<string, string>;
};
export function domainDef(core: string, td: string): DomainDef | undefined {
  return (content(core).domains.domains as unknown as DomainDef[]).find((d) => d.code === td);
}
const j = withJosa;
const join = (xs: string[], sep = " · ") => xs.filter(Boolean).join(sep);
/** ‘A과 B’ 를 받침 보고 잇는다: 이름 뒤에 ‘과’ 를 글자로 박으면 ‘보고과’ 가 나간다 */
export const andJoin = (xs: string[]) => { const ys = xs.filter(Boolean); return ys.map((x, i) => (i < ys.length - 1 ? withJosa(x, "과와") : x)).join(" "); };
/** 산업팩의 판단 이름(‘민원 처리 기준을 두는가’)을 ‘~는지’로 받는다. 학생 문장에는 쓰지 않는다(‘기준을 두는지’): `dimWork` 를 쓴다 */
export const askNoun = (x: string) => x.replace(/는가$/, "는지").replace(/인가$/, "인지").replace(/한가$/, "한지");
/** `~했다` 로 끝나는 체크리스트 문장을 문장 안에 넣기 좋게 */
const quoted = (s: string) => `‘${s}’`;
/** 한 줄씩 인용할 때: 셋까지만, 나머지는 수로 */
function list3(xs: string[]): string {
  if (!xs.length) return "";
  if (xs.length <= 3) return xs.map(quoted).join(", ");
  return `${xs.slice(0, 3).map(quoted).join(", ")} 외 ${xs.length - 3}개`;
}
const INTEREST_SAID: Record<Band, string> = { HIGH: "관심이 높다고", MID: "관심이 보통이라고", LOW: "관심이 낮다고" };
const EXP_SAID: Record<string, string> = { NONE: "해 본 적이 없다고", ONCE_OR_TWICE: "한두 번 해 봤다고", SEVERAL: "여러 번 해 봤다고" };
const ownsAsWork = (s?: string) => (s ?? "").replace(/한다$/, "하는 일");

/** 결과 모델의 항목을 네 갈래로 다시 나눈다: 고른 결과물과 비교 대상이 `한 일`
 *  목록에 섞여 들어와 있어, 그대로 쓰면 `직접 정한 것: 지표 정의표` 가 선다 */
export function evidenceOf(d: ResultDomain) {
  const art = new Set(d.artifacts), ver = new Set(d.verifications);
  const notNoun = (t: string) => !art.has(t) && !ver.has(t);
  const decisions = d.decided.filter(notNoun);
  const acts = d.did.filter((t) => notNoun(t) && !decisions.includes(t));
  return { decisions, acts, artifacts: d.artifacts, comparisons: d.verifications };
}

/* ── 영역별 심층 해설 ──────────────────────────────────────────── */

export type Cover = "strong" | "partial" | "none" | "unasked";
export type DomainRead = {
  code: string; name: string; zone: string; zoneTag: string;
  interest: Band | null; experience: string | null; askedHow: "DEEP" | "PROBE" | "NONE";
  levels: { axis: Axis; name: string; level: Level | null }[];
  decisions: string[]; acts: string[]; artifacts: string[]; comparisons: string[];
  flow: { step: number; name: string; detail: string; axis: Axis; cover: Cover }[];
  headline: string; meaning: string[]; limits: string[];
  jobs: { code: string; name: string; work: string }[];
  develop: { what: string; how: string; output: string; axis: Axis | null }[];
  /** 목표 직무의 업무 영역이 아닌 곳의 ‘다음에 할 일’: 그 영역 안의 일이며 실행 전략에는 넣지 않았다는 한 줄 */
  developNote: string | null;
  records: string[];
};
const STEP_AXIS: Axis[] = ["J1", "J2", "J3", "J4", "J4", "J5", "J6", "J7"];

export function domainRead(m: ResultModel, d: ResultDomain, exps: Experience[]): DomainRead {
  const core = coreOf(m);
  const def = domainDef(core, d.code);
  const name = domainName(core, d.code);
  const ev = evidenceOf(d);
  const levels = AXES.map((ax) => ({ axis: ax, name: JUDGE[ax].name, level: axisLevel(d, ax) }));
  const lv = (ax: Axis) => levels.find((x) => x.axis === ax)!.level;
  const cover = (ax: Axis): Cover => { const v = lv(ax); return v === null ? "unasked" : v >= 2 ? "strong" : v === 1 ? "partial" : "none"; };
  const flow = (def?.workflow ?? []).map((w, i) => ({ step: w.step, name: w.name, detail: w.detail, axis: STEP_AXIS[i] ?? "J8", cover: cover(STEP_AXIS[i] ?? "J8") }));
  // 단계 이름(‘받는 입력’·‘먼저 정하는 것’)은 표의 머리이지 문장 재료가 아니다: 문장에는 수와 그 단계가 하는 일을 쓴다
  const askedSteps = flow.filter((f) => f.cover !== "unasked");
  const strongN = flow.filter((f) => f.cover === "strong").length;
  const gapStep = askedSteps.find((f) => f.cover !== "strong");
  const stepsSaid = askedSteps.length
    ? `이 영역의 일 ${askedSteps.length}단계 가운데 ${strongN}단계를 스스로 맡아 해 봤다고 답했습니다.${gapStep ? ` 아직 스스로 해 봤다고 답하지 않은 일은 ‘${gapStep.detail}’입니다.` : ""}`
    : "";
  const ownedNames = d.owned.map((a) => JUDGE[a].name);
  const lowNames = levels.filter((x) => x.level !== null && x.level <= 1).map((x) => x.name);
  const recs = exps.filter((e) => e.td_codes.includes(d.code)).map((e) => e.title);
  const askedHow = d.opened.deep ? "DEEP" : d.opened.probe ? "PROBE" : "NONE";
  const interest = d.interest ? INTEREST_SAID[d.interest] : "";
  const freq = d.experience ? EXP_SAID[d.experience] : "";

  let headline = "";
  const meaning: string[] = [];
  const limits: string[] = [];
  switch (d.zone) {
    case "Z1_EVIDENCE_ESTABLISHED":
      headline = ev.decisions[0]
        ? `${name}에서는 ${quoted(ev.decisions[0])}처럼 스스로 정한 판단과, 그 판단을 담은 결과물(${join(ev.artifacts) || "결과물"})이 함께 확인됩니다.`
        : `${name}에서는 스스로 맡아 한 일과 남긴 결과물(${join(ev.artifacts)})이 함께 확인됩니다.`;
      meaning.push(`이 영역의 일은 ‘${def?.workflow[2]?.detail ?? "무엇을 먼저 할지 정하는 일"}’에서 시작해 ${def?.workflow[5]?.detail ?? "결과물"} 같은 결과물로 끝납니다. ${stepsSaid}`);
      if (ownedNames.length) meaning.push(`그중 ${j(andJoin(ownedNames), "은는")} 기준을 직접 정했다고 답했고, 체크리스트에서도 그 장면을 함께 골랐습니다. 지원서에서 ‘내가 정한 것’으로 내세울 수 있는 부분이 바로 여기입니다.`);
      break;
    case "Z2_EVIDENCE_INCOMPLETE": {
      const miss = [!ev.artifacts.length && "남긴 결과물", !ev.comparisons.length && "결과를 무엇과 비교했는지", !d.owned.length && "기준을 직접 정한 장면"].filter(Boolean) as string[];
      headline = `${name}에서 스스로 맡아 해 본 일은 확인되지만, ${j(andJoin(miss) || "그 일을 보여 줄 기록", "은는")} 아직 응답에서 보이지 않습니다.`;
      meaning.push(ev.acts.length || ev.artifacts.length
        ? `고른 항목은 ${list3([...ev.acts, ...ev.artifacts])}입니다. ${stepsSaid}`
        : `체크리스트에서 고른 항목은 없습니다. ${stepsSaid}`);
      meaning.push(`이 상태는 경험이 없다는 뜻이 아니라, 경험을 남에게 보여 줄 자료가 아직 모자라다는 뜻입니다. 같은 일을 한 번 더 할 때 ${j(miss[0] ?? "결과물", "을를")} 남기는 것만으로 이 영역의 설명력이 크게 달라집니다.`);
      break;
    }
    case "Z3_EVIDENCE_LOW_INTEREST":
      headline = `${j(name, "은는")} 해 본 경험이 있다고 답했지만, 이 일을 더 하고 싶은 마음은 크지 않다고 답했습니다.`;
      meaning.push(`관심이 낮은 영역의 경험도 버릴 것은 아닙니다. 다른 직무에 지원할 때 ‘이 일도 기본은 해 봤다’는 근거가 되고, 팀 과제에서 맡은 몫을 설명할 때 쓰입니다.`);
      meaning.push(`진로를 이쪽으로 정할 필요는 없습니다. 다만 관심이 낮게 나온 까닭이 일 자체 때문인지, 그때 과제의 조건 때문인지는 한 번 구분해 볼 만합니다.`);
      break;
    case "Z4_INSUFFICIENT_EVIDENCE":
      headline = `${name}에 ${interest || "관심이 높다고"} 답했지만, 이 영역의 일을 스스로 맡아 해 본 경험은 아직 적습니다.`;
      meaning.push(`지금 이 영역은 ‘잘하는 일’보다 ‘해 보고 싶은 일’에 가깝습니다. 관심이 분명하다는 것은 좋은 출발점이고, 짧게 끝나는 과제 하나로 실제로 맞는 일인지 확인해 볼 차례입니다.`);
      if (def) meaning.push(`이 영역의 일은 ${def.workflow[0]?.detail}는 데서 시작해, ${def.workflow[5]?.detail} 같은 결과물을 남깁니다. 처음에는 흐름 전체보다 ${def.workflow[2]?.detail} 한 가지를 맡아 보는 것이 현실적입니다.`);
      break;
    default:
      headline = `${j(name, "은는")} 이번 검사에서 자세히 묻지 않은 영역입니다.`;
      meaning.push(`${interest ? `${interest} 답했고 ` : ""}${freq ? `경험은 ${freq} 답했습니다. ` : ""}이 영역의 판단은 자세히 묻지 않았기 때문에, 판단 그림과 표에서 이 영역이 비어 있는 것은 질문하지 않았기 때문이고, 경험이 없다는 뜻은 아닙니다.`);
  }
  if (d.zone !== "NOT_EXPLORED") {
    limits.push("이 해설은 학생이 고른 응답과 체크리스트 항목으로 만든 것입니다. 결과물의 완성도나 실제 성과(수치·기간)는 확인하지 않았습니다.");
    if (lowNames.length && d.zone !== "Z4_INSUFFICIENT_EVIDENCE") limits.push(`${j(join(lowNames, ", "), "은는")} 아직 응답에서 스스로 해 봤다고 확인되지 않았습니다. 해 보지 않았다는 뜻일 수도 있고, 그 경험을 이번에 떠올리지 못했다는 뜻일 수도 있습니다.`);
    if (ev.comparisons.length === 1) limits.push(`결과를 비교한 대상은 ${quoted(ev.comparisons[0])} 하나만 골랐습니다. 성과를 말할 때 비교 근거가 한 가지뿐이라는 점을 기억해 두세요.`);
    if (askedHow === "PROBE") limits.push("이 영역은 핵심 판단 넷만 물었습니다. 나머지 판단은 이번에 묻지 않았습니다.");
  }
  if (recs.length) limits.push(`경험 기록 ${list3(recs)}도 이 영역을 가리킵니다. 기록과 응답을 함께 읽은 결과는 다음 장에 있습니다.`);

  const roles = rolePacks(core).filter((r) => (r.core_ref?.td ?? []).includes(d.code));
  const jobs = roles.map((r) => ({ code: r.code, name: r.name_ko, work: ownsAsWork(r.owns) }));

  const develop = m.gaps.filter((g) => g.domain === d.code).slice(0, 3).map((g) => devOf(core, d, g, def));
  if (!develop.length && d.zone === "Z4_INSUFFICIENT_EVIDENCE" && def) develop.push({ what: "첫 경험", how: `${j(def.workflow[2]?.detail, "을를")} 직접 맡는 짧은 과제 하나`, output: def.artifacts[0], axis: null });
  const goal = rolePacks(core).find((r) => r.code === m.targets.goal.role);
  const developNote = develop.length && goal && !(goal.core_ref?.td ?? []).includes(d.code)
    ? `${j(name, "은는")} 목표 직무 ${goal.name_ko}의 업무 영역이 아니어서, 위 과제는 이 영역 안에서 할 일로만 적었고 실행 전략(‘역량 개발 우선순위’ 장)에는 넣지 않았습니다.`
    : null;
  return {
    code: d.code, name, zone: d.zone, zoneTag: ZONE_SAID[d.zone]?.tag ?? "", interest: d.interest, experience: d.experience, askedHow,
    levels, ...ev, flow, headline, meaning, limits, jobs, develop, developNote, records: recs,
  };
}

function devOf(core: string, d: ResultDomain, g: Gap, def?: DomainDef): DomainRead["develop"][number] {
  const name = domainName(core, d.code);
  if (!g.axis) return { what: "남길 결과물", how: `다음 ${name} 과제에서 결과를 ${def?.artifacts[0] ?? "문서"} 형태로 남기기`, output: def?.artifacts[0] ?? "문서", axis: null };
  const ax = g.axis;
  const l2 = def?.axes?.[ax]?.l2 ?? "";
  const how: Record<Axis, string> = {
    J1: `과제를 받으면 이번에 다룰 것과 다루지 않을 것을 먼저 한 줄씩 적고 시작하기`,
    J2: `목표를 ${j(def?.verify_targets[0] ?? "기준", "과와")} 비교할 수 있는 숫자 조건으로 바꿔 적기`,
    // 체크리스트 문장(‘~정했다’)을 잘라 관형형으로 만들지 않는다: 문장 그대로 인용하고 ‘에 해당하는 일’로 받는다
    J3: `${l2 ? `다음 팀 과제에서 ‘${l2}’에 해당하는 일을` : "다음 팀 과제에서 기준을 정하는 일을"} 직접 맡고, 고른 까닭을 한 줄 남기기`,
    J4: `조사·분석 방법을 둘 이상 놓고 하나를 고른 까닭을 적기`,
    J5: `결과를 ${def?.artifacts[0] ?? "문서"} 형태로 정리해 다른 사람이 이어 쓸 수 있게 남기기`,
    J6: `끝난 결과를 ${j(def?.verify_targets.slice(0, 2).join("이나 ") || "목표", "과와")} 같은 조건으로 비교한 표 만들기`,
    J7: `기대와 다른 결과가 나오면 ${def?.workflow[7]?.detail.replace(/^.*?면 /, "") ?? "까닭을 좁혀"} 적고 다음 계획을 고치기`,
    J8: `만든 결과가 다음 결정에 어떻게 쓰였는지 한 줄로 기록하기`,
  };
  const output: Record<Axis, string> = {
    J1: "과제 범위 메모", J2: def?.artifacts.find((a) => /지표|목표|기준/.test(a)) ?? "목표·지표 표",
    J3: `${def?.artifacts[0] ?? "과제 결과물"}에 붙인 ‘고른 안·버린 안’ 메모 한 장`, J4: "방법 비교 메모", J5: def?.artifacts[0] ?? "결과 문서",
    J6: `${def?.verify_targets[0] ?? "목표"} 대비 비교표`, J7: "원인 분석과 수정 기록", J8: "활용 기록",
  };
  return { what: JUDGE[ax].name, how: how[ax], output: output[ax], axis: ax };
}

/* ── 경험 기록 해설 ────────────────────────────────────────────── */

const EXP_KIND: Record<string, string> = {
  course: "수업", assignment: "수업 과제", capstone: "캡스톤 디자인", research: "연구", paper: "논문",
  internship: "현장실습·인턴", project: "교내외 활동", work: "근무", credential: "자격 준비",
};
export type RecordRead = {
  title: string; kind: string; period: string; domains: string[]; usedWhere: string[];
  purpose: string; role: string;
  problems: string[]; decisions: string[]; artifacts: string[]; comparisons: string[];
  testSays: { domain: string; text: string }[];
  jobs: { name: string; why: string }[];
  application: string; check: string[];
};
export function recordRead(m: ResultModel, e: Experience): RecordRead {
  const core = coreOf(m);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const doms = e.td_codes.map((td) => domainName(core, td));
  const period = [e.started_on?.slice(0, 7), e.ended_on?.slice(0, 7) ?? "진행 중"].filter(Boolean).join(" ~ ");
  const kind = EXP_KIND[e.kind] ?? e.kind;
  const purpose = `${j(kind, "으로")} 진행한 활동이며, ${andJoin(doms)} 영역의 일로 기록했습니다.${(e.used_where ?? []).length ? ` 결과는 ${join(e.used_where ?? [], ", ")}에 쓰였다고 적었습니다.` : ""}`;
  const role = e.decisions.length
    ? `기록에는 이 활동에서 직접 정한 것이 ${e.decisions.length}가지 적혀 있습니다. 맡은 범위(팀에서의 역할·담당 부분)는 적혀 있지 않아, 면접 전에 한 줄로 정리해 두어야 합니다.`
    : "이 기록에는 직접 정한 것이 적혀 있지 않습니다. 수업을 들은 사실과 활동에서 맡은 몫은 서류에서 다르게 읽히므로, 맡았던 부분을 먼저 떠올려 적어 두세요.";
  const testSays = e.td_codes.map((td) => {
    const d = byCode.get(td);
    const n = domainName(core, td);
    if (!d || !asked(d)) {
      const said = d?.experience ? EXP_SAID[d.experience] : null;
      return { domain: n, text: said === EXP_SAID.NONE
        ? `영역 훑기에서는 이 영역을 ${said} 답했습니다. 기록과 응답이 다르므로 아래 확인 방법을 참고하세요.`
        : `이번 검사에서 이 영역의 판단은 자세히 묻지 않았습니다. 기록에 적은 내용이 지금으로서는 이 영역의 유일한 근거입니다.` };
    }
    if (d.confirmed.length) return { domain: n, text: `검사에서도 이 영역의 판단 ${d.confirmed.length}가지를 스스로 해 봤다고 답해, 기록과 응답이 같은 쪽을 가리킵니다.` };
    return { domain: n, text: "검사에서는 이 영역의 판단을 스스로 해 봤다고 답하지 않았습니다. 기록의 내용을 응답보다 앞세우지 않는 것이 정확합니다." };
  });
  const jobs = rolePacks(core).filter((r) => (r.core_ref?.td ?? []).some((td) => e.td_codes.includes(td)))
    .slice(0, 3).map((r) => ({ name: r.name_ko, why: `${j(r.name_ko, "은는")} ${j(ownsAsWork(r.owns), "을를")} 맡습니다(직무 일반). 이 기록의 ${j(e.decisions[0] ? quoted(e.decisions[0]) : "활동", "이가")} 그 일과 가깝습니다.` }));
  const application = e.decisions.length && e.artifacts.length
    ? `자기소개서에서는 ${j(quoted(e.decisions[0]), "을를")} 문단의 중심에 두고, 그 판단의 결과로 ${j(e.artifacts[0], "을를")} 보여 주는 구성이 자연스럽습니다. 판단의 근거와 결과 수치를 직접 적어 넣으면 한 문단이 완성됩니다.`
    : e.decisions.length
      ? `${j(quoted(e.decisions[0]), "은는")} 면접에서 첫 장면으로 쓸 수 있습니다. 남은 결과물을 함께 정리하면 자기소개서 문단으로도 쓸 수 있습니다.`
      : "지금 기록만으로는 ‘이 수업을 들었다’까지 말할 수 있습니다. 수업 안에서 직접 정한 것 하나를 찾아 적으면 서류에 쓸 수 있는 경험이 됩니다.";
  const check: string[] = [];
  check.push("팀에서 맡은 역할과 담당 범위");
  if (!(e.problems ?? []).length) check.push("처음에 주어진 과제와 그 안에서 좁힌 범위");
  if (!e.artifacts.length) check.push("남은 결과물(문서·표·발표 자료)");
  if (!e.verifications.length) check.push("결과를 무엇과 비교했는지(목표·지난 실적·다른 안)");
  check.push("결과 수치와 기간(직접 기입)");
  return {
    title: e.title, kind, period, domains: doms, usedWhere: e.used_where ?? [],
    purpose, role, problems: e.problems ?? [], decisions: e.decisions, artifacts: e.artifacts, comparisons: e.verifications,
    testSays, jobs, application, check,
  };
}

/* ── 검사 응답 × 경험 기록 ─────────────────────────────────────── */

export type CrossKind = "BOTH" | "TEST_ONLY" | "RECORD_ONLY" | "DIFFERENT" | "UNBACKED";
export const CROSS_TAG: Record<CrossKind, string> = {
  BOTH: "응답과 기록이 일치",
  TEST_ONLY: "응답에만 있음",
  RECORD_ONLY: "기록에만 있음",
  DIFFERENT: "응답과 기록이 다름",
  UNBACKED: "응답은 높고 고른 근거가 없음",
};
export type CrossRow = { code: string; name: string; kind: CrossKind; test: string; record: string; reading: string; verify: string };
export function crossRows(m: ResultModel, exps: Experience[]): CrossRow[] {
  const core = coreOf(m);
  const mismatch = m.response_quality.reasons.includes("CHECKLIST_MISMATCH_HIGH");
  const rows: CrossRow[] = [];
  for (const d of m.domains) {
    const rec = exps.filter((e) => e.td_codes.includes(d.code));
    const name = domainName(core, d.code);
    const recText = rec.length ? rec.map((e) => e.title).join(" / ") : "기록 없음";
    const testText = !asked(d)
      ? (d.experience ? `자세히 묻지 않음 · 경험은 ${EXP_SAID[d.experience]} 답함` : "자세히 묻지 않음")
      : d.confirmed.length ? `판단 ${d.confirmed.length}가지를 스스로 해 봤다고 답함${d.owned.length ? ` · 그중 ${d.owned.length}가지는 기준까지 직접 정함` : ""}` : "물어본 판단을 모두 ‘해 본 적 없음’ 이나 ‘지시받아 수행’ 으로 답함";
    const picks = d.did.length;
    if (rec.length && d.confirmed.length && !(mismatch && picks === 0)) {
      rows.push({ code: d.code, name, kind: "BOTH", test: testText, record: recText,
        reading: `검사 응답과 경험 기록이 같은 영역을 가리킵니다. 면접에서 ‘언제, 어떤 과제에서’라는 질문을 받으면 ${j(quoted(rec[0].title), "을를")} 그 장면으로 쓸 수 있습니다.`,
        verify: rec[0].artifacts.length ? "기록의 결과물과 검사에서 고른 항목이 같은 것을 가리키는지 한 번 맞춰 보세요." : "기록에 결과물을 한 가지 더 적으면 응답과 기록이 같은 이야기를 하게 됩니다." });
    } else if (rec.length && d.confirmed.length) {
      rows.push({ code: d.code, name, kind: "UNBACKED", test: `${testText} · 체크리스트에서 고른 항목 없음`, record: recText,
        reading: "판단을 묻는 질문에는 높게 답했지만, 그 장면을 체크리스트에서는 고르지 않았습니다. 경험 기록은 이 영역을 가리키고 있으니, 기록 안의 장면이 응답을 뒷받침하는지 확인할 차례입니다.",
        verify: `${quoted(rec[0].title)}에서 직접 정한 것과 남은 결과물을 각각 한 줄로 적어 보세요. 적을 수 있다면 응답이 맞고, 떠오르지 않는다면 다음 검사에서 한 단계 낮춰 답하는 편이 정확합니다.` });
    } else if (rec.length && !asked(d)) {
      const none = d.experience === "NONE";
      rows.push({ code: d.code, name, kind: none ? "DIFFERENT" : "RECORD_ONLY", test: testText, record: recText,
        reading: none
          ? `영역 훑기에서는 이 영역을 해 본 적이 없다고 답했는데, 경험 기록에는 ${j(quoted(rec[0].title), "이가")} 이 영역으로 적혀 있습니다. 둘 중 어느 쪽이 틀렸다고 보기보다, 같은 활동을 두 질문이 다르게 불렀을 가능성이 큽니다. 예를 들어 행사 운영에서 사람을 배치한 일을 ‘인사’라고 생각하지 않고 답했을 수 있습니다.`
          : `이번 검사에서는 이 영역을 자세히 묻지 않았고, 경험 기록에만 이 영역이 있습니다.`,
        verify: none
          ? `${quoted(rec[0].title)}에서 실제로 맡은 일을 적어 보고, 그 일이 ${name}의 흐름(${domainDef(core, d.code)?.workflow[2]?.detail ?? "기준 정하기"})에 해당하는지 확인하세요. 해당한다면 다음 검사에서 이 영역을 ‘해 봤다’로 답하면 됩니다.`
          : "다음 검사에서 이 영역이 자세히 질문되면 기록의 내용이 응답으로 다시 확인됩니다. 그 전까지는 기록에 적은 ‘직접 정한 것’이 근거입니다." });
    } else if (d.confirmed.length && !rec.length) {
      const unb = mismatch && picks === 0;
      rows.push({ code: d.code, name, kind: unb ? "UNBACKED" : "TEST_ONLY", test: unb ? `${testText} · 체크리스트에서 고른 항목 없음` : testText, record: recText,
        reading: unb
          ? "판단을 묻는 질문에는 스스로 해 봤다고 답했지만 체크리스트에서 고른 항목이 없고, 경험 기록도 없습니다. 지금은 이 영역의 경험을 뒷받침할 자료가 응답 하나뿐입니다."
          : `검사 응답으로는 이 영역의 판단이 확인되지만, 어느 과제에서 한 일인지는 기록에 없습니다.`,
        verify: unb
          ? "이 영역에서 해 본 과제를 하나 골라, 그때 정한 것과 남은 것을 적어 보세요. 적을 장면이 있다면 경험 기록으로 남기고, 없다면 응답을 다시 살펴볼 차례입니다."
          : `${d.did[0] ? `${j(quoted(d.did[0]), "을를")} 고른 그 과제를` : "그 과제를"} 경험 기록으로 남기면, 면접에서 장면으로 설명할 수 있습니다.` });
    }
  }
  return rows;
}

/* ── 강점 ─────────────────────────────────────────────────────── */

export type Strength3 = {
  code: string; name: string; zone: string;
  decisions: string[]; acts: string[]; artifacts: string[]; comparisons: string[];
  jobs: string[]; industryLines: string[];
  story: string; show: string; next: string; question: string;
};
export function strengths3(m: ResultModel): Strength3[] {
  const core = coreOf(m);
  const roles = rolePacks(core);
  const goalInd = industryPacks(core).find((p) => p.code === (m.targets.goal.industry ?? m.industry_context?.code));
  const order = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"];
  const doms = m.domains.filter((d) => order.includes(d.zone) && d.confirmed.length)
    .sort((a, b) => order.indexOf(a.zone) - order.indexOf(b.zone) || b.owned.length - a.owned.length).slice(0, 3);
  return doms.map((d, i) => {
    const name = domainName(core, d.code);
    const ev = evidenceOf(d);
    const def = domainDef(core, d.code);
    const has = ev.decisions.length || ev.acts.length;
    const story = has
      ? `${name}에서는 ${j(list3(ev.decisions.length ? ev.decisions : ev.acts), "을를")} 골랐습니다.${ev.artifacts.length ? ` 그 결과로 ${j(andJoin(ev.artifacts), "을를")} 남겼다고 답했습니다.` : ""}`
      : `${name}의 판단 ${d.confirmed.length}가지를 스스로 해 봤다고 답했지만, 그 장면을 체크리스트에서는 고르지 않았습니다.`;
    const show = ev.artifacts.length
      ? `${j(ev.artifacts[0], "을를")} 결과물로 보여 주고${ev.comparisons.length ? `, 그 결과를 ${j(ev.comparisons[0], "과와")} 비교한 내용을 근거로 붙이세요.` : ", 결과를 무엇과 비교했는지는 아직 비어 있으니 면접 전에 채워 두세요."}`
      : `아직 보여 줄 결과물을 고르지 않았습니다. ${def?.artifacts[0] ?? "결과물"} 같은 형태로 한 장을 남기면 서류에서 보여 줄 것이 생깁니다.`;
    const gap = m.gaps.find((g) => g.domain === d.code);
    const next = gap?.axis
      ? `이 영역에서 한 단계 더 나아가려면 ‘${JUDGE[gap.axis].name}’를 다음 과제에서 직접 맡아 보세요. ${JUDGE[gap.axis].plain}입니다.`
      : "이 영역은 지금 근거로도 지원서 문단 하나를 쓸 수 있습니다. 다음 할 일은 결과 수치를 직접 적어 넣는 일입니다.";
    const pick = ev.decisions[0] ?? ev.acts[0];
    const question = pick
      ? (i === 0 ? `“${pick.replace(/다$/, "")}다고 하셨는데, 그때 무엇을 기준으로 정했고 다른 안은 왜 고르지 않았나요?”`
        : `“${pick.replace(/다$/, "")}다면, 그 결정으로 무엇이 달라졌나요?”`)
      : `“${name} 쪽 과제에서 결과가 기대와 달랐던 적이 있나요?”`;
    return {
      code: d.code, name, zone: d.zone, ...ev,
      jobs: roles.filter((r) => (r.core_ref?.td ?? []).includes(d.code)).map((r) => r.name_ko),
      industryLines: goalInd?.judgement_dimensions.filter((x) => x.domain === d.code).map((x) => dimWork(x.name)) ?? [],
      story, show, next, question,
    };
  });
}

/* ── 개발 우선순위 = 목표 직무로 이어지는 실행 전략 ───────────────────── */
/*
 * 3차 판은 빈자리(gap) 순위를 그대로 실행 과제로 옮겼다. 그래서 경영기획을 목표로 한 학생에게
 * 마케팅 영역의 빈자리가 ‘지난 캠페인 반응’ 과제로 섰고, 인사를 목표로 한 학생에게 고객 응대 과제가
 * 맨 앞에 섰다. 빈자리 순위는 영역 안에서 무엇이 비었는지를 말할 뿐 학생의 목표를 모른다.
 *
 * 여기서는 사슬을 목표 직무에서 거꾸로 세운다: 목표 직무 → 그 직무의 업무 영역과 핵심 판단 →
 * 그 자리의 실제 응답 → 실행 과제 → 남길 결과물. 빈자리는 이 사슬에 걸릴 때만 과제가 되고,
 * 과제 문장은 목표 직무의 말(`practice` · `lens`)로 쓴다. 다른 직무의 영역 문장을 끌어오지 않는다.
 * 사슬에 걸리지 않는 빈자리는 버리지 않고 `outside` 로 따로 적는다.
 */
export type Relation = "DIRECT" | "ROLE_DOMAIN" | "GOAL_UNASKED" | "SHARED";
export const RELATION_TAG: Record<Relation, string> = {
  DIRECT: "목표 직무의 핵심 판단",
  ROLE_DOMAIN: "목표 직무의 업무 영역",
  GOAL_UNASKED: "목표 직무 영역 · 경험 확인",
  SHARED: "직무 공통 역량",
};
export type Chain = { goal: string; result: string; evidence: string; requirement: string; task: string; output: string };
export type Priority3 = {
  order: number; domain: string; code: string; axis: Axis | null; what: string; plain: string;
  /** 행의 제목: 영역 말로 쓴 과제면 그 영역의 일(‘추정에 쓸 가정을 정해 적어 두기’), 직무 말이면 판단 이름 */
  title: string;
  /** 지금 응답이 이 자리에서 말하는 것(종합 의견의 ‘확인된 사실’) */
  fact: string;
  /** 목표 직무가 같은 판단을 묻는 질문(역할팩 문항). 면접 준비 질문으로 쓴다 */
  ask: string | null;
  relation: Relation; relationTag: string; link: string;
  why: string[]; where: string; task: string; how: string; todo: string; output: string; when: string; check: string; jobs: string[];
  chain: Chain;
};
export type Outside = { domain: string; code: string; what: string; note: string; jobs: string[] };
export type Strategy = { roleCode: string | null; roleName: string; rows: Priority3[]; outside: Outside[] };

const HB = 0xac00;
const jong = (ch: string) => { const c = ch.charCodeAt(0) - HB; return c < 0 || c > 11171 ? -1 : c % 28; };
const noJong = (ch: string) => { const c = ch.charCodeAt(0) - HB; return String.fromCharCode(HB + c - (c % 28)); };
/** ‘~합니다 · ~남깁니다 · ~적습니다’ 로 끝난 과제 문장을 표에 쓰는 ‘~하기 · ~남기기 · ~적기’ 로 */
export function asTodo(s: string): string {
  const t = s.replace(/\.\s*$/, "");
  if (/습니다$/.test(t)) return t.replace(/습니다$/, "기");
  const m = t.match(/(.)니다$/);
  if (m && jong(m[1]) === 17) {
    const pre = t.slice(0, -3);
    let stem = noJong(m[1]);
    if (stem === "드" && pre.endsWith("만")) stem = "들";
    return pre + stem + "기";
  }
  return t;
}
/** 영역 사전의 행동 문장(‘~를 정했다’)을 ‘~를 정하는 일’ 로 */
const L2_TO: [RegExp, string][] = [
  [/적어 두었다$/, "적어 두는 일"], [/견주었다$/, "비교하는 일"], [/좁혔다$/, "좁히는 일"], [/남겼다$/, "남기는 일"],
  [/옮겼다$/, "옮기는 일"], [/적었다$/, "적는 일"], [/썼다$/, "쓰는 일"], [/받았다$/, "받는 일"], [/정했다$/, "정하는 일"], [/했다$/, "하는 일"],
];
export function l2Work(s: string): string { for (const [re, to] of L2_TO) if (re.test(s)) return s.replace(re, to); return s; }
/** 같은 문장을 행 제목으로: ‘~를 정했다’ → ‘~를 정하기’ */
const L2_TITLE: [RegExp, string][] = [
  [/적어 두었다$/, "적어 두기"], [/견주었다$/, "비교하기"], [/좁혔다$/, "좁히기"], [/남겼다$/, "남기기"],
  [/옮겼다$/, "옮기기"], [/적었다$/, "적기"], [/썼다$/, "쓰기"], [/받았다$/, "받기"], [/정했다$/, "정하기"], [/했다$/, "하기"],
];
export function l2Title(s: string): string { for (const [re, to] of L2_TITLE) if (re.test(s)) return s.replace(re, to); return s; }
/** 산업팩의 판단 이름(‘~를 두는가’)은 묻는 꼴이다: 문장 안에서는 ‘~하는 일’ 로 받는다 */
export function dimWork(name: string): string {
  return name.replace(/(을|를) 두는가$/, "$1 정해 두는 일").replace(/는가$/, "는 일").replace(/인가$/, "인 일");
}
/** 과제 끝에 붙는 한 마디: 무엇을 남겨야 다음 사람이(또 면접관이) 그 판단을 볼 수 있는가 */
const FINISH: Record<Axis, string> = {
  J1: "다루지 않기로 한 것과 그 까닭도 함께 적어 둡니다",
  // 경영기획의 지표에도 인사의 직무 요건에도 맞게: ‘재는 방법’ 은 요건 문장에 붙지 않는다
  J2: "옮긴 조건마다 무엇으로 확인할지 함께 적어 둡니다",
  J3: "고른 까닭과 고르지 않은 안을 한 줄씩 남깁니다",
  J4: "고른 방법의 한계도 한 줄 적어 둡니다",
  J5: "다른 사람이 그것만 보고 이어서 할 수 있게 정리합니다",
  J6: "비교한 조건(기간·대상)을 함께 적어 둡니다",
  J7: "바꾼 뒤에 같은 문제가 줄었는지 다시 확인합니다",
  J8: "누가 어떤 결정에 썼는지 한 줄로 남깁니다",
};
/**
 * 중심 영역이 아닌 업무 영역의 과제는 영역 문장으로 쓰므로, 직무 과제의 산출물·확인 질문을 그대로 붙이면 어긋난다
 * (경영기획의 재무 영역 ‘추정 가정 정하기’ 에 ‘배분안’ 이 붙었다). 그 자리에는 판단 기준의 말을 쓴다.
 */
const OUT_AX: Record<Axis, string> = {
  J1: "다룰 범위 메모", J2: "조건·지표 정의표", J3: "판단 기준과 근거 메모", J4: "방법 비교 메모",
  J5: "결과 문서", J6: "같은 기준의 비교표", J7: "원인과 수정 기록", J8: "활용 기록",
};
const CHECK_AX: Record<Axis, string> = {
  J1: "다루지 않기로 한 것과 그 까닭이 적혀 있는가", J2: "옮긴 조건마다 확인할 방법이 적혀 있는가",
  J3: "고르지 않은 안과 그 까닭을 설명할 수 있는가", J4: "고른 방법의 한계를 한 줄로 적었는가",
  J5: "읽은 사람이 그것만 보고 이어서 할 수 있는가", J6: "같은 기준·기간으로 놓고 비교했는가",
  J7: "까닭을 하나로 좁힌 근거가 있는가", J8: "누가 어떤 결정에 썼는지 적혀 있는가",
};
const LV_SAID: Record<number, string> = { 0: "해 본 적이 없다고 답했습니다", 1: "다른 사람이 정한 조건 안에서 해 봤다고 답했습니다", 2: "스스로 맡아 해 봤다고 답했지만 기준을 정한 장면은 아직입니다" };
const WHEN = ["1~30일", "31~60일", "61~90일"];
const AX_PREF: Axis[] = ["J2", "J3", "J5", "J1", "J6", "J4", "J7", "J8"];

export function strategy3(m: ResultModel): Strategy {
  const core = coreOf(m);
  const roles = rolePacks(core);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const role = roles.find((r) => r.code === m.targets.goal.role) ?? roles.find((r) => m.targets.roles.includes(r.code)) ?? null;
  const goalInd = industryPacks(core).find((p) => p.code === m.targets.goal.industry);
  const actBy = new Map(m.actions.map((a) => [a.id, a]));
  const H: Record<string, string> = { NOW: "1~30일", NEXT: "31~90일", LATER: "4~6개월" };
  if (!role) return { roleCode: null, roleName: "", rows: [], outside: [] };
  const g = roleGuide(role.code);
  const tds = role.core_ref?.td ?? [];
  const req = (role.required_axes ?? []) as Axis[];
  const lvIn = (td: string, ax: Axis) => { const d = byCode.get(td); return d ? axisLevel(d, ax) : null; };
  const covered = (ax: Axis) => tds.some((td) => (lvIn(td, ax) ?? -1) >= 2);
  const indLine = (td: string, ax: Axis | null) => {
    const dim = goalInd?.judgement_dimensions.find((x) => x.domain === td && (!ax || x.axis === ax));
    return dim ? `${goalInd!.name_ko} 산업에서는 ${j(dimWork(dim.name), "이가")} 특히 중요합니다(${dim.why}).` : "";
  };
  /** 같은 판단을 목표 직무 밖의 영역에서 해 봤다면 그 경험을 옮겨 쓸 수 있다: 그 연결 이유를 적는다 */
  /**
   * 응답만으로는 옮겨 쓴다고 적지 않는다: 그 영역에서 이 판단의 체크리스트 항목을 실제로 고른 경우에만 연결 이유를 쓴다.
   * (근거를 하나도 고르지 않은 학생에게 ‘마케팅에서 해 본 경험을 인사 장면으로 옮길 수 있다’ 가 섰다)
   */
  const pickedIn = (d: ResultDomain, ax: Axis) => {
    const list = content(core).checklists.domains[d.code]?.[ax] ?? [];
    return d.did.some((t) => list.some((x) => x.text === t));
  };
  const transfer = (ax: Axis) => {
    const src = m.domains.find((d) => !tds.includes(d.code) && asked(d) && (axisLevel(d, ax) ?? -1) >= 2 && pickedIn(d, ax));
    if (!src) return "";
    const own = src.owned.includes(ax);
    return `‘${JUDGE[ax].name}’는 ${domainName(core, src.code)}에서 ${own ? "기준까지 직접 정했다고" : "스스로 맡아 해 봤다고"} 답했습니다. ${role.name_ko}에서는 같은 판단이 ${andJoin((role.decides ?? []).slice(0, 2))}을 정할 때 쓰이므로, 그 경험을 이 직무의 장면으로 옮겨 설명할 수 있습니다.`;
  };
  const evidenceIn = (td: string) => {
    const d = byCode.get(td);
    if (!d || !asked(d)) return "이번에 묻지 않음";
    const ev = evidenceOf(d);
    const xs = [...ev.decisions, ...ev.acts].slice(0, 2).map(quoted);
    return xs.length ? `고른 근거 ${xs.join(", ")}${ev.artifacts.length ? ` · 결과물 ${join(ev.artifacts)}` : ""}` : "체크리스트에서 고른 항목 없음";
  };
  type Cand = Priority3 & { w: number; key: string; mode: "domain" | "role" };
  const cands: Cand[] = [];
  const make = (td: string, ax: Axis, relation: Relation, w: number, extraWhy: string[], when: string, gapKind?: string): Cand | null => {
    const lens = g?.lens[td];
    const def = domainDef(core, td);
    const pr = g?.practice[ax];
    const mode: "domain" | "role" = relation === "SHARED" ? "role" : lens?.mode ?? "role";
    let where: string, task: string, output: string, title: string, check: string;
    if (mode === "domain" && def?.axes?.[ax]?.l2) {
      // 중심 영역은 직무 과제와 영역 문장이 같은 일을 가리킨다: 직무의 산출물을 쓴다. 다른 업무 영역은 그 영역의 말로만
      const center = td === tds[0];
      where = lens?.ctx ?? g?.practiceWhere ?? "";
      task = `${j(l2Work(def.axes[ax].l2), "을를")} 직접 맡아 보고, ${FINISH[ax]}.`;
      title = l2Title(def.axes[ax].l2);
      output = lens?.out?.[ax] ?? (ax === "J5" ? (def.artifacts[0] ?? pr?.output ?? OUT_AX.J5) : center ? (pr?.output ?? OUT_AX[ax]) : OUT_AX[ax]);
      check = center ? (pr?.check ?? CHECK_AX[ax]) : CHECK_AX[ax];
    } else if (pr) {
      where = relation === "SHARED" ? (g?.practiceWhere ?? "") : (lens?.ctx ?? g?.practiceWhere ?? "");
      task = pr.task.endsWith(".") ? pr.task : pr.task + ".";
      title = JUDGE[ax].name;
      output = pr.output;
      check = pr.check;
    } else return null;
    const comma = /(때|로)$/.test(where) ? "," : "";
    const how = `${where}${comma} ${task}`.trim();
    const dn = domainName(core, td);
    const lv = lvIn(td, ax);
    const result = lv === null ? `${dn} · 이번 검사에서 자세히 묻지 않았습니다` : `${dn} · ‘${JUDGE[ax].name}’: ${LV_SAID[lv] ?? "기준까지 직접 정했다고 답했습니다"}`;
    const fact = lv === null
      ? `${j(dn, "은는")} ${role.name_ko}의 업무 영역인데, 이번 검사에서는 이 영역의 판단을 자세히 묻지 않았습니다.`
      : `${dn}에서 ‘${JUDGE[ax].name}’는 ${LV_SAID[lv] ?? "기준까지 직접 정했다고 답했습니다"}.`;
    const requirement = relation === "DIRECT"
      ? `${role.name_ko}에서 꼭 필요한 판단 ‘${JUDGE[ax].name}’`
      : relation === "SHARED" ? `${role.name_ko}에서 꼭 필요한 판단 ‘${JUDGE[ax].name}’(다른 영역의 경험을 옮겨 씀)`
        : `${role.name_ko}의 업무 영역 ${dn}: ${lens?.why.replace(/\.$/, "") ?? ""}`;
    const link = relation === "DIRECT"
      ? `‘${JUDGE[ax].name}’는 ${role.name_ko}에서 꼭 필요한 판단인데, 이 직무의 업무 영역인 ${dn}에서 아직 확인되지 않았습니다.`
      : relation === "SHARED" ? (transfer(ax) || `‘${JUDGE[ax].name}’는 ${role.name_ko}에서 꼭 필요한 판단인데, 지금 응답 어디에서도 스스로 해 봤다고 확인되지 않았습니다.`)
        : `${j(dn, "은는")} ${lens?.why ?? `${role.name_ko}와 이어지는 영역입니다.`}`.replace(/([^.?!])$/, "$1.");
    const why = [link, ...extraWhy].filter(Boolean);
    const tr = relation !== "SHARED" && req.includes(ax) && !covered(ax) ? transfer(ax) : "";
    if (tr) why.push(tr);
    const ind = indLine(td, ax); if (ind) why.push(ind);
    if (gapKind === "VERIFICATION") why.push("결과를 무엇과 비교했는지가 없어, 지금은 성과를 숫자로 말하기 어렵습니다.");
    if (gapKind === "OUTPUT" || gapKind === "OUTPUT_EVIDENCE") why.push("남긴 결과물이 없어, 지금은 이 경험을 서류로 보여 주기 어렵습니다.");
    if (gapKind === "PARTIAL_EVIDENCE") why.push("해 본 경험은 있지만, 기준을 직접 정한 장면까지는 아직 응답에서 보이지 않습니다.");
    return {
      order: 0, domain: dn, code: td, axis: ax, what: JUDGE[ax].name, plain: JUDGE[ax].plain, title, fact,
      // 영역이 맞는 문항을 먼저: 중심 밖 영역의 과제에 중심 영역 질문(‘예산이나 인원 배분…’)을 붙이지 않는다
      ask: ((role.items ?? []).find((x) => x.axis === ax && x.domain === td)
        ?? (mode === "role" || td === tds[0] ? (role.items ?? []).find((x) => x.axis === ax) : undefined))?.ask ?? null,
      relation, relationTag: RELATION_TAG[relation], link, why, where, task, how, todo: asTodo(task), output, when, check,
      jobs: [role.name_ko, ...roles.filter((r) => r.code !== role.code && (r.core_ref?.td ?? []).includes(td)).map((r) => r.name_ko)],
      chain: { goal: `${role.name_ko}${goalInd ? ` · ${goalInd.name_ko}` : ""}`, result, evidence: relation === "SHARED" ? "다른 영역의 응답" : evidenceIn(td), requirement, task: asTodo(task), output },
      w, key: mode === "role" ? `role:${ax}` : `dom:${td}:${ax}`, mode,
    };
  };
  const KB: Record<string, number> = { REQUIRED_AXIS: 4, AXIS: 3, VERIFICATION: 2, OUTPUT: 2, OUTPUT_EVIDENCE: 2, PARTIAL_EVIDENCE: 1 };
  const outside: Outside[] = [];
  for (const gp of m.gaps) {
    const ax = (gp.axis ?? (gp.kind === "VERIFICATION" ? "J6" : "J5")) as Axis;
    const idx = tds.indexOf(gp.domain);
    const a = gp.action_id ? actBy.get(gp.action_id) : undefined;
    const when = a ? H[a.horizon] : "31~90일";
    const dim = goalInd?.judgement_dimensions.some((x) => x.domain === gp.domain && x.axis === ax) ? 3 : 0;
    if (idx < 0) {
      if (req.includes(ax) && !covered(ax)) { const c = make(gp.domain, ax, "SHARED", 58 + (KB[gp.kind] ?? 0), [], when, gp.kind); if (c) cands.push(c); }
      else outside.push({ domain: domainName(core, gp.domain), code: gp.domain, what: JUDGE[ax].name,
        note: `${j(domainName(core, gp.domain), "은는")} ${role.name_ko}의 업무 영역이 아니어서 이번 실행 전략에서 뺐습니다. 이 영역을 쓰는 직무(${roles.filter((r) => (r.core_ref?.td ?? []).includes(gp.domain)).map((r) => r.name_ko).join(" · ") || "—"})도 함께 볼 때 참고하세요.`,
        jobs: roles.filter((r) => (r.core_ref?.td ?? []).includes(gp.domain)).map((r) => r.name_ko) });
      continue;
    }
    const direct = req.includes(ax) && !covered(ax);
    const base = direct ? 100 + (2 - idx) * 6 : idx === 0 ? 80 : 50 + (2 - idx) * 2 - ((lvIn(tds[0], ax) ?? -1) >= 2 ? 10 : 0);
    const c = make(gp.domain, ax, direct ? "DIRECT" : "ROLE_DOMAIN", base + (KB[gp.kind] ?? 0) + dim, [], when, gp.kind);
    if (c) cands.push(c);
  }
  /* 목표 직무의 업무 영역인데 이번 검사에서 묻지 않은 곳: 첫 경험을 만들거나, 이미 한 일을 기록으로 남길 자리 */
  tds.forEach((td, idx) => {
    const d = byCode.get(td);
    if (!d || asked(d)) return;
    // 직무 안내가 이 영역에서 먼저 볼 판단을 정해 두었으면 그것부터(인사의 운영·프로세스는 처리 시간 지표가 아니라 역할 배분)
    const first = g?.lens[td]?.axes ?? req;
    const prefer = [...first, ...AX_PREF.filter((x) => !first.includes(x))];
    const n = idx === 0 ? 2 : 1;
    let k = 0;
    for (const ax of prefer) {
      if (k >= n) break;
      if (g?.lens[td]?.mode !== "domain") break;
      const iw = d.interest === "HIGH" ? 8 : d.interest === "MID" ? 3 : 0;
      const c = make(td, ax, "GOAL_UNASKED", 70 + iw + (2 - idx) * 2 - k, [
        `이번 검사에서는 이 영역의 판단을 자세히 묻지 않았${d.interest ? `고, ${INTEREST_SAID[d.interest]} 답했습니다` : "습니다"}. 해 본 일이 있다면 그 장면을 경험 기록에 먼저 남기고, 없다면 다음 과제에서 처음 맡아 봅니다.`,
      ], "1~30일");
      if (c) { cands.push(c); k++; }
    }
  });
  /* 핵심 판단인데 위 어디에도 과제가 서지 않은 것: 직무 공통 역량으로 잇는다 */
  for (const ax of req) if (!covered(ax) && !cands.some((c) => c.axis === ax)) { const c = make(tds[0], ax, "SHARED", 60, [], "31~90일"); if (c) cands.push(c); }

  /* 고르기: 같은 과제를 두 번 세우지 않고, 직무 말로 쓴 과제는 같은 판단을 한 번만 세운다.
     중심 영역은 셋까지, 나머지 영역은 하나씩 */
  const picked: Cand[] = [];
  for (const c of cands.sort((a, b) => b.w - a.w)) {
    if (picked.length >= 5) break;
    if (picked.some((p) => p.key === c.key || p.how === c.how)) continue;
    if (c.mode === "role" && picked.some((p) => p.axis === c.axis)) continue;
    const cap = c.code === tds[0] ? 3 : 1;
    if (picked.filter((p) => p.code === c.code).length >= cap) continue;
    picked.push(c);
  }
  /* 읽는 차례: 핵심 판단 → 중심 영역 → 경험 확인 → 공통 역량 → 다른 업무 영역, 같은 무리 안에서는 일의 흐름(J1→J8) */
  const tier = (c: Cand) => c.relation === "DIRECT" ? 0 : c.relation === "ROLE_DOMAIN" && c.code === tds[0] ? 1 : c.relation === "GOAL_UNASKED" ? 2 : c.relation === "SHARED" ? 3 : 4;
  picked.sort((a, b) => tier(a) - tier(b) || AXES.indexOf(a.axis!) - AXES.indexOf(b.axis!));
  return {
    roleCode: role.code, roleName: role.name_ko,
    // 시기는 읽는 차례를 따른다: 실행 계획이 첫 줄을 30일, 둘째 줄을 60일에 놓으므로 표와 계획이 같은 말을 한다
    rows: picked.map(({ w: _w, key: _k, mode: _m, ...r }, i) => ({ ...r, order: i + 1, when: WHEN[Math.min(i, 2)] })),
    outside,
  };
}
export function priorities3(m: ResultModel): Priority3[] { return strategy3(m).rows; }

/* ── 직무 방향 ────────────────────────────────────────────────── */

export type Readiness = "준비 근거 있음" | "일부 있음" | "아직 적음";
export type Direction3 = {
  code: string; name: string; goal: boolean; guide: RoleGuide | null;
  owns: string; decides: string[]; environment: string;
  have: { domain: string; text: string }[]; need: { name: string; why: string; kind: "judge" | "domain" }[];
  readiness: Readiness; summary: string; differs: string[]; asks: string[]; material: string[]; tds: string[];
};
export function directions3(m: ResultModel): Direction3[] {
  const core = coreOf(m);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const roles = rolePacks(core);
  const goal = m.targets.goal.role;
  const interest = new Set([goal, ...m.targets.roles]);
  const ranked = roles.map((r) => {
    let w = 0;
    for (const td of r.core_ref?.td ?? []) {
      const d = byCode.get(td); if (!d) continue;
      if (d.zone === "Z1_EVIDENCE_ESTABLISHED") w += 3; else if (d.zone === "Z2_EVIDENCE_INCOMPLETE" || d.zone === "Z3_EVIDENCE_LOW_INTEREST") w += 2;
      if (d.interest === "HIGH") w += 1;
    }
    if (r.code === goal) w += 4; else if (interest.has(r.code)) w += 2;
    return { r, w };
  }).sort((a, b) => b.w - a.w);
  const pick = ranked.slice(0, 3).map((x) => x.r);
  const gp = roles.find((r) => r.code === goal);
  if (gp && !pick.includes(gp)) pick[2] = gp;
  /* 목표 직무가 맨 앞: 학생이 고른 방향을 먼저 읽는다 */
  pick.sort((a, b) => Number(b.code === goal) - Number(a.code === goal));
  const org = m.targets.goal.org ?? "OC1";
  return pick.map((r) => dirOf(m, r, byCode, org, goal));
}
function dirOf(m: ResultModel, r: RolePack, byCode: Map<string, ResultDomain>, org: string, goal: string | null | undefined): Direction3 {
  const core = coreOf(m);
  const tds = r.core_ref?.td ?? [];
  const req = r.required_axes ?? [];
  const best = (ax: Axis) => Math.max(-1, ...tds.map((td) => { const d = byCode.get(td); return d ? (axisLevel(d, ax) ?? -1) : -1; }));
  const have = tds.flatMap((td) => {
    const d = byCode.get(td);
    if (!d || !d.confirmed.length) return [];
    const ev = evidenceOf(d);
    return [{ domain: domainName(core, td), text: d.owned.length
      ? `기준을 직접 정한 판단 ${d.owned.length}가지${ev.artifacts.length ? ` · 결과물 ${join(ev.artifacts)}` : ""}`
      : `스스로 해 본 판단 ${d.confirmed.length}가지${ev.artifacts.length ? ` · 결과물 ${join(ev.artifacts)}` : " · 고른 결과물 없음"}` }];
  });
  const need: Direction3["need"] = req.filter((ax) => best(ax) < 2).map((ax) => {
    const lv = best(ax);
    return { kind: "judge", name: JUDGE[ax].name, why: lv === -1 ? `이 직무와 이어지는 영역에서 이번에 묻지 않은 판단입니다. ${j(JUDGE[ax].plain, "을를")} 해 본 장면이 있는지 먼저 떠올려 보세요.`
      : lv === 0 ? `이 직무의 핵심 판단인데, 해 본 적이 없다고 답했습니다. ‘${JUDGE[ax].scene}’ 같은 장면을 수업 과제 하나에서 직접 맡아 보면 첫 근거가 됩니다.`
      : `이 직무의 핵심 판단인데, 다른 사람이 정한 조건 안에서만 해 봤다고 답했습니다. 다음 과제에서 그 기준을 내가 정하고 까닭을 남기면 서류에 쓸 장면이 됩니다.` };
  });
  if (!need.length) {
    for (const td of tds) { const d = byCode.get(td); if (!d || !asked(d)) need.push({ kind: "domain", name: domainName(core, td), why: "이 직무와 함께 이어지는 영역인데 이번 검사에서 자세히 묻지 않았습니다" }); }
  }
  const ok = req.filter((ax) => best(ax) >= 2).length;
  // 응답만 있고 그 장면을 받치는 근거 항목·결과물을 하나도 고르지 않았으면 ‘준비 근거 있음’ 으로 올리지 않는다
  const picked = tds.some((td) => { const d = byCode.get(td); if (!d) return false; const ev = evidenceOf(d); return ev.decisions.length + ev.acts.length + ev.artifacts.length > 0; });
  const full = req.length > 0 && ok === req.length;
  const readiness: Readiness = full && picked ? "준비 근거 있음" : ok > 0 || have.length ? "일부 있음" : "아직 적음";
  const reqNames = andJoin(req.map((a) => `‘${JUDGE[a].name}’`));
  const okWhere = tds.filter((td) => { const d = byCode.get(td); return d && req.every((ax) => (axisLevel(d, ax) ?? -1) >= 2); }).map((td) => domainName(core, td));
  const summary = readiness === "준비 근거 있음"
    ? `이 직무의 핵심 판단인 ${j(reqNames, "을를")} ${okWhere.length ? `${join(okWhere)} 영역에서 ` : ""}모두 스스로 해 봤다고 답했습니다. 지금 단계에서 할 일은 그 경험을 이 직무의 말로 정리하는 것입니다.`
    : readiness === "일부 있음"
      ? full
        ? `이 직무의 핵심 판단인 ${j(reqNames, "을를")} 모두 스스로 해 봤다고 답했지만, 그 장면을 보여 줄 체크리스트 항목과 결과물은 아직 고르지 않았습니다. 지금은 그 장면을 경험 기록으로 남기는 단계입니다.`
        : `이 직무의 핵심 판단 ${req.length}가지 가운데 ${ok}가지가 응답에서 확인됩니다. 나머지는 수업 과제 한두 번으로 채워 볼 수 있는 크기입니다.`
      : `이 직무와 이어지는 영역에서 아직 스스로 해 본 판단이 확인되지 않습니다. 짧은 과제로 먼저 겪어 보고 맞는지 확인하는 단계입니다.`;
  const env = domainDef(core, tds[0] ?? "")?.org_outcomes?.[org];
  return {
    code: r.code, name: r.name_ko, goal: r.code === goal, guide: roleGuide(r.code),
    owns: ownsAsWork(r.owns), decides: r.decides ?? [],
    environment: env ? `고른 조직 유형에서는 ${j(`‘${env}’`, "이가")} 이 직무의 결과로 이어집니다.` : "",
    have, need, readiness, summary,
    differs: (r.differs_from ?? []).map((x) => x.line), asks: (r.items ?? []).slice(0, 4).map((x) => x.ask),
    material: r.application_material ?? [], tds,
  };
}

/* ── 프로파일 해석 (02장) ─────────────────────────────────────── */

export type ProfileRead = { lead: string; paragraphs: string[]; caution: string | null; evidenceLine: string; picks: number; artifacts: number };
export function profileRead(m: ResultModel, exps: Experience[]): ProfileRead {
  const core = coreOf(m);
  const nm = (td: string) => domainName(core, td);
  const z = (code: string) => m.domains.filter((d) => d.zone === code).map((d) => nm(d.code));
  const z1 = z("Z1_EVIDENCE_ESTABLISHED"), z2 = z("Z2_EVIDENCE_INCOMPLETE"), z3 = z("Z3_EVIDENCE_LOW_INTEREST"), z4 = z("Z4_INSUFFICIENT_EVIDENCE");
  const askedD = m.domains.filter(asked);
  const owned = new Set(askedD.flatMap((d) => d.owned));
  const confirmed = new Set(askedD.flatMap((d) => d.confirmed));
  const highInt = m.domains.filter((d) => d.interest === "HIGH").map((d) => nm(d.code));
  const notAsked = m.domains.filter((d) => d.interest === "HIGH" && !asked(d)).map((d) => nm(d.code));
  let lead: string;
  if (z1.length >= 2) lead = `직접 판단한 경험이 ${andJoin(z1)} 두 영역 이상에 걸쳐 있습니다. 한 가지 경험에만 기대지 않는 프로필입니다.`;
  else if (z1.length === 1) lead = `직접 판단한 경험이 ${z1[0]}에 모여 있습니다. 지원서에서 이 영역의 경험 하나가 많은 역할을 맡게 됩니다.`;
  else if (z2.length || z3.length) lead = `${join([...z2, ...z3], ", ")}에서 해 본 일은 응답으로 확인되지만, 그 경험을 보여 줄 결과물과 비교 기록이 아직 부족합니다.`;
  else if (z4.length) lead = `${join(z4, ", ")}에 관심이 분명하게 나왔고, 이 영역들의 일은 이제 처음 해 보는 단계입니다.`;
  else lead = "이번 응답으로는 영역 사이의 뚜렷한 차이를 읽기 어렵습니다.";
  const P: string[] = [];
  if (owned.size) P.push(`여덟 가지 판단 가운데 ${j(join([...owned].map((a) => JUDGE[a].name), ", "), "은는")} 기준까지 직접 정했다고 답했습니다. 체크리스트에서도 그 장면을 함께 골라, 이번 결과에서 가장 분명하게 확인되는 판단입니다.`);
  const confOnly = [...confirmed].filter((a) => !owned.has(a));
  if (confOnly.length >= 5) P.push(`여덟 가지 판단 가운데 ${confOnly.length}가지(${join(confOnly.map((a) => JUDGE[a].name), ", ")})를 스스로 맡아 해 봤지만, 기준을 정한 장면까지는 응답에서 보이지 않습니다. 다음 과제에서 이 가운데 하나를 골라 기준까지 직접 정해 보면, 지원서에서 ‘내가 정한 일’로 말할 수 있게 됩니다.`);
  else if (confOnly.length) P.push(`${j(join(confOnly.map((a) => JUDGE[a].name), ", "), "은는")} 스스로 맡아 해 봤지만 기준을 정한 장면까지는 응답에서 보이지 않습니다. 다음 과제에서 이 가운데 하나를 골라 기준까지 직접 정해 보면, 지원서에서 ‘내가 정한 일’로 말할 수 있게 됩니다.`);
  const never = AXES.filter((a) => !confirmed.has(a) && askedD.some((d) => axisLevel(d, a) !== null));
  // 여덟 판단을 모두 늘어놓으면 문장이 끝나는 자리를 놓친다: 다 비었으면 ‘여덟 가지 가운데 아직 없음’ 으로 적는다
  if (never.length >= 8) P.push(`물어본 영역에서 여덟 가지 판단(${JUDGE[never[0]].name}부터 ${JUDGE[never[never.length - 1]].name}까지) 가운데 아직 스스로 해 봤다고 답한 것이 없습니다. 능력이 없다는 뜻이 아니라, 그런 장면을 맡아 본 경험이 아직 적다는 뜻입니다.`);
  else if (never.length) P.push(`${j(join(never.map((a) => JUDGE[a].name), ", "), "은는")} 물어본 영역에서 아직 스스로 해 봤다고 답하지 않았습니다. 능력이 없다는 뜻이 아니라, 그런 장면을 맡아 본 경험이 아직 적다는 뜻입니다.`);
  if (highInt.length) P.push(`관심은 ${join(highInt, ", ")}에서 높게 나왔습니다.${notAsked.length ? ` 그중 ${j(join(notAsked, ", "), "은는")} 이번 검사에서 판단을 자세히 묻지 않아, 관심이 있다는 것까지만 알 수 있습니다.` : ""}`);
  if (z3.length) P.push(`${j(join(z3, ", "), "은는")} 해 본 경험은 있지만 관심은 낮게 나왔습니다. 진로를 이쪽으로 정할 필요는 없지만, 다른 직무에 지원할 때 기본기로 쓸 수 있는 경험입니다.`);
  // 고른 근거는 결과 모델의 네 목록을 합쳐 센다: 묻지 않은 판단 자리의 ‘비교한 대상’ 은 `did` 에 들지 않고 `verifications` 에만 남는다(격리 검사에서 저장 27 · did 26)
  const picks = m.domains.reduce((n, d) => n + new Set([...d.did, ...d.decided, ...d.artifacts, ...d.verifications]).size, 0);
  const arts = m.domains.reduce((n, d) => n + d.artifacts.length, 0);
  const evidenceLine = picks === 0 && !exps.length
    ? "체크리스트에서 고른 항목과 경험 기록이 모두 없어, 아래 해석은 판단을 묻는 질문에 답한 내용만으로 만들었습니다."
    : `체크리스트에서 고른 항목 ${picks}개(그중 결과물 ${arts}개)와 경험 기록 ${exps.length}건을 함께 읽었습니다.`;
  const q = m.response_quality;
  const caution = q.reasons.includes("CHECKLIST_MISMATCH_HIGH")
    ? "판단을 묻는 질문에는 ‘기준을 직접 정했고 결과가 쓰였다’에 가깝게 답한 곳이 많지만, 그 장면을 체크리스트에서는 고르지 않았습니다. 그래서 이 보고서는 그 판단들을 ‘직접 수행’ 단계까지만 반영했습니다. 응답이 틀렸다는 뜻은 아닙니다. 해 본 장면을 구체적으로 떠올려 보면 어느 쪽이 맞는지 확인할 수 있습니다."
    : q.reasons.includes("LOW_VARIANCE_GRID")
      ? "열두 영역에 거의 같은 값으로 답해, 관심만으로는 영역 사이의 차이를 읽기 어렵습니다."
      : null;
  return { lead, paragraphs: P, caution, evidenceLine, picks, artifacts: arts };
}

/* ── 성장 설계 (경험이 적은 학생) ──────────────────────────────── */

export type Growth = {
  role: string; guide: RoleGuide; domains: string[];
  start: string; entry: string[]; learn: RoleGuide["learnOrder"]; project: RoleGuide["firstProject"];
  portfolio: string[]; research: { step: string; how: string }[];
  months: { when: string; what: string; output: string }[];
};
export function growth(m: ResultModel): Growth | null {
  const core = coreOf(m);
  const roles = rolePacks(core);
  const role = roles.find((r) => r.code === m.targets.goal.role) ?? roles[0];
  const g = roleGuide(role.code);
  if (!g) return null;
  const doms = m.domains.filter((d) => d.interest === "HIGH" && (role.core_ref?.td ?? []).includes(d.code)).map((d) => domainName(core, d.code));
  const allHigh = m.domains.filter((d) => d.interest === "HIGH").map((d) => domainName(core, d.code));
  const ind = industryPacks(core).find((p) => p.code === m.targets.goal.industry);
  return {
    role: role.name_ko, guide: g, domains: doms.length ? doms : allHigh,
    start: `목표로 고른 ${j(role.name_ko, "은는")} ${g.summary}입니다. 관심이 높게 나온 ${j(join(doms.length ? doms : allHigh, ", "), "이가")} 이 직무와 바로 이어집니다. 지금은 해 본 경험보다 관심이 앞서 있는 상태이므로, 이 장은 ‘무엇부터 해 보면 되는가’를 순서대로 적었습니다.`,
    entry: g.entry, learn: g.learnOrder, project: g.firstProject, portfolio: g.portfolio,
    research: [
      { step: "직무 이름으로 공고 모으기", how: `채용 사이트에서 ‘${role.name_ko}’ 신입 공고 다섯 건을 모아 담당 업무 문장만 따로 옮겨 적습니다.` },
      { step: "공통 업무 찾기", how: "다섯 공고에 두 번 이상 나오는 업무를 표시합니다. 그것이 이 직무의 실제 중심입니다." },
      { step: "산업별 차이 보기", how: `${ind ? `목표 산업인 ${ind.name_ko}과` : "관심 산업과"} 다른 산업의 공고를 비교해, 같은 직무 이름이 산업마다 어떻게 다른지 적습니다.` },
      { step: "기업 한 곳 깊게 보기", how: "이 보고서의 진로 탐색 기업 가운데 하나를 골라, 사업보고서나 홈페이지에서 제품·고객·사업 구조를 한 장으로 정리합니다." },
      { step: "현직자 이야기 듣기", how: "학교 취업지원센터의 직무 특강·멘토링이나 졸업생 연결 프로그램으로 실제 하루의 일을 들어 봅니다." },
    ],
    months: [
      { when: "1개월", what: `${j(g.learnOrder[0]?.step ?? "직무 기초", "과와")} 직무 공고 다섯 건 정리`, output: "공고 비교 메모" },
      { when: "2개월", what: g.entry[0], output: "활동 기록 한 건(경험 기록에 남기기)" },
      { when: "3개월", what: `첫 실무형 프로젝트 ‘${g.firstProject.title}’ 시작`, output: "프로젝트 계획 한 장" },
      { when: "4~5개월", what: "프로젝트 완료와 결과 비교", output: g.firstProject.output },
      { when: "6개월", what: `‘${g.firstProject.title}’ 결과물로 포트폴리오 첫 장 만들기와 CareerMatri 재검사`, output: "포트폴리오 첫 장(결과물 1건)과 두 결과의 비교" },
    ],
  };
}

/* ── 응답 확인 과제 (응답과 근거가 엇갈리는 학생) ───────────────── */

export type Verify = { lead: string; items: { domain: string; said: string; picked: string; task: string }[]; steps: string[] };
export function verifyTasks(m: ResultModel, exps: Experience[]): Verify | null {
  if (!m.response_quality.reasons.includes("CHECKLIST_MISMATCH_HIGH")) return null;
  const core = coreOf(m);
  const items = m.domains.filter((d) => asked(d) && d.confirmed.length && !d.did.length).map((d) => {
    const def = domainDef(core, d.code);
    const rec = exps.find((e) => e.td_codes.includes(d.code));
    return {
      domain: domainName(core, d.code),
      said: `판단 ${d.confirmed.length}가지를 ‘기준까지 정했다’에 가깝게 답함`,
      picked: rec ? `고른 항목 없음 · 경험 기록 ${quoted(rec.title)}` : "고른 항목 없음 · 경험 기록 없음",
      task: `${j(def?.workflow[2]?.detail ?? "기준을 정하는 일", "을를")} 해 본 과제 하나를 떠올려, 그때 정한 것과 남은 결과물(${def?.artifacts[0] ?? "문서"} 등)을 각각 한 줄로 적어 보기`,
    };
  });
  return {
    lead: "이 결과에서 판단을 묻는 질문의 응답과 체크리스트에서 고른 항목이 서로 다른 방향을 가리키는 영역이 있습니다. 어느 쪽이 맞는지 이 보고서가 정할 수는 없습니다. 아래 과제로 학생 스스로 확인해 볼 수 있습니다.",
    items,
    steps: [
      "영역마다 ‘그 일을 한 과제 이름’을 하나씩 적습니다. 떠오르지 않는 영역은 표시해 둡니다.",
      "과제 이름이 있는 영역은 그때 내가 정한 것 하나와 남은 결과물 하나를 적습니다.",
      "적은 내용을 내 CareerMatri의 경험 기록에 남깁니다. 기록이 쌓이면 응답과 근거가 같은 이야기를 하게 됩니다.",
      "과제 이름이 떠오르지 않는 영역은 다음 검사에서 ‘다른 사람이 정한 조건 안에서 해 봤다’에 가깝게 답하는 것이 정확합니다.",
    ],
  };
}

export type { Experience, Level };
export const STATE_STEP = STEP;
export function interestSaid(b: Band | null): string { return b ? INTEREST_SAID[b] : ""; }
