import { randomBytes } from "node:crypto";
import { query, queryOne, tx } from "@/lib/db";
import { paymentProvider, type CheckoutTicket, type PaymentFact, type PayRegion } from "@/lib/payments";

export type Product = {
  code: string;
  kind: string;
  amount: number;
  currency: string;
  seat_count: number;
  /** free = 지표까지만 · full = 사슬과 과목 처방까지 */
  report_level: "free" | "full";
};

export type Order = {
  id: string;
  order_no: string;
  user_id: string;
  product_code: string;
  amount: number;
  currency: string;
  status: string;
};

const NAMES: Record<string, string> = {
  REPORT_UNIV: "METRI 진로 결과지 (대학)",
  REPORT_HS: "METRI 진로 결과지 (고교)",
};

export function orderName(code: string): string {
  return NAMES[code] ?? "METRI 진로 결과지";
}

export async function getProduct(code: string): Promise<Product | null> {
  return queryOne<Product>(
    `SELECT code, kind, amount, currency, seat_count, report_level
       FROM products WHERE code = $1 AND active`,
    [code],
  );
}

/**
 * 주문을 만들고 결제창에 넘길 값을 돌려준다.
 *
 * **금액은 여기서만 정해진다.** 화면에서 넘어온 금액을 쓰지 않는다 —
 * 그렇게 하면 개발자 도구에서 29000 을 100 으로 고쳐 결제할 수 있다.
 */
