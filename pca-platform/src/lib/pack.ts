import type { PoolClient } from "pg";
import { query, queryOne, tx } from "@/lib/db";

/**
 * 기관 선불 이용권.
 *
 * 기관이 N건을 미리 사두고, 소속 학생의 신청이 들어올 때마다 한 장씩 깎는다.
 * 사후 청구였을 때는 운영사가 돈을 받기 전에 멘토에게 먼저 지급해야 했다.
 *
 * 남은 장수를 컬럼으로 들고 있지 않는다. 세는 것이 아니라 행을 센다 —
 * 검사 응시권(seats)과 같은 방식이고, 같은 이유다. 동시에 두 사람이 마지막
 * 한 장을 집는 경합은 UPDATE ... FOR UPDATE SKIP LOCKED 로 막는다.
 */

export type Pack = {
  id: string;
  org_id: string;
  title: string;
  unit_price: number;
  starts_on: string;
  ends_on: string;
  status: string;
  memo: string | null;
  total: number;
  used: number;
  remain: number;
  expired: boolean;
};

/** left 는 SQL 함수 이름이라 별칭으로 쓰지 않는다. remain 으로 둔다 */
const packSelect = (where: string) => `
  SELECT p.id, p.org_id, p.title, p.unit_price,
         p.starts_on::text, p.ends_on::text, p.status, p.memo,
         count(c.id)::int AS total,
         count(c.consumed_at)::int AS used,
         (count(c.id) - count(c.consumed_at))::int AS remain,
         (p.ends_on < current_date) AS expired
    FROM mentoring_packs p
    LEFT JOIN mentoring_credits c ON c.pack_id = p.id
   ${where}
   GROUP BY p.id`;

export async function packList(): Promise<Pack[]> {
  return query<Pack>(
    `${packSelect("")} ORDER BY p.status = 'active' DESC, p.ends_on DESC, p.id DESC`,
  );
}

export async function packsOfOrg(orgId: string): Promise<Pack[]> {
  return packsOfOrgs([orgId]);
}

/** 학과 담당자 화면. 한 사람이 여러 학과를 맡는 경우가 있다 */
export async function packsOfOrgs(orgIds: string[]): Promise<Pack[]> {
  if (orgIds.length === 0) return [];
  return query<Pack>(
    `${packSelect("WHERE p.org_id = ANY($1::bigint[])")}
      ORDER BY p.status = 'active' DESC, p.ends_on DESC`,
    [orgIds],
  );
}

export type MonthUse = { month: string; used: number; returned: number };

/**
 * 월별로 몇 장이 나갔는지. 담당자에게 주는 것은 **숫자뿐이다.**
 *
 * 누가 어느 멘토에게 무엇을 물었는지는 보여주지 않는다. 학과가 돈을 냈다는 것과
 * 학생의 진로 상담 내용을 볼 권리는 다른 이야기다. 담당자가 볼 수 있다는 것을
 * 학생이 알면 진짜 고민을 쓰지 않는다 — 그러면 이 서비스는 아무 쓸모가 없다.
 */
export async function packUsageByMonth(orgIds: string[]): Promise<MonthUse[]> {
  if (orgIds.length === 0) return [];
  return query<MonthUse>(
    `SELECT to_char(s.starts_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM') AS month,
            count(*)::int AS used,
            count(*) FILTER (WHERE pm.refunded_amount >= pm.amount)::int AS returned
       FROM mentoring_credits c
       JOIN mentoring_packs p  ON p.id = c.pack_id
       JOIN mentoring_requests r ON r.id = c.request_id
       JOIN mentor_slots s     ON s.id = r.slot_id
       LEFT JOIN payments pm   ON pm.request_id = r.id
      WHERE p.org_id = ANY($1::bigint[]) AND c.consumed_at IS NOT NULL
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 24`,
    [orgIds],
  );
}

/**
 * 이 기관이 지금 이 금액의 세션을 덮을 수 있는지. 화면에 미리 알려주기 위한 조회다.
 * 실제 소진은 claimCredit 이 트랜잭션 안에서 한다 — 여기서 본 것과 결과가 다를 수 있다.
 */
