import { query, queryOne } from "./db";
import { checkoutReady } from "./payments";
import { mailReady } from "./outbox";

/**
 * 아침에 읽는 한 장.
 *
 * **여기서는 아무것도 보내지 않는다.** 화면이 열릴 때마다 메일이 나가면
 * 새로고침 한 번이 발송 한 번이 된다. 내보내는 것은 밤 당번
 * (`POST /api/ops/tick`)의 일이고, 이 함수는 읽기만 한다.
 *
 * 화면(`/admin/ops`)과 터미널(`npm run metri:ops`)이 같은 것을 본다 —
 * 두 곳에서 따로 세면 숫자가 갈리고, 갈리는 순간 둘 다 못 믿는다.
 */
export type Briefing = Awaited<ReturnType<typeof briefing>>;

export async function briefing(days = 1) {
  const d = Math.max(1, Math.min(365, Math.floor(days) || 1));
  const since = `now() - interval '${d} day'`;
  const min = Number(process.env.CODE_STOCK_MIN ?? 20);

  /**
   * 다 쓴 상품이 표에서 사라지면 안 된다. 안 쓴 코드만 세면 마지막 한
   * 장까지 팔린 상품은 행이 없어져 경고도 없이 조용해지는데, 재고가 0인
   * 그때가 가장 급한 때다.
   */
  const stock = await query<{ product: string; left: number }>(
    `SELECT product_code AS product,
            count(*) FILTER (
              WHERE used_at IS NULL AND voided_at IS NULL
                AND (expires_at IS NULL OR expires_at > now()))::int AS left
       FROM redemption_codes GROUP BY product_code ORDER BY product_code`,
  );

  const outbox = await query<{ status: string; n: number }>(
    `SELECT status, count(*)::int AS n FROM outbox GROUP BY status ORDER BY status`,
  );

  const people = await queryOne<{ signups: number; started: number; scored: number }>(
    `SELECT (SELECT count(*)::int FROM users
              WHERE created_at >= ${since} AND status = 'active') AS signups,
            (SELECT count(*)::int FROM attempts WHERE started_at >= ${since}) AS started,
            (SELECT count(*)::int FROM attempts WHERE scored_at >= ${since}) AS scored`,
  );

  // 0원 주문은 매출이 아니다. 같은 표에 섞으면 건수가 부풀어 전환율이
  // 실제보다 좋아 보인다.
  const sales = await query<{ product: string; n: number; sum: number }>(
    `SELECT product_code AS product, count(*)::int AS n, coalesce(sum(amount),0)::int AS sum
       FROM orders WHERE status = 'paid' AND paid_at >= ${since} AND amount > 0
      GROUP BY product_code ORDER BY sum DESC`,
  );
  const codesUsed = (await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM redemption_codes WHERE used_at >= ${since}`))?.n ?? 0;

  const funnel = await queryOne<{ free: number; upgraded: number }>(
    `SELECT (SELECT count(*)::int FROM orders o JOIN products p ON p.code = o.product_code
              WHERE o.created_at >= ${since} AND p.amount = 0) AS free,
            (SELECT count(*)::int FROM report_grants WHERE granted_at >= ${since}) AS upgraded`,
  );

  const refunds = await query<{ reason: string; n: number; sum: number }>(
    `SELECT reason, count(*)::int AS n, coalesce(sum(amount),0)::int AS sum
       FROM refunds WHERE refunded_at >= ${since} GROUP BY reason ORDER BY sum DESC`,
  );

  // 결제창까지 갔다가 안 돌아온 주문. 한 시간을 넘겼으면 이탈이거나
  // 웹훅이 안 온 것이고, 뒤쪽이면 돈은 들어왔는데 좌석이 없다.
  const stale = await query<{ orderNo: string; product: string; amount: number; age: string }>(
    `SELECT order_no AS "orderNo", product_code AS product, amount,
            to_char(now() - created_at, 'DD"일 "HH24"시간"') AS age
       FROM orders
      WHERE status = 'pending' AND amount > 0 AND created_at < now() - interval '1 hour'
      ORDER BY created_at LIMIT 20`,
  );

  /**
   * 돈은 받았는데 아무것도 안 열린 주문. 배선 사고다. 좌석을 주는
   * 상품인지는 `products.seat_count` 가 안다 — 업그레이드는 좌석이 0이고
   * `report_grants` 로 열린다.
   */
  const orphan = await query<{ orderNo: string; product: string; amount: number }>(
    `SELECT o.order_no AS "orderNo", o.product_code AS product, o.amount
       FROM orders o JOIN products p ON p.code = o.product_code
      WHERE o.status = 'paid'
        AND NOT EXISTS (SELECT 1 FROM seats s WHERE s.order_id = o.id)
        AND NOT EXISTS (SELECT 1 FROM report_grants g WHERE g.order_id = o.id)
        AND NOT EXISTS (SELECT 1 FROM entitlements e WHERE e.order_id = o.id)
        AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.order_id = o.id)
        AND p.seat_count > 0
      ORDER BY o.paid_at DESC LIMIT 20`,
  );

  const waiting = await query<{ id: string; name: string; n: number }>(
    `SELECT ts.id, ts.name, count(*)::int AS n
       FROM test_sessions ts JOIN attempts a ON a.session_id = ts.id
      WHERE ts.release_mode = 'manual' AND ts.released_at IS NULL AND a.scored_at IS NOT NULL
      GROUP BY ts.id, ts.name ORDER BY ts.id`,
  );

  const products = await query<{ code: string; amount: number }>(
    `SELECT code, amount FROM products WHERE active ORDER BY amount, code`,
  );

  const lowStock = stock.filter((s) => s.left < min);
  const dead = (await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE status = 'failed'`))?.n ?? 0;
  const mock = (process.env.PAYMENTS_PROVIDER ?? "mock") !== "portone";

  /** 손이 필요한 것만 모은다. 비어 있으면 그날은 아무도 안 깨워도 된다. */
  const todo: string[] = [];
  for (const s of lowStock) {
    todo.push(`응시권 코드를 찍습니다 — ${s.product} 가 ${s.left}장 남았습니다`);
  }
  if (orphan.length) todo.push(`결제 후 좌석이 안 생긴 주문 ${orphan.length}건. 가장 급합니다`);
  if (stale.length) todo.push(`확정 안 된 주문 ${stale.length}건을 PG 콘솔과 대조합니다`);
  if (waiting.length) todo.push(`공개를 기다리는 회차 ${waiting.length}건을 담당자에게 알립니다`);
  if (refunds.length) {
    todo.push(`환불 ${refunds.reduce((a, r) => a + r.n, 0)}건 — 송금은 아직 사람이 합니다`);
  }
  if (dead) todo.push(`세 번 실패해 포기한 알림 ${dead}건을 확인합니다`);
  if (!mailReady()) todo.push("MAIL_HOST·MAIL_FROM 을 채우면 쌓인 알림이 순서대로 나갑니다");
  /**
   * 순서가 중요하다. 운영 빌드에서 mock 이면 결제창 자체가 닫히므로,
   * "가짜 결제를 받고 있다" 가 아니라 "받지 못하고 있다" 가 맞는 말이다.
   */
  if (!checkoutReady()) {
    todo.push("카드 결제가 닫혀 있습니다 — PG 심사가 끝나면 PORTONE_* 를 채웁니다");
  } else if (mock) {
    todo.push("지금 받는 결제는 가짜입니다 — PAYMENTS_PROVIDER 가 portone 이 아닙니다");
  }

  return {
    days: d,
    at: new Date().toISOString(),
    stockMin: min,
    stock,
    lowStock,
    outbox,
    deadMail: dead,
    people: people ?? { signups: 0, started: 0, scored: 0 },
    sales,
    salesTotal: sales.reduce((a, r) => a + r.sum, 0),
    codesUsed,
    funnel: funnel ?? { free: 0, upgraded: 0 },
    refunds,
    stale,
    orphan,
    waiting,
    products,
    gates: {
      card: checkoutReady(),
      mock,
      mail: mailReady(),
      codes: stock.some((s) => s.left > 0),
    },
    todo,
  };
}