export async function startCheckout(
  userId: string,
  productCode: string,
  origin: string,
  region: PayRegion = "domestic",
  /**
   * 이미 무료로 본 응시를 여는 결제라면 그 응시 번호.
   *
   * "가장 최근 응시" 로 추측하지 않는다 — 학생이 두 번 봤으면 어느 쪽을
   * 열지 알 수 없고, 틀린 쪽을 열면 돈을 받고 아무것도 안 준 셈이 된다.
   * 남의 응시 번호를 넣어도 자기 것이 아니면 여기서 걸린다.
   */
  upgradesAttemptId?: string,
): Promise<{ order: Order; ticket: CheckoutTicket }> {
  const product = await getProduct(productCode);
  if (!product) throw new Error("판매하지 않는 상품입니다.");

  if (upgradesAttemptId) {
    const mine = await queryOne<{ id: string }>(
      `SELECT id FROM attempts WHERE id = $1 AND user_id = $2 AND status = 'scored'`,
      [upgradesAttemptId, userId],
    );
    if (!mine) throw new Error("본인의 채점 완료된 응시가 아닙니다.");
  }

  // 영문·숫자만. PortOne paymentId 규칙에 맞춘다 (40자 이내)
  const orderNo = `M${Date.now().toString(36)}${randomBytes(5).toString("hex")}`.toUpperCase();

  const order = await queryOne<Order>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, currency, upgrades_attempt_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, order_no, user_id, product_code, amount, currency, status`,
    [orderNo, userId, product.code, product.amount, product.currency, upgradesAttemptId ?? null],
  );
  if (!order) throw new Error("주문을 만들지 못했습니다.");

  const ticket = await paymentProvider().ticket({
    orderNo,
    orderName: orderName(product.code),
    amount: product.amount,
    currency: product.currency,
    redirectUrl: `${origin}/checkout/complete?order=${orderNo}`,
    region,
  });

  return { order, ticket };
}

export type SettleResult =
  | {
      ok: true;
      orderNo: string;
      alreadyDone: boolean;
      /**
       * 업그레이드 결제였으면 열린 응시 번호, 새 응시권 결제였으면 null.
       *
       * 완료 화면이 이 값을 본다. 두 결제의 결과가 다르기 때문이다 —
       * 하나는 풀 검사가 생기고, 하나는 이미 낸 결과지가 넓어진다.
       * 둘을 같은 문장으로 안내하면 업그레이드한 사람에게 "지금 바로
       * 시작하실 수 있습니다" 라고 말하게 되고, 시작할 것이 없다.
       */
      upgradedAttemptId: string | null;
    }
  | { ok: false; reason: string };

/**
 * PG 에 직접 물어보고 주문을 확정한다.
 *
 * 리다이렉트로도 웹훅으로도 같은 함수가 불린다. 두 번 불려도 좌석은 하나만 생긴다 —
 * payments 의 UNIQUE(provider, provider_payment_id) 와 seats 의 부분 UNIQUE 인덱스가
 * 그걸 DB 차원에서 막고, 여기서는 그 위에 트랜잭션을 덮는다.
 */
export async function settlePayment(providerPaymentId: string): Promise<SettleResult> {
  const provider = paymentProvider();

  let fact: PaymentFact;
  try {
    fact = await provider.fetchPayment(providerPaymentId);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "결제 조회에 실패했습니다." };
  }

  const orderNo = fact.orderNo ?? providerPaymentId.replace(/^mock_/, "");
  const order = await queryOne<Order>(
    `SELECT id, order_no, user_id, product_code, amount, currency, status
       FROM orders WHERE order_no = $1`,
    [orderNo],
  );
  if (!order) return { ok: false, reason: "주문을 찾을 수 없습니다." };

  if (fact.status !== "paid") {
    await query(
      `UPDATE orders SET status = $2 WHERE id = $1 AND status = 'pending'`,
      [order.id, fact.status === "ready" ? "pending" : fact.status],
    );
    return { ok: false, reason: `결제가 완료되지 않았습니다 (${fact.status}).` };
  }

  // 금액 대조. PG 가 승인한 금액이 주문 금액과 다르면 확정하지 않는다.
  if (fact.amount !== order.amount) {
    await query(`UPDATE orders SET status = 'failed' WHERE id = $1`, [order.id]);
    return {
      ok: false,
      reason: `승인 금액이 주문 금액과 다릅니다 (주문 ${order.amount} / 승인 ${fact.amount}).`,
    };
  }

  const product = await getProduct(order.product_code);
  const seatCount = product?.seat_count ?? 1;

  return tx(async (c) => {
    /**
     * 업그레이드 결제인가, 새 응시권 결제인가.
     *
     * 업그레이드면 좌석을 발급하지 않는다 — 새로 풀 문항이 없고, 좌석을
     * 주면 학생이 115문항을 한 번 더 풀 수 있게 되어 규준이 오염된다.
     * 대신 report_grants 에 줄을 남겨 그 응시의 유료 구간을 연다.
     *
     * 중복 확정 검사보다 먼저 읽는다. 두 번째 호출(웹훅과 리다이렉트가
     * 겹칠 때)도 완료 화면을 그려야 하고, 그 화면은 이 값이 있어야
     * 맞는 문장을 고른다.
     */
    const up = await c.query<{ upgrades_attempt_id: string | null }>(
      `SELECT upgrades_attempt_id FROM orders WHERE id = $1`,
      [order.id],
    );
    const attemptId = up.rows[0]?.upgrades_attempt_id ?? null;
    const isUpgrade = !!attemptId && product?.report_level === "full";

    // 이미 확정된 결제면 아무것도 더 하지 않는다
    const dup = await c.query(
      `SELECT id FROM payments WHERE provider = $1 AND provider_payment_id = $2`,
      [provider.name, fact.providerPaymentId],
    );
    if (dup.rowCount) {
      return {
        ok: true as const,
        orderNo: order.order_no,
        alreadyDone: true,
        upgradedAttemptId: isUpgrade ? attemptId : null,
      };
    }

    await c.query(
      `INSERT INTO payments (order_id, provider, provider_payment_id, status, amount, method, raw)
       VALUES ($1, $2, $3, 'paid', $4, $5, $6)`,
      [order.id, provider.name, fact.providerPaymentId, fact.amount, fact.method ?? null, fact.raw],
    );

    await c.query(
      `UPDATE orders SET status = 'paid', paid_at = now() WHERE id = $1 AND status <> 'paid'`,
      [order.id],
    );

    if (isUpgrade) {
      await c.query(
        `INSERT INTO report_grants (attempt_id, order_id, level)
         VALUES ($1, $2, 'full')
         ON CONFLICT (attempt_id) DO NOTHING`,
        [attemptId, order.id],
      );
    } else {
      // 좌석 발급. 계약 없이 주문에 붙는다
      for (let i = 0; i < seatCount; i++) {
        await c.query(
          `INSERT INTO seats (contract_id, order_id, user_id, assigned_at)
           VALUES (NULL, $1, $2, now())
           ON CONFLICT DO NOTHING`,
          [order.id, order.user_id],
        );
      }
    }

    return {
      ok: true as const,
      orderNo: order.order_no,
      alreadyDone: false,
      upgradedAttemptId: isUpgrade ? attemptId : null,
    };
  });
}

/**
 * 무료 진단을 연다 — 결제창을 거치지 않는다.
 *
 * 금액이 0원인 상품은 PG 를 태울 것이 없다. 그런데 좌석·회차·응시는
 * 유료와 똑같은 길을 타야 한다(설계 원칙: 좌석 하나 = 응시 하나).
 * 그래서 **0원 주문을 만들어 바로 paid 로 확정하고 좌석을 발급한다.**
 * 무료 전용 경로를 따로 파면 유료 경로만 고치고 무료를 잊는 일이 생긴다.
 *
 * 한 사람에게 한 번만 준다. 무료를 무한히 받을 수 있으면 유료 구간을
 * 살 이유가 사라지는 것이 아니라 — 무료 응시가 쌓여 규준이 오염된다.
 * 두 번째부터는 이미 만든 무료 주문을 그대로 돌려준다.
 */
export async function openFreeOrder(
  userId: string,
  productCode = "HS_FREE",
): Promise<{ orderId: string; reused: boolean }> {
  const product = await getProduct(productCode);
  if (!product) throw new Error("판매하지 않는 상품입니다.");
  if (product.amount !== 0) throw new Error("무료 상품이 아닙니다.");

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM orders
      WHERE user_id = $1 AND product_code = $2 AND status = 'paid'
      ORDER BY id LIMIT 1`,
    [userId, productCode],
  );
  if (existing) return { orderId: existing.id, reused: true };

  const orderNo = `F${Date.now().toString(36)}${randomBytes(5).toString("hex")}`.toUpperCase();
  const orderId = await tx(async (c) => {
    const o = await c.query<{ id: string }>(
      `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at)
       VALUES ($1, $2, $3, 0, $4, 'paid', now())
       RETURNING id`,
      [orderNo, userId, product.code, product.currency],
    );
    const id = o.rows[0].id;
    for (let i = 0; i < product.seat_count; i++) {
      await c.query(
        `INSERT INTO seats (contract_id, order_id, user_id, assigned_at)
         VALUES (NULL, $1, $2, now())
         ON CONFLICT DO NOTHING`,
        [id, userId],
      );
    }
    return id;
  });
  return { orderId, reused: false };
}
