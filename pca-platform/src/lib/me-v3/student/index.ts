/**
 * 학생이 읽는 말을 꺼내는 **한 자리**(§6).
 *
 * `Domain → Activity → Evidence` 를 한 object 가 공급한다. 화면마다
 * 제 문장을 따로 지으면 같은 영역이 결과지에서는 `목표와 성과 기준
 * 정하기` 로, 작업공간에서는 `목표와 지표를 정리한 표` 로 서서 서로
 * 이어지지 않는다(R28 의 B3).
 */
import { domainSub } from "@/lib/me-v3/runtime/session";
import {
  EXAMPLE_FALLBACK, EXPERIENCE_EXAMPLE, EXPERIENCE_FLOW, FLOW_FALLBACK, STUDENT_COPY,
  type ExperienceFlow, type IconFamily, type StudentDomain,
} from "./copy";

export type { ExperienceFlow, IconFamily, StudentDomain };
export { FAMILY_FILL, FAMILY_LINE, FAMILY_MEANING, NEUTRAL_FILL, NEUTRAL_LINE }
  from "./icon";
/** 두 화면이 세우는 `현재 상태` 카드 셋. **차례와 세부와 머리 한 줄이 한 자리다**(R30) */
export { studentStateView, leadKo as stateLeadKo } from "./state";
export type { StateTile, StateView, StateTileKind } from "./state";

/** 적어 둔 Core 인가. **검사가 이 수를 센다** */
export function hasStudentCopy(core: string): boolean {
  return Boolean(STUDENT_COPY[core]);
}

export function studentDomain(core: string, td: string): StudentDomain | null {
  return STUDENT_COPY[core]?.[td] ?? null;
}

/**
 * 카드 세부 한 줄. **적어 두지 않은 Core 는 전과 같이 `domainSub` 로
 * 간다**: 그 줄이 분류명으로 읽히는 것이 아직 남은 문제이고, 여기서
 * 기계로 바꿔 쓰면 그 사실이 화면에서 보이지 않게 된다
 */
export function studentActivity(core: string, td: string): string {
  return studentDomain(core, td)?.activity ?? domainSub(core, td);
}

/**
 * 작업공간 타일이 드는 **남는 것의 이름**.
 *
 * 그 사람이 실제로 남긴 것을 넘기면 그것을 먼저 쓴다. 적어 둔 것이
 * 없을 때 사전이 받는다.
 */
export function studentEvidence(
  core: string, td: string, mine?: string,
): string {
  if (mine) return mine;
  return studentDomain(core, td)?.evidence ?? "";
}

export function studentFamily(core: string, td: string): IconFamily | null {
  return studentDomain(core, td)?.family ?? null;
}

/** 경험 추가 1단의 예시 한 줄. **전공마다 다르다**(§7) */
export function experienceExample(core: string): string {
  return EXPERIENCE_EXAMPLE[core] ?? EXAMPLE_FALLBACK;
}

/**
 * 경험 추가 흐름이 묻는 말(§7 · R30). **`기술 판단` 을 화면에 박지 않는다**:
 * 경영학과 학생이 자기 과제를 그 말로 읽지 못한다. 사전이 없는 Core 는
 * 전공을 가리키지 않는 말로 떨어진다.
 */
export function experienceFlow(core: string): ExperienceFlow {
  return EXPERIENCE_FLOW[core] ?? FLOW_FALLBACK;
}
