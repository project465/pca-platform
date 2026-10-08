/**
 * 결과 모델. **새로운 판단을 만들지 않는다.**
 *
 * source of truth 는 `scoring snapshot` 하나다. 여기서 하는 일은 그
 * 스냅샷을 **사람이 읽는 차례로 다시 묶는 것**뿐이고, 점수를 다시 세거나
 * 묶음을 다시 정하지 않는다. 그것을 `v3:result` 가 센다: 같은 스냅샷을
 * 두 번 넣으면 같은 모델이 나오고, 모델의 묶음이 스냅샷의 묶음과 글자까지
 * 같다.
 *
 * **한국어가 여기 없다.** 모델은 코드와 응시자가 고른 항목만 들고 다니고,
 * 문장은 `text.ko.ts` 가 만든다. 영어판을 여는 날 번역만 늘리고 모델을
 * 고치지 않는다.
 */
import type { ReasonCode } from "../scoring/reason-codes";
import type {
  Axis, AxisState, Band, GradField, MissingKind, Stage, Tier, Zone,
} from "../scoring/types";
import type { ModuleVersions } from "../scoring/version";

/** 첫 화면 한 줄의 근거. 문장이 아니라 처지의 이름이다 */
export type HeadlineCode =
  /** 근거가 선 영역이 있다 */
  | "EVIDENCE_READY"
  /** 경험은 있고 아직 근거가 덜 섰다 */
  | "EVIDENCE_PARTIAL"
  /** 관심은 또렷하고 겪어 본 것이 적다 */
  | "EXPLORING"
  /** 아직 판단할 근거가 거의 없다 */
  | "NO_EVIDENCE";

/** 무엇이 비어 있는가 */
export type GapKind =
  | "REQUIRED_AXIS" | "OUTPUT" | "OUTPUT_EVIDENCE" | "VERIFICATION" | "AXIS"
  /**
   * 해 본 것은 확인됐고 직접 정했다고 보기에는 근거가 모자란 축.
   *
   * **비어 있는 것과 반쯤 선 것을 한 칸에 두지 않는다.** 둘을 섞으면
   * 첫 화면이 `채울 것이 없다` 와 `아직 못 해봤다` 를 같은 뜻으로 쓴다.
   */
  | "PARTIAL_EVIDENCE";

/** 왜 그 자리가 중요한가. **`부족합니다` 로 끝내지 않는 까닭이 이 칸이다** */
export type GapWhy =
  | "REQUIRED_FOR_DOMAIN"
  | "BLOCKS_EVIDENCE"
  | "NEEDED_BY_INDUSTRY"
  | "NEEDED_BY_ROLE";

/** 다음에 할 일. 막연한 말을 쓰지 않으려고 코드로 둔다 */
export type ActionCode =
  | "BUILD_OUTPUT" | "ADD_VERIFICATION" | "FILL_AXIS"
  | "TRY_SHORT_EXPERIENCE" | "STUDY_NEXT" | "RECHECK_DIRECTION"
  /** 어느 영역도 앞서지 않았다. **없는 차례를 지어내지 않고 그 사실을 적는다** */
  | "EXPLORE_BROADLY"
  /** 근거는 다 섰다. 남은 일은 그것을 설명할 문장으로 만드는 것이다 */
  | "WRITE_UP"
  /** 해 본 것은 확인됐다. 남은 일은 어디까지 직접 정했는지를 적는 것이다 */
  | "DEEPEN_OWNERSHIP";

export type Horizon = "NOW" | "NEXT" | "LATER";

/** 첫 화면 세 번째 칸이 가리키는 곳 */
export type FirstMove =
  /** 비어 있는 자리가 있다. 그 자리를 적는다 */
  | "FILL_GAP"
  /** 빈자리는 없고 근거가 섰다. 남은 일은 정리다 */
  | "WRITE_UP"
  /** 여덟 축을 묻지 않았다. 지금 해볼 것을 적는다 */
  | "TRY"
  /** 정말 아무것도 없다 */
  | "NONE";

/** 여덟 축을 묻지 않은 응시의 영역 묶음. 관심과 배울 뜻에서만 온다 */
export type BasicGroups = {
  /** 관심도 배울 뜻도 높다 */
  do_now: string[];
  /** 둘 가운데 하나가 높거나 관심이 보통이다 */
  scan: string[];
  /** 관심이 낮다 */
  low: string[];
  /** 이번에 묻지 않았다 */
  unseen: string[];
};

export type AxisView = {
  axis: Axis;
  state: AxisState;
  /** 응시자가 그 축에서 고른 항목. **그 사람의 답을 그대로 돌려준다** */
  picks: string[];
  evidence: number;
  /** 어느 문항에서 왔는가. 화면에 내보내지 않는다 */
  from: string[];
  missing: MissingKind;
};

export type ResultDomain = {
  code: string;
  zone: Zone;
  opened: { probe: boolean; deep: boolean };
  interest: Band | null;
  experience: "NONE" | "ONCE_OR_TWICE" | "SEVERAL" | null;
  learning: Band | null;
  axes: AxisView[];
  /** 확인된 축에서 고른 항목. `실제 해본 일` */
  did: string[];
  /** 직접 정한 것으로 확인된 축에서 고른 항목. `직접 판단한 일` */
  decided: string[];
  /** 남긴 것 */
  artifacts: string[];
  /** 무엇과 비교했는가 */
  verifications: string[];
  confirmed: Axis[];
  owned: Axis[];
  empty: Axis[];
  required: Axis[];
  reasons: ReasonCode[];
  next: ReasonCode[];
  /** 되짚는 자리. 화면에 내보내지 않는다 */
  trace: string[];
};

