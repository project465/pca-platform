import type { PaymentFact } from "./types";

/**
 * 승인된 결제가 **이 주문**의 것인가.
 *
 * **대조를 한 곳에만 둔다.** 금액과 통화를 견주는 줄이 두 곳에 있으면
 * 한쪽을 고치고 다른 쪽을 잊는다. 잊은 쪽이 결제 확정 경로면 느슨해진
 * 대조로 돈이 통과한다.
 *
 * 대행사 어댑터의 `verifyPayment` 와 주문 확정(`settlePayment`)이 둘 다
 * 이 함수를 부른다.
 */
export function matchesOrder(
  fact: PaymentFact,
  expect: { amount: number; currency: string },
): { ok: true } | { ok: false; reason: string } {
  if (fact.status !== "paid") {
    return { ok: false, reason: `결제가 완료되지 않았습니다 (${fact.status}).` };
  }

  if (fact.amount !== expect.amount) {
    return {
      ok: false,
      reason: `승인 금액이 주문 금액과 다릅니다 ` +
        `(주문 ${expect.amount} / 승인 ${fact.amount}).`,
    };
  }

  /**
   * **통화도 본다.** 금액만 견주면 USD 29 가 KRW 29 주문을 확정시킨다.
   * 숫자가 같아서 위 대조를 그대로 통과한다. 한 시장만 열어 두었을 때는
   * 드러나지 않는 자리이고, 글로벌 시장을 여는 순간 열린다.
   *
   * 한쪽이 비어 있으면 대조하지 않는다. 옛 결제 줄에는 통화 칸이 없고,
   * 그것을 불일치로 보면 이미 확정된 주문을 되돌리게 된다.
   */
  const got = (fact.currency || "").trim().toUpperCase();
  const want = (expect.currency || "").trim().toUpperCase();
  if (got && want && got !== want) {
    return {
      ok: false,
      reason: `승인 통화가 주문 통화와 다릅니다 (주문 ${want} / 승인 ${got}).`,
    };
  }

  return { ok: true };
}
