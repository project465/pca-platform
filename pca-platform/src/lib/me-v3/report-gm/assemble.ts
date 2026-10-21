/**
 * **PDF GOLD MASTER · 분석 표현 층.** 굳은 결과 모델을 보고서 장(章) 순서로
 * 다시 묶는다.
 *
 * - **새 판단을 만들지 않는다.** 묶음 · 축 상태 · 빈자리 · 할 일은 결과 모델이
 *   정한 그대로이고, 여기서 하는 일은 그것을 보고서의 차례로 놓고 근거의 층
 *   (응답 · 고른 근거 · 고른 결과물 · 권장 행동 · 2차 출처)을 표시하는 것이다.
 * - **성과·수치·역량을 짐작하지 않는다.** 응답에 없는 값은 `직접 기입` 칸으로
 *   남긴다.
 * - **채점 모듈을 읽지 않는다.** 읽는 것은 결과 모델 · 등록부 · 영역 사전 ·
 *   산업·역할 팩 · 지역 자료뿐이다.
 *
 * 이 파일은 미리보기 산출물을 만드는 자리이고 **운영 PDF 경로에 연결돼 있지
 * 않다**(사용자 승인 전).
 */
import type { Axis, AxisState, Band, Stage } from "../scoring/types";
import type { Action, Gap, ResultDomain, ResultModel } from "../result/model";
import { coreOf } from "../result/model";
import { actionKo, gapKo, draftFrameKo, ZONE_TITLE_KO, QUALITY_KO } from "../result/text.ko";
import { domainName, roleName } from "../runtime/session";
import { packs, core as coreEntry } from "../core-registry";
import { studentActivity } from "../student";
import { university } from "@/lib/campus/registry";
import { withJosa } from "../result/josa";
import { axisWord, AXIS_STATE_WORD } from "./lexicon";
import { candidates, orgSet, type Candidate, type OrgSet, type Picks, type Why } from "./orgs";

export type Layer = "RESPONSE" | "PICK" | "ARTIFACT" | "ADVICE" | "SOURCE2";

type IndustryPack = {
  code: string; name_ko: string; demands: string[]; scene?: string;
  judgement_dimensions: { name: string; axis: Axis; domain: string; why: string }[];
};
type RolePack = {
  code: string; name_ko: string; owns?: string; decides?: string[];
  required_axes?: Axis[]; application_material?: string[];
  differs_from?: { vs: string; line: string }[];
  core_ref?: { td: string[] };
};

export type Meta = {
  school: string | null; department: string | null; major: string | null;
  specialization: string | null; answeredOn: string | null; tier: string;
};

const BAND: Record<Band, string> = { HIGH: "높음", MID: "보통", LOW: "낮음" };
const EXP = { NONE: "없음", ONCE_OR_TWICE: "한두 번", SEVERAL: "여러 번" } as const;
const HORIZON_DAYS = { NOW: "30일", NEXT: "60일", LATER: "90일" } as const;

export type DomainRow = {
  code: string; name: string; zone: string; zoneCode: string;
  interest: string; experience: string; learning: string;
  depth: "DEEP" | "PROBE" | "NONE";
  owned: string[]; confirmed: string[]; empty: string[];
};

export type ExperienceCard = {
  code: string; name: string; zone: string;
  scene: string;
  decided: string[]; did: string[]; artifacts: string[]; verifications: string[];
  /** 그 영역에서 아직 확인되지 않은 판단 */
  missing: string[];
  /** 해 본 것은 확인됐고 직접 정했다고 보기에는 아직인 판단 */
  partial: string[];
  ownedAxes: string[];
};

export type GapRow = {
  domain: string; what: string; why: string; how: string; keep: string; horizon: string;
};

export type DimRow = { name: string; why: string; domain: string; axis: string; state: string; layer: Layer | null };

export type PlanRow = { when: string; what: string; keep: string; check: string; layer: Layer };

export type InterviewItem = {
  domain: string;
  questions: { q: string; from: string }[];
  star: { s: string; t: string[]; a: string[]; r: string[] };
};

