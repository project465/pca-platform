import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentProvider,
  PaymentFact,
  CheckoutTicket,
  WebhookResult,
  RefundResult,
  PaymentStatus,
  PayRegion,
} from "./types";
import { matchesOrder } from "./verify";
import { ref, swallow } from "../oplog";

/**
 * PortOne V2.
 *
 * 서버는 REST API 로 결제를 조회해서만 승인을 확정한다.
 * 브라우저가 돌려준 값이나 리다이렉트 쿼리는 참고용이고 근거가 아니다.
 *
 * 필요한 환경변수
 *   PORTONE_STORE_ID              상점 식별값 (공개값. 브라우저로 나간다)
 *   PORTONE_CHANNEL_KEY           국내 카드 채널 (공개값)
 *   PORTONE_CHANNEL_KEY_GLOBAL    해외 카드 채널 (공개값). 없으면 해외 결제가 닫힌다
 *   PORTONE_API_SECRET            V2 API secret (비밀. 서버에만)
 *   PORTONE_WEBHOOK_SECRET        웹훅 시크릿 (비밀. base64)
 *
 * 채널을 둘 두는 이유: 국내 PG 의 일반 카드결제로는 해외 발급 Visa·Mastercard 가
 * 승인되지 않는다. 해외카드는 해외결제 채널(Eximbay·Paypal·Stripe 등)로 나가야 한다.
 */
