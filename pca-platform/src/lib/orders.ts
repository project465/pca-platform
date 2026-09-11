import { randomBytes } from "node:crypto";
import { query, queryOne, tx } from "@/lib/db";
import { paymentProvider, type CheckoutTicket, type PaymentFact, type PayRegion } from "@/lib/payments";

export type Product = {
  code: string;
  kind: string;
  amount: number;
  currency: string;
  seat_count: number;
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
    `SELECT code, kind, amount, currency, seat_count FROM products WHERE code = $1 AND active`,
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
): Promise<{ order: Order; ticket: CheckoutTicket }> {
  const product = await getProduct(productCode);
  if (!product) throw new Error("판매하지 않는 상품입니다.");

  // 영문·숫자만. PortOne paymentId 규칙에 맞춘다 (40자 이내)
  const orderNo = `M${Date.now().toString(36)}${randomBytes(5).toString("hex")}`.toUpperCase();

  const order = await queryOne<Order>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, currency)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, order_no, user_id, product_code, amount, currency, status`,
    [orderNo, userId, product.code, product.amount, product.currency],
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
  | { ok: true; orderNo: string; alreadyDone: boolean }
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
    // 이미 확정된 결제면 아무것도 더 하지 않는다
    const dup = await c.query(
      `SELECT id FROM payments WHERE provider = $1 AND provider_payment_id = $2`,
      [provider.name, fact.providerPaymentId],
    );
    if (dup.rowCount) {
      return { ok: true as const, orderNo: order.order_no, alreadyDone: true };
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

    // 좌석 발급. 계약 없이 주문에 붙는다
    for (let i = 0; i < seatCount; i++) {
      await c.query(
        `INSERT INTO seats (contract_id, order_id, user_id, assigned_at)
         VALUES (NULL, $1, $2, now())
         ON CONFLICT DO NOTHING`,
        [order.id, order.user_id],
      );
    }

    return { ok: true as const, orderNo: order.order_no, alreadyDone: false };
  });
}
