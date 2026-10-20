/**
 * Gate P0-C (R38) — 파기(익명화)가 V3 표를 남기는가 · `purge_after` 를 집행하는 자리가 있는가.
 *
 * R37 은 정적 grep 으로만 봤다. 여기서는 일회용 DB 에서 **실제 `anonymizeUser()`** 를 부르고
 * 남은 줄을 센다. **제품 코드 · DB 스키마를 고치지 않는다**(본체 소유 · 승인 전).
 *
 *   ER-0      `user_id` 칸을 가진 표 전부를 파기 목록(REMOVE) · 보존 목록(KEEP) 에 대어 가른다
 *   ER-1      익명화가 끝까지 돈다(users 가 `erased` 가 된다)
 *   ER-REPRO-2  v3_experiences 의 제목 · 메모가 그대로 남는다
 *   ER-REPRO-3  campus_students 의 학번 · 학교 · 학과가 그대로 남는다(같은 users.id 에 이어진 채)
 *   ER-REPRO-4  v3_applications 의 기관 이름 · 메모가 그대로 남는다
 *   ER-REPRO-5  `purge_after` 가 지난 메모를 지우는 제품 코드 · 운영 명령이 없다(정적) — 그리고 기한이 지나도 남는다(DB)
 *   ER-FIX-1~3 (todo) 본체가 파기 계약을 승인 · 구현한 뒤 켠다
 *
 * **트랜잭션**: `anonymizeUser` 는 `tx()` 를 쓴다. 이 검사는 `SC_SHIM_TX=autocommit` 으로 돌고,
 * 그 길은 문장마다 따로 커밋해 **되돌림(ROLLBACK)을 보지 못한다.** 성공 경로의 효과만 센다.
 *
 *   SC_SHIMS=1 SC_SHIM_TX=autocommit DATABASE_URL=<sandbox> node --experimental-strip-types \
 *     --import ./scripts/shared-core/test/register.mjs --test --test-concurrency=1 scripts/shared-core/p0-erasure.test.ts
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne } from "@/lib/db";
import { anonymizeUser, erasurePlan } from "@/lib/erasure";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/host=\/[^&]*sc-pg-sandbox/.test(URL_) || process.env.SC_SHIMS !== "1" || process.env.SC_SHIM_TX !== "autocommit") {
  throw new Error("pg-sandbox.sh 의 일회용 DB · SC_SHIMS=1 · SC_SHIM_TX=autocommit 에서만 돈다");
}

let uid = "";
const SID = "SC38-ER-0001";
const counts = async () => {
  const one = async (t: string) => Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM ${t} WHERE user_id = $1::bigint`, [uid]))!.n);
  return { exp: await one("v3_experiences"), app: await one("v3_applications"),
    cs: await one("campus_students"), mem: await one("memberships") };
};

before(async () => {
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale)
     VALUES ($1, 'sc38-er@example.test', '가상 E', 'x', 'active', 'ko') RETURNING id::text`, [SID]);
  uid = u!.id;
  let org = await queryOne<{ id: string }>(`SELECT id::text AS id FROM organizations WHERE code = 'PCU'`);
  if (!org) org = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type) VALUES ('PCU', 'KR', 'university') RETURNING id::text AS id`);
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint, $2::bigint, 'student')`, [uid, org!.id]);
  await query(`INSERT INTO campus_students (user_id, university_code, student_id, college_code, department_code)
               VALUES ($1::bigint, 'PCU', $2, 'HUMSOC', 'PCU26_KOREAN')`, [uid, SID]);
  await query(`INSERT INTO v3_experiences (user_id, core_code, kind, title, note_text, purge_after)
               VALUES ($1::bigint, 'BIZ_CORE_V1', 'project', '동아리 시장 조사(가상)', '개인 서술(가상)', current_date - 1)`, [uid]);
  await query(`INSERT INTO v3_applications (user_id, core_code, org_name, note_text, purge_after)
               VALUES ($1::bigint, 'BIZ_CORE_V1', '가상 기관', '지원 메모(가상)', current_date - 1)`, [uid]);
});

test("ER-0 user_id 칸이 있는 표를 파기 목록 · 보존 목록에 대어 가른다", async () => {
  const rows = await query<{ t: string }>(
    `SELECT DISTINCT table_name AS t FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'user_id' ORDER BY 1`);
  const plan = erasurePlan();
  const remove = new Set(plan.remove.map((r) => r.table));
  const keep = new Set(Object.keys(plan.keep));
  const all = rows.map((r) => r.t);
  const unclassified = all.filter((t) => !remove.has(t) && !keep.has(t));
  console.log(`# ER-0 user_id 표 ${all.length} · 지움 ${all.filter((t) => remove.has(t)).length} · 남김 ${all.filter((t) => keep.has(t)).length} · 어디에도 없음 ${unclassified.length}: ${unclassified.join(" ")}`);
  assert.ok(unclassified.includes("v3_experiences"), "재현: v3_experiences 가 어느 목록에도 없다");
  assert.ok(unclassified.includes("campus_students"), "재현: campus_students 가 어느 목록에도 없다");
});

test("ER-1 익명화가 끝까지 돌고 users 가 erased 가 된다", async () => {
  const before_ = await counts();
  const r = await anonymizeUser(uid, { requestedBy: "self", reason: "sc38-test" });
  const u = await queryOne<{ status: string; login_id: string | null; email: string | null }>(
    `SELECT status, login_id, email FROM users WHERE id = $1::bigint`, [uid]);
  console.log(`# ER-1 before ${JSON.stringify(before_)} · removed ${JSON.stringify(r.removed)} · after ${JSON.stringify(await counts())}`);
  assert.equal(u!.status, "erased");
  assert.equal(u!.login_id, null);
  assert.equal(u!.email, null);
  assert.equal((await counts()).mem, 0, "memberships 는 지운다(목록에 있다)");
});

test("ER-REPRO-2 v3_experiences 의 제목 · 메모가 파기 뒤에도 남는다", async () => {
  const r = await queryOne<{ title: string; note_text: string | null }>(
    `SELECT title, note_text FROM v3_experiences WHERE user_id = $1::bigint`, [uid]);
  assert.ok(r, "재현: 줄이 남는다");
  assert.equal(r!.note_text, "개인 서술(가상)");
});

test("ER-REPRO-3 campus_students 의 학번 · 학교 · 학과가 같은 users.id 에 이어진 채 남는다", async () => {
  const r = await queryOne<{ student_id: string; university_code: string; department_code: string }>(
    `SELECT student_id, university_code, department_code FROM campus_students WHERE user_id = $1::bigint`, [uid]);
  assert.deepEqual(r, { student_id: SID, university_code: "PCU", department_code: "PCU26_KOREAN" },
    "재현: 아이디는 지웠는데 학번이 그대로라 학교 명단으로 되짚으면 사람이 특정된다");
});

test("ER-REPRO-4 v3_applications 의 기관 이름 · 메모가 남는다", async () => {
  const r = await queryOne<{ org_name: string; note_text: string }>(
    `SELECT org_name, note_text FROM v3_applications WHERE user_id = $1::bigint`, [uid]);
  assert.deepEqual(r, { org_name: "가상 기관", note_text: "지원 메모(가상)" });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|sh|sql|mjs|cjs)$/.test(f) ? [p] : [];
  });
}

test("ER-REPRO-5 purge_after 가 지난 V3 메모를 지우는 제품 코드 · 운영 명령이 없고, 기한이 지나도 남는다", async () => {
  const files = [...walk("src"), ...walk("deploy")];
  const consumers = files.filter((f) => {
    const s = readFileSync(f, "utf8");
    return /purge_after\s*(<|<=)/.test(s) && /v3_(experiences|applications)/.test(s);
  });
  const ops = JSON.parse(readFileSync("deploy/ops/package.json", "utf8")).scripts as Record<string, string>;
  const opsPurge = Object.keys(ops).filter((k) => /purge|erase/i.test(k));
  console.log(`# ER-REPRO-5 소비자 ${consumers.length} · 운영 명령 ${opsPurge.length} · 검사한 파일 ${files.length}`);
  assert.deepEqual(consumers, [], "재현: 지난 기한을 고르는 V3 질의가 없다");
  assert.deepEqual(opsPurge, [], "재현: 운영 이미지에 파기 · 기한 명령이 없다");
  const due = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_experiences WHERE user_id = $1::bigint
        AND purge_after < current_date AND note_text IS NOT NULL`, [uid]);
  assert.equal(due!.n, "1", "기한이 지난 메모가 그대로 있다");
});

const FIX = { todo: "본체가 파기 계약(CC-009)을 승인 · 구현한 뒤 켠다" };
test("ER-FIX-1 파기 뒤 v3_experiences · v3_applications 줄이 없다", FIX, async () => {
  assert.equal((await counts()).exp + (await counts()).app, 0);
});
test("ER-FIX-2 파기 뒤 campus_students 에 학번이 남지 않는다", FIX, async () => {
  assert.equal((await counts()).cs, 0);
});
test("ER-FIX-3 기한이 지난 V3 메모를 지우는 길이 있다", FIX, async () => {
  const due = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_experiences WHERE purge_after < current_date AND note_text IS NOT NULL`);
  assert.equal(due!.n, "0");
});
