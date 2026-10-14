/**
 * **집계가 스스로 맞는가**(규격 §22).
 *
 * 한 번 담당자 화면에 완료율이 **289%** 로 찍혔다. 까닭이 둘이었다:
 * 분모가 명단이고 분자가 학교로 들어와 친 사람이라 모집단이 달랐고,
 * 시연·검사 계정이 걸러지지 않고 있었다.
 *
 * **clamp 로 막지 않는다.** 100 에서 자르면 틀린 집계가 맞아 보이기만
 * 하고, 다음에 모집단이 또 어긋나는 날 아무도 모른다. 그래서 여기서 세는
 * 것은 `비율이 100 이하인가` 가 아니라 **집계 자체가 다음 다섯을 늘
 * 만족하는가**다.
 *
 *   ① 시연·검사 계정이 기본으로 빠진다
 *   ② 완료 ≤ 시작
 *   ③ 시작 ≤ 대상자
 *   ④ 완료 ≤ 대상자
 *   ⑤ 0 ≤ 완료율 ≤ 100, 그리고 **그 값이 완료/대상자와 글자까지 같다**
 *
 * ⑤의 뒷마디가 clamp 를 막는 자리다. 비율을 자르면 그 수가 나눗셈과
 * 어긋나고, 그 자리에서 이 검사가 걸린다.
 *
 * 세우는 자리가 셋이다(규격 §22 가 적은 세 모집단이 전부 서야 한다):
 *   A 명단에 있고 응시하지 않은 사람
 *   B 명단에 있고 응시해 끝낸 사람
 *   C 명단에 없고 학교 전용 진입으로 들어와 응시한 사람
 *
 * `max(명단, 시작)` 으로는 A 와 C 가 같은 날 함께 있으면 참값이 나오지
 * 않는다. 쓴 자료는 끝에서 지운다.
 *
 *   npm run campus:rate
 */
import { loadEnv } from "./_loop-fixture";
loadEnv();
import { query, queryOne } from "../src/lib/db";
import { campusV3 } from "../src/lib/me-v3/campus";
import { hashPassword } from "../src/lib/password";
import { MIN_CELL } from "../src/lib/org";
import { allLeaves, university } from "../src/lib/campus/registry";

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

const TAG = "rate-%@test.invalid";

async function wipe(): Promise<void> {
  await query(`DELETE FROM v3_attempts WHERE user_id IN
                 (SELECT id FROM users WHERE login_id LIKE $1)`, [TAG]);
  await query(`DELETE FROM campus_students WHERE user_id IN
                 (SELECT id FROM users WHERE login_id LIKE $1)`, [TAG]);
  await query(`DELETE FROM memberships WHERE user_id IN
                 (SELECT id FROM users WHERE login_id LIKE $1)`, [TAG]);
  await query(`DELETE FROM users WHERE login_id LIKE $1`, [TAG]);
}

