/**
 * 세종 구직자 진단(DEMO) 분석 규칙 `sj-demo-analysis.0`.
 *
 * **점수를 만들지 않는다.** 총점도, 직무 적합도 숫자도, 순위도 없다.
 * ME_V3 와 같은 선을 따른다: 축마다 상태를 적고, 높은 상태는 응답과
 * 경험 근거가 함께 있을 때만 선다(근거 둘 = ME_V3 `CONFIRM_MIN`).
 *
 * **이 파일은 아무것도 불러오지 않는다**(타입만). 검사 내용은 인자로
 * 받는다: 화면과 시드 스크립트와 검사 스크립트가 같은 함수를 쓰게 하려는
 * 것이고, 그래야 시연 자료와 실제 화면의 판정이 갈리지 않는다.
 */

export const ANALYSIS_VERSION = "sj-demo-analysis.0";

export type Axis = "J1" | "J2" | "J3" | "J4" | "J5" | "J6" | "J7" | "J8";
export const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

export type AxisState = "CONFIRMED" | "PARTIAL" | "CLAIMED" | "EXPOSED" | "NONE";

export const STATE_LABEL: Record<AxisState, string> = {
  CONFIRMED: "경험으로 확인됨",
  PARTIAL: "근거 하나 더 필요",
  CLAIMED: "응답으로만 확인",
  EXPOSED: "접해 본 단계",
  NONE: "아직 해 보지 않음",
};

export type Item = { code: string; axis: Axis; text: string; example?: string };
export type JobArea = { code: string; name: string; one_line: string; key_axes: Axis[]; core_ref: string[] };
export type ExperienceCheck = { code: string; axis: Axis; label: string };

export type Instrument = {
  instrument_version: string;
  status: string;
  scale: { value: number; level: string; label: string }[];
  job_areas: JobArea[];
  sections: { code: string; title: string; axes: Axis[]; items: Item[] }[];
  experience_checks: ExperienceCheck[];
  growth_actions: Record<Axis, string>;
};

export type AxisInfo = { name: string; question: string };

export type Experience = {
  id: string;
  kind: string;
  title: string;
  checks: string[];
  skills: string[];
  job_area: string | null;
};

export type Profile = {
  audience: string | null;
  job_areas: string[];
  region_range: string;
  skills: string[];
};

export type AxisResult = {
  axis: Axis;
  name: string;
  question: string;
  /** 세 문항 가운데 두 문항 이상이 닿은 가장 높은 단계 (0~3) */
  level: number;
  evidence: { id: string; title: string }[];
  /** 경험 기록으로 확인할 칸이 있는 축인가 */
  evidence_possible: boolean;
  state: AxisState;
};

export type AreaResult = {
  code: string;
  name: string;
  one_line: string;
  core_ref: string[];
  key: { axis: Axis; name: string; state: AxisState }[];
  counts: { confirmed: number; claimed: number; to_fill: number };
};

export type PlanAction = {
  code: string;
  horizon: "D30" | "D60" | "D90";
  text: string;
  axis?: Axis;
  kind: "evidence" | "growth" | "region" | "apply";
};

export type Result = {
  analysis_version: string;
  instrument_version: string;
  demo: true;
  profile: Profile;
  axes: AxisResult[];
  areas: AreaResult[];
  strengths: Axis[];
  gaps: { area: string; axis: Axis }[];
  actions: PlanAction[];
  quality: { answered: number; of: number; flat: boolean };
  evidence_count: number;
  computed_at: string;
};

/** 두 문항 이상이 닿은 가장 높은 단계. 한 문항만 높게 답한 것으로 올라가지 않는다 */
export function levelOf(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => b - a);
  return s.length >= 2 ? s[1] : s[0];
}

export function stateOf(level: number, evidence: number, possible: boolean): AxisState {
  if (level <= 0) return "NONE";
  if (level === 1) return "EXPOSED";
  if (!possible || evidence === 0) return "CLAIMED";
  if (evidence === 1) return "PARTIAL";
  return "CONFIRMED";
}

