/**
 * 개인 주문 — 밤에도 도는 자리.
 *
 * 단체는 사람이 붙는다. 신청서를 읽고 승인하고 계약을 만든다. 개인은
 * 그러면 안 된다. 새벽 두 시에 카드를 긁은 사람이 아침을 기다려야 한다면
 * 그 사람은 그냥 떠난다. 그래서 결제가 승인되는 순간 응시권까지 간다.
 *
 * 대신 두 가지를 지킨다.
 *
 * **못 줄 것은 팔지 않는다.** 문항이 없거나 채점 산식이 없으면 주문을
 * 만들지 않는다(`canFulfill`). 돈을 받고 못 주는 것이 이 기능에서 가장
 * 나쁜 고장이다 — 환불보다 신뢰가 먼저 깨진다.
 *
 * **한 번만 준다.** 결제 하나에 응시권 하나. 웹훅은 얼마든지 다시 오고
 * 두 번째부터는 아무 일도 일어나면 안 된다. 이 보장은 코드의 조심성이
 * 아니라 데이터베이스가 쥐고 있다 — orders 의 상태 전이와
 * payment_webhooks 의 UNIQUE 다.
 */
import { randomBytes } from "node:crypto";
import { query, queryOne, tx } from "@/lib/db";
import { createResetToken, generateTempPassword, hashPassword } from "@/lib/password";
import { priceOf, type Product, type Site } from "@/lib/pricing";

/** 응시권을 산 뒤 언제까지 쓸 수 있는가. 기본 1년 */
const VALID_DAYS = Number(process.env.ORDER_VALID_DAYS ?? 365);
/** 응시 안내 메일의 비밀번호 설정 링크가 살아 있는 시간 */
export const SETUP_TTL_HOURS = 72;

const COUNTRY: Record<Site, string> = { kr: "KR", global: "US", kz: "KZ" };

export function newOrderNo(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  return `MT-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * 지금 팔아도 되는가.
 *
 * **이 검사가 이 파일에서 가장 중요하다.** 통과하지 못하면 결제창이
 * 열리지 않는다. 문항이 없으면 응시를 못 하고, 채점 산식이 없으면
 * 결과지가 "채점 전" 에서 멈춘다. 둘 중 하나라도 비어 있는 채로 카드를
 * 받으면 그 돈은 받아서는 안 되는 돈이다.
 *
 * 그래서 "구매" 단추는 사람이 켜는 것이 아니라 **여기가 켠다.**
 */
export type Readiness = { ok: true } | { ok: false; missing: string[] };

export async function canFulfill(): Promise<Readiness> {
  const missing: string[] = [];

  const inst = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM instruments WHERE status = 'published'`,
  );
  if (Number(inst?.n ?? 0) === 0) missing.push("published_instrument");

  const weights = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM scoring_weights`,
  );
  if (Number(weights?.n ?? 0) === 0) missing.push("scoring_weights");

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

export type NewOrder = {
  site: Site;
  product: Product;
  email: string;
  name: string;
};

/**
 * 주문을 만든다. 금액은 **서버가 정한다.**
 *
 * 부르는 쪽이 보낸 금액은 인자로 받지도 않는다. 받을 수 있게 해 두면
 * 언젠가는 쓰게 된다.
 */
export async function createOrder(v: NewOrder): Promise<{ orderNo: string; amount: number; currency: string }> {
  const price = priceOf(v.site, v.product);

  for (let i = 0; i < 5; i++) {
    const orderNo = newOrderNo();
    try {
      await query(
        `INSERT INTO orders (order_no, site, product, buyer_email, buyer_name, amount, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderNo, v.site, v.product, v.email, v.name, price.amount, price.currency],
      );
      return { orderNo, amount: price.amount, currency: price.currency };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("orders_order_no_key")) continue;
      throw e;
    }
  }
  throw new Error("ORDER_NO_COLLISION");
}

/**
 * 결제가 확인됐다고 표시한다.
 *
 * 금액이 주문과 다르면 표시하지 않는다 — 위조된 결제이거나 우리가
 * 가격을 잘못 넘긴 것이고, 어느 쪽이든 이행하면 안 된다.
 *
 * 이미 paid 이상이면 아무 일도 하지 않고 false 를 돌려준다. 웹훅이 두 번
 * 온 것이지 사고가 아니다.
 */
