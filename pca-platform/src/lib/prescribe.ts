/**
 * 과목 처방 — 고교학점제 2022 개정 교육과정.
 *
 * 고교판 결과지의 마지막 칸이다. "기계공학이 앞에 있습니다" 로 끝나면 학생이
 * 다음 주에 할 일이 없다. 2학년 과목 신청서에 무엇을 적을지까지 내려가야
 * 결과지가 쓰인다.
 *
 * 이 파일이 지키는 것 네 가지.
 *
 * 1. **1군 전부에 필요한 과목을 먼저 낸다.**
 *    채점이 "1군에 기계공학과 신소재공학 둘이 있고 우열을 못 가린다" 고
 *    말해 놓고 처방이 기계공학 과목만 내면 앞뒤가 안 맞는다. 둘 다에
 *    걸리는 과목이 먼저고, 갈리는 과목은 "여기서 갈린다" 고 표시한다.
 *    고1이 지금 하나로 좁힐 이유가 없다.
 *
 * 2. **신청할 수 있는 목록을 낸다.**
 *    미적분Ⅱ 를 적어 놓고 미적분Ⅰ 을 빠뜨리면 학생은 그 신청서를 낼 수
 *    없다. 선수과목을 따라 올라가며 빠진 것을 채워 넣는다.
 *
 * 3. **왜 그 과목인지를 함께 낸다.**
 *    이유 없는 목록은 학부모가 먼저 안 믿는다. 문장은 데이터
 *    (hs_subject_major_map + translations)에서 오고 코드가 짓지 않는다.
 *
 * 4. **계열이 요구하는 것과 대학이 권장하는 것을 섞지 않는다.**
 *    "기계공학과 수업이 전제한다" 와 "서울대가 밝혔다" 는 근거가 다르다.
 *    앞엣것은 necessity, 뒤엣것은 hs_univ_subject_recs 로 따로 나간다.
 *
 * 여기서 점수를 만들지 않는다. scoring.ts 가 정한 1군을 읽을 뿐이다.
 */
import { query } from "./db";
import { subjectUses } from "./chain";

export type Necessity = 1 | 2 | 3;

export type PrescribedSubject = {
  code: string;
  name: string;
  group: string;
  groupName: string;
  /** common | general | career | fusion */
  category: string;
  credit: number;
  /** 상대평가 석차등급을 병기하지 않는 과목(사회·과학 융합선택 9과목) */
  absoluteOnly: boolean;
  /** 2028 수능 출제 범위 */
  csat: boolean;
  /** 권장 학년. 학교 편제가 우선이라 참고값이다 */
  grade: number;
  necessity: Necessity;
  /** 왜 이 과목인가. 데이터에서 온다 */
  why: string;
  /** 1군 중 이 과목을 요구하는 계열 이름 */
  forMajors: string[];
  /** 1군 전부가 요구하는가 */
  shared: boolean;
  /** 먼저 들어야 하는 과목 */
  prereq: { code: string; name: string } | null;
  /** 선수과목을 맞추려고 처방이 스스로 끌어온 과목 */
  addedForPrereq: boolean;
  /** 대학이 이름을 걸고 밝힌 권장 */
  univ: { univ: string; level: string }[];
  /**
   * 이 과목이 현장 어디서 쓰이는가.
   * 처방과 사슬이 따로 놀면 학생이 두 번 읽고 연결은 스스로 해야 한다.
   */
  usedAt: { role: string; what: string }[];
};

export type GradePlan = {
  grade: number;
  subjects: PrescribedSubject[];
  credits: number;
  /** 그 학년에 넣을 수 있다고 본 학점. 넘으면 학생이 신청할 수 없다 */
  budget: number;
  /** 정원을 넘겨 3순위로 밀린 과목 */
  overflow: PrescribedSubject[];
};

export type UnivRuleCheck = {
  univ: string;
  /** 사람이 읽는 규칙 문장 */
  rule: string;
  have: number;
  need: number;
  met: boolean;
};

