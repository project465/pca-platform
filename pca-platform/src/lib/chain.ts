/**
 * 현장에서 거꾸로 내려오는 사슬.
 *
 * "기계공학이 앞에 있습니다" 다음에 학생이 묻는 것은 하나다 — 그래서 뭘
 * 해야 하는데. 과목 처방(prescribe.ts)이 "무엇을" 에 답한다면 여기는 "왜" 에
 * 답하고, 그 왜는 교실이 아니라 현장에서 온다.
 *
 *   직무        구조해석 엔지니어
 *   현장 장면    배터리 팩이 진동에 깨질지 실차 시험 전에 계산으로 짚는다
 *   필요한 것    실제 하중을 계산 가능한 조건으로 바꾸는 일
 *   대학에서     정역학 · 동역학 · 재료역학
 *   고등학교에서  물리학 · 역학과 에너지
 *   중학교에서    부러진 의자를 보고 왜 거기가 먼저 갔는지 설명해 보기
 *
 * 사슬의 방향이 중요하다. 과목에서 출발해 직업을 붙이면 "이 과목을 들으면
 * 이런 직업" 이라는 빈말이 되고, 직무에서 출발해 내려오면 "그 일이 이것을
 * 요구하기 때문에 이 과목" 이 된다.
 *
 * 문장은 전부 데이터(translations)에서 온다. 여기서 짓지 않는다.
 */
import { query } from "./db";

export type CareerNeed = {
  /** 현장에서 실제로 하는 일 */
  what: string;
  /** 대학에서 그것을 배우는 과목 */
  univ: string;
  /** 그래서 고등학교에서 이 과목 */
  subjects: { code: string; name: string }[];
  hsWhy: string;
  /** 중학교에서 지금 할 수 있는 것 */
  ms: string;
  msWhy: string;
};

export type CareerRole = {
  majorCode: string;
  majorName: string;
  name: string;
  /** 그 직무가 현장에서 마주하는 장면 하나 */
  scene: string;
  needs: CareerNeed[];
};

export type CareerChain = {
  majors: { code: string; name: string }[];
  roles: CareerRole[];
};

/** 요청 언어 → 한국어 → 빈 문자열. 사슬은 아직 한국어만 있다 */
const TXT = (table: string, alias: string, field: string, langParam: string) =>
  `COALESCE(
     (SELECT value FROM translations WHERE table_name='${table}' AND row_id=${alias}.id
       AND lang=${langParam} AND field='${field}'),
     (SELECT value FROM translations WHERE table_name='${table}' AND row_id=${alias}.id
       AND lang='ko' AND field='${field}'),
     '')`;

/**
 * 1군 계열의 직무 사슬.
 *
 * 1군이 넓으면(계열이 안 갈린 학생) 직무가 열여섯 개까지 나올 수 있다.
 * 그건 읽히지 않으므로 계열마다 하나씩만 보여주고 개수를 제한한다 —
 * 여기서 하려는 말은 "이 일이 이것을 요구한다" 는 본보기지 목록이 아니다.
 */
