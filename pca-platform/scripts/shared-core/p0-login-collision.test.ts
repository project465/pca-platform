/**
 * P0 — 기관 사이의 학번 충돌 재현 (R36).
 *
 * **제품 코드를 고치지 않는다.** 이 검사가 부르는 것은 지금 운영과 같은 함수다:
 * `campus/students.ts` 의 `checkStudent` · `provisionStudent` ·
 * `campusStudentContext`, `campus/manage.ts` 의 `addStudentAccount` ·
 * `applyImport` · `previewImport` · `listStudents` · `rotateStudentPassword` ·
 * `setAccountStatus`, `runtime/session.ts` 의 `attemptOf`. 로그인과 비밀번호 찾기의
 * 사용자 식별 질의는 그 소스 파일에서 **글자 그대로 꺼내** 돌린다(`next-auth` 가
 * 설치되지 않아 `authorize()` 자체는 부를 수 없다).
 *
 * 기관 둘은 이미 있는 코드다: `PCU`(운영 등록부, 읽기만) 와 `ZZTEST`
 * (`scripts/fixtures/campus-zztest.json`, 확인용 가상 대학). **새 기관 ID 를 만들지
 * 않는다.** 사람은 전부 가상이고 학번은 `SC36-` 로 시작한다.
 *
 * 두 갈래로 나눈다.
 *   P0-REPRO-*  지금 동작을 **그대로** 확인한다. 통과하면 = 문제가 재현됐다
 *   P0-COMPAT-* 고치기 전에도 뒤에도 서야 하는 하위 호환(지금 통과해야 한다)
 *   P0-FIX-*    고친 뒤에 서야 하는 불변식. 지금은 `todo` 로 둔다(실패해도
 *               실패로 세지 않는다). 총괄 PM 승인 뒤 todo 를 걷으면 회귀 검사가 된다
 *
 *   bash scripts/shared-core/test/pg-sandbox.sh up
 *   SC_SHIMS=1 DATABASE_URL=... V3_CAMPUS_FIXTURE=$PWD/scripts/fixtures/campus-zztest.json \
 *     node --experimental-strip-types --import ./scripts/shared-core/test/register.mjs \
 *     --test scripts/shared-core/p0-login-collision.test.ts
 *   bash scripts/shared-core/test/pg-sandbox.sh down
 *
 * `SC_EXPECT_FIX=1` 은 **수정안을 적용한 사본**에서만 쓴다
 * (`docs/shared-core/proposed/sc2-p0.patch`). 그때는 FIX 가 실제 검사가 되고,
 * 지금 동작을 그대로 확인하는 REPRO 가운데 수정안이 없애는 것은 건너뛴다.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { query, queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  campusStudentContext, checkStudent, provisionStudent,
} from "@/lib/campus/students";
import {
  addStudentAccount, applyImport, listStudents, previewImport,
  rotateStudentPassword, setAccountStatus, type ManageActor,
} from "@/lib/campus/manage";
import { attemptOf } from "@/lib/me-v3/runtime/session";

/* ── 안전 장치: 일회용 DB 에서만 돈다 ─────────────────────────────── */

const URL_ = process.env.DATABASE_URL ?? "";
if (!/host=\/[^&]*sc-pg-sandbox/.test(URL_) || process.env.SC_SHIMS !== "1") {
  throw new Error(
    "이 검사는 pg-sandbox.sh 가 띄운 일회용 DB(소켓 경로에 sc-pg-sandbox)와 SC_SHIMS=1 에서만 돕니다");
}
if (!process.env.V3_CAMPUS_FIXTURE) {
  throw new Error("V3_CAMPUS_FIXTURE 에 scripts/fixtures/campus-zztest.json 을 주십시오");
}

/* ── 기록 ────────────────────────────────────────────────────────── */

const EVIDENCE: Record<string, unknown> = {};
const note = (k: string, v: unknown) => { EVIDENCE[k] = v; };
process.on("exit", () => {
  const out = process.env.SC_EVIDENCE;
  if (out) writeFileSync(out, `${JSON.stringify(EVIDENCE, null, 2)}\n`);
});

/* ── 가상 기관과 담당자 ──────────────────────────────────────────── */

const PCU = "PCU";
const ZZ = "ZZTEST";
const PCU_DEPT = "PCU26_KOREAN";   // 운영 등록부의 실제 자리 (읽기만)
const ZZ_DEPT = "ZZ26_ME";         // 확인용 가상 대학의 자리
let orgPcu = ""; let orgZz = "";
let actorPcu: ManageActor; let actorZz: ManageActor;

