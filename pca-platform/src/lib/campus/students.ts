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
  contextOf, findLeaf, university, type CampusContext,
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
  const sid = row.student_id.trim();
  if (!sid) return { ok: false, why: "학번이 비어 있습니다" };
  if (!row.name.trim()) return { ok: false, why: "이름이 비어 있습니다" };
  const u = university(universityCode);
  if (!u) return { ok: false, why: `등록부에 ${universityCode} 가 없습니다` };
  const dc = (row.department_code ?? "").trim();
  if (!dc) return { ok: false, why: "학과 코드가 비어 있습니다" };
  const found = findLeaf(u, dc);
  if (!found) {
    return { ok: false, why: `등록부에 없는 학과 코드입니다: ${dc}` };
  }
  if (row.college_code && row.college_code.trim() !== found.college.code) {
    return {
      ok: false,
      why: `단과대학이 등록부와 다릅니다: 적힌 것 ${row.college_code.trim()}`
        + ` · 등록부 ${found.college.code}`,
    };
  }
  if (found.leaf.routing_only) {
    return {
      ok: false,
      why: `전공을 정한 뒤에 고르는 자리입니다: ${found.leaf.name}`,
    };
  }
  const ctx = contextOf(u, found);
  if (!ctx) {
    return {
      ok: false,
      why: `어느 전공 검사로 이을지 아직 정해지지 않은 자리입니다: ${found.leaf.name}`,
    };
  }
  const loginId = (row.login_id ?? "").trim() || sid;
  return { ok: true, value: { input: { ...row, student_id: sid }, loginId, ctx } };
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
  const had = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [loginId]);
  if (had && !opts.rotate) {
    /* 학과가 바뀌었을 수 있으므로 그 줄은 맞춰 둔다. 열쇠만 그대로다 */
    await query(
      `UPDATE campus_students
          SET college_code = $2, department_code = $3, specialization = $4
        WHERE user_id = $1::bigint`,
      [had.id, ctx.college_code, ctx.department_code, ctx.specialization]);
    return { created: false, password: null, userId: had.id };
  }

  const pw = initialPassword();
  const user = await queryOne<{ id: string; is_demo: boolean }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, must_reset_pw)
     VALUES ($1, $2, $3, $4, 'active', 'ko', FALSE)
     ON CONFLICT (login_id) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           display_name  = EXCLUDED.display_name
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
  const ctx = contextOf(u, found);
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

/** 그 학교의 학생 계정이 몇 줄인가. 담당자 화면과 발급 보고가 읽는다 */
export async function campusStudentCount(
  universityCode: string,
): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM campus_students WHERE university_code = $1`,
    [universityCode]);
  return Number(r?.n ?? 0);
}
