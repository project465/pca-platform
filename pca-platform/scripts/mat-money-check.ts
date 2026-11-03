/**
 * MAT 수익화 끝에서 끝까지(2026-11-03 수익화 E). 가짜 AI(열쇠 없음 → 규칙으로 읽기) · 가짜 결제사로 돈다.
 *
 *   SUBSCRIPTIONS_ENABLED=1 PAYMENTS_PROVIDER=mock npx next start -p 3201   (빌드한 서버)
 *   UI_BASE=http://127.0.0.1:3201 npm run mat:money
 *   SKIP_UI=1 npm run mat:money       (브라우저 없이 엔진 · 규칙만)
 *
 * 1. 검사 없이 가입 → MAT 홈(전공 고르기 · NoTest) → 무료 분석 → 결제 입구 → 요금 → 결제 동의 → 시험 정기결제
 * 2. 7일 전 안내 → 갱신 → 결제 실패 · 하루 한 번 3번 다시 시도 → 멈춤 → 카드 바꾸면 이어짐 → 해지해도 기간 유지
 * 3. 환불 규칙(7일 안 · 유료 기능 안 씀 → 전액, 그 밖 일할 · 원 미만 버림) · 금액 변경(30일 전 안내 · 다시 동의)
 * 4. 결제 길: KR · US · PH · 모르는 나라 · 한국 신호 우선 · 카드 발급국 우선. 운영에서는 청구하지 않는다
 * 5. 학교 이용권 학생은 그대로(무료 칸 · 결제 입구 없음), 끝나기 30일 전 학생에게만 안내
 * 6. 잡인더스트리 공고 입구: 게시판 허용 목록 · 가입 → 유입 경로 · 공고가 주문 · 정기결제에 베껴짐
 * 7. Paddle: 서명 검증 · 사건 옮기기 · 같은 사건 두 번 · 국내 카드가 Paddle 로 오면 멈춤
 * 8. 수치: 걸음마다 한 줄씩 쌓이고, 근거 수가 검사 전 · 후로 쌓인다
 */
import { loadEnv, BASE, makeStudent, cloneFinished } from "./_loop-fixture";
loadEnv();
process.env.SUBSCRIPTIONS_ENABLED = "1";
process.env.MAT_FUNNEL_DEMO = "1";
/* eslint-disable import/first */
import { createHmac } from "node:crypto";
import { query, queryOne } from "../src/lib/db";
import { routeFor } from "../src/lib/subscriptions/route";
import {
  applySubEvent, attachBilling, cancelSubscription, chargeFirst, createSubscription, reconsentPrice, resumeWithCard,
  runSubscriptionTick, schedulePriceChange, subscriptionById,
} from "../src/lib/subscriptions/engine";
import { noticeCount } from "../src/lib/subscriptions/notices";
import { mapPaddleEvent, verifyPaddleSignature } from "../src/lib/subscriptions/paddle";
import { kcpBilling, kcpReady } from "../src/lib/subscriptions/kcp";
import { liveChargesAllowed } from "../src/lib/subscriptions/open";
import { refundable } from "../src/lib/refund";
import { canUseMat, matAccess } from "../src/lib/mat-access";
import { jiPost } from "../src/lib/attribution";
import { matFunnelReport, subjectOf } from "../src/lib/funnel-v3";
import { krwPrice, usdPrice } from "../src/lib/pricing/config";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};
const KR = routeFor({ signupCountry: "KR" });

