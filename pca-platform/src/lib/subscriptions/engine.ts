import { randomBytes } from "node:crypto";
import { query, queryOne, tx } from "@/lib/db";
import { grantTrackTx, lastDayKst } from "@/lib/track";
import { matStep } from "@/lib/funnel-v3";
import { productFor } from "@/lib/plans";
import { krwPrice, priceLabel, usdPrice, type Period, type Plan } from "@/lib/pricing/config";
import { orderName } from "@/lib/orders";
import { queueNotice } from "./notices";
import { subscriptionsOpen } from "./open";
import { billingFor } from "./providers";
import { kcpReady } from "./kcp";
import { paddleReady } from "./paddle";
import { mockPaymentsAllowed } from "@/lib/env";
import type { PayRoute } from "./route";
import type { BillingName, SubEvent } from "./types";

/**
 * MAT 정기결제 엔진(2026-11-03, /legal/subscription 규정을 그대로 옮긴다). **결제사를 모른다**:
 * 청구는 `BillingProvider` 가 하고, 여기는 언제 · 얼마를 · 몇 번 청구할지와 그 뒤의 상태 · 기간 · 안내를 정한다.
 *
 * 규정과 코드
 *   2조 결제     첫 결제는 동의한 날. 그 뒤 주기마다 같은 금액(`consented_price`)
 *   3조 안내     자동 결제 7일 전 안내(`pre_renewal`). 금액 변경은 30일 전에 알리고 다시 동의 → 동의 없으면 결제 안 함
 *   4조 해지     버튼 하나. 다음 결제부터 멈추고 이미 낸 기간은 끝까지(`cancelSubscription`)
 *   5조 환불     `refund.ts` 의 정기결제 규칙(7일 안 + 그 회차 유료 기능 안 씀 → 전액, 그 밖 일할, 원 미만 버림)
 *   6조 결제 실패 바로 알림 · 3일 동안 하루 한 번 다시 시도 · 그래도 안 되면 멈춤 · 밀린 금액 청구 없음 ·
 *               카드를 바꾸면 바로 이어서(`resumeWithCard`: 새 회차를 지금부터)
 *
 * 기존 1회 결제 기간권(TRACK_30D · TRACK_90D 주문)은 이 표를 지나지 않고 그대로 돈다.
 */
export const PRE_NOTICE_DAYS = 7;
export const PRICE_NOTICE_DAYS = 30;
export const RETRY_DAYS = 3;

export type SubRow = {
  id: string; user_id: string; plan: Plan; period_days: Period; status: string;
  current_period_end: string | null; next_charge_at: string | null; provider: BillingName; provider_ref: string | null;
  consented_price: number; consented_at: string; pending_price: number | null; price_change_at: string | null;
  price_notice_at: string | null; country: string | null; currency: string; source: string | null; posting_idx: string | null;
  retry_count: number; cancel_reason: string | null;
};

const COLS = `id::text, user_id::text, plan, period_days, status, current_period_end::text, next_charge_at::text,
  provider, provider_ref, consented_price, consented_at::text, pending_price, price_change_at::text, price_notice_at::text,
  country, currency, source, posting_idx, retry_count, cancel_reason`;

export async function subscriptionById(id: string): Promise<SubRow | null> {
  return queryOne<SubRow>(`SELECT ${COLS} FROM subscriptions WHERE id = $1`, [id]).catch(() => null);
}

/** 이 사람의 가장 최근 정기결제(끝난 것은 빼고) */
export async function subscriptionOf(userId: string): Promise<SubRow | null> {
  return queryOne<SubRow>(
    `SELECT ${COLS} FROM subscriptions WHERE user_id = $1 AND status <> 'ended' ORDER BY id DESC LIMIT 1`, [userId],
  ).catch(() => null);
}

export function money(amount: number, currency: string): string {
  return priceLabel(amount, currency.trim() === "USD" ? "USD" : "KRW") ?? String(amount);
}

/** 이 길 · 플랜 · 주기의 값. 정해지지 않았으면 `null`(팔지 않는다) */
export function priceFor(route: PayRoute, plan: Plan, period: Period): number | null {
  return route.currency === "KRW" ? krwPrice(plan, period) : usdPrice(plan, period, route.country);
}