async function org(code: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type, name)
     VALUES ($1, 'KR', 'university', $2)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id::text`, [code, `${code} (검사용)`]);
  return String(r!.id);
}

async function admin(login: string, orgId: string): Promise<ManageActor> {
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, display_name, password_hash, status, locale, must_reset_pw)
     VALUES ($1, $1, 'x', 'active', 'ko', FALSE)
     ON CONFLICT (login_id) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`, [login]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint, $2::bigint, 'org_admin')
     ON CONFLICT DO NOTHING`, [u!.id, orgId]);
  return { userId: String(u!.id), role: "org_admin", orgId: Number(orgId) };
}

before(async () => {
  orgPcu = await org(PCU);
  orgZz = await org(ZZ);
  actorPcu = await admin("sc36-admin-pcu", orgPcu);
  actorZz = await admin("sc36-admin-zz", orgZz);
});

/* ── 읽는 자리 ───────────────────────────────────────────────────── */

type Who = {
  id: string; login_id: string | null; display_name: string; password_hash: string;
  cs_uni: string | null; cs_sid: string | null; cs_col: string | null; cs_dep: string | null;
  orgs: string[];
};

async function who(loginId: string): Promise<Who | null> {
  const r = await queryOne<Who>(
    `SELECT u.id::text, u.login_id, u.display_name, u.password_hash,
            cs.university_code AS cs_uni, cs.student_id AS cs_sid,
            cs.college_code AS cs_col, cs.department_code AS cs_dep,
            coalesce((SELECT array_agg(o.code ORDER BY o.code) FROM memberships m
                       JOIN organizations o ON o.id = m.org_id
                      WHERE m.user_id = u.id), '{}') AS orgs
       FROM users u LEFT JOIN campus_students cs ON cs.user_id = u.id
      WHERE u.login_id = $1`, [loginId]);
  return r ? { ...r, id: String(r.id) } : null;
}

/** 로그인과 비밀번호 찾기가 쓰는 식별 질의를 **소스에서 글자 그대로** 꺼낸다 */
function sqlFrom(file: string, marker: RegExp): string {
  const src = readFileSync(file, "utf8");
  const m = marker.exec(src);
  if (!m) throw new Error(`${file} 에서 식별 질의를 찾지 못했습니다 — 소스가 바뀌었다`);
  return m[1];
}
const LOGIN_SQL = sqlFrom("src/lib/auth.ts",
  /async function findUserByIdentifier[\s\S]*?queryOne<UserRow>\(\s*`([\s\S]*?)`/);
const FORGOT_SQL = sqlFrom("src/app/password/forgot/actions.ts",
  /queryOne<\{ id: string; email: string \| null \}>\(\s*`([\s\S]*?)`/);

async function loginResolves(identifier: string): Promise<string | null> {
  const r = await queryOne<{ id: string }>(LOGIN_SQL, [identifier]);
  return r ? String(r.id) : null;
}

/** 끝낸 응시 한 벌을 심는다(채점 엔진을 부르지 않는다. 귀속만 본다) */
async function seedScored(userId: string, uni: string, dep: string, col: string): Promise<string> {
  const a = await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts (user_id, tier, education_stage, item_bank_version,
                              scoring_version, status, submitted_at, core_code,
                              university_code, college_code, department_code)
     VALUES ($1::bigint, 'PRO', 'bachelor', 'SC36_FIXTURE', 'SC36_FIXTURE', 'scored', now(),
             'LANG_CORE_V1', $2, $3, $4)
     RETURNING id::text`, [userId, uni, col, dep]);
  await query(
    `INSERT INTO v3_snapshots (attempt_id, module_versions, response_quality, payload)
     VALUES ($1::bigint, '{}'::jsonb, 'OK', '{"sc36":"fixture"}'::jsonb)`, [a!.id]);
  return String(a!.id);
}

function checked(uni: string, sid: string, name: string, dep: string,
  extra: { login_id?: string; email?: string } = {}) {
  const c = checkStudent(uni, { student_id: sid, name, department_code: dep, ...extra });
  assert.equal(c.ok, true, `checkStudent(${uni}, ${sid}) 가 거절했습니다: ${JSON.stringify(c)}`);
  return (c as Extract<typeof c, { ok: true }>).value;
}

