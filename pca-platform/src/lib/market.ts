/**
 * 어느 시장에서 사는가.
 *
 * **시장은 언어가 아니다.** 한국 사이트를 영어로 보는 사람도 원화로
 * 사고, 미국에서 한국어로 읽는 사람도 달러로 산다. 그래서 `?lang=` 은
 * 이 함수에 한 줄도 들어오지 않는다. 언어를 바꿨다고 값이 달라지면
 * **같은 화면에서 두 가격을 본 사람**이 생기고, 그 사람은 어느 쪽이
 * 진짜인지 묻는다.
 *
 * 고르는 차례가 넷이고 **위에서 아래로 내려간다.**
 *
 *   1. `?market=`      손님이 방금 고른 것. 미들웨어가 쿠키로 굳힌다
 *   2. 쿠키            지난번에 고른 것. 가격표 → 결제 → 주문이 안 갈린다
 *   3. 호스트          `careermatri.co.kr` 처럼 **시장이 붙은 도메인**일 때만
 *   4. 기본값          `DEFAULT_MARKET`, 안 적으면 KR (한국을 먼저 켠다)
 *
 * **모르는 호스트를 글로벌로 떨어뜨리지 않는다.** 예전에는 `siteByHost`
 * 가 못 찾으면 global 을 돌려줘서, `app.careermatri.com` 과 개발용
 * `127.0.0.1` 이 둘 다 글로벌 시장이 됐다. 한국어로 열어도 `$14.99` 가
 * 찍힌 까닭이 이것이다. 플랫폼은 전 세계 하나라(설계 원칙 5) 그 호스트는
 * 어느 시장도 아니고, 시장은 손님이 고르거나 소개 사이트가 들고 온다.
 *
 * `?market=` 을 받는 것은 한 배포본에서 두 시장을 눌러 보기 위해서다.
 * **주소로 값이 바뀌지 않는다**: 주문 금액은 서버가 `products` 에서 다시
 * 읽어 굳히므로(규격 §8) 시장을 바꿔도 남의 가격으로 결제되지 않는다.
 */
import { cookies, headers } from "next/headers";
import { isMarket, type Market } from "@/lib/catalog";
import { siteById, siteForHostExact } from "@/lib/sites";

/** 어디서 정해졌는가. 운영 화면과 검사가 이 값을 본다 */
export type MarketSource = "query" | "cookie" | "host" | "default";

export { MARKET_COOKIE } from "./market-def";
import { MARKET_COOKIE } from "./market-def";

/** 아무것도 모를 때 어느 시장인가. **한국 B2C 를 먼저 켠다** */
export function defaultMarket(): Market {
  const v = process.env.DEFAULT_MARKET;
  return isMarket(v) ? v : "KR";
}

export type MarketCtx = {
  market: Market;
  siteId: string;
  /** 이 시장이 쓰는 통화. 화면에 적을 때만 쓴다. 값은 `products` 가 든다 */
  currency: string;
  domain: string | null;
  source: MarketSource;
};

export async function resolveMarket(override?: string): Promise<MarketCtx> {
  const host = (await headers()).get("host");
  const hostSite = await siteForHostExact(host).catch(() => null);
  const fromCookie = (await cookies()).get(MARKET_COOKIE)?.value;

  let market: Market;
  let source: MarketSource;
  if (isMarket(override)) {
    market = override; source = "query";
  } else if (isMarket(fromCookie)) {
    market = fromCookie; source = "cookie";
  } else if (isMarket(hostSite?.payment_market)) {
    market = hostSite.payment_market; source = "host";
  } else {
    market = defaultMarket(); source = "default";
  }

  /* 고른 시장의 사이트 설정을 읽는다. 호스트가 그 시장 도메인이면 그
     줄을, 아니면 그 시장을 맡은 줄을 본다. **한국 시장을 보면서 글로벌
     사이트의 통화를 적는 일이 없게** 한다 */
  const site = isMarket(hostSite?.payment_market) && hostSite.payment_market === market
    ? hostSite
    : await siteForMarketConfig(market);

  return {
    market,
    siteId: site?.site_id ?? (market === "KR" ? "kr" : "global"),
    currency: site?.default_currency ?? (market === "KR" ? "KRW" : "USD"),
    domain: site?.domain ?? null,
    source,
  };
}

async function siteForMarketConfig(market: Market) {
  const { siteForMarket } = await import("@/lib/catalog");
  const id = await siteForMarket(market).catch(() => null);
  if (!id) return null;
  return siteById(id).catch(() => null);
}

/** 주소에 시장을 들고 다닌다. **링크 한 줄이 시장을 떨어뜨리지 않게** */
export function withMarket(href: string, market: Market, lang?: string): string {
  const [path, qs] = href.split("?");
  const p = new URLSearchParams(qs ?? "");
  p.set("market", market);
  if (lang) p.set("lang", lang);
  return `${path}?${p.toString()}`;
}

/**
 * 값을 적는다. 셈은 `money.ts` 한 곳에서 한다.
 *
 * **0 을 '무료' 로 적지 않는다.** 0 이 승인된 무료인지 아직 못 정한
 * 값인지는 `priceState()` 가 정하고, 화면이 그 상태를 보고 문구를
 * 고른다(`catalog.PriceState`).
 */
export { formatMoney as money } from "./money";