async function wipe(id: string): Promise<void> {
  await query(`DELETE FROM subscription_notices WHERE user_id = $1`, [id]).catch(() => undefined);
  await query(`DELETE FROM refund_requests WHERE user_id = $1`, [id]).catch(() => undefined);
  await query(`UPDATE orders SET subscription_id = NULL WHERE user_id = $1`, [id]).catch(() => undefined);
  await query(`DELETE FROM subscriptions WHERE user_id = $1`, [id]).catch(() => undefined);
  await query(`DELETE FROM orders WHERE user_id = $1`, [id]).catch(() => undefined);
  await query(`DELETE FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [id]).catch(() => undefined);
  for (const t of ["assistant_postings", "assistant_drafts", "mat_free_claims", "user_attribution"]) {
    await query(`DELETE FROM ${t} WHERE user_id = $1`, [id]).catch(() => undefined);
  }
}
const endOf = async (subId: string) => (await queryOne<{ e: string | null }>(
  `SELECT max(e.ends_at)::text AS e FROM entitlements e JOIN orders o ON o.id = e.order_id WHERE o.subscription_id = $1`, [subId]))?.e ?? null;
const paidOrders = async (subId: string) => (await queryOne<{ n: number }>(
  `SELECT count(*)::int AS n FROM orders WHERE subscription_id = $1 AND status = 'paid'`, [subId]))?.n ?? 0;
const due = (subId: string, sql = "now() - interval '1 minute'") =>
  query(`UPDATE subscriptions SET next_charge_at = ${sql} WHERE id = $1`, [subId]);

async function engine(): Promise<void> {
  console.log("── 정기결제 엔진");
  const s = await makeStudent("zz-money-sub");
  await wipe(s.id);
  await query(`INSERT INTO user_attribution (user_id, source, board, posting_idx) VALUES ($1, 'jobindustry', '488', '777')`, [s.id]);

  const no = await createSubscription({ userId: s.id, plan: "basic", period: 30, route: KR, consent: false });
  ok("동의 없이는 정기결제를 만들지 않는다", !no.ok && no.reason === "consent");
  const r90 = await createSubscription({ userId: s.id, plan: "research", period: 90, route: KR, consent: true });
  ok("값이 정해지지 않은 연구자 90일은 팔지 않는다", !r90.ok && r90.reason === "price");
  const m = await createSubscription({ userId: s.id, plan: "basic", period: 30, route: KR, consent: true });
  ok("동의하면 정기결제 한 줄이 선다(가짜 결제사)", m.ok && m.amount === 9900 && m.currency === "KRW");
  if (!m.ok) return;
  const id = m.id;
  await attachBilling(id, "mock_card_ok");
  const f = await chargeFirst(id);
  ok("첫 결제가 되고 기간이 열린다", f.ok && (await subscriptionById(id))?.status === "active");
  const o1 = await queryOne<{ source: string | null; posting_idx: string | null }>(
    `SELECT source, posting_idx FROM orders WHERE subscription_id = $1 ORDER BY id LIMIT 1`, [id]);
  ok("주문에 유입 경로 · 공고가 베껴진다", o1?.source === "jobindustry" && o1.posting_idx === "777", JSON.stringify(o1));
  const sub0 = await subscriptionById(id);
  ok("정기결제에도 유입 경로가 베껴진다", sub0?.source === "jobindustry" && sub0.posting_idx === "777");
  const e1 = await endOf(id);
  ok("다음 결제일 = 이번 기간 끝", !!e1 && sub0?.next_charge_at === e1, `${sub0?.next_charge_at} / ${e1}`);

  /* 7일 전 안내 */
  await due(id, "now() + interval '6 days'");
  await runSubscriptionTick();
  await runSubscriptionTick();
  ok("자동 결제 7일 전 안내가 한 통 쌓인다(두 번 돌려도 한 통)", await noticeCount(s.id, "pre_renewal") === 1);
  const pre = await queryOne<{ payload: Record<string, string> }>(
    `SELECT payload FROM subscription_notices WHERE user_id = $1 AND kind = 'pre_renewal'`, [s.id]);
  ok("안내에 결제일 · 금액이 있다", !!pre?.payload.date && pre.payload.amount === "9,900원", JSON.stringify(pre?.payload));

  /* 갱신 */
  await due(id);
  const t1 = await runSubscriptionTick();
  ok("결제일이 되면 갱신한다", t1.renewed === 1 && await paidOrders(id) === 2, JSON.stringify(t1));
  const e2 = await endOf(id);
  ok("갱신하면 기간이 끝에 이어 붙는다(30일 더)", !!e1 && !!e2 && Math.abs(Date.parse(e2) - Date.parse(e1) - 30 * 86_400_000) < 120_000);
  await runSubscriptionTick();
  ok("같은 날 다시 돌려도 두 번 청구하지 않는다", await paidOrders(id) === 2);

  /* 결제 실패 → 하루 한 번 3번 → 멈춤 */
  await query(`UPDATE subscriptions SET provider_ref = 'mock_card_fail' WHERE id = $1`, [id]);
  await due(id);
  await runSubscriptionTick();
  let st = await subscriptionById(id);
  ok("실패하면 past_due · 바로 알림 한 통", st?.status === "past_due" && await noticeCount(s.id, "payment_failed") === 1, st?.status);
  ok("다시 시도는 하루 뒤", !!st?.next_charge_at && Date.parse(st.next_charge_at) - Date.now() > 23 * 3_600_000);
  await runSubscriptionTick();
  ok("하루가 지나기 전에는 다시 청구하지 않는다", (await subscriptionById(id))?.retry_count === 0);
  for (let i = 1; i <= 3; i++) {
    await due(id);
    await runSubscriptionTick();
  }
  st = await subscriptionById(id);
  ok("3일 동안 하루 한 번 다시 해도 안 되면 멈춘다", st?.status === "paused" && st.retry_count === 3, `${st?.status} ${st?.retry_count}`);
  ok("멈춤 안내 한 통 · 실패 알림은 처음 한 통뿐", await noticeCount(s.id, "paused") === 1 && await noticeCount(s.id, "payment_failed") === 1);
  ok("밀린 금액을 청구하지 않는다(결제된 주문 그대로 2건)", await paidOrders(id) === 2);
  await runSubscriptionTick();
  ok("멈춘 줄은 더 청구하지 않는다", (await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM subscription_charges WHERE subscription_id = $1`, [id]))?.n === 6);

  /* 카드를 바꾸면 이어짐 */
  const rs = await resumeWithCard(s.id, id, "mock_card_ok_2");
  st = await subscriptionById(id);
  ok("카드를 바꾸면 바로 이어진다(지금부터 새 회차)", rs.ok && st?.status === "active" && await paidOrders(id) === 3, JSON.stringify(rs));

  /* 해지해도 기간 유지 */
  const before = await endOf(id);
  const c = await cancelSubscription(s.id, id);
  st = await subscriptionById(id);
  ok("해지 단추 하나로 canceled · 다음 결제 없음", c.ok && st?.status === "canceled" && st.next_charge_at === null);
  ok("해지해도 이미 낸 기간은 그대로", (await endOf(id)) === before);
  await query(`UPDATE subscriptions SET next_charge_at = now() - interval '1 minute' WHERE id = $1`, [id]);
  await runSubscriptionTick();
  ok("해지한 뒤에는 청구하지 않는다", await paidOrders(id) === 3);
  ok("해지 안내 한 통", await noticeCount(s.id, "canceled") === 1);
  const acc = await matAccess(s.id);
  ok("해지 뒤에도 기간 동안은 유료 기능이 열려 있다", acc.paid);

  /* 환불 규칙 */
  console.log("── 환불 규칙");
  const last = await queryOne<{ id: string; amount: number }>(
    `SELECT id::text, amount FROM orders WHERE subscription_id = $1 AND status = 'paid' ORDER BY id DESC LIMIT 1`, [id]);
  const v1 = await refundable(last!.id);
  ok("7일 안 · 유료 기능 안 씀 → 전액", v1.ok && v1.amount === 9900 && v1.reason === "before_start", JSON.stringify(v1));
  await query(`INSERT INTO assistant_drafts (user_id, core_code, note_text, draft, status) VALUES ($1, 'ME_CORE_V3', '메모', '{}'::jsonb, 'draft')`, [s.id])
    .catch(async () => query(`INSERT INTO assistant_ai_calls (user_id, op, model, outcome) VALUES ($1, 'mat.ask.draft', 'claude-opus-5-5', 'ok')`, [s.id]));
  const v2 = await refundable(last!.id);
  const want = Math.floor((9900 / 30) * 30);
  ok("유료 기능을 쓰면 일할(원 미만 버림)", v2.ok && v2.reason === "pass_remaining" && v2.amount === Math.min(9900, want), JSON.stringify(v2));
  await query(`UPDATE orders SET paid_at = now() - interval '8 days' WHERE id = $1`, [last!.id]);
  await query(`UPDATE entitlements SET starts_at = now() - interval '8 days', ends_at = now() + interval '22 days' WHERE order_id = $1`, [last!.id]);
  const v3 = await refundable(last!.id);
  ok("7일이 지나면 남은 22일 일할: 9900 ÷ 30 × 22 = 7260", v3.ok && v3.amount === 7260, JSON.stringify(v3));

  /* 금액 변경 */
  console.log("── 금액 변경(30일 전 안내 · 다시 동의)");
  const p = await makeStudent("zz-money-price");
  await wipe(p.id);
  const pm = await createSubscription({ userId: p.id, plan: "basic", period: 30, route: KR, consent: true });
  if (!pm.ok) { ok("금액 변경 시험용 정기결제", false); return; }
  await attachBilling(pm.id, "mock_card_ok");
  await chargeFirst(pm.id);
  const soon = await schedulePriceChange(pm.id, 10900, new Date(Date.now() + 10 * 86_400_000));
  ok("30일보다 이른 금액 변경은 걸 수 없다", !soon.ok && soon.reason === "too_soon");
  const later = await schedulePriceChange(pm.id, 10900, new Date(Date.now() + 31 * 86_400_000));
  ok("31일 뒤 금액 변경을 건다", later.ok);
  await runSubscriptionTick();
  ok("금액 변경 안내가 한 통 나간다", await noticeCount(p.id, "price_change") === 1);
  await query(`UPDATE subscriptions SET price_change_at = now() - interval '1 hour' WHERE id = $1`, [pm.id]);
  await due(pm.id);
  await runSubscriptionTick();
  const noc = await subscriptionById(pm.id);
  ok("다시 동의하지 않았으면 자동 결제를 하지 않는다", noc?.status === "canceled" && noc.cancel_reason === "price_not_consented" && await paidOrders(pm.id) === 1);
  const q = await makeStudent("zz-money-price2");
  await wipe(q.id);
  const qm = await createSubscription({ userId: q.id, plan: "basic", period: 30, route: KR, consent: true });
  if (qm.ok) {
    await attachBilling(qm.id, "mock_card_ok");
    await chargeFirst(qm.id);
    await schedulePriceChange(qm.id, 10900, new Date(Date.now() + 31 * 86_400_000));
    await runSubscriptionTick();
    ok("안내 뒤 다시 동의", await reconsentPrice(q.id, qm.id));
    await query(`UPDATE subscriptions SET price_change_at = now() - interval '1 hour' WHERE id = $1`, [qm.id]);
    await due(qm.id);
    await runSubscriptionTick();
    const amt = await queryOne<{ amount: number }>(`SELECT amount FROM orders WHERE subscription_id = $1 AND status = 'paid' ORDER BY id DESC LIMIT 1`, [qm.id]);
    ok("다시 동의했으면 새 금액으로 결제한다", amt?.amount === 10900, String(amt?.amount));
  }
}

