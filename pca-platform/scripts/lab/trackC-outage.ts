/**
 * **Track C 2차 · 실제 DB 장애와 경합.** 따로 띄운 PostgreSQL 클러스터(포트 5433 ·
 * `cm_iso_c`)를 **실제로 멈추고 다시 띄운다.** 개발 DB(5432)는 건드리지 않는다.
 *
 *   PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/review/tracks-r2/C npx tsx scripts/lab/trackC-outage.ts
 *
 * 세는 것:
 *   O1 DB 가 멈춘 동안 저장은 정해진 시간 안에 **실패로** 끝나고 프로세스는 살아 있다
 *   O2 DB 가 돌아오면 프로세스를 다시 띄우지 않고 다음 저장이 붙는다 · 앞선 답 그대로
 *   O3 쉬는 연결이 재시작으로 끊겨도 프로세스가 죽지 않는다(`pool.on("error")`)
 *   O4 두 탭이 같은 문항을 동시에 고친다 → 줄 하나 · 마지막 값 하나
 *   O5 저장이 날아가는 중에 제출 → **굳은 판정과 저장된 응답이 어긋나지 않는다**
 *
 * `pg_ctlcluster` 로 멈추므로 이 기계에서만 돈다. 클러스터 이름이 `iso` 가 아니면 멈춘다.
 */