export async function markPaid(v: {
  orderNo: string;
  provider: string;
  txId: string;
  paidAmount: number;
  currency: string;
}): Promise<{ changed: boolean; why?: string }> {
  return tx(async (c) => {
    const o = await c.query<{ id: string; amount: string; currency: string; status: string }>(
      `SELECT id::text, amount::text, currency, status FROM orders
        WHERE order_no = $1 FOR UPDATE`,
      [v.orderNo],
    );
    if (o.rowCount === 0) return { changed: false, why: "no_such_order" };
    const row = o.rows[0];
    if (row.status !== "created") return { changed: false, why: "already_" + row.status };

    if (Number(row.amount) !== v.paidAmount || row.currency !== v.currency) {
      await c.query(
        `UPDATE orders SET status = 'failed', fail_reason = $2 WHERE id = $1`,
        [row.id, `amount_mismatch expected=${row.amount}${row.currency} got=${v.paidAmount}${v.currency}`],
      );
      return { changed: false, why: "amount_mismatch" };
    }

    await c.query(
      `UPDATE orders
          SET status = 'paid', provider = $2, provider_tx_id = $3,
              paid_amount = $4, paid_at = now()
        WHERE id = $1`,
      [row.id, v.provider, v.txId, v.paidAmount],
    );
    return { changed: true };
  });
}

export type Fulfilled = {
  orderNo: string;
  email: string;
  name: string;
  site: Site;
  /** 비밀번호를 정하는 링크에 실을 토큰 원문. 저장하지 않는다 */
  setupToken: string;
  sessionId: string;
};

/**
 * 응시권을 발급한다. 결제된 주문 하나에 딱 한 번.
 *
 * 개인도 계약 구조를 그대로 쓴다. 나라마다 "개인" 기관 하나를 두고 그
 * 아래 선불 계약을 굴리며, 주문 하나가 좌석 하나를 더한다. 새 길을
 * 내지 않는 이유는 **좌석이 이미 "한 장은 한 번만" 을 보장하기**
 * 때문이다 — 응시 시작에서 consumed_at 이 채워지고, 그 규칙은 이미
 * 검사로 지켜지고 있다.
 *
 * 선불이므로 billing_events 는 생기지 않는다. 카드로 이미 받았다.
 */