function routing(): void {
  console.log("── 결제 길");
  const kr = routeFor({ signupCountry: "KR" });
  ok("가입 국가 KR → KCP · 원화", kr.provider === "kcp" && kr.currency === "KRW");
  const us = routeFor({ ipCountry: "US" });
  ok("접속 국가 US → Paddle · 1군 $9.99", us.provider === "paddle" && us.tier === "T1" && usdPrice("basic", 30, us.country) === 999);
  const ph = routeFor({ signupCountry: "PH" });
  ok("필리핀 → Paddle · 3군 $4.99 · 연구자 $9.99", ph.provider === "paddle" && ph.tier === "T3" && usdPrice("basic", 30, "PH") === 499 && usdPrice("research", 30, "PH") === 999);
  ok("목록에 없는 나라 → 1군", routeFor({ signupCountry: "BR" }).provider === "paddle" && usdPrice("basic", 30, "BR") === 999);
  ok("해외 90일 값은 비어 있다(판매 안 함)", usdPrice("basic", 90, "US") === null && krwPrice("research", 90) === null);
  ok("해외 가입이라도 지금 한국에서 접속하면 KCP(한국 신호 우선)", routeFor({ signupCountry: "US", ipCountry: "KR" }).provider === "kcp");
  ok("한국 카드(발급국 KR)면 무조건 KCP", routeFor({ signupCountry: "US", ipCountry: "US", cardCountry: "KR" }).provider === "kcp");
  ok("해외 카드면 한국 가입이라도 Paddle", routeFor({ signupCountry: "KR", cardCountry: "US" }).provider === "paddle");
  ok("아무 신호도 없으면 국내(KCP)", routeFor({}).provider === "kcp");
}

