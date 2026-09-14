/**
 * 가격의 단일 출처.
 *
 * **브라우저가 보낸 금액은 절대 쓰지 않는다.** 정적으로 나가는 소개
 * 사이트는 누구나 원고를 뜯어고쳐 다시 보낼 수 있으므로, 화면에 적힌
 * 숫자는 안내문이고 청구할 금액은 여기서만 나온다.
 *
 * 원화가 정본이다(R038). 달러·텡게는 2026-09-11 환율로 환산해 올림한
 * 값이고, 소개 사이트 원고의 숫자와 **같아야 한다** —
 * `marketing/src/content/{global,kz}.ts` 의 `pricing.plans[].price`.
 * 한쪽만 고치면 화면과 청구서가 갈린다.
 */

export type Product = "individual";
export type Site = "global" | "kr" | "kz";

export type Price = {
  /** 최소 화폐 단위. 원·텡게는 그대로, 달러는 센트 */
  amount: number;
  currency: "KRW" | "USD" | "KZT";
};

const TABLE: Record<Site, Record<Product, Price>> = {
  kr: { individual: { amount: 25_000, currency: "KRW" } },
  global: { individual: { amount: 1_900, currency: "USD" } },
  kz: { individual: { amount: 8_500, currency: "KZT" } },
};

export function isSite(v: unknown): v is Site {
  return v === "global" || v === "kr" || v === "kz";
}

export function isProduct(v: unknown): v is Product {
  return v === "individual";
}

export function priceOf(site: Site, product: Product): Price {
  return TABLE[site][product];
}

/**
 * 지금 결제받을 수 있는 통화.
 *
 * 결제대행사 계약이 통화마다 따로 열린다. 열리지 않은 통화로 주문을
 * 만들면 결제창에서야 막히고, 그때는 이미 산 줄 아는 사람이 생긴다.
 * 그래서 주문을 만드는 자리에서 먼저 막는다 — 파는 나라를 늘리는 것은
 * 환경변수를 고치는 의식적인 행동이어야 한다.
 */
export function enabledCurrencies(): Set<string> {
  const raw = process.env.PAYMENTS_CURRENCIES ?? "KRW";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
}

/** 사람에게 보여줄 금액. 메일과 화면이 같은 모양을 쓰게 한다 */
export function formatPrice(p: Price, lang: "ko" | "en"): string {
  if (p.currency === "USD") return `US$${(p.amount / 100).toFixed(2)}`;
  if (p.currency === "KZT") return `${p.amount.toLocaleString("en-US")} ₸`;
  return lang === "ko"
    ? `${p.amount.toLocaleString("ko-KR")}원`
    : `KRW ${p.amount.toLocaleString("en-US")}`;
}
