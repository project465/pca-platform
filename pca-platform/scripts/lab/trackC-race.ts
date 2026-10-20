/**
 * **Track C 3차 · 제출 경합을 반복해 잰다(실제 PostgreSQL · 실제 node-postgres).**
 *
 * 2차는 저장 서른과 제출 하나를 한 번 겨뤘다. 이번에는 응시를 새로 만들어
 * `ROUNDS` 번 되풀이하고, 화면이 부르는 **서버 동작 일곱 갈래**를 전부 제출과
 * 같은 순간에 보낸다: 답(`answerAction`) · 근거 고르기(`picksAction`) · 한 줄
 * 메모(`noteAction`) · 학업 단계(`profileAction`) · 산업 고르기(`picksAction3`) ·
 * 이어보기 자리(`cursorAction`) · 제출(`finishAction`).
 *
 * 매 판 세는 것:
 *   R1 굳은 결과가 한 줄이다
 *   R2 굳은 판정 = **지금 DB 에 남은 응답으로 다시 채점한 것**(판정 전체를 견준다)
 *   R3 제출 뒤에 보낸 일곱 갈래가 하나도 DB 를 바꾸지 않는다(응답 · 고른 근거 · 응시 줄 지문)
 *   R4 제출 뒤에 보낸 동작이 `ok:true` 로 거짓말하지 않는다
 *   R5 풀보다 많은 학생이 같은 순간에 제출해도 전부 굳고 판정이 남은 응답과 같다
 *
 *   PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' ROUNDS=15 \
 *     OUT=docs/metri/review/tracks-r3/C npx tsx scripts/lab/trackC-race.ts
 */
import { loadEnv, makeStudent } from "../_loop-fixture";
loadEnv();
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.DATABASE_URL ?? "";
/* 응시와 사람을 만들고 지우므로 격리 DB 에서만 돈다. CI 러너의 일회용 DB 는
   `RACE_ALLOW_DB` 에 그 이름을 적어 연다(초안 `F/ci/pcu-verify.yml.draft`) */
const allowCi = !!process.env.RACE_ALLOW_DB && URL_.endsWith(`/${process.env.RACE_ALLOW_DB}`);
if (!allowCi && (process.env.PGPORT !== "5433" || !/^postgres(ql)?:\/\/\/cm_iso_c\b/.test(URL_))) {
  console.error(`격리 클러스터(5433 · cm_iso_c)가 아니다: ${URL_}`); process.exit(2);
}
type Who = { id: string; name: string; locale: string; mustResetPw: boolean; role: string; memberships: unknown[] };
let WHO: Who | null = null;
const sessionFile = require.resolve(path.resolve("src/lib/session.ts"));
require.cache[sessionFile] = { id: sessionFile, filename: sessionFile, loaded: true, exports: {
  currentUser: async () => WHO, requireUser: async () => WHO, requireRole: async () => WHO, roleInOrg: () => null,
} } as unknown as NodeModule;
/* eslint-disable @typescript-eslint/no-require-imports */
const { query, queryOne } = require("../../src/lib/db") as typeof import("../../src/lib/db");
const S = require("../../src/lib/me-v3/runtime/session") as typeof import("../../src/lib/me-v3/runtime/session");
const ACT = require("../../src/app/v3/[attemptId]/actions") as typeof import("../../src/app/v3/[attemptId]/actions");
const E = require("../../src/lib/me-v3/scoring/engine") as typeof import("../../src/lib/me-v3/scoring/engine");
const { answerAll, PEOPLE } = require("../_v3-answer") as typeof import("../_v3-answer");

