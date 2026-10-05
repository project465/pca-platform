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
/* 시장 이름은 **미들웨어도 보는 값**이라 import 없는 파일에 둔다 */
import { isMarket, type Market } from "@/lib/market-def";

export { isMarket };
export type { Market };

export type Tier = "BASIC" | "STANDARD" | "PRO";

/** DB 의 `products.price_status`. 값이 정해졌는가만 말한다 */
export type PriceStatus = "approved" | "not_approved";

/**
 * 이 상품의 값이 지금 어떤 상태인가.
 *
 * **0 하나로 두 가지를 말하지 않는다.** 예전에는 `amount = 0` 이
 * '진짜 무료' 와 '아직 값을 못 정했다' 를 동시에 뜻했고, 표에서 둘이
 * 똑같이 생겼다. 그래서 '0원이면 팔지 않는다' 로 막았더니 **법이
 * 요구하는 무료 구간까지 닫혔다**(전자상거래법 제17조 제6항의 시용
 * 장치). 뜻을 칸으로 꺼냈다.
 *
 *   PAID_APPROVED        값이 승인된 유료 상품
 *   FREE_APPROVED        **승인된 무료 상품.** 값을 0 으로 정한 것이고
 *                        못 정한 것이 아니다. 닫으면 안 된다
 *   PRICE_NOT_APPROVED   아직 못 정했다. **0원이라고 적지 않는다**
 *
 * **이름에 전부 APPROVED 가 들어간 것이 일부러다.** 앞의 둘은 승인된
 * 상태이고 뒤의 하나만 아니다. `FREE` 라고만 적어 두었더니 코드를 읽는
 * 쪽에서 그것이 승인된 값인지 기본값인지 매번 되짚어야 했다.
 */
export type PriceState = "PAID_APPROVED" | "FREE_APPROVED" | "PRICE_NOT_APPROVED";

export type CatalogItem = {
  code: string;
  market: Market;
  tier: Tier;
  major_code: string;
  amount: number;
  currency: string;
  active: boolean;
  assessment_version: string;
  price_status: PriceStatus;
};

/** 값의 상태. 화면도 주문도 이 한 함수를 본다 */
export function priceState(p: {
  amount: number; price_status?: PriceStatus | null;
}): PriceState {
  if (p.price_status === "not_approved") return "PRICE_NOT_APPROVED";
  /* 칸이 없는 옛 상품은 금액으로 읽는다. **모르면 덜 준다**: 0 인데
     상태가 비어 있으면 승인된 무료로 보지 않고 미승인으로 본다 */
  if (p.price_status == null && p.amount <= 0) return "PRICE_NOT_APPROVED";
  return p.amount > 0 ? "PAID_APPROVED" : "FREE_APPROVED";
}

/** 이 시장에서 지금 파는 것. 등급 순서로 돌려준다. */
export async function catalogFor(market: Market, major = "ME"): Promise<CatalogItem[]> {
  const rows = await query<CatalogItem>(
    `SELECT code, market, tier, major_code, amount, currency, active,
            assessment_version, price_status
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
            assessment_version, price_status
       FROM products WHERE code = $1`,
    [code],
  ).catch(() => null);
}

/**
 * 지금 이 상품을 팔아도 되는가.
 *
 * **값이 승인되지 않은 상품은 운영 결제가 켜진 데서 팔지 않는다.** 그대로
 * 열어 두면 값을 못 정한 상품이 0원으로 팔린다. 개발·시험에서는 지나간다:
 * 그래야 흐름 전체를 사람 없이 한 바퀴 돌 수 있다.
 *
 * **무료 구간은 막지 않는다.** 승인된 0원은 법이 요구하는 시용 장치라,
 * 여기서 닫으면 유료 상품의 환불 거절이 무효가 된다(전자상거래법 제17조
 * 제6항: 제공 개시 후 철회를 제한하려면 시험 사용을 제공해야 한다).
 */
export function sellable(p: CatalogItem): { ok: true } | { ok: false; why: string } {
  if (!p.active) return { ok: false, why: "지금 팔지 않는 상품입니다." };
  const live = process.env.PAYMENTS_PROVIDER === "portone";
  if (live && priceState(p) === "PRICE_NOT_APPROVED") {
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
