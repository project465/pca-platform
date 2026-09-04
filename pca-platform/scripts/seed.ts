/**
 * 개발용 시드. 화면을 눈으로 확인하려면 계정과 기관이 최소한 하나씩은 있어야 한다.
 * 운영 데이터가 아니며, 여러 번 돌려도 같은 상태가 되도록 짰다.
 *
 *   npm run db:seed
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tx } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

// tsx 는 .env.local 을 자동으로 읽지 않는다. 필요한 값만 직접 채운다.
function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 파일이 없으면 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");


const PW_ADMIN = "pca-dev-admin-1234";
const PW_ORG = "pca-dev-org-1234";
const PW_STUDENT = "TempPass2026";

async function main() {
await tx(async (c) => {
  const org = async (
    code: string,
    country: string,
    type: string,
    parent: string | null,
    ko: string,
    en: string,
  ) => {
    const r = await c.query<{ id: string }>(
      `INSERT INTO organizations (code, country, org_type, parent_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET country = EXCLUDED.country
       RETURNING id`,
      [code, country, type, parent],
    );
    const id = r.rows[0].id;
    for (const [lang, value] of [["ko", ko], ["en", en]] as const) {
      await c.query(
        `INSERT INTO translations (table_name, row_id, lang, field, value)
         VALUES ('organizations', $1, $2, 'name', $3)
         ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
        [id, lang, value],
      );
    }
    return id;
  };

  const user = async (
    loginId: string | null,
    email: string | null,
    name: string,
    plain: string,
    mustReset: boolean,
  ) => {
    const hash = await hashPassword(plain);
    const r = await c.query<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash, must_reset_pw)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (login_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             display_name  = EXCLUDED.display_name,
             must_reset_pw = EXCLUDED.must_reset_pw
       RETURNING id`,
      [loginId, email, name, hash, mustReset],
    );
    return r.rows[0].id;
  };

  const member = (userId: string, orgId: string, role: string) =>
    c.query(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, org_id, role) DO NOTHING`,
      [userId, orgId, role],
    );

  const vendor = await org("PCA", "KR", "company", null, "단체 PCA 운영사", "PCA Platform");
  const univ = await org("HYU", "KR", "university", null, "한양대학교", "Hanyang University");
  const dept = await org("HYU-ME", "KR", "department", univ, "한양대학교 기계공학과", "Dept. of Mechanical Engineering, Hanyang Univ.");
  const univ2 = await org("KNU", "KR", "university", null, "경북대학교", "Kyungpook National University");
  await org("KNU-ME", "KR", "department", univ2, "경북대학교 기계공학부", "School of Mechanical Engineering, KNU");

  const admin = await user("admin", "admin@pca.local", "박운영", PW_ADMIN, false);
  await member(admin, vendor, "superadmin");

  const orgAdmin = await user("me-admin", "me-admin@hyu.ac.kr", "김담당", PW_ORG, false);
  await member(orgAdmin, dept, "org_admin");

  const student = await user("2021001234", null, "이학생", PW_STUDENT, true);
  await member(student, dept, "student");
});

  console.log(`
시드 완료. 개발용 계정입니다.

  운영사 관리자   admin        / ${PW_ADMIN}
  학과 담당자     me-admin     / ${PW_ORG}
  학생(첫 로그인) 2021001234   / ${PW_STUDENT}   ← 로그인하면 비밀번호 변경 화면으로 갑니다
`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
