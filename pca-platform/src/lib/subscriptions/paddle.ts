import { createHmac, timingSafeEqual } from "node:crypto";
import { appEnv } from "@/lib/env";
import { liveChargesAllowed } from "./open";
import type { BillingProvider, ChargeResult, SubEvent } from "./types";

/**
 * 해외 정기결제: Paddle(2026-11-03 대표 결정. 가입 · 열쇠 발급은 대표가 직접, 열쇠는 Railway 에만).
 * **sandbox 만 만든다.** `PADDLE_ENV=sandbox` 가 아니면 열지 않는다(운영 열쇠로 바꾸는 것은 대표 승인 뒤).
 *
 * Paddle 은 **결제사가 갱신을 한다**(`managed`). 우리는 결제창(오버레이)을 열 거래를 만들고, 웹훅으로 받은
 * 사건을 같은 상태 표에 옮긴다(`engine.ts` 의 applySubEvent).
 *
 * 환경변수(이름만 여기 적는다. 값은 Railway 에만)
 *   PADDLE_ENV             `sandbox` 여야 연다
 *   PADDLE_API_KEY         서버 API 열쇠(비밀)
 *   PADDLE_WEBHOOK_SECRET  웹훅 서명 열쇠(비밀)
 *   PADDLE_CLIENT_TOKEN    Paddle.js 오버레이용 공개 토큰
 *
 * 이 저장소의 시험 환경은 바깥망이 막혀 있어 실제 Paddle 을 부르지 못한다. 서명 검증 · 사건 옮기기는 가짜 값으로
 * 시험하고(`npm run mat:money`), 실제 sandbox 호출은 대표가 열쇠를 넣은 뒤 확인한다.
 */
const SANDBOX_API = "https://sandbox-api.paddle.com";

export function paddleReady(): boolean {
  if (process.env.PADDLE_ENV !== "sandbox") return false;
  if (!process.env.PADDLE_API_KEY || !process.env.PADDLE_WEBHOOK_SECRET || !process.env.PADDLE_CLIENT_TOKEN) return false;
  /* sandbox 라도 운영 배포본에서 손님을 받는 것은 대표 승인 뒤다 */
  return appEnv() !== "production" || process.env.SUBSCRIPTIONS_LIVE === "1";
}

export function paddleClientConfig(): { token: string; environment: "sandbox" } | null {
  return paddleReady() ? { token: process.env.PADDLE_CLIENT_TOKEN!, environment: "sandbox" } : null;
}

async function api(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${SANDBOX_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY ?? ""}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}

/**
 * 결제창을 열 거래를 만든다(카탈로그 없는 값: 설정의 달러 값을 그대로 보낸다). 브라우저는 돌려받은 거래 번호로
 * `Paddle.Checkout.open({ transactionId })` 를 연다. 우리 정기결제 번호를 `custom_data` 에 싣는다
 */
export async function paddleCreateCheckout(input: {
  subscriptionId: string; userId: string; amount: number; periodDays: number; name: string;
}): Promise<{ ok: true; transactionId: string } | { ok: false; reason: string }> {
  if (!paddleReady() || !liveChargesAllowed()) return { ok: false, reason: "closed" };
  const body = {
    items: [{
      quantity: 1,
      price: {
        description: input.name, name: input.name,
        unit_price: { amount: String(input.amount), currency_code: "USD" },
        billing_cycle: { interval: "day", frequency: input.periodDays },
        product: { name: input.name, tax_category: "standard" },
      },
    }],
    custom_data: { cm_sub: input.subscriptionId, cm_user: input.userId },
    collection_mode: "automatic",
  };
  const res = await api("/transactions", { method: "POST", body: JSON.stringify(body) }).catch(() => null);
  if (!res?.ok) return { ok: false, reason: `paddle ${res?.status ?? "net"}` };
  const j = (await res.json().catch(() => null)) as { data?: { id?: string } } | null;
  return j?.data?.id ? { ok: true, transactionId: j.data.id } : { ok: false, reason: "paddle body" };
}

/**
 * 웹훅 서명 검증. 머리글 `Paddle-Signature: ts=…;h1=…`, 서명 대상은 `${ts}:${본문}`, HMAC-SHA256(열쇠).
 * 5분을 넘긴 것은 받지 않는다(재전송 공격). 비교는 timingSafeEqual
 */
export function verifyPaddleSignature(raw: string, header: string | null | undefined, secret = process.env.PADDLE_WEBHOOK_SECRET ?? "", nowMs = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=", 2) as [string, string]));
  const ts = Number(parts.ts);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > 300) return false;
  const want = createHmac("sha256", secret).update(`${parts.ts}:${raw}`).digest("hex");
  const got = String(parts.h1 ?? "");
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

