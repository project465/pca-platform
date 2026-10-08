/**
 * 판본. **결과 스냅샷에 적히는 값이고 손으로 올린다.**
 *
 * 채점이 바뀌어도 이미 산 사람의 결과가 조용히 달라지면 안 된다. 그래서
 * 스냅샷은 그때의 판본을 함께 들고 다니고, 다시 계산하지 않는다.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CONTENT_DIR } from "../core-registry";

/** 판단 규칙이 바뀌면 올린다. 문면이 바뀌는 것은 문항 은행 판본이다 */
export const SCORING_VERSION = "me-v3-scoring.1";

/** 1차 동결한 문항 은행 */
export const ITEM_BANK_VERSION = "ME_V3_ITEM_BANK_V1";

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

/** 팩 판본은 고른 팩의 `version` 에서 온다. 안 골랐으면 `null` 이다 */
export function packVersion(file: string, code: string | null, dir = CONTENT_DIR): string | null {
  if (!code) return null;
  const body = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  const p = (body.packs as { code: string; version: number }[]).find((x) => x.code === code);
  return p ? `${code}.v${p.version}` : null;
}
