/**
 * 탈퇴(익명화)가 **지금 검사와 작업공간의 자료까지** 지우는지 센다.
 *
 *   npx tsx scripts/erasure-check.ts      (로컬 DB 에서만 돈다)
 *
 * 한동안 파기 목록이 옛 검사(ME_V1)의 표만 들고 있었다. 지금 검사로 적은
 * 경험 · 지원한 곳 · 지원서·면접 답 · 매트 메모 · 학번이 탈퇴한
 * 뒤에도 남았고, **그 사실을 세는 검사가 없었다.** `erasure.ts` 주석은
 * `erasure:check` 가 센다고 적고 있었는데 그 명령이 없었다.
 *
 * 세는 것.
 *   1. `user_id` 를 든 표가 전부 어느 목록(지움 · 칸 비움 · 남김)에 있다
 *   2. 지우는 표가 전부 DB 에 있다(없으면 파기 거래가 통째로 멈춘다)
 *   3. 지우는 표가 전부 탈퇴 화면의 묶음에 적혀 있다(보여 주는 것과 하는 것이 같다)
 *   4. 지금 검사를 마친 학생 한 사람의 자료가 실제로 지워지고, 응시는 남는다
 *   5. 자유입력 칸(검사 중 한 줄 · 메일 주소)이 비워진다
 *   6. 두 번 돌려도 탈이 없다
 */
