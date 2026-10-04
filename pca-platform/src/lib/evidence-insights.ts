/**
 * 기관이 보는 증거 집계.
 *
 * `insights.ts` 가 "어느 직무를 먼저 살펴보는가" 를 세고, 여기는 "그
 * 직무가 보고 싶어 하는 증거 가운데 무엇이 비어 있는가" 를 센다. 깊이와
 * 범위를 따로 재는 것과 같은 이유로 **둘을 한 숫자로 합치지 않는다.**
 *
 * **5명 미만 칸은 숫자를 내지 않는다.** 그리고 0 으로 적지도 않는다:
 * `insights.ts` 의 `maskCells` 를 그대로 쓴다. 감춘 칸을 0 으로 적으면
 * 담당자가 "아무도 없다" 로 읽는다.
 *
 * **모자라다고 쓰지 않는다.** 나가는 이름은 `아직 확인되지 않음` 이다.
 * 여기서 사람을 가리키는 칸은 만들지 않는다: 자유 입력도 개인 서술도
 * 담지 않고, 사람 수만 센다.
 */
import { query } from "@/lib/db";
import { maskCells, minCellFor, type Cell } from "@/lib/insights";

export type EvidenceInsights = {
  min_cell: number;
  /** 핵심 영역 가운데 가장 자주 비어 있는 것 */
  core_gaps: Cell[];
  /** 확인 · 일부 확인 · 아직 — 사람 수가 아니라 줄 수다 */
  states: { label: string; n: number; tone: "ok" | "part" | "not" }[];
  /** 써 본 도구 갈래 */
  tools: Cell[];
  /** 그 도구가 실제 경험에 걸려 있는 사람 */
  tools_linked: Cell[];
  /** 다음 행동이 어느 갈래로 나갔는가 */
  next_actions: Cell[];
  /** 집계에 들어간 응시 수. 0 이면 화면이 빈 자리를 그린다 */
  attempts: number;
};

const ACTION_LABEL: Record<string, string> = {
  course: "수업으로 채우기",
  project: "프로젝트로 채우기",
  cert: "자격으로 채우기",
  ncs_unit: "NCS 단위로 채우기",
  camp: "캠프·교육으로 채우기",
  online: "온라인 과정으로 채우기",
};

const num = (v: unknown) => Number(v ?? 0);

export async function evidenceInsights(orgId: number): Promise<EvidenceInsights> {
  const minCell = await minCellFor(orgId);

  const att = await query<{ n: string }>(
    `SELECT count(DISTINCT a.id)::text AS n
       FROM attempts a JOIN test_sessions ts ON ts.id = a.session_id
      WHERE ts.org_id = $1 AND a.submitted_at IS NOT NULL`,
    [orgId],
  ).catch(() => []);
  const attempts = num(att[0]?.n);

  /* 가장 자주 비어 있는 핵심 역량. **사람 수로 센다**: 한 사람이 같은
     역량을 여러 직무에서 비워 뒀다고 두 번 세면 수가 부푼다 */
  const gaps = await query<{ label: string; n: string }>(
    `SELECT c.code AS label, count(DISTINCT a.user_id)::text AS n
       FROM skill_gap_items g
       JOIN attempts a ON a.id = g.attempt_id
       JOIN test_sessions ts ON ts.id = a.session_id
       JOIN competencies c ON c.id = g.competency_id
      WHERE ts.org_id = $1 AND g.rank_no <= 5
      GROUP BY c.code ORDER BY count(DISTINCT a.user_id) DESC LIMIT 8`,
    [orgId],
  ).catch(() => []);

  /* 확인 · 일부 · 아직. 보유 레벨이 요구 레벨에 닿았는지로 가른다 */
  const st = await query<{ k: string; n: string }>(
    `SELECT CASE
              WHEN g.held_level >= g.required_level THEN 'ok'
              WHEN g.held_level > 0 THEN 'part'
              ELSE 'not' END AS k,
            count(*)::text AS n
       FROM skill_gap_items g
       JOIN attempts a ON a.id = g.attempt_id
       JOIN test_sessions ts ON ts.id = a.session_id
      WHERE ts.org_id = $1
      GROUP BY 1`,
    [orgId],
  ).catch(() => []);
  const byState = Object.fromEntries(st.map((r) => [r.k, num(r.n)]));

  const tools = await query<{ label: string; n: string }>(
    `SELECT es.code AS label, count(DISTINCT le.user_id)::text AS n
       FROM learner_evidence le
       JOIN evidence_sources es ON es.code = le.source_code
       JOIN memberships m ON m.user_id = le.user_id
      WHERE m.org_id = $1
      GROUP BY es.code ORDER BY count(DISTINCT le.user_id) DESC LIMIT 8`,
    [orgId],
  ).catch(() => []);

  /* 도구 이름만 적은 것과 경험에 걸린 것을 가른다. **이름 하나로 숙련을
     말하지 않는다**: 걸린 쪽이 실제로 설명할 재료가 있는 사람이다 */
  const linked = await query<{ label: string; n: string }>(
    `SELECT es.code AS label, count(DISTINCT le.user_id)::text AS n
       FROM learner_evidence le
       JOIN evidence_sources es ON es.code = le.source_code
       JOIN memberships m ON m.user_id = le.user_id
      WHERE m.org_id = $1 AND COALESCE(le.ref_label, '') <> ''
      GROUP BY es.code ORDER BY count(DISTINCT le.user_id) DESC LIMIT 8`,
    [orgId],
  ).catch(() => []);

  const acts = await query<{ label: string; n: string }>(
    `SELECT COALESCE(g.action_kind, 'project') AS label,
            count(DISTINCT a.user_id)::text AS n
       FROM skill_gap_items g
       JOIN attempts a ON a.id = g.attempt_id
       JOIN test_sessions ts ON ts.id = a.session_id
      WHERE ts.org_id = $1 AND g.rank_no <= 3
      GROUP BY 1 ORDER BY count(DISTINCT a.user_id) DESC`,
    [orgId],
  ).catch(() => []);

  return {
    min_cell: minCell,
    attempts,
    core_gaps: maskCells(gaps.map((r) => ({ label: r.label, n: num(r.n) })), minCell),
    states: [
      { label: "확인", n: num(byState.ok), tone: "ok" as const },
      { label: "일부 확인", n: num(byState.part), tone: "part" as const },
      { label: "아직 확인되지 않음", n: num(byState.not), tone: "not" as const },
    ],
    tools: maskCells(tools.map((r) => ({ label: r.label, n: num(r.n) })), minCell),
    tools_linked: maskCells(linked.map((r) => ({ label: r.label, n: num(r.n) })), minCell),
    next_actions: maskCells(
      acts.map((r) => ({ label: ACTION_LABEL[r.label] ?? r.label, n: num(r.n) })),
      minCell,
    ),
  };
}

