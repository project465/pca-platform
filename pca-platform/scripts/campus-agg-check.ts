/**
 * **Campus 집계가 학교 진입으로 들어온 응시를 잡는가.**
 *
 * 소속으로만 묶으면 `/campus/{학교}` 로 혼자 들어온 학생이 담당자 화면에
 * 한 명도 잡히지 않고, **그 빈 화면을 담당자는 `아직 아무도 안 쳤다` 로
 * 읽는다.** 그래서 소속이 한 줄도 없는 사람 여섯을 만들어 학교로만
 * 잡히는지 보고, 다섯이 안 되는 학과에서 **값이 만들어지지 않는지**까지
 * 본다.
 *
 * 쓴 자료는 끝에서 지운다.
 *
 *   npm run campus:walk
 */
import { loadEnv } from "./_loop-fixture";
loadEnv();
import { query, queryOne } from "../src/lib/db";
import { campusV3 } from "../src/lib/me-v3/campus";
import { hashPassword } from "../src/lib/password";
import { MIN_CELL } from "../src/lib/org";

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

async function main(): Promise<void> {
  /* 시험용 학교 기관 하나 */
  await query(`DELETE FROM v3_attempts WHERE university_code = 'PCU'`);
  await query(`DELETE FROM memberships WHERE user_id IN
                 (SELECT id FROM users WHERE login_id LIKE 'agg-%@test.invalid')`);
  await query(`DELETE FROM users WHERE login_id LIKE 'agg-%@test.invalid'`);

  const pw = await hashPassword("x".repeat(24));
  const ids: string[] = [];
  for (let i = 0; i < MIN_CELL + 1; i++) {
    const r = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'홍길동',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [`agg-${i}@test.invalid`, pw]);
    ids.push(r?.id as string);
    await query(
      `INSERT INTO v3_attempts
         (user_id, tier, core_code, education_stage, item_bank_version,
          scoring_version, university_code, college_code, department_code)
       VALUES ($1,'BASIC','ME_CORE_V3','bachelor','x','y','PCU','AI_SW',$2)`,
      [r?.id, i < 5 ? "PCU_EE" : "PCU_CS_COMPUTER"]);
  }

  /* **소속이 한 줄도 없다.** 학교 진입만으로 잡혀야 한다 */
  const v = await campusV3({ orgIds: [], universityCode: "PCU" });
  ok(`학교 진입만으로 응시가 잡힌다 — ${v.started}명`, v.started === MIN_CELL + 1);
  ok("단과대학 칸이 선다", v.by_college.length === 1
    && v.by_college[0].key === "AI_SW", JSON.stringify(v.by_college));
  ok("학과 칸이 둘로 갈린다", v.by_department.length === 2,
    JSON.stringify(v.by_department));
  /* 다섯이 안 되는 칸은 **값이 만들어지지 않는다** */
  const small = v.by_department.find((c) => c.key === "PCU_CS_COMPUTER");
  ok(`${MIN_CELL}명 미만 학과는 숫자를 내지 않는다`, small?.n === null,
    JSON.stringify(small));
  const big = v.by_department.find((c) => c.key === "PCU_EE");
  ok(`${MIN_CELL}명 이상 학과는 숫자를 낸다`, big?.n === 5, JSON.stringify(big));

  /* 학교를 안 넘기면 한 명도 잡히지 않는다 */
  const none = await campusV3({ orgIds: [], universityCode: null });
  ok("학교도 소속도 없으면 집계가 비어 있다", none.started === 0);

  for (const id of ids) {
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [id]);
    await query(`DELETE FROM memberships WHERE user_id = $1`, [id]);
    await query(`DELETE FROM users WHERE id = $1`, [id]);
  }
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) process.exit(1);
}
void main();
