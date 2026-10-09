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
import { devPassword, whereToLook } from "./dev-credentials.mjs";

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


/**
 * **운영 DB 에는 붓지 않는다.**
 *
 * 여기 들어 있는 것은 눌러 볼 계정과 시연 기관이고, 비밀번호가 이
 * 파일에 적혀 있다. 운영에 한 번 들어가면 **아이디와 비밀번호가 공개된
 * 운영자 계정**이 생긴다. 운영자는 `scripts/make-admin.ts` 로 하나만
 * 만든다.
 */
if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error(
    "APP_ENV=production 에서는 시드를 넣지 않습니다.\n" +
    "운영자 계정은 `npx tsx scripts/make-admin.ts <아이디> <이메일> <이름>` 로 만드십시오.",
  );
  process.exit(2);
}

/* **열쇠를 여기 적지 않는다.** 전에는 세 값이 평문이었고 같은 값이
   README 와 QA 문서에도 있었다. 운영 secret 은 아니지만 그 값으로
   실제로 로그인이 된다 — 개발 DB 가 잠깐 열린 날 저장소를 읽은 사람이
   그대로 들어온다. 값은 `.dev-credentials.json`(gitignore)에서 온다 */
const PW_ADMIN = devPassword("admin");
const PW_ORG = devPassword("org");
const PW_STUDENT = devPassword("student");

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

  /* **값을 찍지 않는다.** 터미널 기록과 CI 로그에 남는 것이 평문으로
     적어 두는 것과 같은 일이다. 어디서 볼 수 있는지만 알린다 */
  console.log(`
시드 완료. 개발용 계정입니다.

  운영사 관리자   admin
  학과 담당자     me-admin
  학생(첫 로그인) 2021001234   ← 로그인하면 비밀번호 변경 화면으로 갑니다

${whereToLook()}
`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
