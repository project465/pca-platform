import { query, queryOne, tx } from "./db";

/**
 * 환불을 판정하는 유일한 곳.
 *
 * 등급을 정하는 곳이 `entitlement.ts` 하나이듯, **얼마를 돌려주는지 정하는
 * 곳도 하나다.** 화면마다 판단하면 화면이 늘 때마다 판단이 복사되고,
 * 복사된 것 중 하나가 틀리면 돈 문제로 틀린다.
 *
 * 기준은 **제공이 개시된 때**다. 전자상거래법 제17조 제2항 5호가 디지털
 * 콘텐츠는 제공 개시 후 청약철회를 제한할 수 있게 하는데, 상품마다 그
 * 시점이 다르다. 그래서 상품별로 따로 본다.
 *
 * **이 파일은 판정만 한다.** 실제로 돈을 돌려보내는 것은 PG 쪽 일이고
 * 아직 심사 전이라 열려 있지 않다. 판정과 집행을 나눠 두면 PG 가 붙을 때
 * 집행만 채우면 된다.
 */

/** 못 돌려주는 이유. 화면이 이 값으로 문장을 고른다. */
export type DenyReason =
  | "not_found"
  | "not_paid"        // 아직 결제가 확정되지 않았다
  | "already"         // 이미 환불했다
  | "started"         // 응시를 시작했다
  | "viewed"          // 넓어진 결과지를 열어 봤다
  | "expired_window"; // 기간이 지났다

export type Verdict =
  | { ok: true; amount: number; reason: "before_start" | "not_viewed" | "pass_remaining" | "code_unused"; note?: string }
  | { ok: false; deny: DenyReason };

/**
 * 응시권·업그레이드가 아니어도 **7일은 공통으로 본다.**
 *
 * 법이 보장하는 것이 7일이다. 그보다 넓게 주는 구간(응시 전)은 아래에서
 * 따로 열고, 좁히지는 않는다.
 */
const WINDOW_DAYS = 7;

type OrderRow = {
  id: string;
  user_id: string;
  product_code: string;
  amount: number;
  status: string;
  paid_at: string | null;
  upgrades_attempt_id: string | null;
  kind: string;
  duration_days: number | null;
  refunded: number;
};

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  return queryOne<OrderRow>(
    `SELECT o.id, o.user_id, o.product_code, o.amount, o.status, o.paid_at::text AS paid_at,
            o.upgrades_attempt_id::text AS upgrades_attempt_id,
            p.kind, p.duration_days,
            (SELECT count(*)::int FROM refunds r WHERE r.order_id = o.id) AS refunded
       FROM orders o JOIN products p ON p.code = o.product_code
      WHERE o.id = $1`,
    [orderId],
  );
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/**
 * 이 주문을 지금 환불할 수 있는가, 얼마를.
 *
 * 금액을 부르는 쪽에서 정하지 않는다 — 결제 금액을 화면에서 받지 않는 것과
 * 같은 이유다(`startCheckout` 주석 참고).
 */