async function main(): Promise<void> {
  const u = university("PCU");
  if (!u) { console.error("등록부에 PCU 가 없습니다."); process.exit(1); }
  const leaf = allLeaves(u)[0];
  if (!leaf) { console.error("등록부에 고르는 자리가 없습니다."); process.exit(1); }
  const COL = leaf.college.code;
  const DEP = leaf.leaf.code;

  await wipe();
  const pw = await hashPassword("x".repeat(24));

  /** 사람 하나를 세운다. `demo` 는 시연·검사 계정으로 적는다 */
  const mk = async (
    tag: string, { demo, roster, started, scored }:
    { demo: boolean; roster: boolean; started: boolean; scored: boolean },
  ): Promise<string> => {
    const r = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'홍길동',$2,'active','ko',$3,FALSE) RETURNING id::text`,
      [`rate-${tag}@test.invalid`, pw, demo]);
    const id = r?.id as string;
    if (roster) {
      await query(
        `INSERT INTO campus_students
           (user_id, university_code, student_id, college_code, department_code)
         VALUES ($1,'PCU',$2,$3,$4)`,
        [id, `R${tag}`, COL, DEP]);
    }
    if (started) {
      await query(
        `INSERT INTO v3_attempts
           (user_id, tier, core_code, education_stage, item_bank_version,
            scoring_version, university_code, college_code, department_code,
            status, submitted_at)
         VALUES ($1,'PRO','ME_CORE_V3','bachelor','x','y','PCU',$2,$3,$4,$5)`,
        [id, COL, DEP, scored ? "scored" : "in_progress",
          scored ? new Date() : null]);
    }
    return id;
  };

  /* A 명단에만 있는 사람 · B 명단에 있고 끝낸 사람 · C 명단 밖에서 친 사람 */
  const A = 4; const B = MIN_CELL; const C = 3;
  for (let i = 0; i < A; i++) {
    await mk(`a${i}`, { demo: false, roster: true, started: false, scored: false });
  }
  for (let i = 0; i < B; i++) {
    await mk(`b${i}`, { demo: false, roster: true, started: true, scored: true });
  }
  for (let i = 0; i < C; i++) {
    await mk(`c${i}`, { demo: false, roster: false, started: true, scored: true });
  }
  /* 시연 계정. **기본 집계에 한 명도 들어오면 안 된다** */
  const DEMO = 6;
  for (let i = 0; i < DEMO; i++) {
    await mk(`d${i}`, { demo: true, roster: true, started: true, scored: true });
  }

  const v = await campusV3({ orgIds: [], universityCode: "PCU" });

  /* ① 시연·검사 계정이 기본으로 빠진다 */
  ok(`시연 계정이 대상자에 들어오지 않는다 — 대상자 ${v.target}`,
    v.target === A + B + C, `기대 ${A + B + C}`);
  ok(`시연 계정이 시작한 수에 들어오지 않는다 — 시작 ${v.started}`,
    v.started === B + C, `기대 ${B + C}`);
  ok(`시연 계정이 완료한 수에 들어오지 않는다 — 완료 ${v.scored}`,
    v.scored === B + C, `기대 ${B + C}`);
  ok(`명단은 명단대로 센다 — 명단 ${v.roster}`,
    v.roster === A + B, `기대 ${A + B}`);

  /* ②③④ 세 부등식. **집계 자체가 맞아야 한다** */
  ok(`완료 ≤ 시작 — ${v.scored} ≤ ${v.started}`, v.scored <= v.started);
  ok(`시작 ≤ 대상자 — ${v.started} ≤ ${v.target}`, v.started <= v.target);
  ok(`완료 ≤ 대상자 — ${v.scored} ≤ ${v.target}`, v.scored <= v.target);

  /* ⑤ 비율. **clamp 가 아닌지까지 센다** */
  const want = Math.round((v.scored / v.target) * 100);
  ok(`완료율이 0 과 100 사이다 — ${v.completion}%`,
    v.completion !== null && v.completion >= 0 && v.completion <= 100);
  ok(`완료율이 완료 ÷ 대상자와 같다 (clamp 가 아니다) — ${v.completion}% · ${want}%`,
    v.completion === want);

  /* 단과대학 줄도 같은 부등식을 지킨다(규격 §21·§22). **줄마다 센다**:
     전체가 맞아도 한 줄이 어긋나면 그 줄을 본 담당자가 틀린 판단을 한다 */
  const rows = v.college_rows.filter((r) => r.target !== null);
  ok(`단과대학 줄이 섰다 — ${v.college_rows.length}줄`, v.college_rows.length > 0);
  for (const r of rows) {
    const t = r.target as number;
    const a = r.started ?? 0; const b = r.scored ?? 0;
    ok(`${r.code} — 완료 ${b} ≤ 시작 ${a} ≤ 대상자 ${t}`, b <= a && a <= t);
    ok(`${r.code} — 완료율이 0 과 100 사이다 (${String(r.rate)})`,
      r.rate === null || (r.rate >= 0 && r.rate <= 100));
  }

  /**
   * **`max(명단, 시작)` 이었다면 틀렸을 자리**를 그 자리에서 보인다.
   *
   * 명단 밖 응시가 섞인 날 둘 가운데 큰 쪽을 바닥으로 쓰면 A 가 분모에서
   * 빠지고, 비율이 참값보다 커진다. 합집합을 쓰면 그 일이 없다.
   */
  const wrongBase = Math.max(v.roster, v.started);
  ok(`옛 바닥(max)과 지금 바닥(합집합)이 다른 자리다 — ${wrongBase} · ${v.target}`,
    wrongBase !== v.target, "이 자리가 같으면 이 검사가 아무것도 세지 않는다");

  /* 명단 밖 응시가 하나도 없으면 대상자는 명단과 같다 */
  await query(`DELETE FROM v3_attempts WHERE user_id IN
                 (SELECT id FROM users WHERE login_id LIKE 'rate-c%@test.invalid')`);
  const v2 = await campusV3({ orgIds: [], universityCode: "PCU" });
  ok(`명단 밖 응시가 없으면 대상자가 명단과 같다 — ${v2.target} · ${v2.roster}`,
    v2.target === v2.roster);
  ok(`그때도 완료 ≤ 시작 ≤ 대상자 — ${v2.scored} ≤ ${v2.started} ≤ ${v2.target}`,
    v2.scored <= v2.started && v2.started <= v2.target);

  /* 아무도 시작하지 않고 명단도 없으면 **비율을 만들지 않는다** */
  await wipe();
  const v3 = await campusV3({ orgIds: [], universityCode: "PCU" });
  ok(`바닥이 0 이면 비율을 만들지 않는다 — ${String(v3.completion)}`,
    v3.completion === null && v3.target === 0);

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) process.exit(1);
}
void main();
