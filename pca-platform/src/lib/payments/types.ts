/**
 * 결제 대행사를 갈아 끼울 수 있게 하는 경계.
 *
 * 지금은 mock 으로 돌리고, 가맹점 심사가 끝나면 PAYMENTS_PROVIDER 만 바꾼다.
 * 화면과 주문 로직은 이 인터페이스만 알고 PG 를 모른다.
 */

export type PaymentStatus = "ready" | "paid" | "failed" | "cancelled";

/**
 * 어느 카드망으로 받을 것인가.
 *
 * 국내 PG 의 일반 카드결제로는 해외 발급 Visa·Mastercard 가 승인되지 않는다.
 * PortOne 은 채널(channelKey) 단위로 PG 가 갈리므로 채널을 둘 두고 고른다.
 */
export type PayRegion = "domestic" | "global";

/** PG 에서 조회한 결제 한 건의 사실. 우리가 믿는 유일한 출처다 */
export type PaymentFact = {
  providerPaymentId: string;
  status: PaymentStatus;
  /** PG 가 실제로 승인한 금액. 주문 금액과 대조한다 */
  amount: number;
  currency: string;
  method?: string;
  /** 주문번호. 결제를 주문에 붙일 때 쓴다 */
  orderNo?: string;
  raw: unknown;
};

/** 브라우저가 결제창을 띄우는 데 필요한 값. 비밀키는 절대 들어가지 않는다 */
export type CheckoutTicket = {
  provider: string;
  providerPaymentId: string;
  orderNo: string;
  orderName: string;
  amount: number;
  currency: string;
  /** portone 일 때만 채워진다 */
  storeId?: string;
  channelKey?: string;
  redirectUrl: string;
  region: PayRegion;
};

export type WebhookResult =
  | { ok: true; eventId: string | null; providerPaymentId: string | null }
  | { ok: false; reason: string };

/** 환불 집행 결과. **판정은 `refund.ts` 가 하고 여기는 집행만 한다** */
export type RefundResult =
  | { ok: true; providerRefundId: string | null; amount: number }
  | { ok: false; reason: string };

/**
 * 결제 대행사 하나가 할 수 있어야 하는 일.
 *
 * 규격 §27 이 이름을 다섯 개로 적어 두었고 여기가 그 다섯이다.
 * `createCheckout`(결제창 값) · `getPaymentStatus`(상태 조회) ·
 * `verifyPayment`(서버 확정 전 검증) · `handleWebhook`(웹훅 검증) ·
 * `refundPayment`(환불 집행).
 *
 * **상태 조회와 검증을 한 함수로 합치지 않는다.** 조회는 지금 상태를
 * 묻는 것이고, 검증은 "이 결제가 이 주문의 금액과 통화로 승인됐는가" 를
 * 묻는 것이다. 합치면 부르는 쪽이 금액 대조를 잊어도 통과한다.
 */
export interface PaymentProvider {
  readonly name: string;

  /** 이 대행사가 받을 수 있는 시장. 비어 있으면 아직 고르지 않았다 */
  readonly markets: readonly PayRegion[];

  /** 결제창을 띄우기 위한 값. 서버가 만든 주문에서만 나온다 */
  createCheckout(input: {
    orderNo: string;
    orderName: string;
    amount: number;
    currency: string;
    redirectUrl: string;
    region: PayRegion;
  }): Promise<CheckoutTicket>;

  /** PG 에 직접 물어본다. 리다이렉트 파라미터는 믿지 않는다 */
  getPaymentStatus(providerPaymentId: string): Promise<PaymentFact>;

  /**
   * 이 결제가 **이 주문**의 금액과 통화로 승인됐는가.
   *
   * 기본 구현을 두지 않는다. 대행사마다 돌려주는 통화 표기가 다르고,
   * 그 차이를 공통 코드에 숨기면 어느 대행사에서 대조가 느슨해졌는지
   * 모른다.
   */
  verifyPayment(input: {
    providerPaymentId: string;
    expectAmount: number;
    expectCurrency: string;
  }): Promise<{ ok: true; fact: PaymentFact } | { ok: false; reason: string }>;

  /** 웹훅 서명을 검증하고 어떤 결제에 대한 것인지만 알려준다 */
  handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult>;

  /**
   * 환불을 집행한다. **얼마를 돌려줄지는 여기서 정하지 않는다**:
   * 그 판단은 `src/lib/refund.ts` 의 `refundable()` 한 곳이다.
   */
  refundPayment(input: {
    providerPaymentId: string;
    amount: number;
    reason: string;
  }): Promise<RefundResult>;
}
