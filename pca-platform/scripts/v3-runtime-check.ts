/**
 * 응시가 실제 DB 로 끝까지 도는가. **사람 다섯 벌로 돌린다.**
 *
 * 묻는 것: routing 이 응답을 따라오는가 · 저장과 이어보기가 되는가 ·
 * 뒤로 가서 고치면 다시 셈하는가 · 등급을 올릴 때 앞 응답을 다시 묻지
 * 않는가 · 산업과 역할 선택이 기술영역을 바꾸지 않는가.
 *
 *   npm run v3:runtime
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* tsx 는 .env.local 을 자동으로 읽지 않는다 */
for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { query, queryOne } from "../src/lib/db";
import { coreOnly } from "../src/lib/me-v3/scoring/engine";
import { stable } from "../src/lib/me-v3/scoring/fixtures";
import type { Answer, Tier } from "../src/lib/me-v3/scoring/types";
import {
  answersOf, attemptOf, checklistFor, choosePack, content, currentAttempt,
  domainName, latestSnapshot, moveTo, newScreensAfterUpgrade, openAttempt,
  picksOf, planFor, saveAnswer, savePicks, submit, upgradeTier, viewOf,
  type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import { pickDomains } from "../src/lib/me-v3/runtime/routing";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const LOGIN = "v3runtime@example.com";

async function testUser(): Promise<string> {
  const found = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [LOGIN]);
  if (found) return found.id;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, is_demo)
     VALUES ($1,$1,'V3 런타임 점검','x','active','ko',TRUE) RETURNING id::text`, [LOGIN]);
  return row?.id as string;
}

async function freshAttempt(userId: string, tier: Tier, stage: V3Attempt["education_stage"],
                             field: V3Attempt["grad_field"]): Promise<V3Attempt> {
  await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [userId]);
  return openAttempt({ userId, tier, stage, gradField: field });
}

/** 격자를 채운다. 적지 않은 영역은 가운데 값 */
async function fillGrid(a: V3Attempt, want: Record<string, [number, number, number]>) {
  for (const d of content().domains.domains) {
    const g = want[d.code] ?? [3, 0, 3];
    await saveAnswer(a.id, `G_${d.code}_INT`, { kind: "scale5", value: g[0] });
    await saveAnswer(a.id, `G_${d.code}_EXP`, { kind: "exposure", value: g[1] });
    await saveAnswer(a.id, `G_${d.code}_LEA`, { kind: "scale5", value: g[2] });
  }
}

/** 화면을 처음부터 끝까지 넘기며 답한다. 사람이 누르는 순서와 같다 */
async function walk(a0: V3Attempt, userId: string, answer: (id: string) => Answer | null,
                    picks = true): Promise<{ screens: number; answered: number }> {
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let screens = 0, answered = 0, guard = 0;
  let want: string | null = null;
  for (;;) {
    guard += 1;
    if (guard > 400) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    screens += 1;
    for (const id of v.screen.items) {
      /* 이미 답한 자리는 덮지 않는다. 사람은 같은 문항을 두 번 누르지 않고,
         덮으면 격자로 고른 영역이 걸으면서 바뀐다 */
      if (v.answers[id]) continue;
      const ans = answer(id);
      if (ans) { await saveAnswer(a.id, id, ans); answered += 1; }
    }
    if (v.screen.kind === "checklist" && v.screen.domain && picks) {
      /* 축마다 둘을 고른다. 소유는 근거 둘 이상일 때만 선다 */
      for (const g of checklistFor(v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
      }
    }
    if (v.screen.kind === "pick-industry") await choosePack(a.id, "industry", "INDUSTRY_MOBILITY_V2");
    if (v.screen.kind === "pick-role") await choosePack(a.id, "role", "ROLE_CAE_V2");
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
  return { screens, answered };
}

const strong = (id: string): Answer | null => {
  const it = content().bank.items.find((x) => x.item_id === id);
  if (!it) return null;
  if (it.response_scale === "L0~L3") return { kind: "level", index: 3 };
  if (it.response_scale === "5점") return { kind: "scale5", value: 5 };
  if (it.response_scale === "4보기") return { kind: "level", index: 2 };
  if (it.module === "CORE-FORCE") return { kind: "choice", value: "A" };
  if (it.module === "TRANS-10" || it.module === "TARGET") return { kind: "choice", value: "x" };
  return null;
};
const none = (id: string): Answer | null => {
  const it = content().bank.items.find((x) => x.item_id === id);
  if (!it) return null;
  if (it.response_scale === "L0~L3") return { kind: "level", index: 0 };
  if (it.response_scale === "5점") return { kind: "scale5", value: 2 };
  if (it.response_scale === "4보기") return { kind: "level", index: 0 };
  return null;
};

async function main(): Promise<void> {
  const userId = await testUser();
  const tds = content().domains.domains.map((d) => d.code);
  console.log(`  사용자 ${userId} · 영역 ${tds.length}\n`);

  /* 1. 선별 영역은 경험이 있는 쪽을 먼저 본다 */
  const g1: Record<string, [number, number, number]> = {
    TD01: [5, 2, 5], TD08: [4, 1, 4], TD02: [5, 0, 5],
  };
  const pick = pickDomains(Object.fromEntries(tds.map((td) => {
    const v = g1[td] ?? [3, 0, 3];
    return [td, { interest: v[0], exposure: v[1], learning: v[2] }];
  })), "STANDARD", tds);
  const basicPick = pickDomains(Object.fromEntries(tds.map((td) => {
    const v = g1[td] ?? [3, 0, 3];
    return [td, { interest: v[0], exposure: v[1], learning: v[2] }];
  })), "BASIC", tds);
  ok("선별 영역은 경험이 있는 쪽을 먼저 본다",
     basicPick.probe.join(",") === "TD01,TD08" && basicPick.deep.length === 0,
     `BASIC ${basicPick.probe.join(",")} · 유료 ${pick.probe.join(",")}`);
  ok("심화는 기본 셋이고 선별 둘을 품는다",
     pick.deep.length === 3 && pick.deep.includes("TD01") && pick.deep.includes("TD08"),
     `${pick.deep.join(",")} · ${pick.trace[pick.trace.length - 2] ?? ""}`);

  /* 2. 넷째 영역이 조건에서만 열린다 */
  const flat = Object.fromEntries(tds.map((td) =>
    [td, { interest: 4, exposure: 1, learning: 4 }]));
  const tied = pickDomains(flat, "STANDARD", tds);
  ok("전부 묶이면 넷째가 열린다",
     tied.deep.length === 4 && tied.fourth_reason === "ALL_TIED",
     `${tied.fourth_reason} · ${tied.deep.join(",")}`);
  const clear = Object.fromEntries(tds.map((td, n) =>
    [td, { interest: 5 - Math.min(4, n), exposure: n < 4 ? 2 : 0, learning: 3 }]));
  const noFourth = pickDomains(clear, "STANDARD", tds);
  ok("또렷하면 넷째가 열리지 않는다",
     noFourth.deep.length === 3 && noFourth.fourth_reason === null,
     noFourth.deep.join(","));

  /* 2-1. 심화 영역은 선별 네 축도 함께 열린다.
          여덟 축 가운데 넷만 답한 영역은 구조적으로 근거가 설 수 없다 */
  ok("심화 영역은 선별 네 축도 함께 열린다",
     pick.deep.every((td) => pick.probe.includes(td)) &&
     tied.deep.every((td) => tied.probe.includes(td)),
     `선별 ${pick.probe.length}개 · 심화 ${pick.deep.length}개`);

  /* 3. P01 경험 거의 없는 학부생 · BASIC */
  const p01 = await freshAttempt(userId, "BASIC", "bachelor", null);
  await fillGrid(p01, { TD01: [3, 0, 3], TD02: [3, 0, 3] });
  const w01 = await walk(p01, userId, none);
  const a01 = (await attemptOf(p01.id, userId)) as V3Attempt;
  const s01 = await submit(a01);
  ok("P01 경험 없는 학부생이 끝까지 간다",
     w01.screens > 25 && s01.snapshot.zones.Z1_EVIDENCE_ESTABLISHED.length === 0,
     `화면 ${w01.screens} · 응답 ${w01.answered} · 근거 없음`);
  ok("BASIC 은 심화 영역을 열지 않는다", a01.opened_deep.length === 0,
     `선별 ${a01.opened_probe.join(",")}`);

  /* 4. P03 캡스톤 학생 · STANDARD. 저장과 이어보기 */
  const p03 = await freshAttempt(userId, "STANDARD", "bachelor", null);
  await fillGrid(p03, { TD01: [5, 2, 5], TD08: [4, 1, 4], TD02: [4, 1, 3] });
  const v0 = await viewOf(p03);
  await moveTo(p03.id, "grid-TD03");
  const resumed = await viewOf((await attemptOf(p03.id, userId)) as V3Attempt);
  ok("이어 들어오면 마지막 화면이 열린다", resumed.screen.id === "grid-TD03",
     `${v0.screen.id} → ${resumed.screen.id}`);
  const w03 = await walk(p03, userId, strong);
  const a03 = (await attemptOf(p03.id, userId)) as V3Attempt;
  const snapAll = (await submit((await attemptOf(p03.id, userId)) as V3Attempt)).snapshot;
  ok("고른 심화 영역이 전부 여덟 축을 받는다",
     a03.opened_deep.every((td) =>
       (snapAll.domains.find((d) => d.code === td)?.empty.length ?? 8) === 0),
     a03.opened_deep.map((td) =>
       `${td}:${snapAll.domains.find((d) => d.code === td)?.confirmed.length}`).join(" "));
  ok("P03 캡스톤 학생이 끝까지 간다", w03.screens > 45,
     `화면 ${w03.screens} · 응답 ${w03.answered} · 심화 ${a03.opened_deep.join(",")}`);
  const saved = await answersOf(a03.id);
  const picks03 = await picksOf(a03.id);
  /* 격자 서른여섯은 걸어 들어가기 전에 넣었으므로 걸으며 센 수보다 많다 */
  const landed = ["G_TD01_INT", "TD01_J3", "TD01_J1", "PR_RF1", "CN_1A"]
    .filter((id) => !!saved[id]);
  ok("응답과 근거가 DB 에 남는다",
     landed.length === 5 && Object.keys(picks03.checklists).length > 0 &&
     Object.keys(picks03.artifacts).length > 0,
     `응답 ${Object.keys(saved).length} · 격자·선별·심화·선호·일관성 ${landed.length}/5` +
     ` · 근거 칸 ${Object.keys(picks03.checklists).length}` +
     ` · 산출물 ${Object.keys(picks03.artifacts).length}`);
  const s03 = await submit(a03);
  ok("제출하면 판정이 한 줄 남는다",
     !!(await latestSnapshot(a03.id)) &&
     s03.snapshot.module_versions.item_bank_version === a03.item_bank_version,
     `근거 ${s03.snapshot.zones.Z1_EVIDENCE_ESTABLISHED.join(",") || "없음"}`);

  /* 5. 뒤로 가서 격자를 고치면 routing 을 다시 센다 */
  const back = await freshAttempt(userId, "STANDARD", "master", "STEM");
  await fillGrid(back, { TD01: [5, 2, 5], TD08: [4, 1, 4], TD02: [3, 0, 3] });
  const before = (await viewOf(back)).attempt.opened_deep.join(",");
  await saveAnswer(back.id, "G_TD03_EXP", { kind: "exposure", value: 2 });
  await saveAnswer(back.id, "G_TD03_INT", { kind: "scale5", value: 5 });
  const after = (await viewOf((await attemptOf(back.id, userId)) as V3Attempt))
    .attempt.opened_deep.join(",");
  ok("뒤로 가서 고치면 심화 영역을 다시 센다",
     before !== after && after.includes("TD03"), `${before} → ${after}`);

  /* 6. 등급을 올릴 때 앞 응답을 다시 묻지 않는다 */
  const up = await freshAttempt(userId, "BASIC", "master", "STEM");
  await fillGrid(up, { TD02: [5, 2, 5], TD03: [4, 2, 4], TD07: [4, 1, 3] });
  await walk(up, userId, strong);
  const basicDone = (await attemptOf(up.id, userId)) as V3Attempt;
  const answersBefore = Object.keys(await answersOf(up.id)).length;
  const basicPlan = (await planFor(basicDone)).screens.length;
  const toStd = await upgradeTier(up.id, userId, "STANDARD");
  const added = await newScreensAfterUpgrade(toStd, "BASIC");
  const answersAfter = Object.keys(await answersOf(up.id)).length;
  ok("등급을 올려도 앞 응답이 그대로 있다", answersBefore === answersAfter,
     `${answersBefore}개`);
  ok("올린 뒤 새로 묻는 화면만 더해진다",
     added.added.length > 15 &&
     added.added.every((s) => ["EXPLORE", "JUDGE", "DEEP", "EVIDENCE", "PACK"]
       .includes(s.stage)),
     `새 화면 ${added.added.length}(${[...new Set(added.added.map((s) => s.stage))].join("·")})` +
     ` · 앞 화면 ${basicPlan}`);
  const sameAttempt = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_attempts WHERE user_id=$1`, [userId]);
  ok("새 응시를 만들지 않는다", sameAttempt[0].n === "1", `응시 ${sameAttempt[0].n}개`);
  const ev = await query<{ from_tier: string; to_tier: string }>(
    `SELECT from_tier, to_tier FROM v3_tier_events WHERE attempt_id=$1`, [up.id]);
  ok("올린 기록이 남는다", ev.length === 1 && ev[0].to_tier === "STANDARD",
     `${ev[0]?.from_tier} → ${ev[0]?.to_tier}`);

  /* 7. 올린 뒤 이어서 풀고 PRO 까지 */
  await walk(toStd, userId, strong);
  const stdDone = (await attemptOf(up.id, userId)) as V3Attempt;
  const stdSnap = (await submit(stdDone)).snapshot;
  const toPro = await upgradeTier(up.id, userId, "PRO");
  const proAdded = await newScreensAfterUpgrade(toPro, "STANDARD");
  ok("STANDARD 에서 PRO 로 올릴 때 번역과 목표만 더해진다",
     proAdded.added.every((s) => ["TRANSLATE", "PACK"].includes(s.stage)),
     `새 화면 ${proAdded.added.length}`);
  await walk(toPro, userId, strong);
  const proDone = (await attemptOf(up.id, userId)) as V3Attempt;
  const proSnap = (await submit(proDone)).snapshot;
  ok("PRO 로 올려도 영역 묶음이 저절로 오르지 않는다",
     stable(stdSnap.zones) === stable(proSnap.zones),
     `근거 ${proSnap.zones.Z1_EVIDENCE_ESTABLISHED.join(",") || "없음"}`);
  ok("산업과 역할이 붙는다",
     proDone.industry_pack === "INDUSTRY_MOBILITY_V2" && proDone.role_pack === "ROLE_CAE_V2" &&
     proSnap.context.industry?.code === "INDUSTRY_MOBILITY_V2",
     `${proDone.industry_pack} · ${proDone.role_pack}`);

  /* 8. 팩을 바꿔도 Core 판정이 같다 */
  const coreBefore = stable(coreOnly(proSnap));
  await choosePack(up.id, "industry", "INDUSTRY_DEFENSE_V2");
  await choosePack(up.id, "role", "ROLE_PM_V2");
  const swapped = (await submit((await attemptOf(up.id, userId)) as V3Attempt)).snapshot;
  ok("산업과 역할을 바꿔도 Core 판정이 같다",
     stable(coreOnly(swapped)) === coreBefore, "읽는 순서만 갈린다");
  ok("기술영역이 팩 선택에 따라 바뀌지 않는다",
     swapped.domains.map((d) => d.zone).join(",") === proSnap.domains.map((d) => d.zone).join(","));
  const snaps = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_snapshots WHERE attempt_id=$1`, [up.id]);
  ok("판정은 줄이 쌓이고 덮지 않는다", Number(snaps[0].n) >= 3, `${snaps[0].n}줄`);

  /* 9. 넷째 영역이 열리면 화면이 늘어난다 */
  const four = await freshAttempt(userId, "STANDARD", "phd", "STEM");
  await fillGrid(four, Object.fromEntries(tds.map((td) => [td, [4, 1, 4]])) as never);
  const v4 = await viewOf(four);
  ok("넷째 영역이 열린 까닭이 적힌다",
     v4.attempt.opened_deep.length === 4 && v4.attempt.fourth_reason === "ALL_TIED",
     `${v4.attempt.fourth_reason} · ${v4.attempt.opened_deep.map(domainName).join(" · ")}`);

  /* 10. 석사 이상은 전공계열 없이 시작하지 않는다 (DB 제약) */
  let blocked = false;
  try {
    await query(
      `INSERT INTO v3_attempts (user_id, tier, education_stage, item_bank_version, scoring_version)
       VALUES ($1,'STANDARD','master','x','y')`, [userId]);
  } catch { blocked = true; }
  ok("석사 이상은 전공계열 없이 응시가 시작되지 않는다", blocked, "DB 제약이 막는다");

  /* 11. ME_V2 표를 건드리지 않는다 */
  const v2 = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM v2_responses r
       JOIN attempts a ON a.id = r.attempt_id WHERE a.user_id = $1`, [userId]);
  ok("ME_V2 표에 V3 응답이 들어가지 않는다", v2[0].n === "0", `${v2[0].n}줄`);

  /* 12. 진행률은 두 수준이고 거짓 정밀도를 쓰지 않는다 */
  const vp = await viewOf((await attemptOf(four.id, userId)) as V3Attempt, "grid-TD05");
  ok("진행률이 큰 단계와 묶음 안으로 갈린다",
     vp.progress.stages.length >= 4 && vp.progress.inStage.total > 1 &&
     vp.progress.inStage.index <= vp.progress.inStage.total,
     `${vp.progress.inStage.label} ${vp.progress.inStage.index}/${vp.progress.inStage.total}`);

  /* --- 사람 다섯 벌 --- */
  console.log("\n사람 다섯 벌 end-to-end\n");
  const people: [string, Tier, V3Attempt["education_stage"], V3Attempt["grad_field"],
                  Record<string, [number, number, number]>][] = [
    ["P01 경험 거의 없는 학부생", "BASIC", "bachelor", null, { TD01: [3, 0, 3] }],
    ["P03 캡스톤 학생", "STANDARD", "bachelor", null, { TD01: [5, 2, 5], TD08: [4, 1, 4], TD02: [4, 1, 3] }],
    ["P04 구조해석 석사", "PRO", "master", "STEM", { TD02: [5, 2, 5], TD07: [4, 1, 3], TD01: [4, 1, 3] }],
    ["P09 재료 박사", "PRO", "phd", "STEM", { TD06: [5, 2, 5], TD07: [4, 1, 4], TD10: [2, 1, 2] }],
    ["P12 경험 강한 포닥", "PRO", "postdoc", "STEM", { TD02: [5, 2, 4], TD04: [4, 2, 4], TD07: [4, 1, 3] }],
  ];
  let flows = 0;
  for (const [name, tier, stage, field, grid] of people) {
    const a = await freshAttempt(userId, tier, stage, field);
    await fillGrid(a, grid);
    const w = await walk(a, userId, name.startsWith("P01") ? none : strong);
    const submitted = (await attemptOf(a.id, userId)) as V3Attempt;
    const snap = (await submit(submitted)).snapshot;
    const done = (await attemptOf(a.id, userId)) as V3Attempt;
    const z1 = snap.zones.Z1_EVIDENCE_ESTABLISHED.map(domainName).join(" · ") || "없음";
    const z2 = snap.zones.Z2_EVIDENCE_INCOMPLETE.length;
    console.log(`  ${name.padEnd(22)} ${tier.padEnd(9)} 화면 ${String(w.screens).padStart(3)}` +
      ` · 응답 ${String(w.answered).padStart(3)} · 근거 ${z1.padEnd(26)} 덜 섬 ${z2}개` +
      ` · ${snap.response_quality.flag}`);
    if (done.status === "scored") flows += 1;
  }
  ok("사람 다섯 벌이 전부 끝까지 돈다", flows === people.length, `${flows} / ${people.length}`);

  await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [userId]);
  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
