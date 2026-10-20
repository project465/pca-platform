/**
 * 관리자 집계. **사람을 세고, 사람을 줄 세우지 않는다.**
 *
 * - 다섯 명 미만 칸은 숫자 대신 `5명 미만` 으로 가린다
 *   (`organizations.aggregate_min_cell`, 공통 규칙과 같다)
 * - 개인 결과·응답은 여기서 읽지 않는다. 읽는 것은 상태와 고른 직무 영역뿐이다
 * - 취업 여부·지역 정주 같은 결과 성과는 플랫폼이 산출하지 않는다
 */
import { query, queryOne } from "@/lib/db";

export type Cell = { n: number; masked: boolean };

export function mask(n: number, min: number): Cell {
  return n > 0 && n < min ? { n: 0, masked: true } : { n, masked: false };
}

export async function minCell(orgId: number): Promise<number> {
  const r = await queryOne<{ aggregate_min_cell: number }>(
    `SELECT aggregate_min_cell FROM organizations WHERE id = $1`, [orgId]);
  return Number(r?.aggregate_min_cell ?? 5);
}

export type Funnel = {
  program: string;
  name: string;
  issued: number;
  logged_in: number;
  started: number;
  scored: number;
  pdf: number;
  consented: number;
};

/** 사업별 깔때기. 단계마다 '그 단계까지 온 사람 수' 다 */
export async function funnel(orgId: number): Promise<Funnel[]> {
  const rows = await query<{
    program: string; name: string; issued: string; logged_in: string; started: string;
    scored: string; pdf: string; consented: string;
  }>(`
    WITH p AS (
      SELECT sp.user_id, sp.program_code FROM sj_participants sp WHERE sp.org_id = $1
    ),
    a AS (
      SELECT DISTINCT ON (user_id) user_id, id, status FROM sj_attempts
       WHERE org_id = $1 ORDER BY user_id, started_at DESC
    ),
    c AS (
      SELECT DISTINCT ON (user_id) user_id, granted FROM consents
       WHERE org_id = $1 AND kind = 'data_visibility' ORDER BY user_id, created_at DESC, id DESC
    )
    SELECT g.code AS program, g.name,
           count(p.user_id) AS issued,
           count(p.user_id) FILTER (WHERE u.last_login_at IS NOT NULL) AS logged_in,
           count(p.user_id) FILTER (WHERE a.id IS NOT NULL) AS started,
           count(p.user_id) FILTER (WHERE a.status = 'scored') AS scored,
           count(p.user_id) FILTER (WHERE EXISTS (
             SELECT 1 FROM sj_report_renders r JOIN sj_attempts x ON x.id = r.attempt_id
              WHERE x.user_id = p.user_id AND r.status = 'ready')) AS pdf,
           count(p.user_id) FILTER (WHERE c.granted) AS consented
      FROM sj_programs g
      LEFT JOIN p ON p.program_code = g.code
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN a ON a.user_id = p.user_id
      LEFT JOIN c ON c.user_id = p.user_id
     WHERE g.org_id = $1
     GROUP BY g.code, g.name ORDER BY g.code`, [orgId]);
  return rows.map((r) => ({
    program: r.program, name: r.name,
    issued: Number(r.issued), logged_in: Number(r.logged_in), started: Number(r.started),
    scored: Number(r.scored), pdf: Number(r.pdf), consented: Number(r.consented),
  }));
}

/** 고른 직무 영역 집계. 완료한 응시의 시작 정보만 센다 */
export async function areaInterest(orgId: number): Promise<{ code: string; n: number }[]> {
  const rows = await query<{ code: string; n: string }>(`
    SELECT x.code, count(DISTINCT a.user_id) AS n
      FROM sj_attempts a, jsonb_array_elements_text(a.profile->'job_areas') AS x(code)
     WHERE a.org_id = $1 AND a.status = 'scored'
     GROUP BY x.code ORDER BY x.code`, [orgId]);
  return rows.map((r) => ({ code: r.code, n: Number(r.n) }));
}