/* ── P0-REPRO ────────────────────────────────────────────────────── */

/** 수정안이 없애는 동작. 수정안 사본(`SC_EXPECT_FIX=1`)에서는 건너뛴다 */
const GONE = process.env.SC_EXPECT_FIX === "1"
  ? { skip: "수정안 적용 사본 — 재현 대상 동작이 사라졌다(FIX-* 가 대신 센다)" } : {};

test("P0-REPRO-0 checkStudent 는 아이디를 기관 없이 학번 그대로 만든다", GONE, () => {
  const a = checked(PCU, "SC36-0000", "가상 A", PCU_DEPT);
  const b = checked(ZZ, "SC36-0000", "가상 B", ZZ_DEPT);
  note("repro0", { pcu_login: a.loginId, zz_login: b.loginId });
  assert.equal(a.loginId, b.loginId);
  assert.equal(a.loginId, "SC36-0000");
});

test("P0-REPRO-1 최초 등록과 같은 기관 재등록은 한 계정으로 수렴한다(기준선)", async () => {
  const sid = "SC36-0001";
  const first = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  const again = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  const w = await who(sid);
  note("repro1", { first: { created: first.created, userId: first.userId },
    again: { created: again.created, password: again.password },
    row: w ? { ...w, password_hash: "(기록하지 않음)" } : null });
  assert.equal(first.created, true);
  assert.equal(again.created, false);
  assert.equal(again.password, null);
  assert.equal(again.userId, first.userId);
  assert.equal(w?.cs_uni, PCU);
  assert.deepEqual(w?.orgs, [PCU]);
});

test("P0-REPRO-2 다른 기관이 같은 학번을 올리면(화면 경로 · rotate 없음) 앞 기관 학생의 학과가 덮인다", GONE, async () => {
  const sid = "SC36-0002";
  const pcu = await addStudentAccount(PCU, orgPcu,
    { student_id: sid, name: "가상 A", department_code: PCU_DEPT }, actorPcu);
  assert.equal(pcu.ok, true);
  const before = await who(sid);
  const ctxBefore = await campusStudentContext(before!.id);

  /* 다른 기관 담당자의 미리 보기: 남의 학생이 `existing` 으로 보인다 */
  const pre = await previewImport(ZZ, `student_id,name,department_code\n${sid},가상 B,${ZZ_DEPT}`);
  const zz = await addStudentAccount(ZZ, orgZz,
    { student_id: sid, name: "가상 B", department_code: ZZ_DEPT }, actorZz);
  const after = await who(sid);
  const ctxAfter = await campusStudentContext(after!.id);
  const listPcu = await listStudents({ universityCode: PCU, q: sid, withDemo: true });
  const listZz = await listStudents({ universityCode: ZZ, q: sid, withDemo: true });

  note("repro2", {
    preview_zz: pre.rows.map((r) => ({ ok: r.ok, existing: r.existing })),
    add_zz: zz,
    before: { cs: [before?.cs_uni, before?.cs_col, before?.cs_dep], orgs: before?.orgs,
      ctx: ctxBefore?.ctx ?? null },
    after: { cs: [after?.cs_uni, after?.cs_col, after?.cs_dep], orgs: after?.orgs,
      name: after?.display_name, ctx: ctxAfter?.ctx ?? null,
      hash_changed: before?.password_hash !== after?.password_hash },
    list_pcu: listPcu.rows.map((r) => [r.student_id, r.college_code, r.department_code]),
    list_zz_total: listZz.total,
  });

  assert.equal(pre.rows[0]?.existing, true, "다른 기관 미리 보기에 남의 학번이 '이미 있음' 으로 보인다");
  assert.equal(zz.ok, true);
  assert.equal(zz.password, null, "다른 기관 학생에게 열쇠가 나가지 않는다 → 그 학생은 로그인할 수 없다");
  assert.equal(after?.id, before?.id, "같은 users 줄이다");
  assert.equal(after?.cs_uni, PCU, "학교 코드는 그대로 PCU 인데");
  assert.equal(after?.cs_dep, ZZ_DEPT, "학과는 다른 기관의 코드로 덮였다");
  assert.equal(after?.cs_col, "ZZ_ENG");
  assert.notEqual(ctxBefore, null);
  assert.equal(ctxAfter, null, "그래서 PCU 학생의 학교 맥락이 풀리지 않는다(검사 시작이 막힌다)");
  assert.deepEqual(after?.orgs, [PCU], "다른 기관 소속은 붙지 않았다");
  assert.equal(listZz.total, 0, "다른 기관 명단에는 서지 않는다");
});

