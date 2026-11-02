/**
 * 학교가 미리 발급하는 학생 계정.
 *
 * **새 인증 시스템을 만들지 않는다**(설계 원칙 1). 로그인 주체는 `users`
 * 하나이고 비밀번호도 `users.password_hash` 를 그대로 쓴다. 소속은
 * `memberships` 가 들고, `campus_students` 가 더하는 것은 그 학교 안에서
 * 누구인가뿐이다.
 *
 * **학과를 등록부로 검증한다.** DB 에 외래키를 걸지 않는 대신 넣는 자리가
 * 본다: 틀린 학과 코드로 계정을 만들면 그 학생이 로그인한 뒤에 **자기
 * 학과가 없는 상태**로 서고, 그것을 되돌리려면 그 사람의 응시까지 지워야
 * 한다. 그래서 **만들기 전에 거절한다.**
 *
 * **열려 있는지는 여기서 보지 않는다.** 계정을 미리 발급하는 일과 그 학과를
 * 학생에게 여는 일은 다른 일이다. 명단을 학기 전에 받아 두고 공개는 뒤에
 * 하는 것이 정상 순서라, 여기서 `statusOf` 를 보면 그 순서가 막힌다.
 * 검사를 시작하는 자리가 그때 다시 본다.
 */
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  allLeaves, contextOf, findLeaf, routingContextOf, university, type CampusContext,
  type CampusUniversity,
} from "./registry";

export type CampusStudentRow = {
  user_id: string;
  university_code: string;
  student_id: string;
  college_code: string;
  department_code: string;
  specialization: string | null;
};

/** 한 줄을 만들 때 받는 것. `email` 과 `login_id` 는 없을 수 있다 */
export type CampusStudentInput = {
  student_id: string;
  name: string;
  email?: string | null;
  /** 적지 않으면 학번을 아이디로 쓴다 */
  login_id?: string | null;
  college_code?: string | null;
  department_code: string;
};

export type Checked = {
  input: CampusStudentInput;
  loginId: string;
  ctx: CampusContext;
};

/**
 * 등록부에 대고 한 줄을 본다. 거절하는 까닭을 **글자로** 돌려준다.
 *
 * 하나로 뭉개지 않는다: 학과 코드가 없는 것과 그 학교의 자리가 아닌 것과
 * 전공 탐색 자리인 것은 학교 쪽에서 고치는 방법이 다르다.
 */
export function checkStudent(
  universityCode: string, row: CampusStudentInput,
): { ok: true; value: Checked } | { ok: false; why: string } {
  const u = university(universityCode);
  if (!u) return { ok: false, why: `등록부에 ${universityCode} 가 없습니다` };
  const mode = loginModeOf(u);
  const sid = normalizeLoginValue(mode, row.student_id);
  if (!sid) return { ok: false, why: mode === "phone" ? "휴대전화 번호가 비어 있습니다" : "학번이 비어 있습니다" };
  if (mode === "phone" && !/^01\d{8,9}$/.test(sid)) {
    return { ok: false, why: `휴대전화 번호 꼴이 아닙니다(숫자 10~11자리, 010으로 시작): ${row.student_id.trim()}` };
  }
  if (!row.name.trim()) return { ok: false, why: "이름이 비어 있습니다" };
  const dc0 = (row.department_code ?? "").trim();
  if (!dc0) return { ok: false, why: `${u.org_kind === "agency" ? "전공 계열" : "학과"} 코드가 비어 있습니다` };
  /* 코드 대신 이름(`경영학과`)을 적어도 받는다. 같은 이름이 학년도마다 있으면 가장 최근의 지난 학년도 것 */
  const thisYear = Number(new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 4));
  const byName = findLeaf(u, dc0) ? null : allLeaves(u)
    .filter((r) => r.leaf.name.replace(/\s+/g, "") === dc0.replace(/\s+/g, "") && r.catalog.catalog_year <= thisYear)
    .sort((a, b) => b.catalog.catalog_year - a.catalog.catalog_year)[0] ?? null;
  const dc = byName ? byName.leaf.code : dc0;
  const found = findLeaf(u, dc);
  if (!found) {
    return { ok: false, why: `등록부에 없는 ${u.org_kind === "agency" ? "전공 계열" : "학과"} 코드입니다: ${dc}` };
  }
  if (row.college_code && row.college_code.trim() !== found.college.code) {
    return {
      ok: false,
      why: `단과대학이 등록부와 다릅니다: 적힌 것 ${row.college_code.trim()}`
        + ` · 등록부 ${found.college.code}`,
    };
  }
  /**
   * **자율전공학부 학생도 계정을 받는다**(규격 §32).
   *
   * 전에는 이 자리에서 거절했다. 그래서 자율전공학부 명단을 올리면 줄마다
   * 오류가 나고, **그 학부 학생에게는 계정이 나갈 길이 아예 없었다.**
   * 전공을 고르는 자리라는 것은 `어느 전공의 자로 재는가` 를 아직 모른다는
   * 뜻이고, `학생이 아니다` 라는 뜻이 아니다.
   *
   * 그래서 소속은 등록부에 적힌 그대로 적고 **Core 는 비워 둔다**: 학생이
   * 전공을 고를 때 채워진다(`routingContextOf`).
   */
  const ctx = contextOf(u, found) ?? routingContextOf(u, found);
  if (!ctx) {
    return {
      ok: false,
      why: `어느 전공 검사로 이을지 아직 정해지지 않은 전공입니다: ${found.leaf.name}`,
    };
  }
  /* **아이디는 학번 · 전화번호다**(대표 결정). 따로 적은 아이디는 받지 않는다: 둘이 갈리면 학생이 무엇으로 들어오는지
     담당자도 모른다(2026-11-02 운영 시험: 학번 201411112 · 아이디 20141112) */
  const loginId = `${loginPrefixOf(u)}${sid}`;
  return { ok: true, value: { input: { ...row, student_id: sid, department_code: dc }, loginId, ctx } };
}

