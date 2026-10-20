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
import { query, queryOne, tx } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  contextOf, findLeaf, routingContextOf, university, type CampusContext,
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
/**
 * 이미 있는 아이디가 **같은 학교의 학생**이 아니면 던진다(C16).
 * 누구 것인지는 적지 않는다: 그 말 자체가 다른 학교 학생이 있다는 답이 된다.
 */
export class LoginTaken extends Error {
  constructor() { super("이 아이디는 이미 쓰이고 있습니다"); this.name = "LoginTaken"; }
}

export async function provisionStudent(
  orgId: string, checked: Checked,
  opts: { rotate?: boolean } = {},
): Promise<{ created: boolean; password: string | null; userId: string }> {
  const { input, loginId, ctx } = checked;
  /* 아이디 하나를 한 번에 한 곳만 만진다. 두 학교가 같은 순간에 같은 새 아이디를
     만들면 둘 다 `없다` 를 읽고 둘 다 쓴다(C16 경쟁). 잠금은 이 거래가 끝날 때 풀린다 */
  return tx(async (c) => {
    await c.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [loginId]);
    const had = (await c.query<{ id: string; uni: string | null }>(
      `SELECT u.id::text, cs.university_code AS uni
         FROM users u LEFT JOIN campus_students cs ON cs.user_id = u.id
        WHERE u.login_id = $1`, [loginId])).rows[0];
    /* 개인 회원 · 담당자 · 다른 학교 학생이면 어느 칸도 바꾸지 않는다 */
    if (had && had.uni !== ctx.university_code) throw new LoginTaken();
    if (had && !opts.rotate) {
      await c.query(
        `UPDATE campus_students
            SET college_code = $2, department_code = $3, specialization = $4
          WHERE user_id = $1::bigint AND university_code = $5`,
        [had.id, ctx.college_code, ctx.department_code, ctx.specialization, ctx.university_code]);
      return { created: false, password: null, userId: had.id };
    }
    const pw = initialPassword();
    const hash = await hashPassword(pw);
    let userId: string;
    if (had) {
      await c.query(`UPDATE users SET password_hash = $2, display_name = $3 WHERE id = $1::bigint`,
        [had.id, hash, input.name.trim()]);
      userId = had.id;
    } else {
      const ins = (await c.query<{ id: string }>(
        `INSERT INTO users (login_id, email, display_name, password_hash,
                            status, locale, must_reset_pw, is_demo)
         VALUES ($1, $2, $3, $4, 'active', 'ko', FALSE, FALSE)
         ON CONFLICT (login_id) DO NOTHING
         RETURNING id::text`,
        [loginId, input.email?.trim() || null, input.name.trim(), hash])).rows[0];
      if (!ins) throw new LoginTaken();
      userId = ins.id;
      /* 트리거가 아이디 모양을 보고 시연으로 표시할 수 있다(전과 같은 까닭) */
      await c.query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [userId]);
    }
    await c.query(
      `INSERT INTO memberships (user_id, org_id, role)
       VALUES ($1::bigint, $2::bigint, 'student')
       ON CONFLICT (user_id, org_id, role) DO NOTHING`, [userId, orgId]);
    /* 학교 칸은 덮지 않는다: 여기까지 온 줄은 없거나 같은 학교다 */
    await c.query(
      `INSERT INTO campus_students (user_id, university_code, student_id,
                                    college_code, department_code, specialization)
       VALUES ($1::bigint, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
         SET student_id      = EXCLUDED.student_id,
             college_code    = EXCLUDED.college_code,
             department_code = EXCLUDED.department_code,
             specialization  = EXCLUDED.specialization
       WHERE campus_students.university_code = EXCLUDED.university_code`,
      [userId, ctx.university_code, input.student_id,
        ctx.college_code, ctx.department_code, ctx.specialization]);
    return { created: !had, password: pw, userId };
  });
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

/** 그 학교의 학생 계정이 몇 줄인가. 담당자 화면과 발급 보고가 읽는다 */
export async function campusStudentCount(
  universityCode: string,
): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM campus_students WHERE university_code = $1`,
    [universityCode]);
  return Number(r?.n ?? 0);
}
