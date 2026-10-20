/**
 * Track D — 결과의 기준시점 (R37 §5 요청 1).
 *
 * 묻는 것: 같은 응시의 결과를 다시 그릴 때, 학생이 그 뒤에 경험 기록을 고치면
 * 무엇이 바뀌고 무엇이 그대로인가.
 *
 * **제품 코드 · DB 스키마를 고치지 않는다.** 일회용 DB 에서 실제 함수
 * (`addExperience` · `updateExperience` · `removeExperience` · `experiencesOf`)를
 * 부르고 `v3_snapshots` 의 지문을 전후로 견준다. 종이(PDF)를 실제로 그리는 일은
 * 이 세션에서 못 한다(next · Chromium 없음) — 그 자리는 정적 검사로만 본다.
 *
 *   SC_SHIMS=1 DATABASE_URL=<sandbox> V3_CAMPUS_FIXTURE=… node --experimental-strip-types \
 *     --import ./scripts/shared-core/test/register.mjs --test scripts/shared-core/exp-timepoint.test.ts
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { addExperience, experiencesOf, removeExperience, updateExperience } from "@/lib/me-v3/platform";
import { load, score } from "@/lib/me-v3/scoring/engine";
import { expand } from "@/lib/me-v3/scoring/fixtures";
import { buildResult } from "@/lib/me-v3/result/build";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/host=\/[^&]*sc-pg-sandbox/.test(URL_) || process.env.SC_SHIMS !== "1") {
  throw new Error("pg-sandbox.sh 가 띄운 일회용 DB 와 SC_SHIMS=1 에서만 돕니다");
}
const CORE = "BIZ_CORE_V1";
const md5 = (s: string) => createHash("md5").update(s).digest("hex");
let userId = "", attemptId = "";
const snapPrint = async () => {
  const r = await queryOne<{ p: string }>(
    `SELECT md5(payload::text || '|' || coalesce(result_model::text, '') || '|' || coalesce(result_model_version, '')) AS p
       FROM v3_snapshots WHERE attempt_id = $1::bigint`, [attemptId]);
  return r?.p ?? "";
};
const liveRecords = async () => md5(JSON.stringify(
  (await experiencesOf(userId, CORE)).map((e) => ({ t: e.title, a: e.artifacts, d: e.decisions }))));

before(async () => {
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, display_name, password_hash, status, locale)
     VALUES ('sc37-timepoint', '가상 D', 'x', 'active', 'ko') RETURNING id::text`);
  userId = u!.id;
  const loaded = load(CORE);
  const s = score(expand({ id: "TP", name: "기준시점", tier: "PRO", stage: "bachelor", field: null,
    probe: ["TD01"], deep: ["TD01"], grid: { TD01: [5, 2, 5] },
    axes: { TD01: Object.fromEntries(["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"].map((a) => [a, 2])) },
    artifacts: { TD01: 1 }, verify: { TD01: 1 } }, CORE), loaded);
  const m = buildResult(s, loaded);
  const a = await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts (user_id, tier, education_stage, item_bank_version, scoring_version,
                              status, submitted_at, core_code)
     VALUES ($1::bigint, 'PRO', 'bachelor', 'SC37', 'SC37', 'scored', now(), $2) RETURNING id::text`,
    [userId, CORE]);
  attemptId = a!.id;
  await query(
    `INSERT INTO v3_snapshots (attempt_id, module_versions, response_quality, payload, result_model, result_model_version)
     VALUES ($1::bigint, '{}'::jsonb, 'OK', $2::jsonb, $3::jsonb, 'sc37')`,
    [attemptId, JSON.stringify(s), JSON.stringify(m)]);
});

test("TP-1 응시 결과(v3_snapshots: 판정 · 결과 모델)는 경험을 더하고 고치고 지워도 한 글자도 바뀌지 않는다", async () => {
  const s0 = await snapPrint();
  const id = await addExperience(userId, { kind: "project", title: "동아리 시장 조사", td_codes: ["TD01"],
    artifacts: ["요구 목록"], decisions: ["조사 대상 범위"] });
  const s1 = await snapPrint();
  await updateExperience(userId, id, { kind: "project", title: "동아리 시장 조사(고침)", td_codes: ["TD01"],
    artifacts: ["사업계획서"], decisions: [] });
  const s2 = await snapPrint();
  await removeExperience(userId, id);
  const s3 = await snapPrint();
  console.log(`# TP-1 snapshot ${s0.slice(0, 12)} → ${s1.slice(0, 12)} → ${s2.slice(0, 12)} → ${s3.slice(0, 12)}`);
  assert.ok(s0 && s0 === s1 && s1 === s2 && s2 === s3);
});

test("TP-2 결과 화면이 그릴 때 읽는 경험 기록(experiencesOf)은 그 순간의 값이다 — 응시 시점에 고정되지 않는다", async () => {
  const r0 = await liveRecords();
  const id = await addExperience(userId, { kind: "course", title: "수업 과제", td_codes: ["TD01"], artifacts: ["요구 목록"] });
  const r1 = await liveRecords();
  await updateExperience(userId, id, { kind: "course", title: "수업 과제(고침)", td_codes: ["TD01"], artifacts: ["사업계획서"] });
  const r2 = await liveRecords();
  await removeExperience(userId, id);
  const r3 = await liveRecords();
  console.log(`# TP-2 live ${[r0, r1, r2, r3].map((x) => x.slice(0, 8)).join(" → ")}`);
  assert.notEqual(r0, r1); assert.notEqual(r1, r2); assert.equal(r3, r0, "지우면 사라진다(되돌릴 기록이 없다)");
});

test("TP-3 (정적) 지금 결과지는 경험 기록을 웹에만 세우고 종이(@media print)에서는 숨긴다", () => {
  const page = readFileSync("src/app/v3/[attemptId]/result/page.tsx", "utf8");
  const css = readFileSync("src/app/v3/result.css", "utf8");
  assert.match(page, /className="rs-sect rs-webonly" id="records"/, "경험 묶음이 rs-webonly");
  assert.match(css, /@media print[\s\S]*?\.rs-webonly \{ display: none !important; \}/, "종이에서 숨긴다");
  /* 담아 둔 할 일 수(.rs-do1-f · 렌더 시점 v3_actions)도 종이에서 숨긴다 */
  assert.match(css, /\.rs-do1-l > i, \.rs-do1-f \{ display: none; \}/);
});

test("TP-4 경험 한 줄 메모는 1년 뒤 지우게 돼 있다 — 스냅샷에 베끼면 그 정책을 다시 맞춰야 한다", async () => {
  const id = await addExperience(userId, { kind: "course", title: "메모 있는 기록", note_text: "개인 서술" });
  const r = await queryOne<{ purge_after: string | null }>(
    `SELECT purge_after::text FROM v3_experiences WHERE id = $1::bigint`, [id]);
  assert.ok(r?.purge_after, "note_text 가 있으면 purge_after 가 선다");
  await removeExperience(userId, id);
});
