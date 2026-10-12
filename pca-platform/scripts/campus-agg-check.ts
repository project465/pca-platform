/**
 * **Campus 집계가 학교 진입으로 들어온 응시를 잡는가.**
 *
 * 소속으로만 묶으면 `/campus/{학교}` 로 혼자 들어온 학생이 담당자 화면에
 * 한 명도 잡히지 않고, **그 빈 화면을 담당자는 `아직 아무도 안 쳤다` 로
 * 읽는다.** 그래서 소속이 한 줄도 없는 사람 여섯을 만들어 학교로만
 * 잡히는지 보고, 다섯이 안 되는 학과에서 **값이 만들어지지 않는지**까지
 * 본다.
 *
 * 그리고 **학년도별 Catalog 가 집계에서 어떻게 보이는가**를 센다. 개편 전
 * 학과와 개편 후 학과는 **서로 다른 줄**이어야 한다: 한 줄로 뭉개면
 * 담당자가 개편으로 무엇이 달라졌는지 볼 수 없다. 단과대학은 반대로 한
 * 줄이다: 같은 단과대학이기 때문이다.
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
import { allLeaves, university, wave1Of } from "../src/lib/campus/registry";

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

async function main(): Promise<void> {
  const u = university("PCU");
  if (!u) { console.error("등록부에 PCU 가 없습니다."); process.exit(1); }

  /**
   * **코드를 적어 두지 않고 등록부에서 읽는다.** 같은 Core 를 두 Catalog 가
   * 함께 쓰는 자리를 골라, 개편 전 자리와 개편 후 자리를 한 쌍으로 쓴다.
   */
  const ee = wave1Of(u).find((r) => r.leaves.length >= 2);
  if (!ee) { console.error("두 Catalog 가 함께 쓰는 Core 가 없습니다."); process.exit(1); }
  const years = [...new Set(ee.leaves.map((x) => x.catalog.catalog_year))]
    .sort((a, b) => a - b);
  const older = ee.leaves.find((x) => x.catalog.catalog_year === years[0]);
  const newer = ee.leaves.find((x) => x.catalog.catalog_year === years[1]);
  if (!older || !newer) {
    console.error("한 Core 가 두 학년도의 자리를 함께 열지 않습니다.");
    process.exit(1);
  }
  const OLD = older.leaf.code;
  const NEW = newer.leaf.code;
  const COL = older.college.code;
  ok(`한 Core 가 두 학년도의 자리를 함께 연다 — ${OLD} · ${NEW}`,
    older.college.code === newer.college.code);

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
       VALUES ($1,'BASIC','ME_CORE_V3','bachelor','x','y','PCU',$2,$3)`,
      [r?.id, COL, i < MIN_CELL ? OLD : NEW]);
  }

  /* **소속이 한 줄도 없다.** 학교 진입만으로 잡혀야 한다 */
  const v = await campusV3({ orgIds: [], universityCode: "PCU" });
  ok(`학교 진입만으로 응시가 잡힌다 — ${v.started}명`, v.started === MIN_CELL + 1);
  /* 두 Catalog 의 자리가 같은 단과대학이면 **한 줄로 굴러간다** */
  ok("단과대학 칸이 한 줄로 선다", v.by_college.length === 1
    && v.by_college[0].key === COL, JSON.stringify(v.by_college));
  ok("개편 전 자리와 개편 후 자리가 서로 다른 줄이다",
    v.by_department.length === 2, JSON.stringify(v.by_department));
  /* 다섯이 안 되는 칸은 **값이 만들어지지 않는다** */
  const small = v.by_department.find((c) => c.key === NEW);
  ok(`${MIN_CELL}명 미만 학과는 숫자를 내지 않는다`, small?.n === null,
    JSON.stringify(small));
  const big = v.by_department.find((c) => c.key === OLD);
  ok(`${MIN_CELL}명 이상 학과는 숫자를 낸다`, big?.n === MIN_CELL,
    JSON.stringify(big));

  /**
   * **담당자 화면이 두 코드를 전부 이름으로 읽을 수 있는가.**
   *
   * 집계가 내놓는 것은 코드이고 화면에 서는 것은 이름이다. 한쪽
   * Catalog 만 읽으면 개편 후 학과가 코드로 그대로 찍힌다.
   */
  const names = new Map(allLeaves(u).map((r) => [r.leaf.code, r.leaf.name]));
  const unread = v.by_department.map((c) => c.key).filter((k) => !names.has(k));
  ok("집계에 적힌 코드를 전부 이름으로 읽는다", !unread.length, unread.join(" "));

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
