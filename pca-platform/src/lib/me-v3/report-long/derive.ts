/**
 * 결과 모델에서 쪽마다 쓸 값을 모은다. 새 판단을 하지 않는다.
 *
 * 단계(0~3)는 축 상태를 그대로 옮긴 것이고, 묻지 않은 축은 `null` 이다(0 으로 적지
 * 않는다). 영역 묶음 · 빈자리 · 할 일은 결과 모델이 정한 그대로다. 차례를 세우는
 * 자리(강점 · 직무)는 센 개수와 고른 목표로만 세우고, 그 차례를 점수라고 적지 않는다.
 */
import type { Axis, AxisState } from "../scoring/types";
import type { Action, Gap, ResultDomain } from "../result/model";
import { AXIS_KO, AXIS_WHAT_KO } from "../result/text.ko";
import { AXIS_KO as AXIS_EN, AXIS_WHAT_KO as AXIS_WHAT_EN } from "../result/text.en";
import { studentActivity, studentEvidence } from "../student";
import { byLang, isEn, T } from "./lang";
import { domainSub } from "../runtime/session";
import type { DomainDef, Inputs, Level, RolePack, IndustryPack, TaxDomain } from "./types";

export const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const LV: Record<AxisState, Level> = { NOT_OBSERVED: 0, PARTICIPATED: 1, CONFIRMED: 2, OWNED: 3 };

export const ZONES = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST", "Z4_INSUFFICIENT_EVIDENCE", "NOT_EXPLORED"] as const;
export type ZoneKey = typeof ZONES[number];

/** 영역 묶음의 짧은 이름과 뜻(학생에게 하는 말) */
export const ZONE_WORD: Record<ZoneKey, { tag: string; said: string }> = byLang<Record<ZoneKey, { tag: string; said: string }>>({
  Z1_EVIDENCE_ESTABLISHED: { tag: "강점 영역", said: "직접 정한 일과 남긴 결과물이 둘 다 있는 영역" },
  Z2_EVIDENCE_INCOMPLETE: { tag: "키워 가는 영역", said: "해 본 일은 있는데 결과물이나 비교한 기록이 아직 적은 영역" },
  Z3_EVIDENCE_LOW_INTEREST: { tag: "해 봤지만 관심이 낮은 영역", said: "해 본 일은 있는데 지금은 관심이 낮다고 답한 영역" },
  Z4_INSUFFICIENT_EVIDENCE: { tag: "관심은 높고 경험이 적은 영역", said: "관심은 높은데 아직 해 본 일이 적은 영역" },
  NOT_EXPLORED: { tag: "관심·경험만 본 영역", said: "관심과 해 본 횟수까지만 물어본 영역" },
}, {
  Z1_EVIDENCE_ESTABLISHED: { tag: "Strength area", said: "you made decisions yourself here and left a deliverable" },
  Z2_EVIDENCE_INCOMPLETE: { tag: "Growing area", said: "you have done work here, but few deliverables or comparisons are on record yet" },
  Z3_EVIDENCE_LOW_INTEREST: { tag: "Done, less interested", said: "you have done work here but said your interest is low for now" },
  Z4_INSUFFICIENT_EVIDENCE: { tag: "High interest, little experience", said: "your interest is high but you have not done much here yet" },
  NOT_EXPLORED: { tag: "Interest and exposure only", said: "we only asked about your interest and how often you had done it" },
});
/** 학생에게 보이는 단계 이름. 검사 화면의 보기(시킨 대로 함 · 내가 직접 함 · 내가 정함)와 같은 말을 쓴다 */
export const STEP_WORD: Record<Level, { tag: string; said: string }> = byLang<Record<Level, { tag: string; said: string }>>({
  0: { tag: "해 본 적 없음", said: "그 일을 해 본 적이 없다고 답했어요" },
  1: { tag: "시킨 대로 해 봄", said: "다른 사람이 정한 조건 안에서 해 봤다고 답했어요" },
  2: { tag: "직접 해 봄", said: "스스로 맡아서 해 봤다고 답했어요" },
  3: { tag: "기준까지 직접 정함", said: "기준을 직접 정했다고 답했고, 그 근거도 골랐어요" },
}, {
  0: { tag: "Never done", said: "you said you had not done this yet" },
  1: { tag: "Followed a plan", said: "you did it within conditions someone else set" },
  2: { tag: "Did it myself", said: "you took it on and did it yourself" },
  3: { tag: "Made the call", said: "you set the criteria yourself and picked the evidence to back it" },
});
/**
 * 그 판단을 이번 검사가 묻지 않은 자리. **한 곳에서만 정한다.** 쪽마다 `이번 검사에서
 * 묻지 않음` · `이번에 묻지 않음` · `이번에 깊게 묻지 않음` 이 따로 적혀 있었고, 같은 표에
 * 열 번씩 서면 기계가 쓴 글처럼 읽힌다. 뜻은 `읽는 법` 쪽에서 한 번 풀어 준다
 */