/**
 * 학번 앞에 붙는 아이디 머리(`ku-` · `jju-`).
 *
 * **아이디는 전체에서 하나다**(`users.login_id`). 두 학교에 같은 학번
 * `20250001` 이 있으면, 학번을 그대로 아이디로 쓰는 순간 둘째 학교 학생이
 * 첫째 학교 학생의 계정을 받는다. 그래서 학교마다 머리를 붙인다. 등록부가
 * `login_prefix` 를 적으면 그것을 쓰고(배재대는 머리 없이 발급해 왔으므로
 * 빈 글자다), 없으면 학교 코드를 소문자로 쓴다.
 */
/**
 * **학생 · 참여자가 적는 아이디가 무엇인가**(2026-11-02 대표 결정: 학교는 학번, 일자리 기관은 휴대전화 번호.
 * 처음 비밀번호도 같은 값이고 첫 로그인 때 반드시 바꾼다). 기관 설정(`login_mode`)이 정하고, 없으면 기관 종류로 정한다.
 * 학교가 늘어도 같은 판단이다
 */
export type LoginMode = "student_id" | "phone";
export function loginModeOf(u: { login_mode?: LoginMode; org_kind?: "university" | "agency" }): LoginMode {
  return u.login_mode ?? (u.org_kind === "agency" ? "phone" : "student_id");
}

/** 적은 값을 아이디 꼴로. 전화번호는 하이픈 · 공백을 걷어 숫자만(010-1234-5678 = 01012345678) */
export function normalizeLoginValue(mode: LoginMode, raw: string): string {
  const t = raw.trim();
  return mode === "phone" ? t.replace(/[^0-9]/g, "") : t.replace(/\s+/g, "");
}

/**
 * 학교 로그인 화면에서 적은 값을 실제 아이디로. **학생은 학번 · 전화번호만 적는다**: 아이디는 전체에서 하나라
 * 학교마다 머리(`jju-` 등)를 붙여 두는데, 그것까지 외우게 하지 않는다. 이미 머리를 붙여 적었으면 그대로 둔다
 */
export function campusLoginId(u: CampusUniversity, raw: string): string {
  const prefix = loginPrefixOf(u);
  const t = raw.trim();
  if (prefix && t.toLowerCase().startsWith(prefix.toLowerCase())) return t;
  return `${prefix}${normalizeLoginValue(loginModeOf(u), t)}`;
}

