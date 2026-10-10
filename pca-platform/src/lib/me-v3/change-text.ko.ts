/**
 * **그래서 무엇이 바뀌었는가**를 한국어 문장으로 적는다(규격 §12).
 *
 * `경험이 추가되었습니다` 는 사용자가 이미 아는 사실이다. 누른 사람이
 * 알고 싶은 것은 **그 경험이 내 현재 상태의 무엇을 움직였는가**이고,
 * 움직이지 않았으면 **왜 움직이지 않았는가**다.
 *
 * 이 파일을 따로 둔 까닭은 그 문장이 세 화면에 서기 때문이다: 홈의
 * `최근 변화` · 저장 직후 화면 · 현재 상태의 `최근 달라진 것`. 세 곳에서
 * 따로 적으면 같은 변화가 서로 다른 말로 읽히고, 어느 날 한 곳만 고쳐진다.
 *
 * **판정을 여기서 하지 않는다.** 들어오는 값은 `currentState()` 와
 * `previewRecompute()` 가 이미 계산해 둔 것이고, 이 파일은 그것을 문장으로
 * 옮기기만 한다. 축 코드와 묶음 코드는 한 글자도 나가지 않는다.
 *
 * **점수처럼 적지 않는다**(규격 §8). `+1점` 도 `2 → 3` 도 쓰지 않는다.
 * 올라간 자리는 **그 축이 무엇을 묻는 자리인지**로 적는다.
 */
import type { Axis, AxisState, Zone } from "./scoring/types";
import { AXIS_KO, ZONE_TITLE_KO } from "./result/text.ko";
import { withJosa } from "./result/josa";

/** 경험으로 올라간 축 하나 */
export type Raised = { domain: string; axis: Axis; state: AxisState };
/** 묶음이 달라진 영역 하나 */
export type ZoneMove = { domain: string; before: Zone; after: Zone };

/**
 * 축이 올라간 것을 **무엇이 더 확인됐는가**로 적는다.
 *
 * 축마다 말이 다른 까닭은, `직접 판단이 확인됐습니다` 와 `검증 근거가
 * 추가됐습니다` 가 다음에 할 일이 서로 다르기 때문이다. 같은 틀로 적으면
 * 여덟 축이 한 문장의 변주가 되고 읽는 사람이 차이를 못 본다.
 */
const RAISED_KO: Record<Axis, string> = {
  J1: "무엇을 풀 문제로 잡았는지가 더 또렷해졌습니다",
  J2: "받은 요구를 어떻게 읽었는지가 드러났습니다",
  J3: "직접 정한 조건과 기준이 확인됐습니다",
  J4: "어떤 방법으로 했는지가 적혔습니다",
  J5: "남긴 결과물이 확인됐습니다",
  J6: "무엇과 비교해 확인했는지가 더해졌습니다",
  J7: "어긋났을 때 무엇을 고쳤는지가 남았습니다",
  J8: "그 결과가 어디에 쓰였는지가 확인됐습니다",
};

/**
 * 올라간 축 하나를 한 문장으로.
 *
 * `구조·내구 해석에서 직접 정한 조건과 기준이 확인됐습니다` 처럼 읽힌다.
 */
export function raisedKo(r: Raised, domainName: string): string {
  /* `에서` 는 받침을 타지 않는다. 조사를 고를 자리가 아니므로 그냥 붙인다 */
  return `${domainName}에서 ${RAISED_KO[r.axis]}`;
}

/**
 * 묶음이 달라진 영역 하나를 한 문장으로. **코드를 적지 않는다.**
 *
 * 조사 둘이 앞말을 타므로 둘 다 `josa.ts` 에 맡긴다: 영역 이름 뒤의
 * `이/가` 와 묶음 이름 뒤의 `으로/로`. 손으로 이어 붙이면
 * `기구·제품 설계가` 가 `기구·제품 설계이` 로 나간다.
 */
export function zoneMovedKo(z: ZoneMove, domainName: string): string {
  const zone = ZONE_TITLE_KO[z.after];
  return `${withJosa(domainName, "이가")} ${withJosa(zone, "으로")} 옮겨 갔습니다`;
}

/** 변화가 없을 때 그 까닭. **오류가 아니라는 것을 먼저 적는다**(규격 §13) */
export type NoChangeWhy =
  /** 고른 항목이 하나뿐이라 확인으로 서지 않았다 */
  | "NEED_SECOND_PICK"
  /** 이미 검사에서 더 높이 선 자리였다 */
  | "ALREADY_CONFIRMED"
  /** 기술영역이나 항목을 고르지 않아 축으로 묶이지 않았다 */
  | "NO_DOMAIN_PICK";

export const NO_CHANGE_KO: Record<NoChangeWhy, { title: string; why: string }> = {
  NEED_SECOND_PICK: {
    title: "경험은 저장됐고 현재 상태는 그대로입니다",
    why: "같은 영역의 같은 판단에서 고른 항목이 둘이 되면 그때 확인으로"
      + " 올라갑니다. 지금은 하나씩이라 아직 서지 않았습니다.",
  },
  ALREADY_CONFIRMED: {
    title: "경험은 저장됐고 현재 상태는 그대로입니다",
    why: "검사에서 이미 확인된 범위의 경험이라 더 올라갈 곳이 없었습니다."
      + " 지원서에서 설명할 재료는 그만큼 늘었습니다.",
  },
  NO_DOMAIN_PICK: {
    title: "경험은 저장됐지만 아직 어느 판단으로도 가지 않았습니다",
    why: "기술영역과 그 영역의 항목을 함께 고르면 그 부분이 판단으로"
      + " 들어갑니다. 지금 기록에서 고르신 항목이 없습니다.",
  },
};

/**
 * 왜 안 바뀌었는지 고른다.
 *
 * **짐작하지 않는다.** 들어오는 값은 전부 `previewRecompute()` 가 센
 * 것이고, 고르는 차례가 곧 진단의 차례다: 묶이지도 않았는가 → 이미 높이
 * 서 있었는가 → 근거가 하나뿐인가.
 */
export function noChangeWhy(x: {
  /** (영역 · 축)으로 묶인 자리의 수 */
  candidates: number;
  /** 그 가운데 이미 확인 이상으로 서 있던 자리 */
  alreadyHigh: number;
}): NoChangeWhy {
  if (!x.candidates) return "NO_DOMAIN_PICK";
  if (x.alreadyHigh >= x.candidates) return "ALREADY_CONFIRMED";
  return "NEED_SECOND_PICK";
}

/**
 * 홈의 `최근 변화` 한 묶음.
 *
 * **줄 수를 둘까지로 둔다.** 홈은 요약이고 전체는 `현재 상태` 가 든다.
 */
export function recentChangeKo(
  st: { raised: Raised[]; zoneMoved: ZoneMove[]; recomputed_at: string | null },
  domainName: (code: string) => string,
  max = 2,
): { lines: string[]; more: number } {
  if (!st.recomputed_at) return { lines: [], more: 0 };
  const all = [
    ...st.zoneMoved.map((z) => zoneMovedKo(z, domainName(z.domain))),
    ...st.raised.map((r) => raisedKo(r, domainName(r.domain))),
  ];
  if (!all.length) {
    return {
      lines: ["새 경험을 더했고 현재 상태는 그대로입니다."],
      more: 0,
    };
  }
  return { lines: all.slice(0, max), more: Math.max(0, all.length - max) };
}