export const notAsked = (): string => T("물어보지 않음", "Not asked");
export const BAND_WORD: Record<string, string> = byLang<Record<string, string>>({ HIGH: "높음", MID: "보통", LOW: "낮음" }, { HIGH: "High", MID: "Medium", LOW: "Low" });
export const EXP_WORD: Record<string, string> = byLang<Record<string, string>>({ NONE: "없음", ONCE_OR_TWICE: "한두 번", SEVERAL: "여러 번" }, { NONE: "None", ONCE_OR_TWICE: "Once or twice", SEVERAL: "Several times" });

export type Bucket = "A" | "B" | "C" | "D";

export function derive(x: Inputs) {
  const { m } = x;
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const defOf = new Map(x.defs.map((d) => [d.code, d]));
  const taxOf = new Map(x.tax.technical_domains.map((d) => [d.code, d]));
  const name = (td: string) => defOf.get(td)?.name ?? taxOf.get(td)?.name ?? T("이 영역", "this area");
  const def = (td: string): DomainDef | undefined => defOf.get(td);
  const tax = (td: string): TaxDomain | undefined => taxOf.get(td);
  const dom = (td: string): ResultDomain | undefined => byCode.get(td);
  const asked = (d: ResultDomain | undefined) => !!d && (d.opened.deep || d.opened.probe);
  const level = (td: string, ax: Axis): Level | null => {
    const d = byCode.get(td);
    if (!asked(d)) return null;
    const a = d!.axes.find((v) => v.axis === ax);
    if (!a || a.missing === "NOT_ROUTED") return null;
    return LV[a.state];
  };
  const levels = (td: string) => AXES.map((a) => level(td, a));
  const picks = (td: string, ax: Axis) => byCode.get(td)?.axes.find((v) => v.axis === ax)?.picks ?? [];
  const depth = (td: string): Level | null => {
    const vs = levels(td).filter((v): v is Level => v !== null);
    return vs.length ? (Math.max(...vs) as Level) : null;
  };
  /* 축 이름은 웹 결과지와 같은 말을 쓴다(result/text.ko · text.en) */
  const axisName = (a: Axis) => T(AXIS_KO[a], AXIS_EN[a]);
  const axisWhat = (a: Axis) => T(AXIS_WHAT_KO[a], AXIS_WHAT_EN[a]);
  /* 학생 사전(`studentActivity` · `studentEvidence`)은 한국어뿐이다. 영어 책은 그 영역의 세부 이름과
     영어 사전의 결과물 이름을 쓴다(작업공간 영어판 `app/me/experience/compose.tsx` 와 같은 길) */
  const activity = (td: string) => isEn() ? domainSub(x.coreCode, td, 34, "en").split("·").join(", ") : studentActivity(x.coreCode, td);
  const evidenceWord = (td: string) => (isEn() ? "" : studentEvidence(x.coreCode, td)) || def(td)?.artifacts[0] || T("결과물", "deliverable");

  const doms = m.domains;
  const zoneCount = (z: ZoneKey) => doms.filter((d) => d.zone === z).length;
  const askedDoms = doms.filter(asked);
  const counts = {
    domains: doms.length,
    asked: askedDoms.length,
    z1: zoneCount("Z1_EVIDENCE_ESTABLISHED"), z2: zoneCount("Z2_EVIDENCE_INCOMPLETE"), z3: zoneCount("Z3_EVIDENCE_LOW_INTEREST"),
    z4: zoneCount("Z4_INSUFFICIENT_EVIDENCE"), ne: zoneCount("NOT_EXPLORED"),
    confirmed: m.overview.counts.confirmed_axes, owned: m.overview.counts.owned_axes, items: m.overview.counts.evidence_items,
    gaps: m.gaps.length, actions: m.actions.length, records: x.exps.length,
    artifacts: [...new Set(doms.flatMap((d) => d.artifacts))].length,
    highInterest: doms.filter((d) => d.interest === "HIGH").length,
  };

  /** 지금 할 일 네 갈래: 결과 모델의 묶음과 관심·배울 뜻 응답만 쓴다 */
  const bucket = (d: ResultDomain): Bucket => {
    if (d.zone === "Z1_EVIDENCE_ESTABLISHED") return "A";
    if (d.zone === "Z2_EVIDENCE_INCOMPLETE" || d.zone === "Z3_EVIDENCE_LOW_INTEREST") return "B";
    if (d.interest === "HIGH" || d.learning === "HIGH") return "C";
    return "D";
  };

  /** 강점: 근거 갖춤 → 근거 일부 → 관심 낮음 차례, 같은 묶음 안에서는 직접 정한 판단 수와 확인된 판단 수로 */
  const ZO = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"];
  const strengths = doms.filter((d) => ZO.includes(d.zone) && d.confirmed.length)
    .sort((a, b) => ZO.indexOf(a.zone) - ZO.indexOf(b.zone) || b.owned.length - a.owned.length || b.confirmed.length - a.confirmed.length)
    .slice(0, 3);

  /** 고른 항목을 네 갈래로: 결과물과 비교 대상이 `한 일` 목록에 섞여 들어와 있다 */
  const evidenceOf = (d: ResultDomain) => {
    const art = new Set(d.artifacts), ver = new Set(d.verifications);
    const noun = (t: string) => art.has(t) || ver.has(t);
    const decisions = d.decided.filter((t) => !noun(t));
    const acts = d.did.filter((t) => !noun(t) && !decisions.includes(t));
    return { decisions, acts, artifacts: d.artifacts, comparisons: d.verifications };
  };

  const actionOf = (g: Gap): Action | undefined => m.actions.find((a) => a.id === g.action_id);
  const gaps = [...m.gaps].sort((a, b) => a.rank - b.rank);

  /* 목표: 적어 둔 목표 → 고른 산업·직무 문항 → 관심 목록 */
  const goalRole = x.roles.find((r) => r.code === (m.targets.goal.role ?? m.role_context?.code ?? m.targets.roles[0])) ?? null;
  const goalInd = x.inds.find((p) => p.code === (m.targets.goal.industry ?? m.industry_context?.code ?? m.targets.industries[0])) ?? null;

  /** 직무마다 핵심 영역에서 갖춘 근거를 센다. 차례는 목표 → 관심 → 센 개수 */
  const roleCover = (r: RolePack) => {
    const tds = r.core_ref.td;
    const z1 = tds.filter((t) => dom(t)?.zone === "Z1_EVIDENCE_ESTABLISHED");
    const z2 = tds.filter((t) => ["Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"].includes(dom(t)?.zone ?? ""));
    const req = r.required_axes.map((a) => {
      const vs = tds.map((t) => level(t, a)).filter((v): v is Level => v !== null);
      return { axis: a, level: vs.length ? (Math.max(...vs) as Level) : null };
    });
    return { role: r, tds, z1, z2, req };
  };
  const roleOrder = [...x.roles].sort((a, b) => {
    const pa = a.code === goalRole?.code ? 0 : m.targets.roles.includes(a.code) ? 1 : 2;
    const pb = b.code === goalRole?.code ? 0 : m.targets.roles.includes(b.code) ? 1 : 2;
    const ca = roleCover(a), cb = roleCover(b);
    return pa - pb || (cb.z1.length * 2 + cb.z2.length) - (ca.z1.length * 2 + ca.z2.length) || x.roles.indexOf(a) - x.roles.indexOf(b);
  });
  const indOrder = [...x.inds].sort((a, b) => {
    const pa = a.code === goalInd?.code ? 0 : m.targets.industries.includes(a.code) ? 1 : 2;
    const pb = b.code === goalInd?.code ? 0 : m.targets.industries.includes(b.code) ? 1 : 2;
    return pa - pb || x.inds.indexOf(a) - x.inds.indexOf(b);
  });
  const roleName = (code: string) => x.roles.find((r) => r.code === code)?.name_ko ?? "";
  const indName = (code: string) => x.inds.find((r) => r.code === code)?.name_ko ?? "";
  const orgName = (code: string | null) => (code ? x.tax.org_contexts.find((o) => o.code === code)?.name ?? null : null);

  /** 축마다 가장 깊은 단계와 그 영역(물은 영역에서만) */
  const best = AXES.map((a) => {
    const vals = askedDoms.map((d) => ({ d, v: level(d.code, a) })).filter((z): z is { d: ResultDomain; v: Level } => z.v !== null);
    if (!vals.length) return { axis: a, level: null as Level | null, where: [] as string[] };
    const top = Math.max(...vals.map((z) => z.v)) as Level;
    return { axis: a, level: top, where: vals.filter((z) => z.v === top).map((z) => z.d.code) };
  });
  /** 방사형 그래프에 겹칠 영역: 깊게 물은 영역 먼저, 넷까지 */
  const radarDoms = [...askedDoms].sort((a, b) => Number(b.opened.deep) - Number(a.opened.deep) || ZONES.indexOf(a.zone as ZoneKey) - ZONES.indexOf(b.zone as ZoneKey)).slice(0, 4);

  /** 그 영역이 이어지는 직무와 산업(관계표) */
  const rolesOf = (td: string) => x.rel.td_role.filter((r) => r.td === td && r.strength !== "드묾")
    .sort((a, b) => Number(b.strength === "중심") - Number(a.strength === "중심"));
  const indsOf = (td: string) => x.rel.td_industry.filter((r) => r.td === td && r.strength !== "드묾")
    .sort((a, b) => Number(b.strength === "중심") - Number(a.strength === "중심"));
  /** 이 축에서 아직 고르지 않은 체크리스트 장면 */
  const scenes = (td: string, a: Axis) => (x.checklists.domains[td]?.[a] ?? []).map((c) => c.text);

  return {
    name, def, tax, dom, asked, level, levels, picks, depth, axisName, axisWhat, activity, evidenceWord,
    counts, bucket, strengths, evidenceOf, actionOf, gaps, goalRole, goalInd, roleCover, roleOrder, indOrder,
    roleName, indName, orgName, best, radarDoms, rolesOf, indsOf, scenes,
  };
}
export type X = ReturnType<typeof derive>;
export type { IndustryPack, RolePack };