export async function refundable(orderId: string): Promise<Verdict> {
  const o = await loadOrder(orderId);
  if (!o) return { ok: false, deny: "not_found" };
    // **순서가 중요하다.** 환불하면 status 가 'refunded' 로 바뀌므로 결제
  // 여부를 먼저 보면 이미 환불한 주문에 "결제되지 않았습니다" 가 뜬다.
  // 돈을 낸 사람이 그 문장을 보면 결제 자체를 의심하게 된다
  if (o.refunded > 0 || o.status === "refunded") return { ok: false, deny: "already" };
  if (o.status !== "paid" || !o.paid_at) return { ok: false, deny: "not_paid" };

  // ── 기간권 — 가분적이라 남은 기간을 돌려준다(계속거래) ────────────
  if (o.kind === "pass") {
    const ent = await queryOne<{ starts_at: string; ends_at: string }>(
      `SELECT starts_at::text, ends_at::text FROM entitlements
        WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
      [o.id],
    );
    if (!ent) return { ok: false, deny: "not_found" };
    const total = new Date(ent.ends_at).getTime() - new Date(ent.starts_at).getTime();
    const left = new Date(ent.ends_at).getTime() - Date.now();
    if (left <= 0) return { ok: false, deny: "expired_window" };
    // 일할 계산. **위약금을 떼지 않는다** — 계속거래의 위약금 상한을 계산해
    // 다투느니 안 떼는 쪽이 싸고, 분쟁이 없다
    const amount = Math.floor((o.amount * left) / total);
    return { ok: true, amount, reason: "pass_remaining", note: `잔여 ${Math.ceil(left / 86_400_000)}일` };
  }

  // ── 업그레이드 — 경계는 응시가 아니라 **결과지를 연 때** ──────────
  //    이 결제를 하는 사람은 이미 응시를 끝냈다. "응시를 시작하면 불가" 를
  //    그대로 쓰면 사자마자 환불 불가가 되어 버린다.
  if (o.upgrades_attempt_id) {
    const g = await queryOne<{ first_viewed_at: string | null }>(
      `SELECT first_viewed_at::text FROM report_grants WHERE order_id = $1`,
      [o.id],
    );
    if (g?.first_viewed_at) return { ok: false, deny: "viewed" };
    if (daysSince(o.paid_at) > WINDOW_DAYS) return { ok: false, deny: "expired_window" };
    return { ok: true, amount: o.amount, reason: "not_viewed" };
  }

  // ── 응시권 — 경계는 첫 문항에 답한 때 ────────────────────────────
  const started = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n
       FROM responses r
       JOIN attempts a ON a.id = r.attempt_id
       JOIN seats s ON s.id = a.seat_id
      WHERE s.order_id = $1`,
    [o.id],
  );
  if ((started?.n ?? 0) > 0) return { ok: false, deny: "started" };

  // 응시 전이면 **기간과 관계없이** 돌려준다. 법이 주는 7일보다 넓다 —
  // 아직 아무것도 제공되지 않았기 때문이다
  const code = await queryOne<{ id: string }>(
    `SELECT id FROM redemption_codes WHERE order_id = $1`, [o.id]);
  return {
    ok: true,
    amount: o.amount,
    reason: code ? "code_unused" : "before_start",
  };
}

/**
 * 환불을 기록한다. **돈을 보내지는 않는다** — PG 가 붙기 전이라 집행할
 * 길이 없고, 학교 계약과 쇼핑몰 판매는 애초에 이쪽에서 보내지 않는다.
 *
 * 좌석은 회수한다. 응시를 시작하지 않은 좌석만 지운다 —
 * `refundable` 이 이미 막지만, 여기서도 조건을 걸어 두 곳이 어긋날 때
 * 좌석이 조용히 사라지는 일을 막는다.
 */
export async function recordRefund(
  orderId: string,
  opts: { note?: string; operatorOverride?: { amount: number; note: string } } = {},
): Promise<Verdict> {
  const v = opts.operatorOverride
    ? ({ ok: true, amount: opts.operatorOverride.amount, reason: "before_start" } as const)
    : await refundable(orderId);
  if (!v.ok) return v;

  const reason = opts.operatorOverride ? "operator" : v.reason;
  const note = opts.operatorOverride?.note ?? opts.note ?? null;

  await tx(async (c) => {
    await c.query(
      `INSERT INTO refunds (order_id, amount, reason, note) VALUES ($1,$2,$3,$4)`,
      [orderId, v.amount, reason, note],
    );
    await c.query(`UPDATE orders SET status = 'refunded' WHERE id = $1`, [orderId]);
    // 아직 응시로 바뀌지 않은 좌석만 회수한다
    await c.query(
      `DELETE FROM seats s
        WHERE s.order_id = $1
          AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.seat_id = s.id)`,
      [orderId],
    );
    // 기간권이면 남은 기간을 지금으로 끊는다. 이미 본 결과지는 건드리지 않는다
    await c.query(
      `UPDATE entitlements SET ends_at = now() WHERE order_id = $1 AND ends_at > now()`,
      [orderId],
    );
  });
  return v;
}

/**
 * 넓어진 결과지를 처음 연 시각을 적는다.
 *
 * **한 번만 적고 덮어쓰지 않는다.** 덮어쓰면 "언제 처음 봤는가" 가 사라져
 * 환불 경계가 흐려진다. 무엇을 읽었는지는 남기지 않는다 — 시각 하나면
 * 판정에 충분하고, 그 이상은 필요 없는 개인정보다.
 */
export async function markReportViewed(attemptId: string): Promise<void> {
  await query(
    `UPDATE report_grants SET first_viewed_at = now()
      WHERE attempt_id = $1 AND first_viewed_at IS NULL`,
    [attemptId],
  );
}

/**
 * 아직 쓰지 않은 응시권 코드를 되돌린다. 쇼핑몰에서 환불했을 때 쓴다.
 *
 * 이미 응시를 시작했으면 거절한다 — 그 사람의 결과지를 빼앗는 셈이 된다.
 */
export async function revokeRedemption(
  codeTailOrId: string,
): Promise<{ ok: true; orderId: string | null } | { ok: false; deny: DenyReason }> {
  const row = await queryOne<{ id: string; order_id: string | null; used_at: string | null }>(
    `SELECT id, order_id::text AS order_id, used_at::text AS used_at
       FROM redemption_codes WHERE id::text = $1`,
    [codeTailOrId],
  );
  if (!row) return { ok: false, deny: "not_found" };

  // 아직 안 쓴 코드면 막는 것으로 끝난다
  if (!row.used_at || !row.order_id) {
    await query(`UPDATE redemption_codes SET voided_at = now() WHERE id = $1 AND voided_at IS NULL`, [row.id]);
    return { ok: true, orderId: null };
  }

  const v = await refundable(row.order_id);
  if (!v.ok) return { ok: false, deny: v.deny };
  await recordRefund(row.order_id);
  return { ok: true, orderId: row.order_id };
}