export function loginPrefixOf(u: { university_code: string; login_prefix?: string | null }): string {
  if (typeof u.login_prefix === "string") return u.login_prefix;
  return `${u.university_code.toLowerCase()}-`;
}

/**
 * 이미 있는 아이디가 **다른 학교 학생이거나 학교 발급 학생이 아닐 때.**
 * 그 계정을 이 학교 명단으로 덮지 않는다: 덮으면 남의 학생 소속이 조용히
 * 바뀌거나, 개인 가입자가 학교 학생이 된다. 부른 쪽이 그 줄을 거절한다.
 */
export class StudentLoginTaken extends Error {
  constructor(loginId: string, owner: string) {
    super(`아이디 ${loginId} 는 이미 ${owner} 계정입니다. 다른 아이디(login_id)를 적어 주세요`);
  }
}

/** 사람이 옮겨 적을 수 있는 글자만. 헷갈리는 0·O·1·l 을 뺀다 */
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function initialPassword(len = 12): string {
  return Array.from(randomBytes(len))
    .map((b) => ALPHA[b % ALPHA.length]).join("");
}

/**
 * 한 줄을 만든다. **열쇠는 돌려주기만 하고 적지 않는다.**
 *
 * 평문을 DB 에도 로그에도 두지 않는다. 부른 쪽이 그 자리에서 한 번 쓰고
 * 버리거나, 운영자가 지정한 자리에 쓴다.
 *
 * **이미 있는 학생의 열쇠를 조용히 바꾸지 않는다.** 두 번째로 돌리는
 * 사람은 보통 명단을 다시 올리는 것인데, 그때 비밀번호가 갈리면 어제
 * 받아 간 학생이 그 자리에서 잠긴다.
 */
export async function provisionStudent(
  orgId: string, checked: Checked,
  opts: { rotate?: boolean } = {},
): Promise<{ created: boolean; password: string | null; userId: string }> {
  const { input, loginId, ctx } = checked;
  const had = await queryOne<{ id: string; uni: string | null }>(
    `SELECT u.id::text, cs.university_code AS uni
       FROM users u LEFT JOIN campus_students cs ON cs.user_id = u.id
      WHERE u.login_id = $1`, [loginId]);
  if (had && had.uni !== ctx.university_code) {
    throw new StudentLoginTaken(loginId,
      had.uni ? `다른 기관(${had.uni}) 학생` : "학교 발급이 아닌");
  }
  if (had && !opts.rotate) {
    /* 학과가 바뀌었을 수 있으므로 그 줄은 맞춰 둔다. 열쇠만 그대로다 */
    await query(
      `UPDATE campus_students
          SET college_code = $2, department_code = $3, specialization = $4
        WHERE user_id = $1::bigint`,
      [had.id, ctx.college_code, ctx.department_code, ctx.specialization]);
    return { created: false, password: null, userId: had.id };
  }

  /* **처음 비밀번호는 학번 · 전화번호이고, 첫 로그인 때 반드시 바꾼다**(2026-11-02 대표 결정 "첫 로그인 때 꼭 바꾸게").
     학번 · 전화번호는 남이 알기 쉬운 값이라 must_reset_pw 로 막는다: 바꾸기 전에는 검사 · 결과 · MAT 에 들어가지 못한다 */
  const pw = input.student_id;
  const user = await queryOne<{ id: string; is_demo: boolean }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, must_reset_pw)
     VALUES ($1, $2, $3, $4, 'active', 'ko', TRUE)
     ON CONFLICT (login_id) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           display_name  = EXCLUDED.display_name,
           must_reset_pw = TRUE
     RETURNING id::text, is_demo`,
    [loginId, input.email?.trim() || null, input.name.trim(),
      await hashPassword(pw)],
  );
  if (!user) throw new Error(`계정을 만들지 못했습니다: ${loginId}`);
  /* **학생을 시연으로 표시하지 않는다.** 사람을 만드는 자리가 스무 곳이
     넘어 트리거가 아이디 모양만 보고 표시할 수 있고, 그 자리는 운영
     지표에서 걸러지므로 담당자 화면의 수가 비어 보인다 */
  if (user.is_demo) {
    await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`,
      [user.id]);
  }

  /* 소속은 `memberships` 가 든다. 역할은 전부터 있던 `student` 다 */
  await query(
    `INSERT INTO memberships (user_id, org_id, role)
     VALUES ($1::bigint, $2::bigint, 'student')
     ON CONFLICT (user_id, org_id, role) DO NOTHING`,
    [user.id, orgId]);

  await query(
    `INSERT INTO campus_students (user_id, university_code, student_id,
                                  college_code, department_code, specialization)
     VALUES ($1::bigint, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE
       SET university_code = EXCLUDED.university_code,
           student_id      = EXCLUDED.student_id,
           college_code    = EXCLUDED.college_code,
           department_code = EXCLUDED.department_code,
           specialization  = EXCLUDED.specialization`,
    [user.id, ctx.university_code, input.student_id,
      ctx.college_code, ctx.department_code, ctx.specialization]);

  return { created: !had, password: pw, userId: user.id };
}

