import type { PoolClient } from "pg";
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
  | "refill_used"     // 추가 이용권으로 더한 횟수를 쓰기 시작했다
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
  /** 정기결제 회차면 그 정기결제 번호. 칸이 없는 DB 면 늘 null */
  subscription_id: string | null;
};

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  const sql = (sub: string) => `SELECT o.id, o.user_id, o.product_code, o.amount, o.status, o.paid_at::text AS paid_at,
            o.upgrades_attempt_id::text AS upgrades_attempt_id,
            p.kind, p.duration_days, ${sub} AS subscription_id,
            (SELECT count(*)::int FROM refunds r WHERE r.order_id = o.id) AS refunded
       FROM orders o JOIN products p ON p.code = o.product_code
      WHERE o.id = $1`;
  /* 정기결제 칸(`schema_subscriptions.sql`)을 올리기 전 DB 에서도 돈다 */
  return queryOne<OrderRow>(sql("o.subscription_id::text"), [orderId])
    .catch(() => queryOne<OrderRow>(sql("NULL::text"), [orderId]));
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/**
 * 이 주문을 지금 환불할 수 있는가, 얼마를.
 *
 * 금액을 부르는 쪽에서 정하지 않는다. 결제 금액을 화면에서 받지 않는 것과
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

  // ── 추가 이용권: 더한 횟수를 쓰기 전이면 7일 안 전액, 쓰기 시작했으면 환불하지 않는다 ──
  if (o.kind === "track_refill") {
    if (daysSince(o.paid_at) > WINDOW_DAYS) return { ok: false, deny: "expired_window" };
    const { refillTouched } = await import("@/lib/assistant/ai-budget");
    if (await refillTouched(o.user_id)) return { ok: false, deny: "refill_used" };
    return { ok: true, amount: o.amount, reason: "before_start" };
  }

  // ── 정기결제 회차(/legal/subscription 5조) ─────────────────────────
  //    결제 후 7일 안 + 그 회차에 유료 기능을 쓰지 않음 → 전액. 그 밖 → 결제 금액 ÷ 기간 일수 × 남은 일수(원 미만 버림).
  //    회사 사유 전액은 운영자 판단(`operatorOverride`)이다
  if (o.subscription_id && o.kind === "track") {
    const ent = await queryOne<{ starts_at: string; ends_at: string }>(
      `SELECT starts_at::text, ends_at::text FROM entitlements WHERE order_id = $1 ORDER BY id DESC LIMIT 1`, [o.id]);
    if (!ent) return { ok: false, deny: "not_found" };
    const st = new Date(ent.starts_at).getTime();
    const en = new Date(ent.ends_at).getTime();
    const left = en - Math.max(Date.now(), st);
    if (left <= 0) return { ok: false, deny: "expired_window" };
    if (daysSince(o.paid_at) <= WINDOW_DAYS && !(await usedPaidFeature(o.user_id, new Date(Math.min(st, Date.parse(o.paid_at))).toISOString()))) {
      return { ok: true, amount: o.amount, reason: "before_start", note: "7일 안 · 유료 기능 안 씀" };
    }
    const days = o.duration_days ?? Math.round((en - st) / 86_400_000);
    const leftDays = Math.min(days, Math.ceil(left / 86_400_000));
    const amount = Math.min(o.amount, Math.floor((o.amount / days) * leftDays));
    return { ok: true, amount, reason: "pass_remaining", note: `잔여 ${leftDays}일 · 일할` };
  }

  // ── 기간권: 가분적이라 남은 기간을 돌려준다(계속거래) ────────────
  //    Track 도 같다: 30일권·365일권은 남은 날만큼 일할로 돌려준다
  if (o.kind === "pass" || o.kind === "track") {
    const ent = await queryOne<{ starts_at: string; ends_at: string }>(
      `SELECT starts_at::text, ends_at::text FROM entitlements
        WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
      [o.id],
    );
    if (!ent) return { ok: false, deny: "not_found" };
    const st = new Date(ent.starts_at).getTime();
    const en = new Date(ent.ends_at).getTime();
    const total = en - st;
    /* **이어 붙인 기간은 아직 시작하지 않았다.** 앞 줄의 끝에서 시작하므로
       `starts_at` 이 미래일 수 있고, 그때 `ends_at - 지금` 으로 재면 남은
       기간이 산 기간보다 길어져 **낸 돈보다 많이 돌려준다.** 남은 기간은
       시작한 때와 지금 가운데 늦은 쪽부터 잰다 */
    const left = en - Math.max(Date.now(), st);
    if (left <= 0) return { ok: false, deny: "expired_window" };
    // 일할 계산. **위약금을 떼지 않는다**: 계속거래의 위약금 상한을 계산해
    // 다투느니 안 떼는 쪽이 싸고, 분쟁이 없다
    const amount = Math.floor((o.amount * Math.min(left, total)) / total);
    return { ok: true, amount, reason: "pass_remaining", note: `잔여 ${Math.ceil(left / 86_400_000)}일` };
  }

  // ── 업그레이드: 경계는 응시가 아니라 **결과지를 연 때** ──────────
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

  // ── 응시권: 경계는 첫 문항에 답한 때 ────────────────────────────
  const started = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n
       FROM responses r
       JOIN attempts a ON a.id = r.attempt_id
       JOIN seats s ON s.id = a.seat_id
      WHERE s.order_id = $1`,
    [o.id],
  );
  if ((started?.n ?? 0) > 0) return { ok: false, deny: "started" };

  // 응시 전이면 **기간과 관계없이** 돌려준다. 법이 주는 7일보다 넓다.
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
 * 그 회차에 **유료 기능**을 썼는가(/legal/subscription 5조 1항: 공고 분석(무료 1회 제외) · 지원서 초안 · 면접 연습 ·
 * 파일 반영). 무료 칸으로 만든 분석은 빼고 센다. 표가 없으면 쓰지 않은 것으로 본다(덜 주는 쪽으로 틀리지 않는다)
 */
async function usedPaidFeature(userId: string, sinceIso: string): Promise<boolean> {
  const n = async (sql: string) => (await queryOne<{ n: number }>(sql, [userId, sinceIso]).catch(() => null))?.n ?? 0;
  const postings = await n(`SELECT count(*)::int AS n FROM assistant_postings p WHERE p.user_id = $1 AND p.created_at >= $2
      AND NOT EXISTS (SELECT 1 FROM mat_free_claims c WHERE c.posting_id = p.id)`);
  if (postings > 0) return true;
  if (await n(`SELECT count(*)::int AS n FROM assistant_drafts WHERE user_id = $1 AND created_at >= $2`) > 0) return true;
  if (await n(`SELECT count(*)::int AS n FROM assistant_uploads WHERE user_id = $1 AND created_at >= $2 AND status IN ('read','empty')`) > 0) return true;
  if (await n(`SELECT count(*)::int AS n FROM research_docs WHERE user_id = $1 AND created_at >= $2`) > 0) return true;
  return await n(`SELECT count(*)::int AS n FROM assistant_ai_calls WHERE user_id = $1 AND created_at >= $2 AND outcome = 'ok'
      AND (op LIKE 'mat.ask.draft%' OR op LIKE 'mat.ask.interview%')`) > 0;
}

/**
 * 환불을 기록한다. **돈을 보내지는 않는다**: PG 가 붙기 전이라 집행할
 * 길이 없고, 학교 계약과 쇼핑몰 판매는 애초에 이쪽에서 보내지 않는다.
 *
 * 좌석은 회수한다. 응시를 시작하지 않은 좌석만 지운다:
 * `refundable` 이 이미 막지만, 여기서도 조건을 걸어 두 곳이 어긋날 때
 * 좌석이 조용히 사라지는 일을 막는다.
 */
export async function recordRefund(
  orderId: string,
  opts: {
    note?: string;
    operatorOverride?: { amount: number; note: string };
    /** 대행사가 이미 돌려보낸 취소. 있으면 장부에 그 번호를 함께 적는다(`refund-requests.ts` 의 승인) */
    exec?: { provider: string; refundId: string | null; amount?: number };
    /** 판정을 이미 했으면 그 값. 대행사에 보낸 금액과 장부 금액이 갈리지 않게 같은 판정을 쓴다 */
    verdict?: Verdict;
  } = {},
): Promise<Verdict> {
  const v = opts.verdict
    ?? (opts.operatorOverride
      ? ({ ok: true, amount: opts.operatorOverride.amount, reason: "before_start" } as const)
      : await refundable(orderId));
  if (!v.ok) return v;

  const reason = opts.operatorOverride ? "operator" : v.reason;
  const note = opts.operatorOverride?.note ?? opts.note ?? null;
  const amount = opts.exec?.amount ?? v.amount;

  await tx(async (c) => {
    await c.query(
      `INSERT INTO refunds (order_id, amount, reason, note, provider, provider_refund_id, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [orderId, amount, reason, note, opts.exec?.provider ?? null, opts.exec?.refundId ?? null,
        opts.exec ? "approval" : null],
    );
    await closeOrderTx(c, orderId);
  });
  return { ...v, amount };
}