export function providerFor(route: PayRoute): BillingName {
  /* 시험 · 개발에서 결제사 시험 열쇠가 없으면 가짜 결제사로 흉내 낸다(운영에서는 열리지 않는다) */
  if (route.provider === "paddle") return paddleReady() || !mockPaymentsAllowed() ? "paddle" : "mock";
  if (kcpReady()) return "kcp";
  return mockPaymentsAllowed() ? "mock" : "kcp";
}

/**
 * 정기결제 한 줄을 연다(결제 화면에서 동의 칸을 체크하고 누른 때). **동의가 없으면 만들지 않는다.**
 * 값은 설정에서 다시 읽는다(화면이 보낸 금액을 믿지 않는다). 빌링키는 결제사 단계가 끝난 뒤 `attachBilling` 으로 붙인다
 */
export async function createSubscription(input: {
  userId: string; plan: Plan; period: Period; route: PayRoute; consent: boolean; provider?: BillingName;
}): Promise<{ ok: true; id: string; amount: number; currency: string } | { ok: false; reason: string }> {
  if (!subscriptionsOpen()) return { ok: false, reason: "closed" };
  if (!input.consent) return { ok: false, reason: "consent" };
  const amount = priceFor(input.route, input.plan, input.period);
  if (amount == null || !productFor(input.plan, input.period)) return { ok: false, reason: "price" };
  const provider = input.provider ?? providerFor(input.route);
  /* 국내 고객을 해외 결제사로 보내지 않는다. 길이 KCP 인데 Paddle 을 부르면 거절한다 */
  if (provider === "paddle" && input.route.provider !== "paddle") return { ok: false, reason: "route" };
  if (provider === "kcp" && input.route.provider !== "kcp") return { ok: false, reason: "route" };
  const attr = await queryOne<{ source: string; posting_idx: string | null }>(
    `SELECT source, posting_idx FROM user_attribution WHERE user_id = $1`, [input.userId]).catch(() => null);
  /* 첫 결제 전에 끊긴 줄(pending)과, 결제가 안 돼 멈춘 · 다시 시도 중인 줄은 새 카드로 여는 새 줄을 위해 닫는다
     (6조 4항: 카드를 바꾸면 바로 이어서. 밀린 금액은 청구하지 않으므로 새 회차가 지금부터 시작한다) */
  await query(`UPDATE subscriptions SET status = 'ended', cancel_reason = coalesce(cancel_reason, 'replaced'), next_charge_at = NULL,
                      updated_at = now() WHERE user_id = $1 AND status IN ('pending', 'past_due', 'paused')`, [input.userId]);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO subscriptions (user_id, plan, period_days, status, provider, consented_price, country, currency, source, posting_idx)
     VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9) RETURNING id::text`,
    [input.userId, input.plan, input.period, provider, amount, input.route.country, input.route.currency,
      attr?.source ?? null, attr?.posting_idx ?? null],
  ).catch(() => null);
  if (!row) return { ok: false, reason: "live" };
  return { ok: true, id: row.id, amount, currency: input.route.currency };
}

/** 결제사가 준 빌링키(또는 구독 번호)를 붙인다 */
export async function attachBilling(subId: string, ref: string): Promise<void> {
  await query(`UPDATE subscriptions SET provider_ref = $2, updated_at = now() WHERE id = $1`, [subId, ref]);
}

type ChargeKind = "first" | "renewal" | "retry" | "resume";

/**
 * 한 회차를 청구하고, 되면 주문 · 결제 · 기간을 같은 거래 안에서 세운다. 같은 회차 · 같은 시도는 한 번뿐이다
 * (`subscription_charges` 의 유일 제약). 결제사가 청구하는 쪽(Paddle)은 부르지 않는다
 */
async function charge(sub: SubRow, kind: ChargeKind, amount: number): Promise<{ ok: true; orderNo: string } | { ok: false; reason: string }> {
  const bp = billingFor(sub.provider);
  if (bp.managed) return { ok: false, reason: "managed" };
  if (!sub.provider_ref) return { ok: false, reason: "no_billing" };
  /* 회차 = 지금까지 결제된 회차 + 1 · 시도 = 그 회차에서 몇 번째 */
  const paid = await queryOne<{ c: number }>(
    `SELECT coalesce(max(cycle_no), 0)::int AS c FROM subscription_charges WHERE subscription_id = $1 AND status = 'paid'`, [sub.id]);
  const cycle = (paid?.c ?? 0) + 1;
  const tried = await queryOne<{ a: number }>(
    `SELECT coalesce(max(attempt_no), 0)::int AS a FROM subscription_charges WHERE subscription_id = $1 AND cycle_no = $2`, [sub.id, cycle]);
  const attempt = (tried?.a ?? 0) + 1;
  const code = productFor(sub.plan, sub.period_days)!;
  const orderNo = `S${sub.id}C${cycle}A${attempt}${randomBytes(2).toString("hex")}`.toUpperCase().slice(0, 40);
  const slot = await query<{ id: string }>(
    `INSERT INTO subscription_charges (subscription_id, cycle_no, attempt_no, kind, amount, currency)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (subscription_id, cycle_no, attempt_no) DO NOTHING RETURNING id::text`,
    [sub.id, cycle, attempt, kind, amount, sub.currency]);
  if (!slot.length) return { ok: false, reason: "busy" };
  const chargeId = slot[0].id;
  const order = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, currency, subscription_id, source, posting_idx)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text`,
    [orderNo, sub.user_id, code, amount, sub.currency, sub.id, sub.source, sub.posting_idx]);
  await query(`UPDATE subscription_charges SET order_id = $2 WHERE id = $1`, [chargeId, order!.id]);

  const res = await bp.charge({
    billingRef: sub.provider_ref, paymentId: orderNo, amount, currency: sub.currency,
    orderName: orderName(code), customerRef: `cm-${sub.user_id}`,
  }).catch((e: unknown) => ({ ok: false as const, reason: e instanceof Error ? e.message : "charge error", retryable: true }));
  if (!res.ok) {
    await query(`UPDATE subscription_charges SET status = 'failed', error = $2 WHERE id = $1`, [chargeId, res.reason.slice(0, 300)]);
    await query(`UPDATE orders SET status = 'failed' WHERE id = $1`, [order!.id]);
    return { ok: false, reason: res.reason };
  }
  const end = await tx(async (c) => {
    await c.query(
      `INSERT INTO payments (order_id, provider, provider_payment_id, status, amount, currency, method, raw)
       VALUES ($1,$2,$3,'paid',$4,$5,'CARD',$6) ON CONFLICT (provider, provider_payment_id) DO NOTHING`,
      [order!.id, bp.name === "kcp" ? "portone" : bp.name, res.paymentId, res.amount, res.currency, JSON.stringify({ subscription: sub.id, kind })]);
    await c.query(`UPDATE orders SET status = 'paid', paid_at = now() WHERE id = $1`, [order!.id]);
    const e = await grantTrackTx(c, { userId: sub.user_id, orderId: order!.id, productCode: code, days: sub.period_days });
    await c.query(`UPDATE subscription_charges SET status = 'paid', provider_payment_id = $2 WHERE id = $1`, [chargeId, res.paymentId]);
    /* 다음 결제일 = 이 회차가 끝나는 때. 밀린 날을 쌓지 않는다: 멈췄다 이어지면 지금부터 새 회차다 */
    await c.query(
      `UPDATE subscriptions SET status = 'active', current_period_end = $2::timestamptz, next_charge_at = $2::timestamptz,
              retry_count = 0, paused_at = NULL, updated_at = now() WHERE id = $1`, [sub.id, e]);
    return e;
  });
  if (res.cardCountry) {
    await query(`UPDATE user_attribution SET card_country = $2, updated_at = now() WHERE user_id = $1`, [sub.user_id, res.cardCountry]).catch(() => undefined);
  }
  await queueNotice({
    kind: "charged", userId: sub.user_id, subscriptionId: sub.id, dedupeKey: `charged:${chargeId}`,
    payload: { amount: money(amount, sub.currency), next: end ? lastDayKst(end) : "", orderNo },
  });
  await matStep(kind === "first" || kind === "resume" ? "purchase" : "renewal", sub.user_id);
  return { ok: true, orderNo };
}

