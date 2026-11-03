import { tierOf, type Tier } from "@/lib/pricing/config";

/**
 * 어느 결제사 · 통화로 받는가(2026-11-03 대표 결정 "국내 고객이 해외 결제창으로 가지 않게 나라를 가른다").
 *
 *   국내(한국 카드)  → NHN KCP(PortOne 빌링키) · 원화
 *   해외(해외 카드)  → Paddle · 달러(나라 → 가격대 1군 · 2군 · 3군)
 *
 * 쓰는 신호와 차례
 *   1. **카드 발급국**(알 때만): 가장 믿을 만하다. 한국 카드면 무조건 KCP, 해외 카드면 Paddle.
 *      KCP 국내 채널은 해외 카드를 받지 않으므로, KCP 빌링키 발급이 성공했다는 것이 곧 한국 카드라는 뜻이다.
 *      Paddle 쪽에서 결제 뒤 알려 준 나라가 KR 이면 웹훅이 그 구독을 멈추고 운영자에게 알린다(`paddle.ts`)
 *   2. **한국 신호가 하나라도 있으면 KCP.** 가입 국가가 KR 이거나, 지금 접속 국가 머리글이 KR 이면 KCP 다.
 *      해외에 있는 한국 사람 · 국내 유학생이 해외 결제창으로 가는 것보다, 해외 카드를 가진 사람이 KCP 에서
 *      거절되고 다시 고르는 쪽이 낫다(돈이 잘못 나가지 않는다)
 *   3. 한국 신호가 없고 해외 나라를 알면 Paddle · 그 나라 가격대. 목록에 없는 나라는 1군
 *   4. 아무것도 모르면 KCP(국내 기본). 해외로 보낼 근거가 없으면 보내지 않는다
 *
 * 접속 국가는 앞단이 붙이는 머리글만 읽는다(`cf-ipcountry` · `x-vercel-ip-country` · `x-country-code`).
 * IP 를 직접 조회하지 않는다. 머리글이 없으면 그 신호는 없는 것이다.
 */
export type PayRoute =
  | { provider: "kcp"; currency: "KRW"; country: "KR"; reason: RouteReason }
  | { provider: "paddle"; currency: "USD"; country: string; tier: Tier; reason: RouteReason };

export type RouteReason = "card" | "signup_kr" | "ip_kr" | "foreign" | "unknown";

export type RouteSignals = {
  /** 가입 때 적힌 나라(ISO 두 글자) */
  signupCountry?: string | null;
  /** 지금 접속 국가 머리글 */
  ipCountry?: string | null;
  /** 카드 발급국(알 때만) */
  cardCountry?: string | null;
};

const cc = (x: string | null | undefined): string | null => {
  const v = (x ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1" ? v : null;
};

export function routeFor(s: RouteSignals): PayRoute {
  const card = cc(s.cardCountry);
  const signup = cc(s.signupCountry);
  const ip = cc(s.ipCountry);
  if (card === "KR") return { provider: "kcp", currency: "KRW", country: "KR", reason: "card" };
  if (card) return { provider: "paddle", currency: "USD", country: card, tier: tierOf(card), reason: "card" };
  if (signup === "KR") return { provider: "kcp", currency: "KRW", country: "KR", reason: "signup_kr" };
  if (ip === "KR") return { provider: "kcp", currency: "KRW", country: "KR", reason: "ip_kr" };
  const foreign = signup ?? ip;
  if (foreign) return { provider: "paddle", currency: "USD", country: foreign, tier: tierOf(foreign), reason: "foreign" };
  return { provider: "kcp", currency: "KRW", country: "KR", reason: "unknown" };
}

/** 앞단이 붙인 접속 국가 머리글 */
export function ipCountryFrom(h: { get(name: string): string | null }): string | null {
  return cc(h.get("cf-ipcountry") ?? h.get("x-vercel-ip-country") ?? h.get("x-country-code"));
}

/** 이 사람의 신호를 읽어 길을 정한다(가입 국가 · 카드 발급국은 `user_attribution` · 구독 줄에서) */
export async function routeForUser(userId: string, ipCountry: string | null): Promise<PayRoute> {
  const { queryOne } = await import("@/lib/db");
  const a = await queryOne<{ signup_country: string | null; card_country: string | null }>(
    `SELECT signup_country, card_country FROM user_attribution WHERE user_id = $1`, [userId]).catch(() => null);
  return routeFor({ signupCountry: a?.signup_country, ipCountry, cardCountry: a?.card_country });
}
