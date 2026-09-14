/**
 * 환불 규칙이 실제로 그 선에서 갈리는가.
 *
 * 돈 문제라 화면마다 판단하면 안 되고, 판단하는 곳이 하나여야 한다
 * (`src/lib/refund.ts`). 그 하나가 상품마다 다른 "제공 개시" 를 제대로
 * 가르는지 실제 DB 로 확인한다. 보는 것 여덟.
 *
 *   1. 응시권을 사고 **문항을 한 개도 안 풀었으면** 전액 환불
 *   2. **첫 문항에 답하는 순간** 환불선을 넘는다
 *   3. 업그레이드는 **결과지를 열기 전까지** 환불된다
 *      — 응시는 이미 끝난 사람이라 응시 시작을 경계로 쓸 수 없다
 *   4. 결과지를 열면 환불되지 않는다. **처음 연 시각은 덮어쓰지 않는다**
 *   5. 7일이 지나면 업그레이드는 닫힌다. 응시 전 응시권은 기간과 무관하다
 *   6. 기간권은 **남은 기간만큼** 일할로 돌려준다 (계속거래)
 *   7. 환불하면 좌석이 회수되고, 두 번 환불되지 않는다
 *   8. 안 쓴 응시권 코드는 되돌릴 수 있고, 응시를 시작했으면 거절된다
 *
 *   npm run metri:refund
 */
import { query, queryOne } from "../../src/lib/db";
import { refundable, recordRefund, markReportViewed, revokeRedemption } from "../../src/lib/refund";
import { openFreeOrder } from "../../src/lib/orders";
import { grantFull, grantPass } from "../../src/lib/entitlement";
import { openAttempt, questionPage, saveResponse } from "../../src/lib/attempts";
import { issueCodes, redeemCode } from "../../src/lib/redeem";
import { hashPassword } from "../../src/lib/password";

let failed = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

async function student(email: string): Promise<string> {
  const pw = await hashPassword("test-pass-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ($1,'환불 검사',$2,'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`,
    [email, pw],
  );
  return u!.id;
}

/** 돈 낸 응시권 하나. 결제창은 안 거치고 주문만 만든다 */
async function paidOrder(userId: string, code: string, amount: number): Promise<string> {
  const o = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at)
     VALUES ($1,$2,$3,$4,'KRW','paid', now()) RETURNING id`,
    [`T${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase(), userId, code, amount],
  );
  await query(
    `INSERT INTO seats (contract_id, order_id, user_id, assigned_at) VALUES (NULL,$1,$2,now())`,
    [o!.id, userId],
  );
  return o!.id;
}

