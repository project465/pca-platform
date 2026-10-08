/**
 * 판본. **결과 스냅샷에 적히는 값이고 손으로 올린다.**
 *
 * 채점이 바뀌어도 이미 산 사람의 결과가 조용히 달라지면 안 된다. 그래서
 * 스냅샷은 그때의 판본을 함께 들고 다니고, 다시 계산하지 않는다.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CONTENT_DIR, packFile, type PackKind } from "../core-registry";

/**
 * 판단 규칙이 바뀌면 올린다. 문면이 바뀌는 것은 문항 은행 판본이다.
 *
 * `.2` 로 올린 까닭. 선별 네 축의 넷째가 조직 활용에서 실패·수정으로
 * 바뀌었다. 축 상태를 내는 규칙과 묶음 판정과 근거 세는 법은 한 줄도
 * 바뀌지 않았지만, **선별 등급에서 세는 축이 달라지면 같은 응답이 다른
 * 묶음으로 간다.** 그것은 판단 규칙이 바뀐 것이므로 판본을 올린다.
 *
 * `.3` 으로 올린 까닭 셋.
 *
 * ① `잘 모르겠다` 가 **수에서 상태로** 바뀌었다. 영역 훑기의 관심과 배울
 * 뜻에서 그 보기가 가운데 값(3)으로 저장되고 있었고, 그래서 아직 모르는
 * 사람이 `보통 관심` 으로 판정됐다. 이제 `ANSWERED_UNKNOWN` 으로 보존하고
 * 구간을 내지 않는다. **같은 응답이 다른 구간으로 간다**: 판단 규칙이다.
 *
 * ② 학위 묶음이 하나에서 **넷**으로 갈렸다. 어느 묶음이 열리는지가 학위로
 * 정해지고, 받지 않은 묶음의 응답은 세지 않는다.
 *
 * ③ 선별 축의 **둘째 문항이 STANDARD 부터**다. 선별 등급에는 소유 판정이
 * 없어서 둘째 자리가 뜻을 가지지 않는다. 그 등급에서 묻지 않으므로 그
 * 문항은 `NOT_ROUTED` 다.
 */
export const SCORING_VERSION = "me-v3-scoring.3";

/**
 * 2차 문항 은행. 1차는 `me-v3-items.json` 에 동결해 둔다.
 *
 * `.1` 로 올린 까닭. 문면이 바뀐 것이 아니라 **문항이 바뀌었다**: 석사 이상
 * 한 묶음 여섯이 석사·박사·포닥 세 묶음 열여덟로 갈렸고, 영역 훑기의
 * `잘 모르겠다` 가 값 자리에 `null` 을 들게 됐고, 선별 축 둘째 문항의
 * 등급이 STANDARD 로 올라갔다.
 *
 * `.2` 로 올린 까닭. **영역 이름의 영문 약어를 한국어로 바꿨다**
 * (`동역학·진동·NVH` → `동역학·진동·소음`). NVH 는 자동차 쪽에서 쓰는
 * 말이고 학부생과 다른 산업 쪽에서는 읽히지 않는데, 그 이름이 격자 줄과
 * 머리말과 결과지에 그대로 나갔다. NVH 는 세부 영역에 남겼다: 그 자리에
 * 서는 영역 이름을 대신하지 않고 그 안의 한 갈래로 읽혀서 아는 사람이 찾는다.
 * **판정은 한 줄도 바뀌지 않는다**: 영역 코드가 그대로라 같은 응답이 같은
 * 묶음으로 간다. 문항 은행 판본만 올린다.
 */
export const ITEM_BANK_VERSION = "ME_V3_ITEM_BANK_V2.2";

export type ModuleVersions = {
  core_version: string;
  item_bank_version: string;
  scoring_version: string;
  industry_pack_version: string | null;
  role_pack_version: string | null;
  region_layer_version: string | null;
};

export function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * 팩 판본은 고른 팩의 `version` 에서 온다. 안 골랐으면 `null` 이다.
 *
 * **파일 이름을 받지 않고 core 와 종류를 받는다.** 전에는 부르는 쪽이
 * `industry-packs.json` 을 적어 넘겼고, 팩 판본을 올리는 날 그 문자열이
 * 적힌 자리를 전부 찾아야 했다. 하나를 놓치면 옛 팩과 새 팩이 한 응시에
 * 섞인다.
 */
export function packVersion(
  core: string, kind: PackKind, code: string | null, dir = CONTENT_DIR,
): string | null {
  if (!code) return null;
  const body = JSON.parse(readFileSync(packFile(core, kind, dir), "utf8"));
  const p = (body.packs as { code: string; version: number }[]).find((x) => x.code === code);
  return p ? `${code}.v${p.version}` : null;
}
