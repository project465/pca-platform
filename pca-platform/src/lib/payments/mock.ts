import { query, queryOne } from "@/lib/db";
import type {
  PaymentProvider, PaymentFact, CheckoutTicket, WebhookResult, RefundResult,
} from "./types";
import { matchesOrder } from "./verify";

/**
 * 심사가 끝나기 전에 흐름 전체를 눌러 보기 위한 가짜 PG.
 *
 * 실제 PG 와 같은 순서로 움직인다. 티켓 발급 → 결제창(우리 화면) → 리다이렉트
 * → 서버가 조회해서 확정. 그래서 portone 으로 바꿔도 화면과 주문 로직이 안 바뀐다.
 *
 * 승인 상태를 프로세스 메모리에 두지 않는다. 진짜 PG 의 상태는 우리 밖에 있고
 * 요청마다 물어봐야 하는 값이다. 메모리에 두면 라우트가 갈리거나 인스턴스가
 * 늘어나는 순간 "결제했는데 확정이 안 되는" 버그가 난다. 실제로 그렇게 났다.
 */
export async function markMockPaid(fact: PaymentFact) {
  await query(
    `INSERT INTO payment_events (provider, event_id, kind, payload)
     VALUES ('mock', $1, 'mock_paid', $2)
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [fact.providerPaymentId, JSON.stringify(fact)],
  );
}

/**
 * 대행사 쪽에서 취소가 난 것처럼 적는다(시험용). 웹훅이 `getPaymentStatus` 로 다시 물으면 취소 합계가 보인다.
 * `n` 은 같은 결제의 몇 번째 취소인가다(부분 취소를 두 번 할 수 있다)
 */
export async function markMockCancel(providerPaymentId: string, amount: number, n = 1): Promise<void> {
  await query(
    `INSERT INTO payment_events (provider, event_id, kind, payload)
     VALUES ('mock', $1, 'mock_cancel', $2)
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [`cancel:${providerPaymentId}:${n}`, JSON.stringify({ providerPaymentId, amount })],
  );
}

/** 다음 환불 요청을 대행사가 거절한 것처럼 둔다(시험용). 한 결제에 한 번 */
export async function markMockRefundFail(providerPaymentId: string): Promise<void> {
  await query(
    `INSERT INTO payment_events (provider, event_id, kind, payload)
     VALUES ('mock', $1, 'mock_refund_fail', '{}'::jsonb)
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [`refund_fail:${providerPaymentId}`],
  );
}

async function mockCancelled(providerPaymentId: string): Promise<number> {
  const r = await queryOne<{ n: string | null }>(
    `SELECT sum((payload->>'amount')::int)::text AS n FROM payment_events
      WHERE provider = 'mock' AND kind IN ('mock_cancel', 'mock_refund')
        AND payload->>'providerPaymentId' = $1`,
    [providerPaymentId],
  ).catch(() => null);
  return Number(r?.n ?? 0) || 0;
}

export const mockProvider: PaymentProvider = {
  name: "mock",
  /* 가짜라서 두 시장을 다 흉내 낸다. 흉내라는 것은 `checkoutReady()` 가
     운영에서 막는다 */
  markets: ["domestic", "global"],

  async createCheckout(input): Promise<CheckoutTicket> {
    return {
      provider: "mock",
      providerPaymentId: `mock_${input.orderNo}`,
      orderNo: input.orderNo,
      orderName: input.orderName,
      amount: input.amount,
      currency: input.currency,
      redirectUrl: input.redirectUrl,
      region: input.region,
    };
  },

  async getPaymentStatus(providerPaymentId): Promise<PaymentFact> {
    const row = await queryOne<{ payload: PaymentFact }>(
      `SELECT payload FROM payment_events
        WHERE provider = 'mock' AND kind = 'mock_paid' AND event_id = $1`,
      [providerPaymentId],
    );
    if (row?.payload) {
      /* 취소가 있으면 대행사처럼 상태와 취소 합계를 함께 돌려준다 */
      const cancelled = await mockCancelled(providerPaymentId);
      return cancelled > 0
        ? { ...row.payload, status: "cancelled", cancelledAmount: cancelled }
        : row.payload;
    }

    return {
      providerPaymentId,
      status: "ready",
      amount: 0,
      currency: "KRW",
      raw: { note: "mock — 아직 결제되지 않음" },
    };
  },

  /* 대조는 **한 곳에만 있다**(`verify.ts`). 어댑터마다 적으면 한쪽이
     느슨해지고, 느슨해진 쪽이 확정 경로면 돈이 통과한다 */
  async verifyPayment({ providerPaymentId, expectAmount, expectCurrency }) {
    const fact = await mockProvider.getPaymentStatus(providerPaymentId);
    const m = matchesOrder(fact, { amount: expectAmount, currency: expectCurrency });
    return m.ok ? { ok: true, fact } : m;
  },

  async handleWebhook(rawBody): Promise<WebhookResult> {
    try {
      const body = JSON.parse(rawBody) as { paymentId?: string };
      return { ok: true, eventId: null, providerPaymentId: body.paymentId ?? null };
    } catch {
      return { ok: false, reason: "본문이 JSON 이 아닙니다" };
    }
  },

  /* 가짜는 돈을 움직이지 않는다. 운영에서는 `paymentProvider()` 가 mock 을 막는다(APP_ENV).
     시험이 집행 순서(대행사 확인 → 장부 → 메일)를 볼 수 있게 취소 한 줄을 남기고, 거절 표시가 있으면 거절한다 */
  async refundPayment({ providerPaymentId, amount }): Promise<RefundResult> {
    const fail = await queryOne<{ id: string }>(
      `SELECT id::text FROM payment_events WHERE provider = 'mock' AND kind = 'mock_refund_fail' AND event_id = $1`,
      [`refund_fail:${providerPaymentId}`]).catch(() => null);
    const done = await queryOne<{ n: number }>(
      `SELECT count(*)::int AS n FROM payment_events WHERE provider = 'mock' AND kind = 'mock_refund'
          AND payload->>'providerPaymentId' = $1`, [providerPaymentId]).catch(() => null);
    /* 거절 표시는 첫 요청 한 번만 쓴다. 운영자가 다시 누르면 통과한다 */
    if (fail) {
      const first = await query(
        `INSERT INTO payment_events (provider, event_id, kind, payload) VALUES ('mock', $1, 'mock_refund_try', $2)
         ON CONFLICT (provider, event_id) DO NOTHING RETURNING id`,
        [`refund_try:${providerPaymentId}`, JSON.stringify({ providerPaymentId })]).catch(() => []);
      if (first.length) return { ok: false, reason: "mock: 대행사가 취소를 거절했습니다" };
    }
    const id = `mock_refund_${providerPaymentId}_${(done?.n ?? 0) + 1}`;
    await query(
      `INSERT INTO payment_events (provider, event_id, kind, payload) VALUES ('mock', $1, 'mock_refund', $2)
       ON CONFLICT (provider, event_id) DO NOTHING`,
      [id, JSON.stringify({ providerPaymentId, amount })],
    );
    return { ok: true, providerRefundId: id, amount };
  },
};
