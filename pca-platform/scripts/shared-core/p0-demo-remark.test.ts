/**
 * Gate P0 · ADJ-1 — `db:upgrade` 가 실제 학번 계정을 시연으로 다시 표시한다.
 *
 * `deploy/db-chain.json` 의 upgrade 목록에 `db/schema_phase2_4.sql` 이 있고 그 파일
 * 끝의 일괄 UPDATE 가 `email IS NULL AND login_id ~ '^[0-9]{8,}$'` 인 줄을
 * `is_demo = true` 로 바꾼다. 학교가 발급한 학번 계정이 그 꼴이다.
 *
 * **제품 코드 · DB 스키마 · 기존 migration 을 고치지 않는다.** 일회용 DB 에서
 *   ADJ-1a 처음 세운 DB 에 나중에 만든 학생은 표시되지 않는다(INSERT 트리거는 숫자 학번을 보지 않는다)
 *   ADJ-1b upgrade 목록을 **다시** 부으면 표시되고 담당자 목록에서 빠진다
 *   ADJ-1c 그 일괄 UPDATE 가 노린 대상(학교 줄이 없는 숫자 학번 시드 계정)은 그대로 표시된다
 *   ADJ-1d 수정안(별도 파일 · 승인 전)을 upgrade 뒤에 부으면 학교 학생만 걷히고, 두 번 돌려도 같다
 *   ADJ-1e upgrade 를 다시 부어도 users 의 is_demo 말고는 바뀐 칸이 없다
 *   DET-1  탐지 SQL 은 읽기만 한다(정적 검사 · DB 지문 전후 · READ ONLY 에서 쓰기 거절)
 *
 *   bash scripts/shared-core/test/pg-sandbox.sh up
 *   SC_SHIMS=1 DATABASE_URL=... V3_CAMPUS_FIXTURE=$PWD/scripts/fixtures/campus-zztest.json \
 *     node --experimental-strip-types --import ./scripts/shared-core/test/register.mjs \
 *     --test --test-concurrency=1 scripts/shared-core/p0-demo-remark.test.ts
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { query, queryOne } from "@/lib/db";
import { checkStudent, provisionStudent } from "@/lib/campus/students";
import { listStudents } from "@/lib/campus/manage";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/host=\/[^&]*sc-pg-sandbox/.test(URL_) || process.env.SC_SHIMS !== "1") {
  throw new Error("pg-sandbox.sh 가 띄운 일회용 DB 와 SC_SHIMS=1 에서만 돕니다");
}

const FIX_SQL = "docs/shared-core/proposed/adj1-campus-students-not-demo.sql";
const DETECT_SQL = "scripts/shared-core/sql/r36_p0_detect.sql";
const SID = "20269901";
const SEED = "20269902"; // 학교 줄이 없는 숫자 학번 — 그 UPDATE 가 원래 노린 시드 꼴

function psqlFile(file: string): { status: number | null; out: string; err: string } {
  const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "--single-transaction",
    URL_, "-f", file], { encoding: "utf8" });
  return { status: r.status, out: r.stdout, err: r.stderr };
}
function psqlCmd(sql: string): { status: number | null; out: string; err: string } {
  const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", URL_, "-c", sql], { encoding: "utf8" });
  return { status: r.status, out: r.stdout.trim(), err: r.stderr };
}
function upgradeAgain(): string[] {
  const list = (JSON.parse(readFileSync("deploy/db-chain.json", "utf8")) as { upgrade: string[] }).upgrade;
  const failed: string[] = [];
  for (const f of list) if (psqlFile(f).status !== 0) failed.push(f);
  return failed;
}
const demo = async (login: string) => (await queryOne<{ is_demo: boolean }>(
  `SELECT is_demo FROM users WHERE login_id = $1`, [login]))?.is_demo ?? null;
const listed = async () => (await listStudents({ universityCode: "PCU", q: SID })).total;
/** users · memberships · campus_students 를 is_demo 를 뺀 채로 */
const print = () => psqlCmd(
  `SELECT md5(coalesce(string_agg(x, '|' ORDER BY x), '')) FROM (
     SELECT 'u'||id||':'||coalesce(login_id,'')||':'||coalesce(email,'')||':'||display_name||':'||status||':'||coalesce(password_hash,'') AS x FROM users
     UNION ALL SELECT 'm'||user_id||':'||org_id||':'||role FROM memberships
     UNION ALL SELECT 'c'||user_id||':'||university_code||':'||student_id||':'||department_code FROM campus_students) t`).out;
const demoPrint = () => psqlCmd(`SELECT md5(coalesce(string_agg(id||':'||is_demo, '|' ORDER BY id), '')) FROM users`).out;