export type CompanyCard = {
  c: Candidate; whyText: string[]; roles: string[];
  strengths: string[]; lacks: string[]; prepare: string[]; points: string[];
};

export type Report = {
  core: string; meta: Meta; stage: Stage;
  quality: string;
  summary: {
    confirmed: string; gap: string; direction: string;
    actions: { when: string; text: string }[];
    counts: { explored: number; owned: number; confirmed: number; picks: number; artifacts: number };
  };
  domains: DomainRow[];
  notExplored: string[];
  experiences: ExperienceCard[];
  gaps: GapRow[];
  industry: { name: string; demands: string[]; dims: DimRow[]; asked: { domain: string; axis: string; owned: boolean }[] } | null;
  otherIndustries: string[];
  role: { name: string; owns: string; decides: string[]; required: { axis: string; state: string }[]; material: string[]; differs: string[] } | null;
  region: {
    campus: string; cities: string[]; adjacent: string[];
    facts: OrgSet["region_facts"]; checkedOn: string; desired: string | null;
    readings: { text: string; layer: Layer }[];
  };
  companies: { local: CompanyCard[]; national: CompanyCard[]; note: string };
  resume: { frame: { label: string; hint: string; items: string[] }[]; paragraphs: { domain: string; lines: { label: string; text: string }[] }[]; portfolio: { name: string; domain: string }[] };
  interviews: InterviewItem[];
  plan: PlanRow[];
  appendix: {
    picks: { domain: string; decided: string[]; did: string[]; artifacts: string[]; verifications: string[] }[];
    versions: Record<string, string>;
    sources: { title: string; url: string; kind: string }[];
  };
};

function stateLayer(s: AxisState): Layer | null {
  return s === "NOT_OBSERVED" ? null : "RESPONSE";
}

function axisState(d: ResultDomain | undefined, ax: Axis): AxisState | "UNASKED" {
  if (!d || (!d.opened.deep && !d.opened.probe)) return "UNASKED";
  return d.axes.find((a) => a.axis === ax)?.state ?? "UNASKED";
}

function horizonOf(a: Action): string { return HORIZON_DAYS[a.horizon]; }

/** 결과물을 남겼다는 줄(`…를 문서로 남겼다` · `…한 벌`)은 판단이 아니다 */
function isArtifactLine(t: string): boolean {
  return /(남겼다|적어 두었다|한 벌|한 장)$/.test(t) || !/다$/.test(t);
}

/** 할 일 문장의 머리(`최근 ○○ 과제 하나.`)는 영역 칸이 이미 든다 */
function dropLead(t: string): string {
  return t.replace(/^(최근|다음)\s.+?\s과제\s하나\.\s*/, "");
}

const GAP_STATE: Record<Gap["kind"], string> = {
  REQUIRED_AXIS: "이 영역에서 꼭 있어야 하는 판단인데 응답에서 확인되지 않았습니다.",
  OUTPUT: "해 본 일은 있고, 남은 결과물이 확인되지 않았습니다.",
  OUTPUT_EVIDENCE: "결과물이 있다고 답했고, 고른 결과물 항목이 없습니다.",
  VERIFICATION: "결과를 무엇과 비교했는지가 확인되지 않았습니다.",
  AXIS: "응답에서 아직 확인되지 않은 판단입니다.",
  PARTIAL_EVIDENCE: "해 본 것은 확인됐고, 어디까지 직접 정했는지가 아직입니다.",
};
const GAP_WHY: Record<Gap["why"], string> = {
  REQUIRED_FOR_DOMAIN: "이 영역 지원서와 면접에서 가장 먼저 묻는 판단입니다.",
  BLOCKS_EVIDENCE: "이것이 있어야 경험을 지원서 근거로 쓸 수 있습니다.",
  NEEDED_BY_INDUSTRY: "목표로 고른 산업이 보는 판단입니다.",
  NEEDED_BY_ROLE: "관심 직무의 필수 판단입니다.",
};

