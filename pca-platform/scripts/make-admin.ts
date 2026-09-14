/**
 * 운영 관리자 계정 만들기.
 *
 * db:seed 는 개발용이다. 데모 기관과 학생 계정이 딸려 들어오고 비밀번호가
 * 소스에 박혀 있어서 운영 데이터베이스에 돌리면 안 된다. 그런데 운영사 화면
 * (/admin/*)에 들어가려면 superadmin 멤버십이 하나는 있어야 하므로, 처음
 * 올릴 때 관리자를 만들 방법이 따로 필요하다. 이 스크립트가 그것만 한다.
 *
 *   ADMIN_EMAIL=ops@example.com ADMIN_PW='...' ADMIN_NAME=박운영 npm run make:admin
 *
 * 비밀번호는 인자로 받지 않는다. 셸 히스토리와 프로세스 목록에 남는다.
 * 이미 있는 계정에 돌리면 superadmin 권한만 붙이고 비밀번호는 건드리지 않는다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tx } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const pw = process.env.ADMIN_PW ?? "";
const name = (process.env.ADMIN_NAME ?? "운영자").trim();
/** 운영사 조직 코드. 기관(대학·학과)과 달리 하나뿐이다 */
const VENDOR_CODE = process.env.ADMIN_ORG_CODE ?? "PCA";

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) die("ADMIN_EMAIL 에 쓸 만한 주소가 없습니다.");
if (pw.length < 12) die("ADMIN_PW 가 12자 미만입니다. 운영사 계정은 모든 결제와 정산을 봅니다.");

async function main() {
  const { created, promoted } = await tx(async (c) => {
    const org = await c.query<{ id: string }>(
      `INSERT INTO organizations (code, country, org_type, parent_id)
       VALUES ($1, 'KR', 'company', NULL)
       ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
      [VENDOR_CODE],
    );
    const orgId = org.rows[0].id;
    await c.query(
      `INSERT INTO translations (table_name, row_id, lang, field, value)
       VALUES ('organizations', $1, 'ko', 'name', '운영사')
       ON CONFLICT (table_name, row_id, lang, field) DO NOTHING`,
      [orgId],
    );

    const found = await c.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
    let userId = found.rows[0]?.id;
    const created = !userId;
    if (!userId) {
      // must_reset_pw 를 켜지 않는다. 여기서 정한 비밀번호를 본인이 직접 넣었다
      const r = await c.query<{ id: string }>(
        `INSERT INTO users (email, display_name, password_hash, must_reset_pw)
         VALUES ($1, $2, $3, false) RETURNING id`,
        [email, name, await hashPassword(pw)],
      );
      userId = r.rows[0].id;
    }

    const m = await c.query(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'superadmin')
       ON CONFLICT (user_id, org_id, role) DO NOTHING
       RETURNING id`,
      [userId, orgId],
    );
    return { created, promoted: m.rowCount === 1 };
  });

  if (created) console.log(`계정을 만들었습니다: ${email}`);
  else console.log(`이미 있는 계정입니다: ${email} (비밀번호는 그대로 두었습니다)`);
  console.log(promoted ? "운영사 관리자 권한을 붙였습니다." : "이미 운영사 관리자였습니다.");
  console.log("이제 /login 으로 들어가 /admin/prices 에서 수수료를 확인하세요.");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
