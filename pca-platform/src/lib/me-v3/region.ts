/**
 * Region Layer 를 읽는 **유일한 자리.**
 *
 * **Core 판정에 들어가지 않는다.** 권역도 기관 유형도 이동 범위도 축
 * 수준이나 영역 묶음을 바꾸지 않는다. 쓰는 자리는 결과를 읽는 순서와
 * 탐색 화면과 내 CareerMatri 의 `현재 방향` 뿐이다.
 *
 * **기업 자료가 한 줄도 없다.** 이 파일이 들고 있는 것은 열쇠와 계약이고,
 * 기관 수와 사업체 수와 산업의 요구 강도는 공개 통계와 공고 자료가 와야
 * 선다. 그 표는 출처와 기준 연도 없이 줄이 서지 않는다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_DIR } from "./core-registry";

export type RegionEntry = {
  code: string; name: string; includes: string[]; scene: string;
};
export type OrgTypeEntry = { oc: string; label: string; scene: string };
export type MoveRange = { code: string; label: string };

export type RegionLayer = {
  schema_version: string;
  version: number;
  market: string;
  note: string;
  rules: string[];
  regions: RegionEntry[];
  org_types: OrgTypeEntry[];
  move_ranges: MoveRange[];
  data_contract: Record<string, {
    table: string; keys: string[]; values: string[];
    rows_now: number; why_empty: string;
  }>;
};

export function regionLayer(dir = CONTENT_DIR): RegionLayer {
  return JSON.parse(
    readFileSync(join(dir, "region-layer.json"), "utf8")) as RegionLayer;
}

/** 그 시장에서 Region Layer 를 켜는가. 지역 자료가 그 나라 것이라서다 */
export function regionOpen(market: string, dir = CONTENT_DIR): boolean {
  const m = JSON.parse(readFileSync(join(dir, "markets.json"), "utf8")) as
    { markets: { code: string; region_layer: boolean }[] };
  return !!m.markets.find((x) => x.code === market)?.region_layer;
}

export function regionName(code: string | null, dir = CONTENT_DIR): string | null {
  if (!code) return null;
  return regionLayer(dir).regions.find((r) => r.code === code)?.name ?? null;
}

export function orgLabel(oc: string, dir = CONTENT_DIR): string {
  return regionLayer(dir).org_types.find((o) => o.oc === oc)?.label ?? oc;
}

export function moveLabel(code: string | null, dir = CONTENT_DIR): string | null {
  if (!code) return null;
  return regionLayer(dir).move_ranges.find((m) => m.code === code)?.label ?? null;
}

/** 지금 비어 있는 자료 자리. **빈 것을 조용히 두지 않는다** */
export function regionGaps(dir = CONTENT_DIR): {
  table: string; why: string; keys: string[];
}[] {
  const L = regionLayer(dir);
  return Object.values(L.data_contract)
    .filter((c) => c.rows_now === 0)
    .map((c) => ({ table: c.table, why: c.why_empty, keys: c.keys }));
}
