import { randomBytes } from "node:crypto";
import { query, queryOne, tx } from "@/lib/db";
import {
  matchesOrder, paymentProvider,
  type CheckoutTicket, type PaymentFact, type PayRegion,
} from "@/lib/payments";
import { enqueue } from "@/lib/outbox";
import { track } from "@/lib/funnel";

export type Product = {
  code: string;
  kind: string;
  amount: number;
  currency: string;
  seat_count: number;
  /** free = 지표까지만 · full = 사슬과 과목 처방까지 */
  report_level: "free" | "full";
  /** ME_V2 면 좌석 대신 이용권이 생긴다. 없으면 옛 상품이다 */
  assessment_version: string | null;
  tier: string | null;
  major_code: string | null;
  /** 어느 시장의 상품인가. 되돌아오는 주소를 이 값으로 고른다 */
  market: string | null;
  /** 값이 승인됐는가. **금액만 보고 무료로 열지 않는다** */
  price_status: "approved" | "not_approved";
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
  REPORT_UNIV: "CareerMatri 진로 결과지 (대학)",
  REPORT_HS: "CareerMatri 진로 결과지 (고교)",
};

export function orderName(code: string): string {
  return NAMES[code] ?? "CareerMatri 진로 결과지";
}

export async function getProduct(code: string): Promise<Product | null> {
  return queryOne<Product>(
    `SELECT code, kind, amount, currency, seat_count, report_level,
            assessment_version, tier, major_code, market, price_status
       FROM products WHERE code = $1 AND active`,
    [code],
  );
}

