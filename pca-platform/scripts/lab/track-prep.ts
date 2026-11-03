/** 화면 캡처용 시험 학생 하나를 준비한다 (로컬·staging 전용). 비밀번호는 PW 로 받는다 */
import { query } from "../../src/lib/db";
import { appEnv } from "../../src/lib/env";
import { hashPassword } from "../../src/lib/password";
import { roleChoices, industryChoices } from "../../src/lib/me-v3/runtime/session";

async function main() {
  if (appEnv() === "production") process.exit(2);
  const login = process.env.LOGIN ?? "";
  const pw = process.env.PW ?? "";
  if (!/^test-/.test(login) || pw.length < 8) { console.error("LOGIN=test-… PW=…"); process.exit(2); }
  const [u] = await query<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [login]);
  await query(`UPDATE users SET password_hash=$2, must_reset_pw=false WHERE id=$1`, [u.id, await hashPassword(pw)]);
  await query(`DELETE FROM entitlements WHERE user_id=$1 AND kind='track'`, [u.id]);
  await query(`DELETE FROM v3_applications WHERE user_id=$1`, [u.id]);
  const [a] = await query<{ core_code: string }>(`SELECT core_code FROM v3_attempts WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [u.id]);
  const roles = roleChoices(a.core_code), inds = industryChoices(a.core_code);
  await query(
    `INSERT INTO v3_applications (user_id, core_code, org_name, role_code, industry_code, state)
     VALUES ($1,$2,'관심 있는 소프트웨어 회사',$3,$4,'applied'),($1,$2,'지역 IT 서비스 기업',$3,NULL,'watching')`,
    [u.id, a.core_code, roles[0].code, inds[0].code]);
  console.log(u.id, a.core_code, roles[0].name, inds[0].name);
  process.exit(0);
}
void main();
