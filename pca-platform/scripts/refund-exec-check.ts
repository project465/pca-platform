/**
 * 환불 승인이 결제대행사 취소를 실제로 부르는가, 대행사 쪽 취소가 기간에 옮겨지는가(2026-11-03 수익화 E-1).
 *
 *   npm run pay:refund      (로컬 DB · 가짜 대행사. 서버가 필요 없다)
 *
 * 1. 승인 → 대행사 취소 → 장부(대행사 번호) → 기간 끊음 → `refund_done` 메일. 이 차례
 * 2. 대행사가 거절하면 메일 · 장부 · 기간이 그대로이고 요청은 `approved` 로 남는다. 다시 시도하면 끝난다
 * 3. 웹훅의 부분 취소는 기간을 줄이고, 같은 웹훅이 다시 와도 한 번만 적는다. 나머지 취소는 주문을 닫는다
 * 4. 우리 승인으로 적은 환불 뒤에 대행사의 취소 웹훅이 와도 두 번 적지 않는다
 */
import { loadEnv, makeStudent } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { query, queryOne } from "../src/lib/db";
import { markMockPaid, markMockCancel, markMockRefundFail } from "../src/lib/payments";
import { settlePayment } from "../src/lib/orders";
import { requestRefund, decide, executeRefund } from "../src/lib/refund-requests";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

const stamp = Date.now().toString(36).toUpperCase();
let seq = 0;

