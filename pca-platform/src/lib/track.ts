import type { PoolClient } from "pg";
import { query, queryOne } from "@/lib/db";

/**
 * CareerMatri Track 의 권한을 읽고 쓰는 한 곳.
 *
 * **Track 은 결과지 등급이 아니다.** 결과지에서 무엇이 보이는지는
 * `entitlement.ts` 의 `reportLevel()` 하나가 정하고, 여기는 그 뒤에 쌓이는
 * 기능(관심 산업·직무 다시 고르기 같은)이 열려 있는지만 답한다. 둘을 한
 * 함수에 담으면 구독이 끝난 날 이미 산 결과지까지 닫히는 줄이 생긴다.
 *
 * **기간은 상품이 정한다**(`products.duration_days`). 화면이 보낸 날짜를
 * 쓰지 않는 것은 금액을 화면에서 받지 않는 것과 같은 까닭이다.
 *
 * **끝에서 이어 붙인다.** 살아 있는 기간이 남아 있는데 지금부터 30일로
 * 덮어쓰면 산 것을 뺏는 셈이 된다. 새 줄은 지금 살아 있는 줄 가운데 가장
 * 늦게 끝나는 날에서 시작한다. 그래서 `starts_at` 이 미래인 줄이 생기고,
 * 읽는 쪽과 환불 쪽이 그것을 견뎌야 한다.
 */

export const TRACK_PRODUCTS = ["TRACK_30D", "TRACK_365D"] as const;
/** 해외판(영어 작업공간). 값이 승인되기 전에는 결제가 열리지 않는다(`startCheckout`) */
export const TRACK_PRODUCTS_GL = ["TRACK_30D_GL", "TRACK_365D_GL"] as const;

/** 그 사람이 살 수 있는 기간권. 작업공간 언어가 정한다(`wsLang`) */
export function trackProductsFor(lang: "ko" | "en"): readonly string[] {
  return lang === "en" ? TRACK_PRODUCTS_GL : TRACK_PRODUCTS;
}

/**
 * **MAT 은 검사 결과 위에서 돈다.** 브리핑의 할 일 · 공고 맞대기 · 문장
 * 뼈대가 전부 결과와 경험을 읽어서, 결과가 없는 사람에게 팔면 빈 화면을 산
 * 것이 된다. 그래서 기간권은 무료 검사(BASIC)라도 한 번 끝낸 사람에게만
 * 판다. 화면이 막고(`/me/track`) 결제를 여는 자리가 한 번 더 막는다.
 */