function whyWords(core: string, w: Why, ind: (c: string) => string): string {
  switch (w.kind) {
    case "GOAL_INDUSTRY": return `목표 산업 ${ind(w.code)}`;
    case "INTEREST_INDUSTRY": return `관심 산업 ${ind(w.code)}`;
    case "ROLE": return `관심 직무 ${roleName(core, w.code)}`;
    case "DOMAIN": return `확인된 경험 ${w.codes.map((c) => domainName(core, c)).join(" / ")}`;
    case "ORG_TYPE": return "희망 조직 유형";
  }
}

/** 응답 품질은 **어떤 답이 어떻게 어긋났는지**까지 적는다(감사 4쪽: 어느 답인지 말하지 않았다) */
const QUALITY_REASON: Record<string, string> = {
  CHECKLIST_MISMATCH_HIGH: "‘내가 정했고 그 결과가 쓰였다’고 답한 판단 가운데 체크리스트에서 그 근거를 고르지 않은 것이 많습니다. ‘직접 정함’은 고른 근거가 둘 이상일 때만 세므로, 그런 판단은 ‘해 봤다’까지로 적혀 있습니다.",
  CHECKLIST_MISMATCH_LOW: "‘해 본 적 없다’고 답한 판단에 체크리스트 근거를 고른 경우가 있습니다. 응답 쪽을 따랐습니다.",
  LOW_VARIANCE_GRID: "열두 영역에 거의 같은 값으로 답하셔서 관심만으로는 영역 사이에 차이가 생기지 않았습니다.",
  CONSISTENCY_PAIR_GAP: "같은 경험을 묻는 두 문항의 답이 서로 다릅니다. 그 경험은 면접 전에 다시 정리해 두세요.",
  REVERSE_PAIR_AGREED: "같은 판단을 반대로 묻는 두 문항에 같은 쪽으로 답하셨습니다. 그 경험은 면접 전에 다시 정리해 두세요.",
};
function qualityKo(m: ResultModel): string {
  const r = m.response_quality.reasons.map((x) => QUALITY_REASON[x]).filter(Boolean);
  if (r.length) return r.join(" ");
  return QUALITY_KO[m.response_quality.flag as keyof typeof QUALITY_KO] ?? "";
}