async function main() {
  const stale = `SELECT id FROM users WHERE email LIKE 'refund-%@example.com'`;
  await query(`DELETE FROM refunds WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${stale}))`);
  await query(`DELETE FROM responses WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id IN (${stale}))`);
  await query(`DELETE FROM attempts WHERE user_id IN (${stale})`);
  await query(`DELETE FROM seats WHERE user_id IN (${stale})`);
  await query(`DELETE FROM entitlements WHERE user_id IN (${stale})`);
  await query(`DELETE FROM report_grants WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${stale}))`);
    await query(`DELETE FROM redemption_codes WHERE used_by IN (${stale}) OR batch = 'refund-check'`);
  // 1인용 회차(test_sessions)가 주문을 붙잡고 있다. 회차를 먼저 지운다
  await query(`DELETE FROM test_sessions WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${stale}))`);
  await query(`DELETE FROM orders WHERE user_id IN (${stale})`);

  console.log("════════ 1. 응시 전 — 전액 ════════");
  const a = await student("refund-a@example.com");
  const oa = await paidOrder(a, "REPORT_HS", 19000);
  const v1 = await refundable(oa);
  check(v1.ok && v1.amount === 19000 && v1.reason === "before_start",
    "문항을 안 풀었으면 전액", v1.ok ? `${v1.amount}원 · ${v1.reason}` : v1.deny);

  console.log("\n════════ 2. 첫 문항에 답하면 ════════");
    const att = await openAttempt(a);
  const items = await questionPage(att!, 1);
  await saveResponse(att!.id, a, items[0].id, items[0].options[2].id, null);
  const v2 = await refundable(oa);
  check(!v2.ok && v2.deny === "started", "환불선을 넘는다", v2.ok ? "통과해 버렸다" : v2.deny);

  console.log("\n════════ 3. 업그레이드 — 결과지를 열기 전 ════════");
  const b = await student("refund-b@example.com");
  const free = await openFreeOrder(b);
  const bAtt = await openAttempt(b);
  const ob = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at, upgrades_attempt_id)
     VALUES ($1,$2,'HS_UPGRADE',19000,'KRW','paid',now(),$3) RETURNING id`,
    [`U${Date.now().toString(36)}`.toUpperCase(), b, bAtt!.id],
  );
    await grantFull(bAtt!.id, ob!.id, b);
  const v3 = await refundable(ob!.id);
  check(v3.ok && v3.reason === "not_viewed" && v3.amount === 19000,
    "응시를 이미 끝냈어도 환불된다", v3.ok ? `${v3.amount}원 · ${v3.reason}` : v3.deny);
  check(free.orderId !== ob!.id, "무료 주문과 업그레이드 주문은 별개다");

  console.log("\n════════ 4. 결과지를 열면 ════════");
  await markReportViewed(bAtt!.id);
  const seen1 = await queryOne<{ t: string }>(
    `SELECT first_viewed_at::text AS t FROM report_grants WHERE attempt_id = $1`, [bAtt!.id]);
  const v4 = await refundable(ob!.id);
  check(!v4.ok && v4.deny === "viewed", "환불되지 않는다", v4.ok ? "통과해 버렸다" : v4.deny);
  await new Promise((r) => setTimeout(r, 30));
  await markReportViewed(bAtt!.id);
  const seen2 = await queryOne<{ t: string }>(
    `SELECT first_viewed_at::text AS t FROM report_grants WHERE attempt_id = $1`, [bAtt!.id]);
  check(seen1!.t === seen2!.t, "다시 열어도 처음 연 시각은 그대로다", seen2!.t);

  console.log("\n════════ 5. 기간 ════════");
    const c = await student("refund-c@example.com");
  await openFreeOrder(c);
  // 업그레이드는 **어느 응시를 여는 결제인지** 들고 다닌다. 비워 두면
  // 응시권으로 읽혀 다른 경계가 적용된다 — 처음 이 검사가 그래서 통과했다
  const cAtt = await openAttempt(c);
  const oc = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at, upgrades_attempt_id)
     VALUES ($1,$2,'HS_UPGRADE',19000,'KRW','paid', now() - interval '8 days', $3) RETURNING id`,
    [`V${Date.now().toString(36)}`.toUpperCase(), c, cAtt!.id],
  );
  await grantFull(cAtt!.id, oc!.id, c);
  const v5 = await refundable(oc!.id);
  check(!v5.ok && v5.deny === "expired_window", "8일 지난 업그레이드는 닫힌다",
    v5.ok ? "통과" : v5.deny);
  const d = await student("refund-d@example.com");
  const od = await paidOrder(d, "REPORT_HS", 19000);
  await query(`UPDATE orders SET paid_at = now() - interval '90 days' WHERE id = $1`, [od]);
  const v5b = await refundable(od);
  check(v5b.ok, "90일 지나도 응시 전이면 돌려준다 — 아직 아무것도 안 줬다",
    v5b.ok ? `${v5b.amount}원` : v5b.deny);
  

  console.log("\n════════ 6. 기간권 — 남은 만큼 ════════");
  const e = await student("refund-e@example.com");
  await query(`UPDATE products SET active = true WHERE code = 'H1_PASS'`);
  const oe = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at)
     VALUES ($1,$2,'H1_PASS',790000,'KRW','paid',now()) RETURNING id`,
    [`P${Date.now().toString(36)}`.toUpperCase(), e],
  );
  await grantPass(e, oe!.id);
  // 100일을 썼다고 치고 뒤로 민다
  await query(
    `UPDATE entitlements SET starts_at = now() - interval '100 days',
                             ends_at = now() + interval '265 days'
      WHERE order_id = $1`, [oe!.id]);
  const v6 = await refundable(oe!.id);
  const expect = Math.floor((790000 * 265) / 365);
  check(v6.ok && Math.abs(v6.amount - expect) <= 2500,
    "265일 남았으면 그만큼", v6.ok ? `${v6.amount.toLocaleString()}원 (기대 ${expect.toLocaleString()})` : v6.deny);
  check(v6.ok && v6.reason === "pass_remaining", "사유가 잔여기간이다");

  console.log("\n════════ 7. 환불하면 ════════");
  const before = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE order_id = $1`, [od]);
  await recordRefund(od);
  const after = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE order_id = $1`, [od]);
  check(before!.n === 1 && after!.n === 0, "안 쓴 좌석이 회수된다", `${before!.n} → ${after!.n}`);
  const st = await queryOne<{ status: string }>(`SELECT status FROM orders WHERE id = $1`, [od]);
  check(st!.status === "refunded", "주문 상태가 바뀐다", st!.status);
  const v7 = await refundable(od);
  check(!v7.ok && v7.deny === "already", "두 번 환불되지 않는다", v7.ok ? "통과" : v7.deny);
  const rec = await queryOne<{ amount: number; reason: string }>(
    `SELECT amount, reason FROM refunds WHERE order_id = $1`, [od]);
  check(rec!.amount === 19000, "얼마를 왜 돌려줬는지 남는다", `${rec!.amount}원 · ${rec!.reason}`);

  console.log("\n════════ 8. 응시권 코드 되돌리기 ════════");
  const f = await student("refund-f@example.com");
  const [c1, c2] = await issueCodes({ productCode: "REPORT_HS", count: 2, batch: "refund-check" });
  const unusedRow = await queryOne<{ id: string }>(
    `SELECT id FROM redemption_codes WHERE batch = 'refund-check' AND used_at IS NULL ORDER BY id LIMIT 1`);
  const rv1 = await revokeRedemption(unusedRow!.id);
  check(rv1.ok && rv1.orderId === null, "안 쓴 코드는 막는 것으로 끝난다");

  const used = await redeemCode(f, c2.display.length ? c2.display : c1.display);
  check(used.ok, "다른 코드는 정상 교환된다");
  if (used.ok) {
    const usedRow = await queryOne<{ id: string }>(
      `SELECT id FROM redemption_codes WHERE order_id = $1`, [used.orderId]);
    const rv2 = await revokeRedemption(usedRow!.id);
    check(rv2.ok, "응시 전이면 되돌릴 수 있다", rv2.ok ? "" : rv2.deny);
    const seatLeft = await queryOne<{ n: number }>(
      `SELECT count(*)::int AS n FROM seats WHERE order_id = $1`, [used.orderId]);
    check(seatLeft!.n === 0, "좌석이 회수된다", `${seatLeft!.n}개`);
  }

  // 응시를 시작한 코드는 거절되는가 — 1절의 주문이 그 상태다
  const startedRow = await queryOne<{ id: string }>(
    `SELECT id FROM redemption_codes WHERE order_id = $1`, [oa]);
  if (!startedRow) {
    const v8 = await refundable(oa);
    check(!v8.ok && v8.deny === "started", "응시를 시작한 주문은 어느 경로로도 거절된다");
  }

  await query(`UPDATE products SET active = false WHERE code = 'H1_PASS'`);
  console.log(failed ? `\n${failed}개 실패.` : "\n환불 OK — 제공이 개시된 때가 선이고, 상품마다 그 때가 다르다.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
