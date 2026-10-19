/**
 * **PDF GOLD MASTER · BIZ 검토 응시 셋.** 제품의 `submit()` 으로 굳힌다.
 *
 *   RICH   근거가 많은 학생: 원본 응답 + 세 영역에서 체크리스트·결과물·견준 대상을 고른다
 *   POOR   근거가 적은 학생: 같은 응답, 근거를 하나도 고르지 않는다
 *   CONTRA 서로 어긋난 응답: 원본 431(응답 품질 REVIEW · CHECKLIST_MISMATCH_HIGH)을 그대로 쓴다
 *
 * **판정을 여기서 하지 않는다.** 응답은 원본 응시에서 그대로 옮기고 고르는 항목은 그
 * 영역의 체크리스트에서 앞에서부터 집는다.
 *
 *   SRC=74 npx tsx scripts/lab/gm-cases.ts      → var/pdf-gm/cases.json
 */
import { loadEnv, makeStudent, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { allLeaves, university } from "../../src/lib/campus/registry";
import {
  attemptOf, checklistFor, choosePack, moveTo, openAttempt, saveAnswer, savePicks, submit,
  viewOf, type CampusEntry, type V3Attempt,
} from "../../src/lib/me-v3/runtime/session";
import type { Answer } from "../../src/lib/me-v3/scoring/types";

const SRC = process.env.SRC ?? "74";
const CORE = "BIZ_CORE_V1", LEAF = "PCU26_BIZ";
const OUT = "var/pdf-gm";

async function build(mode: "RICH" | "POOR"): Promise<string> {
  const src = (await queryOne<{ education_stage: string; industry_pack: string | null; role_pack: string | null }>(
    `SELECT education_stage, industry_pack, role_pack FROM v3_attempts WHERE id = $1`, [SRC]))!;
  const rows = await query<{ item_id: string; kind: string; value_int: number | null; value_text: string | null }>(
    `SELECT item_id, kind, value_int, value_text FROM v3_responses WHERE attempt_id = $1 ORDER BY answered_at, item_id`, [SRC]);
  const st = await makeStudent(`zzgm-biz-${mode.toLowerCase()}`);
  await registerCampusStudent(st.id, "PCU", LEAF);
  const found = allLeaves(university("PCU")!).find((r) => r.leaf.code === LEAF)!;
  const campus: CampusEntry = { university_code: "PCU", college_code: found.college.code,
    department_code: LEAF, core_code: CORE, specialization: found.leaf.specialization ?? null };
  const a0 = await openAttempt({ userId: st.id, tier: "PRO", stage: src.education_stage as never,
    gradField: null, campus });
  for (const r of rows) {
    const ans: Answer | null =
      r.kind === "level" ? { kind: "level", index: r.value_int ?? 0 }
      : r.kind === "scale5" ? { kind: "scale5", value: r.value_int ?? 0 }
      : r.kind === "exposure" ? { kind: "exposure", value: r.value_int ?? 0 }
      : r.kind === "choice" ? { kind: "choice", value: r.value_text ?? "" } : null;
    if (ans) await saveAnswer(a0.id, r.item_id, ans);
  }
  let a = (await attemptOf(a0.id, st.id)) as V3Attempt;
  const domains: string[] = []; let want: string | null = null; let guard = 0;
  for (;;) {
    if ((guard += 1) > 500) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    if (mode === "RICH" && v.screen.kind === "checklist" && v.screen.domain
      && (domains.includes(v.screen.domain) || domains.length < 3)) {
      if (!domains.includes(v.screen.domain)) domains.push(v.screen.domain);
      for (const g of checklistFor(CORE, v.screen.domain)) {
        const n = g.slot === "ARTIFACT" || g.slot === "VERIFY" ? 1 : 2;
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, Math.min(n, g.items.length)));
      }
    }
    if (v.screen.kind === "pick-industry" && src.industry_pack) await choosePack(CORE, a.id, "industry", src.industry_pack);
    if (v.screen.kind === "pick-role" && src.role_pack) await choosePack(CORE, a.id, "role", src.role_pack);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId); want = v.nextId;
    a = (await attemptOf(a.id, st.id)) as V3Attempt;
  }
  await submit((await attemptOf(a.id, st.id)) as V3Attempt);
  return a.id;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const cases = { RICH: await build("RICH"), POOR: await build("POOR"), CONTRA: "431" };
  writeFileSync(`${OUT}/cases.json`, JSON.stringify(cases, null, 1));
  console.log(cases);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
