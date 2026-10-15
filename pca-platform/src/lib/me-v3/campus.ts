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

/** 단과대학 한 줄. 다섯이 안 되는 칸은 `null` 이고 화면이 빗금으로 그린다 */
export type CollegeRow = {
  code: string;
  /** 명단과 학교 진입을 합친 사람(§22). `시작 ≤ 대상자` 가 늘 참이다 */
  target: number | null;
  started: number | null;
  scored: number | null;
  /** 완료 ÷ 대상자. **clamp 하지 않는다** */
  rate: number | null;
};

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
   * 대상자(규격 §22). **명단과 학교 진입을 합친 사람 수**다.
   *
   * 명단에 없는 학생이 `/campus/{학교}` 로 들어와 응시하면 시작한 사람이
   * 명단보다 많아진다. 그때 명단만 바닥으로 쓰면 **완료율이 289% 로**
   * 찍히고(한 번 그렇게 찍혔다), 비율이 100 을 넘으면 그 수는 아무도 못
   * 믿는다. **clamp 로 막지 않는다**: 100 에서 자르면 틀린 집계가 맞아
   * 보이기만 한다. 두 모집단의 합집합을 세면 `완료 ≤ 시작 ≤ 대상자` 가
   * 집계 자체로 참이 된다.
   */
  target: number;
  /**
   * 완료율. **바닥은 늘 `target` 이다.**
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
  /**
   * 단과대학 한 줄(규격 §21). **막대 하나로는 담당자가 판단하지 못한다**:
   * 응시 수만 보여 주면 `많다 · 적다` 밖에 못 읽고, 그 단과대학이 **몇
   * 명 가운데 몇 명인지**가 없다. 네 칸이 한 줄에 선다.
   *
   * 다섯이 안 되는 칸은 수를 내지 않는다(`null`). 가리는 것이 아니라
   * **값을 만들지 않는다**: 화면이 알아서 가려 주기를 바라면 내보내기나
   * 캡처에서 새어 나간다.
   */
  college_rows: CollegeRow[];
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
  /**
   * 주의가 필요한 학과(규격 §22).
   *
   * **새 지표를 만들지 않는다.** 여기 서는 둘은 위에서 이미 센 것이고
   * (시작한 사람 · 결과를 받은 사람) 셋째는 그 둘의 차다. 학과끼리 줄을
   * 세우지 않고, **아직 끝내지 않은 사람이 많은 쪽을 먼저 적는다**:
   * 담당자가 이 화면에서 할 일이 그 학과에 안내를 한 번 더 보내는 것이다.
   *
   * 5명 규칙을 그대로 지난다. 시작한 사람이 다섯이 안 되는 학과는 이
   * 목록에 서지 않는다 — 그런 학과에서 `한 명이 아직 안 끝냈습니다` 는
   * 그 한 사람을 가리키는 말이다.
   */
  attention: { code: string; label: string; started: number; scored: number; open: number }[];
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
  /**
   * 시연 자료까지 섞어서 본다. **기본은 끈다.**
   *
   * 운영 지표에서 시연과 검사 계정을 거르는 규칙은 이 저장소가 전부터
   * 들고 있었는데(`admin-overview` · `funnel` · `ops`), **학교 집계만
   * 그 줄을 빠뜨리고 있었다.** 그래서 담당자 화면의 대상자와 완료자에
   * 우리가 만든 계정이 섞이고, 그 수로 낸 완료율이 100 을 넘었다.
   */
  withDemo?: boolean;
  /**
   * 기간과 자리로 좁혀 본다(규격 §16). **없으면 전부다.**
   *
   * 담당자가 사업보고를 쓸 때 묻는 것은 `이 학기에` 와 `우리 단과대학에서`
   * 다. 좁히는 자리를 집계 함수 하나에 두는 까닭은 **화면이 따로 거르면
   * 5명 미만 규칙이 그 뒤에 적용되어** 가려야 할 칸이 드러나기 때문이다.
   */
  from?: string | null;
  to?: string | null;
  college?: string | null;
  department?: string | null;
};

