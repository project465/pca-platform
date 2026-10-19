/**
 * **출시 차단 해소 · BEFORE / AFTER 그림.** 같은 사람 넷을 같은 DB 에 세우고
 * 주소를 바꿔 가며 찍는다. 옛 빌드(BEFORE)와 새 빌드(AFTER)에 각각 대고 돌린다.
 *
 *   1  학교 학생이 학교 쿠키 없이 `/v3/start`  (옛: 개인 시작 화면 · 새: 학교 경로)
 *   2  결과를 받은 학교 학생의 학교 시작 쪽     (옛: 검사 시작하기 · 새: 결과 보기)
 *   3  푸는 중인 학교 학생의 학교 시작 쪽       (옛: 검사 시작하기 · 새: 이어하기)
 *   4  학교 로그인 단추                          (옛: 검사 시작하기 · 새: 로그인)
 *
 *   UI_BASE=http://127.0.0.1:3100 TAG=after OUT=docs/metri/review/rb/shots/after \
 *     npx tsx scripts/lab/rb-shots.ts
 */
import {
  loadEnv, BASE, cloneFinished, gateCreds, login, makeStudent, registerCampusStudent,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { query } from "../../src/lib/db";
import { allLeaves, university } from "../../src/lib/campus/registry";
import { openAttempt } from "../../src/lib/me-v3/runtime/session";

const OUT = process.env.OUT ?? "var/rb/shots";
const TAG = process.env.TAG ?? "after";
const LEAF = "PCU26_BIZ";

async function snap(p: Page, name: string): Promise<void> {
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`  ${name}  ${new URL(p.url()).pathname}`);
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const s = String(Date.now()).slice(-6);
  const fresh = await makeStudent(`zzrbsh-${TAG}-a${s}`);
  await registerCampusStudent(fresh.id, "PCU", LEAF);
  const done = await makeStudent(`zzrbsh-${TAG}-b${s}`);
  await registerCampusStudent(done.id, "PCU", LEAF);
  const fin = await cloneFinished(done.id, "PRO");
  await query(`UPDATE v3_attempts SET university_code='PCU', department_code=$2 WHERE id=$1`,
    [fin, LEAF]);
  const mid = await makeStudent(`zzrbsh-${TAG}-c${s}`);
  await registerCampusStudent(mid.id, "PCU", LEAF);
  const u = university("PCU")!;
  const found = allLeaves(u).find((r) => r.leaf.code === LEAF)!;
  await openAttempt({
    userId: mid.id, tier: "PRO", stage: "bachelor", gradField: null,
    campus: { university_code: "PCU", college_code: found.college.code,
      department_code: LEAF, core_code: "BIZ_CORE_V1", specialization: found.leaf.specialization ?? null },
  });

  const b = await chromium.launch({ args: ["--no-sandbox"] });
  for (const [vw, vh, suf] of [[1440, 900, "d"], [390, 844, "m"]] as const) {
    const mk = () => b.newContext({ viewport: { width: vw, height: vh },
      httpCredentials: gateCreds() ?? undefined });
    const c1 = await mk(); const p1 = await login(c1, `zzrbsh-${TAG}-a${s}`, fresh.pw);
    await p1.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
    await snap(p1, `1-school-v3start-${suf}`);
    const c2 = await mk(); const p2 = await login(c2, `zzrbsh-${TAG}-b${s}`, done.pw);
    await p2.goto(`${BASE}/campus/pcu/start`, { waitUntil: "networkidle" });
    await snap(p2, `2-finished-campus-start-${suf}`);
    const c3 = await mk(); const p3 = await login(c3, `zzrbsh-${TAG}-c${s}`, mid.pw);
    await p3.goto(`${BASE}/campus/pcu/start`, { waitUntil: "networkidle" });
    await snap(p3, `3-inprogress-campus-start-${suf}`);
    const c4 = await mk(); const p4 = await c4.newPage();
    await p4.goto(`${BASE}/campus/pcu/login`, { waitUntil: "networkidle" });
    await snap(p4, `4-campus-login-${suf}`);
    for (const c of [c1, c2, c3, c4]) await c.close();
  }
  await b.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
