/**
 * 파는 것.
 *
 * **상품은 설정이지 코드가 아니다**(규격 §7). 등급과 시장이 `products` 의
 * 칸이라, 전공이 늘어도 여기 if 가 늘지 않는다.
 *
 * **값은 서버에서만 온다**(규격 §8). 화면이 보낸 금액으로 주문을 만들지
 * 않는다. 주문은 그 순간의 금액과 통화를 굳혀 적는다: 나중에 `products` 가
 * 바뀌어도 그 주문의 진실은 그때 적은 값이다.
 */
import { query, queryOne } from "@/lib/db";

export type Market = "KR" | "GLOBAL";
export type Tier = "BASIC" | "STANDARD" | "PRO";

export type CatalogItem = {
  code: string;
  market: Market;
  tier: Tier;
  major_code: string;
  amount: number;
  currency: string;
  active: boolean;
  assessment_version: string;
};

export function isMarket(v: string | undefined | null): v is Market {
  return v === "KR" || v === "GLOBAL";
}

/** 이 시장에서 지금 파는 것. 등급 순서로 돌려준다. */
export async function catalogFor(market: Market, major = "ME"): Promise<CatalogItem[]> {
  const rows = await query<CatalogItem>(
    `SELECT code, market, tier, major_code, amount, currency, active,
            assessment_version
       FROM products
      WHERE market = $1 AND major_code = $2 AND active
        AND assessment_version IS NOT NULL
      ORDER BY CASE tier WHEN 'BASIC' THEN 1 WHEN 'STANDARD' THEN 2 ELSE 3 END`,
    [market, major],
  ).catch(() => [] as CatalogItem[]);
  return rows;
}

export async function productByCode(code: string): Promise<CatalogItem | null> {
  return queryOne<CatalogItem>(
    `SELECT code, market, tier, major_code, amount, currency, active,
            assessment_version
       FROM products WHERE code = $1`,
    [code],
  ).catch(() => null);
}

/**
 * 지금 이 상품을 팔아도 되는가.
 *
 * **금액이 0 인 상품은 운영 결제가 켜진 데서 팔지 않는다.** 0 은 '아직 값을
 * 못 정했다' 는 뜻이고(승인된 가격이 없어 지어내지 않았다), 그대로 열어
 * 두면 공짜로 팔리는 상품이 운영에 나간다. 개발·시험에서는 0원 주문이 그냥
 * 지나간다: 그래야 흐름 전체를 사람 없이 한 바퀴 돌 수 있다.
 */
export function sellable(p: CatalogItem): { ok: true } | { ok: false; why: string } {
  if (!p.active) return { ok: false, why: "지금 팔지 않는 상품입니다." };
  const live = process.env.PAYMENTS_PROVIDER === "portone";
  if (live && p.amount <= 0) {
    return { ok: false, why: "가격이 정해지지 않은 상품입니다." };
  }
  return { ok: true };
}

/** 이 시장에서 쓰는 사이트. 도메인은 `site_configs` 한 곳에만 있다. */
export async function siteForMarket(market: Market): Promise<string> {
  const row = await queryOne<{ site_id: string }>(
    `SELECT site_id FROM site_configs WHERE payment_market = $1 AND active
      ORDER BY site_id LIMIT 1`,
    [market],
  ).catch(() => null);
  return row?.site_id ?? (market === "KR" ? "kr" : "global");
}
