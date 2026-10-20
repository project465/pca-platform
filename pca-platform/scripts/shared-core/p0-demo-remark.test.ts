/**
 * R36 추적 중에 나온 인접 결함 — `db:upgrade` 가 실제 학번 계정을 시연으로 다시 표시한다.
 *
 * `deploy/db-chain.json` 의 upgrade 목록에 `db/schema_phase2_4.sql` 이 있고 그 파일
 * 끝의 일괄 UPDATE 가 `email IS NULL AND login_id ~ '^[0-9]{8,}$'` 인 줄을
 * `is_demo = true` 로 바꾼다. 학교가 발급한 학번 계정은 대개 메일이 없고 학번이
 * 여덟 자리 이상이다. `provisionStudent` 는 만들 때 그 표시를 걷지만, **배포마다
 * 도는 upgrade 가 다시 붙인다.** 담당자 화면은 시연을 거르므로 그 학생이 사라진다.
 *
 * **제품 코드와 DB 스키마를 고치지 않는다.** 재현만 한다(통과 = 재현됐다).
 * 운영 DB 에서 실제로 일어났는지는 이 세션이 볼 수 없다 → NOT VERIFIED.
 *
 *   bash scripts/shared-core/test/pg-sandbox.sh up
 *   SC_SHIMS=1 DATABASE_URL=... V3_CAMPUS_FIXTURE=$PWD/scripts/fixtures/campus-zztest.json \
 *     node --experimental-strip-types --import ./scripts/shared-core/test/register.mjs \
 *     --test scripts/shared-core/p0-demo-remark.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { query, queryOne } from "@/lib/db";
import { checkStudent, provisionStudent } from "@/lib/campus/students";
import { listStudents } from "@/lib/campus/manage";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/host=\/[^&]*sc-pg-sandbox/.test(URL_) || process.env.SC_SHIMS !== "1") {
  throw new Error("pg-sandbox.sh 가 띄운 일회용 DB 와 SC_SHIMS=1 에서만 돕니다");
}

const SID = "20269901";

test("ADJ-1 배포 upgrade 를 다시 부으면 메일 없는 학번 계정이 시연으로 표시되고 담당자 목록에서 사라진다", async () => {
  let org = await queryOne<{ id: string }>(`SELECT id::text AS id FROM organizations WHERE code = 'PCU'`);
  if (!org) {
    org = await queryOne<{ id: string }>(
      `INSERT INTO organizations (code, country, org_type) VALUES ('PCU', 'KR', 'university')
       RETURNING id::text AS id`);
  }
  const c = checkStudent("PCU", { student_id: SID, name: "가상 C", department_code: "PCU26_KOREAN" });
  assert.equal(c.ok, true);
  if (!c.ok) return;
  await provisionStudent(org!.id, c.value);

  const flag = async () => (await queryOne<{ is_demo: boolean }>(
    `SELECT is_demo FROM users WHERE login_id = $1`, [SID]))?.is_demo;
  const listed = async () => (await listStudents({ universityCode: "PCU", q: SID })).total;

  const before = { is_demo: await flag(), listed: await listed() };
  const r = spawnSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "--single-transaction",
    URL_, "-f", "db/schema_phase2_4.sql"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const after = { is_demo: await flag(), listed: await listed() };
  console.log(`# before ${JSON.stringify(before)} · after ${JSON.stringify(after)}`);

  assert.deepEqual(before, { is_demo: false, listed: 1 });
  assert.deepEqual(after, { is_demo: true, listed: 0 }, "재현: 다시 부은 뒤 시연으로 표시되고 목록에서 빠진다");
  await query(`UPDATE users SET is_demo = FALSE WHERE login_id = $1`, [SID]);
});
