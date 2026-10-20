/**
 * 학교 담당자가 학생 계정을 직접 다루는 자리.
 *
 * **CLI 를 UI 로 승격한다**(규격 §14). 지금까지 학생 등록과 비밀번호
 * 재발급은 `npm run pcu:students` 뿐이었고, 그러려면 담당자가 Railway
 * Console 을 열어야 했다. 학교에 파는 제품에서 그 길은 운영이 아니다.
 *
 * **세는 법과 만드는 법을 베끼지 않는다.** 줄을 보는 자리는
 * `checkStudent`, 만드는 자리는 `provisionStudent`, 열쇠를 내는 자리는
 * `initialPassword` 로 **CLI 와 같은 함수**다. 베껴 두면 한쪽만 고쳐지는
 * 날이 오고, 그날 두 길이 서로 다른 계정을 만든다.
 *
 * **평문 열쇠를 적지 않는다.** 돌려주기만 하고 DB 에도 로그에도 감사
 * 기록에도 남기지 않는다. 화면이 그 자리에서 한 번 보여 준다.
 */
import { query, queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import {
  checkStudent, initialPassword, LoginTaken, provisionStudent,
  type CampusStudentInput,
} from "@/lib/campus/students";
import { ASSESSMENT_VERSION } from "@/lib/me-v3/runtime/session";

/* ── 학생 한 줄 ────────────────────────────────────────────────────── */

/** 담당자 화면이 보는 학생 한 줄. **개별 응답은 한 칸도 없다**(§12·§23) */
export type StudentRow = {
  user_id: string;
  student_id: string;
  name: string;
  login_id: string;
  college_code: string;
  department_code: string;
  specialization: string | null;
  /** 계정 상태. `active` 가 아니면 로그인이 막힌다 */
  account: string;
  /** 응시 상태. 줄이 없으면 `none` */
  attempt: "none" | "in_progress" | "scored";
  /** 결과를 받은 날. 아직이면 `null` */
  completed_at: string | null;
};

export type StudentState = "all" | "none" | "in_progress" | "scored" | "disabled";

export type StudentFilter = {
  universityCode: string;
  q?: string;
  department?: string;
  college?: string;
  state?: StudentState;
  /**
   * 시연·검사 계정까지 섞어서 본다. **기본은 끈다.**
   *
   * 집계 쪽은 전부터 이 줄을 들고 있었는데(`campusV3`) 명단 쪽만 빠져
   * 있었다. 그래서 같은 화면에 **대상자 0명** 과 **아직 시작하지 않은
   * 학생 63명** 이 나란히 섰다. 두 수가 다른 모집단을 세면 담당자는 어느
   * 쪽을 믿어야 할지 모른다.
   */
  withDemo?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * 한 사람의 응시 상태를 한 줄로 접는다.
 *
 * **가장 앞선 상태를 쓴다.** 재응시가 열린 사람은 끝낸 줄과 푸는 줄을
 * 함께 들 수 있는데, 담당자가 묻는 것은 `이 사람이 끝냈는가` 다.
 */
const ATTEMPT = `
  LEFT JOIN LATERAL (
    SELECT max(a.submitted_at)::date::text AS done_at,
           bool_or(a.status = 'scored')    AS scored,
           bool_or(a.status = 'in_progress') AS open
      FROM v3_attempts a
     WHERE a.user_id = cs.user_id
  ) att ON TRUE`;

function where(f: StudentFilter): { sql: string; args: unknown[] } {
  const args: unknown[] = [f.universityCode];
  const and: string[] = [`cs.university_code = $1`];
  if (f.q && f.q.trim()) {
    args.push(`%${f.q.trim()}%`);
    /* 학번 · 아이디 · 이름 셋으로 찾는다. 담당자가 들고 있는 값이 그 셋이다 */
    and.push(`(cs.student_id ILIKE $${args.length}
               OR u.login_id ILIKE $${args.length}
               OR u.display_name ILIKE $${args.length})`);
  }
  if (f.department) { args.push(f.department); and.push(`cs.department_code = $${args.length}`); }
  if (f.college) { args.push(f.college); and.push(`cs.college_code = $${args.length}`); }
  if (!f.withDemo) and.push(`NOT u.is_demo`);
  const st = f.state ?? "all";
  if (st === "disabled") and.push(`u.status <> 'active'`);
  else if (st === "none") and.push(`u.status = 'active' AND att.scored IS NOT TRUE AND att.open IS NOT TRUE`);
  else if (st === "in_progress") and.push(`u.status = 'active' AND att.scored IS NOT TRUE AND att.open`);
  else if (st === "scored") and.push(`u.status = 'active' AND att.scored`);
  return { sql: and.join(" AND "), args };
}

export async function listStudents(
  f: StudentFilter,
): Promise<{ rows: StudentRow[]; total: number }> {
  const w = where(f);
  /* **내려받기는 한 쪽보다 많다.** 화면은 50줄씩 넘기지만 담당자가
     사업보고에 붙이는 CSV 는 명단 전부다. 그래도 천장을 둔다: 좁히는
     조건이 비어 있는 날 한 질의가 몇 만 줄을 메모리에 올린다 */
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 5000);
  const offset = Math.max(f.offset ?? 0, 0);
  const rows = await query<StudentRow>(
    `SELECT cs.user_id::text, cs.student_id, u.display_name AS name,
            coalesce(u.login_id, '') AS login_id,
            cs.college_code, cs.department_code, cs.specialization,
            u.status AS account,
            CASE WHEN att.scored THEN 'scored'
                 WHEN att.open   THEN 'in_progress'
                 ELSE 'none' END AS attempt,
            att.done_at AS completed_at
       FROM campus_students cs
       JOIN users u ON u.id = cs.user_id
       ${ATTEMPT}
      WHERE ${w.sql}
      ORDER BY cs.department_code, cs.student_id
      LIMIT ${limit} OFFSET ${offset}`, w.args);
  const n = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM campus_students cs
       JOIN users u ON u.id = cs.user_id
       ${ATTEMPT}
      WHERE ${w.sql}`, w.args);
  return { rows, total: Number(n?.n ?? 0) };
}

/** 상태 tab 마다 몇 명인가(규격 §25). **한 질의에서 센다** */
export async function studentCounts(
  f: Omit<StudentFilter, "state" | "limit" | "offset">,
): Promise<Record<StudentState, number>> {
  const w = where({ ...f, state: "all" });
  const r = await queryOne<Record<string, string>>(
    `SELECT count(*)::text AS all,
            count(*) FILTER (WHERE u.status <> 'active')::text AS disabled,
            count(*) FILTER (WHERE u.status = 'active'
              AND att.scored IS NOT TRUE AND att.open IS NOT TRUE)::text AS none,
            count(*) FILTER (WHERE u.status = 'active'
              AND att.scored IS NOT TRUE AND att.open)::text AS in_progress,
            count(*) FILTER (WHERE u.status = 'active' AND att.scored)::text AS scored
       FROM campus_students cs
       JOIN users u ON u.id = cs.user_id
       ${ATTEMPT}
      WHERE ${w.sql}`, w.args);
  return {
    all: Number(r?.all ?? 0), none: Number(r?.none ?? 0),
    in_progress: Number(r?.in_progress ?? 0), scored: Number(r?.scored ?? 0),
    disabled: Number(r?.disabled ?? 0),
  };
}

/* ── 계정 상태 ─────────────────────────────────────────────────────── */

/**
 * 그 학교의 발급 계정인가. **아니면 아무것도 하지 않는다.**
 *
 * 담당자가 넘긴 번호를 그대로 믿으면 아이디 하나로 남의 계정을 비활성
 * 하거나 열쇠를 바꿀 수 있다. 쓰는 자리마다 이 문을 지난다.
 */
async function ownedBySchool(
  universityCode: string, userId: string,
): Promise<{ login_id: string; status: string } | null> {
  return queryOne<{ login_id: string; status: string }>(
    `SELECT coalesce(u.login_id, '') AS login_id, u.status
       FROM campus_students cs JOIN users u ON u.id = cs.user_id
      WHERE cs.user_id = $1::bigint AND cs.university_code = $2`,
    [userId, universityCode]);
}

export type ManageActor = { userId: string; role: string; orgId: number | null };

/**
 * 계정을 끄고 켠다.
 *
 * **지우지 않는다.** 응시와 결과는 그대로 남고 로그인만 막힌다: 학기가
 * 끝난 학생의 계정을 지우면 그 학생이 받은 결과지가 함께 사라진다.
 * **`erased` 를 되돌리지 않는다**: 파기가 끝난 계정은 이 자리에서 다시
 * 살리지 않는다(개인정보 파기가 반쪽이 된다).
 */
export async function setAccountStatus(
  universityCode: string, userId: string, on: boolean, actor: ManageActor,
): Promise<{ ok: boolean; why?: string }> {
  const got = await ownedBySchool(universityCode, userId);
  if (!got) return { ok: false, why: "이 학교가 발급한 계정이 아닙니다" };
  if (got.status === "erased") {
    return { ok: false, why: "파기된 계정은 이 자리에서 다시 열지 않습니다" };
  }
  await query(`UPDATE users SET status = $2 WHERE id = $1::bigint`,
    [userId, on ? "active" : "disabled"]);
  await audit({
    actorId: Number(actor.userId), actorRole: actor.role,
    action: on ? "campus.student.enable" : "campus.student.disable",
    targetKind: "user", targetId: userId, orgId: actor.orgId,
    detail: { university: universityCode },
  });
  return { ok: true };
}

/**
 * 비밀번호를 다시 낸다. **한 번만 보여 주고 해시만 남긴다**(규격 §13).
 *
 * 들고 있던 열쇠를 되살릴 길은 없다: 해시만 남기는 것이 설계이고, 되살릴
 * 수 있으면 그 설계가 뜻을 잃는다. 바꾸는 칸은 `password_hash` 하나이고
 * 이름도 학과도 응시도 건드리지 않는다.
 */
export async function rotateStudentPassword(
  universityCode: string, userId: string, actor: ManageActor,
): Promise<{ ok: boolean; why?: string; password?: string; login_id?: string }> {
  const got = await ownedBySchool(universityCode, userId);
  if (!got) return { ok: false, why: "이 학교가 발급한 계정이 아닙니다" };
  if (got.status === "erased") {
    return { ok: false, why: "파기된 계정의 열쇠는 다시 내지 않습니다" };
  }
  const pw = initialPassword();
  await query(`UPDATE users SET password_hash = $2 WHERE id = $1::bigint`,
    [userId, await hashPassword(pw)]);
  /* **평문을 감사 기록에 적지 않는다.** 누가 언제 누구의 열쇠를 다시
     냈는지까지가 남을 것이고, 그 값 자체는 화면에서 한 번 보이고 끝난다 */
  await audit({
    actorId: Number(actor.userId), actorRole: actor.role,
    action: "campus.student.password.rotate",
    targetKind: "user", targetId: userId, orgId: actor.orgId,
    detail: { university: universityCode },
  });
  return { ok: true, password: pw, login_id: got.login_id };
}

/* ── 한 명 추가 ────────────────────────────────────────────────────── */

export async function addStudentAccount(
  universityCode: string, orgId: string, row: CampusStudentInput,
  actor: ManageActor,
): Promise<{ ok: boolean; why?: string; password?: string | null; login_id?: string }> {
  const checked = checkStudent(universityCode, row);
  if (!checked.ok) return { ok: false, why: checked.why };
  let made;
  try { made = await provisionStudent(orgId, checked.value); }
  catch (e) { if (e instanceof LoginTaken) return { ok: false, why: e.message }; throw e; }
  await audit({
    actorId: Number(actor.userId), actorRole: actor.role,
    action: made.created ? "campus.student.create" : "campus.student.update",
    targetKind: "user", targetId: made.userId, orgId: actor.orgId,
    detail: { university: universityCode, department: checked.value.ctx.department_code },
  });
  return { ok: true, password: made.password, login_id: checked.value.loginId };
}

/* ── CSV ───────────────────────────────────────────────────────────── */

/**
 * CSV 한 줄의 판정. **오류 줄을 버리지 않는다**(규격 §14).
 *
 * 담당자가 고쳐야 하는 것은 그 줄이지 파일 전체가 아니다. 그래서 줄
 * 번호와 까닭을 함께 돌려주고, 정상 줄만 적용한다.
 */
export type ImportRow = {
  line: number;
  input: CampusStudentInput;
  ok: boolean;
  why?: string;
  /** 이미 있는 아이디인가. 적용하면 **학과만 맞추고 열쇠는 그대로다** */
  existing?: boolean;
};

/** 머리글을 보고 칸을 찾는다. **차례를 못 박지 않는다** */
export function parseStudentCsv(text: string): {
  ok: boolean; why?: string; rows: { line: number; input: CampusStudentInput }[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { ok: false, why: "빈 파일입니다", rows: [] };
  const head = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const at = (n: string) => head.indexOf(n);
  const iSid = at("student_id"); const iName = at("name"); const iDep = at("department_code");
  if (iSid < 0 || iName < 0) {
    return {
      ok: false, rows: [],
      why: `머리글에 student_id 와 name 이 있어야 합니다 (읽은 머리글: ${head.join(" ")})`,
    };
  }
  if (iDep < 0) return { ok: false, why: "머리글에 department_code 가 없습니다", rows: [] };
  const iMail = at("email"); const iCol = at("college_code"); const iLogin = at("login_id");
  const cell = (c: string[], i: number) => (i >= 0 ? (c[i] ?? "").trim() : "");
  return {
    ok: true,
    rows: lines.slice(1).map((l, n) => {
      const c = l.split(",");
      return {
        line: n + 2,
        input: {
          student_id: cell(c, iSid), name: cell(c, iName),
          email: cell(c, iMail) || null, login_id: cell(c, iLogin) || null,
          college_code: cell(c, iCol) || null, department_code: cell(c, iDep),
        },
      };
    }),
  };
}

/** 메일 주소 꼴. **빈 칸은 오류가 아니다**: 학번 로그인이 기본이다 */
function badEmail(v: string | null | undefined): boolean {
  const x = (v ?? "").trim();
  return x.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

/**
 * 적용하기 전에 한 줄씩 본다. **쓰지 않는다.**
 *
 * 세는 것은 넷이다: 등록부에 없는 학과 · 한 파일 안의 중복 학번 ·
 * 메일 주소 꼴 · 필수값 누락. 등록부 판정은 `checkStudent` 가 든다.
 */
export async function previewImport(
  universityCode: string, text: string,
): Promise<{ ok: boolean; why?: string; rows: ImportRow[] }> {
  const parsed = parseStudentCsv(text);
  if (!parsed.ok) return { ok: false, why: parsed.why, rows: [] };
  const seen = new Set<string>();
  const out: ImportRow[] = [];
  for (const r of parsed.rows) {
    const sid = r.input.student_id.trim();
    if (sid && seen.has(sid)) {
      out.push({ ...r, ok: false, why: `파일 안에서 학번이 겹칩니다: ${sid}` });
      continue;
    }
    if (sid) seen.add(sid);
    if (badEmail(r.input.email)) {
      out.push({ ...r, ok: false, why: "메일 주소 꼴이 아닙니다" });
      continue;
    }
    const c = checkStudent(universityCode, r.input);
    if (!c.ok) { out.push({ ...r, ok: false, why: c.why }); continue; }
    const had = await queryOne<{ id: string }>(
      `SELECT id::text FROM users WHERE login_id = $1`, [c.value.loginId]);
    out.push({ ...r, ok: true, existing: Boolean(had) });
  }
  return { ok: true, rows: out };
}

/**
 * 정상 줄만 적용한다. **오류 줄에서 멈추지 않는다.**
 *
 * 쉰 줄짜리 명단에서 한 줄이 틀렸다고 전부를 되돌리면 담당자가 그 파일을
 * 몇 번이고 다시 올린다. 적용 결과는 `만듦 / 고침 / 거절` 셋으로 적는다.
 */
export async function applyImport(
  universityCode: string, orgId: string, text: string, actor: ManageActor,
): Promise<{
  ok: boolean; why?: string;
  created: { login_id: string; password: string }[];
  updated: number; rejected: ImportRow[];
}> {
  const pre = await previewImport(universityCode, text);
  if (!pre.ok) return { ok: false, why: pre.why, created: [], updated: 0, rejected: [] };
  const created: { login_id: string; password: string }[] = [];
  const rejected: ImportRow[] = [];
  let updated = 0;
  for (const r of pre.rows) {
    if (!r.ok) { rejected.push(r); continue; }
    const c = checkStudent(universityCode, r.input);
    if (!c.ok) { rejected.push({ ...r, ok: false, why: c.why }); continue; }
    let made;
    try { made = await provisionStudent(orgId, c.value); }
    catch (e) {
      if (e instanceof LoginTaken) { rejected.push({ ...r, ok: false, why: e.message }); continue; }
      throw e;
    }
    if (made.created && made.password) {
      created.push({ login_id: c.value.loginId, password: made.password });
    } else updated += 1;
  }
  await audit({
    actorId: Number(actor.userId), actorRole: actor.role,
    action: "campus.student.import",
    targetKind: "university", targetId: universityCode, orgId: actor.orgId,
    detail: {
      created: created.length, updated, rejected: rejected.length,
    },
  });
  return { ok: true, created, updated, rejected };
}

/* ── 재응시 ────────────────────────────────────────────────────────── */

/**
 * 재응시를 한 번 연다(규격 §7).
 *
 * **기본값은 한 번이다.** 결과를 받은 학생이 `/v3/start` 를 다시 열면
 * 전에는 **새 응시가 그대로 하나 더 생겼다.** 같은 사람의 응답이 두 벌
 * 쌓이면 담당자 화면에서 어느 줄이 그 학생의 결과인지 갈리고, 규준이
 * 생기는 날 그 두 벌이 함께 들어간다.
 *
 * 그래서 끝낸 사람은 기본적으로 다시 열 수 없고, **학과 담당자가 한 번
 * 열어 줄 때만** 열린다. 여는 방법은 **이용권 한 줄**이라 DB 스키마를
 * 바꾸지 않는다: 응시는 전부터 이용권이 등급을 정하는 구조였다.
 */
export async function allowRetake(
  universityCode: string, userId: string, actor: ManageActor,
): Promise<{ ok: boolean; why?: string }> {
  const got = await ownedBySchool(universityCode, userId);
  if (!got) return { ok: false, why: "이 학교가 발급한 계정이 아닙니다" };
  const done = await queryOne<{ n: string; core: string | null }>(
    `SELECT count(*)::text AS n, max(core_code) AS core FROM v3_attempts
      WHERE user_id = $1::bigint AND status = 'scored'`, [userId]);
  if (!Number(done?.n ?? 0)) {
    return { ok: false, why: "아직 결과를 받지 않은 학생입니다" };
  }
  const core = done?.core ?? null;
  /* **줄을 두 벌 쌓지 않는다.** 담당자가 단추를 두 번 눌러도 열리는 것은
     한 번이다: 쓰지 않은 줄이 이미 있으면 그대로 둔다. 칸 이름과 값은
     파일럿 초대가 쓰는 것과 같다(`pilot/enroll.ts`) — 세는 법을 두 곳에
     적으면 어느 날 갈린다 */
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     SELECT $1::bigint, 'CM_V3_CAMPUS_PRO', 'report', 'PRO', $2, $3, 'active'
      WHERE NOT EXISTS (
        SELECT 1 FROM entitlements e
         WHERE e.user_id = $1::bigint AND e.assessment_version = $3
           AND e.status = 'active'
           AND NOT EXISTS (SELECT 1 FROM v3_attempts a WHERE a.entitlement_id = e.id))`,
    [userId, core, ASSESSMENT_VERSION]);
  await audit({
    actorId: Number(actor.userId), actorRole: actor.role,
    action: "campus.student.retake.allow",
    targetKind: "user", targetId: userId, orgId: actor.orgId,
    detail: { university: universityCode },
  });
  return { ok: true };
}