export async function coverableBy(orgId: string, price: number): Promise<Pack | null> {
  return queryOne<Pack>(
    `${packSelect(`WHERE p.org_id = $1
                     AND p.status = 'active'
                     AND current_date BETWEEN p.starts_on AND p.ends_on
                     AND p.unit_price >= $2`)}
      HAVING count(c.id) > count(c.consumed_at)
      ORDER BY p.ends_on
      LIMIT 1`,
    [orgId, price],
  );
}

/**
 * 이용권 한 장을 집어 이 신청에 붙인다. 신청과 같은 트랜잭션 안에서만 부른다.
 *
 * 쓸 수 있는 묶음이 여럿이면 **먼저 끝나는 것부터** 쓴다. 그러지 않으면 기간이
 * 짧은 묶음이 남은 채로 만료되고, 기관은 산 것을 못 쓴 셈이 된다.
 * 덮을 수 있는 장이 없으면 null 을 돌려주고, 부르는 쪽이 본인 결제로 넘긴다.
 */
export async function claimCredit(
  c: PoolClient,
  input: { orgId: string; requestId: string; price: number },
): Promise<{ packId: string } | null> {
  const r = await c.query<{ pack_id: string }>(
    `UPDATE mentoring_credits
        SET consumed_at = now(), request_id = $2
      WHERE id = (
        SELECT cr.id
          FROM mentoring_credits cr
          JOIN mentoring_packs p ON p.id = cr.pack_id
         WHERE cr.consumed_at IS NULL
           AND p.org_id = $1
           AND p.status = 'active'
           AND current_date BETWEEN p.starts_on AND p.ends_on
           AND p.unit_price >= $3
         ORDER BY p.ends_on, cr.id
         FOR UPDATE OF cr SKIP LOCKED
         LIMIT 1
      )
      RETURNING pack_id`,
    [input.orgId, input.requestId, input.price],
  );
  return r.rows[0] ? { packId: r.rows[0].pack_id } : null;
}

/**
 * 쓴 이용권을 되돌린다. 전액 환불일 때만 부른다.
 *
 * 부분 환불에는 되돌리지 않는다. 이용권은 장 단위라 반 장을 돌려줄 방법이 없다.
 * 개인 결제에서 절반만 돌려받는 것과 같은 자리이고, 기관에는 '48시간 전까지
 * 취소하면 이용권이 돌아온다'로 안내한다.
 */
export async function releaseCredit(requestId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE mentoring_credits
        SET consumed_at = NULL, request_id = NULL
      WHERE request_id = $1
      RETURNING id`,
    [requestId],
  );
  return rows.length > 0;
}

export async function createPack(input: {
  orgId: string;
  title: string;
  unitPrice: number;
  count: number;
  startsOn: string;
  endsOn: string;
  memo: string | null;
  actorId: string;
}): Promise<string> {
  return tx(async (c) => {
    const r = await c.query<{ id: string }>(
      `INSERT INTO mentoring_packs
         (org_id, title, unit_price, starts_on, ends_on, memo, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [input.orgId, input.title, input.unitPrice, input.startsOn, input.endsOn,
       input.memo, input.actorId],
    );
    // 한 장씩 INSERT 하지 않는다. 계약의 응시권과 같은 이유다
    await c.query(
      `INSERT INTO mentoring_credits (pack_id) SELECT $1 FROM generate_series(1, $2)`,
      [r.rows[0].id, input.count],
    );
    return r.rows[0].id;
  });
}

export type PackUse = {
  pack_id: string;
  starts_at: string;
  handle: string;
  applicant_name: string;
  status: string;
  amount: number;
  refunded_amount: number;
};

/** 이 묶음이 어디에 쓰였는지. 기관에 내역을 줄 때 쓴다 */
export async function packUses(packId: string): Promise<PackUse[]> {
  return query<PackUse>(
    `SELECT c.pack_id,
            to_char(s.starts_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS starts_at,
            m.handle, u.display_name AS applicant_name, r.status,
            pm.amount, pm.refunded_amount
       FROM mentoring_credits c
       JOIN mentoring_requests r ON r.id = c.request_id
       JOIN mentor_slots s  ON s.id = r.slot_id
       JOIN mentors m       ON m.id = r.mentor_id
       JOIN users u         ON u.id = r.applicant_id
       LEFT JOIN payments pm ON pm.request_id = r.id
      WHERE c.pack_id = $1 AND c.consumed_at IS NOT NULL
      ORDER BY s.starts_at DESC
      LIMIT 200`,
    [packId],
  );
}