type PaddleEvent = {
  event_id?: string;
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    origin?: string;
    subscription_id?: string | null;
    custom_data?: { cm_sub?: string } | null;
    currency_code?: string;
    details?: { totals?: { total?: string } };
    billing_period?: { ends_at?: string } | null;
    current_billing_period?: { ends_at?: string } | null;
    address?: { country_code?: string } | null;
  };
};

/**
 * Paddle 사건 → 우리 사건. 모르는 사건은 `null`(받고 버린다).
 * - transaction.completed: 첫 결제(origin web · 구독 번호 + 우리 번호)면 activated, 자동 갱신(subscription_recurring)이면 renewed
 * - transaction.payment_failed · subscription.past_due → payment_failed
 * - subscription.paused · subscription.canceled · subscription.resumed → 같은 이름
 */
export function mapPaddleEvent(ev: PaddleEvent): SubEvent | null {
  const d = ev.data ?? {};
  const t = ev.event_type ?? "";
  const total = Number(d.details?.totals?.total ?? NaN);
  const cur = (d.currency_code ?? "USD").toUpperCase();
  const periodEnd = d.billing_period?.ends_at ?? d.current_billing_period?.ends_at ?? null;
  if (t === "transaction.completed" && d.id && d.subscription_id) {
    if (d.origin === "subscription_recurring") {
      return { type: "renewed", ref: d.subscription_id, paymentId: d.id, amount: total, currency: cur, periodEnd };
    }
    const ours = d.custom_data?.cm_sub;
    if (!ours || !/^\d+$/.test(ours)) return null;
    return { type: "activated", ref: ours, subscriptionId: d.subscription_id, paymentId: d.id, amount: total, currency: cur,
      country: d.address?.country_code?.toUpperCase() ?? null, periodEnd };
  }
  if (t === "transaction.payment_failed" && d.subscription_id) return { type: "payment_failed", ref: d.subscription_id, reason: d.status ?? "failed" };
  if (t === "subscription.past_due" && d.id) return { type: "payment_failed", ref: d.id, reason: "past_due" };
  if (t === "subscription.paused" && d.id) return { type: "paused", ref: d.id };
  if (t === "subscription.canceled" && d.id) return { type: "canceled", ref: d.id };
  if (t === "subscription.resumed" && d.id) return { type: "resumed", ref: d.id };
  return null;
}

export const paddleBilling: BillingProvider = {
  name: "paddle",
  managed: true,
  async charge(): Promise<ChargeResult> {
    return { ok: false, reason: "Paddle 은 결제사가 갱신합니다", retryable: false };
  },
  /* 다음 회차부터 멈춘다. 이미 낸 기간은 그대로(Paddle `effective_from: next_billing_period`) */
  async cancel(ref) {
    if (!paddleReady()) return { ok: false, reason: "closed" };
    const res = await api(`/subscriptions/${encodeURIComponent(ref)}/cancel`, {
      method: "POST", body: JSON.stringify({ effective_from: "next_billing_period" }),
    }).catch(() => null);
    return { ok: Boolean(res?.ok), reason: res?.ok ? undefined : `paddle ${res?.status ?? "net"}` };
  },
};

/**
 * Paddle 결제 환불(조정 adjustment). **금액은 `refund.ts` 가 정한다.** 전액이면 full, 아니면 첫 항목에 partial
 */
export async function paddleRefund(transactionId: string, amount: number, reason: string): Promise<{ ok: true; id: string | null } | { ok: false; reason: string }> {
  if (!paddleReady()) return { ok: false, reason: "closed" };
  const t = await api(`/transactions/${encodeURIComponent(transactionId)}`, { method: "GET" }).catch(() => null);
  const j = t?.ok ? ((await t.json().catch(() => null)) as { data?: { details?: { totals?: { total?: string }; line_items?: { id: string }[] } } } | null) : null;
  const item = j?.data?.details?.line_items?.[0]?.id;
  if (!item) return { ok: false, reason: "paddle transaction" };
  const full = Number(j?.data?.details?.totals?.total ?? NaN) === amount;
  const res = await api("/adjustments", {
    method: "POST",
    body: JSON.stringify({ action: "refund", transaction_id: transactionId, reason,
      items: [full ? { type: "full", item_id: item } : { type: "partial", item_id: item, amount: String(amount) }] }),
  }).catch(() => null);
  if (!res?.ok) return { ok: false, reason: `paddle adjustment ${res?.status ?? "net"}` };
  const a = (await res.json().catch(() => null)) as { data?: { id?: string } } | null;
  return { ok: true, id: a?.data?.id ?? null };
}
