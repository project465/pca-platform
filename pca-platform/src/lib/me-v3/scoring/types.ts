/** ME_V3 판단 엔진이 받는 것과 내놓는 것 */
import type { Ownership } from "./ownership";
import type { ReasonCode } from "./reason-codes";
import type { ModuleVersions } from "./version";

export type Tier = "BASIC" | "STANDARD" | "PRO";
export type Stage = "bachelor" | "master" | "phd" | "postdoc";
export type GradField =
  | "STEM" | "HUMANITIES_SOCIAL" | "BUSINESS" | "OTHER_INTERDISCIPLINARY";

/**
 * 학부 전공이 기계공학 계열인가.
 *
 * 기계공학 Core 는 **비이공계 대학원생을 받지 않는다.** 받으면 기계공학의
 * 축 수준이 다른 전공의 경험으로 서고, 그 결과지는 기계공학 진로를 말하는
 * 척하면서 다른 것을 재고 있다. 다만 **학부가 기계공학이고 대학원만
 * 타계열인 사람은 기계공학 경험이 실제로 있다.** 그 사람은 받고, 대학원
 * 경험은 축 수준이 아니라 번역 맥락으로만 다룬다.
 */
export type UndergradCore = "ME" | "OTHER";
export type Axis = "J1" | "J2" | "J3" | "J4" | "J5" | "J6" | "J7" | "J8";

/**
 * 응답 하나. **빈 것의 뜻을 넷으로 가른다.**
 *
 * 문항이 열리지 않은 것과, 봤는데 답하지 않은 것과, 겪은 적이 없다고
 * 답한 것과, 근거가 확인되지 않은 것은 서로 다른 상태다. 하나로 뭉개면
 * 결과지가 안 물어본 것을 `없다` 로 적는다.
 */
export type Answer =
  /** 보기 넷(L0~L3). `index` 는 0에서 3 */
  | { kind: "level"; index: number }
  /** 5점 */
  | { kind: "scale5"; value: number }
  /** 격자의 경험 칸. 0 없음 · 1 한두 번 · 2 여러 번 */
  | { kind: "exposure"; value: number }
  /** 고르기(강제 선택 · 목표 · 번역 보기) */
  | { kind: "choice"; value: string }
  /** 봤는데 답하지 않았다 */
  | { kind: "skipped" };

export type Submission = {
  attempt_id: string;
  tier: Tier;
  stage: Stage;
  /** 석사 이상만 받는다. 학사는 `null` */
  grad_field: GradField | null;
  /** 석사 이상이고 대학원이 타계열일 때만 본다. 학사는 `null` */
  undergrad_core?: UndergradCore | null;
  /** 열린 문항의 응답. 키에 없으면 **routing 밖**이다 */
  answers: Record<string, Answer>;
  /** 축마다 고른 판단 체크리스트 항목. 키는 `TD02.J3` */
  checklists?: Record<string, string[]>;
  /** 영역마다 고른 산출물 */
  artifacts?: Record<string, string[]>;
  /** 영역마다 고른 검증 대상 */
  verifications?: Record<string, string[]>;
  /** 선별과 심화를 연 영역 */
  opened?: { probe: string[]; deep: string[] };
  /** 관심 산업 최대 둘. 깊이 묻는 것은 그 가운데 하나다 */
  industry_interest?: string[];
  /** 관심 역할 최대 둘 */
  role_interest?: string[];
  /** 선호 조직유형 최대 둘. **점수에 들어가지 않는다** */
  org_interest?: string[];
  industry_pack?: string | null;
  role_pack?: string | null;
};

export type MissingKind =
  | "NOT_ROUTED" | "SKIPPED" | "ANSWERED_NONE" | "NONE_MISSING";

export type AxisState = "NOT_OBSERVED" | "PARTICIPATED" | "CONFIRMED" | "OWNED";

export type AxisResult = {
  axis: Axis;
  state: AxisState;
  /** 어느 문항에서 왔는가. 한 칸에 문항이 둘인 자리가 있다 */
  from: { item_id: string; ownership: Ownership }[];
  /** 체크리스트와 산출물과 검증에서 온 근거의 수 */
  evidence: number;
  evidence_keys: string[];
  missing: MissingKind;
  /** 왜 그 상태인지 한 줄. 사람이 읽는 말이 아니고 규칙 이름이다 */
  rule: string;
};