export async function regionRange(orgId: number): Promise<{ code: string; n: number }[]> {
  const rows = await query<{ code: string; n: string }>(`
    SELECT coalesce(a.profile->>'region_range', 'UNDECIDED') AS code, count(DISTINCT a.user_id) AS n
      FROM sj_attempts a WHERE a.org_id = $1 AND a.status = 'scored'
     GROUP BY 1 ORDER BY 1`, [orgId]);
  return rows.map((r) => ({ code: r.code, n: Number(r.n) }));
}

/** 판단 축별로 '경험으로 확인됨' 에 이른 사람 수 */
export async function axisConfirmed(orgId: number): Promise<{ axis: string; n: number; of: number }[]> {
  const rows = await query<{ axis: string; n: string; of: string }>(`
    WITH s AS (
      SELECT DISTINCT ON (user_id) user_id, result FROM sj_attempts
       WHERE org_id = $1 AND status = 'scored' ORDER BY user_id, scored_at DESC
    )
    SELECT ax->>'axis' AS axis,
           count(*) FILTER (WHERE ax->>'state' IN ('CONFIRMED','PARTIAL')) AS n,
           count(*) AS of
      FROM s, jsonb_array_elements(s.result->'axes') ax
     GROUP BY 1 ORDER BY 1`, [orgId]);
  return rows.map((r) => ({ axis: r.axis, n: Number(r.n), of: Number(r.of) }));
}

export type ParticipantRow = {
  user_id: string;
  participant_no: string;
  display_name: string;
  program_code: string;
  status: string;
  last_login_at: string | null;
  attempt_status: string | null;
  started_at: string | null;
  scored_at: string | null;
  pdf_ready: string;
  pdf_last: string | null;
  views: string;
  consent: boolean | null;
  counselor: string | null;
};

/** 참여자 표. **결과 내용은 싣지 않는다**: 상태와 날짜와 기록 수만 */
export async function participants(orgId: number): Promise<ParticipantRow[]> {
  return query<ParticipantRow>(`
    SELECT p.user_id, p.participant_no, u.display_name, p.program_code, p.status,
           u.last_login_at::text,
           a.status AS attempt_status, a.started_at::text, a.scored_at::text,
           (SELECT count(*) FROM sj_report_renders r JOIN sj_attempts x ON x.id = r.attempt_id
             WHERE x.user_id = p.user_id AND r.status = 'ready') AS pdf_ready,
           (SELECT max(r.created_at)::text FROM sj_report_renders r JOIN sj_attempts x ON x.id = r.attempt_id
             WHERE x.user_id = p.user_id AND r.status = 'ready') AS pdf_last,
           (SELECT count(*) FROM sj_access_logs l WHERE l.target_user = p.user_id
             AND l.what IN ('result_web','report_web','report_pdf')) AS views,
           (SELECT granted FROM consents c WHERE c.user_id = p.user_id AND c.org_id = p.org_id
             AND c.kind = 'data_visibility' ORDER BY c.created_at DESC, c.id DESC LIMIT 1) AS consent,
           (SELECT cu.display_name FROM sj_counselor_assignments ca JOIN users cu ON cu.id = ca.counselor_user_id
             WHERE ca.org_id = p.org_id AND ca.participant_user_id = p.user_id AND ca.active LIMIT 1) AS counselor
      FROM sj_participants p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN LATERAL (
        SELECT status, started_at, scored_at FROM sj_attempts
         WHERE user_id = p.user_id ORDER BY started_at DESC LIMIT 1
      ) a ON true
     WHERE p.org_id = $1
     ORDER BY p.participant_no`, [orgId]);
}

export async function recentAccess(orgId: number, limit = 12): Promise<{
  at: string; actor: string; actor_kind: string; target_no: string | null; what: string; reason: string | null;
}[]> {
  return query(`
    SELECT l.created_at::text AS at, coalesce(au.display_name, '-') AS actor, l.actor_kind,
           p.participant_no AS target_no, l.what, l.reason
      FROM sj_access_logs l
      LEFT JOIN users au ON au.id = l.actor_id
      LEFT JOIN sj_participants p ON p.user_id = l.target_user
     WHERE p.org_id = $1 AND l.actor_kind <> 'self'
     ORDER BY l.created_at DESC LIMIT $2`, [orgId, limit]);
}
