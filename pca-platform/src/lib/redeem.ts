import { createHash, randomInt } from "node:crypto";
import { query, queryOne, tx } from "./db";
import { getProduct } from "./orders";

/**
 * 응시권 코드 — 밖에서 판 것을 안에서 좌석으로 바꾼다.
 *
 * 아임웹 같은 쇼핑몰에서 "응시권" 을 팔고, 주문이 끝나면 코드를 보낸다.
 * 학생이 그 코드를 입력하면 좌석이 생긴다. 결제는 저쪽이 받고 응시는
 * 이쪽이 한다. 쇼핑몰이 바뀌어도 이 파일은 그대로다.
 */

/**
 * 코드 글자판.
 *
 * 사람이 종이에서 읽어 옮겨 적는다. 그래서 **헷갈리는 글자를 뺀다** —
 * 0/O, 1/I/L, 8/B, 5/S, 2/Z. 남은 22자로 12자리면 22^12 ≈ 10^16 이라
 * 찍어서 맞히는 것은 논외다.
 */
const ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";
const GROUPS = 3;
const PER_GROUP = 4;

/** 입력한 코드를 표준형으로 — 공백·하이픈·대소문자를 흡수한다. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashCode(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

/** `Careermetri-7K4M-9XQ2` 꼴. 앞의 브랜드 조각은 사람이 무엇인지 알아보라고 붙인다. */
function newCode(): { display: string; normalized: string } {
  const parts: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let s = "";
    for (let i = 0; i < PER_GROUP; i++) s += ALPHABET[randomInt(ALPHABET.length)];
    parts.push(s);
  }
  const display = parts.join("-");
  return { display, normalized: normalizeCode(display) };
}

export type IssuedCode = { display: string; tail: string };

/**
 * 코드를 만든다. **만들 때 한 번만 평문을 돌려준다.**
 *
 * 임시 비밀번호와 같은 규칙이다 — 저장하는 것은 sha256 뿐이라 "다시
 * 보여주기" 가 없다. DB 가 새도 그대로 공짜 좌석이 되지는 않는다.
 * 여기서 받은 목록을 쇼핑몰 쿠폰이나 자동발송 문구에 넣는다.
 */
export async function issueCodes(opts: {
  productCode: string;
  count: number;
  batch?: string;
  expiresAt?: Date | null;
  externalRef?: string | null;
}): Promise<IssuedCode[]> {
    // getProduct 는 active 인 것만 돌려준다. 꺼 둔 상품으로 코드를 찍어 두면
  // 켜는 날까지 못 쓰는 종이가 된다
  const product = await getProduct(opts.productCode);
  if (!product) throw new Error("팔지 않는 상품입니다.");
  /**
   * **좌석을 주지 않는 상품으로는 코드를 찍지 않는다.**
   *
   * 업그레이드(`HS_UPGRADE`·`UNIV_UPGRADE`)는 좌석이 0이다 — 이미 응시를
   * 끝낸 사람의 **그 응시**를 여는 결제라, 어느 응시를 여는지
   * (`orders.upgrades_attempt_id`)가 있어야 열 수 있다. 종이 코드에는
   * 그것을 담을 자리가 없다.
   *
   * 막지 않으면 이렇게 된다 — 학부모가 쇼핑몰에서 19,000원을 내고, 받은
   * 코드를 넣으면 화면은 "교환됐습니다" 라고 하고, 좌석도 결과지도
   * 생기지 않는다. 돈만 건너가고 아무 일도 일어나지 않는 것이 가장 나쁘다.
   */
  if (product.seat_count < 1) {
    throw new Error(
      `${product.code} 는 코드로 팔 수 없습니다. 이 상품은 이미 끝낸 응시 하나를 여는 결제라, ` +
      `어느 응시인지를 코드가 담지 못합니다. 쇼핑몰에는 응시권(좌석이 나오는 상품)만 올립니다.`,
    );
  }
  if (opts.count < 1 || opts.count > 2000) throw new Error("한 번에 1~2000장까지 만듭니다.");

  const made: IssuedCode[] = [];
  for (let i = 0; i < opts.count; i++) {
    // 충돌은 사실상 없지만, 났을 때 조용히 한 장 모자란 것보다 다시 뽑는 편이 낫다
    for (let attempt = 0; ; attempt++) {
      const { display, normalized } = newCode();
      const row = await queryOne<{ id: string }>(
        `INSERT INTO redemption_codes (code_hash, code_tail, product_code, batch, external_ref, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code_hash) DO NOTHING
         RETURNING id`,
        [
          hashCode(normalized),
          normalized.slice(-4),
          product.code,
          opts.batch ?? null,
          opts.externalRef ?? null,
          opts.expiresAt ?? null,
        ],
      );
      if (row) {
        made.push({ display, tail: normalized.slice(-4) });
        break;
      }
      if (attempt >= 5) throw new Error("코드를 만들지 못했습니다.");
    }
  }
  return made;
}