export async function hasV3Result(userId: string): Promise<boolean> {
  const r = await queryOne<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
        WHERE a.user_id = $1 AND s.result_model IS NOT NULL) AS ok`,
    [userId]).catch(() => null);
  return Boolean(r?.ok);
}
export const TRACK_TRIAL = "TRACK_PRO_TRIAL";

export type TrackState = {
  /** 지금 열려 있는가 */
  on: boolean;
  /** 지금 줄이 끝나는 때. 이어 붙인 줄까지 더한 가장 늦은 날 */
  until: string | null;
  /** 지금 줄의 상품. 첫 한 달이면 TRACK_PRO_TRIAL */
  product: string | null;
  /** 앞으로 이어 붙어 있는 줄이 있는가(미리 산 기간) */
  queued: boolean;
};

const OFF: TrackState = { on: false, until: null, product: null, queued: false };

/**
 * 지금 Track 이 열려 있는가.
 *
 * **못 읽으면 닫힌 쪽으로 떨어진다.** 등급을 못 가리면 덜 주는 쪽으로
 * 떨어지는 것과 같은 까닭이다(설계 원칙 10). 다만 그 사실을 화면이 알
 * 수 있도록 던지지 않고 닫힌 상태를 돌려준다: 이 값 하나 때문에 홈과
 * 탐색이 오류 화면이 되면 안 된다.
 */
export async function activeTrack(userId: string): Promise<TrackState> {
  const rows = await query<{
    product_code: string; starts_at: string; ends_at: string; live: boolean;
  }>(
    `SELECT product_code, starts_at::text, ends_at::text,
            (starts_at <= now()) AS live
       FROM entitlements
      WHERE user_id = $1 AND kind = 'track' AND status = 'active'
        AND ends_at > now()
      ORDER BY starts_at`,
    [userId],
  ).catch(() => null);
  if (!rows || !rows.length) return OFF;
  const now = rows.find((r) => r.live);
  if (!now) {
    /* 미리 산 기간만 있고 지금 줄이 없다. 한 줄도 비지 않게 이어 붙이므로
       정상 흐름에서는 생기지 않지만, 앞 줄을 환불한 날 생길 수 있다 */
    return { on: false, until: rows[rows.length - 1].ends_at, product: rows[0].product_code, queued: true };
  }
  return {
    on: true,
    until: rows[rows.length - 1].ends_at,
    product: now.product_code,
    queued: rows.length > 1,
  };
}

/** 지난 줄까지 전부. `내 구독` 화면이 기록을 적는다 */
export async function trackHistory(userId: string): Promise<{
  product_code: string; starts_at: string; ends_at: string;
  status: string; order_no: string | null; amount: number | null;
}[]> {
  return query(
    `SELECT e.product_code, e.starts_at::text, e.ends_at::text, e.status,
            o.order_no, o.amount
       FROM entitlements e LEFT JOIN orders o ON o.id = e.order_id
      WHERE e.user_id = $1 AND e.kind = 'track'
      ORDER BY e.starts_at DESC`,
    [userId],
  );
}

/**
 * 결제가 확정된 Track 주문에 기간 한 줄을 붙인다. **거래 안에서** 부른다.
 *
 * 같은 주문이 두 번 들어와도 줄은 하나다: `entitlements_order_uniq` 가
 * 주문 하나에 이용권 하나를 못 박는다(중복 웹훅을 코드의 if 로 막지 않는다).
 */
export async function grantTrackTx(
  c: PoolClient,
  o: { userId: string; orderId: string; productCode: string; days: number },
): Promise<string | null> {
  const r = await c.query<{ ends_at: string }>(
    `INSERT INTO entitlements
       (user_id, order_id, product_code, kind, status, starts_at, ends_at)
     SELECT $1, $2, $3, 'track', 'active',
            GREATEST(now(), COALESCE(MAX(e.ends_at), now())),
            GREATEST(now(), COALESCE(MAX(e.ends_at), now())) + ($4 || ' days')::interval
       FROM entitlements e
      WHERE e.user_id = $1 AND e.kind = 'track' AND e.status = 'active'
        AND e.ends_at > now()
     ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO NOTHING
     RETURNING ends_at::text`,
    [o.userId, o.orderId, o.productCode, String(o.days)],
  );
  return r.rows[0]?.ends_at ?? null;
}

/**
 * PRO 결과지를 산 분께 Track 첫 한 달을 붙인다. **거래 안에서** 부른다.
 *
 * **사람마다 한 번이다.** 결제마다 붙이면 PRO 를 두 번 산 사람이 두 달을
 * 받는데, 그것은 정해 둔 약속(첫 1개월)이 아니다. 동시 확정은
 * `entitlements_track_trial_uniq` 가 막는다.
 *
 * **주문을 가리키지 않는다**(`order_id` NULL). 그 PRO 주문은 이미 결과지
 * 이용권 한 줄을 들고 있고 주문 하나에 이용권 하나가 제약이라서다.
 * 그래서 PRO 를 환불해도 이 줄은 남는다: 한 달짜리 무료 기능을 되찾으려고
 * 환불 코드에 분기를 하나 더 두는 것보다 싸다.
 */
export async function grantProTrialTx(c: PoolClient, userId: string): Promise<boolean> {
  const r = await c.query(
    `INSERT INTO entitlements
       (user_id, order_id, product_code, kind, status, starts_at, ends_at)
     SELECT $1, NULL, $2, 'track', 'active',
            GREATEST(now(), COALESCE(MAX(e.ends_at), now())),
            GREATEST(now(), COALESCE(MAX(e.ends_at), now())) + interval '30 days'
       FROM entitlements e
      WHERE e.user_id = $1 AND e.kind = 'track' AND e.status = 'active'
        AND e.ends_at > now()
     ON CONFLICT DO NOTHING`,
    [userId, TRACK_TRIAL],
  );
  return (r.rowCount ?? 0) > 0;
}

/**
 * 첫 한 달을 아직 받지 못한, PRO 를 산 분인가.
 *
 * 이 기능이 생기기 전에 PRO 를 산 분이 있다. 그분들께 결제 확정 쪽으로는
 * 붙일 길이 없어서 `내 구독` 화면이 받기 단추를 세운다.
 */
export async function proTrialClaimable(userId: string): Promise<boolean> {
  const r = await queryOne<{ ok: boolean }>(
    `SELECT EXISTS (
              SELECT 1 FROM orders o JOIN products p ON p.code = o.product_code
               WHERE o.user_id = $1 AND o.status = 'paid'
                 AND p.tier = 'PRO' AND o.amount > 0)
        AND NOT EXISTS (
              SELECT 1 FROM entitlements e
               WHERE e.user_id = $1 AND e.product_code = $2) AS ok`,
    [userId, TRACK_TRIAL],
  ).catch(() => null);
  return !!r?.ok;
}

/**
 * 지금 파는 Track 기간권. **승인된 값만 판다**: 해외판은 줄이 있어도
 * 값이 승인되기 전에는 여기서 걸러져 가격표에 서지 않는다. 글로벌 가격을
 * 지어내지 않는다.
 */
export async function trackOffers(market: string): Promise<{
  code: string; amount: number; currency: string; days: number;
}[]> {
  return query<{ code: string; amount: number; currency: string; days: number }>(
    `SELECT code, amount, currency, duration_days AS days
       FROM products
      WHERE kind = 'track' AND active AND market = $1
        AND price_status = 'approved' AND amount > 0
      ORDER BY duration_days`,
    [market],
  ).catch(() => []);
}
