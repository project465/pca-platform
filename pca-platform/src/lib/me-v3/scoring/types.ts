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
/**
 * 영역 훑기에서 `잘 모르겠다` 를 보내는 값.
 *
 * **수가 아니다.** 문항 은행의 `option_values` 에서 그 자리는 `null` 이라
 * 보기 목록 안에 수가 없고, 어떤 코드도 그것을 가운데 값으로 쓸 수 없다.
 * 화면이 이 글자를 보내고 `normalize/read` 가 `ANSWERED_UNKNOWN` 으로 받는다.
 *
 * 여기 둔 까닭은 **화면과 판정이 같은 글자를 봐야** 하는데 화면은 브라우저에서
 * 돌고 판정 쪽 파일은 파일시스템을 끌고 들어오기 때문이다.
 */
export const UNKNOWN = "UNKNOWN";

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
  /**
   * 실제로 화면에 선 팩 문항의 목록.
   *
   * 산업 판단은 비어 있는 축을 먼저 세우고 여섯에서 끊고, 둘째 역할은
   * 앞머리 셋만 묻는다. **묻지 않은 문항을 공백으로 적지 않으려고** 열린
   * 목록을 응시가 들고 다닌다. 비어 있으면 상한 없이 전부 센다(옛 응시).
   */
  asked?: string[];
};

/**
 * 빈 것의 뜻 다섯.
 *
 * `ANSWERED_UNKNOWN` 이 다섯째로 들어온 까닭이 이렇다. 영역 훑기의 관심과
 * 배울 뜻에 `잘 모르겠다` 가 있는데, 그 보기를 **가운데 값**으로 두고
 * 있었다. 그러면 **아직 모르는 사람이 보통 관심으로 판정된다.** 모른다는
 * 것은 중간 수준을 뜻하지 않는다. 정보가 없다는 뜻이다. 값 자리에 수를 두지 않고
 * 상태로 보존해서, 결과지가 그 영역을 `보통 관심` 으로 적는 대신 `아직
 * 고르지 않았다` 로 적는다.
 */
export type MissingKind =
  | "NOT_ROUTED" | "SKIPPED" | "ANSWERED_NONE" | "ANSWERED_UNKNOWN"
  | "NONE_MISSING";

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
    /**
     * 영역에 붙지 않는 판단. **받고 쓰지 않는 자리를 0 으로 두려고 둔다.**
     *
     * 공통 판단 여섯과 학위 묶음 여섯은 기술영역에 붙지 않는다. 그래서
     * 영역 판정에는 들어가지 않고, 들어갈 자리도 없었다: 응답을 받아 두고
     * **어느 코드도 읽지 않았다.** blueprint 는 그 자리가 결과 절로 간다고
     * 적고 있었고 `v3:migrate` 의 `받고 쓰지 않는 문항 0` 은 그 적힌 값을
     * 셌다. 적어 둔 것과 읽는 것은 다른 일이다.
     *
     * 여기 담는 것은 축마다의 소유 수준이고, 결과지가 `지원서에 연결할 수
     * 있는 경험` 과 `직무로 번역` 에서 읽는다.
     */
    common: CommonJudgement[];
    /**
     * 같은 값으로 묶인 영역 둘 가운데 고르신 쪽.
     *
     * **차례를 만들지 않는다.** 묶음 안에 순위를 세우는 값이 아니고, 고른
     * 것을 그대로 돌려주는 값이다. 전에는 이 응답을 받아 두고 어느 코드도
     * 읽지 않아서, 두 번 고르고도 결과지에 한 글자도 나오지 않았다.
     */
    forced: { item_id: string; choice: string }[];
    /**
     * 타계열 대학원의 번역 맥락 넷.
     *
     * **축 수준에 들어가지 않는다.** 기계공학 Core 의 판정이 다른 전공의
     * 경험으로 서면 안 된다. 결과지가 경험을 직무 말로 옮길 때만 읽는다.
     */
    xfield: { item_id: string; choice: string }[];
  };
  /** 개발자가 되짚는 자리. 사람이 읽는 말이 아니다 */
  trace: string[];
};

/** 영역에 붙지 않는 판단 하나. 공통 판단과 학위 묶음에서 온다 */
export type CommonJudgement = {
  item_id: string;
  /** 어느 묶음인가. 학위 묶음은 학위마다 다르다 */
  block: string;
  axis: Axis;
  ownership: Ownership;
  /** 받아 쓴 것 위인가. 확인으로 세는 선과 같다 */
  confirmed: boolean;
  missing: MissingKind;
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
  /**
   * 그 팩의 문항에 실제로 답한 내용.
   *
   * **Core 판정에 한 글자도 들어가지 않는다.** 팩 문항은 영역 축 수준을
   * 만들지 않고(`engine.ts` 가 선별·심화 묶음만 센다), 여기 담긴 값은
   * 결과지의 산업·역할 절만 읽는다. 그래서 산업을 바꿔도 Core 지문이
   * 같다.
   *
   * 담아 두는 까닭은 하나다. 전에는 산업 문항 여든과 역할 문항 쉰여섯의
   * 응답을 **받아 두고 어느 코드도 읽지 않았다.** 고르고 답했는데 결과지에
   * 한 글자도 돌아오지 않으면 그 자리는 묻지 않는 것이 맞다.
   */
  answers: PackAnswer[];
};

/** 팩 문항 하나의 응답. 소유 수준까지만이고 축 수준을 만들지 않는다 */
export type PackAnswer = {
  item_id: string;
  domain: string | null;
  axis: Axis | null;
  ownership: Ownership;
  /** 받아 쓴 것 위인가 */
  confirmed: boolean;
  missing: MissingKind;
};
