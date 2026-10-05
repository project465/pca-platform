/**
 * 어느 시장에서 들어왔는가.
 *
 * **호스트가 정하고 코드가 적지 않는다.** `site_configs` 한 표에만 도메인이
 * 있으므로(설계 원칙: 도메인을 코드에 적지 않는다) 여기서도 그 표를 읽는다.
 * 한국 도메인에서 열면 KRW 가, 글로벌 도메인에서 열면 USD 가 나온다.
 *
 * **시장과 화면 언어를 묶지 않는다.** 한국 사이트를 영어로 보는 사람도
 * 원화로 산다. 통화는 사이트가 정하고 언어는 사용자가 정한다.
 *
 * `?market=` 을 받는 것은 한 배포본에서 두 시장을 눌러 보기 위해서다.
 * **주소로 값이 바뀌지 않는다**: 주문 금액은 서버가 `products` 에서 다시
 * 읽으므로(규격 §8) 시장을 바꿔도 남의 가격으로 결제되지 않는다.
 */
import { headers } from "next/headers";
import { isMarket, type Market } from "@/lib/catalog";
import { siteByHost } from "@/lib/sites";

export type MarketCtx = {
  market: Market;
  siteId: string;
  /** 이 사이트가 기본으로 쓰는 통화. 화면에 적을 때만 쓴다 */
  currency: string;
  domain: string | null;
};

export async function resolveMarket(override?: string): Promise<MarketCtx> {
  const host = (await headers()).get("host");
  const site = await siteByHost(host).catch(() => null);
  const fromSite = isMarket(site?.payment_market) ? site.payment_market : "GLOBAL";
  const market = isMarket(override) ? override : fromSite;

  /* 시장을 손으로 바꿨으면 사이트도 그 시장 것으로 따라간다. 안 그러면
     한국 사이트 설정으로 달러를 적는 화면이 나온다 */
  if (market !== fromSite) {
    const { siteForMarket } = await import("@/lib/catalog");
    const id = await siteForMarket(market);
    const { siteById } = await import("@/lib/sites");
    const s = await siteById(id).catch(() => null);
    return {
      market,
      siteId: id,
      currency: s?.default_currency ?? (market === "KR" ? "KRW" : "USD"),
      domain: s?.domain ?? null,
    };
  }

  return {
    market,
    siteId: site?.site_id ?? (market === "KR" ? "kr" : "global"),
    currency: site?.default_currency ?? (market === "KR" ? "KRW" : "USD"),
    domain: site?.domain ?? null,
  };
}

/**
 * 값을 적는다. 셈은 `money.ts` 한 곳에서 한다.
 *
 * **0 을 '무료' 로 적지 않는다.** 0 이 승인된 무료인지 아직 못 정한
 * 값인지는 `priceState()` 가 정하고, 화면이 그 상태를 보고 문구를
 * 고른다(`catalog.PriceState`).
 */
export { formatMoney as money } from "./money";
