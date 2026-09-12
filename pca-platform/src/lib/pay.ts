import { randomBytes } from "node:crypto";

const API = "https://api.tosspayments.com/v1";

export class PayError extends Error {}

export function payConfigured(): boolean {
  return Boolean(process.env.TOSS_SECRET_KEY && process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
}

export function payDryRun(): boolean {
  return process.env.PAYMENTS_DRY_RUN === "1";
}

/** 우리 쪽 주문번호. PG 가 중복을 거부하므로 충돌하지 않게 만든다. */
export function newOrderId(): string {
  return `hm_${Date.now().toString(36)}_${randomBytes(5).toString("hex")}`;
}

function auth(): string {
  return `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64")}`;
}

export type Approved = {
  providerKey: string;
  method: string | null;
  receiptUrl: string | null;
};

/**
 * 결제창이 돌려준 것을 서버에서 승인한다.
 * 금액을 다시 넘겨 PG 가 대조하게 한다 — 브라우저가 보내온 금액을 믿으면 안 된다.
 */
export async function approve(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<Approved> {
  if (payDryRun()) {
    return { providerKey: `dry_${input.orderId}`, method: "개발용", receiptUrl: null };
  }
  if (!payConfigured()) throw new PayError("결제 연동이 설정되지 않았습니다.");

  const res = await fetch(`${API}/payments/confirm`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as {
    paymentKey?: string;
    method?: string;
    receipt?: { url?: string };
    message?: string;
  };
  if (!res.ok || !json.paymentKey) {
    throw new PayError(json.message ?? `결제 승인에 실패했습니다 (${res.status}).`);
  }
  return {
    providerKey: json.paymentKey,
    method: json.method ?? null,
    receiptUrl: json.receipt?.url ?? null,
  };
}

/** 전액 취소. 이미 취소된 건이면 성공으로 본다. */
export async function cancel(providerKey: string, reason: string): Promise<void> {
  if (payDryRun() || providerKey.startsWith("dry_")) return;
  if (!payConfigured()) throw new PayError("결제 연동이 설정되지 않았습니다.");

  const res = await fetch(`${API}/payments/${encodeURIComponent(providerKey)}/cancel`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ cancelReason: reason.slice(0, 200) }),
  });
  if (res.ok) return;

  const json = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  if (json.code === "ALREADY_CANCELED_PAYMENT") return;
  throw new PayError(json.message ?? `결제 취소에 실패했습니다 (${res.status}).`);
}