test("P0-REPRO-3 CSV 적용도 같은 길이다(applyImport → 고침 1 · 만듦 0)", GONE, async () => {
  const sid = "SC36-0003";
  await addStudentAccount(PCU, orgPcu,
    { student_id: sid, name: "가상 A", department_code: PCU_DEPT }, actorPcu);
  const r = await applyImport(ZZ, orgZz,
    `student_id,name,department_code\n${sid},가상 B,${ZZ_DEPT}`, actorZz);
  const after = await who(sid);
  note("repro3", { apply_zz: { created: r.created.length, updated: r.updated,
    rejected: r.rejected.length }, after_cs: [after?.cs_uni, after?.cs_dep] });
  assert.equal(r.created.length, 0);
  assert.equal(r.updated, 1, "다른 기관 담당자에게는 '고침 1' 로 보인다");
  assert.equal(after?.cs_dep, ZZ_DEPT);
});

test("P0-REPRO-4 rotate 로 올리면(CLI `pcu:students` ROTATE=yes 경로) 계정이 통째로 넘어간다", GONE, async () => {
  const sid = "SC36-0004";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  const pcuPassword = a.password!;
  const attemptId = await seedScored(a.userId, PCU, PCU_DEPT, "HUMSOC");
  const before = await who(sid);

  const b = await provisionStudent(orgZz, checked(ZZ, sid, "가상 B", ZZ_DEPT), { rotate: true });
  const after = await who(sid);
  const loginUser = await loginResolves(sid);
  const forgot = await queryOne<{ id: string }>(FORGOT_SQL, [sid]);
  const oldOk = await verifyPassword(pcuPassword, after!.password_hash);
  const newOk = await verifyPassword(b.password!, after!.password_hash);
  const seenByNewHolder = await attemptOf(attemptId, String(loginUser));
  const pcuRotate = await rotateStudentPassword(PCU, after!.id, actorPcu);
  const zzDisable = await setAccountStatus(ZZ, after!.id, false, actorZz);
  await setAccountStatus(ZZ, after!.id, true, actorZz);

  note("repro4", {
    provision_zz: { created: b.created, userId: b.userId, password_issued: Boolean(b.password) },
    before: { id: before?.id, name: before?.display_name, cs_uni: before?.cs_uni, orgs: before?.orgs },
    after: { id: after?.id, name: after?.display_name, cs_uni: after?.cs_uni,
      cs_dep: after?.cs_dep, orgs: after?.orgs },
    login_sql_resolves_to: loginUser, forgot_sql_resolves_to: forgot ? String(forgot.id) : null,
    pcu_password_still_works: oldOk, zz_password_works: newOk,
    pcu_attempt_visible_to_new_holder: Boolean(seenByNewHolder),
    pcu_admin_rotate: pcuRotate, zz_admin_disable: zzDisable,
  });

  assert.equal(b.userId, a.userId, "새 계정이 아니라 같은 users 줄이다");
  assert.equal(b.created, false);
  assert.ok(b.password, "다른 기관에 새 열쇠가 나간다");
  assert.equal(after?.display_name, "가상 B", "이름이 덮였다");
  assert.equal(after?.cs_uni, ZZ, "학교 코드까지 넘어갔다");
  assert.deepEqual(after?.orgs, [PCU, ZZ], "두 기관 소속을 함께 든다");
  assert.equal(loginUser, a.userId, "학번으로 로그인하면 그 줄로 간다");
  assert.equal(oldOk, false, "PCU 학생의 열쇠는 죽었다");
  assert.equal(newOk, true, "다른 기관 학생의 열쇠로 들어간다");
  assert.ok(seenByNewHolder, "그리고 PCU 학생이 끝낸 응시가 그 사람의 것으로 열린다");
  assert.equal(pcuRotate.ok, false, "PCU 담당자는 자기 학생을 더 다루지 못한다");
  assert.equal(zzDisable.ok, true, "다른 기관 담당자가 그 계정을 끄고 켠다");
});