export async function fulfillOrder(orderNo: string): Promise<Fulfilled | { error: string }> {
  const ready = await canFulfill();
  if (!ready.ok) return { error: "not_ready:" + ready.missing.join(",") };

  const tempPw = await hashPassword(generateTempPassword());
  const setup = createResetToken();

  return tx(async (c) => {
    const o = await c.query<{
      id: string; site: Site; status: string; buyer_email: string; buyer_name: string;
    }>(
      `SELECT id::text, site, status, buyer_email, buyer_name FROM orders
        WHERE order_no = $1 FOR UPDATE`,
      [orderNo],
    );
    if (o.rowCount === 0) return { error: "no_such_order" };
    const ord = o.rows[0];
    if (ord.status === "fulfilled") return { error: "already_fulfilled" };
    if (ord.status !== "paid") return { error: "not_paid:" + ord.status };

    const country = COUNTRY[ord.site] ?? "KR";

    /* 나라별 "개인" 기관. 없으면 만든다 */
    const orgCode = `SELF-${country}`;
    await c.query(
      `INSERT INTO organizations (code, country, org_type)
       VALUES ($1, $2, 'individual') ON CONFLICT (code) DO NOTHING`,
      [orgCode, country],
    );
    const org = await c.query<{ id: string }>(
      `SELECT id::text FROM organizations WHERE code = $1`,
      [orgCode],
    );
    const orgId = org.rows[0].id;

    /* 굴러가는 선불 계약. 좌석은 주문마다 한 장씩 는다.
       계약 행을 잠그고 늘려야 두 주문이 동시에 들어와도 수가 맞는다 */
    let contract = await c.query<{ id: string }>(
      `SELECT id::text FROM contracts
        WHERE org_id = $1 AND billing = 'prepaid' AND status = 'active'
          AND ends_on >= current_date
        ORDER BY id LIMIT 1 FOR UPDATE`,
      [orgId],
    );
    /* 선불 계약은 seat_count > 0 이어야 한다(schema CHECK) — 0장짜리
       선불 계약은 아무도 못 들어오는 계약이라 막아 둔 것이다. 그래서
       첫 주문은 1장으로 만들고, 그 다음부터 한 장씩 더한다 */
    const freshContract = contract.rowCount === 0;
    if (freshContract) {
      contract = await c.query<{ id: string }>(
        `INSERT INTO contracts (org_id, title, starts_on, ends_on, billing, seat_count, currency)
         VALUES ($1, $2, current_date, current_date + interval '5 years', 'prepaid', 1, 'KRW')
         RETURNING id::text`,
        [orgId, `개인 결제 (${country})`],
      );
    }
    const contractId = contract.rows[0].id;

    /* 구매자 계정. 이미 있으면 그대로 쓴다 — 두 번째 구매일 수 있다 */
    await c.query(
      `INSERT INTO users (email, password_hash, display_name, locale, must_reset_pw)
       VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO NOTHING`,
      [ord.buyer_email, tempPw, ord.buyer_name, ord.site === "kr" ? "ko" : "en"],
    );
    const u = await c.query<{ id: string }>(`SELECT id::text FROM users WHERE email = $1`, [
      ord.buyer_email,
    ]);
    const userId = u.rows[0].id;

    await c.query(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING`,
      [userId, orgId],
    );

    /* 비밀번호 설정 링크. 메일에 비밀번호를 적어 보내지 않는다 —
       메일은 남고 전달되므로 비밀번호가 오래 떠돈다 */
    await c.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
      [userId, setup.tokenHash, String(SETUP_TTL_HOURS)],
    );

    /* 좌석 한 장. 계약의 seat_count 도 같이 올려야 장부가 맞는다.
       방금 만든 계약은 이미 1장으로 세어 두었으므로 올리지 않는다 */
    if (!freshContract) {
      await c.query(`UPDATE contracts SET seat_count = seat_count + 1 WHERE id = $1`, [contractId]);
    }
    await c.query(
      `INSERT INTO seats (contract_id, user_id, assigned_at, expires_at)
       VALUES ($1, $2, now(), now() + ($3 || ' days')::interval)`,
      [contractId, userId, String(VALID_DAYS)],
    );

    /* 문항은 공개된 것 중 가장 최근 것 */
    const inst = await c.query<{ id: string }>(
      `SELECT id::text FROM instruments WHERE status = 'published'
        ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 1`,
    );
    if (inst.rowCount === 0) return { error: "no_instrument" };

    /* 회차는 주문마다 하나. 개인 결과가 남의 집계에 섞이지 않는다.
       공개를 막을 담당자가 없으므로 instant 다 — 채점되는 즉시 본인이 본다 */
    const sess = await c.query<{ id: string }>(
      `INSERT INTO test_sessions
         (org_id, contract_id, instrument_id, name, opens_at, closes_at, release_mode, released_at)
       VALUES ($1, $2, $3, $4, now(), now() + ($5 || ' days')::interval, 'instant', now())
       RETURNING id::text`,
      [orgId, contractId, inst.rows[0].id, orderNo, String(VALID_DAYS)],
    );

    await c.query(
      `UPDATE orders SET status = 'fulfilled', fulfilled_at = now(), user_id = $2
        WHERE id = $1`,
      [ord.id, userId],
    );

    return {
      orderNo,
      email: ord.buyer_email,
      name: ord.buyer_name,
      site: ord.site,
      setupToken: setup.token,
      sessionId: sess.rows[0].id,
    };
  });
}

/** 이행하다 막힌 주문. 사람이 아침에 들여다볼 목록이다 */
export async function stuckOrders(): Promise<
  { orderNo: string; status: string; email: string; reason: string | null; paidAt: string | null }[]
> {
  const rows = await query<{
    order_no: string; status: string; buyer_email: string; fail_reason: string | null; paid_at: string | null;
  }>(
    `SELECT order_no, status, buyer_email, fail_reason,
            to_char(paid_at, 'YYYY-MM-DD HH24:MI') AS paid_at
       FROM orders
      WHERE status IN ('paid','failed')
        AND created_at > now() - interval '30 days'
      ORDER BY created_at DESC`,
  );
  return rows.map((r) => ({
    orderNo: r.order_no,
    status: r.status,
    email: r.buyer_email,
    reason: r.fail_reason,
    paidAt: r.paid_at,
  }));
}
