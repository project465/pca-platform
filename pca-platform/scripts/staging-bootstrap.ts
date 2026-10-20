/**
 * **Staging 배포본을 사람이 바로 눌러 볼 수 있는 상태로 세운다.** Railway 의
 * staging 서비스 Shell 에서 한 번 치는 자리다.
 *
 *   npm run staging:bootstrap                 # 읽고 · 세우고 · 열쇠를 한 번 보여 준다(배재대)
 *   UNI=ALL npm run staging:bootstrap         # 등록부의 학교 전부(고려대 · 전주대 · 진흥원 포함)
 *   UNI=KU,JJU npm run staging:bootstrap      # 고른 학교만
 *   STUDENTS=2 npm run staging:bootstrap      # 전공마다 학생 둘
 *   CORES=BIZ_CORE_V1,CS_CORE_V1 npm run staging:bootstrap
 *   ROTATE=yes npm run staging:bootstrap      # 이미 있는 시험 계정의 열쇠를 새로 낸다
 *   SKIP_DB=yes npm run staging:bootstrap     # 스키마는 건너뛴다 (이미 올렸을 때)
 *
 * ## 이 스크립트가 지키는 것
 *
 * **운영에서는 돌지 않는다.** `APP_ENV` 가 `staging` 이 아니면 한 줄도 쓰지
 * 않고 멈춘다. 시험 계정과 기관 줄을 운영 DB 에 만드는 길을 코드에 두지
 * 않는다(`mockPaymentsAllowed()` 가 운영에서 문을 아예 없앤 것과 같은 까닭).
 *
 * **열쇠는 그 자리에서 만들어 한 번만 보여 준다.** 해시만 남고 파일로도
 * 로그로도 남기지 않는다. 다시 보려면 `ROTATE=yes` 로 새로 낸다.
 *
 * **이미 있는 것은 덮지 않는다.** 두 번째로 돌리는 사람은 보통 상태를 다시
 * 보려는 것이고, 그때 열쇠가 갈리면 어제 받아 간 사람이 잠긴다.
 *
 * **제품이 쓰는 함수로 만든다.** 기관 줄은 `pcu:org` 와 같은 SQL 이고 학생은
 * `pcu:students` 와 같은 `provisionStudent` 다. 따로 만들면 담당자 화면이
 * 그 학생을 세지 못하는 날이 온다.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { query, queryOne } from "../src/lib/db";
import { appEnv, stagingGate } from "../src/lib/env";
import { hashPassword } from "../src/lib/password";
import { checkStudent, provisionStudent } from "../src/lib/campus/students";
import {
  allLeaves, campusRegistry, campusWords, coreOf, statusOf, university,
} from "../src/lib/campus/registry";
import { core as coreEntry, previewOpenCores, sellableCores } from "../src/lib/me-v3/core-registry";

/* 세울 학교. `UNI=KU` 하나, `UNI=PCU,KU` 여럿, `UNI=ALL` 이면 등록부의 학교 전부다 */
const UNIS_RAW = (process.env.UNI ?? "PCU").trim().toUpperCase();
const UNIS = UNIS_RAW === "ALL"
  ? campusRegistry().universities.map((x) => x.university_code)
  : UNIS_RAW.split(",").map((x) => x.trim()).filter(Boolean);
/* 학교마다 담당자 아이디는 `<코드>_admin` 이다. 배재대는 전부터 `pcu_admin`
   이고 `ADMIN_ID` 로 덮을 수 있다(학교 하나를 세울 때만) */
const adminIdOf = (uni: string): string =>
  (UNIS.length === 1 && process.env.ADMIN_ID) || `${uni.toLowerCase()}_admin`;
const adminEmailOf = (uni: string): string =>
  (UNIS.length === 1 && process.env.ADMIN_EMAIL) || `${uni.toLowerCase()}-admin@staging.invalid`;
/* 시험 학생 아이디. 배재대는 전부터 `test-biz-01` 이고, 다른 학교는 학교
   코드를 붙인다(`test-ku-biz-01`). 아이디는 전체에서 하나라 겹치면 안 된다 */
const testLoginOf = (uni: string, short: string, i: number): string =>
  `test-${uni === "PCU" ? "" : `${uni.toLowerCase()}-`}${short}-${String(i).padStart(2, "0")}`;
const ROTATE = (process.env.ROTATE ?? "").toLowerCase() === "yes";
const SKIP_DB = (process.env.SKIP_DB ?? "").toLowerCase() === "yes";
const PER_CORE = Math.max(1, Math.min(5, Number(process.env.STUDENTS ?? 1) || 1));
const DEFAULT_CORES = [
  "BIZ_CORE_V1", "CS_CORE_V1", "EE_CORE_V1", "NURSING_CORE_V1",
  "PUBADM_CORE_V1", "MEDIA_CORE_V1",
];
const CORES = (process.env.CORES ?? DEFAULT_CORES.join(","))
  .split(",").map((s) => s.trim()).filter(Boolean);

