"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { isPeriod, isPlan } from "@/lib/pricing/config";
import { ipCountryFrom, routeForUser } from "@/lib/subscriptions/route";
import {
  attachBilling, cancelSubscription, chargeFirst, createSubscription, reconsentPrice, resumeWithCard, subscriptionById,
} from "@/lib/subscriptions/engine";
import { kcpIssueTicket, verifyBillingKey } from "@/lib/subscriptions/kcp";
import { paddleClientConfig, paddleCreateCheckout } from "@/lib/subscriptions/paddle";
import { orderName } from "@/lib/orders";
import { productFor } from "@/lib/plans";
import { matStep } from "@/lib/funnel-v3";
import { CHECKOUT_SUB } from "@/lib/mat/money-text";

export type SubscribeState = {
  error?: string;
  /** KCP: 카드 등록 창을 띄울 공개값 */
  kcp?: NonNullable<ReturnType<typeof kcpIssueTicket>> & { subscriptionId: string };
  /** Paddle: 결제창 거래 번호와 공개 토큰 */
  paddle?: { transactionId: string; token: string; environment: "sandbox"; subscriptionId: string };
};

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * 결제 화면의 `동의하고 결제`. **동의 칸이 체크돼 있어야 한다**(화면의 required 는 안내이고 막는 곳은 여기).
 * 값 · 결제 길은 서버가 다시 정한다. 가짜 결제사면 그 자리에서 첫 결제까지, KCP 면 카드 등록 창 값을,
 * Paddle 이면 결제창 거래를 돌려준다
 */
export async function subscribeAction(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  const user = await requireUser();
  const plan = String(form.get("plan") ?? "");
  const period = Number(form.get("period") ?? 0);
  if (!isPlan(plan) || !isPeriod(period)) return { error: CHECKOUT_SUB.consentNeed };
  const consent = String(form.get("consent") ?? "") === "1";
  if (!consent) return { error: CHECKOUT_SUB.consentNeed };
  const route = await routeForUser(user.id, ipCountryFrom(await headers()));
  const made = await createSubscription({ userId: user.id, plan, period, route, consent });
  if (!made.ok) return { error: made.reason === "live" ? CHECKOUT_SUB.liveSub : CHECKOUT_SUB.closed };
  await matStep("checkout_start", user.id);
  const sub = await subscriptionById(made.id);
  const name = orderName(productFor(plan, period) ?? "TRACK_30D");
  if (sub?.provider === "mock") {
    /* 시험 결제: 카드 등록을 흉내 내고 바로 첫 결제(돈이 움직이지 않는다) */
    await attachBilling(made.id, route.provider === "paddle" ? "mock_card_ok_us" : "mock_card_ok");
    const r = await chargeFirst(made.id);
    if (!r.ok) return { error: CHECKOUT_SUB.failed };
    revalidatePath("/mat");
    redirect("/mat/pass?sub=ok");
  }
  if (sub?.provider === "kcp") {
    const t = kcpIssueTicket({ subscriptionId: made.id, userId: user.id, redirectUrl: `${await origin()}/mat/subscribe/done?sub=${made.id}`, name });
    if (!t) return { error: CHECKOUT_SUB.closed };
    return { kcp: { ...t, subscriptionId: made.id } };
  }
  if (sub?.provider === "paddle") {
    const cfg = paddleClientConfig();
    const c = await paddleCreateCheckout({ subscriptionId: made.id, userId: user.id, amount: made.amount, periodDays: period, name });
    if (!cfg || !c.ok) return { error: CHECKOUT_SUB.closed };
    return { paddle: { transactionId: c.transactionId, token: cfg.token, environment: cfg.environment, subscriptionId: made.id } };
  }
  return { error: CHECKOUT_SUB.closed };
}

/**
 * KCP 카드 등록이 끝나 돌아온 자리. 화면이 돌려준 빌링키를 **PortOne 에 다시 물어 확인한 뒤** 붙이고 첫 결제를 한다
 */
export async function kcpBillingDone(subId: string, billingKey: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const sub = await subscriptionById(subId);
  if (!sub || sub.user_id !== user.id || sub.provider !== "kcp" || sub.status !== "pending") return { ok: false };
  const v = await verifyBillingKey(billingKey);
  if (!v.ok) return { ok: false };
  await attachBilling(subId, billingKey);
  const r = await chargeFirst(subId);
  return { ok: r.ok };
}

/** [내 정보 › 이용권] · MAT 이용권 화면의 해지 단추 하나 */
export async function cancelSubAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const back = String(form.get("back") ?? "/mat/pass");
  await cancelSubscription(user.id, String(form.get("id") ?? "") || undefined);
  revalidatePath(back);
  redirect(`${back.startsWith("/") ? back : "/mat/pass"}?sub=canceled`);
}

/** 바뀐 금액에 다시 동의 */
export async function reconsentAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await reconsentPrice(user.id, String(form.get("id") ?? ""));
  revalidatePath("/mat/pass");
  redirect("/mat/pass?sub=reconsent");
}

/**
 * 멈춘 정기결제를 카드를 바꿔 잇는다. 시험 결제사는 새 시험 카드로, KCP 는 카드 등록을 다시 거친다(화면이 SDK 를 연다)
 */
export async function resumeMockAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const sub = await subscriptionById(id);
  if (!sub || sub.user_id !== user.id) redirect("/mat/pass");
  if (sub.provider === "mock") await resumeWithCard(user.id, id, `mock_card_ok_${Date.now().toString(36)}`);
  revalidatePath("/mat/pass");
  redirect("/mat/pass?sub=resumed");
}
