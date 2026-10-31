/**
 * 공개 원고에 적히는 값.
 *
 * **정본은 앱의 `products` 표다.** 결제도 주문도 거기서 읽고, 고치는
 * 자리는 `db/schema_phase2_3.sql` 한 곳이다. 소개 사이트는 정적 빌드라
 * 그 표를 볼 수 없어서 적어 둘 수밖에 없는데, **원고 네 벌에 네 번 적어
 * 두면 고칠 때 한 벌이 반드시 남는다.** 실제로 그렇게 남아서 승인된 값이
 * 셋(무료 · 14,900 · 21,900)인데 홈페이지가 옛 단일 가격 29,000원을
 * 적고 있었다. 그래서 여기 한 곳에 둔다.
 *
 * 앱 값이 바뀌면 고칠 곳은 `db/schema_phase2_3.sql` 과 이 파일 둘이다.
 * 등급이 받는 것은 앱의 `src/lib/tiers.ts` 가 정본이고, 여기 적는 한
 * 마디는 그것을 줄인 것이다.
 */

export type TierPrice = {
  /** 앱의 상품 코드 앞자리와 같은 이름 */
  tier: "BASIC" | "STANDARD" | "PRO";
  /** 화면에 찍는 값. 쪼개지는 자릿수는 통화가 정한다 */
  price: string;
  /** 한 마디로 무엇을 사는가 (`src/lib/tiers.ts` 의 headline) */
  headline: string;
  /** 언제 이 등급을 고르는가 */
  when: string;
};

/** 한국 — 승인 2026-10-05 */
export const KR_TIERS: TierPrice[] = [
  { tier: "BASIC",    price: "무료",      headline: "어디부터 볼지 정하기",   when: "아직 후보가 없다면" },
  { tier: "STANDARD", price: "14,900원",  headline: "견주고 고르기",         when: "후보를 좁혀야 한다면" },
  { tier: "PRO",      price: "21,900원",  headline: "증거 전략과 실행 계획", when: "방향이 정해졌다면" },
];

/** 글로벌 — 승인 2026-10-05 */
export const GLOBAL_TIERS: TierPrice[] = [
  { tier: "BASIC",    price: "Free",    headline: "Find where to start",        when: "No candidates yet" },
  { tier: "STANDARD", price: "$14.99",  headline: "Compare and decide",          when: "Narrowing a shortlist" },
  { tier: "PRO",      price: "$24.99",  headline: "Evidence strategy and plan",  when: "Direction already set" },
];

/**
 * AI 취업비서(앱 안의 이름은 Track) 기간권.
 *
 * 정본은 `db/schema_track.sql` 의 `TRACK_30D` · `TRACK_90D` 다. 자동 갱신이
 * 없고(기간이 끝나면 저절로 닫힌다), PRO 결과지를 산 사람의 첫 한 달은
 * `TRACK_PRO_TRIAL` 이 연다. 앱 값이 바뀌면 고칠 곳은 그 파일과 이 줄이다.
 *
 * **한 번 결제로 여는 기간은 90일 이하다**(2026-10-30 대표 확정). NHN KCP 가
 * "서비스 제공기간 3개월 초과 상품" 으로 반려해서 365일권을 내렸다.
 *
 * **값은 원화 한 벌이다**(2026-10-30 대표 결정). 결제가 원화로만 되므로 영어 ·
 * 일본어 · 중국어 판도 이 값을 쓰고, 그 나라 통화는 옆에 참고로만 붙인다
 * (`fx.ts`). 달러 값을 따로 적으면 화면과 청구액이 갈린다.
 *
 * **검사 등급 값은 홈페이지에 적지 않는다.** 지금 앱의 가격표가 판매 중인
 * 등급을 내놓지 않는 시장이 있어서, 여기 적어 두면 사는 쪽이 앱에서 볼 수
 * 없는 값을 홈페이지에서 보게 된다. 개인 요금은 앱 `/pricing` 으로 보낸다.
 */
export const TRACK_KR = {
  month: { name: "30일권", price: "9,900원" },
  quarter: { name: "90일권", price: "24,900원" },
} as const;

/** 값을 한 줄로 늘어놓는다 (`무료 · 14,900원 · 21,900원`) */
export function priceRange(tiers: TierPrice[]): string {
  return tiers.map((t) => t.price).join(" · ");
}

/** 카드의 받는 것 줄 (`BASIC — 어디부터 볼지 정하기 (무료)`) */
export function tierLines(tiers: TierPrice[]): string[] {
  return tiers.map((t) => `${t.tier} — ${t.headline} (${t.price})`);
}

/**
 * 다른 언어 판에서 원화를 적는 꼴 (`4,900원` → `₩4,900`). 값은 위 표에서만
 * 읽는다: 번역 원고에 숫자를 다시 적으면 고칠 때 한 벌이 남는다
 */
export function krw(price: string): string {
  return price.endsWith("원") ? `₩${price.slice(0, -1)}` : price;
}
