/**
 * **여섯 Core 를 같은 길로 밟아 찍는다**(PRODUCT SYSTEM EXPANSION §8·§9·§12).
 *
 * 자리 목록을 주소로 열어 찍지 않는다: 학과에서 계정을 발급하고 학교 길로
 * 응시를 열어 **실제로 눌러** 들어간 뒤, 남은 문항을 사람 C 의 규칙으로
 * 채우고 제출해서 받은 결과를 찍는다. 경험이 거의 없는 응답으로 찍으면
 * 결과지가 `아직 없습니다` 로 차서 상품성을 가릴 수 없다.
 *
 * `FULL=1` 이면 Current State 말고 제품 화면 넷도 같이 찍는다
 * (Assessment · Result Summary · /me · Experience Add). 그 넷은 Core 를
 * 가리지 않는 공통 화면이라 **기준 Core 하나에서만** 찍는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ FULL=1 npx tsx scripts/lab/r28-shots.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page, type BrowserContext, type Browser } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { attemptOf, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment, walk } from "../_v3-walk";
import { PEOPLE, answerAll } from "../_v3-answer";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const TAG = process.env.TAG ?? CORE.replace(/_CORE_V\d$/, "");
const FULL = process.env.FULL === "1";
const OUT = process.env.OUT ?? `docs/metri/shots/review-loop/r28/${TAG}`;

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
  await p.waitForTimeout(200);
  await p.$$eval(".rs-head, .cm-topbar, .qs-top",
    (els) => { for (const x of els) (x as HTMLElement).style.visibility = "hidden"; })
    .catch(() => undefined);
  await e.screenshot({ path: file });
  await p.$$eval(".rs-head, .cm-topbar, .qs-top",
    (els) => { for (const x of els) (x as HTMLElement).style.visibility = ""; })
    .catch(() => undefined);
  mark(file);
  return true;
}

/** 첫 창에 무엇이 들어오는가 — 접힌 기본 상태 그대로 */
async function viewport(p: Page, file: string): Promise<void> {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(220);
  await p.screenshot({ path: file });
  mark(file);
}

async function open(ctx: BrowserContext, url: string): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  return p;
}

async function mobileCtx(b: Browser, from: BrowserContext): Promise<BrowserContext> {
  const gate = gateCreds();
  const m = await b.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
    ...(gate ? { httpCredentials: gate } : {}),
  });
  for (const c of await from.cookies()) await m.addCookies([c]);
  return m;
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

  const sid = `zzr28${Date.now().toString().slice(-7)}`;
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
    console.log(`응시 ${att}  ${CORE} / ${LEAF}`);

    /* ── A. Assessment ── **제출하기 전에만 찍을 수 있다** */
    if (FULL) {
      await viewport(p, `${OUT}/a0-intro-d.png`);
      await enterAssessment(p);
      await viewport(p, `${OUT}/a1-sweep-d.png`);
      await walk(p, 3);
      await viewport(p, `${OUT}/a2-judge-d.png`);
      const m0 = await mobileCtx(browser, ctx);
      const mp = await open(m0, `${BASE}/v3/${att}`);
      await viewport(mp, `${OUT}/a2-judge-m.png`);
      await m0.close();
    } else {
      await enterAssessment(p);
    }

    /* ── B. 제출 ── */
    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const pol = PEOPLE.find((x) => x.id === "C");
    if (!pol) throw new Error("사람 C 가 없습니다");
    await answerAll(CORE, a, stu.id, pol);
    await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
    for (let t = 0; t < 4 && !/\/(done|result)$/.test(p.url()); t += 1) {
      const btn = p.locator("button.qs-btn-main, a.qs-btn-main").first();
      if (!(await btn.count())) break;
      const was = p.url();
      await btn.click({ force: true }).catch(() => undefined);
      await p.waitForURL((x) => x.href !== was, { timeout: 30000 })
        .catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (!/\/(done|result)/.test(p.url())) throw new Error(`제출 못함 ${p.url()}`);
    await p.close();

    const URLR = `${BASE}/v3/${att}/result`;

    /* ── C. Desktop 1440 ── */
    const d = await open(ctx, URLR);
    await shot(d, ".rs-st", `${OUT}/c-state-d.png`);
    await shot(d, ".rs-tile > li", `${OUT}/c-card-d.png`);
    if (FULL) {
      await viewport(d, `${OUT}/b1-summary-d.png`);
      await shot(d, ".rs-open", `${OUT}/b2-open-d.png`);
    }
    await d.close();
    if (FULL) {
      const w = await open(ctx, `${BASE}/me`);
      await viewport(w, `${OUT}/d1-me-d.png`);
      await w.close();
      const e = await open(ctx, `${BASE}/me/experience/new`);
      await viewport(e, `${OUT}/e1-exp-d.png`);
      await e.close();
    }

    /* ── D. Mobile 390 ── */
    const mctx = await mobileCtx(browser, ctx);
    const m = await open(mctx, URLR);
    await shot(m, ".rs-st", `${OUT}/c-state-m.png`);
    await shot(m, ".rs-tile > li", `${OUT}/c-card-m.png`);
    if (FULL) {
      await viewport(m, `${OUT}/b1-summary-m.png`);
      await shot(m, ".rs-open", `${OUT}/b2-open-m.png`);
    }
    await m.close();
    if (FULL) {
      const w = await open(mctx, `${BASE}/me`);
      await viewport(w, `${OUT}/d1-me-m.png`);
      await w.close();
      const e = await open(mctx, `${BASE}/me/experience/new`);
      await viewport(e, `${OUT}/e1-exp-m.png`);
      await e.close();
    }
    await mctx.close();
  } finally {
    await browser.close();
  }
  console.log(`\n${TAG} 떴다 → ${OUT}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
