/**
 * 긴 결과지(PRO 책자)가 읽는 자료의 모양.
 *
 * Core 마다 파일 이름은 다르지만 모양은 같다. 등록부(`major-cores.json`)가
 * 가리키는 파일을 이 모양으로 읽는다. 파일 이름을 코드에 적지 않는다.
 */
import type { Axis } from "../scoring/types";
import type { ResultModel } from "../result/model";
import type { CoreEntry } from "../core-registry";
import type { Experience } from "../platform";

export type Level = 0 | 1 | 2 | 3;

export type DomainDef = {
  code: string; name: string; required_axes: Axis[];
  workflow: { step: number; name: string; detail: string }[];
  tools: string[]; artifacts: string[]; verify_targets: string[];
  axes: Record<Axis, { l2: string; l3: string }>;
  org_outcomes?: Record<string, string>;
};

export type TaxDomain = { code: string; name: string; owns: string; subareas: string[]; required_axes: Axis[] };
export type Taxonomy = {
  technical_domains: TaxDomain[];
  role_functions: { code: string; name: string; one_line: string; output_kind: string; success: string }[];
  org_contexts: { code: string; name: string; performance: string; differs: string }[];
  job_aliases: { posting_name: string; td: string[]; rf: string[]; oc: string[]; distinguisher: string }[];
  boundaries: {
    pair: string; a: { td: string; rf: string }; b: { td: string; rf: string };
    shared: string; a_difference: string; b_difference: string; a_question: string; b_question: string;
  }[];
};

export type Strength = "중심" | "있음" | "드묾";
export type Relations = {
  td_industry: { td: string; industry: string; strength: Strength; appears_as: string; axes_watched: Axis[]; dimensions?: string[] }[];
  td_role: { td: string; role: string; strength: Strength; appears_as: string; axes_watched: Axis[] }[];
};

export type RolePack = {
  code: string; name_ko: string; owns: string; decides: string[]; required_axes: Axis[];
  core_ref: { td: string[]; rf?: string[] };
  differs_from: { vs: string; line: string }[]; compare_with: string[]; application_material: string[];
  items: { id: string; axis: Axis; domain: string; ask: string }[];
};

export type IndustryPack = {
  code: string; name_ko: string; demands: string[]; scene: string;
  judgement_dimensions: { name: string; axis: Axis; domain: string; why: string }[];
  items: { id: string; axis: Axis; domain: string; ask: string; gloss?: string }[];
  gap_language?: Partial<Record<Axis, string>>;
  result_line?: string;
  evidence_reading?: { same: string; reads_as: string }[];
  job_aliases?: string[];
  org_mix?: Record<string, string>;
  vocabulary?: string[];
};

export type Checklists = { domains: Record<string, Partial<Record<Axis, { text: string }[]>>> };

/** 직무 일반 안내 한 직무(`role-guide.v1`). 측정·채점에 쓰이지 않는다 */
export type RoleGuide = {
  summary: string; practiceWhere: string;
  lens: Record<string, { why: string; mode: "domain" | "role"; ctx: string; out?: Partial<Record<Axis, string>> }>;
  practice: Partial<Record<Axis, { task: string; output: string; check: string }>>;
  responsibilities: string[];
  process: { step: string; what: string }[];
  knowledge: string[]; tools: string[]; experiences: string[]; entry: string[];
  learnOrder: { step: string; why: string }[];
  firstProject: { title: string; goal: string; steps: string[]; output: string; check: string };
  portfolio: string[]; interview: { axis: Axis; q: string; why: string }[]; postingCheck: string[]; watch: string;
};

export type GuideState = {
  /** OK: 직무 여덟이 다 있다 · PARTIAL: 일부만 · MISSING: 파일이 없다 · INVALID: 읽을 수 없다 */
  status: "OK" | "PARTIAL" | "MISSING" | "INVALID";
  file: string | null;
  roles: Record<string, RoleGuide>;
  missingRoles: string[];
  note: string | null;
};

export type RegionKey = "sejong" | "jeonbuk" | "chungcheong";

export type Inputs = {
  attemptId: string;
  tier: string;
  userId: string;
  /** 사람 이름(`users.display_name`). 없으면 `응시자` */
  person: string;
  coreCode: string;
  core: CoreEntry;
  /** 전공(Core) 이름 */
  major: string;
  /** 학교 진입이면 학과 이름 */
  department: string | null;
  /** 학과의 갈래 이름(`국어국문·한국어교육`). 학교 진입이 아니면 비어 있다 */
  specialization: string | null;
  /**
   * 그 학과라면 먼저 보는 영역 · 남기는 것 · 한 걸음 · 지원서와 면접에서 꺼내는 법
   * (`result/spec-view.ts`). 웹 결과가 읽는 것과 같은 자리에서 읽는다
   */
  spec: import("../result/spec-view").SpecView;
  school: string | null;
  /** 발행 기관: 학교·기관 이름, 없으면 CareerMatri */
  issuer: string;
  issuerCode: string | null;
  answeredOn: string;
  m: ResultModel;
  defs: DomainDef[];
  tax: Taxonomy;
  rel: Relations;
  roles: RolePack[];
  inds: IndustryPack[];
  checklists: Checklists;
  guide: GuideState;
  exps: Experience[];
  region: RegionKey | null;
  /** 영역을 부르는 말(`기술영역` · `업무 영역` …) */
  domainWord: string;
  /** 쪽을 만든 날 */
  builtOn: string;
};