let orgId = "";
before(async () => {
  let org = await queryOne<{ id: string }>(`SELECT id::text AS id FROM organizations WHERE code = 'PCU'`);
  if (!org) {
    org = await queryOne<{ id: string }>(
      `INSERT INTO organizations (code, country, org_type) VALUES ('PCU', 'KR', 'university') RETURNING id::text AS id`);
  }
  orgId = org!.id;
});

test("ADJ-1a 처음 세운 DB 에 나중에 만든 학번 학생은 시연이 아니다(트리거는 숫자 학번을 보지 않는다)", async () => {
  const c = checkStudent("PCU", { student_id: SID, name: "가상 C", department_code: "PCU26_KOREAN" });
  assert.equal(c.ok, true);
  if (!c.ok) return;
  await provisionStudent(orgId, c.value);
  await query(`INSERT INTO users (login_id, display_name, password_hash, status, locale)
               VALUES ($1, '시드 꼴 계정', 'x', 'active', 'ko') ON CONFLICT DO NOTHING`, [SEED]);
  assert.equal(await demo(SID), false);
  assert.equal(await demo(SEED), false, "INSERT 트리거는 숫자 학번만으로 표시하지 않는다");
  assert.equal(await listed(), 1);
});

test("ADJ-1b upgrade 목록을 다시 부으면 학번 학생이 시연으로 표시되고 담당자 목록에서 빠진다", async () => {
  const before_ = { demo: await demo(SID), listed: await listed() };
  const failed = upgradeAgain();
  const after = { demo: await demo(SID), listed: await listed() };
  console.log(`# ADJ-1b before ${JSON.stringify(before_)} · after ${JSON.stringify(after)} · 실패한 파일 ${failed.length}`);
  assert.deepEqual(failed, [], "upgrade 목록은 다시 부어도 오류 없이 돈다");
  assert.deepEqual(after, { demo: true, listed: 0 }, "재현: 배포 한 번에 학생이 담당자 화면에서 사라진다");
});

test("ADJ-1c 그 UPDATE 가 원래 노린 시드 꼴(학교 줄 없음)도 표시된다 — 의도된 동작", async () => {
  assert.equal(await demo(SEED), true);
});

test("ADJ-1e upgrade 를 다시 부어도 is_demo 말고는 사람 · 소속 · 학교 줄이 바뀌지 않는다", () => {
  const p0 = print();
  const d0 = demoPrint();
  assert.deepEqual(upgradeAgain(), []);
  assert.equal(print(), p0, "users(is_demo 제외) · memberships · campus_students 지문이 같다");
  assert.equal(demoPrint(), d0, "이미 표시된 뒤에는 다시 부어도 is_demo 도 같다");
});

test("ADJ-1d 수정안을 upgrade 뒤에 부으면 학교 학생만 걷히고 두 번 돌려도 같다", async () => {
  const r1 = psqlFile(FIX_SQL);
  assert.equal(r1.status, 0, r1.err);
  assert.equal(await demo(SID), false, "학교 학생은 시연이 아니다");
  assert.equal(await demo(SEED), true, "학교 줄이 없는 시드 꼴은 그대로 둔다");
  assert.equal(await listed(), 1, "담당자 목록에 돌아온다");
  const d1 = demoPrint();
  assert.equal(psqlFile(FIX_SQL).status, 0);
  assert.equal(demoPrint(), d1, "멱등");
  /* 배포 순서를 흉내: upgrade 다시 → 수정안 */
  assert.deepEqual(upgradeAgain(), []);
  assert.equal(await demo(SID), true, "수정안을 목록에 넣지 않으면 다음 배포에 또 표시된다");
  assert.equal(psqlFile(FIX_SQL).status, 0);
  assert.equal(await demo(SID), false);
});

test("DET-1 탐지 SQL 은 읽기만 한다", () => {
  const src = readFileSync(DETECT_SQL, "utf8").replace(/--.*$/gm, "");
  const writes = src.match(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|COPY|VACUUM)\b/gi) ?? [];
  assert.deepEqual(writes, [], "쓰는 문장이 없다");
  assert.match(src, /BEGIN\s+TRANSACTION\s+READ\s+ONLY/i);
  assert.match(src, /ROLLBACK/i);
  const p0 = print(); const d0 = demoPrint();
  const r = psqlFile(DETECT_SQL);
  assert.equal(r.status, 0, r.err);
  assert.equal(print(), p0); assert.equal(demoPrint(), d0);
  const w = psqlCmd("BEGIN TRANSACTION READ ONLY; UPDATE users SET is_demo = is_demo; ROLLBACK;");
  assert.notEqual(w.status, 0, "READ ONLY 트랜잭션은 쓰기를 거절한다");
  assert.match(w.err, /read-only transaction/);
  console.log(`# DET-1 ${r.out.trim().split("\n").filter((l) => /^(D\d|ADJ)/.test(l)).join(" ; ")}`);
});
