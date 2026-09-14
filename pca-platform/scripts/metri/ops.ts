/**
 * 밤 당번.
 *
 * 사람이 자는 동안 돈이 들어오려면 세 가지가 사람 없이 돌아야 한다 —
 * 팔리고(코드·결제), 열리고(좌석·결과지), **막힌 것이 아침에 눈에
 * 띄어야** 한다. 앞의 둘은 화면과 `settlePayment` 가 이미 한다. 이
 * 스크립트는 셋째다.
 *
 * 하는 일 셋. 순서가 곧 이유다.
 *
 *   1. 재고를 세고 모자라면 운영자에게 한 줄 적는다
 *      — 코드가 떨어지면 밤사이 구매가 조용히 멈춘다
 *   2. 대기열을 내보낸다
 *      — 가입·채점 알림은 화면이 적어만 두고 지나갔다
 *   3. 어젯밤에 무슨 일이 있었는지 한 장으로 찍는다
 *
 * 자격증명이 없으면 1·2 는 쌓아만 두고 3 은 그대로 나온다. **없는 채로도
 * 돌아가는 것이 중요하다** — 하나가 비었다고 브리핑 전체가 안 나오면
 * 아무도 안 본다.
 *
 *   npm run metri:ops            어제 하루
 *   npm run metri:ops -- 7       최근 7일
 */
import { query, queryOne } from "../../src/lib/db";
import { flushOutbox, checkCodeStock, mailReady } from "../../src/lib/outbox";
import { checkoutReady } from "../../src/lib/payments";

const days = Math.max(1, Number(process.argv[2] ?? 1));
const since = `now() - interval '${days} day'`;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
function table(rows: string[][]) {
  if (!rows.length) return "    (없음)";
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => [...r[i]].length)));
  return rows
    .map((r) => "    " + r.map((c, i) => c.padEnd(w[i] + (c === r[0] ? 2 : 2))).join("").trimEnd())
    .join("\n");
}

/** 손이 필요한 것만 모은다. 비어 있으면 그날은 아무도 안 깨워도 된다. */
const todo: string[] = [];