const API = "https://api.portone.io";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 가 설정되지 않았습니다.`);
  return v;
}

/** PortOne 의 상태 문자열을 우리 것으로 좁힌다 */
function toStatus(s: string): PaymentStatus {
  switch (s) {
    case "PAID":
      return "paid";
    case "FAILED":
      return "failed";
    case "CANCELLED":
    case "PARTIAL_CANCELLED":
      return "cancelled";
    default:
      return "ready";
  }
}

/** 해외 채널이 설정돼 있는가. 화면에서 결제수단을 열지 말지 정하는 데 쓴다 */
export function globalChannelReady(): boolean {
  return Boolean(process.env.PORTONE_CHANNEL_KEY_GLOBAL);
}

function channelFor(region: PayRegion): string {
  if (region === "global") {
    const key = process.env.PORTONE_CHANNEL_KEY_GLOBAL;
    if (!key) {
      throw new Error(
        "해외 카드 결제 채널이 설정되지 않았습니다. PORTONE_CHANNEL_KEY_GLOBAL 을 채우세요.",
      );
    }
    return key;
  }
  return env("PORTONE_CHANNEL_KEY");
}

type PortOnePayment = {
  id: string;
  status: string;
  orderName?: string;
  amount?: { total?: number };
  currency?: string;
  method?: { type?: string };
  customData?: string;
};

export const portoneProvider: PaymentProvider = {
  name: "portone",
  /* 국내는 채널이 정해졌고 해외는 채널 값이 채워졌을 때만 열린다.
     **없는 것을 켜 두지 않는다** */
  get markets(): readonly PayRegion[] {
    return globalChannelReady() ? ["domestic", "global"] : ["domestic"];
  },

  async createCheckout(input): Promise<CheckoutTicket> {
    return {
      provider: "portone",
      // paymentId 는 영문·숫자만 40자 이내. 주문번호를 그대로 쓴다
      providerPaymentId: input.orderNo,
      orderNo: input.orderNo,
      orderName: input.orderName,
      amount: input.amount,
      currency: input.currency,
      storeId: env("PORTONE_STORE_ID"),
      channelKey: channelFor(input.region),
      redirectUrl: input.redirectUrl,
      region: input.region,
    };
  },

  async getPaymentStatus(providerPaymentId): Promise<PaymentFact> {
    const res = await fetch(`${API}/payments/${encodeURIComponent(providerPaymentId)}`, {
      headers: { Authorization: `PortOne ${env("PORTONE_API_SECRET")}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`PortOne 결제 조회 실패 (${res.status})`);
    }
    const body = (await res.json()) as PortOnePayment;

    return {
      providerPaymentId: body.id ?? providerPaymentId,
      status: toStatus(body.status ?? ""),
      amount: body.amount?.total ?? 0,
      currency: body.currency ?? "KRW",
      method: body.method?.type,
      orderNo: body.customData ?? body.id,
      raw: body,
    };
  },

  /**
   * 이 결제가 이 주문의 금액과 통화로 승인됐는가.
   *
   * **통화를 반드시 본다.** PortOne 의 통화는 `KRW` · `USD` 처럼 오는데,
   * 금액만 대조하면 USD 29 가 KRW 29 주문을 확정시킨다. 숫자가 같아서
   * 금액 대조를 그대로 통과한다.
   */
  /* 대조는 **한 곳에만 있다**(`verify.ts`). 어댑터마다 적으면 한쪽이
     느슨해지고, 느슨해진 쪽이 확정 경로면 돈이 통과한다 */
  async verifyPayment({ providerPaymentId, expectAmount, expectCurrency }) {
    const fact = await portoneProvider.getPaymentStatus(providerPaymentId);
    const m = matchesOrder(fact, { amount: expectAmount, currency: expectCurrency });
    return m.ok ? { ok: true, fact } : m;
  },

  /**
   * 환불 집행.
   *
   * **얼마를 돌려줄지는 여기서 정하지 않는다**: 그 판단은
   * `src/lib/refund.ts` 의 `refundable()` 한 곳이고, 여기는 그 금액을
   * PG 에 넘긴다. 둘을 합치면 환불선이 두 곳에서 정해진다.
   */
  async refundPayment({ providerPaymentId, amount, reason }): Promise<RefundResult> {
    const res = await fetch(
      `${API}/payments/${encodeURIComponent(providerPaymentId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `PortOne ${env("PORTONE_API_SECRET")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, reason }),
        cache: "no-store",
      },
    );
    /* **본문을 못 읽은 것도 남긴다.** 돌려주는 말은 `{ok:false}` 로 이미
       나가지만, 거기 담기는 것은 `(500)` 뿐이라 **밖에서 읽으면 PG 가
       거절한 것과 본문이 깨진 것이 같은 상태로 보인다.** 셋째 줄도 같다:
       본문을 못 읽으면 환불 번호가 `null` 로 적히고, 그러면 장부에
       `환불했는데 번호가 없는 줄`이 남는다 */
    if (!res.ok) {
      const body = (await res.text().catch(swallow({
        operation: "portone.refund", ref: ref("payment", providerPaymentId),
        step: "readBody", category: "upstream", detail: `status=${res.status}`,
      }))) ?? "";
      return { ok: false, reason: `PortOne 환불 실패 (${res.status}) ${body.slice(0, 200)}` };
    }
    const body = ((await res.json().catch(swallow({
      operation: "portone.refund", ref: ref("payment", providerPaymentId),
      step: "parseBody", category: "upstream", detail: "환불은 됐고 응답을 못 읽었다",
    }))) ?? null) as
      { cancellation?: { id?: string; totalAmount?: number } } | null;
    return {
      ok: true,
      providerRefundId: body?.cancellation?.id ?? null,
      amount: body?.cancellation?.totalAmount ?? amount,
    };
  },

  /**
   * Standard Webhooks 규격이다. 서명 대상은 `{id}.{timestamp}.{body}` 이고
   * 시크릿은 base64 다. 타이밍 공격을 피하려고 timingSafeEqual 로 비교한다.
   */
  async handleWebhook(rawBody, headers): Promise<WebhookResult> {
    const id = headers["webhook-id"];
    const ts = headers["webhook-timestamp"];
    const sig = headers["webhook-signature"];
    if (!id || !ts || !sig) return { ok: false, reason: "웹훅 헤더가 없습니다" };

    // 재전송 공격 방지. 5분을 넘긴 것은 받지 않는다
    const age = Math.abs(Date.now() / 1000 - Number(ts));
    if (!Number.isFinite(age) || age > 300) {
      return { ok: false, reason: "웹훅 타임스탬프가 너무 오래됐습니다" };
    }

    const secret = env("PORTONE_WEBHOOK_SECRET").replace(/^whsec_/, "");
    const expected = createHmac("sha256", Buffer.from(secret, "base64"))
      .update(`${id}.${ts}.${rawBody}`)
      .digest("base64");

    // 헤더에는 "v1,서명" 이 공백으로 여럿 올 수 있다
    const candidates = sig.split(" ").map((p) => p.split(",").pop() ?? "");
    const match = candidates.some((c) => {
      const a = Buffer.from(c);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });
    if (!match) return { ok: false, reason: "웹훅 서명이 맞지 않습니다" };

    try {
      const body = JSON.parse(rawBody) as { data?: { paymentId?: string }; paymentId?: string };
      return {
        ok: true,
        eventId: id,
        providerPaymentId: body.data?.paymentId ?? body.paymentId ?? null,
      };
    } catch {
      return { ok: false, reason: "본문이 JSON 이 아닙니다" };
    }
  },
};