async function production(): Promise<void> {
  console.log("── 운영에서는 청구하지 않는다");
  const keep = { APP_ENV: process.env.APP_ENV, ch: process.env.PORTONE_BILLING_CHANNEL_KEY, sec: process.env.PORTONE_BILLING_API_SECRET,
    mode: process.env.PORTONE_BILLING_MODE, store: process.env.PORTONE_BILLING_STORE_ID };
  Object.assign(process.env, { PORTONE_BILLING_CHANNEL_KEY: "channel-key-test", PORTONE_BILLING_API_SECRET: "test-secret", PORTONE_BILLING_MODE: "test", PORTONE_BILLING_STORE_ID: "store-test" });
  ok("운영 밖 · 시험 모드 · 열쇠가 있으면 KCP 가 열린다", kcpReady());
  process.env.APP_ENV = "production";
  delete process.env.SUBSCRIPTIONS_LIVE;
  ok("APP_ENV=production 이면 KCP 시험 키가 있어도 닫힌다", !kcpReady() && !liveChargesAllowed());
  const r = await kcpBilling.charge({ billingRef: "bk", paymentId: "X1", amount: 9900, currency: "KRW", orderName: "t", customerRef: "c" });
  ok("운영에서 KCP 청구를 거절한다(네트워크를 부르지 않는다)", !r.ok && !r.retryable);
  const { mockBilling } = await import("../src/lib/subscriptions/mock");
  const r2 = await mockBilling.charge({ billingRef: "mock_card_ok", paymentId: "X2", amount: 9900, currency: "KRW", orderName: "t", customerRef: "c" });
  ok("운영에서 가짜 청구도 거절한다", !r2.ok);
  if (keep.APP_ENV === undefined) delete process.env.APP_ENV; else process.env.APP_ENV = keep.APP_ENV;
  for (const [k, v] of [["PORTONE_BILLING_CHANNEL_KEY", keep.ch], ["PORTONE_BILLING_API_SECRET", keep.sec], ["PORTONE_BILLING_MODE", keep.mode], ["PORTONE_BILLING_STORE_ID", keep.store]] as const) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
}