/** 학위 단계와 회차 비교. 직무 집계 쪽에서 쓴다. */
export type Breakdowns = {
  min_cell: number;
  stages: Cell[];
  cohorts: { label: string; total: number; completed: number; rate: number | null }[];
  status: { label: string; n: number }[];
};

export async function breakdowns(orgId: number): Promise<Breakdowns> {
  const minCell = await minCellFor(orgId);

  /* **학위 단계를 지어내지 않는다.** `learner_profiles` 에 있는 것은 학년과
     트랙이고 학위 단계 칸은 없다. 그래서 세는 것도 학년이고, 화면에 적는
     이름도 학년이다. ME_V2 의 학위 단계는 아직 서버에 올라오지 않는다 */
  const stages = await query<{ label: string; n: string }>(
    `SELECT CASE WHEN lp.grade_year IS NULL THEN '미지정'
                 ELSE lp.grade_year::text || '학년' END AS label,
            count(DISTINCT u.id)::text AS n
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN learner_profiles lp ON lp.user_id = u.id
      WHERE m.org_id = $1
      GROUP BY 1 ORDER BY count(DISTINCT u.id) DESC`,
    [orgId],
  ).catch(() => []);

  const cohorts = await query<{ label: string; total: string; done: string }>(
    `SELECT co.name AS label,
            count(cm.user_id)::text AS total,
            count(*) FILTER (WHERE a.submitted_at IS NOT NULL)::text AS done
       FROM cohorts co
       LEFT JOIN cohort_members cm ON cm.cohort_id = co.id
       LEFT JOIN attempts a ON a.user_id = cm.user_id
      WHERE co.org_id = $1
      GROUP BY co.id, co.name ORDER BY co.name`,
    [orgId],
  ).catch(() => []);

  const status = await query<{ label: string; n: string }>(
    `SELECT s.status AS label, count(*)::text AS n
       FROM seats s JOIN contracts c ON c.id = s.contract_id
      WHERE c.org_id = $1 GROUP BY s.status`,
    [orgId],
  ).catch(() => []);

  return {
    min_cell: minCell,
    stages: maskCells(stages.map((r) => ({ label: r.label, n: num(r.n) })), minCell),
    cohorts: cohorts.map((r) => {
      const total = num(r.total), done = num(r.done);
      return {
        label: r.label, total, completed: done,
        /* 바닥이 0 이면 비율을 만들지 않는다 */
        rate: total > 0 ? Math.round((done / total) * 100) : null,
      };
    }),
    status: status.map((r) => ({ label: r.label, n: num(r.n) })),
  };
}