export type Band = "LOW" | "MID" | "HIGH";
export type Zone =
  | "Z1_EVIDENCE_ESTABLISHED"
  | "Z2_EVIDENCE_INCOMPLETE"
  | "Z3_EVIDENCE_LOW_INTEREST"
  | "Z4_INSUFFICIENT_EVIDENCE"
  | "NOT_EXPLORED";

export type Quadrant = "A_HIGH_HIGH" | "B_HIGH_LOW" | "C_LOW_HIGH" | "D_LOW_LOW";

export type DomainResult = {
  code: string;
  /** 다섯 신호를 합치지 않는다 */
  interest: { raw: number | null; band: Band | null; missing: MissingKind };
  experience: { raw: number | null; label: "NONE" | "ONCE_OR_TWICE" | "SEVERAL" | null;
                missing: MissingKind };
  learning: { raw: number | null; band: Band | null; missing: MissingKind };
  axes: Record<Axis, AxisResult>;
  confirmed: Axis[];
  owned: Axis[];
  participated: Axis[];
  empty: Axis[];
  required: Axis[];
  required_ok: boolean;
  output_ok: boolean;
  output_evidence_ok: boolean;
  verification_ok: boolean;
  /** 선별 네 축 가운데 확인된 수와 여덟 축 가운데 확인된 수. **합치지 않는다** */
  confirmed_screen: number;
  confirmed_all: number;
  opened: { probe: boolean; deep: boolean };
  zone: Zone;
  reasons: ReasonCode[];
  next: ReasonCode[];
  quadrant: Quadrant | null;
  trace: string[];
};

export type ResponseQuality = {
  flag: "OK" | "REVIEW" | "LOW_VARIANCE" | "INCONSISTENT";
  reasons: ReasonCode[];
  detail: string[];
};

export type TierLimits = {
  /** BASIC 은 근거가 섰다는 판정을 내놓지 않는다 */
  allows_evidence_established: boolean;
  allows_axis_names: boolean;
  allows_translation: boolean;
  deep_axes: boolean;
};

export type Snapshot = {
  attempt_id: string;
  tier: Tier;
  stage: Stage;
  grad_field: GradField | null;
  undergrad_core: UndergradCore | null;
  module_versions: ModuleVersions;
  tier_limits: TierLimits;
  domains: DomainResult[];
  /** 묶음별 영역 목록. 차례를 만들지 않는다 */
  zones: Record<Zone, string[]>;
  /** 같은 상태로 묶여 차례를 만들 수 없는 영역 */
  tied: string[][];
  /** 첫 쪽에 올리는 영역. 근거가 선 쪽이 먼저고, 없으면 덜 선 쪽,
   *  그것도 없으면 관심이 높은 쪽이다. **묶음 안에서 차례를 만들지 않는다** */
  focus: string[];
  response_quality: ResponseQuality;
  /** 선호와 목표와 번역은 Core 판정에 들어가지 않는다 */
  context: {
    /**
     * 고른 관심 역할과 선호 조직유형. **점수에 들어가지 않는다.**
     *
     * 전에는 일곱 역할과 일곱 조직을 다섯 점 척도로 받았다. 열네 줄을
     * 받아 결과지에 한 글자도 쓰지 않았다. 고르기로 바꾸고 둘까지만
     * 받는다: routing 과 결과 맥락이 읽는다.
     */
    role_interest: string[];
    org_interest: string[];
    industry_interest: string[];
    target: Record<string, string>;
    translation_steps: string[];
    industry: PackContext | null;
    role: PackContext | null;
  };
  /** 개발자가 되짚는 자리. 사람이 읽는 말이 아니다 */
  trace: string[];
};

export type PackContext = {
  code: string;
  version: string | null;
  /** 설명하는 순서만 바꾼다. 축 수준과 묶음에는 들어가지 않는다 */
  explain_order: Axis[];
  domains_in_focus: string[];
  /** 그 산업이나 역할이 더 보는 축이 비어 있는 자리 */
  requested_evidence: { domain: string; axis: Axis }[];
  compare_with: string[];
  vocabulary: string[];
};
