/**
 * 개인 결제가 거짓말하지 않는지 본다.
 *
 * 이 검사가 지키는 것은 네 줄이다. 넷 다 **돈이 오가는 자리**라
 * 조용히 깨지면 몇 주 뒤에야 드러난다.
 *
 *   1. 못 줄 것은 팔지 않는다 — 채점 산식이 없으면 주문이 막힌다
 *   2. 금액이 다르면 이행하지 않는다 — 100원 내고 25,000원짜리를 가져갈 수 없다
 *   3. 결제 하나에 응시권 하나 — 웹훅이 두 번 와도 좌석은 한 장
 *   4. 결제 전에는 아무것도 발급되지 않는다
 *
 *   tsx scripts/e2e-order.ts
 */
import { query, queryOne } from "../src/lib/db";
import { canFulfill, createOrder, fulfillOrder, markPaid } from "../src/lib/orders";

/**
 * 검사는 **스스로 조건을 만든다.**
 *
 * 처음에는 채점 산식이 없으면 아래 세 줄을 건너뛰게 해 두었는데, 그러면
 * 정작 중요한 두 줄(금액 위조·한 결제 한 응시권)이 영영 돌지 않는다.
 * 산식이 언제 올지 모르는 동안 돈 지키는 검사가 잠들어 있는 셈이다.
 *
 * 그래서 가중치 한 줄을 검사가 직접 넣었다 뺀다. **이것은 채점 산식이
 * 아니다** — `canFulfill()` 이 "비어 있지 않다" 로 읽을 최소한의 한 줄이고,
 * 검사가 끝나면 지운다. 진짜 산식은 여전히 대표가 정한다.
 */
async function borrowWeight(): Promise<() => Promise<void>> {
  const row = await queryOne<{ instrument_id: string; indicator_id: string; job_id: string }>(
    `SELECT i.id::text AS instrument_id, d.id::text AS indicator_id, j.id::text AS job_id
       FROM instruments i
       JOIN indicators d ON d.instrument_id = i.id
       CROSS JOIN LATERAL (SELECT id FROM job_clusters ORDER BY id LIMIT 1) j
      WHERE i.status = 'published'
      ORDER BY i.id, d.id LIMIT 1`,
  );
  if (!row) return async () => {};

  await query(
    `INSERT INTO scoring_weights (instrument_id, indicator_id, job_id, weight)
     VALUES ($1, $2, $3, 0) ON CONFLICT DO NOTHING`,
    [row.instrument_id, row.indicator_id, row.job_id],
  );
  return async () => {
    await query(
      `DELETE FROM scoring_weights
        WHERE instrument_id = $1 AND indicator_id = $2 AND job_id = $3 AND weight = 0`,
      [row.instrument_id, row.indicator_id, row.job_id],
    );
  };
}

let failed = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`  ${cond ? "통과" : "실패"}  ${msg}`);
  if (!cond) failed++;
};

/**
 * 이 검사가 만든 것만 지운다.
 *
 * 주문만 지우면 좌석과 계정이 남아, 같은 데이터베이스에서 두 번째로
 * 돌릴 때 "응시권이 한 장" 이 두 장으로 보여 **거짓 실패**가 난다. CI 는
 * 매번 빈 데이터베이스로 시작하지만 사람 컴퓨터는 그렇지 않다.
 *
 * 지우는 순서는 참조를 거스르지 않게 잡는다 — 응시 → 회차 → 좌석 →
 * 소속·토큰 → 주문 → 계정. 계약의 seat_count 도 돌려놓는다.
 */
const QA = "order-qa+%@example.com";

async function cleanup() {
  await query(
    `DELETE FROM attempts a USING users u
      WHERE a.user_id = u.id AND u.email LIKE $1`,
    [QA],
  );
  /* 주문마다 회차를 하나씩 만들었다. 응시가 사라진 빈 회차만 걷는다 */
  await query(
    `DELETE FROM test_sessions s
      WHERE s.name LIKE 'MT-%'
        AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.session_id = s.id)
        AND EXISTS (SELECT 1 FROM organizations o
                     WHERE o.id = s.org_id AND o.code LIKE 'SELF-%')`,
  );
  /* 좌석을 거둔 만큼 계약의 장부도 되돌린다 */
  await query(
    `WITH gone AS (
       DELETE FROM seats s USING users u
        WHERE s.user_id = u.id AND u.email LIKE $1
        RETURNING s.contract_id
     ), tally AS (
       SELECT contract_id, count(*)::int AS n FROM gone GROUP BY contract_id
     )
     UPDATE contracts c SET seat_count = greatest(1, c.seat_count - t.n)
       FROM tally t WHERE c.id = t.contract_id`,
    [QA],
  );
  await query(
    `DELETE FROM memberships m USING users u
      WHERE m.user_id = u.id AND u.email LIKE $1`,
    [QA],
  );
  await query(
    `DELETE FROM password_reset_tokens t USING users u
      WHERE t.user_id = u.id AND u.email LIKE $1`,
    [QA],
  );
  await query(`DELETE FROM orders WHERE buyer_email LIKE $1`, [QA]);
  await query(`DELETE FROM users WHERE email LIKE $1`, [QA]);
}