/** 첫 결제(동의한 날). 빌링키가 붙은 뒤에 부른다 */
export async function chargeFirst(subId: string): Promise<{ ok: true; orderNo: string } | { ok: false; reason: string }> {
  const sub = await subscriptionById(subId);
  if (!sub || sub.status !== "pending") return { ok: false, reason: "state" };
  const r = await charge(sub, "first", sub.consented_price);
  if (!r.ok && r.reason !== "busy") {
    /* 첫 결제가 안 되면 정기결제를 열지 않는다(다시 시도하지 않는다: 아직 아무것도 산 것이 없다) */
    await query(`UPDATE subscriptions SET status = 'ended', cancel_reason = 'first_failed', updated_at = now() WHERE id = $1`, [subId]);
    await matStep("payment_failed", sub.user_id);
  }
  return r;
}

/** 이번 결제일에 얼마를 청구하는가. 금액 변경이 적용됐는데 다시 동의하지 않았으면 `null`(청구하지 않는다) */
function amountAt(sub: SubRow, at: number): number | null {
  if (sub.pending_price && sub.price_change_at && Date.parse(sub.price_change_at) <= at) {
    const agreed = sub.price_notice_at && Date.parse(sub.consented_at) > Date.parse(sub.price_notice_at);
    return agreed ? sub.pending_price : null;
  }
  return sub.consented_price;
}