export async function careerChain(
  attemptId: string,
  lang = "ko",
  maxRoles = 4,
): Promise<CareerChain | null> {
  const majors = await query<{ code: string; name: string; tier: number }>(
    `SELECT mj.code,
            COALESCE(
              (SELECT value FROM translations WHERE table_name='majors' AND row_id=mj.id
                AND lang=$2 AND field='name'),
              (SELECT value FROM translations WHERE table_name='majors' AND row_id=mj.id
                AND lang='ko' AND field='name'),
              mj.code) AS name,
            COALESCE(f.tier, f.rank_no) AS tier
       FROM major_fit_scores f JOIN majors mj ON mj.id = f.major_id
      WHERE f.attempt_id = $1
      ORDER BY f.rank_no`,
    [attemptId, lang],
  );
  if (!majors.length) return null;
  const picked = majors.filter((m) => m.tier === majors[0].tier);

  // 계열이 여럿이면 계열마다 하나씩, 하나면 그 계열의 둘 다.
  const perMajor = picked.length === 1 ? 2 : 1;

  const rows = await query<{
    major_code: string;
    major_name: string;
    role_sort: number;
    role_name: string;
    scene: string;
    need_id: string;
    need_sort: number;
    what: string;
    univ: string;
    hs_why: string;
    ms: string;
    ms_why: string;
  }>(
    `SELECT mj.code AS major_code,
            COALESCE(
              (SELECT value FROM translations WHERE table_name='majors' AND row_id=mj.id
                AND lang=$2 AND field='name'),
              (SELECT value FROM translations WHERE table_name='majors' AND row_id=mj.id
                AND lang='ko' AND field='name'),
              mj.code) AS major_name,
            r.sort_no AS role_sort,
            ${TXT("career_roles", "r", "name", "$2")} AS role_name,
            ${TXT("career_roles", "r", "scene", "$2")} AS scene,
            n.id AS need_id, n.sort_no AS need_sort,
            ${TXT("career_needs", "n", "what", "$2")} AS what,
            ${TXT("career_needs", "n", "univ", "$2")} AS univ,
            ${TXT("career_needs", "n", "hs_why", "$2")} AS hs_why,
            ${TXT("career_needs", "n", "ms", "$2")} AS ms,
            ${TXT("career_needs", "n", "ms_why", "$2")} AS ms_why
       FROM career_roles r
       JOIN majors mj ON mj.id = r.major_id
       JOIN career_needs n ON n.role_id = r.id
      WHERE mj.code = ANY($1::text[]) AND r.sort_no <= $3
      ORDER BY array_position($1::text[], mj.code), r.sort_no, n.sort_no`,
    [picked.map((m) => m.code), lang, perMajor],
  );
  if (!rows.length) return null;

  const subs = await query<{ need_id: string; code: string; name: string }>(
    `SELECT ns.need_id, s.code,
            COALESCE(
              (SELECT value FROM translations WHERE table_name='hs_subjects' AND row_id=s.id
                AND lang=$1 AND field='name'),
              (SELECT value FROM translations WHERE table_name='hs_subjects' AND row_id=s.id
                AND lang='ko' AND field='name'),
              s.code) AS name
       FROM career_need_subjects ns
       JOIN hs_subjects s ON s.id = ns.subject_id
      ORDER BY s.sort_no`,
    [lang],
  );
  const byNeed = new Map<string, { code: string; name: string }[]>();
  for (const r of subs) {
    if (!byNeed.has(r.need_id)) byNeed.set(r.need_id, []);
    byNeed.get(r.need_id)!.push({ code: r.code, name: r.name });
  }

  const roles: CareerRole[] = [];
  for (const r of rows) {
    let role = roles.find(
      (x) => x.majorCode === r.major_code && x.name === r.role_name,
    );
    if (!role) {
      if (roles.length >= maxRoles) continue;
      role = {
        majorCode: r.major_code,
        majorName: r.major_name,
        name: r.role_name,
        scene: r.scene,
        needs: [],
      };
      roles.push(role);
    }
    role.needs.push({
      what: r.what,
      univ: r.univ,
      subjects: byNeed.get(r.need_id) ?? [],
      hsWhy: r.hs_why,
      ms: r.ms,
      msWhy: r.ms_why,
    });
  }

  return { majors: picked.map(({ code, name }) => ({ code, name })), roles };
}

/**
 * 과목 하나가 현장 어디서 쓰이는지.
 *
 * 과목 처방의 각 줄에 "이건 구조해석 엔지니어가 하중 조건을 세울 때 쓴다"
 * 를 달기 위한 것이다. 처방과 사슬이 따로 놀면 학생은 두 번 읽고 연결은
 * 스스로 해야 한다.
 */
export async function subjectUses(
  majorCodes: string[],
  lang = "ko",
): Promise<Map<string, { role: string; what: string }[]>> {
  const rows = await query<{ code: string; role: string; what: string }>(
    `SELECT s.code,
            ${TXT("career_roles", "r", "name", "$2")} AS role,
            ${TXT("career_needs", "n", "what", "$2")} AS what
       FROM career_need_subjects ns
       JOIN hs_subjects s ON s.id = ns.subject_id
       JOIN career_needs n ON n.id = ns.need_id
       JOIN career_roles r ON r.id = n.role_id
       JOIN majors mj ON mj.id = r.major_id
      WHERE mj.code = ANY($1::text[])
      ORDER BY r.sort_no, n.sort_no`,
    [majorCodes, lang],
  );
  const out = new Map<string, { role: string; what: string }[]>();
  for (const r of rows) {
    if (!out.has(r.code)) out.set(r.code, []);
    const list = out.get(r.code)!;
    if (!list.some((x) => x.role === r.role && x.what === r.what)) {
      list.push({ role: r.role, what: r.what });
    }
  }
  return out;
}
