/**
 * **학교(기관) 한 줄과 담당자 하나.** 운영에서 사람이 한 번 치는 자리다.
 *
 *   npm run pcu:org                                  배재대를 읽기만 한다
 *   UNI=KU npm run pcu:org                           고려대를 읽기만 한다
 *   UNI=KU APPLY=yes npm run pcu:org                 고려대 기관과 담당자(ku_admin)를 만든다
 *   UNI=KU APPLY=yes npm run pcu:org <아이디> <이메일> <이름>   이름을 정해 만든다
 *
 * 학교 코드와 이름은 학교 등록부(`campus-universities.json`)에서 읽는다.
 * 등록부에 없는 코드는 받지 않는다: 등록부에 없는 기관 줄은 학생 화면과
 * 이어지지 않는다.
 *
 * 학생 흐름은 기관 줄이 없어도 돈다(`/campus/pcu` 로 들어온 응시는
 * `v3_attempts.university_code` 로 묶인다). 기관 줄이 필요한 쪽은 담당자
 * 화면이고, `organizations.code` 가 `PCU` 여야 그 학생들이 잡힌다. 없으면
 * 담당자가 빈 화면을 보고 **`아직 아무도 안 쳤다` 로 읽는다.**
 *
 * ## 이 스크립트가 지키는 것
 *
 * **기본은 읽기다.** `APPLY=yes` 가 없으면 한 줄도 쓰지 않고 지금 상태와
 * 할 일만 적는다. 운영에 붙은 창에서 실수로 엔터를 치는 자리라 그렇게 둔다.
 *
 * **열쇠는 그 자리에서 만들어 한 번만 보여 준다.** 해시만 남고, 잃어버리면
 * 다시 만든다. 저장소에도 로그에도 적지 않는다.
 *
 * **이미 있는 담당자의 열쇠를 조용히 바꾸지 않는다.** 두 번째로 돌리는
 * 사람은 보통 기관 줄만 다시 보려는 것인데, 그때 비밀번호가 갈리면 **어제
 * 받아 간 사람이 그 자리에서 잠긴다.** 바꾸려면 `ROTATE=yes` 를 함께 준다.
 *
 * **기관을 시연으로 표시하지 않는다.** 사람을 만드는 자리가 스무 곳이 넘어
 * 트리거가 아이디 모양만 보고 표시할 수 있다. 그 자리는 운영 지표에서
 * 걸러지므로 담당자 화면의 수가 비어 보인다.
 */
import { randomBytes } from "node:crypto";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { university } from "../src/lib/campus/registry";

const CODE = (process.env.UNI ?? "PCU").trim().toUpperCase();
const REG = university(CODE);
if (!REG) {
  console.error(`학교 등록부에 ${CODE} 가 없습니다. UNI 를 확인해 주세요.`);
  process.exit(2);
}
const NAME = REG.university_name;
/* 기관(진흥원 등)은 공공기관으로 적는다. 학교 진입 흐름은 이 칸을 읽지 않는다 */
const ORG_TYPE = REG.org_kind === "agency" ? "public_institution" : "university";
const LC = CODE.toLowerCase();

type Org = { id: string; name: string | null; status: string; is_demo: boolean };