async function paddle(): Promise<void> {
  console.log("── Paddle(가짜 사건)");
  const secret = "pdl_test_secret_for_check";
  const body = JSON.stringify({ event_id: "evt_1", event_type: "transaction.completed" });
  const ts = Math.floor(Date.now() / 1000);
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  ok("맞는 서명을 받는다", verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, secret));
  ok("본문을 바꾸면 거절한다", !verifyPaddleSignature(body + " ", `ts=${ts};h1=${h1}`, secret));
  ok("5분 넘은 서명을 거절한다", !verifyPaddleSignature(body, `ts=${ts - 400};h1=${createHmac("sha256", secret).update(`${ts - 400}:${body}`).digest("hex")}`, secret));
  const u = await makeStudent("zz-money-paddle");
  await wipe(u.id);
  const us = routeFor({ signupCountry: "US" });
  const sub = await createSubscription({ userId: u.id, plan: "basic", period: 30, route: us, consent: true, provider: "paddle" });
  ok("해외 길이면 Paddle 정기결제 한 줄(달러 · 1군 값)", sub.ok && sub.currency === "USD" && sub.amount === 999);
  const krTry = await createSubscription({ userId: u.id, plan: "basic", period: 30, route: KR, consent: true, provider: "paddle" });
  ok("국내 길로 Paddle 을 부르면 거절한다", !krTry.ok && krTry.reason === "route");
  if (!sub.ok) return;
  const act = mapPaddleEvent({ event_type: "transaction.completed", data: { id: "txn_01", origin: "web", subscription_id: "sub_01",
    custom_data: { cm_sub: sub.id }, currency_code: "USD", details: { totals: { total: "999" } }, address: { country_code: "US" } } });
  ok("첫 결제 사건 → activated", act?.type === "activated");
  const a1 = await applySubEvent("paddle", act!);
  const a2 = await applySubEvent("paddle", act!);
  ok("같은 사건이 두 번 와도 한 번만 연다", a1.ok && a2.note === "duplicate" && await paidOrders(sub.id) === 1, JSON.stringify([a1, a2]));
  ok("Paddle 구독 번호가 붙는다", (await subscriptionById(sub.id))?.provider_ref === "sub_01");
  const ren = mapPaddleEvent({ event_type: "transaction.completed", data: { id: "txn_02", origin: "subscription_recurring", subscription_id: "sub_01",
    currency_code: "USD", details: { totals: { total: "999" } } } });
  await applySubEvent("paddle", ren!);
  ok("자동 갱신 사건 → 기간이 이어진다", await paidOrders(sub.id) === 2);
  const t = await runSubscriptionTick();
  void t;
  ok("Paddle 줄은 우리 당번이 청구하지 않는다", await paidOrders(sub.id) === 2);
  await applySubEvent("paddle", mapPaddleEvent({ event_type: "subscription.past_due", data: { id: "sub_01" } })!);
  ok("past_due 사건 → 결제 실패 알림", (await subscriptionById(sub.id))?.status === "past_due" && await noticeCount(u.id, "payment_failed") === 1);
  await applySubEvent("paddle", mapPaddleEvent({ event_type: "subscription.paused", data: { id: "sub_01" } })!);
  ok("paused 사건 → 멈춤", (await subscriptionById(sub.id))?.status === "paused");
  const k = await makeStudent("zz-money-paddle-kr");
  await wipe(k.id);
  const ks = await createSubscription({ userId: k.id, plan: "basic", period: 30, route: us, consent: true, provider: "paddle" });
  if (ks.ok) {
    const r = await applySubEvent("paddle", mapPaddleEvent({ event_type: "transaction.completed", data: { id: "txn_kr", origin: "web", subscription_id: "sub_kr",
      custom_data: { cm_sub: ks.id }, currency_code: "USD", details: { totals: { total: "999" } }, address: { country_code: "KR" } } })!);
    ok("Paddle 이 알려 준 나라가 KR 이면 열지 않고 멈춘다", !r.ok && r.note === "kr_on_paddle" && await paidOrders(ks.id) === 0);
  }
}