/**
 * 환불이 끝난 주문을 닫는다. 기간을 끊고, 좌석 · 추가 이용권을 회수한다. **거래 안에서** 부른다.
 * 운영자 승인(`recordRefund`)과 대행사 웹훅의 전액 취소(`applyProviderCancel`)가 같은 줄을 쓴다
 */
async function closeOrderTx(c: PoolClient, orderId: string): Promise<void> {
  await c.query(`UPDATE orders SET status = 'refunded' WHERE id = $1`, [orderId]);
  /* 정기결제 회차를 돌려주면 다음 자동 결제도 멈춘다(돌려받은 뒤 다시 청구되면 안 된다). 칸이 없는 DB 면 넘어간다 */
  await c.query(`SAVEPOINT sub`);
  await c.query(
    `UPDATE subscriptions s SET status = 'canceled', cancel_reason = 'refunded', canceled_at = now(), next_charge_at = NULL,
            current_period_end = now(), updated_at = now()
       FROM orders o WHERE o.id = $1 AND s.id = o.subscription_id AND s.status IN ('active','past_due','paused')`, [orderId])
    .then(() => c.query(`RELEASE SAVEPOINT sub`), () => c.query(`ROLLBACK TO SAVEPOINT sub`));
  /* 추가 이용권이면 그 줄을 닫는다(표가 없으면 없는 줄이라 넘어간다) */
  await c.query(`SAVEPOINT refill`);
  await c.query(`UPDATE mat_refills SET status = 'refunded' WHERE order_id = $1`, [orderId])
    .then(() => c.query(`RELEASE SAVEPOINT refill`), () => c.query(`ROLLBACK TO SAVEPOINT refill`));
  // 아직 응시로 바뀌지 않은 좌석만 회수한다
  await c.query(
    `DELETE FROM seats s
      WHERE s.order_id = $1
        AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.seat_id = s.id)`,
    [orderId],
  );
  /**
   * 기간권이면 남은 기간을 지금으로 끊는다. 이미 본 결과지는 건드리지 않는다.
   *
   * **아직 시작하지 않은 줄도 끊는다.** 이어 붙인 줄은 `starts_at` 이
   * 미래라 `ends_at = now()` 만 쓰면 `ends_at > starts_at` 제약이 그 자리에서
   * 거절하고 환불 전체가 되돌아간다. 시작을 지금보다 1초 앞으로 당긴다.
   */
  const cut = await c.query<{ user_id: string; kind: string; removed: string; old_end: string }>(
    `UPDATE entitlements e
        SET starts_at = LEAST(e.starts_at, now() - interval '1 second'),
            ends_at   = now()
       FROM (SELECT id, ends_at AS old_end,
                    ends_at - GREATEST(now(), starts_at) AS removed
               FROM entitlements WHERE order_id = $1 AND ends_at > now()) old
      WHERE e.id = old.id
      RETURNING e.user_id::text, e.kind, old.removed::text, old.old_end::text`,
    [orderId],
  );
  await pullForwardTx(c, cut.rows);
}