/**
 * 주문을 만들고 결제창에 넘길 값을 돌려준다.
 *
 * **금액은 여기서만 정해진다.** 화면에서 넘어온 금액을 쓰지 않는다.
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
   * "가장 최근 응시" 로 추측하지 않는다. 학생이 두 번 봤으면 어느 쪽을
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

  /**
   * 되돌아오는 주소는 **정규 주소**다.
   *
   * 대행사가 결제를 끝내고 돌려보내는 자리라, 지금 요청이 들어온
   * 호스트를 그대로 쓰면 staging 에서 시작한 결제가 staging 으로
   * 돌아온다. 정규 주소가 없을 때만 지금 호스트로 되돌린다(개발).
   */
  const { publicBase } = await import("@/lib/urls");
  const base = (await publicBase(product.market === "GLOBAL" ? "GLOBAL" : "KR")
    .catch(() => null))
    ?? origin.replace(/\/$/, "");

  const ticket = await paymentProvider().createCheckout({
    orderNo,
    orderName: orderName(product.code),
    amount: product.amount,
    currency: product.currency,
    redirectUrl: `${base}/checkout/complete?order=${orderNo}`,
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
       * 완료 화면이 이 값을 본다. 두 결제의 결과가 다르기 때문이다.
       * 하나는 풀 검사가 생기고, 하나는 이미 낸 결과지가 넓어진다.
       * 둘을 같은 문장으로 안내하면 업그레이드한 사람에게 "지금 바로
       * 시작하실 수 있습니다" 라고 말하게 되고, 시작할 것이 없다.
       */
      upgradedAttemptId: string | null;
      /**
       * 이 결제가 어느 검사의 이용권을 만들었는가.
       *
       * 완료 화면이 다음에 보낼 곳을 이 값으로 고른다. ME_V2 는
       * `/assessment/start` 고 옛 검사는 `/test` 다. **화면이 상품 코드를
       * 보고 짐작하지 않는다**: 코드 규칙은 상품이 늘 때마다 바뀌고,
       * 짐작이 틀리면 돈을 낸 사람이 빈 화면을 만난다.
       */
      assessmentVersion: string | null;
      /** 산 등급. 완료 화면이 적기만 한다 */
      tier: string | null;
    }
  | { ok: false; reason: string };

/**
 * PG 에 직접 물어보고 주문을 확정한다.
 *
 * 리다이렉트로도 웹훅으로도 같은 함수가 불린다. 두 번 불려도 좌석은 하나만 생긴다.
 * payments 의 UNIQUE(provider, provider_payment_id) 와 seats 의 부분 UNIQUE 인덱스가
 * 그걸 DB 차원에서 막고, 여기서는 그 위에 트랜잭션을 덮는다.
 */
export async function settlePayment(providerPaymentId: string): Promise<SettleResult> {
  const provider = paymentProvider();

  let fact: PaymentFact;
  try {
    fact = await provider.getPaymentStatus(providerPaymentId);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "결제 조회에 실패했습니다." };
  }

  const orderNo = fact.orderNo ?? providerPaymentId.replace(/^mock_/, "");
  /* 받는 사람의 언어를 **여기서 함께 읽는다.** 보낼 때는 그 사람이
     화면에 없어서 고를 수 없다(`outbox.enqueue` 의 locale 주석) */
  const order = await queryOne<Order & { locale: string | null }>(
    `SELECT o.id, o.order_no, o.user_id, o.product_code, o.amount, o.currency,
            o.status, u.locale
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.order_no = $1`,
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

  /* 금액과 통화를 대조한다. **대조는 `payments/verify.ts` 한 곳이다** */
  const match = matchesOrder(fact, { amount: order.amount, currency: order.currency });
  if (!match.ok) {
    await query(`UPDATE orders SET status = 'failed' WHERE id = $1`, [order.id]);
    return { ok: false, reason: match.reason };
  }
  const paidCur = (fact.currency || "").trim().toUpperCase();
  const wantCur = (order.currency || "").trim().toUpperCase();

  const product = await getProduct(order.product_code);
  const seatCount = product?.seat_count ?? 1;

  const done = await tx(async (c) => {
    /**
     * 업그레이드 결제인가, 새 응시권 결제인가.
     *
     * 업그레이드면 좌석을 발급하지 않는다. 새로 풀 문항이 없고, 좌석을
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
        assessmentVersion: product?.assessment_version ?? null,
        tier: product?.tier ?? null,
      };
    }

    await c.query(
      `INSERT INTO payments
         (order_id, provider, provider_payment_id, status, amount, currency, method, raw)
       VALUES ($1, $2, $3, 'paid', $4, $5, $6, $7)`,
      [order.id, provider.name, fact.providerPaymentId, fact.amount,
       paidCur || wantCur || null, fact.method ?? null, fact.raw],
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
    } else if (product?.assessment_version === "ME_V2") {
      /**
       * ME_V2 는 좌석 대신 **이용권**이 문을 연다.
       *
       * 좌석은 기관 계약의 단위라 계약 없이 쓰면 숫자가 어디에도 안 잡힌다.
       * 개인 결제는 `entitlements` 한 줄이고, 그 줄이 어느 등급을 여는지를
       * 들고 있다. 주소의 `?tier=PRO` 가 여기까지 오지 못한다.
       *
       * **중복 웹훅이 둘째 줄을 만들지 않는다**: `entitlements_order_uniq`
       * 가 주문 하나에 이용권 하나를 DB 에서 못 박는다. 코드의 if 로 막으면
       * 고쳐 쓰다 빠뜨릴 수 있다.
       */
      await c.query(
        `INSERT INTO entitlements
           (user_id, order_id, product_code, kind, tier, major_code,
            assessment_version, status, starts_at)
         VALUES ($1, $2, $3, 'report', $4, $5, 'ME_V2', 'active', now())
         ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO NOTHING`,
        [order.user_id, order.id, order.product_code,
         product.tier ?? "BASIC", product.major_code ?? "ME"],
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
      assessmentVersion: product?.assessment_version ?? null,
      tier: product?.tier ?? null,
    };
  });

  /**
   * 알림은 **거래가 끝난 뒤에** 적는다. 트랜잭션 안에서 적으면 되돌아간
   * 결제에도 "결제가 확인됐습니다" 가 나가고, 메일 쪽이 느린 날 결제
   * 확정이 그만큼 늦어진다. enqueue 는 실패해도 던지지 않는다.
   */
  if (done.ok && !done.alreadyDone) {
    /* **결제 확인 메일은 모든 결제에 나간다.** 업그레이드만 알리고 응시권
       결제를 조용히 두면, 산 사람은 영수 한 통도 못 받는다(규격 §14) */
    await enqueue({
      kind: "purchase_done",
      userId: order.user_id,
      payload: { orderNo: done.orderNo },
      dedupeKey: `purchase_done:${order.id}`,
      locale: order.locale ?? null,
    });
    /* 퍼널. **결제가 확정된 순간만 센다**: 결제창을 연 것은 따로 센다 */
    await track("purchase", {
      userId: order.user_id,
      props: {
        product: order.product_code,
        tier: done.tier ?? undefined,
        market: order.currency?.trim() === "KRW" ? "KR" : "GLOBAL",
      },
    });
  }

  if (done.ok && !done.alreadyDone && done.upgradedAttemptId) {
    /* 넓어진 **그 응시**를 본 언어로 보낸다. 결과지가 그 언어로
       나갔으니 알림도 같은 언어여야 한다 */
    const lang = await queryOne<{ lang: string | null }>(
      `SELECT interface_language AS lang FROM attempts WHERE id = $1`,
      [done.upgradedAttemptId],
    ).catch(() => null);
    await enqueue({
      kind: "upgrade_done",
      userId: order.user_id,
      payload: { orderNo: done.orderNo },
      dedupeKey: `upgrade_done:${order.id}`,
      locale: lang?.lang ?? null,
    });
  }
  return done;
}

/**
 * 무료 상품을 연다. 결제창을 거치지 않는다.
 *
 * 금액이 0원인 상품은 PG 를 태울 것이 없다. 그런데 좌석·이용권·응시는
 * 유료와 똑같은 길을 타야 한다(설계 원칙: 좌석 하나 = 응시 하나).
 * 그래서 **0원 주문을 만들어 바로 paid 로 확정하고** 상품 종류에 맞는
 * 문을 연다. 무료 전용 경로를 따로 파면 유료 경로만 고치고 무료를
 * 잊는 일이 생긴다.
 *
 * **승인된 무료만 연다.** 값을 아직 못 정한 0원(`PRICE_NOT_APPROVED`)은
 * 여기서 거절한다. 둘이 표에서 같은 모양이라, 금액만 보고 열면 값을 못
 * 정한 상품이 공짜로 나간다.
 *
 * **한 사람에게 한 번만 준다.** 무료 응시가 쌓이면 같은 사람의 응답이 두
 * 벌이 되어 규준이 오염된다. 막는 자리는 **DB 의 유일 제약**이다: 주문 번호를 사람과 상품으로 정해 두면, 두 요청이 같은 순간에
 * 들어와도 두 번째가 그 자리에서 거절된다. 읽고 나서 쓰면 둘 다 통과한다.
 */
export async function openFreeOrder(
  userId: string,
  productCode = "HS_FREE",
): Promise<{ orderId: string; reused: boolean }> {
  const product = await getProduct(productCode);
  if (!product) throw new Error("판매하지 않는 상품입니다.");
  if (product.amount !== 0) throw new Error("무료 상품이 아닙니다.");

  const { priceState } = await import("@/lib/catalog");
  const state = priceState({
    amount: product.amount, price_status: product.price_status,
  });
  if (state !== "FREE_APPROVED") {
    throw new Error("승인된 무료 상품이 아닙니다.");
  }

  /* 사람과 상품으로 정해지는 번호. 영문·숫자 40자 안이다 */
  const compact = productCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const orderNo = `F${userId}${compact}`.slice(0, 40);

  const made = await tx(async (c) => {
    const o = await c.query<{ id: string }>(
      `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at)
       VALUES ($1, $2, $3, 0, $4, 'paid', now())
       ON CONFLICT (order_no) DO NOTHING
       RETURNING id`,
      [orderNo, userId, product.code, product.currency],
    );
    /* 두 번째 요청이다. 이미 만든 주문을 그대로 쓴다 */
    if (!o.rows[0]) return null;
    const id = o.rows[0].id;

    if (product.assessment_version === "ME_V2") {
      /**
       * ME_V2 는 좌석이 아니라 **이용권**이 문을 연다.
       *
       * 어느 등급을 여는지는 **상품이 정한다.** 화면이 보낸 값이 여기까지
       * 오지 못하므로, 주소에 `?tier=PRO` 를 적어도 무료로 PRO 가 열리지
       * 않는다(유료 경로와 같은 규칙이다).
       */
      await c.query(
        `INSERT INTO entitlements
           (user_id, order_id, product_code, kind, tier, major_code,
            assessment_version, status, starts_at)
         VALUES ($1, $2, $3, 'report', $4, $5, 'ME_V2', 'active', now())
         ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO NOTHING`,
        [userId, id, product.code, product.tier ?? "BASIC", product.major_code ?? "ME"],
      );
    } else {
      for (let i = 0; i < product.seat_count; i++) {
        await c.query(
          `INSERT INTO seats (contract_id, order_id, user_id, assigned_at)
           VALUES (NULL, $1, $2, now())
           ON CONFLICT DO NOTHING`,
          [id, userId],
        );
      }
    }
    return id;
  });

  if (made) return { orderId: made, reused: false };

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM orders WHERE order_no = $1`, [orderNo],
  );
  if (!existing) throw new Error("무료 주문을 만들지 못했습니다.");
  return { orderId: existing.id, reused: true };
}
