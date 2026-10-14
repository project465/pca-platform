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
  /**
   * 학교가 명단으로 발급한 사람(대상자).
   *
   * **시작한 사람과 다른 수다.** 발급은 했는데 아무도 안 들어온 날과
   * 아무에게도 발급하지 않은 날이 `시작 0` 으로 같아 보이면, 담당자는
   * 무엇을 해야 하는지 알 수 없다. 학교 등록부의 학교가 없으면 0 이다.
   */
  roster: number;
  /**
   * 완료율. **대상자가 있으면 그것을 바닥으로, 없으면 시작한 사람을.**
   *
   * **나눌 바닥이 0 이면 비율을 만들지 않는다**(설계 원칙). 아무도
   * 시작하지 않았는데 0% 를 찍으면 그것은 거짓이다.
   */
  completion: number | null;
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
  /**
   * 단과대학별 · 학과별(규격 §13).
   *
   * **학교 전용 진입으로 들어온 응시만 여기 선다.** 일반 B2C 응시는 그
   * 칸이 비어 있고, 비어 있는 것을 `(고르지 않음)` 으로 세면 담당자가
   * 자기 학교 학생이 그만큼 있는 줄로 읽는다.
   */
  by_college: Cell[];
  by_department: Cell[];
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
  /**
   * 최근 응시 추이. 날짜마다 시작한 사람과 결과를 받은 사람.
   *
   * **5명 규칙을 날짜 칸에도 건다.** 하루에 한 사람만 친 날이 그대로
   * 찍히면 그 사람이 누구인지 담당자가 짐작할 수 있다. 가리는 것이
   * 아니라 **값을 만들지 않는다**(`n` 이 `null`).
   */
  recent: { day: string; started: number | null; scored: number | null }[];
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

/**
 * 굳은 결과가 들고 있는 묶음 코드를 담당자가 읽는 말로.
 *
 * **앞 두 글자만 보고 끝내지 않는다.** 저장된 값은
 * `Z1_EVIDENCE_ESTABLISHED` 처럼 꼬리가 붙어 있고 `NOT_EXPLORED` 는
 * 애초에 `Z` 로 시작하지 않는다. 그래서 전에는 `ZONE_KO[r.k]` 가 늘
 * 빗나가 **담당자 화면에 안쪽 코드가 그대로 찍혔다**(규격 §16).
 */
function zoneKo(code: string): string {
  if (code === "NOT_EXPLORED") return "이번에 열지 않은 영역";
  return ZONE_KO[code.slice(0, 2)] ?? "아직 판단하기 어려운 영역";
}

/** 5명 미만이면 숫자를 내지 않는다. **0 으로 적지도 않는다** */
function cell(key: string, label: string, n: number): Cell {
  return { key, label, n: n < MIN_CELL ? null : n };
}

/**
 * 집계에 넣을 사람을 고르는 두 길.
 *
 * **소속과 학교 진입은 다른 길이다.** 학과가 명단을 올려 계정을 발급한
 * 학생은 `memberships` 로 묶이고, `/campus/{학교}` 로 혼자 들어온 학생은
 * 소속이 없다. 둘 가운데 하나만 보면 담당자 화면에 학생이 반만 잡히고,
 * **그 반이 비어 있는 것을 담당자는 `아직 아무도 안 쳤다` 로 읽는다.**
 */
export type CampusScope = {
  /** 담당자가 맡은 기관 */
  orgIds: number[];
  /** 그 기관이 학교 등록부의 어느 학교인가(`organizations.code`). 없으면 null */
  universityCode?: string | null;
};

