/**
 * CareerMatri Track 1단계를 실제 DB 로 한 바퀴 돈다.
 *
 *   npx tsx scripts/lab/track-check.ts
 *
 * 결제(가짜 PG) → 확정 → 기간 한 줄 → 이어 붙이기 → 중복 확정 → 환불(일할)
 * → 뒤 기간 당기기 → PRO 첫 1개월(사람마다 한 번) → 검사 이용권으로 읽히지
 * 않는가. **APP_ENV 가 production 이면 멈춘다**: 시험 계정과 주문을 만든다.
 */
import { query, queryOne } from "../../src/lib/db";
import { appEnv } from "../../src/lib/env";
import { startCheckout, settlePayment } from "../../src/lib/orders";
import { markMockPaid } from "../../src/lib/payments/mock";
import { refundable, recordRefund } from "../../src/lib/refund";
import { activeTrack, proTrialClaimable } from "../../src/lib/track";
import { v3Grants } from "../../src/lib/me-v3/runtime/session";
import { openGrants } from "../../src/lib/me-v2/attempt";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function buy(userId: string, code: string): Promise<{ orderNo: string; orderId: string }> {
  const { order } = await startCheckout(userId, code, "http://127.0.0.1:3100");
  await markMockPaid({
    providerPaymentId: `mock_${order.order_no}`, orderNo: order.order_no,
    status: "paid", amount: order.amount, currency: order.currency, raw: {},
  });
  const r = await settlePayment(`mock_${order.order_no}`);
  if (!r.ok) throw new Error(`확정 실패: ${r.reason}`);
  return { orderNo: order.order_no, orderId: order.id };
}

async function main(): Promise<void> {
  if (appEnv() === "production") { console.error("운영에서는 돌리지 않는다"); process.exit(2); }
  if (process.env.PAYMENTS_PROVIDER && process.env.PAYMENTS_PROVIDER !== "mock") {
    console.error("가짜 PG 로만 돈다 (PAYMENTS_PROVIDER=mock)"); process.exit(2);
  }
  const tag = Date.now().toString(36);
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status, is_demo)
     VALUES ($1, 'Track 시험', 'x', 'active', true) RETURNING id::text`,
    [`track-${tag}@example.com`],
  );
  const uid = u!.id;
  console.log(`\n── Track 1단계 (사용자 ${uid})\n`);

  ok("처음에는 닫혀 있다", !(await activeTrack(uid)).on);

  const a = await buy(uid, "TRACK_30D");
  let t = await activeTrack(uid);
  ok("30일권을 사면 열린다", t.on && t.product === "TRACK_30D");
  const e1 = await queryOne<{ d: number; tier: string | null; av: string | null }>(
    `SELECT round(extract(epoch FROM ends_at - starts_at) / 86400)::int AS d,
            tier, assessment_version AS av
       FROM entitlements WHERE order_id = $1`, [a.orderId]);
  ok("기간이 30일이다", e1?.d === 30, `${e1?.d}일`);
  ok("검사 이용권으로 읽히지 않는다 (tier · assessment_version 이 비어 있다)",
    e1?.tier === null && e1?.av === null);
  ok("V3 · V2 응시 이용권 목록에 서지 않는다",
    (await v3Grants(uid)).length === 0 && (await openGrants(uid)).length === 0);
  const seats = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE order_id = $1`, [a.orderId]);
  ok("좌석을 주지 않는다", seats?.n === 0);

  const again = await settlePayment(`mock_${a.orderNo}`);
  const rows = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM entitlements WHERE order_id = $1`, [a.orderId]);
  ok("같은 결제를 두 번 확정해도 한 줄이다", again.ok && again.alreadyDone && rows?.n === 1);
  ok("확정 결과가 Track 이라고 말한다 (완료 화면이 검사로 보내지 않게)",
    again.ok && again.kind === "track");

  const b = await buy(uid, "TRACK_365D");
  t = await activeTrack(uid);
  const e2 = await queryOne<{ starts: string; first_end: string }>(
    `SELECT (SELECT starts_at::text FROM entitlements WHERE order_id = $2) AS starts,
            (SELECT ends_at::text FROM entitlements WHERE order_id = $1) AS first_end`,
    [a.orderId, b.orderId]);
  ok("365일권은 30일권이 끝나는 날에서 이어 붙는다",
    e2?.starts === e2?.first_end, `${e2?.starts}`);
  ok("열려 있는 날이 두 기간을 더한 끝이다", t.on && t.queued);

  /* 미리 산 365일권만 환불하면 일할이 낸 돈을 넘지 않는다 */
  const vb = await refundable(b.orderId);
  ok("시작 전인 이어 붙인 기간은 낸 돈만큼만 돌려준다",
    vb.ok && vb.amount <= 39000 && vb.amount >= 38900, vb.ok ? `${vb.amount}원` : String(vb.deny));

  /* 앞의 30일권을 환불하면 뒤 365일권이 당겨진다 */
  const va = await recordRefund(a.orderId);
  ok("30일권 환불이 된다 (일할)", va.ok, va.ok ? `${va.amount}원` : String(va.deny));
  const after = await queryOne<{ s: string; live: boolean }>(
    `SELECT starts_at::text AS s, starts_at <= now() + interval '5 seconds' AS live
       FROM entitlements WHERE order_id = $1`, [b.orderId]);
  t = await activeTrack(uid);
  ok("뒤 기간이 당겨져 빈 달이 생기지 않는다", !!after?.live && t.on && t.product === "TRACK_365D",
    after?.s);

  /* PRO 첫 1개월: 사람마다 한 번 */
  const pro = await queryOne<{ code: string }>(
    `SELECT code FROM products WHERE active AND tier = 'PRO' AND amount > 0
        AND market = 'KR' AND assessment_version = 'ME_V2' LIMIT 1`);
  if (pro) {
    const u2 = await queryOne<{ id: string }>(
      `INSERT INTO users (email, display_name, password_hash, status, is_demo)
       VALUES ($1, 'Track 시험 PRO', 'x', 'active', true) RETURNING id::text`,
      [`track-pro-${tag}@example.com`]);
    await buy(u2!.id, pro.code);
    const tt = await activeTrack(u2!.id);
    ok("PRO 결과지를 사면 첫 1개월이 열린다", tt.on && tt.product === "TRACK_PRO_TRIAL");
    await buy(u2!.id, pro.code);
    const n = await queryOne<{ n: number }>(
      `SELECT count(*)::int AS n FROM entitlements
        WHERE user_id = $1 AND product_code = 'TRACK_PRO_TRIAL'`, [u2!.id]);
    ok("PRO 를 두 번 사도 첫 1개월은 한 번이다", n?.n === 1);
    ok("받은 뒤에는 받기 단추가 서지 않는다", !(await proTrialClaimable(u2!.id)));
  } else {
    ok("PRO 상품이 있다 (첫 1개월 확인)", false, "active PRO 상품 없음");
  }

  await query(`UPDATE users SET status = 'active' WHERE id = $1`, [uid]);
  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}\n`);
  process.exit(fail ? 1 : 0);
}
void main().catch((e) => { console.error(e); process.exit(1); });
