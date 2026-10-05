/**
 * 돈은 최소 단위 정수로 들고 다닌다.
 *
 * **$14.99 를 14.99 로 저장하지 않는다.** 소수를 돈에 쓰면 더하고 나눌
 * 때마다 끝자리가 흔들리고, 흔들린 값이 결제 금액이 된다. 그래서 전부
 * 정수로 두고 **얼마나 쪼개지는지만 통화가 안다.**
 *
 *   KRW 14900  →  ₩14,900   (쪼개지지 않는다)
 *   USD  1499  →  $14.99    (백 조각)
 *
 * `products.amount` · `orders.amount` · `payments.amount` 가 전부 이
 * 단위다. **결제 대행사도 같은 단위로 주고받는다**: 거의 모든 PG 가
 * 최소 단위 정수를 쓰고, 그렇지 않은 대행사를 고르면 그 어댑터가
 * 경계에서 바꾼다(`src/lib/payments/types.ts` 의 계약).
 *
 * **한국만 팔 때는 이 차이가 안 보인다.** KRW 는 쪼개지지 않아서 숫자가
 * 같고, 그래서 글로벌을 여는 날 처음 드러난다.
 */

/** 통화마다 몇 조각으로 쪼개지는가. ISO 4217 의 minor unit 이다 */
const MINOR: Record<string, number> = {
  KRW: 0,
  JPY: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  TRY: 2,
  KZT: 2,
};

/** 모르는 통화는 **두 조각으로 본다.** 세상에서 그쪽이 훨씬 흔하다 */
export function minorDigits(currency: string): number {
  return MINOR[currency.trim().toUpperCase()] ?? 2;
}

/** 최소 단위 → 사람이 읽는 숫자. 1499 USD → 14.99 */
export function toMajor(amount: number, currency: string): number {
  const d = minorDigits(currency);
  return d === 0 ? amount : amount / 10 ** d;
}

/** 사람이 적은 숫자 → 최소 단위. 14.99 USD → 1499 */
export function toMinor(major: number, currency: string): number {
  const d = minorDigits(currency);
  return d === 0 ? Math.round(major) : Math.round(major * 10 ** d);
}

/**
 * 값을 적는다.
 *
 * **0 을 여기서 '무료' 로 적지 않는다.** 0 이 무료인지 아직 못 정한
 * 값인지는 `priceState()` 가 정하고, 화면이 그 상태를 보고 문구를
 * 고른다. 여기서 '무료' 를 돌려주면 미승인 0원도 무료로 적힌다.
 */
export function formatMoney(
  amount: number, currency: string, lang: "ko" | "en",
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cur = currency.trim().toUpperCase();
  const d = minorDigits(cur);
  const n = toMajor(amount, cur).toLocaleString(lang === "ko" ? "ko-KR" : "en-US", {
    minimumFractionDigits: d, maximumFractionDigits: d,
  });
  if (cur === "KRW") return lang === "ko" ? `${n}원` : `KRW ${n}`;
  if (cur === "USD") return `$${n}`;
  return `${cur} ${n}`;
}
