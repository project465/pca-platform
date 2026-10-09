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
/**
 * 기관 유형. **Core 의 조직환경(OC)과 다른 층이다.**
 *
 * OC 는 그 일을 하는 자리의 성격(완성품 기업 · 엔지니어링 서비스 …)이고
 * ORG 는 그 자리를 가진 기관의 종류(대기업 · 중소기업 …)다. 전에는 둘 다
 * `OC1` 으로 적혀 있어서, 검사 화면이 말하는 `완성품 기업` 과 결과지가
 * 말하는 `대기업` 이 같은 코드를 쓰고 다른 뜻이었다. **이름이 겹치는 것이
 * 곧 버그다**(`.btn` · `--sf-r` · `.lg` · `empty` · `industries` 에 이어
 * 여섯 번째다). `from_oc` 가 둘 사이의 다리이고, 한 OC 가 여러 ORG 에
 * 걸린다. 그 사실을 감추지 않는다.
 */
export type OrgTypeEntry = {
  code: string; label: string; scene: string; from_oc: string[];
};
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

export function orgTypes(dir = CONTENT_DIR): OrgTypeEntry[] {
  return regionLayer(dir).org_types;
}

/**
 * 기관 유형의 이름. **모르는 코드를 그대로 돌려주지 않는다.**
 *
 * 전에는 못 찾으면 코드를 돌려줬고, 그래서 지금 상태 화면에 `OC1` 이
 * 그대로 섰다. 까닭은 이름이 겹친 자리의 뒤처리다: Core 의 조직환경
 * (`OC1~OC7`, 그 일을 하는 자리의 성격)과 지역 층의 기관 유형(`ORG_*`,
 * 그 자리를 가진 기관의 종류)이 한때 같은 코드를 썼고, 칸을 나누기 전에
 * 적힌 줄에는 `target_org` 에 `OC*` 가 들어 있다.
 *
 * **고쳐 쓰지 않고 비운다.** 옛 줄의 `OC1` 을 기관 유형으로 바꿔 적으면
 * 그 사람이 고르지 않은 것을 고른 것으로 만든다. 이름을 못 찾으면
 * `null` 이고, 화면은 그 자리를 비운다.
 */
export function orgLabel(code: string, dir = CONTENT_DIR): string | null {
  return regionLayer(dir).org_types.find((o) => o.code === code)?.label ?? null;
}

/**
 * 그 조직환경을 고르신 분이 흔히 보는 기관 유형.
 *
 * **하나로 못 박지 않는다.** 완성품 기업은 대기업에도 중견기업에도 있다.
 * 한 쪽만 적으면 다른 쪽을 보고 계신 분이 자기 자리가 빠졌다고 읽는다.
 */
export function orgTypesFor(oc: string, dir = CONTENT_DIR): OrgTypeEntry[] {
  return regionLayer(dir).org_types.filter((o) => o.from_oc.includes(oc));
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
