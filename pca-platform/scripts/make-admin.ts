/**
 * 운영자 계정을 하나 만든다.
 *
 * **운영에 시드를 붓지 않는다.** `db:seed` 는 눌러 볼 계정과 시연
 * 기관과 가짜 응시를 함께 넣어서, 운영에 들어가면 첫 손님이 그 숫자 뒤에
 * 숨는다. 운영에 필요한 사람은 **처음 들어갈 운영자 하나뿐**이다.
 *
 *   DATABASE_URL=... npx tsx scripts/make-admin.ts admin ops@example.com 박운영
 *
 * 비밀번호는 **여기서 만들어 한 번만 보여 준다.** 임시 비밀번호를
 * 저장하지 않는 규칙과 같다: 해시만 남고, 잃어버리면 다시 만든다.
 */
import { randomBytes } from "node:crypto";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

async function main() {
  const [loginId, email, name] = process.argv.slice(2);
  if (!loginId || !email || !name) {
    console.error("쓰임: npx tsx scripts/make-admin.ts <아이디> <이메일> <이름>");
    process.exit(2);
  }

  /* 사람이 옮겨 적을 수 있는 글자만 쓴다. 헷갈리는 0·O·1·l 을 뺀다 */
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const pw = Array.from(randomBytes(20)).map((b) => ALPHA[b % ALPHA.length]).join("");

  const hash = await hashPassword(pw);
  const u = await queryOne<{ id: string; is_demo: boolean }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, must_reset_pw)
     VALUES ($1, $2, $3, $4, 'active', false)
     ON CONFLICT (login_id) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           display_name  = EXCLUDED.display_name,
           email         = EXCLUDED.email
     RETURNING id::text, is_demo`,
    [loginId, email, name, hash],
  );
  if (!u) throw new Error("계정을 만들지 못했습니다.");

  /* **운영자를 시연으로 표시하지 않는다.** 들어올 때 보는 트리거가
     아이디 모양만 보고 표시할 수 있으므로, 여기서 한 번 되돌린다 */
  if (u.is_demo) {
    await query(`UPDATE users SET is_demo = false WHERE id = $1`, [u.id]);
  }

  /* 운영사 조직 한 줄과 권한. 없으면 만든다.
   *
   * **칸 이름을 표에서 확인하고 적는다.** 여기가 한동안 `name_key` ·
   * `type` · `role_code` · `status` 를 쓰고 있었는데 `organizations` 에는
   * `name` 과 `org_type` 이, `memberships` 에는 `role` 만 있다. 그래서
   * 계정은 만들어지고 **권한만 조용히 안 붙었다**: 들어가지는데 운영
   * 화면이 전부 막힌 상태라, 받은 사람은 비밀번호를 의심한다. */
  const org = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type, status, name)
     VALUES ('VENDOR', 'KR', 'company', 'active', '커리어메트리 운영사')
     ON CONFLICT (code) DO UPDATE SET status = 'active'
     RETURNING id::text`,
  );
  if (org) {
    await query(
      `INSERT INTO memberships (user_id, org_id, role)
       VALUES ($1, $2, 'superadmin')
       ON CONFLICT (user_id, org_id, role) DO NOTHING`,
      [u.id, org.id],
    );
    /* 화면이 이름을 번역표에서 읽는 자리가 있다. 코드가 찍히지 않게 둘 다 적는다 */
    for (const [lang, value] of [["ko", "커리어메트리 운영사"], ["en", "CareerMatri"]] as const) {
      await query(
        `INSERT INTO translations (table_name, row_id, lang, field, value)
         VALUES ('organizations', $1, $2, 'name', $3)
         ON CONFLICT (table_name, row_id, lang, field) DO NOTHING`,
        [org.id, lang, value],
      ).catch(() => null);
    }
  }

  console.log(`\n운영자 계정을 만들었습니다.\n`);
  console.log(`  권한      ${org ? "superadmin" : "**못 붙였습니다**"}`);
  console.log(`  아이디    ${loginId}`);
  console.log(`  비밀번호  ${pw}`);
  console.log(`\n**이 비밀번호는 다시 보여 주지 않습니다.** 들어가신 뒤 바꾸십시오.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