import { query, queryOne } from "../src/lib/db";
import {
  anonymizeUser, erasurePlan, ERASE_GROUPS, KEEP_GROUPS, LEFT_AS_IS,
} from "../src/lib/erasure";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/127\.0\.0\.1|localhost|^postgres(ql)?:\/\/\//.test(URL_)) {
  console.error("로컬 DB 가 아니다"); process.exit(2);
}

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, note = "") => {
  if (cond) pass += 1; else fail += 1;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${note ? ` — ${note}` : ""}`);
};
const n = async (sql: string, p: unknown[]) => (await queryOne<{ n: number }>(sql, p))!.n;

async function main() {
  const plan = erasurePlan();
  const remove = new Set(plan.remove.map((r) => r.table));
  const keep = new Set(Object.keys(plan.keep));
  const left = new Set(Object.keys(LEFT_AS_IS));

  /* 1 · 2 */
  const withUser = (await query<{ t: string }>(
    `SELECT c.table_name AS t FROM information_schema.columns c
       JOIN information_schema.tables t USING (table_schema, table_name)
      WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'user_id' ORDER BY 1`, [])).map((r) => r.t);
  const loose = withUser.filter((t) => !remove.has(t) && !keep.has(t) && !left.has(t));
  ok("user_id 를 든 표가 전부 어느 목록에 있다", loose.length === 0,
     loose.length ? loose.join(" · ") : `${withUser.length}개`);
  const exists = new Set((await query<{ t: string }>(
    `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'public'`, []))
    .map((r) => r.t));
  const ghost = [...remove].filter((t) => !exists.has(t));
  ok("지우는 표가 전부 DB 에 있다", ghost.length === 0, ghost.join(" · "));

  /* 3 */
  const shown = new Set(ERASE_GROUPS.flatMap((g) => g.tables));
  const unshown = [...remove].filter((t) => !shown.has(t));
  ok("지우는 표가 전부 탈퇴 화면에 적혀 있다", unshown.length === 0, unshown.join(" · "));
  const fake = [...shown].filter((t) => t !== "users" && !remove.has(t));
  ok("탈퇴 화면에 적힌 표를 실제로 지운다", fake.length === 0, fake.join(" · "));
  const keepShown = new Set(KEEP_GROUPS.flatMap((g) => g.tables));
  ok("남기는 응시 표가 탈퇴 화면의 '남는 것' 에 적혀 있다", keepShown.has("v3_attempts"));

  /* 4 · 5 — 지금 검사를 마친 학생 하나 */
  await query(`DELETE FROM users WHERE login_id = 'zz-erase-v3'`, []);
  const u = (await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, is_demo)
     VALUES ('zz-erase-v3','zz-erase-v3@example.test','지울학생','x','active','ko',TRUE)
     RETURNING id::text`, []))!.id;
  const att = (await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts (user_id, tier, core_code, market_code, education_stage,
                              item_bank_version, scoring_version, status)
     VALUES ($1,'PRO','BIZ_CORE_V1','KR','bachelor','x','x','scored') RETURNING id::text`, [u]))!.id;
  await query(`INSERT INTO v3_responses (attempt_id, item_id, kind, value_int, note_text)
               VALUES ($1,'ZZ_ITEM','level',2,'대전 OO기업 인턴 때 일')`, [att]);
  await query(`INSERT INTO v3_experiences (user_id, core_code, kind, title, note_text)
               VALUES ($1,'BIZ_CORE_V1','project','동아리 마케팅 기획','본인 메모')`, [u]);
  await query(`INSERT INTO v3_applications (user_id, org_name) VALUES ($1,'(주)가나다')`, [u]);
  await query(`INSERT INTO v3_prep_answers (user_id, core_code, kind, prompt_key, prompt_text, answer_text)
               VALUES ($1,'BIZ_CORE_V1','essay','essay:job','물음','제 답')`, [u]);
  await query(`INSERT INTO v3_actions (user_id, source, body) VALUES ($1,'manual','할 일')`, [u]);
  await query(`INSERT INTO career_profiles (user_id, core_code, market_code) VALUES ($1,'BIZ_CORE_V1','KR')`, [u]);
  await query(`INSERT INTO career_events (user_id, kind) VALUES ($1,'evidence.added')`, [u]);
  await query(`INSERT INTO assistant_settings (user_id) VALUES ($1)`, [u]);
  await query(`INSERT INTO assistant_drafts (user_id, core_code, note_text, drafted_by)
               VALUES ($1,'BIZ_CORE_V1','메모','rules')`, [u]);
  await query(`INSERT INTO assistant_postings (user_id, core_code, label, raw_text, analyzed_by)
               VALUES ($1,'BIZ_CORE_V1','공고','본문','rules')`, [u]);
  await query(`INSERT INTO campus_students (user_id, university_code, student_id, college_code, department_code)
               VALUES ($1,'PCU','20260001','LIFEHEALTH','PCU26_NURSING')`, [u]);
  await query(`INSERT INTO auth_accounts (user_id, provider, provider_account_id, email)
               VALUES ($1,'google','zz-sub-1','zz-erase-v3@example.test')`, [u]);
  await query(`INSERT INTO outbox (user_id, kind, to_addr, payload, status, dedupe_key)
               VALUES ($1,'signup','zz-erase-v3@example.test','{"name":"지울학생"}'::jsonb,'queued','zz-erase-v3')`, [u]);

  const owned = ["v3_experiences", "v3_applications", "v3_prep_answers", "v3_actions",
    "career_profiles", "career_events", "assistant_settings", "assistant_drafts",
    "assistant_postings", "campus_students", "auth_accounts"];
  const res = await anonymizeUser(u, { requestedBy: "self", reason: "check" });
  const after = await Promise.all(owned.map(async (t) =>
    [t, await n(`SELECT count(*)::int AS n FROM ${t} WHERE user_id = $1`, [u])] as const));
  const leftover = after.filter(([, c]) => c > 0).map(([t, c]) => `${t} ${c}`);
  ok("지금 검사 학생의 자료 열한 표가 지워진다", leftover.length === 0,
     leftover.length ? leftover.join(" · ") : Object.keys(res.removed).length + "곳을 지움");
  ok("응시는 남는다(학과 집계와 규준)",
     await n(`SELECT count(*)::int AS n FROM v3_attempts WHERE id = $1`, [att]) === 1);
  ok("응답은 남고 그 안의 한 줄은 비워진다",
     await n(`SELECT count(*)::int AS n FROM v3_responses WHERE attempt_id = $1 AND note_text IS NULL`, [att]) === 1);
  const ob = await queryOne<{ to_addr: string | null; status: string; payload: unknown }>(
    `SELECT to_addr, status, payload FROM outbox WHERE user_id = $1`, [u]);
  ok("안 보낸 메일은 보내지 않고 주소와 본문을 비운다",
     ob?.to_addr === null && ob?.status === "skipped" && JSON.stringify(ob?.payload) === "{}");
  const log = JSON.stringify(await queryOne(
    `SELECT removed, kept FROM erasure_log WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [u]));
  ok("파기 기록에 이름·주소·학번이 없다",
     !/지울학생|zz-erase-v3@|20260001|가나다/.test(log));

  /* 6 */
  const again = await anonymizeUser(u);
  ok("두 번 돌려도 지울 것이 없다", Object.keys(again.removed).length === 0);

  await query(`DELETE FROM v3_responses WHERE attempt_id = $1`, [att]);
  await query(`DELETE FROM v3_attempts WHERE id = $1`, [att]);
  await query(`DELETE FROM outbox WHERE user_id = $1`, [u]);
  await query(`DELETE FROM erasure_log WHERE user_id = $1`, [u]);
  await query(`DELETE FROM users WHERE id = $1`, [u]).catch(() => undefined);

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
