/**
 * 결과지를 찍기 전에 **사람 셋을 실제로 끝까지 응시시킨다.**
 *
 * 쓰는 사람은 셋이다. 관심만 높고 겪어 본 것이 거의 없는 학부생(P02) ·
 * 구조해석 석사(P04) · 근거가 강한 포닥(P12). 셋이 서로 **다른 결과지**를
 * 받아야 결과 엔진이 일을 한 것이다. 같은 화면이 세 번 나오면 그 결과지는
 * 사람을 가르지 못한다.
 *
 *   npx tsx scripts/v3-result-prep.ts      # 자리 목록을 JSON 으로
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { query, queryOne } from "../src/lib/db";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import {
  attemptOf, checklistFor, choosePack, content, itemOf, menuContextOf,
  moveTo, saveAnswer, savePicks, submit, viewOf, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import type { Answer, GradField, Stage, Tier } from "../src/lib/me-v3/scoring/types";

if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("운영에서는 돌리지 않습니다.");
  process.exit(2);
}

const LOGIN = "me-admin";
type Level = "none" | "mid" | "strong";

async function pick(a: V3Attempt, id: string, lv: Level): Promise<Answer | null> {
  const it = itemOf(id);
  if (!it) return null;
  const c = controlOf(it, await menuContextOf(a));
  if (c.kind === "level") {
    return { kind: "level", index: lv === "none" ? 0 : lv === "mid" ? 2 : 3 };
  }
  if (c.kind === "scale5") {
    return { kind: "scale5", value: lv === "none" ? 2 : lv === "mid" ? 4 : 5 };
  }
  if (c.kind === "exposure") {
    return { kind: "exposure", value: lv === "none" ? 0 : lv === "mid" ? 1 : 2 };
  }
  const o = c.options[0];
  return o ? { kind: "choice", value: o.value } : null;
}

async function freshAttempt(
  userId: string, tier: Tier, stage: Stage, field: GradField | null,
): Promise<V3Attempt> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts
       (user_id, tier, market_code, education_stage, grad_field,
        item_bank_version, scoring_version, current_screen)
     VALUES ($1,$2,'KR',$3,$4,'ME_V3_ITEM_BANK_V1','me-v3-scoring.1','profile')
     RETURNING id::text`,
    [userId, tier, stage, field]);
  return (await attemptOf(row?.id as string, userId)) as V3Attempt;
}

async function fillGrid(a: V3Attempt, want: Record<string, [number, number, number]>) {
  for (const d of content().domains.domains) {
    const g = want[d.code] ?? [3, 0, 3];
    await saveAnswer(a.id, `G_${d.code}_INT`, { kind: "scale5", value: g[0] });
    await saveAnswer(a.id, `G_${d.code}_EXP`, { kind: "exposure", value: g[1] });
    await saveAnswer(a.id, `G_${d.code}_LEA`, { kind: "scale5", value: g[2] });
  }
}

async function walk(
  a0: V3Attempt, userId: string, lv: Level,
  opt: { picks?: boolean; industry?: string; role?: string } = {},
) {
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null;
  for (let guard = 0; guard < 400; guard += 1) {
    const v = await viewOf(a, want);
    /* **선별 문항까지 전부 `내가 정했다` 로 답하지 않는다.** 그 영역에는
       근거를 고르는 화면이 없어서, 고른 항목 없이 소유만 높으면 응답 품질
       검사가 `다시 볼 것` 으로 적는다. 사람이 실제로 그렇게 답하지도 않는다 */
    const lvl: Level = v.screen.id.startsWith("probe-") && lv === "strong" ? "mid" : lv;
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const ans = await pick(a, id, lvl);
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain && opt.picks !== false) {
      for (const g of checklistFor(v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
      }
    }
    if (v.screen.kind === "pick-industry" && opt.industry) {
      await choosePack(a.id, "industry", opt.industry);
    }
    if (v.screen.kind === "pick-role" && opt.role) {
      await choosePack(a.id, "role", opt.role);
    }
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
  return (await attemptOf(a0.id, userId)) as V3Attempt;
}

async function userId(login: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [login]);
  if (!r) throw new Error(`계정이 없습니다: ${login}`);
  return r.id;
}

async function main() {
  const uid = await userId(LOGIN);
  await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [uid]);
  const out: { name: string; path: string; note: string; who: string; full?: boolean }[] = [];

  /* P02 관심만 높은 학부생 · BASIC. **무료도 완성형 화면이어야 한다** */
  const p02 = await freshAttempt(uid, "BASIC", "bachelor", null);
  await fillGrid(p02, { TD01: [5, 0, 5], TD02: [5, 0, 5], TD03: [4, 0, 4] });
  const a02 = await walk(p02, uid, "none", { picks: false });
  await submit(a02);
  out.push({ name: "r1_basic", who: "shots", full: true, note: "BASIC · 관심만 높은 학부생",
    path: `/v3/${a02.id}/result` });

  /* P04 구조해석 석사 · STANDARD */
  const p04 = await freshAttempt(uid, "STANDARD", "master", "STEM");
  await fillGrid(p04, { TD02: [5, 2, 5], TD01: [4, 1, 4], TD11: [4, 1, 4] });
  const a04 = await walk(p04, uid, "strong");
  await submit(a04);
  out.push({ name: "r2_standard", who: "shots", full: true, note: "STANDARD · 구조해석 석사",
    path: `/v3/${a04.id}/result` });

  /* P12 근거가 강한 포닥 · PRO. 산업과 역할을 고른다 */
  const p12 = await freshAttempt(uid, "PRO", "postdoc", "STEM");
  await fillGrid(p12, { TD02: [5, 2, 5], TD04: [5, 2, 5], TD07: [5, 2, 4] });
  const a12 = await walk(p12, uid, "strong", {
    industry: "INDUSTRY_SEMICON_V1", role: "ROLE_CAE_V1",
  });
  await submit(a12);
  out.push({ name: "r3_pro", who: "shots", full: true, note: "PRO · 근거가 강한 포닥",
    path: `/v3/${a12.id}/result` });
  out.push({ name: "r4_pro_top", who: "shots", note: "PRO · 첫 화면",
    path: `/v3/${a12.id}/result` });
  out.push({ name: "r5_pro_focus", who: "shots", note: "PRO · 먼저 볼 영역",
    path: `/v3/${a12.id}/result#focus` });
  out.push({ name: "r6_pro_evidence", who: "shots", note: "PRO · 근거",
    path: `/v3/${a12.id}/result#evidence` });
  out.push({ name: "r7_pro_gaps", who: "shots", note: "PRO · 채울 것",
    path: `/v3/${a12.id}/result#gaps` });
  out.push({ name: "r8_pro_industry", who: "shots", note: "PRO · 산업",
    path: `/v3/${a12.id}/result#industry` });
  out.push({ name: "r9_pro_role", who: "shots", note: "PRO · 역할",
    path: `/v3/${a12.id}/result#role` });
  out.push({ name: "r10_pro_plan", who: "shots", note: "PRO · 다음에 할 일",
    path: `/v3/${a12.id}/result#plan` });
  out.push({ name: "r11_standard_focus", who: "shots", note: "STANDARD · 먼저 볼 영역",
    path: `/v3/${a04.id}/result#focus` });
  out.push({ name: "r12_basic_zones", who: "shots", note: "BASIC · 열두 영역",
    path: `/v3/${a02.id}/result#zones` });

  console.log(JSON.stringify({ users: { shots: LOGIN }, targets: out }));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
