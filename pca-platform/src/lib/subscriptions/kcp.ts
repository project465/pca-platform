import { appEnv } from "@/lib/env";
import { liveChargesAllowed } from "./open";
import type { BillingProvider, ChargeResult } from "./types";

/**
 * 국내 정기결제: NHN KCP 빌링키, PortOne V2 채널로(2026-11-03 대표 결정). **시험 모드만 만든다.**
 *
 * 흐름
 *   1. 결제 화면(브라우저)이 PortOne SDK `requestIssueBillingKey` 로 카드를 등록하고 빌링키를 받는다
 *   2. 서버가 그 빌링키를 PortOne 에 다시 물어 확인한다(`verifyBillingKey`). 화면이 보낸 값을 믿지 않는다
 *   3. 결제일마다 서버가 `POST /payments/{paymentId}/billing-key` 로 청구한다(`charge`)
 *   4. 해지하면 빌링키를 지운다(`DELETE /billing-keys/{billingKey}`). 다시 쓰려면 카드를 새로 등록한다
 *
 * 환경변수(값은 Railway 에만. 저장소 · 채팅에 적지 않는다)
 *   PORTONE_BILLING_STORE_ID     상점 아이디(없으면 PORTONE_STORE_ID)
 *   PORTONE_BILLING_CHANNEL_KEY  KCP 정기결제 **시험** 채널 키(공개값)
 *   PORTONE_BILLING_API_SECRET   V2 API secret(비밀)
 *   PORTONE_BILLING_MODE         `test` 여야 연다. 운영 채널은 대표 승인 뒤 `live` + SUBSCRIPTIONS_LIVE=1
 *   PORTONE_BILLING_API_BASE     시험에서만 가짜 PortOne 주소. 운영에서는 읽지 않는다
 *
 * **운영(`APP_ENV=production`)에서는 `SUBSCRIPTIONS_LIVE=1` 이 아니면 청구하지 않는다**(시험 키가 들어 있어도).
 */
const API = () => (appEnv() !== "production" && process.env.PORTONE_BILLING_API_BASE) || "https://api.portone.io";
const storeId = () => process.env.PORTONE_BILLING_STORE_ID || process.env.PORTONE_STORE_ID || "";

export function kcpMode(): "test" | "live" | null {
  const m = process.env.PORTONE_BILLING_MODE;
  return m === "test" || m === "live" ? m : null;
}

/** KCP 정기결제를 열 수 있는가. 키가 없거나, 시험 모드가 아니면서 운영 허락이 없으면 닫힌다 */
export function kcpReady(): boolean {
  if (!process.env.PORTONE_BILLING_CHANNEL_KEY || !process.env.PORTONE_BILLING_API_SECRET || !storeId()) return false;
  const mode = kcpMode();
  if (mode === "test") return appEnv() !== "production" || process.env.SUBSCRIPTIONS_LIVE === "1";
  if (mode === "live") return appEnv() === "production" && process.env.SUBSCRIPTIONS_LIVE === "1";
  return false;
}

/** 브라우저가 카드 등록 창을 띄우는 데 필요한 공개값. 비밀값은 들어가지 않는다 */
export function kcpIssueTicket(input: { subscriptionId: string; userId: string; redirectUrl: string; name: string }) {
  if (!kcpReady()) return null;
  return {
    storeId: storeId(),
    channelKey: process.env.PORTONE_BILLING_CHANNEL_KEY!,
    billingKeyMethod: "CARD" as const,
    issueId: `SUBKEY${input.subscriptionId}`,
    issueName: input.name,
    customer: { customerId: `cm-${input.userId}` },
    redirectUrl: input.redirectUrl,
    test: kcpMode() === "test",
  };
}

async function call(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API()}${path}`, {
    ...init,
    headers: { Authorization: `PortOne ${process.env.PORTONE_BILLING_API_SECRET ?? ""}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}

/** 화면이 돌려준 빌링키가 정말 이 상점에서 발급됐는가. 발급된 카드의 나라를 함께 돌려준다(KCP 국내 채널 = KR) */
export async function verifyBillingKey(billingKey: string): Promise<{ ok: true; cardCountry: "KR" } | { ok: false; reason: string }> {
  if (!kcpReady()) return { ok: false, reason: "closed" };
  if (!/^[A-Za-z0-9_\-]{8,200}$/.test(billingKey)) return { ok: false, reason: "format" };
  const res = await call(`/billing-keys/${encodeURIComponent(billingKey)}?storeId=${encodeURIComponent(storeId())}`, { method: "GET" })
    .catch(() => null);
  if (!res?.ok) return { ok: false, reason: `lookup ${res?.status ?? "net"}` };
  const body = (await res.json().catch(() => null)) as { status?: string } | null;
  if (body?.status && body.status !== "ISSUED") return { ok: false, reason: `status ${body.status}` };
  return { ok: true, cardCountry: "KR" };
}

export const kcpBilling: BillingProvider = {
  name: "kcp",
  managed: false,
  async charge({ billingRef, paymentId, amount, currency, orderName, customerRef }): Promise<ChargeResult> {
    /* 두 겹: 열려 있어야 하고, 운영이면 대표 승인(SUBSCRIPTIONS_LIVE=1)이 있어야 한다 */
    if (!kcpReady() || !liveChargesAllowed()) return { ok: false, reason: "KCP 정기결제가 열려 있지 않습니다", retryable: false };
    if (currency !== "KRW") return { ok: false, reason: "KCP 는 원화만 받습니다", retryable: false };
    const res = await call(`/payments/${encodeURIComponent(paymentId)}/billing-key`, {
      method: "POST",
      body: JSON.stringify({
        storeId: storeId(), billingKey: billingRef, orderName,
        amount: { total: amount }, currency: "KRW", customer: { id: customerRef },
      }),
    }).catch(() => null);
    if (!res) return { ok: false, reason: "PortOne 연결 실패", retryable: true };
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, reason: `PortOne 청구 실패 (${res.status}) ${t.slice(0, 160)}`, retryable: res.status >= 500 || res.status === 409 || res.status === 400 };
    }
    return { ok: true, paymentId, amount, currency: "KRW", cardCountry: "KR" };
  },
  async cancel(billingRef) {
    if (!kcpReady()) return { ok: true };
    const res = await call(`/billing-keys/${encodeURIComponent(billingRef)}?storeId=${encodeURIComponent(storeId())}`, { method: "DELETE" })
      .catch(() => null);
    /* 지우지 못해도 우리 쪽에서 청구를 멈추므로 해지는 끝난다. 남은 키는 운영자가 콘솔에서 지운다 */
    return { ok: Boolean(res?.ok), reason: res?.ok ? undefined : `delete ${res?.status ?? "net"}` };
  },
};