test("P0-REPRO-5 명단에 적은 login_id 가 다른 기관 아이디와 같아도 같은 길이다", GONE, async () => {
  await addStudentAccount(PCU, orgPcu,
    { student_id: "SC36-0005", name: "가상 A", department_code: PCU_DEPT }, actorPcu);
  const zz = await addStudentAccount(ZZ, orgZz, {
    student_id: "SC36-9005", name: "가상 B", department_code: ZZ_DEPT, login_id: "SC36-0005",
  }, actorZz);
  const after = await who("SC36-0005");
  note("repro5", { add_zz: zz, after_cs: [after?.cs_uni, after?.cs_sid, after?.cs_dep] });
  assert.equal(zz.password, null);
  assert.equal(after?.cs_uni, PCU);
  assert.equal(after?.cs_sid, "SC36-0005", "학번은 그대로");
  assert.equal(after?.cs_dep, ZZ_DEPT, "학과만 다른 기관 것으로");
});

test("P0-REPRO-6 같은 메일이 다른 기관 명단에 있으면 그 줄에서 적용이 던지고 뒤 줄이 남는다", GONE, async () => {
  await addStudentAccount(PCU, orgPcu, { student_id: "SC36-0006", name: "가상 A",
    department_code: PCU_DEPT, email: "sc36-shared@example.invalid" }, actorPcu);
  const csv = [
    "student_id,name,department_code,email",
    `SC36-7001,가상 B1,${ZZ_DEPT},`,
    `SC36-7002,가상 B2,${ZZ_DEPT},sc36-shared@example.invalid`,
    `SC36-7003,가상 B3,${ZZ_DEPT},`,
  ].join("\n");
  let err: { code?: string; message?: string } | null = null;
  try { await applyImport(ZZ, orgZz, csv, actorZz); } catch (e) { err = e as typeof err; }
  const made = await Promise.all(["SC36-7001", "SC36-7002", "SC36-7003"].map(who));
  note("repro6", { error_code: err?.code ?? null, error: String(err?.message ?? "").slice(0, 160),
    rows: made.map((m) => (m ? m.cs_uni : null)) });
  assert.equal(err?.code, "23505", "users_email_key 에서 던진다");
  assert.equal(made[0]?.cs_uni, ZZ, "앞 줄은 이미 적혔다");
  assert.equal(made[1], null);
  assert.equal(made[2], null, "뒤 줄은 적히지 않았다(반쪽 적용)");
});

test("P0-REPRO-7 다른 기관 담당자는 남의 학생을 직접 다루지 못한다(기준선 격리)", async () => {
  const sid = "SC36-0008";
  const a = await addStudentAccount(PCU, orgPcu,
    { student_id: sid, name: "가상 A", department_code: PCU_DEPT }, actorPcu);
  assert.equal(a.ok, true);
  const w = await who(sid);
  const rot = await rotateStudentPassword(ZZ, w!.id, actorZz);
  const dis = await setAccountStatus(ZZ, w!.id, false, actorZz);
  note("repro7", { zz_rotate_pcu_student: rot, zz_disable_pcu_student: dis });
  assert.equal(rot.ok, false);
  assert.equal(dis.ok, false);
});

/* ── P0-FIX (고친 뒤의 불변식 · 지금은 todo) ───────────────────── */

const FIX_MODE = process.env.SC_EXPECT_FIX === "1";
const TODO = FIX_MODE ? {}
  : { todo: "총괄 PM 승인 뒤 SC-2 수정안(docs/shared-core/R36_P0_LOGIN_COLLISION.md)을 적용하면 켠다" };

test("P0-FIX-1 다른 기관의 같은 학번은 각자의 계정이 된다", TODO, async () => {
  const sid = "SC36-F001";
  const a = await addStudentAccount(PCU, orgPcu,
    { student_id: sid, name: "가상 A", department_code: PCU_DEPT }, actorPcu);
  const b = await addStudentAccount(ZZ, orgZz,
    { student_id: sid, name: "가상 B", department_code: ZZ_DEPT }, actorZz);
  assert.ok(a.password && b.password, "두 사람 모두 열쇠를 받는다");
  const pcu = await listStudents({ universityCode: PCU, q: sid, withDemo: true });
  const zz = await listStudents({ universityCode: ZZ, q: sid, withDemo: true });
  assert.equal(pcu.total, 1);
  assert.equal(zz.total, 1);
  assert.notEqual(pcu.rows[0]?.user_id, zz.rows[0]?.user_id);
});