/**
 * 로그인한 사람이 학교 발급 학생인가. 맞으면 그 학과 맥락을 돌려준다.
 *
 * **적힌 줄을 그대로 믿지 않는다.** 등록부로 다시 맞춰 보는 까닭은 학과가
 * 개편되거나 코드가 내려놓이는 일이 있어서다. 맞지 않으면 `null` 을
 * 돌려주고, 부른 쪽이 **검사를 막고 담당자 확인을 안내한다**: 짐작해서
 * 비슷한 학과로 넣으면 그 학생의 결과가 남의 학과 집계에 들어간다.
 */
export async function campusStudentContext(
  userId: string,
): Promise<{ ctx: CampusContext; row: CampusStudentRow;
  university_name: string; department_name: string } | null> {
  const row = await queryOne<CampusStudentRow>(
    `SELECT user_id::text, university_code, student_id, college_code,
            department_code, specialization
       FROM campus_students WHERE user_id = $1::bigint`, [userId]);
  if (!row) return null;
  const u = university(row.university_code);
  if (!u) return null;
  const found = findLeaf(u, row.department_code);
  if (!found) return null;
  if (found.college.code !== row.college_code) return null;
  /* 전공을 고르는 자리의 학생은 Core 가 비어 있는 맥락을 든다(규격 §32) */
  const ctx = contextOf(u, found) ?? routingContextOf(u, found);
  if (!ctx) return null;
  return {
    ctx, row,
    university_name: u.university_name,
    department_name: found.leaf.name,
  };
}

/**
 * **이 사람이 그 학교의 학생인가.** 묻는 자리가 넷이라 자를 하나로 둔다.
 *
 * 학교 로그인과 학과 확인 쪽과 `검사 시작` 과 응시를 여는 자리가 전부 이
 * 판단을 쓴다. 넷이 따로 물으면 어느 날 하나가 갈리고, 갈린 그 하나로
 * **학생이 아닌 사람의 응시에 학교가 적힌다.**
 */
export async function campusStudentOf(
  userId: string, universityCode: string,
): Promise<Awaited<ReturnType<typeof campusStudentContext>>> {
  const mine = await campusStudentContext(userId);
  return mine && mine.row.university_code === universityCode ? mine : null;
}

/**
 * 그 학교의 발급 계정 줄이 **있기는 한가**(학과가 등록부와 맞는지는 보지 않는다).
 *
 * `campusStudentOf` 는 학과가 등록부와 맞지 않으면 비어 돌아온다. 그 학생을 로그인 화면이
 * "다른 계정으로 로그인되어 있습니다" 로 되돌려 보내면 같은 계정으로 몇 번을 넣어도 제자리다
 * (2026-11-02 운영 시험). 그런 학생은 시작 화면이 "학과 확인이 필요합니다" 로 까닭을 적는다.
 */
export async function hasCampusRow(userId: string, universityCode: string): Promise<boolean> {
  const r = await queryOne<{ ok: boolean }>(
    `SELECT TRUE AS ok FROM campus_students WHERE user_id = $1::bigint AND university_code = $2`,
    [userId, universityCode]);
  return Boolean(r?.ok);
}

/** 그 학교의 학생 계정이 몇 줄인가. 담당자 화면과 발급 보고가 읽는다 */
export async function campusStudentCount(
  universityCode: string,
): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM campus_students WHERE university_code = $1`,
    [universityCode]);
  return Number(r?.n ?? 0);
}
