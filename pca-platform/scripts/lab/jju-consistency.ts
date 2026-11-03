/**
 * **전주대 견본: 웹 결과와 종이(PRO 책자)가 같은 수를 내는가.**
 *
 * 학교가 발급한 계정으로 학과 맥락의 PRO 응시를 열고 사람 C 의 규칙으로 끝까지 답한 뒤 굳힌다.
 * 그다음 웹이 읽는 지역 회사 묶음(`webRegionView`)과 책이 읽는 묶음(`assemble` 안의 `regionView`)을
 * 같은 응시에서 나란히 센다. 판정을 여기서 하지 않는다.
 *
 *   LEAVES=JJU26_BIZ,JJU26_CS npx tsx scripts/lab/jju-consistency.ts → var/jju-consistency/cases.json
 */
import { loadEnv, makeStudent, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import { allLeaves, university } from "../../src/lib/campus/registry";
import { attemptOf, openAttempt, submit, type CampusEntry, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
import { answerAll, PEOPLE } from "../_v3-answer";

const LEAVES = (process.env.LEAVES ?? "JJU26_BIZ").split(",");
const PERSON = process.env.PERSON ?? "C";
const OUT = "var/jju-consistency";

async function build(leafCode: string): Promise<{ leaf: string; core: string; attempt: string; user: string; login: string; pw: string }> {
  const u = university("JJU")!;
  const found = allLeaves(u).find((r) => r.leaf.code === leafCode);
  if (!found?.leaf.core_code) throw new Error(`Core 가 없는 자리: ${leafCode}`);
  const core = found.leaf.core_code;
  const login = `zzjju-${leafCode.toLowerCase()}-${PERSON.toLowerCase()}-${Date.now() % 100000}`;
  const st = await makeStudent(login);
  await registerCampusStudent(st.id, "JJU", leafCode);
  const campus: CampusEntry = { university_code: "JJU", college_code: found.college.code,
    department_code: leafCode, core_code: core, specialization: found.leaf.specialization ?? null };
  const a0 = await openAttempt({ userId: st.id, tier: "PRO", stage: "bachelor" as never, gradField: null, campus });
  const pol = PEOPLE.find((p) => p.id === PERSON)!;
  await answerAll(core, a0, st.id, pol);
  await submit((await attemptOf(a0.id, st.id)) as V3Attempt);
  return { leaf: leafCode, core, attempt: a0.id, user: st.id, login, pw: st.pw };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const out = [];
  for (const l of LEAVES) out.push(await build(l));
  writeFileSync(`${OUT}/cases.json`, JSON.stringify(out, null, 1));
  console.log(out.map((o) => `${o.leaf} ${o.core} → 응시 ${o.attempt}`).join("\n"));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
