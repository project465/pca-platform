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

/** 값을 한 줄로 늘어놓는다 (`무료 · 14,900원 · 21,900원`) */
export function priceRange(tiers: TierPrice[]): string {
  return tiers.map((t) => t.price).join(" · ");
}

/** 카드의 받는 것 줄 (`BASIC — 어디부터 볼지 정하기 (무료)`) */
export function tierLines(tiers: TierPrice[]): string[] {
  return tiers.map((t) => `${t.tier} — ${t.headline} (${t.price})`);
}
