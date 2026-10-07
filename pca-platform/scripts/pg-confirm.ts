/**
 * 사람이 한 건 결제한 **그 뒤**를 센다.
 *
 * 카드를 긁는 것은 사람이 브라우저에서 하고, 이 명령은 그 결제가 우리
 * 장부에 제대로 앉았는지 본다. **스크립트가 승인을 내지 않는다**: 결제를
 * 만드는 코드를 두면 그 코드가 언젠가 운영에서 돌아간다.
 *
 * 보는 것이 넷이다.
 *
 *   1. 대행사가 '승인' 이라고 하는가      실제 조회
 *   2. 우리 주문이 확정되고 이용권이 생기는가
 *   3. **두 번 불러도 한 번만 적히는가**  웹훅과 리다이렉트가 겹친다
 *   4. 되돌릴 수 있는가                   `--환불` 을 줄 때만
 *
 *   npm run pg:confirm -- <주문번호>
 *   npm run pg:confirm -- <주문번호> --환불
 */
import { query, queryOne } from "../src/lib/db";
import { settlePayment } from "../src/lib/orders";
import { paymentProvider } from "../src/lib/payments";
import { refundable, recordRefund } from "../src/lib/refund";

type Order = {
  id: string; order_no: string; product_code: string;
  amount: number; currency: string; status: string; paid_at: string | null;
};

async function rows(orderId: string, orderNo: string) {
  const pay = await query<{ provider: string; status: string; amount: number }>(
    `SELECT provider, status, amount FROM payments WHERE order_id = $1`, [orderId]);
  const ent = await query<{ id: string; tier: string; status: string }>(
    `SELECT id::text, tier, status FROM entitlements WHERE order_id = $1`, [orderId]);
  const seat = await query<{ id: string; status: string }>(
    `SELECT id::text, status FROM seats WHERE order_id = $1`, [orderId]);
  const out = await query<{ kind: string; status: string }>(
    `SELECT kind, status FROM outbox WHERE payload::text LIKE $1`, [`%${orderNo}%`])
    .catch(() => []);
  return { pay, ent, seat, out };
}

async function main() {
  const args = process.argv.slice(2);
  const orderNo = args.find((a) => !a.startsWith("--"));
  const doRefund = args.includes("--환불") || args.includes("--refund");
  if (!orderNo) {
    console.log("주문번호를 주십시오.  예: npm run pg:confirm -- M3ABC12345");
    process.exit(1);
  }

  const order = await queryOne<Order>(
    `SELECT id::text, order_no, product_code, amount, currency, status, paid_at::text
       FROM orders WHERE order_no = $1`, [orderNo]);
  if (!order) {
    console.log(`주문 ${orderNo} 를 찾을 수 없습니다.`);
    process.exit(1);
  }
  console.log(`주문 ${order.order_no} · ${order.product_code} · ` +
    `${order.amount} ${order.currency} · ${order.status}`);

  /**
   * 대행사가 부르는 결제 번호.
   *
   * PortOne 은 주문번호를 그대로 결제 번호로 쓰고(`createCheckout`),
   * 가짜 PG 는 앞에 `mock_` 을 붙인다. **여기서 둘을 섞으면** 멀쩡히
   * 결제된 주문이 '아직 승인 전' 으로 보인다.
   */
  const payId = paymentProvider().name === "mock"
    ? `mock_${order.order_no}` : order.order_no;

  /* ── 1·2. 확정 ────────────────────────────────────────────────── */
  const first = await settlePayment(payId);
  console.log(first.ok
    ? `  확정: ok${first.alreadyDone ? " (이미 확정돼 있었다)" : ""}`
    : `  확정 실패: ${first.reason}`);
  if (!first.ok) {
    console.log("\n대행사가 아직 '승인' 으로 보지 않습니다. 결제 화면을 끝까지 " +
      "누르셨는지, 주문번호가 맞는지 보십시오.");
    process.exit(1);
  }

  const a = await rows(order.id, order.order_no);
  console.log(`  결제 줄 ${a.pay.length} · 이용권 ${a.ent.length} · ` +
    `좌석 ${a.seat.length} · 메일 ${a.out.length}`);
  for (const e of a.ent) console.log(`    이용권 ${e.id} · ${e.tier} · ${e.status}`);
  for (const o of a.out) console.log(`    메일 ${o.kind} · ${o.status}`);

  /* ── 3. 두 번 불러도 한 번 ────────────────────────────────────── */
  const second = await settlePayment(payId);
  const b = await rows(order.id, order.order_no);
  const same = a.pay.length === b.pay.length && a.ent.length === b.ent.length
    && a.seat.length === b.seat.length;
  console.log(`  두 번째 확정: ${second.ok ? "ok" : second.reason} · ` +
    `줄이 늘지 않았다: ${same ? "그렇다" : "아니다"}`);
  if (!same) {
    console.log("\n**같은 결제가 두 벌 앉았습니다.** 웹훅과 리다이렉트가 겹치는 " +
      "날 이용권이 두 개 나갑니다. 여기서 멈추십시오.");
    process.exit(1);
  }

  /* ── 4. 되돌리기 ──────────────────────────────────────────────── */
  if (!doRefund) {
    console.log("\n되돌리기까지 보시려면 뒤에 --환불 을 붙여 다시 돌리십시오.");
    process.exit(0);
  }

  const v = await refundable(order.id);
  if (!v.ok) {
    console.log(`  환불 판정: 안 됩니다 (${v.deny})`);
    process.exit(0);
  }
  console.log(`  환불 판정: ${v.amount} ${order.currency} (${v.reason})`);

  const pid = (await queryOne<{ provider_payment_id: string }>(
    `SELECT provider_payment_id FROM payments WHERE order_id = $1 LIMIT 1`,
    [order.id]))?.provider_payment_id ?? order.order_no;

  /* **집행은 대행사가 하고 기록은 우리가 한다.** 둘을 한 함수에 두면
     송금이 실패한 날 장부에만 환불이 적힌다 */
  const res = await paymentProvider().refundPayment!({
    providerPaymentId: pid, amount: v.amount, reason: "내부 확인용 결제 되돌리기",
  });
  console.log(res.ok
    ? `  대행사 환불: ok (${res.amount})`
    : `  대행사 환불 실패: ${res.reason}`);
  if (!res.ok) process.exit(1);

  const rec = await recordRefund(order.id, { note: "pg smoke" });
  const after = await queryOne<{ status: string }>(
    `SELECT status FROM orders WHERE id = $1`, [order.id]);
  console.log(`  장부: ${rec.ok ? "적었다" : `안 적었다 (${rec.deny})`} · ` +
    `주문 상태 ${after?.status}`);
  process.exit(rec.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
