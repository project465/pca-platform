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

let failed = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`  ${cond ? "통과" : "실패"}  ${msg}`);
  if (!cond) failed++;
};

/** 이 검사가 만든 것만 지운다 */
async function cleanup() {
  await query(
    `DELETE FROM orders WHERE buyer_email LIKE 'order-qa+%@example.com'`,
  );
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

    console.log(
      "\n  건너뜀  아래 세 줄은 채점 산식(scoring_weights)이 들어온 뒤에 돈다.",
    );
    console.log("          산식이 생기면 이 검사가 저절로 나머지를 확인한다.");
    await cleanup();
    console.log(failed === 0 ? "\n전부 통과" : `\n${failed}건 실패`);
    process.exit(failed === 0 ? 0 : 1);
  }

  /* ── 여기부터는 산식이 있을 때만 돈다 ─────────────────────── */
  ok(ready.ok, "팔 수 있는 상태다");

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

  await cleanup();
  console.log(failed === 0 ? "\n전부 통과" : `\n${failed}건 실패`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
