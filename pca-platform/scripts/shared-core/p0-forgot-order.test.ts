/**
 * L3 (R40) — 비밀번호 찾기와 로그인이 **같은 사람**을 고르는가.
 *
 * 로그인(`auth.ts`)은 `ORDER BY (login_id = $1) DESC NULLS LAST, id` 로 아이디를 먼저
 * 고른다. 비밀번호 찾기(`password/forgot/actions.ts`)는 같은 조건에 **차례 없이**
 * `LIMIT 1` 이다. 한 사람의 아이디와 다른 사람의 이메일이 같은 글자이면, 로그인은 A 로
 * 가는데 재설정 링크는 B 의 계정으로 만들어질 수 있다. 어느 줄이 오는지는 실행 계획과
 * 줄이 쌓인 차례가 정한다.
 *
 * **제품 코드를 고치지 않는다.** 두 질의를 소스에서 글자 그대로 꺼내 돌린다
 * (`next-auth` 가 없어 `authorize()` 자체는 부를 수 없다).
 *
 *   L3-REPRO-1  지금 코드: 쌓인 차례에 따라 찾기가 로그인과 다른 사람을 고르는 경우가 있다
 *   L3-FIX-1    수정 사본(`proposed/l3-forgot-order.patch`): 어느 차례로 쌓여도 같은 사람
 *
 * `SC_EXPECT_FIX` 에 `L3` 가 들어 있으면 수정 사본으로 보고 FIX 를 실제 검사로 켜고
 * REPRO 를 건너뛴다(`test/with-patch.sh` 가 그렇게 부른다).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { query, queryOne } from "@/lib/db";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/host=\/[^&]*sc-pg-sandbox/.test(URL_) || process.env.SC_SHIMS !== "1") {
  throw new Error("pg-sandbox.sh 의 일회용 DB 와 SC_SHIMS=1 에서만 돈다");
}
const FIXED = /\bL3\b/.test(process.env.SC_EXPECT_FIX ?? "");

function sqlFrom(file: string, marker: RegExp): string {
  const m = marker.exec(readFileSync(file, "utf8"));
  if (!m) throw new Error(`${file} 에서 식별 질의를 찾지 못했습니다 — 소스가 바뀌었다`);
  return m[1];
}
const LOGIN_SQL = sqlFrom("src/lib/auth.ts",
  /async function findUserByIdentifier[\s\S]*?queryOne<UserRow>\(\s*`([\s\S]*?)`/);
const FORGOT_SQL = sqlFrom("src/app/password/forgot/actions.ts",
  /queryOne<\{ id: string; email: string \| null \}>\(\s*`([\s\S]*?)`/);

const pick = async (sql: string, id: string) =>
  String((await queryOne<{ id: string }>(sql, [id]))?.id ?? "");

async function user(login: string | null, email: string | null, name: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale)
     VALUES ($1, $2, $3, 'x', 'active', 'ko') RETURNING id::text`, [login, email, name]);
  return r!.id;
}

/** 한 판: 같은 글자가 B 의 이메일이자 A 의 아이디. `emailFirst` 면 B 를 먼저 쌓는다 */
async function round(tag: string, emailFirst: boolean) {
  const shared = `sc40-${tag}@example.test`;
  let a = ""; let b = "";
  if (emailFirst) { b = await user(`sc40-${tag}-b`, shared, "가상 B"); a = await user(shared, null, "가상 A"); }
  else { a = await user(shared, null, "가상 A"); b = await user(`sc40-${tag}-b`, shared, "가상 B"); }
  const login = await pick(LOGIN_SQL, shared);
  const forgot = await pick(FORGOT_SQL, shared);
  await query(`DELETE FROM users WHERE id IN ($1::bigint, $2::bigint)`, [a, b]);
  return { a, b, login, forgot };
}

test("L3-0 로그인은 아이디가 같은 쪽(A)을 고른다 — 비교의 기준", async () => {
  for (const ef of [true, false]) {
    const r = await round(`base${ef ? 1 : 0}`, ef);
    assert.equal(r.login, r.a);
  }
});

test("L3-REPRO-1 지금 코드: 쌓인 차례에 따라 찾기가 로그인과 다른 계정을 고른다",
  { skip: FIXED ? "수정 사본 — REPRO 건너뜀" : false }, async () => {
    const r1 = await round("r1", true);
    const r2 = await round("r2", false);
    console.log(`# L3-REPRO-1 B 먼저: 로그인 ${r1.login === r1.a ? "A" : "B"} · 찾기 ${r1.forgot === r1.a ? "A" : "B"} | A 먼저: 로그인 ${r2.login === r2.a ? "A" : "B"} · 찾기 ${r2.forgot === r2.a ? "A" : "B"}`);
    assert.ok(r1.forgot !== r1.login || r2.forgot !== r2.login,
      "재현: 어느 한 차례에서 찾기와 로그인이 갈린다");
  });

test("L3-FIX-1 어느 차례로 쌓여도 찾기가 로그인과 같은 계정을 고른다",
  FIXED ? {} : { todo: "proposed/l3-forgot-order.patch 승인 · 적용 뒤 켠다" }, async () => {
    for (const ef of [true, false]) {
      const r = await round(`f${ef ? 1 : 0}`, ef);
      assert.equal(r.forgot, r.login, `${ef ? "B" : "A"} 를 먼저 쌓았을 때`);
    }
  });