async function readNow(): Promise<{ org: Org | null; admins: number }> {
  const org = await queryOne<Org>(
    `SELECT id::text, name, status, is_demo FROM organizations WHERE code = $1`,
    [CODE],
  );
  if (!org) return { org: null, admins: 0 };
  const n = await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM memberships
      WHERE org_id = $1::bigint AND role = 'org_admin'`,
    [org.id],
  );
  return { org, admins: Number(n?.n ?? 0) };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 이 없습니다.");
    process.exit(2);
  }
  const apply = (process.env.APPLY ?? "").toLowerCase() === "yes";
  const rotate = (process.env.ROTATE ?? "").toLowerCase() === "yes";
  const [argId, argEmail, argName] = process.argv.slice(2);
  /* 아이디를 안 주면 `<코드>_admin` 으로 만든다(배재대가 쓰는 `pcu_admin` 과 같은 꼴) */
  const loginId = argId || `${LC}_admin`;
  const email = argEmail || `${LC}-admin@careermatri.invalid`;
  const display = argName || `${NAME} 담당자`;

  const before = await readNow();
  console.log(`\n── ${NAME}(${CODE}) 기관과 담당자 (${apply ? "만든다" : "읽기만"})\n`);
  console.log(`  기관    ${before.org
    ? `있다 (${before.org.name ?? "이름 없음"} · ${before.org.status}`
      + `${before.org.is_demo ? " · 시연" : ""})`
    : "없다"}`);
  console.log(`  담당자  ${before.admins}명\n`);

  if (!apply) {
    if (before.org && before.admins > 0) {
      console.log("  할 일 없음. 담당자 화면이 학교 진입 응시를 집계합니다.\n");
      process.exit(0);
    }
    console.log("  만들려면:");
    console.log(`    UNI=${CODE} APPLY=yes npm run pcu:org            (아이디 ${LC}_admin)`);
    console.log(`    UNI=${CODE} APPLY=yes npm run pcu:org <아이디> <이메일> <이름>\n`);
    process.exit(0);
  }

  if (!loginId || !email || !display) {
    console.error("쓰임: APPLY=yes npm run pcu:org <아이디> <이메일> <이름>");
    process.exit(2);
  }

  /* ── 기관 한 줄 ─────────────────────────────────────────── */
  const org = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type, status, name,
                                language, is_demo)
     VALUES ($1, 'KR', $3, 'active', $2, 'ko', FALSE)
     ON CONFLICT (code) DO UPDATE SET status = 'active'
     RETURNING id::text`,
    [CODE, NAME, ORG_TYPE],
  );
  if (!org) throw new Error("기관 줄을 만들지 못했습니다.");

  /* 트리거나 옛 줄이 시연으로 표시해 두었으면 여기서 내린다 */
  const demoted = await query(
    `UPDATE organizations SET is_demo = FALSE
      WHERE id = $1::bigint AND is_demo RETURNING id`,
    [org.id],
  );
  if (demoted.length) console.log("  적어둠  기관의 시연 표시를 내렸습니다.");

  /**
   * 화면이 이름을 번역표에서 읽는 자리가 있다. 코드가 찍히지 않게 적는다.
   *
   * **`row_id` 는 `BIGINT` 다.** 글자로 넘기면 `operator does not exist:
   * bigint = text` 로 거절되는데, 그 줄을 조용히 삼키면 **번역이 한 줄도
   * 안 들어간 채로 통과한다.** 못 적었으면 까닭을 적고 넘어간다: 기관 줄과
   * 담당자가 이 줄 때문에 막히면 담당자가 아예 못 들어온다.
   */
  try {
    await query(
      `INSERT INTO translations (table_name, row_id, lang, field, value)
       VALUES ('organizations', $1::bigint, 'ko', 'name', $2)
       ON CONFLICT (table_name, row_id, lang, field) DO NOTHING`,
      [org.id, NAME],
    );
  } catch (e) {
    console.log(`  적어둠  기관 이름 번역을 못 적었습니다 `
      + `(${String(e).slice(0, 80)}). 화면에 코드가 찍힐 수 있습니다.`);
  }

  /* ── 담당자 하나 ────────────────────────────────────────── */
  const had = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [loginId]);
  if (had && !rotate) {
    console.log(`\n  기관 줄은 섰습니다. **그 아이디는 이미 있습니다.**`);
    console.log(`  열쇠를 새로 만들려면 ROTATE=yes 를 함께 주십시오.`);
    console.log(`  (주지 않는 까닭: 어제 받아 간 사람이 그 자리에서 잠깁니다)\n`);
    process.exit(0);
  }

  /* 사람이 옮겨 적을 수 있는 글자만 쓴다. 헷갈리는 0·O·1·l 을 뺀다 */
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const pw = Array.from(randomBytes(20))
    .map((b) => ALPHA[b % ALPHA.length]).join("");

  const user = await queryOne<{ id: string; is_demo: boolean }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, must_reset_pw)
     VALUES ($1, $2, $3, $4, 'active', 'ko', FALSE)
     ON CONFLICT (login_id) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           display_name  = EXCLUDED.display_name,
           email         = EXCLUDED.email
     RETURNING id::text, is_demo`,
    [loginId, email, display, await hashPassword(pw)],
  );
  if (!user) throw new Error("담당자 계정을 만들지 못했습니다.");
  if (user.is_demo) {
    await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`,
      [user.id]);
  }

  await query(
    `INSERT INTO memberships (user_id, org_id, role)
     VALUES ($1::bigint, $2::bigint, 'org_admin')
     ON CONFLICT (user_id, org_id, role) DO NOTHING`,
    [user.id, org.id],
  );

  /* ── 다시 읽어서 적는다 ─────────────────────────────────── */
  const after = await readNow();
  console.log(`\n  기관      ${after.org?.name ?? "**없다**"}`
    + ` (${after.org?.status ?? "?"}${after.org?.is_demo ? " · 시연" : ""})`);
  console.log(`  권한      ${after.admins > 0 ? "org_admin" : "**못 붙였습니다**"}`);
  console.log(`  아이디    ${loginId}`);
  console.log(`  비밀번호  ${pw}`);
  console.log(`\n**이 비밀번호는 다시 보여 주지 않습니다.** 들어가신 뒤 바꾸십시오.`);
  console.log(`담당자 화면: /org/v3\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