/** 30일권 한 장을 가짜 대행사로 산다(주문 → 승인 → 확정) */
async function buy(userId: string): Promise<{ orderId: string; orderNo: string; pid: string }> {
  const orderNo = `ZR${stamp}${++seq}`;
  const o = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, currency) VALUES ($1,$2,'TRACK_30D',9900,'KRW')
     RETURNING id::text`, [orderNo, userId]);
  const pid = `mock_${orderNo}`;
  await markMockPaid({ providerPaymentId: pid, status: "paid", amount: 9900, currency: "KRW", orderNo, raw: {} });
  const s = await settlePayment(pid);
  if (!s.ok) throw new Error(`확정 실패 ${s.reason}`);
  return { orderId: o!.id, orderNo, pid };
}

const endOf = async (orderId: string) => (await queryOne<{ e: string }>(
  `SELECT ends_at::text AS e FROM entitlements WHERE order_id = $1`, [orderId]))?.e ?? "";
const daysLeft = async (orderId: string) => (await queryOne<{ d: number }>(
  `SELECT extract(epoch FROM ends_at - starts_at)::float8 / 86400 AS d FROM entitlements WHERE order_id = $1`, [orderId]))?.d ?? -1;
const mails = async (orderNo: string) => (await queryOne<{ n: number }>(
  `SELECT count(*)::int AS n FROM outbox WHERE kind = 'refund_done' AND payload->>'orderNo' = $1`, [orderNo]))?.n ?? 0;

async function main(): Promise<void> {
  if ((process.env.PAYMENTS_PROVIDER ?? "mock") !== "mock") throw new Error("가짜 대행사로만 돌린다");
  const s = await makeStudent("zz-refund-exec");
  const admin = s.id;

  /* 1 — 승인 → 대행사 취소 → 장부 → 기간 → 메일 */
  {
    const b = await buy(s.id);
    const r = await requestRefund({ orderNo: b.orderNo, userId: s.id, reason: "changed_mind" });
    ok("요청이 접수된다", r.ok);
    const d = await decide({ requestId: r.ok ? r.id : "0", by: admin, action: "approve" });
    ok("승인이 대행사 취소까지 끝낸다", d.ok && d.refunded === true, JSON.stringify(d));
    const ev = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM payment_events WHERE kind = 'mock_refund'
        AND payload->>'providerPaymentId' = $1`, [b.pid]);
    ok("대행사에 취소를 한 번 요청했다", ev?.n === 1, String(ev?.n));
    const rf = await queryOne<{ provider_refund_id: string | null; source: string | null; amount: number }>(
      `SELECT provider_refund_id, source, amount FROM refunds WHERE order_id = $1`, [b.orderId]);
    ok("장부에 대행사 취소 번호가 적힌다", !!rf?.provider_refund_id && rf.source === "approval", JSON.stringify(rf));
    ok("기간이 지금으로 끊긴다", Date.parse(await endOf(b.orderId)) <= Date.now() + 1000);
    ok("refund_done 메일이 한 통 쌓인다", await mails(b.orderNo) === 1);
    const rr = await queryOne<{ status: string }>(`SELECT status FROM refund_requests WHERE id = $1`, [r.ok ? r.id : "0"]);
    ok("요청이 refunded 로 닫힌다", rr?.status === "refunded", rr?.status);

    /* 4 — 같은 결제의 취소 웹훅이 뒤늦게 와도 두 번 적지 않는다 */
    await settlePayment(b.pid);
    const n = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM refunds WHERE order_id = $1`, [b.orderId]);
    ok("우리 승인 뒤 대행사 웹훅이 와도 장부는 한 줄이다", n?.n === 1, String(n?.n));
  }

  /* 2 — 대행사가 거절하면 아무것도 움직이지 않는다 */
  {
    const b = await buy(s.id);
    await markMockRefundFail(b.pid);
    const end0 = await endOf(b.orderId);
    const r = await requestRefund({ orderNo: b.orderNo, userId: s.id, reason: "changed_mind" });
    const d = await decide({ requestId: r.ok ? r.id : "0", by: admin, action: "approve" });
    ok("대행사가 거절하면 승인이 실패로 돌아온다", !d.ok && !d.refunded, d.reason);
    const rr = await queryOne<{ status: string; provider_error: string | null }>(
      `SELECT status, provider_error FROM refund_requests WHERE id = $1`, [r.ok ? r.id : "0"]);
    ok("요청은 approved 로 남고 까닭이 적힌다", rr?.status === "approved" && !!rr.provider_error, JSON.stringify(rr));
    ok("메일이 나가지 않는다", await mails(b.orderNo) === 0);
    ok("기간이 그대로다", await endOf(b.orderId) === end0);
    const n0 = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM refunds WHERE order_id = $1`, [b.orderId]);
    ok("장부에 적지 않는다", n0?.n === 0);
    const again = await executeRefund(r.ok ? r.id : "0");
    ok("다시 시도하면 끝난다", again.ok && again.refunded === true, JSON.stringify(again));
    ok("그때 메일이 한 통 쌓인다", await mails(b.orderNo) === 1);
    const twice = await executeRefund(r.ok ? r.id : "0");
    const ev = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM payment_events WHERE kind = 'mock_refund'
        AND payload->>'providerPaymentId' = $1`, [b.pid]);
    ok("끝난 요청을 다시 눌러도 대행사에 두 번 보내지 않는다", twice.ok && ev?.n === 1, String(ev?.n));
  }

  /* 3 — 대행사 쪽 부분 취소 · 같은 웹훅 두 번 · 나머지 취소 */
  {
    const b = await buy(s.id);
    const d0 = await daysLeft(b.orderId);
    await markMockCancel(b.pid, 4950, 1);
    const w1 = await settlePayment(b.pid);
    const d1 = await daysLeft(b.orderId);
    ok("부분 취소(절반)가 기간을 절반으로 줄인다", Math.abs(d1 - d0 / 2) < 0.01, `${d0.toFixed(2)} → ${d1.toFixed(2)} (${!w1.ok ? w1.reason : ""})`);
    await settlePayment(b.pid);
    const n1 = await queryOne<{ n: number; s: number }>(
      `SELECT count(*)::int AS n, coalesce(sum(amount),0)::int AS s FROM refunds WHERE order_id = $1`, [b.orderId]);
    ok("같은 웹훅이 다시 와도 한 번만 적는다", n1?.n === 1 && n1.s === 4950, JSON.stringify(n1));
    ok("같은 웹훅이 다시 와도 기간을 또 줄이지 않는다", Math.abs((await daysLeft(b.orderId)) - d1) < 0.001);
    const st0 = await queryOne<{ status: string }>(`SELECT status FROM orders WHERE id = $1`, [b.orderId]);
    ok("부분 취소면 주문은 paid 로 남는다", st0?.status === "paid", st0?.status);
    await markMockCancel(b.pid, 4950, 2);
    await settlePayment(b.pid);
    const st1 = await queryOne<{ status: string }>(`SELECT status FROM orders WHERE id = $1`, [b.orderId]);
    ok("나머지가 취소되면 주문이 닫힌다", st1?.status === "refunded", st1?.status);
    const ps = await queryOne<{ status: string }>(`SELECT status FROM payments WHERE order_id = $1`, [b.orderId]);
    ok("전액 취소 뒤 결제 줄은 cancelled", ps?.status === "cancelled", ps?.status);
    ok("전액 취소면 기간이 지금으로 끊긴다", Date.parse(await endOf(b.orderId)) <= Date.now() + 1000);
    const n2 = await queryOne<{ s: number }>(`SELECT coalesce(sum(amount),0)::int AS s FROM refunds WHERE order_id = $1`, [b.orderId]);
    ok("장부 합이 결제 금액과 같다", n2?.s === 9900, String(n2?.s));
  }

  /* 5 — 끝나는 날이 없는 응시권(결과지 등급)을 대행사가 전액 취소하면, 쓰지 않은 응시권을 회수한다
     (2026-11-06 운영 시험: 취소 뒤 entitlements 가 active 로 남아 유료 검사를 새로 시작할 수 있었다) */
  {
    const orderNo = `ZR${stamp}${++seq}`;
    const o = await queryOne<{ id: string }>(
      `INSERT INTO orders (order_no, user_id, product_code, amount, currency) VALUES ($1,$2,'ME_V2_STANDARD_KR',14900,'KRW') RETURNING id::text`,
      [orderNo, s.id]);
    const pid = `mock_${orderNo}`;
    await markMockPaid({ providerPaymentId: pid, status: "paid", amount: 14900, currency: "KRW", orderNo, raw: {} });
    const s1 = await settlePayment(pid);
    const g0 = await queryOne<{ status: string; ends_at: string | null }>(`SELECT status, ends_at::text FROM entitlements WHERE order_id = $1`, [o!.id]);
    ok("응시권 결제: 끝나는 날 없는 응시권이 선다", s1.ok && g0?.status === "active" && g0.ends_at === null, JSON.stringify(g0));
    await markMockCancel(pid, 14900, 1);
    await settlePayment(pid);
    const g1 = await queryOne<{ status: string; revoked_at: string | null }>(`SELECT status, revoked_at::text FROM entitlements WHERE order_id = $1`, [o!.id]);
    ok("대행사 전액 취소: 쓰지 않은 응시권을 회수한다(revoked · 회수 시각)", g1?.status === "revoked" && !!g1.revoked_at, JSON.stringify(g1));
    const open = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM entitlements WHERE order_id = $1 AND status = 'active'`, [o!.id]);
    ok("회수한 응시권으로는 검사를 시작할 수 없다(열린 응시권 0)", open?.n === 0);
    const pay = await queryOne<{ status: string }>(`SELECT status FROM payments WHERE order_id = $1`, [o!.id]);
    ok("결제 줄도 cancelled 로 적는다", pay?.status === "cancelled", pay?.status);
  }

  await query(`DELETE FROM refund_requests WHERE user_id = $1`, [s.id]).catch(() => undefined);
  console.log(`\n환불 집행 · 대행사 취소 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main().catch((e) => { console.error(e); process.exit(1); });