export type TickResult = {
  preNotices: number; priceNotices: number; renewed: number; failed: number; retried: number;
  paused: number; ended: number; noConsent: number; schoolNotices: number;
};

/**
 * 운영 당번(ops tick)이 몇 분에 한 번 부른다. **몇 번 불려도 같다**: 안내는 회차마다 한 통(dedupe), 청구는
 * 회차 · 시도마다 한 번(유일 제약), 다시 시도는 하루에 한 번(`next_charge_at` 을 하루 뒤로 민다).
 */
export async function runSubscriptionTick(): Promise<TickResult> {
  const out: TickResult = { preNotices: 0, priceNotices: 0, renewed: 0, failed: 0, retried: 0, paused: 0, ended: 0, noConsent: 0, schoolNotices: 0 };
  const now = Date.now();

  /* 1. 금액 변경 안내(30일 전). 알린 때를 적는다: 그 뒤의 동의만 새 금액 동의로 센다 */
  for (const s of await query<SubRow>(`SELECT ${COLS} FROM subscriptions WHERE status IN ('active','past_due')
      AND pending_price IS NOT NULL AND price_notice_at IS NULL`).catch(() => [])) {
    if (await queueNotice({ kind: "price_change", userId: s.user_id, subscriptionId: s.id,
      dedupeKey: `price:${s.id}:${s.pending_price}:${s.price_change_at}`,
      payload: { date: s.price_change_at ? lastDayKst(new Date(Date.parse(s.price_change_at) + 1).toISOString()) : "",
        before: money(s.consented_price, s.currency), after: money(s.pending_price!, s.currency) } })) out.priceNotices++;
    await query(`UPDATE subscriptions SET price_notice_at = now(), updated_at = now() WHERE id = $1`, [s.id]);
  }

  /* 2. 자동 결제 7일 전 안내(결제일 · 금액 · 해지 방법). 회차마다 한 통 */
  for (const s of await query<SubRow>(`SELECT ${COLS} FROM subscriptions WHERE status = 'active' AND next_charge_at IS NOT NULL
      AND next_charge_at <= now() + ($1 || ' days')::interval AND next_charge_at > now()`, [String(PRE_NOTICE_DAYS)]).catch(() => [])) {
    if (billingFor(s.provider).managed && !s.provider_ref) continue;
    const amt = amountAt(s, Date.parse(s.next_charge_at!));
    if (amt == null) continue;
    if (await queueNotice({ kind: "pre_renewal", userId: s.user_id, subscriptionId: s.id,
      dedupeKey: `pre:${s.id}:${s.next_charge_at!.slice(0, 10)}`,
      payload: { date: lastDayKst(new Date(Date.parse(s.next_charge_at!) + 1).toISOString()), amount: money(amt, s.currency) } })) out.preNotices++;
  }

  /* 3. 결제일이 된 갱신 · 다시 시도. Paddle 처럼 결제사가 청구하는 쪽은 웹훅이 움직인다 */
  for (const s of await query<SubRow>(`SELECT ${COLS} FROM subscriptions WHERE status IN ('active','past_due')
      AND next_charge_at IS NOT NULL AND next_charge_at <= now() ORDER BY next_charge_at LIMIT 200`).catch(() => [])) {
    if (billingFor(s.provider).managed) continue;
    const amt = amountAt(s, now);
    if (amt == null) {
      /* 3조 3항: 바뀐 금액에 다시 동의하지 않았으면 자동 결제를 하지 않는다. 남은 기간은 그대로 */
      await query(`UPDATE subscriptions SET status = 'canceled', cancel_reason = 'price_not_consented', canceled_at = now(),
                          next_charge_at = NULL, updated_at = now() WHERE id = $1`, [s.id]);
      await queueNotice({ kind: "canceled", userId: s.user_id, subscriptionId: s.id, dedupeKey: `canceled:${s.id}`,
        payload: { until: s.current_period_end ? lastDayKst(s.current_period_end) : "" } });
      await matStep("cancel", s.user_id);
      out.noConsent++;
      continue;
    }
    const retry = s.status === "past_due";
    const r = await charge(s, retry ? "retry" : "renewal", amt);
    if (r.ok) {
      if (amt !== s.consented_price) {
        await query(`UPDATE subscriptions SET consented_price = $2, pending_price = NULL, price_change_at = NULL, price_notice_at = NULL
                      WHERE id = $1`, [s.id, amt]);
      }
      if (retry) out.retried++; else out.renewed++;
      continue;
    }
    if (r.reason === "busy") continue;
    const tries = retry ? s.retry_count + 1 : 0;
    if (retry && tries >= RETRY_DAYS) {
      /* 6조 3항: 3일 동안 하루 한 번 다시 해도 안 되면 멈춘다. 밀린 금액은 청구하지 않는다 */
      await query(`UPDATE subscriptions SET status = 'paused', paused_at = now(), retry_count = $2, next_charge_at = NULL,
                          updated_at = now() WHERE id = $1`, [s.id, tries]);
      await queueNotice({ kind: "paused", userId: s.user_id, subscriptionId: s.id, dedupeKey: `paused:${s.id}:${s.current_period_end ?? ""}` });
      out.paused++;
      continue;
    }
    /* 6조 1 · 2항: 바로 알리고(첫 실패 때 한 통), 하루 뒤 다시 */
    await query(`UPDATE subscriptions SET status = 'past_due', retry_count = $2, next_charge_at = now() + interval '1 day',
                        updated_at = now() WHERE id = $1`, [s.id, tries]);
    if (!retry) {
      await queueNotice({ kind: "payment_failed", userId: s.user_id, subscriptionId: s.id,
        dedupeKey: `failed:${s.id}:${s.current_period_end ?? ""}`, payload: { amount: money(amt, s.currency) } });
      await matStep("payment_failed", s.user_id);
    }
    out.failed++;
  }

  /* 4. 해지한 뒤 기간이 끝난 줄을 닫는다 */
  const ended = await query(`UPDATE subscriptions SET status = 'ended', updated_at = now()
      WHERE status = 'canceled' AND (current_period_end IS NULL OR current_period_end <= now()) RETURNING id`).catch(() => []);
  out.ended = ended.length;

  /* 5. 학교 · 기관 이용권이 30일 안에 끝나는 학생에게만 한 통(기관에는 개인 결제 여부가 보이지 않는다) */
  for (const e of await query<{ id: string; user_id: string; ends_at: string }>(
    `SELECT e.id::text, e.user_id::text, e.ends_at::text FROM entitlements e
      WHERE e.kind = 'track' AND e.status = 'active' AND e.campus_pool_id IS NOT NULL
        AND e.ends_at > now() AND e.ends_at <= now() + interval '30 days'
        AND NOT EXISTS (SELECT 1 FROM entitlements x WHERE x.user_id = e.user_id AND x.kind = 'track'
                          AND x.status = 'active' AND x.ends_at > e.ends_at)
        AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = e.user_id AND s.status IN ('active','past_due','pending'))
      LIMIT 500`).catch(() => [])) {
    if (await queueNotice({ kind: "school_ending", userId: e.user_id, dedupeKey: `school_end:${e.id}`,
      payload: { date: lastDayKst(e.ends_at) } })) out.schoolNotices++;
  }
  return out;
}

