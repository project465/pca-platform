/**
 * 무엇을 재는가와 어떻게 받는가. **두 표를 따로 두고 짝만 맞춰 본다.**
 *
 * 전에는 자동검사가 `measurement_axis` 와 `evidence_axis` 를 보고 construct 를
 * **추론**했다. 그 추론이 `axis_level` 하나를 소유와 산출물과 검증 셋으로
 * 갈라 읽고 있어서, **문면과 보기가 어긋난 문항을 통과시켰다**:
 * `CJ_GIVEN_REV` 의 문면은 선호를 묻는데 보기는 소유 사다리 넷인데도
 * `common_judgement` 라는 선언만 보고 `Judgment × OWNERSHIP_4` 로 읽어
 * 맞다고 셌다.
 *
 * 그래서 짝을 추론하지 않는다. 문항마다 **primary construct 하나**를 적어
 * 두고(`me-v3-2-constructs.json`), 그 construct 가 그 response type 을
 * 받아도 되는지만 이 표로 본다. 적혀 있지 않은 문항은 `UNKNOWN_CONSTRUCT`
 * 로 걸린다: 새 문항을 더하는 사람이 한 줄을 적어야 검사가 지나간다.
 */
import { coreFile } from "../core-registry";

/**
 * 재는 것 열셋.
 *
 * `ROUTING_ONLY` 가 있는 까닭은, 다음에 무엇을 물을지만 정하고 판정에는 한
 * 글자도 들어가지 않는 입력이 있기 때문이다. 그것을 Preference 로 적으면
 * 선호를 쟀다고 말하게 된다.
 */
export const CONSTRUCTS = [
  "INTEREST", "LEARNING_INTENT", "EXPERIENCE", "OWNERSHIP", "JUDGMENT",
  "EVIDENCE", "OUTPUT", "VERIFICATION", "PREFERENCE", "ROUTING_ONLY",
  "CONSISTENCY", "TRANSLATION", "GOAL",
] as const;
export type Construct = typeof CONSTRUCTS[number];

/** 어떻게 받는가. **construct 와 따로 적는다** */
export const RESPONSE_TYPES = [
  "LIKERT_5", "OWNERSHIP_4", "EXPOSURE_3", "SINGLE_CHOICE", "FORCED_CHOICE",
  "MULTI_SELECT", "EVIDENCE_PICK", "CHOICE_WITH_NOTE", "FREE_TEXT",
] as const;
export type ResponseType = typeof RESPONSE_TYPES[number];

/** 문항 은행의 `response_scale` 글자를 response type 으로 옮긴다 */
export const SCALE_TO_TYPE: Record<string, ResponseType> = {
  "L0~L3": "OWNERSHIP_4",
  "5보기": "LIKERT_5",
  "3보기": "EXPOSURE_3",
  "고르기": "SINGLE_CHOICE",
  "둘 중 하나": "FORCED_CHOICE",
  "보기 선택 + 한 줄": "CHOICE_WITH_NOTE",
};

/**
 * 짝 표. **여기 없는 조합은 걸린다.**
 *
 * 선이 둘이다. 태도·선호는 정도를 묻는 척도로 받고, 행동과 소유는 **누가
 * 했는가**를 받는다. 그 둘을 섞으면 응답이 무엇을 뜻하는지 정할 수 없다:
 * `조건을 받아 쓰는 쪽이 편하다` 를 `내가 정하고 그 결과가 쓰였다` 수준으로
 * 골랐다는 말이 성립하지 않는다.
 */
export const COMPATIBLE: Record<Construct, ResponseType[]> = {
  INTEREST: ["LIKERT_5"],
  LEARNING_INTENT: ["LIKERT_5"],
  /** 횟수다. 다섯으로 늘리면 받고 쓰지 않는 값이 생긴다 */
  EXPERIENCE: ["EXPOSURE_3"],
  OWNERSHIP: ["OWNERSHIP_4"],
  JUDGMENT: ["OWNERSHIP_4"],
  OUTPUT: ["OWNERSHIP_4", "MULTI_SELECT", "EVIDENCE_PICK"],
  VERIFICATION: ["OWNERSHIP_4", "MULTI_SELECT", "EVIDENCE_PICK"],
  /** 점수가 아니라 무엇이 남았는가다 */
  EVIDENCE: ["EVIDENCE_PICK", "MULTI_SELECT"],
  PREFERENCE: ["LIKERT_5", "SINGLE_CHOICE", "FORCED_CHOICE"],
  ROUTING_ONLY: ["SINGLE_CHOICE", "FORCED_CHOICE", "MULTI_SELECT"],
  /** 짝과 어긋나는지만 본다. 소유 사다리를 두 장면에서 받는다 */
  CONSISTENCY: ["OWNERSHIP_4"],
  TRANSLATION: ["CHOICE_WITH_NOTE", "SINGLE_CHOICE", "MULTI_SELECT"],
  GOAL: ["SINGLE_CHOICE", "MULTI_SELECT"],
};

export type ConstructRow = {
  item_id: string;
  /** 정확히 하나다 */
  primary: Construct;
  /** 곁다리로 하는 일. 판정에 쓰는 것은 `primary` 뿐이다 */
  secondary?: Construct[];
  /** 은행의 `response_scale` 에서 옮긴 값. 둘이 어긋나면 걸린다 */
  response_type: ResponseType;
  /** 사람이 손으로 정한 줄인가. 생성기가 덮지 않는다 */
  pinned?: boolean;
  note?: string;
};

export type ConstructRegistry = {
  schema_version: string;
  core: string;
  item_bank_version: string;
  note: string;
  items: ConstructRow[];
};

export function constructRegistry(core: string, dir?: string): ConstructRegistry {
  return coreFile<ConstructRegistry>(core, "constructs", dir);
}

/** 그 짝을 써도 되는가 */
export function compatible(c: Construct, r: ResponseType): boolean {
  return (COMPATIBLE[c] ?? []).includes(r);
}

/**
 * 독립 교차검증으로 세도 되는가.
 *
 * **같은 말을 다시 묻는 것은 교차검증이 아니다.** 신호 갈래와 행동 장면과
 * 남은 것과 견준 것과 조직 활용 가운데 **적어도 하나가 달라야** 센다.
 * 같은 construct 와 같은 response type 으로 같은 행동을 다시 묻는 자리는
 * 되풀이다.
 */
export type CrossSignal = {
  construct: Construct;
  response_type: ResponseType;
  /** 어느 장면에서 묻는가. 묶음 이름으로 적는다 */
  scene: string;
  /** 축 */
  axis: string | null;
};
export function independent(a: CrossSignal, b: CrossSignal): boolean {
  if (a.construct !== b.construct) return true;
  if (a.response_type !== b.response_type) return true;
  if (a.scene !== b.scene) return true;
  return false;
}
