/**
 * MAT 이용권 값(2026-11-03 대표 결정, `docs/assistant/monetization-decisions.md` 의 "가격").
 *
 * **정해지지 않은 값은 `null` 이다.** 화면은 `null` 인 값을 그리지 않고, 결제는 `null` 인 값을 받지 않는다.
 * 시안에 적힌 예시(연구자 90일 · 해외 90일 · 해외 추가 이용권 = 30일 값의 약 2.5배)는 값으로 넣지 않는다.
 *   예시: 연구자 90일 약 49,800원 · 1군 기본 90일 약 $24.99. 대표가 정하기 전에는 값이 아니다
 *
 * 금액은 통화의 최소 단위 정수다: 원화는 원, 달러는 센트(`src/lib/money.ts` 와 같은 규칙).
 */
export const PLANS = ["basic", "research"] as const;
export type Plan = (typeof PLANS)[number];
export const PERIODS = [30, 90] as const;
export type Period = (typeof PERIODS)[number];
export type Tier = "T1" | "T2" | "T3";

export const KRW: Record<Plan, Record<Period, number | null>> = {
  basic: { 30: 9_900, 90: 24_900 },
  research: { 30: 19_900, 90: null },
};

/** 추가 이용권(1회 결제). 해외 값은 미정 */
export const ADDON: { KRW: number | null; USD: number | null } = { KRW: 4_900, USD: null };

/** 해외 30일 값(센트). 90일은 미정 */
export const USD: Record<Tier, Record<Plan, Record<Period, number | null>>> = {
  T1: { basic: { 30: 999, 90: null }, research: { 30: 1_999, 90: null } },
  T2: { basic: { 30: 699, 90: null }, research: { 30: 1_399, 90: null } },
  T3: { basic: { 30: 499, 90: null }, research: { 30: 999, 90: null } },
};

export const TIER_KO: Record<Tier, string> = { T1: "1군", T2: "2군", T3: "3군" };

/**
 * 나라(ISO 3166-1 alpha-2) → 가격대. **목록에 없는 나라는 1군**(대표 결정). 처음 배정은 대표 표의 예시
 * (2군: 중국 · 튀르키예 · 동남아 일부 / 3군: 카자흐스탄 · 필리핀 · 인도 등)이고, 바꿀 때는 이 표만 고친다.
 * 한국(KR)은 이 표를 보지 않는다: 원화 · KCP 다(`src/lib/subscriptions/route.ts`)
 */
export const COUNTRY_TIER: Record<string, Tier> = {
  CN: "T2", TR: "T2", TH: "T2", MY: "T2",
  KZ: "T3", PH: "T3", IN: "T3", VN: "T3", ID: "T3", UZ: "T3", MN: "T3", NP: "T3",
  BD: "T3", PK: "T3", LK: "T3", MM: "T3", KH: "T3",
};

export function tierOf(country: string | null | undefined): Tier {
  const c = (country ?? "").trim().toUpperCase();
  return COUNTRY_TIER[c] ?? "T1";
}

/**
 * 연구자 플랜이 더 여는 것. **파일 한도는 개수가 아니라 쪽 수**(대표 결정). 값은 이 한 곳이고,
 * 요금 화면과 원가 표(`monetization-decisions.md`)가 이 값을 읽는다. 대표 확인 전 처음 값이다
 */
export const RESEARCH_LIMITS = {
  /** 30일 한 칸에 읽는 PDF 쪽 수 합 */
  pagesPer30: 300,
  /** 한 파일에서 읽는 최대 쪽 수 */
  pagesPerFile: 60,
} as const;

export function krwPrice(plan: Plan, period: Period): number | null {
  return KRW[plan]?.[period] ?? null;
}

export function usdPrice(plan: Plan, period: Period, country: string | null | undefined): number | null {
  return USD[tierOf(country)]?.[plan]?.[period] ?? null;
}

/** 화면 값. `null` 이면 `null` (화면이 그 칸을 숨긴다) */
export function priceLabel(amount: number | null, currency: "KRW" | "USD"): string | null {
  if (amount == null) return null;
  return currency === "KRW" ? `${amount.toLocaleString("ko-KR")}원` : `$${(amount / 100).toFixed(2)}`;
}

export function isPlan(x: unknown): x is Plan {
  return typeof x === "string" && (PLANS as readonly string[]).includes(x);
}
export function isPeriod(x: unknown): x is Period {
  return x === 30 || x === 90;
}

/** 요금 화면 주소 */
export const PRICING_HREF = "/mat/pricing";
