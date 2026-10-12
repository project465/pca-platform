/**
 * 학과 담당자가 보는 **V3 집계.**
 *
 * 전까지 Campus 는 옛 검사 표(`responses` · `job_fit_scores` ·
 * `area_scores`)만 읽었다. 화면은 멀쩡히 뜨고 5명 규칙도 살아 있는데,
 * **지금 파는 검사를 친 학생이 담당자 화면에 한 명도 잡히지 않았다.**
 * 종합대학 담당자에게 보여주는 자리가 바로 거기다.
 *
 * **새 지표를 만들지 않는다.** 여기서 나오는 것은 전부 세는 값이다:
 * 몇 명이 시작했고 몇 명이 끝냈고 어느 전공과 학위와 산업과 직무를
 * 골랐는가. 종합점수도 대학 KPI 도 만들지 않는다. 그런 수를 하나
 * 만들면 학과끼리 그 수로 견주게 되고, 견줄 자가 없는 값이 생긴다.
 *
 * **5명 규칙은 기존 것을 그대로 쓴다**(`MIN_CELL`). 가려서 보여 주지 않고
 * **값을 아예 만들지 않는다**: 화면이 알아서 가려 주기를 바라면
 * 내보내기나 캡처에서 새어 나간다.
 */
import { query, queryOne } from "@/lib/db";
import { MIN_CELL } from "@/lib/org";

/** 한 칸. 5명 미만이면 `n` 이 `null` 이다 */
export type Cell = { key: string; label: string; n: number | null };

export type CampusV3 = {
  /** 이 기관에서 V3 를 시작한 사람 */
  started: number;
  /** 끝내고 결과를 받은 사람 */
  scored: number;
  /** 아직 푸는 중인 사람 */
  in_progress: number;
  /** 새 경험을 더해 지금 값을 갱신한 사람 */
  recomputed: number;
  /** 전공(Major Core)별 */
  by_core: Cell[];
  /** 학위 단계별 */
  by_stage: Cell[];
  /** 고른 산업별 */
  by_industry: Cell[];
  /** 고른 직무별 */
  by_role: Cell[];
  /**
   * 끝낸 사람의 영역 묶음 분포.
   *
   * **사람 수가 아니라 (사람 × 영역) 칸 수다.** 한 사람이 영역 열둘을
   * 들고 있어서, 이 수를 사람 수로 읽으면 열두 배로 보인다. 그 사실을
   * 화면이 함께 적는다.
   */
  zone_cells: Cell[];
  /** 집계에 들어간 사람이 5명이 안 되는가. 그러면 아래 칸이 전부 null 이다 */
  too_few: boolean;
};

const STAGE_KO: Record<string, string> = {
  bachelor: "학부", master: "석사", phd: "박사", postdoc: "박사후연구원",
};
const ZONE_KO: Record<string, string> = {
  Z1: "근거가 확인된 영역", Z2: "관심은 있고 근거가 얕은 영역",
  Z3: "근거는 있고 관심이 낮은 영역", Z4: "아직 판단하기 어려운 영역",
  Z5: "이번에 열지 않은 영역",
};

/** 5명 미만이면 숫자를 내지 않는다. **0 으로 적지도 않는다** */
function cell(key: string, label: string, n: number): Cell {
  return { key, label, n: n < MIN_CELL ? null : n };
}

export async function campusV3(orgIds: number[]): Promise<CampusV3> {
  const empty: CampusV3 = {
    started: 0, scored: 0, in_progress: 0, recomputed: 0,
    by_core: [], by_stage: [], by_industry: [], by_role: [],
    zone_cells: [], too_few: true,
  };
  if (!orgIds.length) return empty;

  const head = await queryOne<{ started: string; scored: string; open: string }>(
    `SELECT count(DISTINCT a.user_id)::text AS started,
            count(DISTINCT a.user_id) FILTER (WHERE a.status = 'scored')::text AS scored,
            count(DISTINCT a.user_id) FILTER (WHERE a.status = 'in_progress')::text AS open
       FROM v3_attempts a
       JOIN memberships m ON m.user_id = a.user_id
      WHERE m.org_id = ANY($1::bigint[])`, [orgIds]);
  const started = Number(head?.started ?? 0);
  const scored = Number(head?.scored ?? 0);

  /* **사람이 다섯이 안 되면 아래를 세지 않는다.** 네 명짜리 표에서는
     전공과 학위를 겹치면 누구인지 짐작이 된다 */
  if (started < MIN_CELL) {
    return { ...empty, started, scored, in_progress: Number(head?.open ?? 0) };
  }

  const rec = await queryOne<{ n: string }>(
    `SELECT count(DISTINCT p.user_id)::text AS n
       FROM career_profiles p
       JOIN memberships m ON m.user_id = p.user_id
      WHERE m.org_id = ANY($1::bigint[]) AND p.recomputed_at IS NOT NULL`, [orgIds]);

  const group = async (col: string, scoredOnly = false) => query<{ k: string; n: string }>(
    `SELECT coalesce(a.${col}, '(고르지 않음)') AS k, count(DISTINCT a.user_id)::text AS n
       FROM v3_attempts a
       JOIN memberships m ON m.user_id = a.user_id
      WHERE m.org_id = ANY($1::bigint[])
        ${scoredOnly ? "AND a.status = 'scored'" : ""}
      GROUP BY 1 ORDER BY 2 DESC`, [orgIds]);

  const [cores, stages, inds, roles] = await Promise.all([
    group("core_code"), group("education_stage"),
    group("industry_pack", true), group("role_pack", true),
  ]);

  /* 묶음 분포는 굳은 결과에서 읽는다. **다시 계산하지 않는다** */
  const zones = await query<{ k: string; n: string }>(
    `SELECT d ->> 'zone' AS k, count(*)::text AS n
       FROM v3_snapshots s
       JOIN v3_attempts a ON a.id = s.attempt_id
       JOIN memberships m ON m.user_id = a.user_id
       CROSS JOIN LATERAL jsonb_array_elements(
         coalesce(s.result_model -> 'domains', '[]'::jsonb)) AS d
      WHERE m.org_id = ANY($1::bigint[]) AND s.result_model IS NOT NULL
        AND d ->> 'zone' IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC`, [orgIds]);

  return {
    started, scored, in_progress: Number(head?.open ?? 0),
    recomputed: Number(rec?.n ?? 0),
    by_core: cores.map((r) => cell(r.k, r.k, Number(r.n))),
    by_stage: stages.map((r) => cell(r.k, STAGE_KO[r.k] ?? r.k, Number(r.n))),
    by_industry: inds.map((r) => cell(r.k, r.k, Number(r.n))),
    by_role: roles.map((r) => cell(r.k, r.k, Number(r.n))),
    zone_cells: zones.map((r) => cell(r.k, ZONE_KO[r.k] ?? r.k, Number(r.n))),
    too_few: false,
  };
}
