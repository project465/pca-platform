/**
 * 정기결제 결제사 경계(결제사를 모르는 엔진 `engine.ts` 와 결제사 어댑터 사이).
 *
 * 두 모양이 있다.
 *   - **우리가 청구하는 쪽**(`managed: false`): KCP 빌링키(PortOne). 결제일에 엔진이 `charge` 를 부른다
 *   - **결제사가 청구하는 쪽**(`managed: true`): Paddle. 결제사가 갱신 · 다시 시도를 하고, 엔진은 웹훅으로 받은
 *     사건(`SubEvent`)을 같은 상태 표에 옮긴다
 *
 * 어느 쪽이든 **운영에서 `SUBSCRIPTIONS_LIVE=1` 이 아니면 청구하지 않는다**(`open.ts` 의 liveChargesAllowed).
 */
export type BillingName = "mock" | "kcp" | "paddle";

export type ChargeResult =
  | { ok: true; paymentId: string; amount: number; currency: string; cardCountry?: string | null }
  | { ok: false; reason: string; retryable: boolean };

export interface BillingProvider {
  readonly name: BillingName;
  /** 결제사가 갱신을 직접 하는가(Paddle) */
  readonly managed: boolean;
  /**
   * 저장한 결제 수단(빌링키)으로 한 회차를 청구한다. `paymentId` 는 우리가 정한 주문 번호다(같은 번호로
   * 두 번 청구하지 않도록 결제사가 막는다). `managed` 결제사는 부르지 않는다
   */
  charge(input: {
    billingRef: string; paymentId: string; amount: number; currency: string; orderName: string; customerRef: string;
  }): Promise<ChargeResult>;
  /** 다음 회차부터 멈춘다(이미 낸 기간은 그대로). 우리 쪽 상태만 바꾸면 되는 결제사는 아무것도 안 한다 */
  cancel(billingRef: string): Promise<{ ok: boolean; reason?: string }>;
}

/** 결제사 웹훅에서 엔진으로 넘기는 사건(Paddle). 결제사 말을 우리 말로 좁힌 것이다 */
export type SubEvent =
  | { type: "activated"; ref: string; subscriptionId: string; paymentId: string; amount: number; currency: string; country: string | null; periodEnd: string | null }
  | { type: "renewed"; ref: string; paymentId: string; amount: number; currency: string; periodEnd: string | null }
  | { type: "payment_failed"; ref: string; reason: string }
  | { type: "paused"; ref: string }
  | { type: "canceled"; ref: string }
  | { type: "resumed"; ref: string };
