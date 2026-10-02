/**
 * 결제대행사와 닿는 유일한 자리.
 *
 * 여기서 지키는 규칙이 둘이다.
 *
 * 1. **통지를 믿지 않는다.** 웹훅 본문은 인터넷에서 온 글자다. 서명을
 *    확인하고, 그러고도 금액은 대행사 API 로 **되물어서** 쓴다. 통지에
 *    적힌 금액을 그대로 믿으면 "50,000원 결제됐음" 을 아무나 보낼 수 있다.
 * 2. **막히면 멈춘다.** 열쇠가 없거나 서명이 안 맞으면 거절한다. 못
 *    믿겠으면 이행하지 않는 쪽이 맞다 — 돈을 안 받고 물건을 주는 것보다
 *    돈을 받고 몇 분 늦는 편이 낫다.
 *
 * 대행사는 포트원(PortOne)을 기본으로 둔다. 국내 PG 를 바꿔도 코드가
 * 그대로이기 때문이다. 다른 곳으로 갈아탈 때 고칠 곳은 이 파일 하나다.
 *
 * ⚠️ 아래 두 상수는 **계약한 대행사 문서로 확인하고 배포해야 한다.**
 *    서명 헤더 이름과 결제 조회 주소는 대행사마다 다르고 판마다 바뀐다.
 *    확인 전에는 PAYMENTS_PROVIDER 를 켜지 않는 것이 안전하다.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** ⚠️ 대행사 문서로 확인할 것 */
const SIGNATURE_HEADER = process.env.PAYMENTS_SIG_HEADER ?? "webhook-signature";
/** ⚠️ 대행사 문서로 확인할 것 */
const API_BASE = process.env.PAYMENTS_API_BASE ?? "https://api.portone.io";

export type Verified = { ok: true; eventId: string; txId: string } | { ok: false; why: string };

export type PaymentFacts = {
  /** 대행사가 말하는 결제 상태. paid 가 아니면 이행하지 않는다 */
  status: string;
  /** 최소 화폐 단위. 되물어 받은 값이다 */
  amount: number;
  currency: string;
  /** 주문을 만들 때 우리가 붙여 보낸 번호 */
  orderNo: string;
};

export function paymentsEnabled(): boolean {
  return Boolean(process.env.PAYMENTS_PROVIDER && process.env.PAYMENTS_WEBHOOK_SECRET);
}

export function providerName(): string {
  return process.env.PAYMENTS_PROVIDER ?? "portone";
}

/** 글자 길이가 달라도 비교 시간이 새지 않게 한다 */
function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * 웹훅이 정말 대행사에서 온 것인지.
 *
 * 본문을 **글자 그대로** 받아야 한다. JSON 으로 풀었다가 다시 만들면
 * 공백 하나가 달라져 서명이 깨진다. 그래서 부르는 쪽이 req.text() 를 준다.
 */
export function verifyWebhook(rawBody: string, headers: Headers): Verified {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
  if (!secret) return { ok: false, why: "no_secret" };

  const sig = headers.get(SIGNATURE_HEADER);
  if (!sig) return { ok: false, why: "no_signature" };

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  /* 헤더에 여러 서명이 실려 오는 형식이 있다(v1,<서명> 꼴). 하나라도 맞으면 통과 */
  const candidates = sig.split(/[\s,]+/).map((s) => (s.includes(",") ? s.split(",")[1] : s));
  if (!candidates.some((c) => sameSecret(c.replace(/^v\d+[,=]/, ""), expected))) {
    return { ok: false, why: "bad_signature" };
  }

  let body: { id?: unknown; type?: unknown; data?: { paymentId?: unknown; id?: unknown } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, why: "bad_json" };
  }

  const eventId = typeof body.id === "string" ? body.id : null;
  const txId =
    typeof body.data?.paymentId === "string"
      ? body.data.paymentId
      : typeof body.data?.id === "string"
        ? body.data.id
        : null;

  if (!eventId || !txId) return { ok: false, why: "missing_ids" };
  return { ok: true, eventId, txId };
}

/**
 * 대행사에 결제 건을 되묻는다.
 *
 * 이 값만 쓴다. 웹훅 본문의 금액은 참고도 하지 않는다.
 */
export async function fetchPayment(txId: string): Promise<PaymentFacts | null> {
  const key = process.env.PAYMENTS_API_KEY;
  if (!key) {
    console.error("[pay] PAYMENTS_API_KEY 가 없어 결제를 확인할 수 없습니다");
    return null;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/payments/${encodeURIComponent(txId)}`, {
      headers: { Authorization: `PortOne ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error("[pay] 결제 조회가 닿지 않았습니다", e);
    return null;
  }
  if (!res.ok) {
    console.error("[pay] 결제 조회 실패", res.status, txId);
    return null;
  }

  const j = (await res.json().catch(() => null)) as {
    status?: unknown;
    amount?: { total?: unknown };
    currency?: unknown;
    paymentId?: unknown;
    customData?: unknown;
    orderName?: unknown;
  } | null;
  if (!j) return null;

  /* 주문번호는 결제를 만들 때 customData 에 넣어 보낸다.
     대행사가 주는 다른 필드에 기대지 않는다 — 우리가 넣은 것만 믿는다 */
  let orderNo = "";
  if (typeof j.customData === "string") {
    try {
      const c = JSON.parse(j.customData) as { orderNo?: unknown };
      if (typeof c.orderNo === "string") orderNo = c.orderNo;
    } catch {
      /* customData 가 JSON 이 아니면 주문번호가 없는 것으로 본다 */
    }
  }

  const total = j.amount?.total;
  if (typeof total !== "number" || !Number.isFinite(total)) return null;

  return {
    status: String(j.status ?? "").toLowerCase(),
    amount: Math.round(total),
    currency: String(j.currency ?? "").toUpperCase(),
    orderNo,
  };
}