test("P0-FIX-2 다른 기관의 명단 적용이 남의 학생 학과를 바꾸지 않는다", TODO, async () => {
  const sid = "SC36-F002";
  await addStudentAccount(PCU, orgPcu,
    { student_id: sid, name: "가상 A", department_code: PCU_DEPT }, actorPcu);
  await applyImport(ZZ, orgZz, `student_id,name,department_code\n${sid},가상 B,${ZZ_DEPT}`, actorZz);
  const pcu = await listStudents({ universityCode: PCU, q: sid, withDemo: true });
  assert.equal(pcu.rows[0]?.department_code, PCU_DEPT);
});

test("P0-FIX-3 rotate 도 다른 기관 학생의 열쇠·이름·학교를 바꾸지 않는다", TODO, async () => {
  const sid = "SC36-F003";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  await provisionStudent(orgZz, checked(ZZ, sid, "가상 B", ZZ_DEPT), { rotate: true })
    .catch(() => null);
  const pcu = await listStudents({ universityCode: PCU, q: sid, withDemo: true });
  assert.equal(pcu.rows[0]?.user_id, a.userId);
  assert.equal(pcu.rows[0]?.name, "가상 A");
});

test("P0-FIX-4 다른 기관 미리 보기에 남의 학번이 '이미 있음' 으로 새지 않는다", TODO, async () => {
  const sid = "SC36-F004";
  await addStudentAccount(PCU, orgPcu,
    { student_id: sid, name: "가상 A", department_code: PCU_DEPT }, actorPcu);
  const pre = await previewImport(ZZ, `student_id,name,department_code\n${sid},가상 B,${ZZ_DEPT}`);
  assert.equal(pre.rows[0]?.existing, false);
});

test("P0-FIX-5 다른 기관 명단의 겹치는 메일은 그 줄만 거절하고 뒤 줄은 적힌다", TODO, async () => {
  await addStudentAccount(PCU, orgPcu, { student_id: "SC36-F051", name: "가상 A",
    department_code: PCU_DEPT, email: "sc36-f5@example.invalid" }, actorPcu);
  const csv = [
    "student_id,name,department_code,email",
    `SC36-F052,가상 B1,${ZZ_DEPT},`,
    `SC36-F053,가상 B2,${ZZ_DEPT},sc36-f5@example.invalid`,
    `SC36-F054,가상 B3,${ZZ_DEPT},`,
  ].join("\n");
  const r = await applyImport(ZZ, orgZz, csv, actorZz);
  assert.equal(r.ok, true);
  assert.equal(r.created.length, 2);
  assert.equal(r.rejected.length, 1);
  const pcu = await who("SC36-F051");
  assert.equal(pcu?.cs_uni, PCU, "앞 기관 학생은 그대로다");
});

test("P0-FIX-6 학교가 발급하지 않은 계정을 학번이 같다고 가져가지 않는다", TODO, async () => {
  const handle = "SC36-F061";
  await query(`INSERT INTO users (login_id, display_name, password_hash, status, locale)
               VALUES ($1, '개인 회원', 'x', 'active', 'ko')`, [handle]);
  const before = await who(handle);
  const r = await addStudentAccount(PCU, orgPcu,
    { student_id: handle, name: "가상 A", department_code: PCU_DEPT }, actorPcu);
  assert.equal(r.ok, false, "거절로 돌려준다");
  const after = await who(handle);
  assert.equal(after?.id, before?.id);
  assert.equal(after?.cs_uni ?? null, null, "학교 소속이 붙지 않는다");
});

test("P0-FIX-7 남의 학생 응시가 새 기관 학생에게 보이지 않는다", TODO, async () => {
  const sid = "SC36-F071";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  const att = await seedScored(a.userId, PCU, PCU_DEPT, "HUMSOC");
  const b = await provisionStudent(orgZz, checked(ZZ, sid, "가상 B", ZZ_DEPT), { rotate: true });
  assert.notEqual(b.userId, a.userId);
  assert.equal(await attemptOf(att, b.userId), null);
  assert.notEqual(await attemptOf(att, a.userId), null);
});

async function forgotResolves(identifier: string): Promise<string | null> {
  const r = await queryOne<{ id: string }>(FORGOT_SQL, [identifier]);
  return r ? String(r.id) : null;
}
async function orgsOfUser(userId: string): Promise<string[]> {
  return (await query<{ code: string }>(
    `SELECT o.code FROM memberships m JOIN organizations o ON o.id = m.org_id
      WHERE m.user_id = $1::bigint ORDER BY o.code`, [userId])).map((x) => x.code);
}