/**
 * 4조: 버튼 하나로 해지. 다음 결제부터 멈추고 **이미 낸 기간은 끝까지 쓴다**(기간 줄을 건드리지 않는다).
 * 결제사가 청구하는 쪽(Paddle)은 결제사에도 다음 회차부터 멈추라고 알린다
 */
export async function cancelSubscription(userId: string, subId?: string): Promise<{ ok: boolean; until?: string | null; reason?: string }> {
  const sub = subId ? await subscriptionById(subId) : await subscriptionOf(userId);
  if (!sub || sub.user_id !== userId) return { ok: false, reason: "not_found" };
  if (!["active", "past_due", "pending", "paused"].includes(sub.status)) return { ok: false, reason: "state" };
  if (sub.provider_ref) {
    const r = await billingFor(sub.provider).cancel(sub.provider_ref).catch(() => ({ ok: false, reason: "provider" }));
    if (!r.ok && billingFor(sub.provider).managed) return { ok: false, reason: r.reason ?? "provider" };
  }
  const next = sub.status === "paused" || sub.status === "pending" ? "ended" : "canceled";
  await query(`UPDATE subscriptions SET status = $2, canceled_at = now(), cancel_reason = 'user', next_charge_at = NULL,
                      updated_at = now() WHERE id = $1`, [sub.id, next]);
  if (next === "canceled") {
    await queueNotice({ kind: "canceled", userId, subscriptionId: sub.id, dedupeKey: `canceled:${sub.id}`,
      payload: { until: sub.current_period_end ? lastDayKst(sub.current_period_end) : "" } });
  }
  await matStep("cancel", userId);
  return { ok: true, until: sub.current_period_end };
}