export function analyze(opts: {
  instrument: Instrument;
  axisInfo: Record<string, AxisInfo>;
  responses: Record<string, number>;
  experiences: Experience[];
  profile: Profile;
  now?: Date;
}): Result {
  const { instrument, axisInfo, responses, experiences, profile } = opts;
  const items = instrument.sections.flatMap((s) => s.items);
  const checkAxis = new Map(instrument.experience_checks.map((c) => [c.code, c.axis]));

  const axes: AxisResult[] = AXES.map((axis) => {
    const vals = items.filter((i) => i.axis === axis)
      .map((i) => responses[i.code]).filter((v): v is number => typeof v === "number");
    const level = levelOf(vals);
    const possible = instrument.experience_checks.some((c) => c.axis === axis);
    const evidence = experiences
      .filter((e) => e.checks.some((c) => checkAxis.get(c) === axis))
      .map((e) => ({ id: e.id, title: e.title }));
    const info = axisInfo[axis] ?? { name: axis, question: "" };
    return {
      axis, name: info.name, question: info.question, level,
      evidence, evidence_possible: possible,
      state: stateOf(level, evidence.length, possible),
    };
  });
  const byAxis = new Map(axes.map((a) => [a.axis, a]));

  const chosen = profile.job_areas
    .map((c) => instrument.job_areas.find((j) => j.code === c))
    .filter((j): j is JobArea => Boolean(j));

  const areas: AreaResult[] = chosen.map((j) => {
    const key = j.key_axes.map((axis) => {
      const a = byAxis.get(axis)!;
      return { axis, name: a.name, state: a.state };
    });
    return {
      code: j.code, name: j.name, one_line: j.one_line, core_ref: j.core_ref, key,
      counts: {
        confirmed: key.filter((k) => k.state === "CONFIRMED" || k.state === "PARTIAL").length,
        claimed: key.filter((k) => k.state === "CLAIMED").length,
        to_fill: key.filter((k) => k.state === "NONE" || k.state === "EXPOSED").length,
      },
    };
  });

  const strengths = axes
    .filter((a) => a.state === "CONFIRMED" || a.state === "PARTIAL")
    .map((a) => a.axis);

  const gaps: { area: string; axis: Axis }[] = [];
  for (const ar of areas) {
    for (const k of ar.key) {
      if (k.state === "NONE" || k.state === "EXPOSED") gaps.push({ area: ar.code, axis: k.axis });
    }
  }

  const actions: PlanAction[] = [];
  const seen = new Set<string>();
  const push = (a: PlanAction) => { if (!seen.has(a.code)) { seen.add(a.code); actions.push(a); } };

  /* 30일: 이미 한 것을 근거로 남긴다. 새로 하는 것보다 빠르고, 지원서에 바로 쓰인다 */
  for (const a of axes) {
    if (a.state === "CLAIMED" && a.evidence_possible) {
      push({ code: `EV-${a.axis}`, horizon: "D30", axis: a.axis, kind: "evidence",
        text: `'${a.name}'을(를) 해 본 경험 하나를 경험 기록에 적고 근거 칸을 고르기` });
    }
    if (a.state === "PARTIAL") {
      push({ code: `EV2-${a.axis}`, horizon: "D30", axis: a.axis, kind: "evidence",
        text: `'${a.name}' 근거가 하나 있습니다. 다른 경험에서 하나 더 찾아 적기` });
    }
  }
  push({ code: "RG-EXPLORE", horizon: "D30", kind: "region",
    text: "세종 사업장 기업·기관 탐색에서 관심 있는 곳 세 곳을 고르고, 공식 누리집의 채용 안내를 직접 확인하기" });

  /* 60일: 희망 직무에서 비어 있는 판단을 채운다 */
  for (const g of gaps) {
    push({ code: `GR-${g.axis}`, horizon: "D60", axis: g.axis, kind: "growth",
      text: instrument.growth_actions[g.axis] });
  }
  /* 비어 있는 판단이 없어도 60일 칸은 비우지 않는다: 직무 쪽 훈련·자격을 고른다 */
  push({ code: "GR-TRAINING", horizon: "D60", kind: "growth",
    text: "희망 직무의 직업훈련·자격 과정을 고용24에서 찾아 하나를 정하기" });
  /* 90일: 원 공고에 직접 지원한다. 플랫폼이 대신 지원하지 않는다 */
  push({ code: "AP-POSTING", horizon: "D90", kind: "apply",
    text: "고용24나 기업 누리집의 원 공고를 찾아 지원서에 이 결과의 근거 경험을 넣어 직접 지원하기" });
  push({ code: "AP-RECHECK", horizon: "D90", kind: "apply",
    text: "새로 쌓은 경험을 기록하고 진단을 다시 받아 달라진 칸 확인하기" });

  const answered = items.filter((i) => typeof responses[i.code] === "number").length;
  const vals = Object.values(responses);
  const flat = vals.length >= 8 && vals.every((v) => v === vals[0]);

  return {
    analysis_version: ANALYSIS_VERSION,
    instrument_version: instrument.instrument_version,
    demo: true,
    profile,
    axes, areas, strengths, gaps, actions,
    quality: { answered, of: items.length, flat },
    evidence_count: experiences.length,
    computed_at: (opts.now ?? new Date()).toISOString(),
  };
}