const ROUNDS = Number(process.env.ROUNDS ?? 15);
const OUT = process.env.OUT ?? "docs/metri/review/tracks-r3/C";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v;
const sha = (v: unknown) => createHash("sha256").update(JSON.stringify(canon(v))).digest("hex").slice(0, 16);
/** 다시 채점한 판정과 굳은 판정을 견줄 때 **때와 번호처럼 매번 달라지는 칸**은 뺀다 */
const VOLATILE = new Set(["attempt_id", "scored_at", "created_at", "generated_at", "at"]);
const strip = (v: unknown): unknown => Array.isArray(v) ? v.map(strip)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as object).filter(([k]) => !VOLATILE.has(k)).map(([k, x]) => [k, strip(x)])) : v;
function firstDiff(a: unknown, b: unknown, p = ""): string | null {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ks = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const k of ks) { const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${p}.${k}`); if (d) return d; }
  }
  return `${p}: ${JSON.stringify(a)?.slice(0, 60)} ≠ ${JSON.stringify(b)?.slice(0, 60)}`;
}
async function fingerprint(id: string): Promise<string> {
  const r = await query(`SELECT item_id, kind, value_int, value_text, note_text FROM v3_responses WHERE attempt_id=$1 ORDER BY item_id`, [id]);
  const p = await query(`SELECT * FROM v3_evidence_picks WHERE attempt_id=$1 ORDER BY 1,2,3`, [id]).catch(() => []);
  const a = await queryOne(`SELECT status, tier, education_stage, grad_field, current_screen, industry_interest, industry_pack, role_pack FROM v3_attempts WHERE id=$1`, [id]);
  return sha({ r, p, a });
}

type Round = { n: number; accepted: Record<string, number>; snap: number; same: boolean; diff: string | null; after: boolean; lies: string[] };

async function main(): Promise<void> {
  const driver = process.env.RT_REAL_PG === "1" ? "실제 node-postgres 8.16.3" : "대체 드라이버";
  console.log(`드라이버 ${driver} · ${CORE} · ${ROUNDS}판`);
  const results: Round[] = [];
  for (let n = 1; n <= ROUNDS; n++) {
    const u = await makeStudent(`zztc3-race-${n}`);
    WHO = { id: u.id, name: "경합", locale: "ko", mustResetPw: false, role: "student", memberships: [] };
    const a = await S.openAttempt({ userId: u.id, tier: "PRO", stage: "bachelor", gradField: null, core: CORE });
    await answerAll(a.core_code, a, u.id, PEOPLE[1]);
    const at = (await S.attemptOf(a.id, u.id))!;
    const plan = await S.planFor(at);
    const dom = S.content(CORE).domains.domains.map((d) => d.code);
    const grid = dom.map((td) => `G_${td}_INT`);
    const notes = ["TR_T1", "TR_T2", "TR_T3", "XNOTE_LATE"];
    const fire: [string, () => Promise<{ ok: boolean }>][] = [];
    for (let i = 0; i < 12; i++) fire.push(["answer", () => ACT.answerAction(a.id, grid[i % grid.length], { kind: "scale5", value: ((i + n) % 5) + 1 })]);
    for (let i = 0; i < 4; i++) fire.push(["picks", () => ACT.picksAction(a.id, dom[i % dom.length], "J5", [])]);
    for (const it of notes) fire.push(["note", () => ACT.noteAction(a.id, it, `늦은 메모 ${n}`)]);
    fire.push(["profile", () => ACT.profileAction(a.id, "master", "BUSINESS")]);
    fire.push(["industry", () => ACT.picksAction3(a.id, "industry", [])]);
    fire.push(["cursor", () => ACT.cursorAction(a.id, Math.max(0, plan.screens.length - 3))]);
    /* 제출을 가운데에 끼운다: 앞뒤로 같은 순간에 들어간다 */
    const mid = Math.floor(fire.length / 2);
    const all = [...fire.slice(0, mid).map(([, f]) => f().catch(() => ({ ok: false }))),
      ACT.finishAction(a.id).catch((e) => { console.log("    finish 오류:", String(e?.message ?? e).slice(0, 300)); return { ok: false }; }),
      ...fire.slice(mid).map(([, f]) => f().catch(() => ({ ok: false })))];
    const res = await Promise.all(all);
    const accepted: Record<string, number> = {};
    fire.forEach(([k], i) => { const r = res[i < mid ? i : i + 1] as { ok: boolean }; accepted[k] = (accepted[k] ?? 0) + (r.ok ? 1 : 0); });
    const snap = Number((await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id=$1`, [a.id]))?.n);
    const stored = await queryOne<{ p: unknown }>(`SELECT payload p FROM v3_snapshots WHERE attempt_id=$1 ORDER BY id DESC LIMIT 1`, [a.id]);
    const now = E.score(await S.submissionOf((await S.attemptOf(a.id, u.id))!), E.load(CORE));
    const d = firstDiff(canon(strip(stored?.p)), canon(strip(now)));

    /* 제출 뒤에 하나씩 보낸다 */
    const before = await fingerprint(a.id);
    const lies: string[] = [];
    for (const [k, f] of fire) { const r = await f().catch(() => ({ ok: false })); if (r.ok) lies.push(k); }
    const after = (await fingerprint(a.id)) === before;
    results.push({ n, accepted, snap, same: d === null, diff: d, after, lies: [...new Set(lies)] });
    console.log(`  ${n}판 결과 ${snap}줄 · 다시 채점 ${d === null ? "같다" : "다르다 " + d} · 받아들인 ${JSON.stringify(accepted)} · 뒤에 보낸 것 DB ${after ? "그대로" : "바뀜"} · ok 거짓 ${[...new Set(lies)].join(",") || "없음"}`);
    await query(`DELETE FROM v3_attempts WHERE user_id=$1`, [u.id]).catch(() => undefined);
  }
  /* ── 반 전체가 같은 순간에 제출한다 ────────────────────────────────
     풀(기본 10)보다 많은 학생이 각자 저장 셋과 제출 하나를 동시에 보낸다.
     제출이 연결 하나를 쥔 채 다른 연결을 기다리면 이 자리에서 풀이 멈춘다 */
  const CLASS = Number(process.env.CLASS ?? 14);
  const cls: { id: string; uid: string }[] = [];
  for (let k = 0; k < CLASS; k++) {
    const u = await makeStudent(`zztc3-class-${k}`);
    const a = await S.openAttempt({ userId: u.id, tier: "PRO", stage: "bachelor", gradField: null, core: CORE });
    await answerAll(a.core_code, a, u.id, PEOPLE[k % PEOPLE.length]);
    cls.push({ id: a.id, uid: u.id });
  }
  const dom0 = S.content(CORE).domains.domains.map((d) => d.code);
  const t0 = Date.now();
  const classRes = await Promise.all(cls.map(async ({ id, uid }, k) => {
    /* 세션은 이 과정에서 하나라 주인 확인을 거치지 않는 저장 함수를 바로 부른다(같은 잠금 경로다) */
    const saves = [0, 1, 2].map((i) => S.saveAnswer(id, `G_${dom0[(i + k) % dom0.length]}_INT`, { kind: "scale5", value: ((i + k) % 5) + 1 }).catch(() => false));
    const fin = S.submit((await S.attemptOf(id, uid))!).then(() => "ok").catch((e) => String(e?.message ?? e).slice(0, 80));
    const [r] = await Promise.all([fin, ...saves]);
    return r;
  }));
  const classMs = Date.now() - t0;
  const classOk = classRes.filter((r) => r === "ok").length;
  let classSame = 0;
  for (const { id, uid } of cls) {
    const st = await queryOne<{ p: unknown }>(`SELECT payload p FROM v3_snapshots WHERE attempt_id=$1 ORDER BY id DESC LIMIT 1`, [id]);
    const now = E.score(await S.submissionOf((await S.attemptOf(id, uid))!), E.load(CORE));
    if (st && firstDiff(canon(strip(st.p)), canon(strip(now))) === null) classSame++;
    await query(`DELETE FROM v3_attempts WHERE user_id=$1`, [uid]).catch(() => undefined);
  }
  const R5 = classOk === CLASS && classSame === CLASS;
  console.log(`  반 ${CLASS}명 동시 제출: 성공 ${classOk}/${CLASS} · 다시 채점 같음 ${classSame}/${CLASS} · ${classMs}ms${classOk < CLASS ? " · 실패 예: " + classRes.find((r) => r !== "ok") : ""}`);

  const R1 = results.every((r) => r.snap === 1);
  const R2 = results.every((r) => r.same);
  const R3 = results.every((r) => r.after);
  const R4 = results.every((r) => r.lies.length === 0);
  const varied = new Set(results.map((r) => r.accepted.answer)).size;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, `RACE_${process.env.TAG ?? "run"}.md`), [
    `# Track C 3차 · 제출 경합 반복 (${process.env.TAG ?? "run"})`, "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · ${driver} · DB \`${URL_}\` (격리 5433) · ${CORE} · ${ROUNDS}판`,
    `- 판마다 응시 하나를 끝까지 답한 뒤 서버 동작 ${results[0] ? Object.values(results[0].accepted).length : 0}갈래 22번을 제출과 같은 순간에 보낸다.`,
    `- 받아들인 답 수가 판마다 ${varied}가지로 갈렸다(끼어드는 차례가 실제로 바뀌었다는 뜻).`, "",
    "| 판정 | 확인 |", "|---|---|",
    `| ${R1 ? "PASS" : "**FAIL**"} | R1 굳은 결과가 판마다 한 줄 |`,
    `| ${R2 ? "PASS" : "**FAIL**"} | R2 굳은 판정 = 지금 남은 응답으로 다시 채점한 판정 (${results.filter((r) => r.same).length}/${ROUNDS}) |`,
    `| ${R3 ? "PASS" : "**FAIL**"} | R3 제출 뒤에 보낸 일곱 갈래가 DB 를 바꾸지 않는다 (${results.filter((r) => r.after).length}/${ROUNDS}) |`,
    `| ${R4 ? "PASS" : "**FAIL**"} | R4 제출 뒤에 보낸 동작이 ok:true 로 답하지 않는다 (${results.filter((r) => !r.lies.length).length}/${ROUNDS}) |`,
    `| ${R5 ? "PASS" : "**FAIL**"} | R5 학생 ${CLASS}명(풀 ${process.env.DATABASE_POOL_MAX ?? 10}보다 많다)이 저장 셋과 제출을 같은 순간에 보낸다: 제출 성공 ${classOk}/${CLASS} · 굳은 판정 = 다시 채점 ${classSame}/${CLASS} · ${classMs}ms${classOk < CLASS ? " · 실패: " + (classRes.find((r) => r !== "ok") ?? "") : ""} |`, "",
    "| 판 | 결과 줄 | 다시 채점 | 받아들인(같은 순간) | 뒤에 보낸 것 DB | ok:true 로 답한 갈래 |", "|---|---|---|---|---|---|",
    ...results.map((r) => `| ${r.n} | ${r.snap} | ${r.same ? "같다" : "다르다: " + (r.diff ?? "").replace(/\|/g, "/")} | ${Object.entries(r.accepted).map(([k, v]) => `${k} ${v}`).join(" · ")} | ${r.after ? "그대로" : "**바뀜**"} | ${r.lies.join(", ") || "-"} |`), "",
  ].join("\n"));
  console.log(`\nR1 ${R1} · R2 ${R2} · R3 ${R3} · R4 ${R4} · R5 ${R5}`);
  process.exit(R1 && R2 && R3 && R4 && R5 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
