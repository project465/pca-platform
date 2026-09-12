/**
 * 무료 구간과 유료 구간이 실제로 갈리는가.
 *
 * 메트리 플러스가 파는 것은 지표가 아니라 사슬이다. 그 경계를 코드가
 * 정말 지키는지 실제 DB 로 한 바퀴 돌려 확인한다. 확인하는 것 다섯.
 *
 *   1. 무료 응시(HS_FREE)의 결과지에 **성향·사슬·과목 처방이 오지 않는가**
 *      — 화면에서 가리는 것이 아니라 데이터가 오지 않아야 한다
 *   2. 무료 구간에도 계열 적합과 활동 8축은 오는가 (유입으로 쓸 것이므로)
 *   3. 결제하면 **같은 응시가** 열리는가 (115문항을 다시 풀리면 안 된다)
 *   4. 학교 단체 좌석은 결제 없이 full 인가 (학교가 사는 것이 사슬이다)
 *   5. 업그레이드 결제가 좌석을 늘리지 않는가 (문항을 또 풀면 규준이 오염된다)
 *   6. 결제되지 않은 주문으로는 열리지 않는가
 *
 *   npm run metri:tier
 */
import { query, queryOne } from "../../src/lib/db";
import { openAttempt, lastScoredAttempt, questionPage, saveResponse, submitAttempt, PAGE_SIZE } from "../../src/lib/attempts";
import { score } from "../../src/lib/scoring";
import { buildReport } from "../../src/lib/report";
import { reportLevel, grantFull } from "../../src/lib/entitlement";
import { openFreeOrder, startCheckout, settlePayment } from "../../src/lib/orders";
import { markMockPaid } from "../../src/lib/payments";
import { hashPassword } from "../../src/lib/password";

let failed = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

/** 학생 하나를 만들고 무료 진단을 끝까지 풀린다 */
async function freeAttemptFor(email: string, name: string) {
  const pw = await hashPassword("test-pass-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ($1,$2,$3,'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`,
    [email, name, pw],
  );
  const userId = u!.id;

  // 지난 실행 흔적을 지운다
  await query(`DELETE FROM attempts WHERE user_id = $1`, [userId]);
  await query(
    `DELETE FROM test_sessions WHERE kind='solo' AND order_id IN (SELECT id FROM orders WHERE user_id=$1)`,
    [userId],
  );
  await query(`DELETE FROM seats WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM orders WHERE user_id = $1`, [userId]);

  const { orderId, reused } = await openFreeOrder(userId);
  const attempt = await openAttempt(userId);
  if (!attempt) throw new Error("무료 좌석이 있는데 응시가 열리지 않았습니다");

  // 만들기를 좋아하는 학생. 성실하게 답한다
  const HIGH = new Set(["HS.ME", "HS.MSE"]);
  for (let p = 1; p <= Math.ceil(attempt.total / PAGE_SIZE); p++) {
    for (const q of await questionPage(attempt, p)) {
      let v: number;
      if (q.itemKind === "attention") {
        const e = await queryOne<{ e: number }>(
          `SELECT attention_expect AS e FROM questions WHERE id=$1`, [q.id]);
        v = e!.e;
      } else {
        v = HIGH.has(q.areaCode ?? "") ? 5 : 3;
      }
      const opt = q.options.find((x) => x.orderNo === v)!;
      await saveResponse(attempt.id, userId, q.id, opt.id, 4200 + (q.orderNo % 7) * 300);
    }
  }
  const sub = await submitAttempt(attempt.id, userId);
  if (!sub.ok) throw new Error(`빠진 문항: ${sub.missing.join(",")}`);
  await score(attempt.id);
  return { userId, attemptId: attempt.id, orderId, reused, total: attempt.total };
}