/* 사람이 옮겨 적을 수 있는 글자만 쓴다. 헷갈리는 0·O·1·l 을 뺀다 */
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const freshPw = (n = 14): string =>
  Array.from(randomBytes(n)).map((b) => ALPHA[b % ALPHA.length]).join("");

type Cred = { role: string; login: string; pw: string | null; where: string; note: string };

function sh(cmd: string, args: string[]): void {
  execFileSync(cmd, args, { stdio: "inherit", env: process.env });
}

async function stepDb(): Promise<void> {
  if (SKIP_DB) { console.log("  (SKIP_DB) 스키마는 건너뛴다"); return; }
  const have = Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM information_schema.tables WHERE table_schema = 'public'`))?.n ?? 0);
  /* 컨테이너에서는 /app/ops, 저장소에서는 scripts/ 다. 둘 다 같은 db-chain.json 을 읽는다 */
  const dir = existsSync("ops/db-upgrade.sh") ? "ops" : "scripts";
  if (have === 0) {
    console.log(`  빈 DB 다 — ${dir}/db-init.sh`);
    sh("bash", [`${dir}/db-init.sh`]);
  } else {
    console.log(`  표 ${have}개 — ${dir}/db-upgrade.sh`);
    sh("bash", [`${dir}/db-upgrade.sh`]);
  }
}

async function stepOrg(UNI: string, creds: Cred[]): Promise<string> {
  const reg = university(UNI);
  if (!reg) throw new Error(`등록부에 ${UNI} 가 없다`);
  const UNI_NAME = reg.university_name;
  const ADMIN_ID = adminIdOf(UNI);
  const ADMIN_EMAIL = adminEmailOf(UNI);
  const words = campusWords(reg);
  const org = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type, status, name, language, is_demo)
     VALUES ($1, 'KR', $3, 'active', $2, 'ko', FALSE)
     ON CONFLICT (code) DO UPDATE SET status = 'active', is_demo = FALSE
     RETURNING id::text`,
    [UNI, UNI_NAME, reg.org_kind === "agency" ? "public_institution" : "university"]);
  if (!org) throw new Error("기관 줄을 만들지 못했다");
  await query(
    `INSERT INTO translations (table_name, row_id, lang, field, value)
     VALUES ('organizations', $1::bigint, 'ko', 'name', $2)
     ON CONFLICT (table_name, row_id, lang, field) DO NOTHING`, [org.id, UNI_NAME])
    .catch((e) => console.log(`  적어둠  기관 이름 번역을 못 적었다 (${String(e).slice(0, 60)})`));
  console.log(`  기관    ${UNI_NAME} (${UNI}) · 줄 ${org.id}`);

  const had = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id = $1`, [ADMIN_ID]);
  let pw: string | null = null;
  if (!had || ROTATE) {
    pw = freshPw(16);
    const u = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, must_reset_pw, is_demo)
       VALUES ($1, $2, $4, $3, 'active', 'ko', FALSE, FALSE)
       ON CONFLICT (login_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
       RETURNING id::text`,
      [ADMIN_ID, ADMIN_EMAIL, await hashPassword(pw), `${words.staff} (시험)`]);
    if (!u) throw new Error("담당자 계정을 만들지 못했다");
    await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [u.id]);
    await query(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint, $2::bigint, 'org_admin')
       ON CONFLICT (user_id, org_id, role) DO NOTHING`, [u.id, org.id]);
  } else {
    await query(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint, $2::bigint, 'org_admin')
       ON CONFLICT (user_id, org_id, role) DO NOTHING`, [had.id, org.id]);
  }
  creds.push({
    role: `${UNI} 담당자`, login: ADMIN_ID, pw, where: "/login",
    note: pw ? "지금 한 번만 보인다" : "이미 있다 · 열쇠는 그대로 (ROTATE=yes 로 새로)",
  });
  return org.id;
}

