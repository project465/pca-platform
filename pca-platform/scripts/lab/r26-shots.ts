/**
 * **REFERENCE / BEFORE / AFTER 를 같은 자리에서 뜬다**(규격 §9).
 *
 * 자리 목록을 주소로 열지 않는다: 학과를 고르고 응시를 열고 사람 C 의
 * 규칙으로 끝까지 답하고 제출해서 받은 결과를 찍는다. **경험이 거의 없는
 * 응답으로 찍으면 결과지가 `아직 없습니다` 로 차서** 상품성을 가릴 수 없다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     TAG=before npx tsx scripts/lab/r26-shots.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page, type BrowserContext } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { attemptOf, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment } from "../_v3-walk";
import { PEOPLE, answerAll } from "../_v3-answer";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const TAG = process.env.TAG ?? "after";
const OUT = process.env.OUT ?? `docs/metri/shots/review-loop/r26/${TAG}`;

const seen = new Map<string, string>();
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
  console.log(`  떴다 ${file}`);
}

/** 한 자리를 뜬다. **붙어 있는 머리띠를 잠시 감춘다** */
async function shot(p: Page, sel: string, file: string): Promise<boolean> {
  const e = p.locator(sel).first();
  if (!(await e.count())) { console.log(`  없다 ${sel}`); return false; }
  await e.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(180);
  await p.$$eval(".rs-head, .cm-topbar",
    (els) => { for (const x of els) (x as HTMLElement).style.visibility = "hidden"; })
    .catch(() => undefined);
  await e.screenshot({ path: file });
  await p.$$eval(".rs-head, .cm-topbar",
    (els) => { for (const x of els) (x as HTMLElement).style.visibility = ""; })
    .catch(() => undefined);
  mark(file);
  return true;
}

/** 첫 창에 무엇이 들어오는가 — 접힌 기본 상태 그대로 */
async function viewport(p: Page, file: string): Promise<void> {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(200);
  await p.screenshot({ path: file });
  mark(file);
}

async function page1(ctx: BrowserContext, url: string): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  return p;
}

async function main(): Promise<void> {
  assertFreshServer();
  assertPreviewServer(CORE);
  mkdirSync(OUT, { recursive: true });
  const u = university(UNI);
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const seat = allLeaves(u).find(
    (r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE);
  if (!seat) throw new Error(`${LEAF} 자리가 ${CORE} 를 가리키지 않습니다`);

  const sid = `zzr26${Date.now().toString().slice(-7)}`;
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error("PCU 기관 줄이 없습니다");
  const actor = await queryOne<{ user_id: string; role: string; org_id: number }>(
    `SELECT m.user_id::text, m.role, m.org_id FROM memberships m
      WHERE m.org_id = $1::bigint AND m.role IN ('org_admin','org_manager')
      LIMIT 1`, [org.id]);
  if (!actor) throw new Error("PCU 담당자 줄이 없습니다");
  const st = await addStudentAccount(UNI, org.id, {
    student_id: sid, name: "검수용 학생", email: null, login_id: sid,
    college_code: seat.college.code, department_code: seat.leaf.code,
  }, { userId: actor.user_id, role: actor.role, orgId: Number(actor.org_id) });
  if (!st.ok || !st.password) throw new Error(`계정 발급 ${st.why ?? ""}`);
  const stu = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [sid]);
  if (!stu) throw new Error("발급한 계정을 찾지 못했습니다");
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [stu.id]);

  const browser = await chromium.launch();
  const gate = gateCreds();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(gate ? { httpCredentials: gate } : {}),
  });
  try {
    const p = await login(ctx, sid, st.password);
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`,
      { waitUntil: "networkidle" });
    for (let t = 0; t < 2 && !/\/v3\//.test(p.url()); t += 1) {
      await p.locator('form button[type="submit"]').first().click({ timeout: 5000 })
        .catch(() => undefined);
      await p.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname),
        { timeout: 20000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (/\/v3\/start/.test(p.url())) {
      await p.getByText("학부", { exact: true }).click({ timeout: 5000 })
        .catch(() => undefined);
      await p.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 })
        .catch(() => undefined);
      await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
    if (!att) throw new Error(`응시가 열리지 않았습니다 ${p.url()}`);
    await enterAssessment(p);
    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const pol = PEOPLE.find((x) => x.id === "C");
    if (!pol) throw new Error("사람 C 가 없습니다");
    await answerAll(CORE, a, stu.id, pol);
    await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
    for (let t = 0; t < 3 && !/\/(done|result)$/.test(p.url()); t += 1) {
      const btn = p.locator("button.qs-btn-main, a.qs-btn-main").first();
      if (!(await btn.count())) break;
      const was = p.url();
      await btn.click({ force: true }).catch(() => undefined);
      await p.waitForURL((x) => x.href !== was, { timeout: 30000 })
        .catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (!/\/(done|result)/.test(p.url())) throw new Error(`제출 못함 ${p.url()}`);
    const URLR = `${BASE}/v3/${att}/result`;
    console.log(`응시 ${att}`);

    /* ── Desktop 1440 ── */
    const d = await page1(ctx, URLR);
    await viewport(d, `${OUT}/d0-viewport.png`);
    await d.screenshot({ path: `${OUT}/d-full.png`, fullPage: true });
    mark(`${OUT}/d-full.png`);
    for (const [sel, f] of [
      [".rs-open", "d1-hero"], [".rs-st", "d2-state"], [".rs-do1", "d3-action"],
      ["#evidence", "d4-evidence"],
    ] as const) await shot(d, sel, `${OUT}/${f}.png`);
    await d.close();

    /* ── Mobile 390 ── */
    const mctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true,
      ...(gate ? { httpCredentials: gate } : {}),
    });
    for (const c of await ctx.cookies()) await mctx.addCookies([c]);
    const m = await page1(mctx, URLR);
    await viewport(m, `${OUT}/m0-viewport.png`);
    await m.screenshot({ path: `${OUT}/m-full.png`, fullPage: true });
    mark(`${OUT}/m-full.png`);
    for (const [sel, f] of [
      [".rs-open", "m1-hero"], [".rs-st", "m2-state"], [".rs-do1", "m3-action"],
      ["#evidence", "m4-evidence"],
    ] as const) await shot(m, sel, `${OUT}/${f}.png`);
    await mctx.close();
  } finally {
    await browser.close();
  }
  console.log(`\n${TAG} 떴다 → ${OUT}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
