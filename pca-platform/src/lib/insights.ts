/**
 * 기관이 보는 집계.
 *
 * **기본은 집계다.** 기관 담당자에게 개인 결과지가 자동으로 가지 않는다.
 * 여기서 나오는 것은 전부 사람 수이고, 자유 입력과 개인 서술은 담지 않는다.
 *
 * **5명 미만 칸은 숫자를 내지 않는다.** 익명 집계가 개인 식별이 되는 순간
 * 담당자가 특정 참여자를 지목할 수 있다. 감춘 칸은 0 으로 적지 않는다:
 * 0 과 '적어서 안 보여 준다' 는 다른 말이다.
 *
 * **등수를 매기지 않는다.** "학생의 32% 가 CAE 에 적합" 이 아니라
 * "32명이 지금 CAE 를 먼저 살펴보고 있다" 로 적는다.
 */
import { query } from "@/lib/db";

export type Cell = { label: string; n: number } | { label: string; hidden: true };

export function maskCells(
  rows: { label: string; n: number }[],
  minCell: number,
): Cell[] {
  return rows.map((r) =>
    r.n >= minCell ? { label: r.label, n: r.n } : { label: r.label, hidden: true as const },
  );
}

export async function minCellFor(orgId: number): Promise<number> {
  const rows = await query<{ m: number }>(
    `SELECT aggregate_min_cell AS m FROM organizations WHERE id = $1`, [orgId],
  );
  return rows[0]?.m ?? 5;
}

export type Overview = {
  seats: number; used: number; remaining: number;
  invited: number; started: number; completed: number;
  completion_rate: number | null;
  cohorts: number;
};

export async function orgOverview(orgId: number): Promise<Overview> {
  const s = await query<{ status: string; n: string }>(
    `SELECT s.status, count(*)::text AS n
       FROM seats s JOIN contracts c ON c.id = s.contract_id
      WHERE c.org_id = $1 GROUP BY s.status`, [orgId],
  );
  const by = Object.fromEntries(s.map((r) => [r.status, Number(r.n)]));
  const g = (k: string) => by[k] ?? 0;
  const seats = Object.values(by).reduce((a: number, b) => a + Number(b), 0);
  const used = g("started") + g("completed");
  const co = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM cohorts WHERE org_id = $1`, [orgId],
  );
  return {
    seats,
    used,
    remaining: seats - used - g("revoked") - g("expired"),
    invited: g("invited"),
    started: g("started"),
    completed: g("completed"),
    /* 나눌 바닥이 0 이면 비율을 만들지 않는다. 0% 는 거짓말이다 */
    completion_rate: used > 0 ? Math.round((g("completed") / used) * 100) : null,
    cohorts: Number(co[0]?.n ?? 0),
  };
}

/**
 * 어느 직무군을 먼저 살펴보고 있는가.
 *
 * 적합하다는 말을 쓰지 않는다. 지금 우선순위에 둔 사람 수다.
 */
export async function careerDistribution(orgId: number): Promise<{
  cells: Cell[]; min_cell: number; note: string;
}> {
  const minCell = await minCellFor(orgId);
  const rows = await query<{ label: string; n: string }>(
    `SELECT jc.name_key AS label, count(*)::text AS n
       FROM job_fit_scores f
       JOIN attempts a ON a.id = f.attempt_id
       JOIN test_sessions ts ON ts.id = a.session_id
       JOIN job_clusters jc ON jc.id = f.cluster_id
      WHERE ts.org_id = $1 AND f.rank_no = 1
      GROUP BY jc.name_key ORDER BY count(*) DESC`,
    [orgId],
  ).catch(() => [] as { label: string; n: string }[]);
  return {
    cells: maskCells(rows.map((r) => ({ label: r.label, n: Number(r.n) })), minCell),
    min_cell: minCell,
    note: "지금 먼저 살펴보고 있는 직무입니다. 적합하다는 뜻이 아닙니다.",
  };
}

/** 참여자 상태. **개인 결과지 내용은 한 글자도 담지 않는다.** */
export type ParticipantRow = {
  user_id: number; display_name: string; login_id: string | null;
  cohort: string | null; seat_status: string | null;
  assessment_status: string; last_activity: string | null;
};

export async function participants(orgId: number): Promise<ParticipantRow[]> {
  return query<ParticipantRow>(
    `SELECT u.id AS user_id, u.display_name, u.login_id,
            co.name AS cohort, s.status AS seat_status,
            COALESCE(a.status, 'not_started') AS assessment_status,
            GREATEST(a.submitted_at, a.started_at, s.claimed_at)::text AS last_activity
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN seats s ON s.user_id = u.id
       LEFT JOIN contracts c ON c.id = s.contract_id AND c.org_id = $1
       LEFT JOIN attempts a ON a.user_id = u.id
       LEFT JOIN cohort_members cm ON cm.user_id = u.id
       LEFT JOIN cohorts co ON co.id = cm.cohort_id AND co.org_id = $1
      WHERE m.org_id = $1 AND m.role IN ('student')
      ORDER BY u.display_name`,
    [orgId],
  );
}