export type Prescription = {
  curriculum: string;
  /** 처방의 대상. 결과지 1군이다 */
  majors: { code: string; name: string }[];
  /** 1군 전부에 걸리는 과목 — 먼저 듣는다 */
  shared: PrescribedSubject[];
  /** 일부 계열에만 걸리는 과목 — 여기서 갈린다 */
  split: PrescribedSubject[];
  /** 여유가 되면 */
  optional: PrescribedSubject[];
  byGrade: GradePlan[];
  univChecks: UnivRuleCheck[];
  univPicks: PrescribedSubject[];
  totalCredits: number;
  /**
   * 계열이 갈리지 않아 "필수" 만으로도 한 학년 정원을 넘었는가.
   * 이 값이 true 면 처방이 아니라 학생이 먼저 좁혀야 한다는 뜻이고,
   * 결과지가 그렇게 말해야 한다.
   */
  tooMany: boolean;
};

/**
 * 한 학년에 넣을 수 있는 선택과목 학점.
 *
 * 2022 개정에서 고교 3년 총 이수학점은 192(교과 174 + 창체 18)이고, 고1
 * 공통이 대략 60~70학점을 가져간다. 남는 것을 2·3학년이 나눠 쓰므로 한
 * 학년에 50학점 안팎, 과목으로는 열두어 개다.
 *
 * 이 상한이 없으면 계열이 갈리지 않은 학생에게 3학년 17과목 68학점짜리
 * 목록이 나간다. 신청할 수 없는 목록은 처방이 아니다.
 */
const GRADE_BUDGET = 52;

/** 요청 언어 → 영어 → 한국어 → 코드 */
const NAME = (t: string, alias: string, langParam = "$2", field = "name") =>
  `COALESCE(
     (SELECT value FROM translations WHERE table_name='${t}' AND row_id=${alias}.id
       AND lang=${langParam} AND field='${field}'),
     (SELECT value FROM translations WHERE table_name='${t}' AND row_id=${alias}.id
       AND lang='en' AND field='${field}'),
     (SELECT value FROM translations WHERE table_name='${t}' AND row_id=${alias}.id
       AND lang='ko' AND field='${field}'),
     ${alias}.code)`;

type Row = {
  code: string;
  name: string;
  group_code: string;
  group_name: string;
  category: string;
  credit: number;
  absolute_only: boolean;
  csat: boolean;
  grade_hint: number | null;
  prereq_code: string | null;
  necessity: number;
  why: string | null;
  major_code: string;
  major_name: string;
};

/**
 * 1군 계열에 걸리는 과목을 전부 끌어온다.
 *
 * 공통과목(고1 전원 이수)은 처방에서 뺀다 — 고르는 과목이 아니라서
 * 신청서에 적을 일이 없다. 다만 선수과목으로는 계속 쓰인다.
 */
async function load(majorCodes: string[], lang: string, country = "KR") {
  return query<Row>(
    `SELECT s.code, ${NAME("hs_subjects", "s")} AS name,
            s.subject_group AS group_code,
            COALESCE(${NAME("hs_subject_groups", "g")}, s.subject_group) AS group_name,
            s.category, s.credit, s.absolute_only, s.csat, s.grade_hint, s.prereq_code,
            m.necessity,
            (SELECT value FROM translations
              WHERE table_name='hs_subject_major_map' AND row_id=m.id
                AND lang='ko' AND field='why') AS why,
            mj.code AS major_code, ${NAME("majors", "mj")} AS major_name
       FROM hs_subject_major_map m
       JOIN hs_subjects s ON s.id = m.subject_id
       JOIN majors mj ON mj.id = m.major_id
       LEFT JOIN hs_subject_groups g ON g.code = s.subject_group
      WHERE mj.code = ANY($1::text[]) AND s.country = $3
      ORDER BY m.necessity DESC, s.sort_no`,
    [majorCodes, lang, country],
  );
}

