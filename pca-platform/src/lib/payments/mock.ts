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
    if (row?.payload) return row.payload;

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

  /* 가짜는 돈을 움직이지 않는다. **집행했다고 적지 않는다**: 적으면
     검사가 환불을 통과시키고, 운영에서 돈이 안 돌아간 것을 아무도 모른다 */
  async refundPayment({ amount }): Promise<RefundResult> {
    return { ok: true, providerRefundId: null, amount };
  },
};
