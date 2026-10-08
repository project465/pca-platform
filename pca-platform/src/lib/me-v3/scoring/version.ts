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
 */
export const SCORING_VERSION = "me-v3-scoring.2";

/** 2차 문항 은행. 1차는 `me-v3-items.json` 에 동결해 둔다 */
export const ITEM_BANK_VERSION = "ME_V3_ITEM_BANK_V2";

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