/** 6조 4항: 카드를 바꾸면 바로 이어서. 멈춘 · 결제 실패한 줄에 새 빌링키를 붙이고 지금 새 회차를 청구한다 */
export async function resumeWithCard(userId: string, subId: string, newRef: string): Promise<{ ok: boolean; reason?: string }> {
  const sub = await subscriptionById(subId);
  if (!sub || sub.user_id !== userId) return { ok: false, reason: "not_found" };
  if (sub.status !== "paused" && sub.status !== "past_due") return { ok: false, reason: "state" };
  await query(`UPDATE subscriptions SET provider_ref = $2, updated_at = now() WHERE id = $1`, [sub.id, newRef]);
  const amt = amountAt({ ...sub, provider_ref: newRef }, Date.now());
  if (amt == null) return { ok: false, reason: "price" };
  const r = await charge({ ...sub, provider_ref: newRef }, "resume", amt);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason };
}

/** 3조 2항: 바뀐 금액에 다시 동의 */
export async function reconsentPrice(userId: string, subId: string): Promise<boolean> {
  const r = await query(`UPDATE subscriptions SET consented_at = now(), updated_at = now()
      WHERE id = $1 AND user_id = $2 AND pending_price IS NOT NULL AND price_notice_at IS NOT NULL RETURNING id`, [subId, userId]).catch(() => []);
  return r.length > 0;
}

/**
 * 운영자가 금액 변경을 건다. **적용일은 지금부터 30일 뒤보다 앞일 수 없다**(3조 2항). 안내는 다음 당번이 보낸다
 */
export async function schedulePriceChange(subId: string, newPrice: number, effectiveAt: Date): Promise<{ ok: boolean; reason?: string }> {
  if (!(newPrice > 0)) return { ok: false, reason: "price" };
  if (effectiveAt.getTime() < Date.now() + PRICE_NOTICE_DAYS * 86_400_000 - 60_000) return { ok: false, reason: "too_soon" };
  const r = await query(`UPDATE subscriptions SET pending_price = $2, price_change_at = $3, price_notice_at = NULL, updated_at = now()
      WHERE id = $1 AND status IN ('active','past_due') RETURNING id`, [subId, newPrice, effectiveAt.toISOString()]).catch(() => []);
  return r.length ? { ok: true } : { ok: false, reason: "state" };
}

/**
 * 결제사가 청구하는 쪽(Paddle)의 사건을 같은 표에 옮긴다. 같은 사건이 두 번 와도 같은 결과다
 * (결제 번호로 주문을 찾고, 있으면 아무것도 더 하지 않는다)
 */
