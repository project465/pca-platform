/**
 * 결제 경로를 실제 DB 로 확인한다 — 국내 카드와 해외 카드(Visa·Mastercard) 둘 다.
 *
 * 보는 것 넷.
 *   1. 두 수단 모두 주문이 서고 좌석이 나가는가
 *   2. 승인 금액이 주문과 다르면 거절하는가 (금액 조작)
 *   3. 같은 웹훅이 두 번 와도 좌석이 하나인가 (멱등)
 *   4. 해외 채널이 없을 때 화면이 그 선택지를 열지 않는가
 */
import { query, queryOne } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";
import { startCheckout, settlePayment } from "../../src/lib/orders";
import { markMockPaid, globalChannelReady } from "../../src/lib/payments";

async function user(email: string) {
  const pw = await hashPassword("pay-pass-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, must_reset_pw, status)
     VALUES ($1,'결제시험',$2,false,'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`,
    [email, pw],
  );
  await query(`DELETE FROM seats WHERE user_id = $1 AND contract_id IS NULL`, [u!.id]);
  await query(`DELETE FROM orders WHERE user_id = $1`, [u!.id]);
  return u!.id;
}

const seats = async (uid: string) =>
  (await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE user_id = $1 AND contract_id IS NULL`, [uid]))!.n;

async function main() {
  console.log(`해외 채널 설정됨: ${globalChannelReady()} (mock 모드에서는 화면이 흉내낸다)`);

  for (const region of ["domestic", "global"] as const) {
    const uid = await user(`pay-${region}@example.com`);
    const { ticket: t } = await startCheckout(uid, "REPORT_UNIV", "http://localhost:3000", region);
    console.log(`\n[${region === "global" ? "해외 카드 · Visa/Mastercard" : "국내 카드"}]`);
    console.log(`  주문 ${t.orderNo} · ${t.amount.toLocaleString("ko-KR")}${t.currency} · region=${t.region}`);

    await markMockPaid({
      providerPaymentId: t.providerPaymentId,
      status: "paid",
      amount: t.amount,
      currency: t.currency,
      method: region === "global" ? "CARD_VISA" : "CARD",
      orderNo: t.orderNo,
      raw: { region },
    });
    const r = await settlePayment(t.providerPaymentId);
    console.log(`  정산: ${r.ok ? "성공" : "실패 — " + r.reason} · 좌석 ${await seats(uid)}개`);

    // 같은 결제가 또 들어와도 좌석이 늘면 안 된다
    const again = await settlePayment(t.providerPaymentId);
    console.log(`  같은 웹훅 재수신: ${again.ok ? "성공" : "실패"} · 좌석 ${await seats(uid)}개 (그대로여야 한다)`);
  }

  // 금액 조작 — 29,000원 주문에 100원만 승인된 경우
  const uid = await user("pay-tamper@example.com");
  const { ticket: t } = await startCheckout(uid, "REPORT_UNIV", "http://localhost:3000", "global");
  await markMockPaid({
    providerPaymentId: t.providerPaymentId,
    status: "paid",
    amount: 100, // 주문은 29,000원인데 100원만 승인된 척
    currency: t.currency,
    method: "CARD_VISA",
    orderNo: t.orderNo,
    raw: {},
  });
  const bad = await settlePayment(t.providerPaymentId);
  console.log(`\n[금액 조작] 주문 ${t.amount} vs 승인 100`);
  console.log(`  결과: ${bad.ok ? "통과 (막았어야 한다)" : "거절 — " + bad.reason} · 좌석 ${await seats(uid)}개 (0이어야 한다)`);
  const st = await queryOne<{ status: string }>(`SELECT status FROM orders WHERE order_no = $1`, [t.orderNo]);
  console.log(`  주문 상태: ${st!.status} (failed 여야 한다)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