test("P0-FIX-8 비밀번호 찾기에 학번을 넣으면 그 학번의 배재 학생 계정으로만 간다(남의 학교 계정으로 가지 않는다)", TODO, async () => {
  const sid = "SC36-F081";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  const b = await provisionStudent(orgZz, checked(ZZ, sid, "가상 B", ZZ_DEPT), { rotate: true });
  assert.notEqual(a.userId, b.userId);
  assert.equal(await forgotResolves(sid), a.userId, "학번 그대로 = PCU 학생");
  const zzHandle = checked(ZZ, sid, "가상 B", ZZ_DEPT).loginId;
  assert.notEqual(zzHandle, sid, "다른 학교의 손잡이는 학번과 다르다");
  assert.equal(await forgotResolves(zzHandle), b.userId, "그 학교 학생은 제 손잡이로 찾는다");
});

test("P0-FIX-9 다른 학교의 명단 · rotate 가 앞 학교 학생의 소속(memberships)을 바꾸지 않는다", TODO, async () => {
  const sid = "SC36-F091";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  await addStudentAccount(ZZ, orgZz, { student_id: sid, name: "가상 B", department_code: ZZ_DEPT }, actorZz);
  await provisionStudent(orgZz, checked(ZZ, sid, "가상 B", ZZ_DEPT), { rotate: true });
  assert.deepEqual(await orgsOfUser(a.userId), [PCU], "세션이 다시 읽는 memberships 가 그대로다");
});

test("P0-FIX-10 로그인 질의: 학번 그대로는 배재 학생 · 다른 학교 손잡이는 그 학생", TODO, async () => {
  const sid = "SC36-F101";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  const b = await provisionStudent(orgZz, checked(ZZ, sid, "가상 B", ZZ_DEPT));
  assert.notEqual(b.userId, a.userId, "전제: 두 사람이 서로 다른 계정이다(지금 코드에서는 같은 계정이라 여기서 걸린다)");
  assert.equal(await loginResolves(sid), a.userId);
  assert.equal(await loginResolves(checked(ZZ, sid, "가상 B", ZZ_DEPT).loginId), b.userId);
});

/** **패치로도 닫히지 않는 자리.** 2단계(기관을 아는 로그인) 전까지 todo 로 남는다 */
const STAGE2 = { todo: "SC-2 2단계(학교 로그인이 기관 코드를 넘기고 authorize 가 (기관, 학번)으로 찾는다) 승인 · 구현 뒤에 켠다" };
test("P0-RISK-1 다른 학교 학생이 학교 로그인 화면에 학번만 넣어 제 계정으로 들어간다", STAGE2, async () => {
  const sid = "SC36-R001";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  const b = await provisionStudent(orgZz, checked(ZZ, sid, "가상 B", ZZ_DEPT));
  assert.notEqual(b.userId, a.userId, "전제: 두 사람이 서로 다른 계정이다");
  /* 지금 로그인 질의는 기관을 받지 않는다. 학번만 넣으면 배재 학생이 나온다 */
  assert.equal(await loginResolves(sid), b.userId);
});

test("P0-COMPAT-2 배재 재등록과 rotate 는 같은 계정에서 일어난다(고치기 전후 모두)", async () => {
  const sid = "SC36-C002";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  const again = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  assert.equal(again.userId, a.userId);
  assert.equal(again.password, null, "명단을 다시 올려도 열쇠를 바꾸지 않는다");
  const rot = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A2", PCU_DEPT), { rotate: true });
  assert.equal(rot.userId, a.userId);
  assert.ok(rot.password);
  assert.equal(await loginResolves(sid), a.userId);
  const w = await who(sid);
  assert.equal(w?.cs_uni, PCU);
  assert.equal(w?.login_id, sid);
});

test("P0-COMPAT-1 배재 기존 계정의 아이디와 로그인은 학번 그대로다(고치기 전후 모두 서야 한다)", async () => {
  const sid = "SC36-F005";
  const a = await provisionStudent(orgPcu, checked(PCU, sid, "가상 A", PCU_DEPT));
  assert.equal(await loginResolves(sid), a.userId, "PCU 학생은 지금처럼 학번 그대로 로그인한다");
  const w = await who(sid);
  assert.equal(w?.login_id, sid);
});
