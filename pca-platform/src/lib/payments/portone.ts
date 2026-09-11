import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentProvider,
  PaymentFact,
  CheckoutTicket,
  WebhookResult,
  PaymentStatus,
  PayRegion,
} from "./types";

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
 * 채널을 둘 두는 이유 — 국내 PG 의 일반 카드결제로는 해외 발급 Visa·Mastercard 가
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

  async ticket(input): Promise<CheckoutTicket> {
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

  async fetchPayment(providerPaymentId): Promise<PaymentFact> {
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
   * Standard Webhooks 규격이다. 서명 대상은 `{id}.{timestamp}.{body}` 이고
   * 시크릿은 base64 다. 타이밍 공격을 피하려고 timingSafeEqual 로 비교한다.
   */
  async verifyWebhook(rawBody, headers): Promise<WebhookResult> {
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