async function main() {
  const now = new Date();
  console.log("════════════════════════════════════════════════");
  console.log(`  METRI 운영 브리핑 — ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`);
  console.log(`  구간: 최근 ${days}일`);
  console.log("════════════════════════════════════════════════");

  // ── 1. 재고 ────────────────────────────────────────────────
  const low = await checkCodeStock();
  const stock = await query<{ product_code: string; left: number }>(
    `SELECT product_code,
            count(*) FILTER (
              WHERE used_at IS NULL AND voided_at IS NULL
                AND (expires_at IS NULL OR expires_at > now()))::int AS left
       FROM redemption_codes
      GROUP BY product_code ORDER BY product_code`,
  );
  console.log("\n[ 응시권 코드 재고 ]");
  console.log(table(stock.map((r) => [r.product_code, `${r.left}장`])));
  for (const l of low) {
    todo.push(`코드를 찍는다: npm run metri:codes -- --product ${l.product} --count 100 --batch <묶음>  (남은 ${l.left}장)`);
  }

  // ── 2. 대기열 ──────────────────────────────────────────────
  const flushed = await flushOutbox(200);
  const ob = await query<{ status: string; n: number }>(
    `SELECT status, count(*)::int AS n FROM outbox GROUP BY status ORDER BY status`,
  );
  console.log("\n[ 보낼 것 대기열 ]");
  console.log(`    이번 실행 — 보냄 ${flushed.sent} · 접음 ${flushed.skipped}`
    + ` · 자격증명이 없어 그대로 둔 것 ${flushed.held} · 실패 ${flushed.failed}`);
  console.log(table(ob.map((r) => [r.status, `${r.n}건`])));
  if (!mailReady()) {
    console.log("    메일 자격증명(MAIL_HOST·MAIL_FROM)이 없어 쌓아만 둔다.");
    todo.push("MAIL_HOST·MAIL_FROM 을 채운다 — 채우는 순간 쌓인 것이 순서대로 나간다");
  }
  const dead = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE status = 'failed'`);
  if (dead && dead.n > 0) todo.push(`세 번 실패해 포기한 알림 ${dead.n}건 — outbox.last_error 를 본다`);

  // ── 3. 어젯밤 ──────────────────────────────────────────────
  const signups = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM users WHERE created_at >= ${since} AND status = 'active'`);
  const started = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM attempts WHERE started_at >= ${since}`);
  const scored = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM attempts WHERE scored_at >= ${since}`);
  console.log("\n[ 들어온 사람 ]");
  console.log(`    가입 ${signups?.n ?? 0}명 · 응시 시작 ${started?.n ?? 0} · 채점 끝 ${scored?.n ?? 0}`);

  // 돈. **0원 주문은 매출이 아니다** — 같은 표에 섞으면 건수가 부풀어
  // 전환율이 실제보다 좋아 보인다.
  const sales = await query<{ product_code: string; n: number; sum: number }>(
    `SELECT product_code, count(*)::int AS n, coalesce(sum(amount),0)::int AS sum
       FROM orders WHERE status = 'paid' AND paid_at >= ${since} AND amount > 0
      GROUP BY product_code ORDER BY sum DESC`,
  );
  const total = sales.reduce((a, r) => a + r.sum, 0);
  const codeUse = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM redemption_codes WHERE used_at >= ${since}`);
  console.log("\n[ 돈 ]");
  console.log(table(sales.map((r) => [r.product_code, `${r.n}건`, won(r.sum)])));
  console.log(`    합계 ${won(total)}`);
  console.log(`    응시권 코드 교환 ${codeUse?.n ?? 0}건 (금액은 쇼핑몰 장부에 있다)`);

  // 무료로 들어와 유료 구간을 산 사람. 이 제품의 심장이다.
  const grants = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM report_grants WHERE granted_at >= ${since}`);
  const frees = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM orders o JOIN products p ON p.code = o.product_code
      WHERE o.created_at >= ${since} AND p.amount = 0`);
  const rate = frees?.n ? Math.round(((grants?.n ?? 0) / frees.n) * 1000) / 10 : null;
  console.log("\n[ 무료 → 유료 ]");
  console.log(`    무료 진단 ${frees?.n ?? 0}건 · 결과지 확장 결제 ${grants?.n ?? 0}건` +
    (rate === null ? "" : ` · ${rate}%`));
  console.log("    (같은 날 안에서 센 값이다. 무료로 풀고 며칠 뒤 사는 사람이 흔해 낮게 나온다)");

  const refs = await query<{ reason: string; n: number; sum: number }>(
    `SELECT reason, count(*)::int AS n, coalesce(sum(amount),0)::int AS sum
       FROM refunds WHERE refunded_at >= ${since} GROUP BY reason ORDER BY sum DESC`);
  if (refs.length) {
    console.log("\n[ 환불 ]");
    console.log(table(refs.map((r) => [r.reason, `${r.n}건`, won(r.sum)])));
    todo.push(`환불 ${refs.reduce((a, r) => a + r.n, 0)}건 — PG 에서 실제로 돌려보내는 것은 아직 사람이 한다`);
  }

  // ── 4. 막힌 것 ─────────────────────────────────────────────
  console.log("\n[ 막힌 것 ]");

  // 결제창까지 갔다가 안 돌아온 주문. 한 시간을 넘겼으면 이탈이거나
  // 웹훅이 안 온 것이다. 뒤쪽이면 돈은 들어왔는데 좌석이 없다.
  const stale = await query<{ order_no: string; product_code: string; amount: number; age: string }>(
    `SELECT order_no, product_code, amount,
            to_char(now() - created_at, 'DD"일 "HH24"시간"') AS age
       FROM orders
      WHERE status = 'pending' AND amount > 0 AND created_at < now() - interval '1 hour'
      ORDER BY created_at LIMIT 20`);
  console.log(`  확정 안 된 결제 ${stale.length}건`);
  if (stale.length) {
    console.log(table(stale.map((r) => [r.order_no, r.product_code, won(r.amount), r.age])));
    todo.push(`확정 안 된 주문 ${stale.length}건 — PG 콘솔에서 승인 여부를 대조한다`);
  }

  /**
   * 돈은 받았는데 아무것도 안 열린 주문. 배선 사고다.
   *
   * 좌석을 주는 상품인지 아닌지는 `products.seat_count` 가 안다 —
   * 업그레이드는 좌석이 0이고 `report_grants` 로 열린다.
   */
  const orphan = await query<{ order_no: string; product_code: string }>(
    `SELECT o.order_no, o.product_code
       FROM orders o JOIN products p ON p.code = o.product_code
      WHERE o.status = 'paid'
        AND NOT EXISTS (SELECT 1 FROM seats s WHERE s.order_id = o.id)
        AND NOT EXISTS (SELECT 1 FROM report_grants g WHERE g.order_id = o.id)
        AND NOT EXISTS (SELECT 1 FROM entitlements e WHERE e.order_id = o.id)
        AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.order_id = o.id)
        AND p.seat_count > 0
      ORDER BY o.paid_at DESC LIMIT 20`);
  console.log(`  결제됐는데 열린 것이 없는 주문 ${orphan.length}건`);
  if (orphan.length) {
    console.log(table(orphan.map((r) => [r.order_no, r.product_code])));
    todo.push(`결제 후 좌석이 안 생긴 주문 ${orphan.length}건 — 가장 급하다`);
  }

  // 학생이 다 풀었는데 담당자가 공개를 안 누른 회차. 학교 경로에서
  // 항의가 들어오는 자리다.
  const waiting = await query<{ id: string; name: string; n: number }>(
    `SELECT ts.id, ts.name, count(*)::int AS n
       FROM test_sessions ts JOIN attempts a ON a.session_id = ts.id
      WHERE ts.release_mode = 'manual' AND ts.released_at IS NULL AND a.scored_at IS NOT NULL
      GROUP BY ts.id, ts.name ORDER BY ts.id`);
  console.log(`  공개를 기다리는 회차 ${waiting.length}건`);
  if (waiting.length) {
    console.log(table(waiting.map((r) => [`#${r.id}`, r.name, `채점 끝 ${r.n}명`])));
    todo.push(`공개 대기 회차 ${waiting.length}건 — 학과 담당자에게 알린다`);
  }

  // ── 5. 문이 열려 있는가 ────────────────────────────────────
  console.log("\n[ 팔 수 있는 상태인가 ]");
  const sellable = await query<{ code: string; amount: number; active: boolean }>(
    `SELECT code, amount, active FROM products WHERE active ORDER BY amount, code`);
  console.log(`    켜져 있는 상품 ${sellable.length}개 — ${sellable.map((p) => p.code).join(", ") || "없음"}`);
  /**
   * mock 은 개발에서만 결제창을 흉내 낸다. 그런데 브리핑에 "열림" 한
   * 줄만 찍히면, 흉내 내는 중인지 진짜 돈이 들어오는 중인지 구별이
   * 안 된다. **가짜로 열려 있는 것이 닫혀 있는 것보다 위험하다.**
   */
  const mock = (process.env.PAYMENTS_PROVIDER ?? "mock") !== "portone";
  console.log(`    카드 결제 ${checkoutReady()
    ? (mock ? "열림 — 다만 가짜 결제(mock)다. 돈은 들어오지 않는다" : "열림")
    : "닫힘 (PORTONE_* 가 비어 있다)"}`);
  if (mock) todo.push("PAYMENTS_PROVIDER 가 portone 이 아니다 — 지금 받는 결제는 가짜다");
  const inStock = stock.filter((r) => r.left > 0);
  console.log(`    코드 교환 ${inStock.length ? "열림" : "닫힘 (쓸 수 있는 코드가 없다)"}`);
  if (!checkoutReady()) {
    todo.push("PG 가맹점 심사 — 끝나면 PORTONE_* 를 채운다. 그전까지 개인 카드 결제는 닫혀 있다");
  }

  // ── 6. 사람이 할 일 ────────────────────────────────────────
  console.log("\n════════ 사람이 할 일 ════════");
  if (!todo.length) console.log("  없다. 그대로 두면 된다.");
  else todo.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  console.log("");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
