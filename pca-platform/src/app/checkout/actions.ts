"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/session";
import { startCheckout } from "@/lib/orders";
import { markMockPaid, paymentProvider } from "@/lib/payments";
import type { CheckoutTicket, PayRegion } from "@/lib/payments";

export type CheckoutState = { error?: string; ticket?: CheckoutTicket };

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function createOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await requireUser();
  const productCode = String(formData.get("product") ?? "");
  const region: PayRegion = formData.get("region") === "global" ? "global" : "domestic";

  try {
    const { ticket } = await startCheckout(user.id, productCode, await origin(), region);
    return { ticket };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "주문을 만들지 못했습니다." };
  }
}

/**
 * 가짜 결제창의 "결제하기". mock 일 때만 동작한다.
 *
 * 실제 PG 라면 이 자리에서 카드사 창이 뜬다. 그 뒤는 똑같다 —
 * 리다이렉트로 돌아오고 서버가 조회해서 확정한다.
 */
export async function mockPayAction(formData: FormData): Promise<void> {
  await requireUser();
  const provider = paymentProvider();
  if (provider.name !== "mock") throw new Error("mock 결제가 아닙니다.");

  await markMockPaid({
    providerPaymentId: String(formData.get("paymentId") ?? ""),
    status: "paid",
    amount: Number(formData.get("amount") ?? 0),
    currency: String(formData.get("currency") ?? "KRW"),
    method: "CARD",
    orderNo: String(formData.get("orderNo") ?? ""),
    raw: { note: "mock 결제 승인", at: new Date().toISOString() },
  });
}
