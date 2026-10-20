/**
 * KUS 시연·검증 자료를 세운다. **전부 테스트 자료다.**
 *
 * 기관(KUS) · 담당자 · `[테스트]` 학생 · `[테스트]` 탐방 기업 한 줄.
 * 실제 학생 · 실제 기업 · 다른 기관의 자료를 쓰지 않는다. 탐방 기업은
 * 이름부터 `[테스트] 가상기업` 이고 `is_test` 가 서서 학생 화면과 PDF 에
 * 테스트 띠가 따라간다.
 *
 * **운영에서 돌지 않는다.** `APP_ENV=production` 이거나 DB 가 이 기계가
 * 아니면 한 줄도 쓰지 않고 멈춘다.
 *
 *   APP_ENV=dev V3_CAMPUS_FIXTURE=scripts/fixtures/campus-kus.json APPLY=yes \
 *     npx tsx scripts/kus/demo-setup.ts
 */
import { query, queryOne } from "../../src/lib/db";
import { appEnv } from "../../src/lib/env";
import { hashPassword } from "../../src/lib/password";
import { checkStudent, provisionStudent, campusStudentContext } from "../../src/lib/campus/students";
import { KUS_CODE, KUS_ORG_CODE } from "../../src/lib/kus/program";

export function guard(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (appEnv() === "production") { console.error("운영에서 돌지 않는다"); process.exit(2); }
  const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
  if (!["127.0.0.1", "localhost"].includes(host)) { console.error("이 기계의 DB 가 아니다"); process.exit(2); }
  if ((process.env.APPLY ?? "") !== "yes") { console.error("APPLY=yes 를 주십시오(테스트 계정을 만든다)"); process.exit(2); }
}

export async function org(code: string, name: string, type = "university"): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type, status, name, language, is_demo)
     VALUES ($1, 'KR', $3, 'active', $2, 'ko', TRUE)
     ON CONFLICT (code) DO UPDATE SET status = 'active', name = EXCLUDED.name
     RETURNING id::text`, [code, name, type]);
  return r?.id as string;
}

/** 담당자 하나. 비밀번호는 부른 쪽이 정한다(로그에 적지 않는다) */
export async function admin(login: string, orgId: string, pw: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, display_name, password_hash, status, locale, must_reset_pw)
     VALUES ($1, $2, $3, 'active', 'ko', FALSE)
     ON CONFLICT (login_id) DO UPDATE SET status = 'active', password_hash = EXCLUDED.password_hash
     RETURNING id::text`, [login, `[테스트] ${login}`, await hashPassword(pw)]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint, $2::bigint, 'org_admin')
     ON CONFLICT (user_id, org_id, role) DO NOTHING`, [r?.id, orgId]);
  return r?.id as string;
}

/** 학교 발급 학생 하나. 앞 응시와 탐방 기록을 치운다: 이 계정은 테스트 전용이다 */
export async function student(uni: string, orgId: string, sid: string, name: string, dept: string, pw?: string) {
  const c = checkStudent(uni, {
    student_id: sid, name, login_id: `qa-${uni.toLowerCase()}-${sid.toLowerCase()}`, department_code: dept,
  });
  if (!c.ok) throw new Error(`${sid}: ${c.why}`);
  const got = await provisionStudent(orgId, c.value, { rotate: true });
  if (pw) {
    await query(`UPDATE users SET password_hash = $2 WHERE id = $1::bigint`, [got.userId, await hashPassword(pw)]);
  }
  await query(`DELETE FROM kus_company_visits WHERE user_id = $1::bigint`, [got.userId]).catch(() => undefined);
  await query(`DELETE FROM v3_experiences WHERE user_id = $1::bigint`, [got.userId]);
  await query(`DELETE FROM v3_snapshots WHERE attempt_id IN (SELECT id FROM v3_attempts WHERE user_id = $1::bigint)`, [got.userId]);
  await query(`DELETE FROM v3_attempts WHERE user_id = $1::bigint`, [got.userId]);
  const mine = await campusStudentContext(got.userId);
  if (!mine) throw new Error(`${sid}: 학교 맥락이 서지 않는다`);
  return { userId: got.userId, login: c.value.loginId, ctx: mine.ctx, dept: mine.department_name };
}

/** 학교 소속이 없는 다른 기관 사용자(진흥원 자리의 **테스트 대역**) */
export async function outsider(login: string, orgId: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, display_name, password_hash, status, locale, must_reset_pw)
     VALUES ($1, $2, 'x', 'active', 'ko', FALSE)
     ON CONFLICT (login_id) DO UPDATE SET status = 'active' RETURNING id::text`,
    [login, `[테스트] ${login}`]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint, $2::bigint, 'student')
     ON CONFLICT (user_id, org_id, role) DO NOTHING`, [r?.id, orgId]);
  return r?.id as string;
}

export async function testProgram(): Promise<string> {
  const had = await queryOne<{ id: string }>(
    `SELECT id::text FROM kus_visit_programs WHERE company_name = '[테스트] 가상기업 A' AND is_test`);
  if (had) return had.id;
  const r = await queryOne<{ id: string }>(
    `INSERT INTO kus_visit_programs (company_name, business_note, visit_date, status, source_note, is_test)
     VALUES ('[테스트] 가상기업 A', '테스트용 가상 기업 · 실제 기업 아님', '2026-11-12', 'PLANNED',
             '검증 스크립트가 만든 테스트 줄', TRUE) RETURNING id::text`);
  return r?.id as string;
}

export async function kusOrgSetup(): Promise<{ orgId: string }> {
  return { orgId: await org(KUS_ORG_CODE, "[테스트] 고려대학교 세종캠퍼스") };
}

/* 단독 실행: 브라우저로 눌러 볼 계정(학생 하나 · 담당자 하나)을 세운다 */
async function main() {
  guard();
  const { orgId } = await kusOrgSetup();
  await testProgram();
  const spw = process.env.KUS_STUDENT_PW ?? "";
  const apw = process.env.KUS_ADMIN_PW ?? "";
  if (!spw || !apw) { console.error("KUS_STUDENT_PW · KUS_ADMIN_PW 를 주십시오"); process.exit(2); }
  const s = await student(KUS_CODE, orgId, "QA2026001", "[테스트] KUS 학생", "KUS26_CBIZ_GM", spw);
  await admin("qa-kus-admin", orgId, apw);
  /* 서버 검사(verify.ts)가 세운 RICH · POOR · CONTRA 도 같은 비밀번호로 눌러 볼 수 있게 한다 */
  await query(`UPDATE users SET password_hash = $1 WHERE login_id LIKE 'qa-kus-qa26%' OR login_id IN ('qa-pcu-qap1', 'qa-sj-seeker', 'qa-pcu-admin')`, [await hashPassword(spw)]);
  console.log(`학생 ${s.login} · 담당자 qa-kus-admin (비밀번호는 환경변수 값)`);
  process.exit(0);
}

if (process.argv[1]?.endsWith("demo-setup.ts")) main().catch((e) => { console.error(e); process.exit(1); });
