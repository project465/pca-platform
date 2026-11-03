import { mockPaymentsAllowed } from "@/lib/env";
import { markMockPaid } from "@/lib/payments";
import type { BillingProvider, ChargeResult } from "./types";

/**
 * 시험용 정기결제 결제사. **돈을 움직이지 않는다.** 운영(`APP_ENV=production`)에서는 만들지 못한다.
 *
 * 빌링키가 `mock_card_fail` 로 시작하면 청구가 실패한다(결제 실패 · 다시 시도 · 멈춤 시험). 카드를 바꾸면
 * (`mock_card_ok…`) 다시 된다. 청구가 되면 1회 결제 가짜 대행사와 같은 자리(`payment_events` 의 mock_paid)에
 * 적어 두어, 환불 · 대행사 취소 시험이 같은 길(`mock` 대행사)을 밟는다.
 */
export const mockBilling: BillingProvider = {
  name: "mock",
  managed: false,
  async charge({ billingRef, paymentId, amount, currency }): Promise<ChargeResult> {
    if (!mockPaymentsAllowed()) return { ok: false, reason: "운영에서 mock 청구는 열리지 않습니다", retryable: false };
    if (billingRef.startsWith("mock_card_fail")) return { ok: false, reason: "mock: 카드 승인 거절", retryable: true };
    const pid = `mock_${paymentId}`;
    await markMockPaid({ providerPaymentId: pid, status: "paid", amount, currency, method: "CARD", orderNo: paymentId, raw: { billing: true } });
    return { ok: true, paymentId: pid, amount, currency, cardCountry: billingRef.startsWith("mock_card_ok_us") ? "US" : "KR" };
  },
  async cancel() {
    return { ok: true };
  },
};