import { loadEnv, makeStudent } from "../_loop-fixture";
loadEnv();
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.DATABASE_URL ?? "";
if (process.env.PGPORT !== "5433" || !/^postgres(ql)?:\/\/\/cm_iso_c\b/.test(URL_)) {
  console.error(`격리 클러스터(5433 · cm_iso_c)가 아니다: ${URL_} · PGPORT=${process.env.PGPORT}`); process.exit(2);
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

const OUT = process.env.OUT ?? "docs/metri/review/tracks-r2/C";
const rows: string[] = []; let pass = 0; const bad: string[] = [];
const ok = (what: string, cond: boolean, got = ""): void => {
  rows.push(`| ${cond ? "PASS" : "**FAIL**"} | ${what} | ${got.replace(/\|/g, "/")} |`);
  if (cond) pass++; else bad.push(what);
  console.log(`  ${cond ? "통과" : "걸림"}  ${what}${got ? " — " + got : ""}`);
};
const head = (t: string): void => { rows.push(`| | **${t}** | |`); console.log(`\n── ${t}`); };
const sh = (...a: string[]) => execFileSync("pg_ctlcluster", ["16", "iso", ...a], { stdio: "pipe" }).toString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const as = (id: string): void => { WHO = { id, name: "시험", locale: "ko", mustResetPw: false, role: "student", memberships: [] }; };
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v;
const n = async (sql: string, p: unknown[]) => Number((await queryOne<{ n: string }>(sql, p))?.n ?? 0);

let poolErrors = 0;
const origErr = console.error;
console.error = (...a: unknown[]) => { if (String(a[0]).startsWith("[db]")) poolErrors++; origErr(...a); };
process.on("uncaughtException", (e) => { bad.push(`프로세스가 잡히지 않은 오류를 받았다: ${String(e).slice(0, 80)}`); });

async function main(): Promise<void> {
  const driver = process.env.RT_REAL_PG === "1" ? "실제 node-postgres 8.16.3" : "대체 드라이버(psycopg 다리)";
  console.log(`드라이버: ${driver}`);
  const CORE = "BIZ_CORE_V1";
  const A = await makeStudent("zztc2-a");
  const a = await S.openAttempt({ userId: A.id, tier: "PRO", stage: "bachelor", gradField: null, core: CORE });
  as(A.id);
  for (const td of ["TD01", "TD02", "TD03"]) await ACT.answerAction(a.id, `G_${td}_INT`, { kind: "scale5", value: 4 });

  head("O1 DB 가 멈춘 동안 저장");
  sh("stop", "-m", "fast");
  const t0 = Date.now(); let err = "", res: unknown = null;
  try { res = await ACT.answerAction(a.id, "G_TD04_INT", { kind: "scale5", value: 2 }); } catch (e) { err = String((e as Error).message ?? e).slice(0, 100); }
  const took = Date.now() - t0;
  ok("저장이 실패로 끝난다(성공으로 꾸미지 않는다)", !!err && res === null, err);
  ok("실패까지 걸린 시간이 정해진 한도 안이다(15초)", took < 15000, `${took}ms`);
  ok("프로세스가 살아 있다", true, `pid ${process.pid}`);

  head("O2 DB 가 돌아오면 다시 붙는다");
  sh("start"); await sleep(1500);
  const r2 = await ACT.answerAction(a.id, "G_TD04_INT", { kind: "scale5", value: 2 }).catch((e) => ({ ok: false, e: String(e) }));
  ok("프로세스를 다시 띄우지 않고 저장이 붙는다", (r2 as { ok: boolean }).ok === true, JSON.stringify(r2).slice(0, 80));
  ok("멈추기 전에 저장한 답 셋이 그대로다", await n(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id=$1 AND item_id IN ('G_TD01_INT','G_TD02_INT','G_TD03_INT') AND value_int=4`, [a.id]) === 3);
  ok("멈춘 동안 실패한 저장이 반쯤 남지 않았다(다시 저장한 한 줄뿐)", await n(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id=$1 AND item_id='G_TD04_INT'`, [a.id]) === 1);

  head("O3 쉬는 연결이 재시작으로 끊겨도 죽지 않는다");
  const before = poolErrors;
  await Promise.all(Array.from({ length: 6 }, () => queryOne(`SELECT pg_sleep(0.05)`, [])));
  sh("restart", "-m", "fast"); await sleep(2000);
  const after = await queryOne<{ x: number }>(`SELECT 1 AS x`, []).catch(() => null);
  ok("재시작 뒤 첫 질의가 붙는다", after?.x === 1);
  ok("끊긴 쉬는 연결은 풀 오류로 받아 넘겼다(프로세스 생존)", !bad.some((b) => b.startsWith("프로세스")), `풀 오류 ${poolErrors - before}줄`);

  head("O4 두 탭이 같은 문항을 동시에 고친다");
  await Promise.all([1, 2, 3, 4, 5, 1, 2, 3, 4, 5].map((v) => ACT.answerAction(a.id, "G_TD05_INT", { kind: "scale5", value: v })));
  const row = await queryOne<{ c: string }>(`SELECT count(*)::text c FROM v3_responses WHERE attempt_id=$1 AND item_id='G_TD05_INT'`, [a.id]);
  ok("동시 저장 열 번 → 줄 하나", row?.c === "1");

  head("O5 저장이 날아가는 중에 제출");
  await answerAll(CORE, (await S.attemptOf(a.id, A.id))!, A.id, PEOPLE[1]);
  /* 다른 탭에서 답을 바꾸는 요청 서른 개가 제출과 같은 순간에 들어온다 */
  const grid = (await S.content(CORE)).domains.domains.map((d) => `G_${d.code}_INT`);
  const flood = Array.from({ length: 30 }, (_, i) => ACT.answerAction(a.id, grid[i % grid.length], { kind: "scale5", value: (i % 5) + 1 }).catch(() => ({ ok: false })));
  const fin = ACT.finishAction(a.id);
  const results = await Promise.all([fin, ...flood]);
  const accepted = results.slice(1).filter((r) => (r as { ok: boolean }).ok).length;
  const stored = await queryOne<{ p: { domains: unknown } }>(`SELECT payload p FROM v3_snapshots WHERE attempt_id=$1`, [a.id]);
  const now = E.score(await S.submissionOf((await S.attemptOf(a.id, A.id))!), E.load(CORE));
  const same = JSON.stringify(canon(stored?.p.domains)) === JSON.stringify(canon(now.domains));
  ok("제출된 판정이 지금 저장된 응답으로 다시 채점한 것과 같다(뒤늦은 저장이 끼어들지 않았다)", same, `받아들인 저장 ${accepted}/30`);
  ok("결과는 한 벌이다", await n(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id=$1`, [a.id]) === 1);

  await query(`DELETE FROM v3_attempts WHERE user_id=$1`, [A.id]).catch(() => undefined);
  const total = pass + bad.length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, `OUTAGE_${process.env.RT_REAL_PG === "1" ? "realpg" : "bridge"}.md`), [
    "# Track C 2차 · 실제 DB 장애와 경합", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · 드라이버 **${driver}** · DB \`${URL_}\` (격리 클러스터 5433)`,
    "- DB 는 `pg_ctlcluster 16 iso stop/start/restart` 로 실제로 멈추고 다시 띄웠다. 개발 DB(5432)는 건드리지 않았다.",
    "- 세션 만료 · 브라우저 저장/재개 · 반응형 UX 는 **NOT VERIFIED**(Next 빌드 불가 · next-auth 미설치).", "",
    `**통과 ${pass} · 걸림 ${bad.length} / ${total}**`, "", "| 판정 | 확인 | 값 |", "|---|---|---|", ...rows, "",
    ...(bad.length ? ["## 걸린 것", "", ...bad.map((b) => `- ${b}`), ""] : []),
  ].join("\n"));
  console.log(`\n확인 ${total}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); try { sh("start"); } catch { /* 이미 떠 있다 */ } process.exit(1); });