export async function applySubEvent(provider: BillingName, ev: SubEvent): Promise<{ ok: boolean; note?: string }> {
  const sub = ev.type === "activated"
    ? await queryOne<SubRow>(`SELECT ${COLS} FROM subscriptions WHERE id::text = $1 AND provider = $2`, [ev.ref, provider]).catch(() => null)
    : await queryOne<SubRow>(`SELECT ${COLS} FROM subscriptions WHERE provider = $1 AND provider_ref = $2 ORDER BY id DESC LIMIT 1`, [provider, ev.ref]).catch(() => null);
  if (!sub) return { ok: false, note: "no_subscription" };
  if (ev.type === "activated" && sub.provider_ref == null) await attachBilling(sub.id, ev.subscriptionId);
  if (ev.type === "activated" || ev.type === "renewed") {
    const seen = await queryOne<{ id: string }>(`SELECT id::text FROM payments WHERE provider = $1 AND provider_payment_id = $2`, [provider, ev.paymentId]).catch(() => null);
    if (seen) return { ok: true, note: "duplicate" };
    /* 국내 고객이 해외 결제로 들어왔으면(결제사가 알려 준 나라가 KR) 멈추고 운영자에게 맡긴다 */
    if (ev.type === "activated" && ev.country === "KR") {
      await query(`UPDATE subscriptions SET status = 'paused', cancel_reason = 'kr_on_paddle', paused_at = now(), updated_at = now() WHERE id = $1`, [sub.id]);
      return { ok: false, note: "kr_on_paddle" };
    }
    const code = productFor(sub.plan, sub.period_days)!;
    const orderNo = `P${sub.id}${randomBytes(4).toString("hex")}`.toUpperCase();
    const end = await tx(async (c) => {
      const o = await c.query<{ id: string }>(
        `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at, subscription_id, source, posting_idx)
         VALUES ($1,$2,$3,$4,$5,'paid',now(),$6,$7,$8) RETURNING id::text`,
        [orderNo, sub.user_id, code, ev.amount, ev.currency, sub.id, sub.source, sub.posting_idx]);
      await c.query(`INSERT INTO payments (order_id, provider, provider_payment_id, status, amount, currency, method, raw)
                     VALUES ($1,$2,$3,'paid',$4,$5,'CARD',$6)`, [o.rows[0].id, provider, ev.paymentId, ev.amount, ev.currency, JSON.stringify({ event: ev.type })]);
      const e = await grantTrackTx(c, { userId: sub.user_id, orderId: o.rows[0].id, productCode: code, days: sub.period_days });
      await c.query(`UPDATE subscriptions SET status = 'active', current_period_end = $2::timestamptz,
                            next_charge_at = coalesce($3::timestamptz, $2::timestamptz), retry_count = 0, updated_at = now() WHERE id = $1`,
        [sub.id, e, ev.periodEnd]);
      return e;
    });
    await queueNotice({ kind: "charged", userId: sub.user_id, subscriptionId: sub.id, dedupeKey: `charged:${provider}:${ev.paymentId}`,
      payload: { amount: money(ev.amount, ev.currency), next: end ? lastDayKst(end) : "", orderNo } });
    await matStep(ev.type === "activated" ? "purchase" : "renewal", sub.user_id);
    return { ok: true };
  }
  if (ev.type === "payment_failed") {
    await query(`UPDATE subscriptions SET status = 'past_due', updated_at = now() WHERE id = $1 AND status = 'active'`, [sub.id]);
    await queueNotice({ kind: "payment_failed", userId: sub.user_id, subscriptionId: sub.id,
      dedupeKey: `failed:${sub.id}:${sub.current_period_end ?? ""}`, payload: { amount: money(sub.consented_price, sub.currency) } });
    await matStep("payment_failed", sub.user_id);
    return { ok: true };
  }
  if (ev.type === "paused") {
    await query(`UPDATE subscriptions SET status = 'paused', paused_at = now(), next_charge_at = NULL, updated_at = now() WHERE id = $1`, [sub.id]);
    await queueNotice({ kind: "paused", userId: sub.user_id, subscriptionId: sub.id, dedupeKey: `paused:${sub.id}:${sub.current_period_end ?? ""}` });
    return { ok: true };
  }
  if (ev.type === "canceled") {
    if (sub.status !== "ended") {
      await query(`UPDATE subscriptions SET status = 'canceled', canceled_at = coalesce(canceled_at, now()), next_charge_at = NULL,
                          updated_at = now() WHERE id = $1`, [sub.id]);
    }
    return { ok: true };
  }
  if (ev.type === "resumed") {
    await query(`UPDATE subscriptions SET status = 'active', paused_at = NULL, updated_at = now() WHERE id = $1`, [sub.id]);
    return { ok: true };
  }
  return { ok: false };
}
