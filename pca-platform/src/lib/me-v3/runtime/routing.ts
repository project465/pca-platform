/**
 * 지금 이 사람에게 무엇을 물을지 고른다. **채점하지 않는다.**
 *
 * routing 과 scoring 을 갈라 두는 까닭은 둘이 서로 다른 질문이기 때문이다.
 * routing 은 `다음에 무엇을 보여 줄까` 를 묻고 scoring 은 `이 응답이 무엇을
 * 뜻하는가` 를 묻는다. 한 파일에 담으면 화면을 고치다 판정이 바뀐다.
 *
 * **산업과 역할 선택이 심화 영역을 바꾸지 않는다.** 기술영역은 Core 응답으로
 * 먼저 확정하고, 그 뒤에 팩이 올라간다(`v3:runtime` 이 센다).
 */
import type { GradField, Stage, Tier } from "../scoring/types";

export type DomainPick = {
  /**
   * 선별 네 축(S4)을 묻는 영역.
   *
   * BASIC 은 둘이고 유료는 **심화 영역 전부**다. 심화 영역을 하나 더 열면
   * 그 영역의 선별 네 축도 같이 열려야 한다: 여덟 축 가운데 넷만 답한
   * 영역을 묶음 판정에 넣으면 그 영역은 구조적으로 근거가 설 수 없다.
   */
  probe: string[];
  /** 심화 여덟 축을 여는 영역. 기본 셋, 조건이면 넷 */
  deep: string[];
  /** 넷째가 열린 까닭. 열리지 않았으면 `null` */
  fourth_reason: FourthReason | null;
  /** 어떻게 골랐는지. 화면에 적는다 */
  trace: string[];
};

/**
 * 넷째 영역이 **추가 결제 없이** 열리는 까닭.
 *
 * 둘뿐인 것이 일부러다. 처음에는 `경험 있는 영역이 셋에 못 미친다` 도
 * 넣었는데, 그러면 겪은 것이 적은 사람에게 **빈 영역 하나를 더 묻는**
 * 셈이 된다. 그 영역에서 나올 답은 `없다` 뿐이고 화면만 여덟 개 늘어난다.
 * 넷째를 여는 까닭은 **셋만 보면 차례가 서지 않는 것**이어야 한다.
 */
export type FourthReason = "TIE_AT_THIRD" | "ALL_TIED";

export const PROBE_MAX = 2;
export const DEEP_BASE = 3;
export const DEEP_MAX = 4;

export type GridAnswer = { interest: number | null; exposure: number | null; learning: number | null };

/** 영역 하나의 정렬 열쇠. **점수를 만들지 않는다**: 고르기 위한 값이다 */
function key(g: GridAnswer): [number, number] {
  return [g.exposure ?? 0, g.interest ?? 0];
}
function cmp(a: [number, number], b: [number, number]): number {
  return b[0] - a[0] || b[1] - a[1];
}

/**
 * 격자 응답에서 영역을 고른다.
 *
 * **경험이 있는 쪽을 먼저 본다.** 관심만 높은 영역을 심화로 끌고 가면 그
 * 영역에서 확인할 것이 없고, 결과지가 `근거 부족` 만 길게 적는다. 경험이
 * 모자라면 관심이 높은 쪽으로 채우고 **채운 사실을 화면에 적는다.**
 */
export function pickDomains(
  grid: Record<string, GridAnswer>, tier: Tier, all: string[],
): DomainPick {
  const trace: string[] = [];
  const ranked = [...all].sort((a, b) => cmp(key(grid[a] ?? {} as GridAnswer), key(grid[b] ?? {} as GridAnswer)));
  const withExp = ranked.filter((td) => (grid[td]?.exposure ?? 0) >= 1);
  const probe = (withExp.length >= PROBE_MAX ? withExp : ranked).slice(0, PROBE_MAX);
  trace.push(`probe=${probe.join("+")} (경험 있는 영역 ${withExp.length}개)`);
  if (withExp.length < PROBE_MAX) trace.push("경험이 모자라 관심이 높은 쪽으로 채웠다");

  if (tier === "BASIC") {
    return { probe, deep: [], fourth_reason: null, trace };
  }

  /* 심화는 선별 둘을 포함하고 셋째를 더한다 */
  const deep = [...probe];
  for (const td of ranked) {
    if (deep.length >= DEEP_BASE) break;
    if (!deep.includes(td)) deep.push(td);
  }
  const third = deep[DEEP_BASE - 1];
  const rest = ranked.filter((td) => !deep.includes(td));
  const fourth = rest[0];

  let reason: FourthReason | null = null;
  const same = (a?: string, b?: string) =>
    !!a && !!b && cmp(key(grid[a] ?? {} as GridAnswer), key(grid[b] ?? {} as GridAnswer)) === 0;
  if (ranked.every((td) => same(td, ranked[0]))) reason = "ALL_TIED";
  else if (same(third, fourth)) reason = "TIE_AT_THIRD";
  if (withExp.length < DEEP_BASE) {
    trace.push(`경험 있는 영역이 ${withExp.length}개다. 그것만으로 넷째를 열지 않는다`);
  }

  if (reason && fourth) {
    deep.push(fourth);
    trace.push(`넷째 ${fourth} 개방 — ${reason} (추가 결제 없다)`);
  }
  trace.push(`deep=${deep.join("+")}`);
  /* 심화 영역은 선별 네 축도 함께 묻는다 */
  return { probe: [...new Set([...probe, ...deep])], deep, fourth_reason: reason, trace };
}

/** 학위와 계열이 고르는 분기 묶음. **점수에 들어가지 않는다** */
export function branchBlock(stage: Stage, field: GradField | null): string {
  if (stage === "bachelor") return "UG-COURSE";
  switch (field) {
    case "HUMANITIES_SOCIAL": return "GRAD-HS";
    case "BUSINESS": return "GRAD-BIZ";
    case "OTHER_INTERDISCIPLINARY": return "GRAD-MIX";
    default: return "GRAD-STEM";
  }
}

/** 석사 이상은 전공계열 없이 시작하지 않는다. DB 제약과 같은 규칙이다 */
export function profileReady(stage: Stage | null, field: GradField | null): boolean {
  if (!stage) return false;
  if (stage === "bachelor") return true;
  return !!field;
}