/**
 * **뒤에 이어 붙어 있던 줄을 당긴다.** 30일권 뒤에 90일권을 미리 산
 * 사람이 30일권만 환불하면, 당기지 않은 90일권은 30일 뒤에야 시작해서
 * **돈을 낸 기간 한가운데 빈 달이 생긴다.** 끊어 낸 만큼 앞으로 옮긴다.
 */
async function pullForwardTx(
  c: PoolClient, rows: { user_id: string; kind: string; removed: string; old_end: string }[],
): Promise<void> {
  for (const r of rows) {
    await c.query(
      `UPDATE entitlements
          SET starts_at = starts_at - $3::interval,
              ends_at   = ends_at   - $3::interval
        WHERE user_id = $1 AND kind = $2 AND status = 'active'
          AND starts_at >= $4::timestamptz`,
      [r.user_id, r.kind, r.removed, r.old_end],
    );
  }
}

export type CancelApplied =
  | { applied: false; why: "no_order" | "no_change" | "not_paid" }
  | { applied: true; delta: number; full: boolean };

/**
 * **대행사 쪽에서 난 취소를 장부와 기간에 옮긴다**(웹훅 · 결제 조회에서 `cancelled` 를 받았을 때).
 *
 * 대행사 관리자 화면에서 직접 취소했거나 카드사가 되돌린 결제는 우리 승인을 거치지 않는다. 그대로 두면
 * 돈은 돌아갔는데 기간이 남는다.
 *
 * **몇 번 불려도 같다.** 대행사가 알려 준 취소 합계와 우리 장부(`refunds`)의 합을 대조해 **모자란 만큼만**
 * 적는다. 우리 승인으로 이미 적은 환불은 합이 같아 아무것도 하지 않는다. 주문 줄을 잠그고 보므로
 * 같은 웹훅이 동시에 두 번 들어와도 한 번만 적는다.
 *
 * - 취소 합계가 결제 금액 이상이면 **전액**: 주문을 닫고 기간을 끊는다(`closeOrderTx`)
 * - 그보다 작으면 **부분**: 기간 길이를 남은 금액 비율로 줄인다. 시작 시각과 상품 일수로 다시 재므로
 *   두 번째 부분 취소도 처음 길이에서 잰다(줄인 길이를 다시 줄이지 않는다)
 */
