/**
 * 그래프가 읽을 값. **여기서 새 측정값을 만들지 않는다.**
 *
 * 규격이 그래프보다 정의를 먼저 요구한다(§5). 각 축이 정확히 무엇을
 * 뜻하는지는 `docs/metri/PCU_PREMIUM_VISUAL.md` A절에 적혀 있고, 이
 * 파일은 **그 정의를 코드로 옮긴 것**이다. 역량점수도 적성점수도 백분위도
 * 임의 환산도 만들지 않는다: 돌려주는 것은 전부 결과 모델이 이미 들고
 * 있는 상태와 개수다.
 *
 * **한국어가 여기 없다.** 이름은 taxonomy 가 들고 그 사전을 읽는 자리는
 * 화면이다. 영어판을 여는 날 번역만 늘리고 이 파일을 고치지 않는다.
 */
import type { AxisState } from "../scoring/types";
import type { ResultDomain, ResultModel } from "./model";

/** 묻지 않은 축. `axes` 는 늘 여덟을 들고 다니고 이 칸이 물었는지를 가른다 */
const NOT_ASKED = "NOT_ROUTED";

export function asked(d: ResultDomain): boolean {
  return d.opened.probe || d.opened.deep;
}

/**
 * Radar 한 꼭짓점.
 *
 * `level` 은 **점수가 아니라 이름이 붙은 네 단계**다. 단조라 뒤 단계가 앞
 * 단계를 포함하고, 그래서 한 눈금에 서로 다른 뜻이 섞이지 않는다.
 */
export type RadarPoint = {
  code: string;
  /** 0 해본 적 없음 · 1 경험이 있다고 답함 · 2 응답에서 확인됨 · 3 직접 정함 */
  level: 0 | 1 | 2 | 3;
  /** 그 영역의 축을 물었는가. **안 물어본 것을 `없다` 로 적지 않으려고 둔다** */
  asked: boolean;
};

export function radarPoints(m: ResultModel): RadarPoint[] {
  return m.domains.map((d) => {
    const level: RadarPoint["level"] = d.owned.length ? 3
      : d.confirmed.length ? 2
        : d.experience && d.experience !== "NONE" ? 1 : 0;
    return { code: d.code, level, asked: asked(d) };
  });
}

/** 누적 막대 한 줄. **비율로 바꾸지 않는다**: 적게 물은 영역이 많이 확인된 것처럼 보인다 */
export type BarRow = {
  code: string;
  /** 실제로 물은 축의 수. 선별만 열린 영역은 넷, 심화가 열린 영역은 여덟 */
  asked: number;
  /** 네 상태의 개수. 합은 늘 `asked` 와 같다 */
  counts: [number, number, number, number];
};

const ORDER: AxisState[] = ["NOT_OBSERVED", "PARTICIPATED", "CONFIRMED", "OWNED"];

export function barRows(m: ResultModel): BarRow[] {
  return m.domains.filter(asked).map((d) => {
    const live = d.axes.filter((a) => a.missing !== NOT_ASKED);
    const counts = ORDER.map((s) => live.filter((a) => a.state === s).length);
    return {
      code: d.code, asked: live.length,
      counts: [counts[0], counts[1], counts[2], counts[3]],
    };
  });
}

/**
 * Evidence Matrix 한 줄.
 *
 * **0 과 묻지 않음을 같은 글자로 적지 않는다.** 묻지 않은 자리는 `null`
 * 이고 화면이 `묻지 않음` 으로 적는다.
 */
export type MatrixRow = {
  code: string;
  /** 해 본 것 이상으로 확인된 축의 개수 */
  did: number;
  /** 직접 정한 것으로 확인된 축의 개수 */
  decided: number;
  /** 고른 산출물의 개수 */
  artifacts: number;
  /** 고른 검증 대상의 개수 */
  verifications: number;
  /** 비교·검증 축(J6)의 상태. 묻지 않았으면 `null` */
  verify: AxisState | null;
};

export function matrixRows(m: ResultModel): MatrixRow[] {
  return m.domains.filter(asked).map((d) => {
    const j6 = d.axes.find((a) => a.axis === "J6");
    return {
      code: d.code,
      did: d.confirmed.length,
      decided: d.owned.length,
      artifacts: d.artifacts.length,
      verifications: d.verifications.length,
      verify: j6 && j6.missing !== NOT_ASKED ? j6.state : null,
    };
  });
}

/**
 * Action Roadmap 네 칸.
 *
 * **새 Action 을 만들지 않는다.** 네 칸이 전부 `actions` 와 `evidence` 에서
 * 오고, 비면 비었다는 것과 그 까닭을 화면이 적는다.
 */
export type Roadmap = {
  now: string[];
  next: string[];
  /** 남길 것. 할 일의 재료에서 온다 */
  leave: string[];
  /** 지원서와 면접에서 꺼내 쓸 자리 */
  use: string[];
};

export function roadmap(m: ResultModel, say: (a: ResultModel["actions"][number]) => string): Roadmap {
  const of = (h: string) => m.actions.filter((a) => a.horizon === h);
  const now = of("NOW");
  const later = of("NEXT").length ? of("NEXT") : of("LATER");
  const leave = [...new Set(m.actions.flatMap(
    (a) => [...a.material.artifacts, ...a.material.verify_targets]))].slice(0, 4);
  const use = [...new Set(m.evidence.ready.map((e) => e.domain))];
  return {
    now: now.map(say), next: later.map(say), leave, use,
  };
}