async function stepStudents(UNI: string, orgId: string, creds: Cred[]): Promise<void> {
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없다`);
  const UNI_NAME = u.university_name;
  const leaves = allLeaves(u).filter((r) => r.catalog.default_for_unknown);
  for (const code of CORES) {
    let entry: { name_ko: string } | null = null;
    try { entry = coreEntry(code); } catch { /* 없는 Core */ }
    if (!entry) { console.log(`  걸림   ${code} — 등록부에 없는 Core 다`); continue; }
    const seat = leaves.find((r) => coreOf(r.leaf)?.code === code && statusOf(u, r) === "READY")
      ?? leaves.find((r) => coreOf(r.leaf)?.code === code);
    if (!seat) { console.log(`  걸림   ${code} — ${UNI_NAME} 에 이 Core 를 가리키는 자리가 없다`); continue; }
    const ready = statusOf(u, seat) === "READY";
    const short = code.replace(/_CORE_V\d+$/, "").toLowerCase();
    for (let i = 1; i <= PER_CORE; i += 1) {
      const login = testLoginOf(UNI, short, i);
      const checked = checkStudent(UNI, {
        student_id: login, login_id: login, name: `시험 학생 ${entry.name_ko} ${i}`, email: null,
        college_code: seat.college.code, department_code: seat.leaf.code,
      });
      if (!checked.ok) { console.log(`  걸림   ${login} — ${checked.why}`); continue; }
      let made;
      try {
        made = await provisionStudent(orgId, checked.value, { rotate: ROTATE });
      } catch (e) {
        console.log(`  걸림   ${login} — ${(e as Error).message}`); continue;
      }
      creds.push({
        role: `${UNI} 학생`, login, pw: made.password,
        where: `/campus/${UNI.toLowerCase()}/login`,
        note: `${seat.leaf.name} (${entry.name_ko})`
          + (ready ? "" : " · **아직 학생에게 닫혀 있다** — V3_PREVIEW_OPEN 을 확인")
          + (made.password ? "" : " · 이미 있다 (ROTATE=yes 로 새 열쇠)"),
      });
    }
  }
}

async function main(): Promise<void> {
  const env = appEnv();
  console.log(`\n── Staging 세우기 (APP_ENV=${env})\n`);
  if (env !== "staging") {
    console.error(`  멈춤  APP_ENV 가 staging 이 아니다 (${env}). 시험 계정과 기관 줄은 staging 에만 만든다.`);
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) { console.error("  멈춤  DATABASE_URL 이 없다"); process.exit(2); }

  /* 1. 배포본 설정 */
  const base = (process.env.PLATFORM_URL ?? "").replace(/\/$/, "");
  const gate = stagingGate();
  const preview = previewOpenCores();
  const sellable = sellableCores("KR").map((c) => c.code);
  console.log(`  주소    ${base || "(PLATFORM_URL 이 비어 있다 — Railway 가 만든 도메인을 넣는다)"}`);
  console.log(`  자물쇠  ${gate ? `있다 (아이디 ${gate.user})` : "**없다** — STAGING_BASIC_AUTH 를 넣지 않으면 누구에게나 열린다"}`);
  console.log(`  미리보기 Core  ${preview.length ? preview.join(" · ") : "(없음 — V3_PREVIEW_OPEN 이 비어 있다. 기본으로 열린 Core 만 응시할 수 있다)"}`);
  console.log(`  응시할 수 있는 Core  ${sellable.length}개`);

  /* 2. 스키마 */
  console.log("\n── DB");
  await stepDb();

  /* 3. 기관 · 담당자 · 학생 */
  const creds: Cred[] = [];
  for (const uni of UNIS) {
    const reg = university(uni);
    if (!reg) { console.log(`\n  걸림   등록부에 ${uni} 가 없다 — 건너뛴다`); continue; }
    console.log(`\n── ${reg.university_name}(${uni}) 기관과 담당자`);
    const orgId = await stepOrg(uni, creds);
    console.log(`\n── ${reg.university_name} 시험 학생 (전공마다)`);
    await stepStudents(uni, orgId, creds);
  }

  /* 4. 한 번만 보여 준다 */
  console.log("\n── 접속 정보 (이 화면에서만 보인다 · 어디에도 적히지 않는다)\n");
  const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - [...s].length));
  console.log(`  ${pad("역할", 10)}${pad("아이디", 18)}${pad("비밀번호", 18)}${pad("들어가는 곳", 58)}비고`);
  for (const c of creds) {
    console.log(`  ${pad(c.role, 10)}${pad(c.login, 18)}${pad(c.pw ?? "(그대로)", 18)}${pad(base + c.where, 58)}${c.note}`);
  }
  if (gate) console.log(`\n  먼저 브라우저가 묻는 자물쇠: 아이디 ${gate.user} · 비밀번호는 Railway 변수 STAGING_BASIC_AUTH 의 콜론 뒤`);
  console.log(`\n  다음: 학생 아이디로 ${UNIS.map((x) => `${base}/campus/${x.toLowerCase()}/login`).join(" · ")} 에 들어가 검사 → 결과 → PDF → 경험 추가까지 누른다.`);
  console.log(`        담당자 아이디로 ${base}/org/v3 에서 집계가 서는지 본다.\n`);
  process.exit(0);
}
void main().catch((e) => { console.error(e); process.exit(1); });