export async function campusV3(scope: CampusScope): Promise<CampusV3> {
  const empty: CampusV3 = {
    roster: 0, completion: null, recent: [],
    started: 0, scored: 0, in_progress: 0, recomputed: 0,
    by_core: [], by_stage: [], by_industry: [], by_role: [],
    by_college: [], by_department: [],
    zone_cells: [], too_few: true,
  };
  const orgIds = scope.orgIds;
  const uni = scope.universityCode ?? null;
  if (!orgIds.length && !uni) return empty;

  /**
   * 두 길을 한 조건으로 묶는다.
   *
   * `LEFT JOIN` 이 사람을 여러 줄로 늘리지만 세는 것이 전부
   * `count(DISTINCT a.user_id)` 라 수가 부풀지 않는다. **`JOIN` 으로 두면
   * 소속이 없는 학생이 통째로 빠진다.**
   */
  const FROM = `FROM v3_attempts a
       LEFT JOIN memberships m
         ON m.user_id = a.user_id AND m.org_id = ANY($1::bigint[])
      WHERE (m.org_id IS NOT NULL
             OR ($2::text IS NOT NULL AND a.university_code = $2))`;
  const args = [orgIds, uni];

  const head = await queryOne<{ started: string; scored: string; open: string }>(
    `SELECT count(DISTINCT a.user_id)::text AS started,
            count(DISTINCT a.user_id) FILTER (WHERE a.status = 'scored')::text AS scored,
            count(DISTINCT a.user_id) FILTER (WHERE a.status = 'in_progress')::text AS open
       ${FROM}`, args);
  const started = Number(head?.started ?? 0);
  const scored = Number(head?.scored ?? 0);

  /* **사람이 다섯이 안 되면 아래를 세지 않는다.** 네 명짜리 표에서는
     전공과 학위를 겹치면 누구인지 짐작이 된다 */
  /* 대상자. **학교 등록부의 학교일 때만 셀 수 있다**: 명단은 그 표에
     학교 코드로 적힌다 */
  const roster = uni
    ? Number((await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM campus_students
        WHERE university_code = $1`, [uni]))?.n ?? 0)
    : 0;
  /**
   * 바닥은 **대상자와 응시자 가운데 큰 쪽**이다.
   *
   * 명단에 없는 학생이 학교 쪽으로 들어와 친 응시가 섞이면 응시자가
   * 대상자보다 많아진다. 그때 대상자만 바닥으로 쓰면 **완료율이 289%**
   * 로 찍힌다(한 번 그렇게 찍혔다). 비율이 100 을 넘으면 그 수는 아무도
   * 못 믿는다.
   */
  const base = Math.max(roster, started);
  const completion = base > 0 ? Math.round((scored / base) * 100) : null;

  if (started < MIN_CELL) {
    return {
      ...empty, roster, completion,
      started, scored, in_progress: Number(head?.open ?? 0),
    };
  }

  const rec = await queryOne<{ n: string }>(
    `SELECT count(DISTINCT p.user_id)::text AS n
       FROM career_profiles p
      WHERE p.recomputed_at IS NOT NULL
        AND (EXISTS (SELECT 1 FROM memberships m
                      WHERE m.user_id = p.user_id AND m.org_id = ANY($1::bigint[]))
             OR ($2::text IS NOT NULL
                 AND EXISTS (SELECT 1 FROM v3_attempts a
                              WHERE a.user_id = p.user_id
                                AND a.university_code = $2)))`, args);

  const group = async (col: string, scoredOnly = false, campusOnly = false) =>
    query<{ k: string; n: string }>(
      `SELECT coalesce(a.${col}, '(고르지 않음)') AS k,
              count(DISTINCT a.user_id)::text AS n
         ${FROM}
          ${scoredOnly ? "AND a.status = 'scored'" : ""}
          ${campusOnly ? "AND a.university_code IS NOT NULL" : ""}
        GROUP BY 1 ORDER BY 2 DESC`, args);

  const [cores, stages, inds, roles, colleges, depts] = await Promise.all([
    group("core_code"), group("education_stage"),
    group("industry_pack", true), group("role_pack", true),
    /* **학교 진입으로 들어온 응시만 센다**(규격 §13). 소속으로만 묶인
       학생은 이 칸이 비어 있고, 그 빈 칸을 `(고르지 않음)` 한 줄로
       세우면 담당자가 그만큼의 학생이 어느 학과인지 모르는 줄로 읽는다 */
    group("college_code", false, true), group("department_code", false, true),
  ]);

  /* 묶음 분포는 굳은 결과에서 읽는다. **다시 계산하지 않는다** */
  const zones = await query<{ k: string; n: string }>(
    `SELECT d ->> 'zone' AS k, count(*)::text AS n
       FROM v3_snapshots s
       JOIN v3_attempts a ON a.id = s.attempt_id
       LEFT JOIN memberships m
         ON m.user_id = a.user_id AND m.org_id = ANY($1::bigint[])
       CROSS JOIN LATERAL jsonb_array_elements(
         coalesce(s.result_model -> 'domains', '[]'::jsonb)) AS d
      WHERE (m.org_id IS NOT NULL
             OR ($2::text IS NOT NULL AND a.university_code = $2))
        AND s.result_model IS NOT NULL
        AND d ->> 'zone' IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC`, args);

  /*
   * 최근 2주. **빈 날을 건너뛰지 않는다**: 줄이 없는 날과 0 인 날이
   * 그래프에서 같아 보이면 담당자가 추이를 거꾸로 읽는다.
   *
   * **거르는 조건을 바깥 `WHERE` 에 두지 않는다.** 그렇게 두면 그날 응시가
   * 있었는데 전부 남의 기관 것이면 그 **날짜가 통째로 사라진다**: 열나흘을
   * 그린다고 적어 놓고 열흘만 선다(한 번 그렇게 섰다). 거르는 일은 안쪽
   * 부분질의가 하고, 날짜는 `generate_series` 가 끝까지 든다.
   */
  const days = await query<{ d: string; a: string; b: string }>(
    `SELECT to_char(g.d, 'MM-DD') AS d,
            count(DISTINCT t.user_id) FILTER (WHERE t.started_at::date = g.d)::text AS a,
            count(DISTINCT t.user_id) FILTER (WHERE t.submitted_at::date = g.d)::text AS b
       FROM generate_series(current_date - 13, current_date, interval '1 day') AS g(d)
       LEFT JOIN (
         SELECT DISTINCT a.user_id, a.started_at, a.submitted_at
           FROM v3_attempts a
           LEFT JOIN memberships m
             ON m.user_id = a.user_id AND m.org_id = ANY($1::bigint[])
          WHERE (m.org_id IS NOT NULL
                 OR ($2::text IS NOT NULL AND a.university_code = $2))
       ) t ON (t.started_at::date = g.d OR t.submitted_at::date = g.d)
      GROUP BY g.d ORDER BY g.d`, args);

  const hide = (n: number) => (n > 0 && n < MIN_CELL ? null : n);

  return {
    roster, completion,
    recent: days.map((r) => ({
      day: r.d, started: hide(Number(r.a)), scored: hide(Number(r.b)),
    })),
    started, scored, in_progress: Number(head?.open ?? 0),
    recomputed: Number(rec?.n ?? 0),
    by_core: cores.map((r) => cell(r.k, r.k, Number(r.n))),
    by_college: colleges.map((r) => cell(r.k, r.k, Number(r.n))),
    by_department: depts.map((r) => cell(r.k, r.k, Number(r.n))),
    by_stage: stages.map((r) => cell(r.k, STAGE_KO[r.k] ?? r.k, Number(r.n))),
    by_industry: inds.map((r) => cell(r.k, r.k, Number(r.n))),
    by_role: roles.map((r) => cell(r.k, r.k, Number(r.n))),
    zone_cells: zones.map((r) => cell(r.k, zoneKo(r.k), Number(r.n))),
    too_few: false,
  };
}
