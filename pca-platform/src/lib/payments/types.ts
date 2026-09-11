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

export interface PaymentProvider {
  readonly name: string;
  /** 결제창을 띄우기 위한 값. 서버가 만든 주문에서만 나온다 */
  ticket(input: {
    orderNo: string;
    orderName: string;
    amount: number;
    currency: string;
    redirectUrl: string;
    region: PayRegion;
  }): Promise<CheckoutTicket>;

  /** PG 에 직접 물어본다. 리다이렉트 파라미터는 믿지 않는다 */
  fetchPayment(providerPaymentId: string): Promise<PaymentFact>;

  /** 웹훅 서명을 검증하고 어떤 결제에 대한 것인지만 알려준다 */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult>;
}
