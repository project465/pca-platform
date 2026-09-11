import { query, queryOne } from "@/lib/db";
import type { PaymentProvider, PaymentFact, CheckoutTicket, WebhookResult } from "./types";

/**
 * 심사가 끝나기 전에 흐름 전체를 눌러 보기 위한 가짜 PG.
 *
 * 실제 PG 와 같은 순서로 움직인다 — 티켓 발급 → 결제창(우리 화면) → 리다이렉트
 * → 서버가 조회해서 확정. 그래서 portone 으로 바꿔도 화면과 주문 로직이 안 바뀐다.
 *
 * 승인 상태를 프로세스 메모리에 두지 않는다. 진짜 PG 의 상태는 우리 밖에 있고
 * 요청마다 물어봐야 하는 값이다. 메모리에 두면 라우트가 갈리거나 인스턴스가
 * 늘어나는 순간 "결제했는데 확정이 안 되는" 버그가 난다 — 실제로 그렇게 났다.
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

  async ticket(input): Promise<CheckoutTicket> {
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

  async fetchPayment(providerPaymentId): Promise<PaymentFact> {
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

  async verifyWebhook(rawBody): Promise<WebhookResult> {
    try {
      const body = JSON.parse(rawBody) as { paymentId?: string };
      return { ok: true, eventId: null, providerPaymentId: body.paymentId ?? null };
    } catch {
      return { ok: false, reason: "본문이 JSON 이 아닙니다" };
    }
  },
};
