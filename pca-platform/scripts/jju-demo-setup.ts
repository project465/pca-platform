/**
 * 전주대학교 부트캠프 **시연 자료**를 이 DB 에 세운다.
 *
 * 만드는 것: 기관 한 줄(`JJU`) · 사업단 담당자 하나 · 1기 트랙마다 합성
 * 학생 셋 · 2기 트랙마다 아직 시작하지 않은 합성 학생 하나 · 1기 학생의
 * 응시를 **제품과 같은 길로** 끝까지 채우고 제출한다(문항을 지어내지 않고
 * 사람 셋의 규칙으로 답한다 · `_v3-answer.ts`).
 *
 * **다른 기관의 학생 자료를 쓰지 않는다.** 응시를 다른 사람 것에서 베끼지
 * 않고(`cloneFinished` 를 쓰지 않는다) 이 학생들이 직접 푼다.
 *
 * **운영에서 돌지 않는다.** `APP_ENV=production` 이면 한 줄도 쓰지 않고
 * 멈추고, DB 주소가 이 기계가 아니면 `JJU_DEMO_REMOTE=yes` 없이 멈춘다
 * (시연용 staging DB 를 따로 세웠을 때만 그 값을 준다).
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json \
 *   V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1 \
 *   APPLY=yes npx tsx scripts/jju-demo-setup.ts
 *
 * `V3_PREVIEW_OPEN` 이 없으면 컴퓨터·전기전자 트랙 학생은 계정만 만들고
 * 응시를 열지 않는다: 그 검사는 학생에게 닫혀 있어 학교 맥락이 통째로
 * 버려지고, 그러면 기계공학으로 열린 응시가 그 트랙 줄에 서게 된다.
 */
import { loadEnv } from "./_loop-fixture";
loadEnv();

/* eslint-disable import/first */
import { randomBytes } from "node:crypto";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { appEnv } from "../src/lib/env";
import { sellableCores } from "../src/lib/me-v3/core-registry";
import { checkStudent, provisionStudent } from "../src/lib/campus/students";
import { assertLoginFree } from "../src/lib/jju/login-guard";
import { attemptOf, openAttempt, submit } from "../src/lib/me-v3/runtime/session";
import type { V3Attempt } from "../src/lib/me-v3/runtime/session";
import { answerAll, PEOPLE } from "./_v3-answer";
import { cohortsOf, JJU_CODE, jjuUniversity, tracksOf } from "../src/lib/jju/program";

const ORG_NAME = "전주대학교 (시연)";
const ADMIN = "jju-admin";

