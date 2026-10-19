/**
 * **전공별 해석 언어.** 판단 기준(축 여덟)은 그대로 두고 부르는 말만 갈라 둔다
 * (규격 §4).
 *
 * 축 이름(`요구 해석` · `산출물`)은 우리 쪽 분류라 종이에 그대로 서면 경영학과
 * 학생이 자기 일의 말로 읽지 못한다. 지금은 대표 쪽 승인을 받을 경영 Core 만
 * 적었고, 나머지 Core 는 승인 뒤에 같은 틀로 더한다(그때까지 공통 이름으로
 * 떨어진다).
 */
import type { Axis, AxisState } from "../scoring/types";
import { AXIS_KO } from "../result/text.ko";

const BY_CORE: Record<string, Record<Axis, string>> = {
  BIZ_CORE_V1: {
    J1: "과제 범위 정하기",
    J2: "목표를 지표·조건으로 옮기기",
    J3: "기준·배분 직접 결정",
    J4: "조사·분석 방법 선택",
    J5: "문서·결과물 작성",
    J6: "실적·대안과 비교",
    J7: "원인 파악과 수정",
    J8: "결과가 의사결정에 쓰임",
  },
};

export function axisWord(core: string, axis: Axis): string {
  return BY_CORE[core]?.[axis] ?? AXIS_KO[axis];
}

export const AXIS_STATE_WORD: Record<AxisState, string> = {
  OWNED: "직접 결정했다고 답함",
  CONFIRMED: "직접 해 봤다고 답함",
  PARTICIPATED: "주어진 조건으로 해 봤다고 답함",
  NOT_OBSERVED: "응답에서 확인되지 않음",
};
