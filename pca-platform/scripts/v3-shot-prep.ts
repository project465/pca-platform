/**
 * 검사 화면을 찍기 전에 **실제 응시 다섯 벌을 DB 에 만든다.**
 *
 * 화면만 그려 놓고 찍으면 그 그림은 자료 없이 세운 화면이고, 다음에
 * 깨졌을 때 아무것도 못 찾는다. 사람 다섯 벌을 끝까지 걸어 두고 **보고
 * 싶은 자리의 번호**를 돌려주면, 찍는 쪽은 로그인해서 그 주소로 가면
 * 된다.
 *
 * 응답은 **화면이 내놓는 보기 값 그대로** 넣는다(`controlOf`). 검사용
 * 값을 따로 쓰면 고른 자리가 화면에 안 나타나고, 그 어긋남을 찍은 그림이
 * 가려 준다.
 *
 *   npx tsx scripts/v3-shot-prep.ts        # 자리 목록을 JSON 으로
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
  moveTo, planFor, saveAnswer, savePicks, submit, viewOf, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import type { Answer, GradField, Stage, Tier } from "../src/lib/me-v3/scoring/types";

if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("운영에서는 돌리지 않습니다.");
  process.exit(2);
}

/** 화면을 찍을 계정. `scripts/seed.ts` 가 만든 개발용이다 */
const SHOT_LOGIN = "me-admin";
/** 시작 화면을 찍을 계정. **이어 볼 응시가 없어야 그 화면이 뜬다** */
const START_LOGIN = "admin";

type Level = "none" | "mid" | "strong";

/** 응답 하나. 화면이 내놓는 보기 가운데 고른다 */
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

/** 처음부터 끝까지 넘기며 답한다. 이미 답한 자리는 덮지 않는다 */
async function walk(a0: V3Attempt, userId: string, lv: Level, picks = true) {
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null;
  for (let guard = 0; guard < 400; guard += 1) {
    const v = await viewOf(a, want);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const ans = await pick(a, id, lv);
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain && picks) {
      for (const g of checklistFor(v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
      }
    }
    if (v.screen.kind === "pick-industry") await choosePack(a.id, "industry", "INDUSTRY_SEMICON_V1");
    if (v.screen.kind === "pick-role") await choosePack(a.id, "role", "ROLE_CAE_V1");
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
  if (!r) throw new Error(`계정이 없습니다: ${login}. npm run db:seed 를 먼저 돌리십시오`);
  return r.id;
}

/** 화면 이름으로 번호를 찾는다. **번호는 routing 으로 달라진다** */
async function at(a: V3Attempt, match: (id: string, kind: string) => boolean): Promise<number> {
  const plan = await planFor(a);
  const i = plan.screens.findIndex((s) => match(s.id, s.kind));
  return i;
}

async function main() {
  const shots = await userId(SHOT_LOGIN);
  const starter = await userId(START_LOGIN);
  /* 같은 계정에 응시가 쌓이면 어느 것을 보는지 알 수 없다 */
  await query(`DELETE FROM v3_attempts WHERE user_id = ANY($1)`, [[shots, starter]]);

  const out: { name: string; path: string; note: string; full?: boolean; who: string }[] = [];
  out.push({
    name: "01_start", path: "/v3/start", who: "starter", full: true,
    note: "검사 시작",
  });

  /* P01 경험 거의 없는 학부생 · BASIC */
  const p01 = await freshAttempt(shots, "BASIC", "bachelor", null);
  await fillGrid(p01, { TD01: [4, 0, 4], TD02: [3, 0, 3] });
  const a01 = await walk(p01, shots, "none");
  out.push({ name: "02_grid", who: "shots", note: "BASIC 영역 격자",
    path: `/v3/${a01.id}?s=${await at(a01, (id) => id === "grid-TD01")}` });
  out.push({ name: "03_judge", who: "shots", note: "BASIC 공통 판단",
    path: `/v3/${a01.id}?s=${await at(a01, (id) => id.startsWith("judge-"))}` });
  out.push({ name: "04_profile", who: "shots", note: "기본 정보",
    path: `/v3/${a01.id}?s=0` });

  /* P03 캡스톤 학생 · STANDARD */
  const p03 = await freshAttempt(shots, "STANDARD", "bachelor", null);
  await fillGrid(p03, { TD01: [5, 2, 5], TD08: [4, 1, 4], TD02: [4, 1, 3] });
  const a03 = await walk(p03, shots, "mid");
  out.push({ name: "05_transition", who: "shots", note: "묶음 전환",
    path: `/v3/${a03.id}?s=${await at(a03, (_id, k) => k === "transition")}` });
  out.push({ name: "06_domain", who: "shots", note: "기술영역 선별 문항",
    path: `/v3/${a03.id}?s=${await at(a03, (id) => id.startsWith("probe-"))}` });

  /* P04 구조해석 석사 · PRO */
  const p04 = await freshAttempt(shots, "PRO", "master", "STEM");
  await fillGrid(p04, { TD02: [5, 2, 5], TD01: [5, 2, 4], TD11: [4, 1, 4] });
  const a04 = await walk(p04, shots, "strong");
  out.push({ name: "07_ownership", who: "shots", note: "소유 보기 넷",
    path: `/v3/${a04.id}?s=${await at(a04, (id) => /^probe-.*_J5$/.test(id))}` });
  out.push({ name: "08_checklist", who: "shots", note: "근거 고르기",
    path: `/v3/${a04.id}?s=${await at(a04, (_id, k) => k === "checklist")}` });
  out.push({ name: "09_industry", who: "shots", note: "산업 고르기",
    path: `/v3/${a04.id}?s=${await at(a04, (_id, k) => k === "pick-industry")}` });
  out.push({ name: "10_role", who: "shots", note: "역할 고르기",
    path: `/v3/${a04.id}?s=${await at(a04, (_id, k) => k === "pick-role")}` });
  out.push({ name: "11_pref", who: "shots", note: "역할 선호",
    path: `/v3/${a04.id}?s=${await at(a04, (id) => id === "pref-rf")}` });
  out.push({ name: "12_translate", who: "shots", note: "경험 번역",
    path: `/v3/${a04.id}?s=${await at(a04, (id) => id.startsWith("trans-"))}` });
  out.push({ name: "13_done", who: "shots", note: "완료 · 제출 전",
    path: `/v3/${a04.id}?s=${await at(a04, (_id, k) => k === "done")}` });

  /* P09 재료 박사 · PRO. 끝까지 제출해 둔다 */
  const p09 = await freshAttempt(shots, "PRO", "phd", "STEM");
  await fillGrid(p09, { TD06: [5, 2, 5], TD07: [5, 2, 4], TD02: [4, 1, 3] });
  const a09 = await walk(p09, shots, "strong");
  await submit(a09);
  out.push({ name: "14_submitted", who: "shots", note: "완료 · 제출 뒤",
    path: `/v3/${a09.id}?s=${await at(a09, (_id, k) => k === "done")}` });

  /* P12 경험 강한 포닥 · PRO */
  const p12 = await freshAttempt(shots, "PRO", "postdoc", "STEM");
  await fillGrid(p12, { TD02: [5, 2, 5], TD04: [5, 2, 5], TD07: [5, 2, 4] });
  const a12 = await walk(p12, shots, "strong");
  out.push({ name: "15_deep", who: "shots", note: "심화 · 포닥 장면",
    path: `/v3/${a12.id}?s=${await at(a12, (id) => /^deep-.*_J1$/.test(id))}` });

  console.log(JSON.stringify({
    users: { shots: SHOT_LOGIN, starter: START_LOGIN },
    targets: out,
  }));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
