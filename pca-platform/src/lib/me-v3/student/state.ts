/**
 * **`현재 상태` 를 두 화면이 한 자리에서 읽는다**(R30 · PHASE 1).
 *
 * 결과지의 `현재 상태` 와 작업공간 홈의 `현재 상태` 가 같은 판정을 서로
 * 다른 규칙으로 고르고 있었다. 결과지는 `overview.focus`(근거가 선 영역이
 * 있으면 그것만)를, 홈은 `zoneOf` 를 **영역 차례대로** 걸러 셋을 집었다.
 * 그래서 같은 사람에게 결과지는 `재무·투자 판단` 하나를, 홈은
 * `경영전략·기획 · 마케팅·시장 · 영업·사업개발` 셋을 세웠고 **홈이 그
 * 사람의 가장 센 자리를 빠뜨렸다**(R30 시나리오 D).
 *
 * 세부 줄도 갈려 있었다. 홈이 사전의 결과물 이름(`사업계획서`)을 **실제로
 * 남겼는지와 무관하게** 적어서, 아무것도 남기지 않은 사람(시나리오 B)이
 * 그것을 가진 것으로 읽혔다. 머리 한 줄도 그랬다: 해 보기만 하고 정리가 덜
 * 된 영역(Z2)에도 `지금 설명할 수 있는 일 3가지` 가 섰다.
 *
 * 여기서 정하는 것은 셋이고 둘 다 이 함수를 읽는다.
 *
 *   어느 영역을 세우는가   근거가 선 영역(Z1) → 정리가 덜 된 영역(Z2)
 *                          → 둘 다 없으면 관심이 높은 영역. 셋까지
 *   세부 한 줄에 무엇을    **그 사람이 실제로 남긴 것**이 있으면 그 이름.
 *                          없으면 사전의 학생 활동 구(해 본 일)
 *   머리 한 줄             세운 영역의 묶음이 말하는 것만. 정리가 덜 된
 *                          영역을 `설명할 수 있다` 고 적지 않는다
 *
 * **판정을 여기서 하지 않는다.** 묶음(Zone)과 남긴 것은 결과 모델과
 * `currentState()` 가 이미 정한 값이고, 이 파일은 그것을 **어느 차례로 어떤
 * 말로 세우는가**만 정한다. 점수도 순위도 만들지 않는다.
 *
 * **표시 자리는 그대로다.** 결과지 카드의 세부가 한 줄(R27 의 자)이라 남긴
 * 것의 이름이 그 폭을 넘으면 그 줄에 세우지 않고 사전의 활동 구로 내려간다.
 * 말줄임은 줄이는 것이 아니라 가리는 것이다.
 */
import type { ResultModel } from "../result/model";
import type { Zone } from "../scoring/types";
import { thingKo } from "../result/say";
import { domainSub } from "../runtime/session";
import { STUDENT_COPY, type IconFamily } from "./copy";

export type StateTileKind =
  /** 그 사람이 실제로 남긴 것의 이름 */
  | "artifact"
  /** 사전의 학생 활동 구. 해 본 일이거나 그 영역에서 하는 일 */
  | "activity";

export type StateTile = {
  code: string;
  zone: Zone;
  /** 카드 세부 한 줄 */
  sub: string;
  kind: StateTileKind;
  family: IconFamily | null;
  /** 세부가 실제 산출물일 때 그 원문. 되짚는 자리가 쓴다 */
  artifact: string | null;
};

export type StateView = {
  tiles: StateTile[];
  /** 절 머리 아래 한 줄. 이름씨로 끊는다(R27). 세울 영역이 없으면 빈 글자 */
  lead: string;
  counts: { established: number; incomplete: number; interest: number };
};

/** 결과지 카드 세부 한 줄에 들어가는 글자 수(R27 의 자: 한 줄) */
const SUB_MAX = 11;
const ZONE_RANK: Partial<Record<Zone, number>> = {
  Z1_EVIDENCE_ESTABLISHED: 0, Z2_EVIDENCE_INCOMPLETE: 1,
};