/** 지금 쓸 수 있는 근거 한 덩이 */
export type EvidenceGroup = {
  domain: string;
  axis: Axis;
  state: AxisState;
  picks: string[];
};

export type Gap = {
  id: string;
  domain: string;
  axis: Axis | null;
  kind: GapKind;
  why: GapWhy;
  reason: ReasonCode;
  /** 1 이 가장 급하다. 묶음과 필수 축에서 온다 */
  rank: number;
  action_id: string | null;
};

export type Action = {
  id: string;
  /** 영역이 정해지지 않는 할 일은 `null` */
  domain: string | null;
  axis: Axis | null;
  code: ActionCode;
  horizon: Horizon;
  from_gap: string | null;
  /** 그 영역의 자료에서 가져온 재료. 문장은 `text.ko.ts` 가 만든다 */
  material: {
    artifacts: string[];
    verify_targets: string[];
    checklist_hint: string[];
    /** 그 영역이 실제로 일하는 차례. 할 일을 영역마다 다르게 적는 재료 */
    workflow: { decide: string; method: string; output: string; on_fail: string };
  };
};

export type PackView = {
  code: string;
  version: string | null;
  /** 설명하는 차례. 그 산업이나 역할이 더 보는 축이 앞이다 */
  explain_order: Axis[];
  /** 그 산업·역할이 보는 영역 가운데 근거가 선 것 */
  established: { domain: string; axes: Axis[] }[];
  /** 그 산업·역할이 더 보는 축 가운데 아직 비어 있는 것 */
  requested: { domain: string; axis: Axis }[];
  /** 같이 놓고 볼 역할 */
  compare_with: string[];
  vocabulary: string[];
  /** 고르지 않은 나머지. **부적합이라고 적지 않는다** */
  others: string[];
};

export type TranslationView = {
  steps: { item_id: string; choice: string | null }[];
  /** 번역에서 드러난 영역 */
  domains: string[];
};

export type ResultModel = {
  schema: "me-v3-result.1";
  attempt_id: string;
  tier: Tier;
  stage: Stage;
  grad_field: GradField | null;
  provenance: {
    module_versions: ModuleVersions;
    result_model_version: string;
    /** 스냅샷의 되짚는 글 길이. 모델이 스냅샷을 그대로 읽었다는 표시 */
    snapshot_trace: number;
  };
  /** 등급이 무엇까지 말할 수 있는가. 스냅샷의 것을 그대로 옮긴다 */
  limits: {
    allows_evidence_established: boolean;
    allows_axis_names: boolean;
    allows_translation: boolean;
    deep_axes: boolean;
  };
  overview: {
    headline: HeadlineCode;
    /** 먼저 볼 영역 */
    focus: string[];
    /** 같이 놓고 볼 영역 */
    compare: string[];
    /** 아직 판단하기 어려운 영역 */
    unclear: string[];
    /** 근거는 있고 관심이 낮은 영역 */
    low_interest: string[];
    /** 이번에 열지 않은 영역 */
    not_explored: string[];
    /** 같은 상태로 묶여 차례를 만들 수 없는 영역 */
    tied: string[][];
    counts: {
      domains: number;
      confirmed_axes: number;
      owned_axes: number;
      evidence_items: number;
    };
    top_gap: string | null;
    top_action: string | null;
    /** 응답만으로 어느 영역도 앞서지 않았다 */
    no_basis: boolean;
    /**
     * 첫 화면이 세 번째 칸에 무엇을 적을 것인가.
     *
     * **`비어 있는 자리가 없다` 와 `더 할 것이 없다` 를 같은 뜻으로 쓰지
     * 않으려고 둔 칸이다.** 여덟 축을 묻지 않은 응시에는 빈자리를 셀 근거가
     * 없으니 `TRY` 로 가고, 빈자리가 없고 근거가 선 사람은 `WRITE_UP` 으로
     * 간다. `NONE` 은 정말 아무것도 없을 때 하나뿐이다.
     */
    first_move: FirstMove;
    /**
     * 여덟 축을 묻지 않은 응시의 영역 네 묶음.
     *
     * 관심과 배울 뜻에서 **그 사람이 답한 것만으로** 묶는다. 근거를 재지
     * 않았으니 여기에 Evidence 판정이 섞이면 안 된다. 깊게 물은 응시는
     * `null` 이고 묶음은 Z1~Z4 를 쓴다.
     */
    basic_groups: BasicGroups | null;
  };
  domains: ResultDomain[];
  evidence: {
    /** 지원서와 면접에서 바로 설명할 수 있는 것 */
    ready: EvidenceGroup[];
    /** 경험은 있고 설명 재료가 아직 모자란 것 */
    partial: EvidenceGroup[];
    /** 앞으로 만들 것 */
    missing: Gap[];
  };
  gaps: Gap[];
  actions: Action[];
  industry_context: PackView | null;
  role_context: PackView | null;
  translation: TranslationView | null;
  response_quality: { flag: string; reasons: ReasonCode[] };
};