export function assemble(m: ResultModel, meta: Meta, set: OrgSet = orgSet()): Report {
  const core = coreOf(m);
  const name = (td: string) => domainName(core, td);
  const ind = packs<{ packs: IndustryPack[] }>(core, "industry").packs;
  const rol = packs<{ packs: RolePack[] }>(core, "role").packs;
  const indName = (c: string) => ind.find((p) => p.code === c)?.name_ko ?? c;
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const explored = m.domains.filter((d) => d.opened.deep || d.opened.probe);

  /* ── 전공 역량 지도 ─────────────────────────────────────────── */
  const domains: DomainRow[] = m.domains.map((d) => ({
    code: d.code, name: name(d.code), zoneCode: d.zone, zone: ZONE_TITLE_KO[d.zone],
    interest: d.interest ? BAND[d.interest] : "—",
    experience: d.experience ? EXP[d.experience] : "—",
    learning: d.learning ? BAND[d.learning] : "—",
    depth: d.opened.deep ? "DEEP" : d.opened.probe ? "PROBE" : "NONE",
    owned: d.owned.map((a) => axisWord(core, a)),
    confirmed: d.confirmed.filter((a) => !d.owned.includes(a)).map((a) => axisWord(core, a)),
    empty: d.empty.map((a) => axisWord(core, a)),
  }));
  const notExplored = m.domains.filter((d) => !d.opened.deep && !d.opened.probe).map((d) => name(d.code));

  /* ── 핵심 경험: 먼저 볼 영역에서 고른 근거가 있는 것 둘 ────────── */
  const lead = [...m.overview.focus, ...m.overview.compare]
    .map((c) => byCode.get(c)).filter((d): d is ResultDomain => !!d)
    .filter((d) => d.did.length || d.decided.length).slice(0, 2);
  const experiences: ExperienceCard[] = lead.map((d) => ({
    code: d.code, name: name(d.code), zone: ZONE_TITLE_KO[d.zone],
    scene: studentActivity(core, d.code),
    decided: d.decided.filter((t) => !d.artifacts.includes(t) && !d.verifications.includes(t) && !isArtifactLine(t)).slice(0, 5),
    did: d.did.filter((t) => !d.decided.includes(t) && !d.artifacts.includes(t) && !d.verifications.includes(t)).slice(0, 5),
    artifacts: d.artifacts.slice(0, 4), verifications: d.verifications.slice(0, 3),
    missing: d.axes.filter((a) => a.state === "NOT_OBSERVED" || a.state === "PARTICIPATED").map((a) => axisWord(core, a.axis)),
    partial: m.gaps.filter((g) => g.domain === d.code && g.kind === "PARTIAL_EVIDENCE" && g.axis).map((g) => axisWord(core, g.axis!)),
    ownedAxes: d.owned.map((a) => axisWord(core, a)),
  }));

  /* ── Evidence & Gap ─────────────────────────────────────────── */
  const actById = new Map(m.actions.map((a) => [a.id, a]));
  const gaps: GapRow[] = [...m.gaps].sort((a, b) => a.rank - b.rank).slice(0, 8).map((g: Gap) => {
    const k = gapKo(g, name(g.domain));
    const a = g.action_id ? actById.get(g.action_id) : undefined;
    const keep = a ? (a.material.artifacts[0] ?? a.material.workflow?.output ?? "") : "";
    return {
      domain: name(g.domain),
      what: g.axis ? axisWord(core, g.axis) : k.title.split(" · ").slice(1).join(" · "),
      why: `${GAP_STATE[g.kind]} ${GAP_WHY[g.why]}`,
      how: a ? dropLead(actionKo(a, a.domain ? name(a.domain) : "", m.stage).do) : "—",
      keep, horizon: a ? horizonOf(a) : "—",
    };
  });

  /* ── 산업·직무 연결 ─────────────────────────────────────────── */
  const goalInd = m.targets.goal.industry && ind.some((p) => p.code === m.targets.goal.industry)
    ? m.targets.goal.industry : m.industry_context?.code ?? null;
  const ip = goalInd ? ind.find((p) => p.code === goalInd) : undefined;
  const industry = ip ? {
    name: ip.name_ko, demands: ip.demands,
    dims: ip.judgement_dimensions.map((j) => {
      const st = axisState(byCode.get(j.domain), j.axis);
      return {
        name: j.name, why: j.why, domain: name(j.domain), axis: axisWord(core, j.axis),
        state: st === "UNASKED" ? "이번에 묻지 않음" : AXIS_STATE_WORD[st],
        layer: st === "UNASKED" ? null : stateLayer(st),
      };
    }),
    asked: m.industry_context && m.industry_context.code === ip.code
      ? m.industry_context.answered.map((x) => ({ domain: x.domain ? name(x.domain) : "공통", axis: x.axis ? axisWord(core, x.axis) : "", owned: x.owned }))
      : [],
  } : null;
  const otherIndustries = [...new Set([...m.targets.industries, m.industry_context?.code ?? ""])]
    .filter((c) => c && c !== goalInd).map(indName);

  const goalRole = m.targets.goal.role && rol.some((p) => p.code === m.targets.goal.role)
    ? m.targets.goal.role : m.role_context?.code ?? null;
  const rp = goalRole ? rol.find((p) => p.code === goalRole) : undefined;
  const role = rp ? {
    name: rp.name_ko, owns: rp.owns ?? "", decides: rp.decides ?? [],
    required: (rp.required_axes ?? []).map((ax) => {
      const states = (rp.core_ref?.td ?? []).map((td) => axisState(byCode.get(td), ax));
      const best = states.includes("OWNED") ? "OWNED" : states.includes("CONFIRMED") ? "CONFIRMED"
        : states.includes("PARTICIPATED") ? "PARTICIPATED" : states.every((s) => s === "UNASKED") ? "UNASKED" : "NOT_OBSERVED";
      return { axis: axisWord(core, ax), state: best === "UNASKED" ? "이번에 묻지 않음" : AXIS_STATE_WORD[best as AxisState] };
    }),
    material: rp.application_material ?? [],
    differs: (rp.differs_from ?? []).map((x) => x.line),
  } : null;

  /* ── 지역 ─────────────────────────────────────────────────── */
  const uni = meta.school ? university("PCU") : null;
  const cities = uni?.region_cities ?? [];
  const region = {
    campus: cities[0] ?? "확인 전",
    cities, adjacent: ["충남", "충북(청주국제공항)"],
    facts: set.region_facts, checkedOn: set.checked_on,
    desired: null as string | null,
    readings: [
      { text: `대전 본사로 확인된 공공기관·공기업이 이 자료에 ${set.orgs.filter((o) => o.region === "DAEJEON" && (o.org_type === "PUBLIC_CORP" || o.org_type === "LOCAL_PUBLIC")).length}곳 있습니다. 경영기획 · 재무·회계 · 인사 같은 사무 직무를 지역 안에서 볼 수 있는 곳입니다.`, layer: "SOURCE2" as Layer },
      { text: "대덕연구개발특구 입주 기관이 3천 곳을 넘습니다. 연구 기관과 기술 기업의 경영지원 · 기술사업화 · 마케팅 쪽 일은 경영학과가 볼 수 있는 분야이지만, 이 자료에는 그 기업들의 이름이 아직 없습니다.", layer: "SOURCE2" as Layer },
      { text: "소비재·관광(제과 브랜드 · 컨벤션·관광 공기업) 쪽은 마케팅과 고객·서비스 운영 경험이 바로 이어지는 분야입니다.", layer: "ADVICE" as Layer },
      { text: "충남 아산의 대형 생산 사업장은 운영·원가·구매 쪽 경영 직무가 있을 수 있는 곳입니다. 사업장 위치는 확인했고 경영 직무의 근무지인지는 확인하지 않았습니다.", layer: "ADVICE" as Layer },
    ],
  };

  /* ── 기업 후보 ─────────────────────────────────────────────── */
  const picks: Picks = {
    goalIndustry: m.targets.goal.industry, industries: m.targets.industries,
    goalRole: m.targets.goal.role, roles: m.targets.roles, goalOrg: m.targets.goal.org,
    domains: m.domains.filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED" || d.zone === "Z2_EVIDENCE_INCOMPLETE").map((d) => d.code),
  };
  const cand = candidates(set, picks);
  const cardOf = (c: Candidate): CompanyCard => {
    const ds = (c.why.find((w) => w.kind === "DOMAIN") as { codes: string[] } | undefined)?.codes ?? [];
    const firstInd = ind.find((p) => p.code === c.org.industries[0]);
    const roles = c.org.roles.filter((r) => [m.targets.goal.role, ...m.targets.roles].includes(r))
      .concat(c.org.roles.filter((r) => ![m.targets.goal.role, ...m.targets.roles].includes(r)))
      .slice(0, 2).map((r) => roleName(core, r));
    const strengths = ds.map((td) => {
      const d = byCode.get(td)!;
      const own = d.owned.map((a) => axisWord(core, a));
      return own.length
        ? `${name(td)} — ${own.slice(0, 3).join(" · ")} (직접 정했다고 답함)`
        : `${name(td)} — ${d.confirmed.slice(0, 3).map((a) => axisWord(core, a)).join(" · ")} (해 봤다고 답함)`;
    });
    const lacks = m.gaps.filter((g) => c.org.domains.includes(g.domain)).slice(0, 2)
      .map((g) => `${name(g.domain)} — ${g.axis ? axisWord(core, g.axis) : gapKo(g, "").title}`);
    const acts = m.actions.filter((a) => a.domain && c.org.domains.includes(a.domain)).slice(0, 2);
    const prepare = acts.length
      ? acts.map((a) => `${a.material.artifacts[0] ?? a.material.workflow.output} (${name(a.domain!)})`)
      : (rol.find((p) => p.code === c.org.roles[0])?.application_material ?? []).slice(0, 2);
    const points = (firstInd?.demands ?? []).slice(0, 2);
    return { c, whyText: c.why.map((w) => whyWords(core, w, indName)), roles, strengths, lacks, prepare, points };
  };

  /* ── 지원서 · 면접 ──────────────────────────────────────────── */
  const frame = m.translation ? draftFrameKo(m.translation.steps) : [];
  const paragraphs = experiences.map((e) => ({
    domain: e.name,
    lines: [
      { label: "첫 문장 — 직접 정한 것", text: e.decided[0] ?? e.did[0] ?? "직접 기입" },
      { label: "방법", text: e.did[0] ?? "직접 기입" },
      { label: "남긴 것", text: e.artifacts[0] ? `${e.artifacts[0]} (파일로 갖춰 둘 것)` : "직접 기입" },
      { label: "무엇과 비교했나", text: e.verifications[0] ?? "직접 기입" },
      { label: "결과 · 수치 · 기간", text: "직접 기입 — 이 리포트는 성과와 수치를 만들지 않습니다" },
    ],
  }));
  const portfolio = m.domains.flatMap((d) => d.artifacts.map((a) => ({ name: a, domain: name(d.code) })));
  const interviews: InterviewItem[] = experiences.map((e) => {
    const qs: { q: string; from: string }[] = [];
    if (e.decided[0]) qs.push({ q: `‘${e.decided[0]}’고 답하셨는데, 그 기준은 무엇을 보고 정했나요?`, from: "고른 판단" });
    if (e.verifications[0]) qs.push({ q: `${withJosa(e.verifications[0], "과와")} 비교해 보니 무엇이 달랐나요?`, from: "고른 비교 대상" });
    const dim = ip?.judgement_dimensions.find((j) => j.domain === e.code);
    if (dim) qs.push({ q: `${ip!.name_ko} 쪽 질문: ${dim.name.replace(/가$/, "")}지, 이 경험에서 해당하는 장면은 무엇인가요?`, from: "목표 산업이 보는 판단" });
    if (e.missing[0]) qs.push({ q: `‘${e.missing[0]}’는 어떻게 하셨나요?`, from: "응답에서 아직 확인되지 않은 부분 — 미리 준비해 둘 질문" });
    return {
      domain: e.name, questions: qs.slice(0, 4),
      star: { s: e.scene, t: e.decided.slice(0, 2), a: e.did.slice(0, 2), r: e.artifacts.slice(0, 2) },
    };
  });

  /* ── 30·60·90일 ────────────────────────────────────────────── */
  const plan: PlanRow[] = m.actions.slice(0, 6).map((a) => ({
    when: horizonOf(a),
    what: actionKo(a, a.domain ? name(a.domain) : "", m.stage).do,
    keep: a.material.artifacts[0] ?? a.material.workflow?.output ?? "정리한 문서",
    check: a.material.verify_targets[0] ? `${withJosa(a.material.verify_targets[0], "과와")} 비교한 기록` : "검토한 사람의 의견",
    layer: "ADVICE",
  }));
  const top = [...cand.local].slice(0, 2).map((c) => c.org.name);
  if (top.length) {
    plan.push({ when: "30일", what: `${top.join(" · ")} 공식 홈페이지에서 채용 페이지와 직무 소개를 직접 확인하기`, keep: "기관별 확인 메모(확인한 날짜 · 주소)", check: "이 리포트의 2차 출처 내용과 같은지", layer: "ADVICE" });
    plan.push({ when: "60일", what: "확인한 직무 소개의 요구 조건을 위 할 일과 맞춰 보기", keep: "요구 조건 대조표", check: "비어 있는 판단이 줄었는지", layer: "ADVICE" });
  }
  plan.push({ when: "90일", what: "남긴 결과물 둘을 골라 지원서 문단 하나와 면접 답변 하나로 정리하기", keep: "지원서 문단 초안 · 답변 메모", check: "수치와 기간을 직접 채웠는지", layer: "ADVICE" });
  const order = { "30일": 0, "60일": 1, "90일": 2 } as Record<string, number>;
  plan.sort((a, b) => (order[a.when] ?? 9) - (order[b.when] ?? 9));

  /* ── 요약 ─────────────────────────────────────────────────── */
  const z1 = m.domains.filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED").map((d) => name(d.code));
  const z2 = m.domains.filter((d) => d.zone === "Z2_EVIDENCE_INCOMPLETE").map((d) => name(d.code));
  const ownedN = m.domains.reduce((n, d) => n + d.owned.length, 0);
  const confN = m.domains.reduce((n, d) => n + d.confirmed.length, 0);
  const picksN = m.domains.reduce((n, d) => n + d.did.length, 0);
  const artN = m.domains.reduce((n, d) => n + d.artifacts.length, 0);
  const g0 = gaps[0];
  const dimsOk = industry?.dims.filter((x) => x.layer).length ?? 0;
  const confirmed = z1.length
    ? `${z1.join(" · ")}에서 목표·기준을 직접 정한 경험이 응답과 고른 근거로 함께 확인됩니다.`
    : z2.length ? `${z2.join(" · ")}에서 해 본 일은 응답으로 확인되고, 고른 근거와 결과물이 아직 적습니다.`
      : "응답으로 확인된 판단이 아직 적습니다. 이 리포트의 대부분은 앞으로 채울 것을 적습니다.";
  const gap = g0 ? `가장 먼저 채울 것은 ${g0.domain}의 ‘${g0.what}’입니다. ${g0.why}` : "응답에서 먼저 채울 빈칸이 잡히지 않았습니다.";
  
  const direction = industry
    ? `목표로 고른 ${industry.name} 쪽이 보는 판단 ${industry.dims.length}가지 가운데 ${dimsOk}가지는 이번 응답에서 확인되거나 해 본 것으로 답하셨습니다.${role ? ` 관심 직무는 ${role.name}입니다.` : ""}`
    : "목표 산업을 고르지 않으셔서 산업 연결은 영역 기준으로만 적습니다.";

  const sources = [
    ...set.region_facts.map((f) => ({ title: f.source.title, url: f.source.url, kind: f.source.kind })),
    ...[...cand.local, ...cand.national].flatMap((c) => c.org.sources.map((s) => ({ title: `${c.org.name} — ${s.what}`, url: s.url, kind: s.kind }))),
  ].filter((s, i, xs) => xs.findIndex((y) => y.url === s.url && y.title === s.title) === i);

  return {
    core, meta, stage: m.stage,
    quality: qualityKo(m),
    summary: {
      confirmed, gap, direction,
      actions: m.actions.slice(0, 3).map((a) => ({ when: horizonOf(a), text: actionKo(a, a.domain ? name(a.domain) : "", m.stage).do })),
      counts: { explored: explored.length, owned: ownedN, confirmed: confN, picks: picksN, artifacts: artN },
    },
    domains, notExplored, experiences, gaps, industry, otherIndustries, role, region,
    companies: {
      local: cand.local.map(cardOf), national: cand.national.map(cardOf),
      note: "직업정보 제공이며 취업 알선·추천이 아닙니다. 기업이 이 직무를 모집한다는 뜻이 아니고, 채용 여부는 확인하지 않았습니다.",
    },
    resume: { frame, paragraphs, portfolio },
    interviews, plan,
    appendix: {
      picks: m.domains.filter((d) => d.did.length || d.decided.length || d.artifacts.length).map((d) => ({
        domain: name(d.code), decided: d.decided, did: d.did.filter((t) => !d.decided.includes(t)),
        artifacts: d.artifacts, verifications: d.verifications,
      })),
      versions: {
        major: coreEntry(core).name_ko ?? core,
        ...Object.fromEntries(Object.entries(m.provenance.module_versions).map(([k, v]) => [k, String(v)])),
        result_model: m.provenance.result_model_version,
      },
      sources,
    },
  };
}
