import { query, queryOne } from "@/lib/db";
import { nameOf } from "@/lib/i18n";
import type { SessionUser } from "@/lib/session";

/**
 * 학과 담당자가 다루는 것들. 담당자는 자기 학과 밖을 볼 수 없어야 하므로
 * 조회마다 org 를 조건에 넣는다. 운영사(superadmin)는 모두 본다.
 */

export function myOrgIds(user: SessionUser): string[] {
  return user.memberships
    .filter((m) => m.role === "org_admin" || m.role === "instructor")
    .map((m) => m.orgId);
}

/** 이 회차를 볼 수 있는가. 담당자와 교수, 운영사. */
export async function canViewSession(
  user: SessionUser,
  sessionId: string,
): Promise<boolean> {
  if (user.role === "superadmin") return true;
  const row = await queryOne<{ org_id: string }>(
    `SELECT org_id FROM test_sessions WHERE id = $1`,
    [sessionId],
  );
  return row !== null && myOrgIds(user).includes(row.org_id);
}

/**
 * 명단을 올리고 결과를 공개할 수 있는가.
 * 보는 것과 바꾸는 것을 나눈다 — 교수는 진행 상황을 보지만, 계정을 만들거나
 * 학생에게 결과를 여는 것은 계약 주체인 학과 담당자의 일이다.
 */
export async function canEditSession(
  user: SessionUser,
  sessionId: string,
): Promise<boolean> {
  if (user.role === "superadmin") return true;
  if (user.role !== "org_admin") return false;
  const row = await queryOne<{ org_id: string }>(
    `SELECT org_id FROM test_sessions WHERE id = $1`,
    [sessionId],
  );
  return (
    row !== null &&
    user.memberships.some((m) => m.orgId === row.org_id && m.role === "org_admin")
  );
}

export type OrgContract = {
  id: string;
  title: string;
  org_id: string;
  starts_on: string;
  ends_on: string;
  seat_count: number;
  free_seats: number;
  expired: boolean;
};

export async function contractsOf(orgIds: string[]): Promise<OrgContract[]> {
  if (orgIds.length === 0) return [];
  return query<OrgContract>(
    `SELECT c.id, c.title, c.org_id,
            to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on,
            to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on,
            c.seat_count,
            (SELECT count(*) FROM seats s WHERE s.contract_id = c.id AND s.user_id IS NULL)::int AS free_seats,
            (c.ends_on < current_date) AS expired
       FROM contracts c
      WHERE c.org_id = ANY($1::bigint[]) AND c.status = 'active'
      ORDER BY c.ends_on DESC`,
    [orgIds],
  );
}

export type OrgSession = {
  id: string;
  org_id: string;
  name: string;
  opens_at: string;
  closes_at: string;
  release_mode: string;
  released_at: string | null;
  contract_title: string;
  roster: number;
  submitted: number;
  scored: number;
};

export async function sessionsOf(orgIds: string[]): Promise<OrgSession[]> {
  if (orgIds.length === 0) return [];
  return query<OrgSession>(
    `SELECT ts.id, ts.org_id, ts.name, ts.opens_at::text, ts.closes_at::text,
            ts.release_mode, ts.released_at::text, c.title AS contract_title,
            (SELECT count(*) FROM attempts a WHERE a.session_id = ts.id)::int AS roster,
            (SELECT count(*) FROM attempts a
              WHERE a.session_id = ts.id AND a.status IN ('submitted', 'scored'))::int AS submitted,
            (SELECT count(*) FROM attempts a
              WHERE a.session_id = ts.id AND a.status = 'scored')::int AS scored
       FROM test_sessions ts
       JOIN contracts c ON c.id = ts.contract_id
      WHERE ts.org_id = ANY($1::bigint[])
      ORDER BY ts.opens_at DESC`,
    [orgIds],
  );
}

export async function sessionDetail(sessionId: string): Promise<OrgSession | null> {
  const rows = await query<OrgSession>(
    `SELECT ts.id, ts.org_id, ts.name, ts.opens_at::text, ts.closes_at::text,
            ts.release_mode, ts.released_at::text, c.title AS contract_title,
            (SELECT count(*) FROM attempts a WHERE a.session_id = ts.id)::int AS roster,
            (SELECT count(*) FROM attempts a
              WHERE a.session_id = ts.id AND a.status IN ('submitted', 'scored'))::int AS submitted,
            (SELECT count(*) FROM attempts a
              WHERE a.session_id = ts.id AND a.status = 'scored')::int AS scored
       FROM test_sessions ts
       JOIN contracts c ON c.id = ts.contract_id
      WHERE ts.id = $1`,
    [sessionId],
  );
  return rows[0] ?? null;
}

export type RosterRow = {
  attempt_id: string;
  login_id: string | null;
  display_name: string;
  email: string | null;
  status: string;
  must_reset_pw: boolean;
  last_login_at: string | null;
  submitted_at: string | null;
};

export async function rosterOf(sessionId: string): Promise<RosterRow[]> {
  return query<RosterRow>(
    `SELECT a.id AS attempt_id, u.login_id, u.display_name, u.email, a.status,
            u.must_reset_pw,
            to_char(u.last_login_at, 'MM-DD HH24:MI') AS last_login_at,
            to_char(a.submitted_at, 'MM-DD HH24:MI') AS submitted_at
       FROM attempts a
       JOIN users u ON u.id = a.user_id
      WHERE a.session_id = $1
      ORDER BY u.login_id`,
    [sessionId],
  );
}

export async function orgNameOf(orgId: string, lang: string): Promise<string | null> {
  return nameOf("organizations", orgId, lang);
}

/** 이 회차가 쓰는 검사 도구에 채점 가중치가 채워져 있는가. */
export async function instrumentWeights(sessionId: string): Promise<{ filled: number }> {
  const row = await queryOne<{ filled: number }>(
    `SELECT (SELECT count(*) FROM scoring_weights w
              WHERE w.instrument_id = ts.instrument_id AND w.weight > 0)::int AS filled
       FROM test_sessions ts WHERE ts.id = $1`,
    [sessionId],
  );
  return { filled: row?.filled ?? 0 };
}
