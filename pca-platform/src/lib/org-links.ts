import { query, queryOne } from "@/lib/db";
import type { SessionUser } from "@/lib/session";

/**
 * 담당자 화면이 쓰는 전용 링크 조회와 확인.
 *
 * 여기서 지켜야 할 것이 하나 있다 — 화면에서 넘어온 기관 id 나 링크 id 를
 * 그대로 믿지 않는다. 남의 기관 링크를 회수하거나 들여다보는 일이 폼 값
 * 하나로 되면 안 되기 때문이다. 그래서 모든 함수가 소속을 함께 확인한다.
 */

export type OrgLink = {
  id: string;
  token: string;
  label: string;
  used_count: string;
  max_uses: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  login_id_mask: string | null;
  email_domains: string | null;
};

/**
 * 담당자 화면이 보는 '남은 자리'.
 *
 * 선불 계약이면 산 응시권 가운데 몇 자리가 남았는가다.
 * 건당 계약이면 미리 산 것이 없으므로 발주처가 정한 건수 상한에서
 * 지금까지 나간 건수를 뺀 값이다. 상한이 없으면 unlimited 다.
 *
 * 두 경우를 같은 모양으로 돌려주는 이유는, 화면이 정산 방식을 몰라도
 * "지금 새 링크를 만들어도 되는가" 를 판단할 수 있게 하기 위해서다.
 */
export type SeatSummary = {
  billing: "prepaid" | "per_use" | "none";
  total: number;
  taken: number;
  free: number;
  unlimited: boolean;
};

/** 이 사람이 담당자로 있는 기관들. superadmin 은 여기로 오지 않는다 */
export function adminOrgIds(user: SessionUser): string[] {
  return user.memberships.filter((m) => m.role === "org_admin").map((m) => m.orgId);
}

/** 담당자든 교수든, 이 사람이 내용을 볼 수 있는 기관들 */
export function visibleOrgIds(user: SessionUser): string[] {
  return user.memberships
    .filter((m) => m.role === "org_admin" || m.role === "instructor")
    .map((m) => m.orgId);
}

export async function linksOf(orgId: string): Promise<OrgLink[]> {
  return query<OrgLink>(
    `SELECT id, token, label, used_count::text AS used_count, max_uses::text AS max_uses,
            login_id_mask, email_domains,
            to_char(expires_at, 'YYYY-MM-DD') AS expires_at,
            to_char(revoked_at, 'YYYY-MM-DD HH24:MI') AS revoked_at,
            to_char(created_at, 'YYYY-MM-DD') AS created_at
       FROM org_links
      WHERE org_id = $1
      ORDER BY revoked_at IS NOT NULL, created_at DESC`,
    [orgId],
  );
}

const NO_CONTRACT: SeatSummary = {
  billing: "none", total: 0, taken: 0, free: 0, unlimited: false,
};

/** 지금 이 기관에 자리가 얼마나 남았는가. 계약 방식에 따라 세는 것이 다르다 */
export async function seatsOf(orgId: string): Promise<SeatSummary> {
  const ct = await queryOne<{ id: string; billing: string; use_cap: string | null }>(
    `SELECT id::text, billing, use_cap::text
       FROM contracts WHERE org_id = $1 AND status = 'active'
      ORDER BY id DESC LIMIT 1`,
    [orgId],
  );
  if (!ct) return NO_CONTRACT;

  if (ct.billing === "per_use") {
    const used = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM billing_events WHERE contract_id = $1`,
      [ct.id],
    );
    const taken = Number(used?.n ?? 0);
    if (ct.use_cap === null) {
      return { billing: "per_use", total: 0, taken, free: 0, unlimited: true };
    }
    const cap = Number(ct.use_cap);
    return {
      billing: "per_use",
      total: cap,
      taken,
      free: Math.max(0, cap - taken),
      unlimited: false,
    };
  }

  const row = await queryOne<{ total: string; taken: string }>(
    `SELECT count(*)::text AS total,
            count(*) FILTER (WHERE s.user_id IS NOT NULL)::text AS taken
       FROM seats s
      WHERE s.contract_id = $1`,
    [ct.id],
  );
  const total = Number(row?.total ?? 0);
  const taken = Number(row?.taken ?? 0);
  return {
    billing: "prepaid",
    total,
    taken,
    free: Math.max(0, total - taken),
    unlimited: false,
  };
}

/**
 * 이 링크가 정말 이 사람의 기관 것인지.
 *
 * 링크 id 로 기관을 되짚어 소속과 맞춰 본다. 맞지 않으면 null 이고,
 * 부른 쪽은 "없는 링크" 와 똑같이 다뤄야 한다 — 남의 링크가 존재한다는
 * 사실조차 알려줄 이유가 없다.
 */
export async function linkOwnedBy(
  linkId: string,
  orgIds: string[],
): Promise<{ id: string; orgId: string } | null> {
  if (orgIds.length === 0) return null;
  const row = await queryOne<{ id: string; org_id: string }>(
    `SELECT id, org_id FROM org_links
      WHERE id = $1 AND org_id = ANY($2::bigint[])`,
    [linkId, orgIds],
  );
  return row ? { id: row.id, orgId: row.org_id } : null;
}

export type ExamSession = {
  id: string; name: string; opens_at: string; closes_at: string;
  total: string; started: string; submitted: string; released_at: string | null;
};

/** 이 기관이 연 회차와 진행 상황 */
export async function sessionsOf(orgId: string): Promise<ExamSession[]> {
  return query<ExamSession>(
    `SELECT s.id, s.name,
            to_char(s.opens_at, 'YYYY-MM-DD') AS opens_at,
            to_char(s.closes_at, 'YYYY-MM-DD') AS closes_at,
            (SELECT count(*) FROM questions q WHERE q.instrument_id = s.instrument_id)::text AS total,
            (SELECT count(*) FROM attempts a WHERE a.session_id = s.id)::text AS started,
            (SELECT count(*) FROM attempts a WHERE a.session_id = s.id
               AND a.status IN ('submitted','scored'))::text AS submitted,
            to_char(s.released_at, 'YYYY-MM-DD') AS released_at
       FROM test_sessions s
      WHERE s.org_id = $1
      ORDER BY s.closes_at DESC`,
    [orgId],
  );
}

/** 회차를 열 때 고를 수 있는 검사지. 문항이 있는 것만 */
export async function publishedInstruments(): Promise<{ id: string; label: string }[]> {
  const rows = await query<{ id: string; code: string; version: string; n: string }>(
    `SELECT i.id::text, m.code, i.version,
            (SELECT count(*) FROM questions q WHERE q.instrument_id = i.id)::text AS n
       FROM instruments i JOIN majors m ON m.id = i.major_id
      WHERE i.status = 'published'
      ORDER BY m.code, i.version`,
  );
  return rows
    .filter((r) => Number(r.n) > 0)
    .map((r) => ({ id: r.id, label: `${r.code} ${r.version} · 문항 ${r.n}개` }));
}