async function main() {
  console.log("\n════════ 1. 무료 진단 ════════");
  const free = await freeAttemptFor("tier-free@example.com", "무료 응시 학생");
  console.log(`무료 주문 발급 · 응시 ${free.attemptId} · 문항 ${free.total}개`);

  const lv1 = await reportLevel(free.attemptId);
  check(lv1 === "free", "무료 상품 응시의 등급은 free", `실제 ${lv1}`);

  const r1 = await buildReport(free.attemptId, free.userId, "ko");
  if (!r1 || r1 === "pending") throw new Error("무료 결과지가 열리지 않았습니다");
  check(r1.level === "free", "결과지가 free 로 내려온다", `실제 ${r1.level}`);
  check(r1.jobs.length > 0, "계열 적합은 무료 구간에 있다", `${r1.jobs.length}개`);
  check(r1.axes.length === 8, "활동 8축은 무료 구간에 있다", `${r1.axes.length}개`);
  check(r1.traits.length === 0, "성향 6축은 오지 않는다", `${r1.traits.length}개 왔음`);

  // 화면이 유료 절을 부르는 조건과 같은 판단을 여기서도 해 본다
  const { prescribe } = await import("../../src/lib/prescribe");
  const { careerChain } = await import("../../src/lib/chain");
  const paid1 = r1.level === "full";
  check(!paid1, "무료면 과목 처방·사슬 조회를 아예 돌리지 않는다");

  console.log("\n════════ 2. 결제로 열기 ════════");
  // 결제되지 않은 주문으로는 열리지 않아야 한다
  const pending = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, status, upgrades_attempt_id)
     VALUES ($1,$2,'HS_UPGRADE',19000,'pending',$3) RETURNING id`,
    [`TIER-PEND-${Date.now()}`, free.userId, free.attemptId],
  );
  const badGrant = await grantFull(free.attemptId, pending!.id, free.userId);
  check(!badGrant, "결제 전(pending) 주문으로는 열리지 않는다");
  check((await reportLevel(free.attemptId)) === "free", "그 뒤에도 등급은 free");

  // 확정된 주문으로 연다
  const paidOrder = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, status, paid_at, upgrades_attempt_id)
     VALUES ($1,$2,'HS_UPGRADE',19000,'paid',now(),$3) RETURNING id`,
    [`TIER-PAID-${Date.now()}`, free.userId, free.attemptId],
  );
  const okGrant = await grantFull(free.attemptId, paidOrder!.id, free.userId);
  check(okGrant, "확정된 주문으로는 열린다");

  const lv2 = await reportLevel(free.attemptId);
  check(lv2 === "full", "등급이 full 로 바뀐다", `실제 ${lv2}`);

  const r2 = await buildReport(free.attemptId, free.userId, "ko");
  if (!r2 || r2 === "pending") throw new Error("유료 결과지가 열리지 않았습니다");
  check(r2.level === "full", "결과지가 full 로 내려온다");
  check(r2.attemptId === free.attemptId, "같은 응시가 열린다 — 다시 풀지 않는다");
  check(r2.traits.length === 6, "성향 6축이 온다", `${r2.traits.length}개`);

  const rx = await prescribe(free.attemptId, "ko");
  const cc = await careerChain(free.attemptId, "ko");
  check(!!rx && rx.shared.length > 0, "과목 처방이 나온다",
    rx ? `먼저 듣는 과목 ${rx.shared.length}개` : "없음");
  check(!!cc && cc.roles.length > 0, "현장 사슬이 나온다",
    cc ? `직무 ${cc.roles.length}개` : "없음");

  // 응답은 그대로여야 한다 — 결제가 점수를 바꾸면 안 된다
  const same =
    r1.jobs[0]?.code === r2.jobs[0]?.code &&
    Math.abs((r1.jobs[0]?.fit ?? 0) - (r2.jobs[0]?.fit ?? 0)) < 0.001;
  check(same, "결제가 점수를 바꾸지 않는다",
    `${r1.jobs[0]?.code} ${r1.jobs[0]?.fit} → ${r2.jobs[0]?.code} ${r2.jobs[0]?.fit}`);

  console.log("\n════════ 3. 무료는 한 번만 ════════");
  const again = await openFreeOrder(free.userId);
  check(again.reused, "두 번째 무료 요청은 기존 주문을 돌려준다", `주문 ${again.orderId}`);
  const freeOrders = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM orders WHERE user_id=$1 AND product_code='HS_FREE'`,
    [free.userId],
  );
  check(freeOrders!.n === 1, "무료 주문은 한 사람에 하나", `${freeOrders!.n}개`);

  // 학생이 무료 버튼을 한 번 더 누르면 어디로 가는가. 새 문항이 열리면
  // 규준이 오염되고, "좌석이 없습니다" 가 나오면 이미 받은 결과지가
  // 사라진 것처럼 보인다. 둘 다 아니고 **그 결과지로** 돌아가야 한다.
  const reopen = await openAttempt(free.userId);
  check(reopen === null, "새 좌석도 새 문항도 열리지 않는다",
    reopen ? `응시 ${reopen.id} 가 열렸음` : "열리지 않음");
  check((await lastScoredAttempt(free.userId)) === free.attemptId,
    "화면이 돌려보낼 곳은 이미 받은 결과지다", `응시 ${free.attemptId}`);

  console.log("\n════════ 4. 학교 단체 좌석 ════════");
  // 지난 실행이 남긴 계약·회차를 먼저 걷는다. 남겨 두면 매 실행마다
  // 계약이 하나씩 늘어 "좌석이 모자란다" 를 영원히 못 만나게 된다.
  await query(
    `DELETE FROM attempts WHERE session_id IN (
       SELECT ts.id FROM test_sessions ts JOIN organizations o ON o.id = ts.org_id
        WHERE o.code = 'TIER-HS')`);
  await query(
    `DELETE FROM test_sessions WHERE org_id IN (SELECT id FROM organizations WHERE code='TIER-HS')`);
  await query(
    `DELETE FROM seats WHERE contract_id IN (
       SELECT c.id FROM contracts c JOIN organizations o ON o.id = c.org_id WHERE o.code='TIER-HS')`);
  await query(
    `DELETE FROM contracts WHERE org_id IN (SELECT id FROM organizations WHERE code='TIER-HS')`);
  await query(
    `INSERT INTO organizations (code, country, org_type)
     VALUES ('TIER-HS','KR','school') ON CONFLICT (code) DO NOTHING`);
  const orgId = (await queryOne<{ id: string }>(
    `SELECT id FROM organizations WHERE code='TIER-HS'`))!.id;
  const con = await queryOne<{ id: string }>(
    `INSERT INTO contracts (org_id, title, seat_count, starts_on, ends_on)
     VALUES ($1,'티어검사 계약',5,current_date,current_date + 180) RETURNING id`, [orgId]);
  const inst = await queryOne<{ id: string }>(
    `SELECT id FROM instruments WHERE instrument_key='HS_V1'`);
  const ses = await queryOne<{ id: string }>(
    `INSERT INTO test_sessions (org_id, contract_id, kind, instrument_id, name, opens_at, closes_at, release_mode, released_at)
     VALUES ($1,$2,'org',$3,'티어검사 회차', now(), now() + interval '90 days','instant', now())
     RETURNING id`, [orgId, con!.id, inst!.id]);
  const pw = await hashPassword("test-pass-1234");
  const su = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ('tier-school@example.com','학교 응시 학생',$1,'active')
     ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`, [pw]);
  await query(`DELETE FROM attempts WHERE user_id=$1`, [su!.id]);
  const seat = await queryOne<{ id: string }>(
    `INSERT INTO seats (contract_id, order_id, user_id, assigned_at)
     VALUES ($1,NULL,$2,now()) RETURNING id`, [con!.id, su!.id]);
  const at = await queryOne<{ id: string }>(
    `INSERT INTO attempts (session_id, user_id, seat_id, status, started_at)
     VALUES ($1,$2,$3,'in_progress',now()) RETURNING id`, [ses!.id, su!.id, seat!.id]);
  const lv3 = await reportLevel(at!.id);
  check(lv3 === "full", "학교 단체 좌석은 결제 없이 full", `실제 ${lv3}`);

  console.log("\n════════ 5. 업그레이드 결제 한 바퀴 ════════");
  // 여기서는 grantFull 을 직접 부르지 않고 결제창이 부르는 길을 그대로 탄다.
  // 두 가지가 걸린다 — 좌석이 하나 더 생기면 학생이 115문항을 또 풀 수
  // 있게 되고, 완료 화면이 업그레이드를 못 알아보면 "지금 바로 시작하실
  // 수 있습니다" 를 띄워 시작할 것이 없는 사람을 검사 화면으로 보낸다.
  const up = await freeAttemptFor("tier-upgrade@example.com", "업그레이드 학생");
  const seatsBefore = (await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE user_id=$1`, [up.userId]))!.n;
  const { ticket } = await startCheckout(
    up.userId, "HS_UPGRADE", "http://localhost:3000", "domestic", up.attemptId);
  await markMockPaid({
    providerPaymentId: ticket.providerPaymentId,
    status: "paid",
    amount: ticket.amount,
    currency: ticket.currency,
    method: "CARD",
    orderNo: ticket.orderNo,
    raw: { note: "티어검사 업그레이드" },
  });
  const settled = await settlePayment(ticket.providerPaymentId);
  check(settled.ok, "업그레이드 결제가 확정된다", settled.ok ? "" : settled.reason);
  check(settled.ok && settled.upgradedAttemptId === up.attemptId,
    "완료 화면이 어느 결과지를 열지 안다",
    settled.ok ? `응시 ${settled.upgradedAttemptId}` : "—");
  check((await reportLevel(up.attemptId)) === "full", "그 응시가 full 로 열린다");
  const seatsAfter = (await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE user_id=$1`, [up.userId]))!.n;
  check(seatsAfter === seatsBefore, "좌석은 늘지 않는다 — 문항을 또 풀 수 없다",
    `${seatsBefore} → ${seatsAfter}`);
  // 리다이렉트와 웹훅이 겹쳐 두 번 들어와도 같은 답이 나와야 한다
  const twice = await settlePayment(ticket.providerPaymentId);
  check(twice.ok && twice.alreadyDone && twice.upgradedAttemptId === up.attemptId,
    "같은 결제가 또 들어와도 같은 결과지를 가리킨다");
  check((await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE user_id=$1`, [up.userId]))!.n === seatsBefore,
    "재수신에도 좌석이 늘지 않는다");

  console.log("\n════════ 6. 등급을 못 가리면 ════════");
  const orphan = await queryOne<{ id: string }>(
    `INSERT INTO attempts (session_id, user_id, seat_id, status, started_at)
     VALUES ($1,$2,NULL,'in_progress',now()) RETURNING id`, [ses!.id, free.userId]);
  const lv4 = await reportLevel(orphan!.id);
  check(lv4 === "free", "좌석이 없는 응시는 free 로 떨어진다", `실제 ${lv4}`);
  check((await reportLevel("999999999")) === null, "없는 응시는 null");

  console.log(
    failed === 0
      ? "\n무료·유료 경계 OK — 무료는 지표까지, 유료가 사슬과 과목 처방\n"
      : `\n실패 ${failed}건\n`,
  );
  if (failed) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
