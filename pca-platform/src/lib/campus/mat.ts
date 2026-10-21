/**
 * MAT 학교 단체 이용권. **운영자가 인원을 적고, 담당자가 그 안에서 연다.**
 *
 * 돈은 계약으로 받는다. 그래서 여기에는 금액이 한 칸도 없고, 두 상품
 * (`CAMPUS_MAT_6M` · `CAMPUS_MAT_12M`)은 가격표에 서지 않는다.
 *
 * **학생이 받는 것은 개인 구매와 같은 한 줄이다**(`entitlements.kind =
 * 'track'`). 학생 화면이 무엇이 열려 있는지 묻는 자리는 `activeTrack()`
 * 하나이고 상품을 가리지 않는다. 학교 몫을 따로 읽는 길을 두면 같은
 * 학생에게 두 화면이 서로 다른 답을 하는 날이 온다(설계 원칙 10).
 *
 * **인원을 넘기지 않는 것은 잠금이 정한다.** 남은 수를 읽고 나서 쓰면
 * 두 담당자가 같은 순간에 누른 두 요청이 둘 다 통과한다. 묶음 줄을
 * `FOR UPDATE` 로 잡은 채로 세고 쓴다. **한 사람에게 두 번 열리지 않는
 * 것은 제약이 정한다**(`entitlements_campus_pool_uniq`).
 */
import { query, queryOne, tx } from "@/lib/db";
import { audit } from "@/lib/audit";
import { university } from "@/lib/campus/registry";
import type { ManageActor } from "@/lib/campus/manage";

export const CAMPUS_MAT_PRODUCTS = ["CAMPUS_MAT_6M", "CAMPUS_MAT_12M"] as const;
export type CampusMatProduct = (typeof CAMPUS_MAT_PRODUCTS)[number];

/** 사람이 읽는 이름. 계약서와 PPT 가 쓰는 말 그대로다 */
export const CAMPUS_MAT_NAME: Record<CampusMatProduct, string> = {
  CAMPUS_MAT_6M: "MAT 6개월 (학교)",
  CAMPUS_MAT_12M: "MAT 1년 (학교)",
};

export type MatPool = {
  id: string;
  university_code: string;
  product_code: CampusMatProduct;
  seats: number;
  used: number;
  left: number;
  grant_until: string;
  status: "active" | "closed";
  memo: string | null;
  created_at: string;
  /** 지금 이 묶음으로 학생에게 열 수 있는가 */
  open: boolean;
};

const POOL_SQL = `
  SELECT p.id::text, p.university_code, p.product_code, p.seats,
         (SELECT count(*) FROM entitlements e WHERE e.campus_pool_id = p.id)::int AS used,
         p.grant_until::text, p.status, p.memo, p.created_at::text,
         (p.status = 'active'
          AND p.grant_until >= (now() AT TIME ZONE 'Asia/Seoul')::date) AS live
    FROM campus_mat_pools p`;

type PoolRow = Omit<MatPool, "left" | "open"> & { live: boolean };

function shape(r: PoolRow): MatPool {
  const left = Math.max(r.seats - r.used, 0);
  return { ...r, left, open: r.live && left > 0 };
}

/** 한 학교의 묶음 전부. 담당자 화면과 운영자 화면이 같은 함수를 읽는다 */
export async function poolsOf(universityCode: string): Promise<MatPool[]> {
  const rows = await query<PoolRow>(
    `${POOL_SQL} WHERE p.university_code = $1 ORDER BY p.status, p.grant_until, p.id`,
    [universityCode]);
  return rows.map(shape);
}

/** 운영자가 보는 모든 학교의 묶음 */
export async function allPools(): Promise<MatPool[]> {
  const rows = await query<PoolRow>(
    `${POOL_SQL} ORDER BY p.university_code, p.status, p.grant_until, p.id`);
  return rows.map(shape);
}