export async function campusV3(scope: CampusScope): Promise<CampusV3> {
  const empty: CampusV3 = {
    roster: 0, target: 0, completion: null, recent: [], college_rows: [],
    started: 0, scored: 0, in_progress: 0, recomputed: 0,
    by_core: [], by_stage: [], by_industry: [], by_role: [],
    by_college: [], by_department: [],
    zone_cells: [], attention: [], too_few: true,
  };
  const orgIds = scope.orgIds;
  const uni = scope.universityCode ?? null;
  if (!orgIds.length && !uni) return empty;
  /* 시연과 검사 계정을 빼는 조건. 섞어 보기로 했으면 늘 참이다 */
  const live = (col: string) => (scope.withDemo
    ? "TRUE"
    : `NOT EXISTS (SELECT 1 FROM users du WHERE du.id = ${col} AND du.is_demo)`);

  /**
   * 두 길을 한 조건으로 묶는다.
   *
   * `LEFT JOIN` 이 사람을 여러 줄로 늘리지만 세는 것이 전부
   * `count(DISTINCT a.user_id)` 라 수가 부풀지 않는다. **`JOIN` 으로 두면
   * 소속이 없는 학생이 통째로 빠진다.**
   */
  const args: unknown[] = [orgIds, uni];
  const argsF: unknown[] = [orgIds, uni];
  /* 좁히는 값이 몇 번째 자리에 들어갔는가. **번호를 손으로 세지 않는다**:
     조건 하나를 더하면 그 뒤 번호가 전부 밀리고, 밀린 자리를 하나 빠뜨리면
     질의가 남의 값으로 거른다 */
  const P: Record<"from" | "to" | "college" | "department", number> = {
    from: 0, to: 0, college: 0, department: 0,
  };
  const put = (k: keyof typeof P, v: string | null | undefined): void => {
    if (!v) return;
    argsF.push(v); P[k] = argsF.length;
  };
  put("from", scope.from); put("to", scope.to);
  put("college", scope.college); put("department", scope.department);

  const FROM = `FROM v3_attempts a
       LEFT JOIN memberships m
         ON m.user_id = a.user_id AND m.org_id = ANY($1::bigint[])
      WHERE (m.org_id IS NOT NULL
             OR ($2::text IS NOT NULL AND a.university_code = $2))
        AND ${live("a.user_id")}
        ${P.from ? `AND a.started_at >= $${P.from}::date` : ""}
        ${P.to ? `AND a.started_at < ($${P.to}::date + 1)` : ""}
        ${P.college ? `AND a.college_code = $${P.college}` : ""}
        ${P.department ? `AND a.department_code = $${P.department}` : ""}`;
  /**
   * **두 벌을 둔다.** `FROM` 을 쓰는 질의는 좁히는 값까지 받고, 제 `WHERE`
   * 를 따로 들고 있는 질의(추이 · 묶음 분포 · 재분석 수)는 앞의 둘만
   * 받는다. PostgreSQL 은 **쓰지 않는 자리를 더 넘기면 그 자리에서
   * 거절한다**: 한 벌로 돌려 쓰면 좁혀 보는 날 화면이 통째로 멈춘다.
   */


  const head = await queryOne<{ started: string; scored: string; open: string }>(
    `SELECT count(DISTINCT a.user_id)::text AS started,
            count(DISTINCT a.user_id) FILTER (WHERE a.status = 'scored')::text AS scored,
            count(DISTINCT a.user_id) FILTER (WHERE a.status = 'in_progress')::text AS open
       ${FROM}`, argsF);
  const started = Number(head?.started ?? 0);
  const scored = Number(head?.scored ?? 0);

  /* **사람이 다섯이 안 되면 아래를 세지 않는다.** 네 명짜리 표에서는
     전공과 학위를 겹치면 누구인지 짐작이 된다 */
  /* 대상자. **학교 등록부의 학교일 때만 셀 수 있다**: 명단은 그 표에
     학교 코드로 적힌다 */
  const roster = uni
    ? Number((await queryOne<{ n: string }>(
      `SELECT count(DISTINCT cs.user_id)::text AS n FROM campus_students cs
        WHERE cs.university_code = $1
          AND ${live("cs.user_id")}`, [uni]))?.n ?? 0)
    : 0;
  /**
   * 바닥은 **대상자와 응시자 가운데 큰 쪽**이다.
   *
   * 명단에 없는 학생이 학교 쪽으로 들어와 친 응시가 섞이면 응시자가
   * 대상자보다 많아진다. 그때 대상자만 바닥으로 쓰면 **완료율이 289%**
   * 로 찍힌다(한 번 그렇게 찍혔다). 비율이 100 을 넘으면 그 수는 아무도
   * 못 믿는다.
   */
  /**
   * 대상자는 **명단과 학교 진입의 합집합**이다(규격 §22).
   *
   * `max(명단, 시작)` 으로 두면 명단에 있으면서 응시하지 않은 사람과
   * 명단 밖에서 응시한 사람이 **같은 날 함께 있으면** 어느 쪽도 맞지
   * 않는다(명단 10 · 그 가운데 2명 응시 · 명단 밖 3명 응시 → 참값은 13
   * 인데 `max` 는 10 을 돌려준다). 합집합은 그 자리에서 13 이고, 그래서
   * **시작 ≤ 대상자가 clamp 없이 참이 된다.**
   */
  const target = uni
    ? Number((await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM (
         SELECT cs.user_id FROM campus_students cs
          WHERE cs.university_code = $2 AND ${live("cs.user_id")}
            ${P.college ? `AND cs.college_code = $${P.college}` : ""}
            ${P.department ? `AND cs.department_code = $${P.department}` : ""}
         UNION
         SELECT a.user_id ${FROM}
       ) u`, argsF))?.n ?? 0)
    : started;
  const completion = target > 0 ? Math.round((scored / target) * 100) : null;

  if (started < MIN_CELL) {
    return {
      ...empty, roster, target, completion,
      started, scored, in_progress: Number(head?.open ?? 0),
    };
  }

  const rec = await queryOne<{ n: string }>(
    `SELECT count(DISTINCT p.user_id)::text AS n
       FROM career_profiles p
      WHERE p.recomputed_at IS NOT NULL
        AND ${live("p.user_id")}
        AND (EXISTS (SELECT 1 FROM memberships m
                      WHERE m.user_id = p.user_id AND m.org_id = ANY($1::bigint[]))
             OR ($2::text IS NOT NULL
                 AND EXISTS (SELECT 1 FROM v3_attempts a
                              WHERE a.user_id = p.user_id
                                AND a.university_code = $2)))`, args);

  const group = async (col: string, scoredOnly = false, campusOnly = false) =>
    query<{ k: string; n: string }>(
      /* **빈 글자를 이름 없는 막대로 세우지 않는다.** `NULL` 만 거르면
         빈 글자(`''`)로 적힌 줄이 **이름 없는 막대**로 선다(한 번 그렇게
         섰다). 안 고른 것과 빈 글자는 담당자에게 같은 뜻이다 */
      `SELECT coalesce(nullif(a.${col}, ''), '(고르지 않음)') AS k,
              count(DISTINCT a.user_id)::text AS n
         ${FROM}
          ${scoredOnly ? "AND a.status = 'scored'" : ""}
          ${campusOnly ? "AND a.university_code IS NOT NULL" : ""}
        GROUP BY 1 ORDER BY 2 DESC`, argsF);

  const [cores, stages, inds, roles, colleges, depts, deptsDone] = await Promise.all([
    group("core_code"), group("education_stage"),
    group("industry_pack", true), group("role_pack", true),
    /* **학교 진입으로 들어온 응시만 센다**(규격 §13). 소속으로만 묶인
       학생은 이 칸이 비어 있고, 그 빈 칸을 `(고르지 않음)` 한 줄로
       세우면 담당자가 그만큼의 학생이 어느 학과인지 모르는 줄로 읽는다 */
    group("college_code", false, true), group("department_code", false, true),
    /* 학과마다 끝낸 사람. **같은 질의를 등급만 바꿔 한 번 더 부른다**:
       세는 법을 두 곳에 적으면 어느 날 갈린다 */
    group("department_code", true, true),
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
            AND ${live("a.user_id")}
       ) t ON (t.started_at::date = g.d OR t.submitted_at::date = g.d)
      GROUP BY g.d ORDER BY g.d`, args);

  /**
   * 단과대학 한 줄(규격 §21). **대상자와 시작과 완료를 한 질의에서 센다.**
   *
   * 셋을 따로 세면 어느 날 세는 법이 갈린다. 대상자는 전체와 같은 규칙,
   * 곧 **명단과 학교 진입의 합집합**이라 `시작 ≤ 대상자` 가 줄마다 참이다.
   */
  const colRows = await query<{ k: string; t: string; a: string; b: string }>(
    `SELECT k,
            count(DISTINCT user_id)::text AS t,
            count(DISTINCT user_id) FILTER (WHERE src = 'a')::text AS a,
            count(DISTINCT user_id) FILTER (WHERE done)::text AS b
       FROM (
         SELECT coalesce(nullif(a.college_code, ''), '(고르지 않음)') AS k,
                a.user_id, 'a'::text AS src, (a.status = 'scored') AS done
           ${FROM}
            AND a.university_code IS NOT NULL
         UNION ALL
         SELECT cs.college_code AS k, cs.user_id, 'r'::text, FALSE
           FROM campus_students cs
          WHERE $2::text IS NOT NULL AND cs.university_code = $2
            AND ${live("cs.user_id")}
       ) t
      GROUP BY k ORDER BY 2 DESC`, argsF);

  const hide = (n: number) => (n > 0 && n < MIN_CELL ? null : n);

  /* 주의가 필요한 학과. **새로 세지 않고 위의 둘을 뺀다** */
  const done = new Map(deptsDone.map((r) => [r.k, Number(r.n)]));
  const attention = depts
    .map((r) => {
      const st = Number(r.n);
      const sc = done.get(r.k) ?? 0;
      return { code: r.k, label: r.k, started: st, scored: sc, open: st - sc };
    })
    .filter((r) => r.started >= MIN_CELL && r.open > 0)
    .sort((a, b) => b.open - a.open);

  return {
    roster, target, completion,
    recent: days.map((r) => ({
      day: r.d, started: hide(Number(r.a)), scored: hide(Number(r.b)),
    })),
    started, scored, in_progress: Number(head?.open ?? 0),
    recomputed: Number(rec?.n ?? 0),
    /* 다섯이 안 되는 칸은 **값을 만들지 않는다**. 비율도 그때는 없다:
       바닥이 가려진 비율은 그 자리에서 사람을 되짚게 한다 */
    college_rows: colRows.map((r) => {
      const t = hide(Number(r.t)); const a = hide(Number(r.a));
      const b = hide(Number(r.b));
      return {
        code: r.k, target: t, started: a, scored: b,
        rate: t !== null && b !== null && t > 0 ? Math.round((b / t) * 100) : null,
      };
    }),
    by_core: cores.map((r) => cell(r.k, r.k, Number(r.n))),
    by_college: colleges.map((r) => cell(r.k, r.k, Number(r.n))),
    by_department: depts.map((r) => cell(r.k, r.k, Number(r.n))),
    by_stage: stages.map((r) => cell(r.k, STAGE_KO[r.k] ?? r.k, Number(r.n))),
    by_industry: inds.map((r) => cell(r.k, r.k, Number(r.n))),
    by_role: roles.map((r) => cell(r.k, r.k, Number(r.n))),
    zone_cells: zones.map((r) => cell(r.k, zoneKo(r.k), Number(r.n))),
    attention,
    too_few: false,
  };
}