export type RedeemFail =
  | "unknown"    // 그런 코드가 없다
  | "used"       // 이미 쓴 코드
  | "voided"     // 취소된 코드
  | "expired"    // 기간이 지났다
  | "inactive";  // 그 사이 상품이 꺼졌다

export type RedeemResult =
  | { ok: true; orderId: string; productCode: string }
  | { ok: false; reason: RedeemFail };

/**
 * 코드를 좌석으로 바꾼다.
 *
 * **금액을 0 으로 적는다.** 돈은 쇼핑몰 장부에 있다. 여기에 19,000 을 또
 * 적으면 같은 매출이 두 번 잡힌다. 무엇으로 팔렸는지는
 * `orders.redemption_code_id` 가 들고 있다.
 *
 * **한 코드가 두 번 쓰이지 않는 것은 UPDATE 가 보장한다.** 먼저 읽고
 * 판단한 뒤 쓰면, 같은 코드로 두 사람이 동시에 눌렀을 때 둘 다 통과한다.
 * `WHERE used_at IS NULL` 을 UPDATE 조건에 넣어 **이긴 쪽만 줄을 가져간다.**
 */
export async function redeemCode(userId: string, raw: string): Promise<RedeemResult> {
  const normalized = normalizeCode(raw);
  if (!normalized) return { ok: false, reason: "unknown" };

  const found = await queryOne<{
    id: string;
    product_code: string;
    used_at: string | null;
    voided_at: string | null;
    expired: boolean;
  }>(
    `SELECT id, product_code, used_at, voided_at,
            (expires_at IS NOT NULL AND expires_at <= now()) AS expired
       FROM redemption_codes WHERE code_hash = $1`,
    [hashCode(normalized)],
  );
  if (!found) return { ok: false, reason: "unknown" };
  if (found.voided_at) return { ok: false, reason: "voided" };
  if (found.used_at) return { ok: false, reason: "used" };
  if (found.expired) return { ok: false, reason: "expired" };

    // 코드를 찍은 뒤 상품을 꺼 버린 경우다. 좌석을 주면 안 되고, 왜 안 되는지
  // 화면이 말해 줘야 한다 — "코드가 틀렸다" 로 뭉개면 산 사람이 자기를 의심한다
  const product = await getProduct(found.product_code);
  if (!product) return { ok: false, reason: "inactive" };
  // 가드를 세우기 전에 찍힌 코드가 남아 있을 수 있다. 여기서도 한 번 더
  // 막는다 — 돈만 건너가고 아무것도 안 생기는 것보다 거절이 낫다
  if (product.seat_count < 1) return { ok: false, reason: "inactive" };

  const orderNo = `R${Date.now().toString(36)}${normalized.slice(-4)}`.toUpperCase();
  const orderId = await tx(async (c) => {
    // 이 UPDATE 가 문이다. 0줄이면 남이 먼저 썼다는 뜻이라 아무것도 만들지 않는다
    const claimed = await c.query(
      `UPDATE redemption_codes
          SET used_by = $1, used_at = now()
        WHERE id = $2 AND used_at IS NULL AND voided_at IS NULL
        RETURNING id`,
      [userId, found.id],
    );
    if (claimed.rowCount === 0) return null;

    const o = await c.query<{ id: string }>(
      `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at, redemption_code_id)
       VALUES ($1, $2, $3, 0, $4, 'paid', now(), $5)
       RETURNING id`,
      [orderNo, userId, product.code, product.currency, found.id],
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
    await c.query(`UPDATE redemption_codes SET order_id = $1 WHERE id = $2`, [id, found.id]);
    return id;
  });

  if (!orderId) return { ok: false, reason: "used" };
  return { ok: true, orderId, productCode: product.code };
}

/** 한 묶음이 어떻게 쓰였는지. 평문은 어디에도 없다. */
export async function batchStatus(batch: string) {
  return query<{ product_code: string; total: number; used: number; voided: number }>(
    `SELECT product_code,
            count(*)::int AS total,
            count(*) FILTER (WHERE used_at IS NOT NULL)::int AS used,
            count(*) FILTER (WHERE voided_at IS NOT NULL)::int AS voided
       FROM redemption_codes WHERE batch = $1 GROUP BY product_code`,
    [batch],
  );
}

/** 잘못 판 묶음을 막는다. 이미 쓴 코드는 건드리지 않는다. */
export async function voidBatch(batch: string): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE redemption_codes SET voided_at = now()
      WHERE batch = $1 AND used_at IS NULL AND voided_at IS NULL
      RETURNING id`,
    [batch],
  );
  return rows.length;
}