export async function applyProviderCancel(
  orderId: string, cancelledTotal: number, provider: string,
): Promise<CancelApplied> {
  return tx(async (c) => {
    const o = await c.query<{ amount: number; status: string; duration_days: number | null }>(
      `SELECT o.amount, o.status, p.duration_days
         FROM orders o JOIN products p ON p.code = o.product_code
        WHERE o.id = $1 FOR UPDATE OF o`, [orderId]);
    const row = o.rows[0];
    if (!row) return { applied: false, why: "no_order" } as const;
    if (row.status !== "paid" && row.status !== "refunded") return { applied: false, why: "not_paid" } as const;
    const had = await c.query<{ n: string | null }>(
      `SELECT sum(amount)::text AS n FROM refunds WHERE order_id = $1`, [orderId]);
    const recorded = Number(had.rows[0]?.n ?? 0) || 0;
    const total = Math.min(cancelledTotal, row.amount);
    const delta = total - recorded;
    if (delta <= 0) return { applied: false, why: "no_change" } as const;
    await c.query(
      `INSERT INTO refunds (order_id, amount, reason, note, provider, source)
       VALUES ($1, $2, 'operator', '대행사 쪽 취소', $3, 'pg_cancel')`,
      [orderId, delta, provider],
    );
    const full = total >= row.amount;
    if (full) {
      await closeOrderTx(c, orderId);
    } else if (row.duration_days) {
      /* 남은 금액 비율만큼만 기간을 둔다. 지금보다 앞이면 지금으로 끊는다 */
      const keep = (row.amount - total) / row.amount;
      const cut = await c.query<{ user_id: string; kind: string; removed: string; old_end: string }>(
        `UPDATE entitlements e
            SET ends_at = GREATEST(e.starts_at + interval '1 second',
                                   LEAST(old.old_end, e.starts_at + ($2::float8 * $3::int) * interval '1 day'))
           FROM (SELECT id, ends_at AS old_end FROM entitlements WHERE order_id = $1) old
          WHERE e.id = old.id
          RETURNING e.user_id::text, e.kind, (old.old_end - e.ends_at)::text AS removed, old.old_end::text`,
        [orderId, keep, row.duration_days],
      );
      await pullForwardTx(c, cut.rows.filter((r) => r.removed !== "00:00:00"));
    }
    return { applied: true, delta, full } as const;
  });
}

/**
 * 넓어진 결과지를 처음 연 시각을 적는다.
 *
 * **한 번만 적고 덮어쓰지 않는다.** 덮어쓰면 "언제 처음 봤는가" 가 사라져
 * 환불 경계가 흐려진다. 무엇을 읽었는지는 남기지 않는다. 시각 하나면
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
 * 이미 응시를 시작했으면 거절한다. 그 사람의 결과지를 빼앗는 셈이 된다.
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