function local(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "127.0.0.1" || h === "localhost" || h === "";
  } catch { return false; }
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) { console.error("DATABASE_URL 이 없습니다."); process.exit(2); }
  if (appEnv() === "production") {
    console.error("APP_ENV=production 입니다. 시연 자료를 운영에 넣지 않습니다.");
    process.exit(2);
  }
  if (!local(url) && (process.env.JJU_DEMO_REMOTE ?? "") !== "yes") {
    console.error("이 기계의 DB 가 아닙니다. 시연 전용 DB 면 JJU_DEMO_REMOTE=yes 를 주십시오.");
    process.exit(2);
  }
  const u = jjuUniversity();
  if (!u) {
    throw new Error("등록부에 JJU 가 없습니다. V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json 을 주십시오.");
  }
  const apply = (process.env.APPLY ?? "").toLowerCase() === "yes";
  const tracks = tracksOf(u);
  const open = new Set(sellableCores(u.market_code).map((c) => c.code));
  const [first] = cohortsOf(u);

  console.log(`\n── 전주대 시연 자료 (${apply ? "만든다" : "읽기만"})\n`);
  for (const t of tracks) {
    console.log(`  ${t.cohort.label.padEnd(16)} ${t.short.padEnd(14)} `
      + `${t.core_code ?? "-"} ${open.has(t.core_code ?? "") ? "열림" : "닫힘"}`);
  }
  if (!apply) { console.log("\n  만들려면 APPLY=yes 를 주십시오.\n"); process.exit(0); }

  /* ── 기관 ─────────────────────────────────────────────── */
  const org = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type, status, name, language, is_demo)
     VALUES ($1, 'KR', 'university', 'active', $2, 'ko', FALSE)
     ON CONFLICT (code) DO UPDATE SET status = 'active', name = EXCLUDED.name
     RETURNING id::text`, [JJU_CODE, ORG_NAME]);
  if (!org) throw new Error("기관 줄을 만들지 못했습니다.");
  /* 담당자 화면은 시연 표시가 붙은 기관을 거르므로 내린다. **이 DB 는
     시연 전용이다**: 위에서 운영과 원격 DB 를 막았다 */
  await query(`UPDATE organizations SET is_demo = FALSE WHERE id = $1::bigint`, [org.id]);
  await query(
    `INSERT INTO translations (table_name, row_id, lang, field, value)
     VALUES ('organizations', $1::bigint, 'ko', 'name', $2)
     ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
    [org.id, ORG_NAME]).catch((e) => console.log(`  적어둠  번역 줄 (${String(e).slice(0, 60)})`));

  /* ── 담당자 ───────────────────────────────────────────── */
  const pw = randomBytes(15).toString("base64url");
  const admin = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, must_reset_pw)
     VALUES ($1, NULL, '사업단 담당자(시연)', $2, 'active', 'ko', FALSE)
     ON CONFLICT (login_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id::text`, [ADMIN, await hashPassword(pw)]);
  if (!admin) throw new Error("담당자 계정을 만들지 못했습니다.");
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [admin.id]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint, $2::bigint, 'org_admin')
     ON CONFLICT (user_id, org_id, role) DO NOTHING`, [admin.id, org.id]);

  /* ── 학생과 응시 ───────────────────────────────────────── */
  const made: { login: string; pw: string; track: string; state: string }[] = [];
  let seq = 0;
  for (const t of tracks) {
    const isFirst = t.cohort.code === first?.catalog_code;
    const n = isFirst ? 3 : 1;
    for (let i = 0; i < n; i += 1) {
      seq += 1;
      const sid = `D${String(seq).padStart(3, "0")}`;
      const login = `jju-demo-${sid.toLowerCase()}`;
      const checked = checkStudent(JJU_CODE, {
        student_id: sid, name: `시연학생 ${String(seq).padStart(2, "0")}`,
        login_id: login, department_code: t.code,
      });
      if (!checked.ok) throw new Error(`${login}: ${checked.why}`);
      await assertLoginFree(login, JJU_CODE);
      const got = await provisionStudent(org.id, checked.value, { rotate: true });
      let state = "미응시";
      const hasAttempt = await queryOne<{ n: string }>(
        `SELECT count(*)::text n FROM v3_attempts WHERE user_id = $1::bigint`, [got.userId]);
      const canOpen = open.has(t.core_code ?? "");
      if (isFirst && canOpen && Number(hasAttempt?.n ?? 0) === 0) {
        const a0 = await openAttempt({
          userId: got.userId, tier: "PRO", stage: "bachelor", gradField: null,
          campus: checked.value.ctx,
        });
        if (a0.core_code !== t.core_code) {
          throw new Error(`${login}: 응시가 ${a0.core_code} 로 열렸습니다(트랙은 ${t.core_code})`);
        }
        const pol = PEOPLE[i % PEOPLE.length];
        await answerAll(a0.core_code, a0, got.userId, pol);
        /* 트랙마다 한 사람은 푸는 중으로 남긴다: 사업단 화면의 `진행 중` 이
           실제로 서는지 보려는 것이다 */
        if (i < 2) {
          const a = (await attemptOf(a0.id, got.userId)) as V3Attempt;
          await submit(a);
          state = `완료 (사람 ${pol.id})`;
        } else {
          state = "진행 중";
        }
      } else if (isFirst && !canOpen) {
        state = "계정만 (검사 닫힘 · V3_PREVIEW_OPEN 필요)";
      } else if (Number(hasAttempt?.n ?? 0) > 0) {
        state = "이미 응시 있음";
      }
      made.push({ login, pw: got.password ?? "(그대로)", track: `${t.cohort.label} ${t.short}`, state });
    }
  }

  console.log("\n  사업단 담당자");
  console.log(`    아이디   ${ADMIN}`);
  console.log(`    비밀번호 ${pw}`);
  console.log("    화면     /jju/admin");
  console.log("\n  합성 학생");
  for (const m of made) {
    console.log(`    ${m.login.padEnd(16)} ${m.pw.padEnd(14)} ${m.track.padEnd(28)} ${m.state}`);
  }
  console.log("\n**이 비밀번호는 다시 보여 주지 않습니다.** 시연 DB 에만 쓰십시오.\n");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