/**
 * 운영자가 계약을 받고 묶음을 하나 적는다.
 *
 * **학교 등록부에 있는 학교만 받는다.** 없는 코드로 묶음을 만들면 아무
 * 담당자도 그것을 볼 수 없고, 산 인원이 조용히 사라진다.
 */
export async function createPool(
  input: {
    universityCode: string; productCode: string; seats: number;
    grantUntil: string; memo?: string | null;
  },
  actorId: string,
): Promise<{ ok: boolean; why?: string; id?: string }> {
  const uni = input.universityCode.trim().toUpperCase();
  if (!university(uni)) return { ok: false, why: "학교 등록부에 없는 학교입니다" };
  if (!(CAMPUS_MAT_PRODUCTS as readonly string[]).includes(input.productCode)) {
    return { ok: false, why: "6개월 또는 1년 가운데 하나를 골라 주세요" };
  }
  if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > 20000) {
    return { ok: false, why: "인원은 1명부터 20,000명까지입니다" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.grantUntil)
      || Number.isNaN(Date.parse(input.grantUntil))) {
    return { ok: false, why: "열 수 있는 마지막 날을 골라 주세요" };
  }
  const row = await queryOne<{ id: string }>(
    `INSERT INTO campus_mat_pools
       (university_code, product_code, seats, grant_until, memo, created_by)
     VALUES ($1, $2, $3, $4::date, $5, $6::bigint)
     RETURNING id::text`,
    [uni, input.productCode, input.seats, input.grantUntil,
     (input.memo ?? "").trim().slice(0, 300) || null, actorId]);
  await audit({
    actorId: Number(actorId), actorRole: "superadmin",
    action: "campus.mat.pool.create", targetKind: "campus_mat_pool",
    targetId: row?.id ?? null, orgId: null,
    detail: { university: uni, product: input.productCode, seats: input.seats },
  });
  return { ok: true, id: row?.id };
}

/** 운영자가 묶음을 닫는다. **이미 연 학생의 기간은 그대로 둔다** */
export async function closePool(id: string, actorId: string): Promise<boolean> {
  const r = await query(
    `UPDATE campus_mat_pools SET status = 'closed' WHERE id = $1::bigint AND status = 'active'
     RETURNING id`, [id]);
  if (r.length) {
    await audit({
      actorId: Number(actorId), actorRole: "superadmin",
      action: "campus.mat.pool.close", targetKind: "campus_mat_pool",
      targetId: id, orgId: null, detail: {},
    });
  }
  return r.length > 0;
}

export type GrantResult = {
  ok: boolean;
  why?: string;
  /** 새로 연 학생 수 */
  opened: number;
  /** 이 묶음에서 이미 열려 있던 학생 수 */
  already: number;
  /** 이 학교 학생이 아니어서 건너뛴 수 */
  foreign: number;
  /** 인원이 모자라 열지 못한 수 */
  short: number;
};

/**
 * 담당자가 학생에게 MAT 을 연다.
 *
 * **이 학교가 발급한 계정에만 연다.** 폼을 고쳐 다른 학교 학생의 번호를
 * 넣어도 그 줄은 건너뛴다. **멈춘 계정에도 열지 않는다**: 쓰지 못하는
 * 사람에게 인원을 쓰면 학교가 산 것이 줄어든다.
 *
 * **끝에서 이어 붙인다.** 그 학생이 개인으로 산 기간이 남아 있으면 그
 * 뒤에서 시작한다(`grantTrackTx` 와 같은 규칙). 지금부터 덮어쓰면 그
 * 학생이 산 것을 학교가 뺏는 셈이 된다.
 */
