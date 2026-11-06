import type { CheckoutTicket, PaymentFact, PaymentProvider, PaymentStatus, PayRegion, RefundResult } from "./types";
import { matchesOrder } from "./verify";
import { opFail, ref, swallow } from "../oplog";

/**
 * **포트원 V1(아임포트) 결제**(2026-11-06 대표 결정: KCP 상점의 V2(PG-API)가 막혀 있어, 계약이 끝난 V1 실채널
 * `개인용pca` 로 MAT 결제를 먼저 연다). `PORTONE_API_VERSION=v1` 일 때만 쓴다(`index.ts`). 기본은 V2 그대로다.
 *
 * - 결제창: 브라우저가 `IMP.init(가맹점 식별코드)` → `IMP.request_pay({ channelKey, merchant_uid, … notice_url })`.
 *   `merchant_uid` 는 우리 주문번호다
 * - 확인: REST 로 `imp_uid`(또는 주문번호)를 조회해 상태 · 금액 · 통화 · `merchant_uid` 를 대조한다. 브라우저가 돌려준 값은 믿지 않는다
 * - 결제 알림: **포트원 콘솔의 V1 결제알림 주소를 바꾸지 않는다**(그 주소는 다른 서비스가 쓰는 중이다). 결제 요청마다
 *   `notice_url` 로 우리 주소(`/api/payments/webhook`)를 넣는다. V1 알림에는 서명이 없어서, 알림은 "이 결제를 다시
 *   조회해 보라" 는 신호로만 쓰고 확정은 REST 조회 결과로만 한다. 알림이 오지 않아도 완료 화면이 같은 조회로 확정한다
 * - 환불: REST `POST /payments/cancel`(부분 취소는 금액을 넣는다)
 *
 * 열쇠(REST API Key · Secret)는 서버에만 있다. 브라우저에는 가맹점 식별코드 · 채널 키만 간다(둘 다 공개 값이다).
 */