/**
 * 두 화면이 세우는 `현재 상태` 카드.
 *
 * @param zoneOf  지금 값의 묶음. 작업공간은 `currentState().zoneOf`(경험을
 *                더한 뒤의 값)를, 결과지는 굳은 결과의 묶음을 넘긴다. 둘이
 *                다를 수 있는 것이 맞다: 결과지는 그때의 결과이고 홈은 지금이다
 */
export function studentStateView(
  core: string, model: ResultModel | null,
  zoneOf: Record<string, Zone>, max = 3,
): StateView {
  const none: StateView = {
    tiles: [], lead: "", counts: { established: 0, incomplete: 0, interest: 0 },
  };
  if (!model) return none;
  const order = model.domains.map((d) => d.code);
  const ranked = order
    .filter((c) => ZONE_RANK[zoneOf[c]] !== undefined)
    .sort((a, b) => (ZONE_RANK[zoneOf[a]] ?? 9) - (ZONE_RANK[zoneOf[b]] ?? 9));
  /* 근거가 하나도 없는 사람도 방향은 받는다(엔진의 `focus` 와 같은 규칙).
     그때 세우는 것은 관심이 높은 영역이고 머리 한 줄이 그렇게 적는다 */
  const picked = (ranked.length ? ranked
    : model.overview.focus.filter((c) => zoneOf[c] === "Z4_INSUFFICIENT_EVIDENCE"))
    .slice(0, max);
  if (!picked.length) return none;

  const tiles: StateTile[] = picked.map((code) => {
    const d = model.domains.find((x) => x.code === code);
    const dict = STUDENT_COPY[core]?.[code] ?? null;
    /* **실제로 남긴 것이 먼저다.** 사전의 결과물 이름은 그 영역이 보통
       남기는 것의 이름이지 그 사람이 남긴 것이 아니다 */
    const left = (d?.artifacts ?? []).map((a) => ({ raw: a, say: thingKo(a) }))
      .filter((x) => x.say.length <= SUB_MAX);
    if (left.length) {
      return {
        code, zone: zoneOf[code], sub: left[0].say, kind: "artifact",
        family: dict?.family ?? null, artifact: left[0].raw,
      };
    }
    return {
      code, zone: zoneOf[code], sub: dict?.activity ?? domainSub(core, code),
      kind: "activity", family: dict?.family ?? null, artifact: null,
    };
  });

  const counts = {
    established: tiles.filter((t) => t.zone === "Z1_EVIDENCE_ESTABLISHED").length,
    incomplete: tiles.filter((t) => t.zone === "Z2_EVIDENCE_INCOMPLETE").length,
    interest: tiles.filter((t) => t.zone === "Z4_INSUFFICIENT_EVIDENCE").length,
  };
  return { tiles, lead: leadKo(counts), counts };
}

/**
 * 머리 한 줄. **묶음이 말하는 것만 적는다.**
 *
 * `설명할 수 있다` 는 근거가 선 영역(Z1)의 말이다. 정리가 덜 된 영역(Z2)은
 * 해 본 일은 있고 지원서에 쓸 만큼 정리되지 않은 자리라 같은 말을 쓰면 그
 * 사람이 지금 할 수 없는 것을 할 수 있다고 적게 된다.
 */
export function leadKo(c: StateView["counts"]): string {
  const { established: a, incomplete: b, interest: i } = c;
  if (a && !b) return `지금 설명할 수 있는 일 ${a}가지`;
  if (b && !a) return `해 봤고 정리만 남은 일 ${b}가지`;
  if (a && b) return `설명할 수 있는 일 ${a}가지 · 정리가 덜 된 일 ${b}가지`;
  if (i) return `관심이 높아 먼저 볼 일 ${i}가지`;
  return "";
}