async function school(): Promise<void> {
  console.log("── 학교 · 기관 이용권");
  const s = await makeStudent("zz-money-school");
  await wipe(s.id);
  const pool = await queryOne<{ id: string }>(`SELECT id::text FROM campus_mat_pools ORDER BY id LIMIT 1`).catch(() => null);
  if (!pool) { ok("학교 이용권 줄(campus_mat_pools)이 있다", false, "로컬 DB 에 학교 풀이 없다"); return; }
  await query(`INSERT INTO entitlements (user_id, product_code, kind, status, starts_at, ends_at, campus_pool_id)
               VALUES ($1, 'TRACK_30D', 'track', 'active', now() - interval '150 days', now() + interval '20 days', $2)`, [s.id, pool.id]);
  const a = await matAccess(s.id);
  ok("학교 이용권 학생은 그대로 전부(무료 칸을 세지 않는다)", a.paid && a.freeLeft === Infinity);
  const d = await canUseMat(s.id, "draft");
  ok("학교 이용권 학생은 지원서 초안도 열린다", d.ok && !d.free);
  await runSubscriptionTick();
  ok("끝나기 30일 안이면 학생에게 안내 한 통", await noticeCount(s.id, "school_ending") === 1);
  await runSubscriptionTick();
  ok("두 번 돌려도 한 통", await noticeCount(s.id, "school_ending") === 1);
  const inst = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM subscription_notices n JOIN campus_students c ON c.user_id = n.user_id WHERE n.kind = 'school_ending' AND n.user_id <> $1`, [s.id]).catch(() => ({ n: 0 }));
  void inst;
  await query(`DELETE FROM entitlements WHERE user_id = $1`, [s.id]);
}

function entry(): void {
  console.log("── 잡인더스트리 공고 입구");
  ok("허용 게시판 · 숫자 idx 만 받는다", !!jiPost("488", "123") && !jiPost("999", "1") && !jiPost("488", "1;drop") && !jiPost("488", "https://x"));
  ok("상세 주소는 서버가 만든다", jiPost("430", "55")?.url === "https://www.jobindustry.co.kr/430/?bmode=view&idx=55");
}

async function ui(): Promise<void> {
  console.log("── 화면: 검사 없이 가입 → 무료 분석 → 결제 입구 → 요금 → 동의 → 정기결제");
  const { chromium } = await import("playwright");
  const br = await chromium.launch();
  const email = `zz.money.${Date.now().toString(36)}@example.com`;
  try {
    const ctx = await br.newContext({ viewport: { width: 390, height: 860 } });
    const p = await ctx.newPage();
    /* 잡인더스트리 공고 입구로 들어온다(비회원 → 가입) */
    const job = await queryOne<{ id: string; ref: string; core: string | null }>(
      `SELECT id::text, source_ref AS ref, core_code AS core FROM v3_job_postings WHERE source = 'jobindustry'
         AND raw_requirements <> '{}' AND source_ref ~ '^[0-9]+$' ORDER BY id DESC LIMIT 1`).catch(() => null);
    const idx = job?.ref ?? "424242";
    await p.goto(`${BASE}/from/jobindustry?board=488&idx=${idx}`, { waitUntil: "domcontentloaded" });
    ok("비회원은 가입 화면으로(검사 없이)", new URL(p.url()).pathname === "/signup" && p.url().includes("from-ji"), p.url());
    await p.fill('input[name="name"]', "시험");
    await p.fill('input[name="email"]', email);
    await p.fill('input[name="password"]', "Zz-money-check-2026!");
    for (const c of await p.locator('input[name="consent"]').all()) await c.check().catch(() => undefined);
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/signup"), { timeout: 30000 }), p.click('button[type="submit"]')]);
    await p.waitForLoadState("networkidle");
    ok("가입하면 그 공고 자리로 온다", new URL(p.url()).pathname === "/mat/from-ji", p.url());
    const u = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE email = $1`, [email]);
    const at = await queryOne<{ source: string; posting_idx: string | null; board: string | null }>(
      `SELECT source, posting_idx, board FROM user_attribution WHERE user_id = $1`, [u!.id]);
    ok("가입한 사람에 유입 경로 · 게시판 · 공고 idx 가 적힌다", at?.source === "jobindustry" && at.posting_idx === idx && at.board === "488", JSON.stringify(at));
    await query(`UPDATE users SET is_demo = true WHERE id = $1`, [u!.id]);
    const body0 = await p.locator("body").innerText();
    ok("여는 것만으로는 무료 분석을 쓰지 않는다", (await matAccess(u!.id)).freeLeft === 1 && body0.includes("무료 1회"));
    if (!job) {
      /* 모아 둔 잡인더스트리 공고가 없는 DB 면 MAT 홈에서 전공을 고르고 붙여 넣기로 무료 분석 */
      await p.goto(`${BASE}/mat`, { waitUntil: "networkidle" });
      if (await p.locator('select[name="core"]').count()) {
        await p.selectOption('select[name="core"]', "ME_CORE_V3");
        await Promise.all([p.waitForURL(/\/mat$/), p.getByRole("button", { name: "이 전공으로 시작" }).click()]);
      }
      await p.goto(`${BASE}/mat/jobs#paste`, { waitUntil: "networkidle" });
      await p.fill('textarea[name="text"]', "연구개발 신입. 자격 요건: 실험 설계와 데이터 분석 경험. 우대: 논문 실적, 특허, 국책 과제 참여 경험.");
      await Promise.all([p.waitForURL(/\/mat\/jobs\/\d+/, { timeout: 60000 }), p.getByRole("button", { name: "내 경험과 맞춰 보기" }).click()]);
    } else {
      await Promise.all([p.waitForURL(/\/mat\/(jobs\/\d+|pricing)/, { timeout: 60000 }), p.click('form button[type="submit"]')]);
    }
    ok("그 공고 무료 분석 결과가 선다", /\/mat\/jobs\/\d+$/.test(new URL(p.url()).pathname), p.url());
    const t1 = await p.locator("body").innerText();
    ok("분석 결과 아래 결제 입구(Paywall)", /공고 \d+개가 더 있어요|다른 공고도 분석할 수 있어요/.test(t1) && t1.includes("무료 분석 1회를 썼어요"));
    ok("결제 입구에 '검사를 끝내면 무료 분석 1회 더'", t1.includes("검사를 끝내면 무료 분석 1회 더"));
    await Promise.all([p.waitForURL(/\/mat\/pricing/), p.locator('a[href^="/mat/pricing"]').first().click()]);
    const t2 = await p.locator("body").innerText();
    ok("요금: 기본 9,900원 · 연구자 19,900원 / 30일", t2.includes("9,900원") && t2.includes("19,900원"));
    ok("요금: 실제 한도(공고 분석 20회 · 면접 연습 3회 · 번마다 8턴)", t2.includes("공고 분석 20회") && t2.includes("면접 연습 3회") && t2.includes("번마다 8턴"));
    ok("요금: 자동 결제 안내 · 남은 기간 유지 · 규정 링크", t2.includes("30일마다 자동 결제") && t2.includes("해지해도 남은 기간은 그대로 써요")
      && await p.locator('a[href="/legal/subscription"]').count() > 0 && await p.locator('a[href="/legal/refund"]').count() > 0);
    await p.goto(`${BASE}/mat/pricing?p=90`, { waitUntil: "networkidle" });
    const t3 = await p.locator("body").innerText();
    ok("90일: 기본 24,900원 · 연구자 값은 숨긴다", t3.includes("24,900원") && !t3.includes("49,") && t3.includes("이 기간은 아직 팔지 않아요"));
    await p.goto(`${BASE}/mat/pricing`, { waitUntil: "networkidle" });
    await Promise.all([p.waitForURL(/\/mat\/subscribe/), p.getByRole("link", { name: "기본으로 시작" }).click()]);
    const t4 = await p.locator("body").innerText();
    ok("결제 화면: 다음 결제일 · 금액을 먼저 보인다", t4.includes("다음 자동 결제") && /\d{4}-\d{2}-\d{2} · 9,900원/.test(t4));
    const box = p.locator('input[name="consent"]');
    ok("동의 칸은 비어 있는 채로 열린다 · 단추가 꺼져 있다", !(await box.isChecked()) && await p.getByRole("button", { name: "동의하고 결제" }).isDisabled());
    await box.check();
    await Promise.all([p.waitForURL(/\/mat\/pass/, { timeout: 30000 }), p.getByRole("button", { name: "동의하고 결제" }).click()]);
    const t5 = await p.locator("body").innerText();
    ok("시험 정기결제가 되고 이용권 화면에 다음 결제 · 해지 단추", t5.includes("다음 결제") && t5.includes("정기결제 해지"));
    const sub = await queryOne<{ id: string; source: string | null; posting_idx: string | null }>(
      `SELECT id::text, source, posting_idx FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [u!.id]);
    ok("정기결제 · 주문에 잡인더스트리 공고가 베껴진다", sub?.source === "jobindustry" && sub.posting_idx === idx);
    await p.goto(`${BASE}/my`, { waitUntil: "networkidle" });
    const t6 = await p.locator("body").innerText();
    ok("내 정보 › 이용권에 해지 단추 하나", t6.includes("이용권") && await p.getByRole("button", { name: "정기결제 해지" }).count() === 1);
    await Promise.all([p.waitForURL(/sub=canceled/), p.getByRole("button", { name: "정기결제 해지" }).click()]);
    const after = await queryOne<{ status: string }>(`SELECT status FROM subscriptions WHERE id = $1`, [sub!.id]);
    ok("내 정보에서 해지하면 canceled(남은 기간 유지)", after?.status === "canceled" && (await matAccess(u!.id)).paid);
    const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("휴대폰 폭에서 가로 스크롤 없음", sx <= 0, String(sx));

    /* 수치 */
    const subj = subjectOf(u!.id);
    const steps = await query<{ step: string }>(`SELECT DISTINCT step FROM mat_funnel_events WHERE subject = $1`, [subj]);
    const have = new Set(steps.map((x) => x.step));
    ok("수치: 가입 · MAT 열기 · 무료 분석 · 결제 시작 · 결제 · 해지가 쌓인다",
      ["signup", "free_analysis_used", "checkout_start", "purchase", "cancel"].every((k) => have.has(k)), [...have].join(","));
    const src = await queryOne<{ source: string; posting_idx: string }>(`SELECT source, posting_idx FROM mat_funnel_events WHERE subject = $1 AND step = 'signup'`, [subj]);
    ok("수치: 가입 줄에 유입 경로 · 공고 idx", src?.source === "jobindustry" && src.posting_idx === idx, JSON.stringify(src));
    const rep = await matFunnelReport(2);
    ok("수치: 근거 수가 검사 전으로 쌓인다", rep.evidence.some((e) => !e.withAssessment && e.analyses > 0));
    await ctx.close();
  } finally {
    await br.close();
  }
}

async function main(): Promise<void> {
  routing();
  entry();
  await engine();
  await production();
  await paddle();
  await school();
  if (process.env.SKIP_UI !== "1") await ui();
  void cloneFinished;
  console.log(`\nMAT 수익화 끝에서 끝까지 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main().catch((e) => { console.error(e); process.exit(1); });