/** 선수과목을 따라 올라가려면 과목표 전체가 필요하다 */
async function allSubjects(lang: string, country = "KR") {
  return query<Omit<Row, "necessity" | "why" | "major_code" | "major_name">>(
    `SELECT s.code, ${NAME("hs_subjects", "s", "$1")} AS name,
            s.subject_group AS group_code,
            COALESCE(${NAME("hs_subject_groups", "g", "$1")}, s.subject_group) AS group_name,
            s.category, s.credit, s.absolute_only, s.csat, s.grade_hint, s.prereq_code
       FROM hs_subjects s
       LEFT JOIN hs_subject_groups g ON g.code = s.subject_group
      WHERE s.country = $2
      ORDER BY s.sort_no`,
    [lang, country],
  );
}

export async function prescribe(
  attemptId: string,
  lang = "ko",
): Promise<Prescription | null> {
  // 1. 처방의 대상 — 결과지의 1군.
  //    tier 가 없던 옛 응시는 상위 두 개로 본다.
  const majors = await query<{ code: string; name: string; tier: number }>(
    `SELECT mj.code, ${NAME("majors", "mj")} AS name,
            COALESCE(f.tier, f.rank_no) AS tier
       FROM major_fit_scores f JOIN majors mj ON mj.id = f.major_id
      WHERE f.attempt_id = $1
      ORDER BY f.rank_no`,
    [attemptId, lang],
  );
  if (!majors.length) return null;
  const topTier = majors[0].tier;
  const picked = majors.filter((m) => m.tier === topTier);

  const rows = await load(picked.map((m) => m.code), lang);
  if (!rows.length) return null;

  const catalog = new Map((await allSubjects(lang)).map((s) => [s.code, s]));

  // 대학 권장은 트랙 전체에 걸리는 것(major_id 가 비어 있다)과
  // 계열마다 갈리는 것이 섞여 있다. 서울대 유형② 는 전체에 기하·미적분Ⅱ 를
  // 권장하지만 물리학 우선 이수는 공과대학 일부 전공에만 붙는다.
  // 1군에 없는 계열의 권장을 끌어오면 그 학생 얘기가 아니다.
  const univRecs = await query<{
    code: string;
    univ_code: string;
    level: string;
    major_code: string | null;
  }>(
    `SELECT s.code, r.univ_code, r.level, mj.code AS major_code
       FROM hs_univ_subject_recs r
       JOIN hs_subjects s ON s.id = r.subject_id
       LEFT JOIN majors mj ON mj.id = r.major_id
      WHERE r.major_id IS NULL OR mj.code = ANY($1::text[])`,
    [picked.map((m) => m.code)],
  );
  const univBySubject = new Map<string, { univ: string; level: string }[]>();
  for (const r of univRecs) {
    if (!univBySubject.has(r.code)) univBySubject.set(r.code, []);
    const list = univBySubject.get(r.code)!;
    // 같은 대학이 같은 과목에 두 경로로 걸릴 수 있다. 한 번만 적는다
    if (!list.some((x) => x.univ === r.univ_code)) {
      list.push({ univ: r.univ_code, level: r.level });
    }
  }

  // 2. 과목별로 합친다. 1군 안에서 가장 높은 필요도를 쓰고,
  //    그 필요도를 매긴 계열의 이유를 함께 가져온다.
  const byCode = new Map<string, PrescribedSubject>();
  for (const r of rows) {
    if (r.category === "common") continue; // 고1 전원 이수. 고르는 과목이 아니다
    const cur = byCode.get(r.code);
    if (!cur) {
      byCode.set(r.code, {
        code: r.code,
        name: r.name,
        group: r.group_code,
        groupName: r.group_name,
        category: r.category,
        credit: r.credit,
        absoluteOnly: r.absolute_only,
        csat: r.csat,
        grade: r.grade_hint ?? 2,
        necessity: r.necessity as Necessity,
        why: r.why ?? "",
        forMajors: [r.major_name],
        shared: false,
        prereq: null,
        addedForPrereq: false,
        univ: univBySubject.get(r.code) ?? [],
        usedAt: [],
      });
      continue;
    }
    cur.forMajors.push(r.major_name);
    if (r.necessity > cur.necessity) {
      cur.necessity = r.necessity as Necessity;
      cur.why = r.why ?? cur.why;
    }
  }

  /**
   * 3. 정원 안으로 줄인다.
   *
   * 필요도 3(사실상 필수)은 그대로 두고, 2(권장)는 학년 정원이 찰 때까지만
   * 담는다. 같은 필요도 안에서는 **1군 중 더 많은 계열이 요구하는 과목**이
   * 먼저다 — 아직 하나로 좁히지 않은 학생에게는 그쪽이 덜 위험한 선택이다.
   */
  const rank = (s: PrescribedSubject) =>
    [-s.necessity, -(s.shared ? 99 : s.forMajors.length), s.code] as const;
  const cmp = (a: PrescribedSubject, b: PrescribedSubject) => {
    const [a1, a2, a3] = rank(a);
    const [b1, b2, b3] = rank(b);
    return a1 - b1 || a2 - b2 || a3.localeCompare(b3);
  };

  for (const p of byCode.values()) {
    p.shared = p.forMajors.length === picked.length;
  }

  /**
   * 1군이 넓으면 — 이 검사가 계열을 못 가른 경우다 — 소수 계열만 요구하는
   * 과목은 "지금 들어야 할 것" 이 아니라 "그쪽으로 정하면 필요한 것" 이다.
   * 여덟 계열이 전부 1군인 학생에게 여덟 갈래의 필수를 다 담아 주면 23과목
   * 짜리 장바구니가 되고, 그건 처방이 아니다.
   *
   * 절반 미만의 계열만 요구하는 과목은 뒤로 뺀다. 대신 결과지가
   * "먼저 좁혀야 한다" 고 말한다(tooMany).
   */
  const wide = picked.length >= 4;
  const later: PrescribedSubject[] = [];
  if (wide) {
    for (const p of [...byCode.values()]) {
      if (p.necessity >= 2 && p.forMajors.length * 2 < picked.length) {
        later.push(p);
        byCode.delete(p.code);
      }
    }
  }

  const kept: PrescribedSubject[] = [];
  const overflow: PrescribedSubject[] = [];
  let tooMany = wide;
  const gradeOf = (s: PrescribedSubject) => s.grade;
  for (const g of [2, 3]) {
    const pool = [...byCode.values()].filter((s) => s.necessity >= 2 && gradeOf(s) === g).sort(cmp);
    let used = 0;
    for (const s of pool) {
      if (s.necessity === 3) {
        kept.push(s);
        used += s.credit;
        continue;
      }
      if (used + s.credit <= GRADE_BUDGET) {
        kept.push(s);
        used += s.credit;
      } else {
        overflow.push(s);
      }
    }
    if (used > GRADE_BUDGET) tooMany = true;
  }

  /**
   * 4. 신청할 수 있는 목록으로 만든다.
   *
   * 미적분Ⅱ 만 적어 놓으면 학생은 그 신청서를 낼 수 없다. 정원 안에 남은
   * 과목의 선수과목을 따라 올라가며 빠진 것을 채운다. 채워 넣은 과목은
   * 표시해 둔다 — 계열이 요구해서 들어온 것과 순서 때문에 들어온 것은
   * 다른 말이기 때문이다.
   */
  const keptCodes = new Set(kept.map((s) => s.code));
  const pull = (code: string, depth = 0): void => {
    if (depth > 6) return; // 과목표가 순환하면 여기서 멈춘다
    const s = catalog.get(code);
    if (!s || s.category === "common") return;
    if (!keptCodes.has(code)) {
      const existing = byCode.get(code);
      const row: PrescribedSubject = existing ?? {
        code: s.code,
        name: s.name,
        group: s.group_code,
        groupName: s.group_name,
        category: s.category,
        credit: s.credit,
        absoluteOnly: s.absolute_only,
        csat: s.csat,
        grade: s.grade_hint ?? 2,
        necessity: 3,
        why: "",
        forMajors: [],
        shared: true,
        prereq: null,
        addedForPrereq: true,
        univ: univBySubject.get(s.code) ?? [],
        usedAt: [],
      };
      if (existing) {
        // 정원에 밀렸던 과목이 선수과목이면 다시 담는다
        const i = overflow.indexOf(existing);
        if (i >= 0) overflow.splice(i, 1);
      } else {
        byCode.set(code, row);
      }
      row.addedForPrereq = row.forMajors.length === 0;
      kept.push(row);
      keptCodes.add(code);
    }
    if (s.prereq_code) pull(s.prereq_code, depth + 1);
  };
  for (const code of [...keptCodes]) {
    const s = catalog.get(code);
    if (s?.prereq_code) pull(s.prereq_code);
  }

  // 선수과목 이름을 붙인다
  for (const p of byCode.values()) {
    const s = catalog.get(p.code);
    const pre = s?.prereq_code ? catalog.get(s.prereq_code) : null;
    p.prereq = pre && pre.category !== "common" ? { code: pre.code, name: pre.name } : null;
    if (p.addedForPrereq) p.shared = true;
  }

  // 현장 쓰임을 붙인다. 과목마다 최대 두 줄까지 — 세 줄이 넘으면 목록이 된다.
  const uses = await subjectUses(picked.map((m) => m.code), lang);
  for (const p of byCode.values()) p.usedAt = (uses.get(p.code) ?? []).slice(0, 2);

  const core = kept.sort(cmp);
  const shared = core.filter((s) => s.shared);
  const split = core.filter((s) => !s.shared);
  const optional = [
    ...[...byCode.values()].filter((s) => s.necessity === 1),
    ...overflow,
    ...later,
  ]
    .filter((s) => !keptCodes.has(s.code))
    .sort(cmp);

  const byGrade: GradePlan[] = [2, 3].map((g) => {
    const subjects = core.filter((s) => s.grade === g);
    return {
      grade: g,
      subjects,
      credits: subjects.reduce((a, s) => a + s.credit, 0),
      budget: GRADE_BUDGET,
      overflow: overflow.filter((s) => s.grade === g),
    };
  }).filter((g) => g.subjects.length > 0);
  tooMany = tooMany || byGrade.some((g) => g.credits > g.budget);

  /**
   * 5. 대학 권장. 과목 하나로 걸리는 것과 묶음으로 걸리는 것이 따로 있다.
   *    "과학 진로선택 3과목 이상" 같은 규칙은 처방이 지금 몇 개를 담고
   *    있는지 세어 모자란 수를 알려 준다.
   */
  const rules = await query<{
    univ_code: string;
    subject_group: string;
    category: string;
    min_count: number;
    group_name: string;
  }>(
    `SELECT r.univ_code, r.subject_group, r.category, r.min_count,
            COALESCE(${NAME("hs_subject_groups", "g", "$1")}, r.subject_group) AS group_name
       FROM hs_univ_subject_rules r
       LEFT JOIN hs_subject_groups g ON g.code = r.subject_group`,
    [lang],
  );
  const CAT_KO: Record<string, string> = {
    general: "일반 선택",
    career: "진로 선택",
    fusion: "융합 선택",
  };
  const univChecks: UnivRuleCheck[] = rules.map((r) => {
    const have = core.filter(
      (s) => s.group === r.subject_group && s.category === r.category,
    ).length;
    return {
      univ: r.univ_code,
      rule: `${r.group_name} 교과 ${CAT_KO[r.category] ?? r.category} 과목 ${r.min_count}과목 이상`,
      have,
      need: r.min_count,
      met: have >= r.min_count,
    };
  });
  const univPicks = core.filter((s) => s.univ.length > 0);

  return {
    curriculum: "2022 개정 교육과정",
    majors: picked.map(({ code, name }) => ({ code, name })),
    shared,
    split,
    optional,
    byGrade,
    univChecks,
    univPicks,
    totalCredits: core.reduce((a, s) => a + s.credit, 0),
    tooMany,
  };
}
