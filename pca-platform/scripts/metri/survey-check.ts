/**
 * 정주·만족도 문항이 성과지표가 되는가.
 *
 * 제안서가 의뢰 기관에 약속한 숫자라, 틀리면 사업 보고가 틀린다.
 * 보는 것 여섯.
 *
 *   1. 응시 전 2문항 · 응시 후 5문항이 제 시점에만 나온다
 *   2. **채점이 이 표를 읽지 않는다** — 정주 의향이 직무 점수를 흔들지 않는다
 *   3. 같은 문항을 다시 답하면 덮어쓴다 (한 사람 한 줄)
 *   4. **짝이 맞는 사람만 센다** — 앞만 답하고 나간 사람은 변화에서 빠진다
 *   5. 남의 응시에는 적을 수 없다
 *   6. **5명 미만이면 숫자를 내지 않는다**
 *
 *   npm run metri:survey
 */
import { query, queryOne } from "../../src/lib/db";
import {
  surveyItems, saveSurvey, surveyDone, residencyShift, satisfaction, MIN_CELL,
} from "../../src/lib/survey";
import { hashPassword } from "../../src/lib/password";

let failed = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

/** 회차 하나와 응시자 n명. 채점까지 가지 않는다 — 여기서 보는 것은 부가 문항뿐이다. */
async function cohort(n: number): Promise<{ sessionId: string; attempts: string[]; users: string[] }> {
  const pw = await hashPassword("test-pass-1234");
  const org = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type, status)
     VALUES ('SURVEYCHK','KR','department','active')
     ON CONFLICT (code) DO UPDATE SET status='active' RETURNING id`);
  const contract = await queryOne<{ id: string }>(
    `INSERT INTO contracts (org_id, title, seat_count, starts_on, ends_on, status)
     VALUES ($1,'설문 검사용',$2, current_date, current_date + 365, 'active') RETURNING id`,
    [org!.id, n]);
  const inst = await queryOne<{ id: string }>(
    `SELECT id FROM instruments WHERE instrument_key='PCA_ME_V1' ORDER BY id DESC LIMIT 1`);
  const ses = await queryOne<{ id: string }>(
    `INSERT INTO test_sessions (org_id, contract_id, kind, instrument_id, name,
                                opens_at, closes_at, release_mode)
     VALUES ($1,$2,'org',$3,'설문 검사 회차', now() - interval '1 day',
             now() + interval '30 day','manual') RETURNING id`,
    [org!.id, contract!.id, inst!.id]);

  const attempts: string[] = [], users: string[] = [];
  for (let i = 0; i < n; i++) {
    const u = await queryOne<{ id: string }>(
      `INSERT INTO users (email, display_name, password_hash, status)
       VALUES ($1,$2,$3,'active')
       ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`,
      [`survey-${i}@example.com`, `설문 학생 ${i}`, pw]);
    const a = await queryOne<{ id: string }>(
      `INSERT INTO attempts (session_id, user_id, status, started_at)
       VALUES ($1,$2,'in_progress', now())
       ON CONFLICT (session_id, user_id) DO UPDATE SET status='in_progress' RETURNING id`,
      [ses!.id, u!.id]);
    attempts.push(a!.id); users.push(u!.id);
  }
  return { sessionId: ses!.id, attempts, users };
}

async function main() {
  await query(`DELETE FROM survey_responses WHERE attempt_id IN
                 (SELECT id FROM attempts WHERE user_id IN
                   (SELECT id FROM users WHERE email LIKE 'survey-%@example.com'))`);
  await query(`DELETE FROM attempts WHERE user_id IN
                 (SELECT id FROM users WHERE email LIKE 'survey-%@example.com')`);
  await query(`DELETE FROM test_sessions WHERE org_id IN
                 (SELECT id FROM organizations WHERE code='SURVEYCHK')`);
  await query(`DELETE FROM contracts WHERE org_id IN
                 (SELECT id FROM organizations WHERE code='SURVEYCHK')`);

  console.log("════════ 1. 시점마다 다른 문항 ════════");
  const before = await surveyItems("before");
  const after = await surveyItems("after");
  check(before.length === 2, "응시 전은 2문항", `${before.length}개`);
  check(after.length === 7, "응시 후는 7문항 (정주 3 + 만족도 4)", `${after.length}개`);
  check(before.every((i) => i.text.length > 10), "문항 전문이 제안서 그대로 들어 있다",
    before[0]?.text.slice(0, 22) + "…");

  const N = 8;
  const { sessionId, attempts, users } = await cohort(N);

  console.log("\n════════ 2. 채점은 이 표를 읽지 않는다 ════════");
  const src = (await import("node:fs")).readFileSync("src/lib/scoring.ts", "utf-8");
  check(!src.includes("survey_"), "scoring.ts 에 survey 표가 나오지 않는다");
  const cols = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'responses' AND column_name = 'value'`);
  check(cols!.n === 0, "검사 응답 표와 부가 응답 표가 아예 다르다");

  console.log("\n════════ 3·4. 적고, 고치고, 짝을 맞춘다 ════════");
  // 여덟 명 중 여섯은 앞뒤를 다 답하고, 둘은 앞만 답하고 나간다
  for (let i = 0; i < N; i++) {
    for (const it of before) await saveSurvey(attempts[i], users[i], it.id, 3);
    if (i < 6) {
      for (const it of after) {
        await saveSurvey(attempts[i], users[i], it.id, it.kind === "satisfaction" ? 4 : 4);
      }
    }
  }
  check(await surveyDone(attempts[0], "before"), "앞 문항을 다 답하면 done");
  check(!(await surveyDone(attempts[7], "after")), "뒤를 안 답했으면 done 이 아니다");

  // 덮어쓰기 — 같은 문항을 다시 답한다
  await saveSurvey(attempts[0], users[0], before[0].id, 5);
  const one = await queryOne<{ n: number; v: number }>(
    `SELECT count(*)::int AS n, max(value)::int AS v FROM survey_responses
      WHERE attempt_id = $1 AND item_id = $2`, [attempts[0], before[0].id]);
  check(one!.n === 1 && one!.v === 5, "다시 답하면 덮어쓴다 (한 사람 한 줄)", `${one!.n}줄 · ${one!.v}점`);

  const shift = await residencyShift(sessionId);
  const res = shift.find((s) => s.pairKey === "residency")!;
  check(res.n === 6, "짝이 맞는 6명만 센다 (앞만 답한 2명은 빠진다)", `${res.n}명`);
  check(res.before !== null && res.after !== null && res.delta !== null, "변화가 나온다",
    `${res.before} → ${res.after} (${res.delta! > 0 ? "+" : ""}${res.delta})`);

  console.log("\n════════ 5. 남의 응시에는 못 적는다 ════════");
  const stolen = await saveSurvey(attempts[1], users[0], before[0].id, 1);
  check(!stolen, "다른 사람 응시에 적으려 하면 거절된다");
  const bad = await saveSurvey(attempts[0], users[0], before[0].id, 9);
  check(!bad, "1~5 밖의 값은 거절된다");

  console.log("\n════════ 6. 5명 미만은 숫자를 내지 않는다 ════════");
  const sat = await satisfaction(sessionId);
  check(sat.length === 4, "만족도 네 문항이 집계된다", `${sat.length}개`);
  check(sat.every((s) => s.avg !== null), `6명이라 ${MIN_CELL}명 선을 넘어 숫자가 나온다`);
  // 네 명만 남기고 지워 본다
  for (let i = 4; i < 6; i++) {
    await query(`DELETE FROM survey_responses WHERE attempt_id = $1`, [attempts[i]]);
  }
  const thin = await satisfaction(sessionId);
  check(thin.every((s) => s.avg === null && s.n < MIN_CELL),
    "4명으로 줄면 평균을 감춘다", `n=${thin[0]?.n}`);
  const thinShift = await residencyShift(sessionId);
  check(thinShift.every((s) => s.delta === null), "변화도 같이 감춘다");

  console.log(failed
    ? `\n${failed}개 실패.`
    : "\n부가 문항 OK — 점수는 흔들지 않고, 성과지표로만 간다.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
