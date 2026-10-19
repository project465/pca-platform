/**
 * **R30 의 열 장**(PRODUCT QUALITY & HUMAN REVIEW §8). 한 사람이 제품과 같은
 * 길로 밟는다: 학과에서 계정을 발급받고 학교 길로 응시를 열고 사람 C 의
 * 규칙으로 답해 제출한 뒤, 결과지 → 홈 → 경험 추가 세 걸음 → 저장 직후를
 * 데스크톱 1440×900 과 손전화 390×844 로 찍는다.
 *
 * 자리 목록을 주소로 열어 찍지 않는다. 경험 추가의 걸음 둘셋은 **실제로
 * 눌러서** 들어가야 그 걸음이 서고, 저장 직후 화면은 저장을 해야 선다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ OUT=var/r30-shots npx tsx scripts/lab/r30-shots.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
  fillExperience,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page, type BrowserContext, type Browser } from "playwright";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
const OUT = process.env.OUT ?? "var/r30-shots";
const TITLE = process.env.TITLE ?? "동아리 행사 예산 집행 계획";

const seen = new Map<string, string>();
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
  console.log(`  떴다 ${file}`);
}

async function hideBars(p: Page, on: boolean): Promise<void> {
  await p.$$eval(".rs-head, .cm-topbar, .qs-top",
    (els, v) => { for (const x of els) (x as HTMLElement).style.visibility = v ? "hidden" : ""; },
    on).catch(() => undefined);
}

/** 한 자리를 뜬다. 붙어 있는 머리띠를 잠시 감춘다 */
async function shot(p: Page, sel: string, file: string): Promise<boolean> {
  const e = p.locator(sel).first();
  if (!(await e.count())) { console.log(`  없다 ${sel}`); return false; }
  await e.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(200);
  await hideBars(p, true);
  await e.screenshot({ path: file });
  await hideBars(p, false);
  mark(file);
  return true;
}

/** 첫 창. 접힌 기본 상태 그대로 */
async function viewport(p: Page, file: string): Promise<void> {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(260);
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

/** 경험 추가 세 걸음과 저장 직후를 한 바퀴 찍는다 */
async function experienceRound(ctx: BrowserContext, sfx: "d" | "m", title: string): Promise<void> {
  const p = await ctx.newPage();
  await fillExperience(p, title, {
    onStep: async (n) => {
      await viewport(p, `${OUT}/${n === 1 ? 3 : n === 2 ? 4 : 5}-exp-step${n}-${sfx}.png`);
    },
  });
  /* 저장 직후: `/me/recompute?new=…` 가 **이번 경험이 무엇을 움직였는지** 적는 자리 */
  await p.waitForURL(/\/me\/recompute/, { timeout: 20000 }).catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  console.log(`  저장 뒤 ${p.url()}`);
  await viewport(p, `${OUT}/6-postsave-${sfx}.png`);
  await p.close();
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

  const sid = `zzr30${Date.now().toString().slice(-7)}`;
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
    await enterAssessment(p);

    /* 사람 C 로 채워 제출 */
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

    /* ── Desktop 1440 ── 결과지 현재 상태 · 홈 · 홈의 현재 상태 절 */
    const d = await open(ctx, URLR);
    await shot(d, ".rs-st", `${OUT}/1-result-state-d.png`);
    await d.close();
    const w = await open(ctx, `${BASE}/me`);
    await viewport(w, `${OUT}/2-me-home-d.png`);
    /* 홈의 현재 상태 절만: 절 머리부터 칸 셋 아래까지를 잘라 뜬다. 부모를
       통째로 뜨면 쪽 전체가 들어와 견줄 수 없다 */
    {
      const head = w.locator(".cm-sh", { hasText: "현재 상태" }).first();
      const tiles = w.locator(".cm-tiles").first();
      await head.scrollIntoViewIfNeeded().catch(() => undefined);
      const hb = await head.boundingBox(); const tb = await tiles.boundingBox();
      if (hb && tb) {
        const x = Math.min(hb.x, tb.x) - 8, y = hb.y - 8;
        const clip = { x, y, width: Math.max(hb.x + hb.width, tb.x + tb.width) - x + 8,
          height: tb.y + tb.height - y + 8 };
        await w.screenshot({ path: `${OUT}/7-me-state-d.png`, clip });
        mark(`${OUT}/7-me-state-d.png`);
      } else console.log("  없다 홈 현재 상태 절");
    }
    await w.close();
    await experienceRound(ctx, "d", TITLE);

    /* ── Mobile 390 ── */
    const mctx = await mobileCtx(browser, ctx);
    await experienceRound(mctx, "m", `${TITLE} (발표 자료)`);
    const m = await open(mctx, URLR);
    await shot(m, ".rs-st", `${OUT}/1-result-state-m.png`);
    await m.close();
    const wm = await open(mctx, `${BASE}/me`);
    await viewport(wm, `${OUT}/2-me-home-m.png`);
    await wm.close();
    await mctx.close();
  } finally {
    await browser.close();
  }
  /* 결과지와 홈을 나란히 */
  execFileSync("python3", ["scripts/lab/r30_compare.py", OUT], { stdio: "inherit" });
  console.log(`\n떴다 → ${OUT}  (응시자 ${sid})`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