const API = "https://api.iamport.kr";
export const PORTONE_V1_NAME = "portone_v1";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 가 설정되지 않았습니다.`);
  return v;
}

/** V1 상태 → 우리 상태 */
export function v1Status(s: string): PaymentStatus {
  switch (s) {
    case "paid": return "paid";
    case "failed": return "failed";
    case "cancelled": return "cancelled";
    default: return "ready";
  }
}

/** V1 을 쓸 준비가 됐는가(빈 칸 이름을 돌려준다) */
export function v1Missing(): string[] {
  return ["PORTONE_V1_IMP_CODE", "PORTONE_V1_API_KEY", "PORTONE_V1_API_SECRET", "PORTONE_V1_CHANNEL_KEY"]
    .filter((k) => !process.env[k]);
}

/** 결제 알림을 받을 우리 주소. 결제 요청마다 `notice_url` 로 넣는다(콘솔 설정은 건드리지 않는다) */
export function v1NoticeUrl(): string {
  const set = (process.env.PORTONE_V1_NOTICE_URL ?? "").trim();
  if (set) return set;
  const base = (process.env.PLATFORM_URL ?? "https://app.careermatri.com").replace(/\/+$/, "");
  return `${base}/api/payments/webhook`;
}

/* ── REST ─────────────────────────────────────────────────── */

type V1Resp<T> = { code: number; message: string | null; response: T | null };

/** 접근 토큰. 30분짜리라 25분 동안 다시 쓴다 */
let token: { value: string; until: number } | null = null;
async function accessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  if (token && token.until > Date.now()) return token.value;
  const res = await fetchImpl(`${API}/users/getToken`, {
    method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
    body: JSON.stringify({ imp_key: env("PORTONE_V1_API_KEY"), imp_secret: env("PORTONE_V1_API_SECRET") }),
  });
  const body = (await res.json().catch(() => null)) as V1Resp<{ access_token: string }> | null;
  if (!res.ok || !body || body.code !== 0 || !body.response?.access_token) {
    throw new Error(`PortOne V1 토큰 발급 실패 (${res.status}) ${body?.message ?? ""}`.trim());
  }
  token = { value: body.response.access_token, until: Date.now() + 25 * 60_000 };
  return token.value;
}
/** 시험이 토큰 기억을 비울 때 */
export function resetV1Token(): void { token = null; }

export type V1Payment = {
  imp_uid: string; merchant_uid: string; status: string; amount: number; cancel_amount?: number;
  currency?: string; pay_method?: string; pg_provider?: string; custom_data?: string | null;
  fail_reason?: string | null;
};

/**
 * 결제 한 건 조회. `imp_` 로 시작하면 결제 고유번호로, 아니면 주문번호(`merchant_uid`)로 찾는다
 * (완료 화면이 주문번호만 알 때 · 결제창이 고유번호를 돌려주지 못했을 때). 주문번호로 찾을 때는 결제된 건을 먼저 본다
 */
export async function v1Lookup(id: string, fetchImpl: typeof fetch = fetch): Promise<V1Payment> {
  const tk = await accessToken(fetchImpl);
  const get = async (path: string) => {
    const res = await fetchImpl(`${API}${path}`, { headers: { Authorization: tk }, cache: "no-store" });
    const body = (await res.json().catch(() => null)) as V1Resp<V1Payment> | null;
    return { res, body };
  };
  const byImp = id.startsWith("imp_");
  let r = await get(byImp ? `/payments/${encodeURIComponent(id)}` : `/payments/find/${encodeURIComponent(id)}/paid`);
  if (!byImp && (!r.res.ok || !r.body?.response)) r = await get(`/payments/find/${encodeURIComponent(id)}`);
  if (!r.res.ok || !r.body || r.body.code !== 0 || !r.body.response) {
    throw new Error(`PortOne V1 결제 조회 실패 (${r.res.status}) ${r.body?.message ?? ""}`.trim());
  }
  return r.body.response;
}

/** 조회 결과 → 우리 결제 사실. 주문번호는 `merchant_uid`(그냥 글자로 온다) */
export function v1Fact(p: V1Payment): PaymentFact {
  return {
    providerPaymentId: p.imp_uid,
    status: v1Status(p.status),
    amount: p.amount ?? 0,
    cancelledAmount: p.cancel_amount || undefined,
    currency: (p.currency ?? "KRW").toUpperCase(),
    method: p.pay_method,
    orderNo: p.merchant_uid,
    raw: p,
  };
}

/**
 * 결제 알림 본문 → 결제 고유번호. JSON(`{"imp_uid":…}`)과 폼(`imp_uid=…&merchant_uid=…`) 둘 다 받는다.
 * **서명이 없다**: 여기서 아무것도 확정하지 않고, 부르는 쪽이 REST 로 다시 조회한다
 */
export function parseV1Notice(raw: string): { impUid: string; merchantUid: string | null; status: string | null } | null {
  let o: Record<string, unknown> | null = null;
  try { o = JSON.parse(raw) as Record<string, unknown>; } catch {
    const q = new URLSearchParams(raw);
    if (q.has("imp_uid")) o = Object.fromEntries(q.entries());
  }
  const imp = typeof o?.imp_uid === "string" ? o.imp_uid.trim() : "";
  if (!/^imp_[A-Za-z0-9]{6,40}$/.test(imp)) return null;
  return {
    impUid: imp,
    merchantUid: typeof o?.merchant_uid === "string" ? o.merchant_uid : null,
    status: typeof o?.status === "string" ? o.status : null,
  };
}

export const portoneV1Provider: PaymentProvider = {
  name: PORTONE_V1_NAME,
  /* V1 은 국내 카드(KCP)만 연다. 해외 카드는 V2 · Paddle 쪽 */
  markets: ["domestic"] as readonly PayRegion[],

  async createCheckout(input): Promise<CheckoutTicket> {
    if (input.region !== "domestic") throw new Error("PortOne V1 은 국내 카드 결제만 엽니다.");
    return {
      provider: PORTONE_V1_NAME,
      /* 결제 고유번호(imp_uid)는 결제창이 끝나야 생긴다. 그 전에는 주문번호로 찾는다(`v1Lookup`) */
      providerPaymentId: input.orderNo,
      orderNo: input.orderNo,
      orderName: input.orderName,
      amount: input.amount,
      currency: input.currency,
      storeId: env("PORTONE_V1_IMP_CODE"),
      channelKey: env("PORTONE_V1_CHANNEL_KEY"),
      redirectUrl: input.redirectUrl,
      region: input.region,
      noticeUrl: v1NoticeUrl(),
      sdk: "v1",
    };
  },

  async getPaymentStatus(providerPaymentId): Promise<PaymentFact> {
    return v1Fact(await v1Lookup(providerPaymentId));
  },

  async verifyPayment({ providerPaymentId, expectAmount, expectCurrency }) {
    const fact = await portoneV1Provider.getPaymentStatus(providerPaymentId);
    const m = matchesOrder(fact, { amount: expectAmount, currency: expectCurrency });
    return m.ok ? { ok: true, fact } : m;
  },

  async handleWebhook(rawBody) {
    const n = parseV1Notice(rawBody);
    if (!n) return { ok: false, reason: "PortOne V1 결제 알림 꼴이 아닙니다(imp_uid 없음)" };
    /* 같은 결제의 같은 상태 알림은 한 번만 쌓는다(`payment_events` 유일). 확정은 REST 조회로 */
    return { ok: true, eventId: `${n.impUid}:${n.status ?? "?"}`, providerPaymentId: n.impUid };
  },

  async refundPayment({ providerPaymentId, amount, reason }): Promise<RefundResult> {
    let tk: string;
    try { tk = await accessToken(); } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "PortOne V1 토큰 발급 실패" };
    }
    const res = await fetch(`${API}/payments/cancel`, {
      method: "POST", cache: "no-store",
      headers: { Authorization: tk, "Content-Type": "application/json" },
      /* 금액을 넣으면 부분 취소다. 얼마를 돌려줄지는 `refund.ts` 가 정했다 */
      body: JSON.stringify({ imp_uid: providerPaymentId, amount, reason: reason.slice(0, 200) }),
    });
    const body = ((await res.json().catch(swallow({
      operation: "portone_v1.refund", ref: ref("payment", providerPaymentId), step: "parseBody", category: "upstream",
      detail: `status=${res.status}`,
    }))) ?? null) as V1Resp<{ imp_uid: string; cancel_amount: number; cancel_history?: { pg_tid?: string; amount?: number }[] }> | null;
    if (!res.ok || !body || body.code !== 0 || !body.response) {
      opFail({ operation: "portone_v1.refund", ref: ref("payment", providerPaymentId), step: "cancel", category: "upstream",
        detail: `status=${res.status} ${body?.message ?? ""}`.slice(0, 200) });
      return { ok: false, reason: `PortOne V1 환불 실패 (${res.status}) ${body?.message ?? ""}`.trim() };
    }
    const last = body.response.cancel_history?.[body.response.cancel_history.length - 1];
    return { ok: true, providerRefundId: last?.pg_tid ?? null, amount: last?.amount ?? amount };
  },
};
