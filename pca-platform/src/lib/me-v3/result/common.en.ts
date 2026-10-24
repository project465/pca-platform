/**
 * 영역에 걸치지 않는 판단의 영어 이름. `student/common.ts` 와 번호와 뜻이 같다.
 *
 * 영어판을 여는 이공계 셋만 적었다: 기계공학 벌 · 중립 벌 · 전기전자와 컴퓨터가
 * 바꾸는 칸. **적지 않은 번호는 세우지 않는다**(한국어와 같은 규칙).
 */
export type CommonLabels = Record<string, string>;

export const COMMON_ME_EN: CommonLabels = {
  CJ_SCOPE: "Narrowing the scope and writing down why",
  CJ_REQUIRE: "Turning spoken requirements into numbers",
  CJ_METHOD: "Choosing a method and writing down why",
  CJ_COMPARE: "Comparing options against the same criteria",
  CJ_HANDOFF: "Producing work someone else picked up and used",
  CJ_GIVEN_REV: "Changing given conditions, with reasons",
  UG_SCOPE: "Narrowing the scope of a capstone yourself",
  UG_DECIDE: "Setting conditions or dimensions yourself in a class project",
  UG_OUTPUT: "Writing up your work so others can read and use it",
  UG_CHECK: "Comparing test values with calculations and explaining the gap",
  UG_FIX: "Narrowing down why a result was off and trying again",
  UG_USED: "Making something your team used in its next step",
  MS_PROBLEM: "Narrowing the research question yourself",
  MS_CONDITION: "Turning project goals into measurable conditions",
  MS_METHOD: "Setting experiment or simulation conditions yourself",
  MS_OUTPUT: "Recording methods and conditions so others can repeat them",
  MS_VERIFY: "Checking your results against values from another method",
  MS_TRANSLATE: "Putting your research into industry language",
  PHD_FRAME: "Cutting a problem down to a size you could solve",
  PHD_ASSUME: "Writing down when your assumptions would break",
  PHD_PICK: "Choosing one method among several and recording why",
  PHD_VAR: "Deciding what to hold fixed and what to vary",
  PHD_UNCERT: "Stating how much uncertainty remains in your results",
  PHD_LIMIT: "Finding and writing down where your method doesn't work",
  PD_SCOPE: "Separating what you're responsible for from what you delegated",
  PD_RUN: "Dividing project time and resources yourself",
  PD_ALONE: "Making calls without supervision and following through",
  PD_TEAM: "Building on other people's results in your own work",
  PD_OUT: "Turning research into project reports, patents or prototypes",
  PD_LINK: "Seeing your results used by a company or another institution",
};

export const COMMON_NEUTRAL_EN: CommonLabels = {
  CJ_SCOPE: "Narrowing the scope yourself and writing down its limits",
  CJ_REQUIRE: "Turning spoken requirements into checkable items",
  CJ_METHOD: "Choosing a method and recording why",
  CJ_COMPARE: "Putting two or more options against the same criteria",
  CJ_HANDOFF: "Producing material someone else picked up and used",
  CJ_GIVEN_REV: "Changing given criteria or schedules, with reasons",
  UG_SCOPE: "Narrowing the scope of a team project or competition entry yourself",
  UG_DECIDE: "Setting criteria or allocations yourself in a project",
  UG_OUTPUT: "Writing up results so others can read and reuse them",
  UG_CHECK: "Comparing results with your goals and explaining the gap",
  UG_FIX: "Narrowing down why something didn't work and trying again",
  UG_USED: "Making material your team used in its next step",
  MS_PROBLEM: "Narrowing and proposing the research question yourself",
  MS_CONDITION: "Turning project goals into conditions you can check",
  MS_METHOD: "Setting study or analysis conditions yourself and running them",
  MS_OUTPUT: "Leaving data and steps so others can repeat the work",
  MS_VERIFY: "Checking your results against values from another method",
  MS_TRANSLATE: "Putting your research into the language of practice",
  PHD_FRAME: "Cutting a problem down to a size you could solve",
  PHD_ASSUME: "Writing down when your assumptions would break",
  PHD_PICK: "Choosing one method among several and recording why",
  PHD_VAR: "Deciding what to hold fixed and what to vary",
  PHD_UNCERT: "Stating how much uncertainty remains in your results",
  PHD_LIMIT: "Finding and writing down where your method doesn't work",
  PD_SCOPE: "Separating what you're responsible for from what you delegated",
  PD_RUN: "Dividing project time and resources yourself",
  PD_ALONE: "Making calls without supervision and seeing them through",
  PD_TEAM: "Building on other people's results in your own work",
  PD_OUT: "Turning research into reports or proposals",
  PD_LINK: "Seeing your results used in an organization's decisions",
};

export const COMMON_BY_CORE_EN: Record<string, Partial<CommonLabels>> = {
  ME_CORE_V3: COMMON_ME_EN,
  EE_CORE_V1: {
    CJ_REQUIRE: "Turning spoken requirements into measurable values",
    CJ_GIVEN_REV: "Changing given design conditions, with reasons",
    MS_CONDITION: "Turning project goals into measurable test conditions",
    MS_METHOD: "Setting measurement or simulation conditions yourself and running them",
    MS_OUTPUT: "Recording circuits, settings and steps so others can repeat them",
    MS_TRANSLATE: "Putting your research into industry language",
    PD_OUT: "Turning research into project reports, patents or prototypes",
    PD_LINK: "Seeing your results used by a company or another institution",
  },
  CS_CORE_V1: {
    CJ_REQUIRE: "Turning spoken requirements into measurable values",
    CJ_GIVEN_REV: "Changing given design conditions, with reasons",
    MS_CONDITION: "Turning project goals into measurable experiment conditions",
    MS_METHOD: "Setting experiment or evaluation conditions yourself and running them",
    MS_OUTPUT: "Leaving code, settings and steps so others can rerun them",
    MS_TRANSLATE: "Putting your research into industry language",
    PD_OUT: "Turning research into project reports, patents or open-source code",
    PD_LINK: "Seeing your results used by a company or another institution",
  },
};

export function commonItemEn(core: string, itemId: string): string | null {
  return COMMON_BY_CORE_EN[core]?.[itemId] ?? COMMON_NEUTRAL_EN[itemId] ?? null;
}