export async function grantMat(
  universityCode: string, poolId: string, userIds: string[], actor: ManageActor,
): Promise<GrantResult> {
  const none: GrantResult = { ok: false, opened: 0, already: 0, foreign: 0, short: 0 };
  const ids = [...new Set(userIds.map((x) => String(x).trim()).filter((x) => /^\d+$/.test(x)))];
  if (!ids.length) return { ...none, why: "열 학생을 골라 주세요" };

  const out = await tx(async (c) => {
    const pool = await c.query<{
      id: string; product_code: string; seats: number; live: boolean; days: number;
    }>(
      `SELECT p.id::text, p.product_code, p.seats,
              (p.status = 'active'
               AND p.grant_until >= (now() AT TIME ZONE 'Asia/Seoul')::date) AS live,
              pr.duration_days AS days
         FROM campus_mat_pools p JOIN products pr ON pr.code = p.product_code
        WHERE p.id = $1::bigint AND p.university_code = $2
        FOR UPDATE OF p`,
      [poolId, universityCode]);
    const p = pool.rows[0];
    if (!p) return { ...none, why: "이 학교의 MAT 묶음이 아닙니다" };
    if (!p.live) return { ...none, why: "이 묶음은 닫혔거나 열 수 있는 기간이 지났습니다" };

    const mine = await c.query<{ user_id: string; has: boolean }>(
      `SELECT cs.user_id::text,
              EXISTS (SELECT 1 FROM entitlements e
                       WHERE e.user_id = cs.user_id AND e.campus_pool_id = $3::bigint) AS has
         FROM campus_students cs JOIN users u ON u.id = cs.user_id
        WHERE cs.university_code = $1 AND cs.user_id = ANY($2::bigint[])
          AND u.status = 'active'`,
      [universityCode, ids, poolId]);
    const foreign = ids.length - mine.rows.length;
    const already = mine.rows.filter((r) => r.has).length;
    const want = mine.rows.filter((r) => !r.has).map((r) => r.user_id);

    const used = await c.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM entitlements WHERE campus_pool_id = $1::bigint`, [poolId]);
    const left = Math.max(p.seats - (used.rows[0]?.n ?? 0), 0);
    const go = want.slice(0, left);
    const short = want.length - go.length;

    let opened = 0;
    for (const uid of go) {
      const r = await c.query(
        `INSERT INTO entitlements
           (user_id, order_id, product_code, kind, status, starts_at, ends_at, campus_pool_id)
         SELECT $1::bigint, NULL, $2, 'track', 'active',
                GREATEST(now(), COALESCE(MAX(e.ends_at), now())),
                GREATEST(now(), COALESCE(MAX(e.ends_at), now())) + ($3 || ' days')::interval,
                $4::bigint
           FROM entitlements e
          WHERE e.user_id = $1::bigint AND e.kind = 'track' AND e.status = 'active'
            AND e.ends_at > now()
         ON CONFLICT DO NOTHING`,
        [uid, p.product_code, String(p.days), poolId]);
      opened += r.rowCount ?? 0;
    }
    return { ok: true, opened, already, foreign, short };
  });

  if (out.ok && out.opened) {
    await audit({
      actorId: Number(actor.userId), actorRole: actor.role,
      action: "campus.mat.grant", targetKind: "campus_mat_pool",
      targetId: poolId, orgId: actor.orgId,
      detail: { university: universityCode, opened: out.opened, short: out.short },
    });
  }
  return out;
}

/**
 * 학생마다 지금 MAT 이 언제까지 열려 있는가. 담당자 명단의 한 칸.
 * **개인으로 산 기간도 함께 센다**: 담당자가 묻는 것은 `이 학생이 지금
 * 쓸 수 있는가` 이고, 누가 샀는지는 그 다음이다.
 */
export async function matUntilOf(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {};
  const rows = await query<{ user_id: string; until: string }>(
    `SELECT user_id::text, (max(ends_at) AT TIME ZONE 'Asia/Seoul')::date::text AS until
       FROM entitlements
      WHERE user_id = ANY($1::bigint[]) AND kind = 'track' AND status = 'active'
        AND ends_at > now()
      GROUP BY user_id`,
    [userIds]);
  return Object.fromEntries(rows.map((r) => [r.user_id, r.until]));
}