async function seatCount(email: string): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM seats s JOIN users u ON u.id = s.user_id
      WHERE u.email = $1`,
    [email],
  );
  return Number(r?.n ?? 0);
}

async function main() {
  await cleanup();

  /* ── 1. 팔 수 있는 상태인가 ───────────────────────────────── */
  const ready = await canFulfill();
  const weights = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM scoring_weights`,
  );
  const hasWeights = Number(weights?.n ?? 0) > 0;

  if (!hasWeights) {
    /* 지금 저장소의 상태다. 채점 산식이 아직 없다 */
    ok(!ready.ok, "채점 산식이 없으면 팔 수 없다고 말한다");
    ok(
      !ready.ok && ready.missing.includes("scoring_weights"),
      "무엇이 없어서 못 파는지 이름을 댄다",
    );

    const blocked = await createOrder({
      site: "kr",
      product: "individual",
      email: "order-qa+blocked@example.com",
      name: "차단 확인",
    }).then((o) => fulfillOrder(o.orderNo));
    ok(
      "error" in blocked && blocked.error.startsWith("not_ready"),
      "산식이 없으면 결제됐다 해도 발급하지 않는다",
    );
  }

  /* 나머지는 팔 수 있는 상태라야 볼 수 있다. 산식이 올 때까지 기다리지
     않고 가중치 한 줄을 빌려 온다 — 돈을 지키는 검사가 잠들어 있으면
     안 된다 */
  const giveBack = hasWeights ? async () => {} : await borrowWeight();
  const ready2 = await canFulfill();
  if (!ready2.ok) {
    ok(false, `팔 수 있는 상태를 만들지 못했다 (${ready2.missing.join(",")})`);
    await giveBack();
    await cleanup();
    console.log(`\n${failed}건 실패`);
    process.exit(1);
  }
  ok(true, "팔 수 있는 상태다");

  /* ── 2. 금액이 다르면 이행하지 않는다 ─────────────────────── */
  const cheap = await createOrder({
    site: "kr",
    product: "individual",
    email: "order-qa+cheap@example.com",
    name: "금액 위조",
  });
  ok(cheap.amount === 25_000, "금액은 서버 가격표에서 나온다 (25,000원)");

  const bad = await markPaid({
    orderNo: cheap.orderNo,
    provider: "qa",
    txId: "qa-tx-cheap",
    paidAmount: 100,
    currency: "KRW",
  });
  ok(!bad.changed && bad.why === "amount_mismatch", "100원 결제는 결제로 치지 않는다");

  const cheapOut = await fulfillOrder(cheap.orderNo);
  ok("error" in cheapOut, "금액이 어긋난 주문은 발급되지 않는다");
  ok(await seatCount("order-qa+cheap@example.com").then((n) => n === 0),
     "응시권도 생기지 않았다");

  /* ── 3. 결제 전에는 아무것도 없다 ─────────────────────────── */
  const unpaid = await createOrder({
    site: "kr",
    product: "individual",
    email: "order-qa+unpaid@example.com",
    name: "미결제",
  });
  const unpaidOut = await fulfillOrder(unpaid.orderNo);
  ok(
    "error" in unpaidOut && unpaidOut.error.startsWith("not_paid"),
    "결제되지 않은 주문은 발급되지 않는다",
  );

  /* ── 4. 결제 하나에 응시권 하나 ───────────────────────────── */
  const good = await createOrder({
    site: "kr",
    product: "individual",
    email: "order-qa+good@example.com",
    name: "정상 결제",
  });
  const paid = await markPaid({
    orderNo: good.orderNo,
    provider: "qa",
    txId: "qa-tx-good",
    paidAmount: good.amount,
    currency: good.currency,
  });
  ok(paid.changed, "금액이 맞으면 결제로 표시된다");

  const first = await fulfillOrder(good.orderNo);
  ok(!("error" in first), "발급된다");
  ok(await seatCount("order-qa+good@example.com").then((n) => n === 1),
     "응시권이 한 장 생겼다");

  /* 웹훅은 얼마든지 다시 온다 */
  const again = await fulfillOrder(good.orderNo);
  ok(
    "error" in again && again.error === "already_fulfilled",
    "두 번째 통지는 발급하지 않는다",
  );
  ok(await seatCount("order-qa+good@example.com").then((n) => n === 1),
     "다시 와도 응시권은 여전히 한 장");

  const twice = await markPaid({
    orderNo: good.orderNo,
    provider: "qa",
    txId: "qa-tx-good",
    paidAmount: good.amount,
    currency: good.currency,
  });
  ok(!twice.changed, "같은 결제를 두 번 세지 않는다");

  /* 선불이므로 청구 건이 생기면 안 된다 — 카드로 이미 받았다 */
  const billed = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM billing_events b JOIN users u ON u.id = b.user_id
      WHERE u.email = 'order-qa+good@example.com'`,
  );
  ok(Number(billed?.n ?? 0) === 0, "카드로 받은 건은 청구서에 또 오르지 않는다");

  await giveBack();
  await cleanup();
  console.log(failed === 0 ? "\n전부 통과" : `\n${failed}건 실패`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
