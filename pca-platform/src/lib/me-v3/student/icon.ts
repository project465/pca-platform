/**
 * **표시는 자리가 아니라 뜻이 고른다**(§5).
 *
 * R28 의 B2 가 이 파일의 까닭이다. 결과지는 글리프 셋을 `i % 3` 으로
 * 돌려서 **여섯 Core 전부 첫 칸이 막대이고 셋째가 문서**였고, 작업공간은
 * `TD01: gear` 한 표를 스무 Core 가 같이 썼다. 간호 사정에 막대가 서고
 * 서버·API 구현에 문서가 서는 자리다.
 *
 * **스무 Core × 열둘을 다 새로 그리지 않는다**(§5). 갈래 열둘을 두고
 * 영역을 거기에 붙인다. 같은 뜻이면 Core 가 달라도 같은 갈래를 쓴다.
 *
 * 두 면이 그리는 방식은 다르다. 결과지의 배지는 면으로 선 글리프를
 * 쓰고(`IcF`), 작업공간 타일은 선으로 그린 공통 글리프를 쓴다(`Icon`).
 * **갈래를 고르는 일은 한 자리에서 한다**: 그림이 달라도 뜻은 한 번만
 * 정해진다.
 */
import type { IconFamily } from "./copy";
import type { IconName } from "@/components/sf/icon";

/** 갈래가 가리키는 뜻. 사전을 쓰는 사람이 읽을 자리다 */
export const FAMILY_MEANING: Record<IconFamily, string> = {
  plan: "계획·우선순위",
  compare: "비교·분석",
  structure: "구조·설계",
  data: "데이터·기록",
  people: "사람·사용자",
  rule: "문서·규정",
  verify: "실험·검증",
  build: "시스템·구현",
  talk: "커뮤니케이션",
  cost: "자원·비용",
  site: "현장·운영",
  decide: "의사결정",
};

/** 결과지 배지가 드는 **면으로 선** 글리프 */
export const FAMILY_FILL: Record<IconFamily, string> = {
  plan: "goal",
  compare: "bars",
  structure: "cube",
  data: "table",
  people: "person",
  rule: "note",
  verify: "flask",
  build: "chip",
  talk: "bubble",
  cost: "coins",
  site: "pin",
  decide: "verdict",
};

/** 작업공간 타일이 드는 **선으로 그린** 공통 글리프 */
export const FAMILY_LINE: Record<IconFamily, IconName> = {
  plan: "target",
  compare: "chart",
  structure: "layers",
  data: "grid",
  people: "users",
  rule: "doc",
  verify: "clipboard",
  build: "gear",
  talk: "send",
  cost: "cart",
  site: "building",
  decide: "check",
};

/**
 * 사전이 아직 없는 Core 가 드는 표시.
 *
 * **짐작으로 갈래를 붙이지 않는다.** 코드 번호로 돌리면 그것이 곧 자리로
 * 정하는 일이고, 이 파일이 없애려는 바로 그 모양이다. 뜻을 모르는 동안은
 * 한 가지 표시로 서고, 그 사실이 화면에 그대로 보인다.
 */
export const NEUTRAL_FILL = "note";
export const NEUTRAL_LINE: IconName = "doc";
