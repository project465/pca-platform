/**
 * **제출 캡처**(GOLD MASTER CLOSURE §11 ROUND 3).
 *
 * Desktop 1440 과 Mobile 390 에서 자리마다 뜬다. **주소로 자리를 열지
 * 않는다**: 학과를 고르고 응시를 열고 끝까지 답하고 제출해서 받은 결과를
 * 찍고, `지금 할 일에 담아두기` 를 실제로 눌러 그 할 일이 `/me` 에 서는
 * 것까지 같은 길에서 본다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/shots/review-loop/r21 npx tsx scripts/lab/r21-shots.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page } from "playwright";
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
const OUT = process.env.OUT ?? "docs/metri/shots/review-loop/r21";

const seen = new Map<string, string>();
/** 같은 그림이 두 이름으로 저장되면 그 자리에서 멈춘다 */
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
  console.log(`  떴다 ${file}`);
}

/** 접는 자리를 전부 편다 */
async function openAll(p: Page): Promise<void> {
  const SHUT = 'button.rs-openbtn[aria-expanded="false"],'
    + ' button.rs-discbtn[aria-expanded="false"],'
    + ' button.rs-foldbtn[aria-expanded="false"],'
    + ' button.rs-ev3-tr[aria-expanded="false"]';
  for (let r = 0; r < 8; r += 1) {
    const hit = await p.$$eval(SHUT, (els) => {
      for (const e of els) (e as HTMLButtonElement).click();
      return els.length;
    }).catch(() => 0);
    if (!hit) break;
    await p.waitForTimeout(220);
  }
}

async function clipTo(p: Page, from: string, to: string, file: string): Promise<void> {
  const box = await p.evaluate(([a, b]) => {
    const s = document.querySelector(a as string);
    const e = document.querySelector(b as string);
    if (!s) return null;
    const sr = s.getBoundingClientRect();
    const er = (e ?? s).getBoundingClientRect();
    const own = (s.parentElement ?? s).getBoundingClientRect();
    const left = Math.min(sr.left, er.left, own.left);
    const right = Math.max(sr.right, er.right, own.right);
    return {
      x: Math.max(0, left + window.scrollX - 10),
      y: Math.max(0, sr.top + window.scrollY - 10),
      width: Math.min(window.innerWidth, right - left + 20),
      height: er.bottom + window.scrollY - (sr.top + window.scrollY) + 20,
    };
  }, [from, to]);
  if (!box) throw new Error(`${from} 자리를 찾지 못했습니다`);
  await p.screenshot({ path: file, fullPage: true, clip: box });
  mark(file);
}

/**
 * 한 자리를 뜬다.
 *
 * **붙어 있는 머리띠를 잠시 감춘다.** 그 띠는 `position: fixed` 라, 한
 * 자리만 뜨면 그 자리의 맨 윗줄 위에 띠가 얹혀 찍힌다. 한 번 그렇게
 * 찍혀 **적는 차례의 번호 넷이 통째로 가려졌고**, 그것을 보고 번호가
 * 서지 않는 줄로 읽었다. 전체를 뜨는 그림에는 띠가 그대로 선다.
 */
async function shot(p: Page, sel: string, file: string): Promise<void> {
  const e = p.locator(sel).first();
  if (!(await e.count())) throw new Error(`${sel} 자리가 없습니다`);
  await e.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(160);
  await p.$$eval(".rs-head, .cm-topbar",
    (els) => { for (const x of els) (x as HTMLElement).style.visibility = "hidden"; })
    .catch(() => undefined);
  await e.screenshot({ path: file });
  await p.$$eval(".rs-head, .cm-topbar",
    (els) => { for (const x of els) (x as HTMLElement).style.visibility = ""; })
    .catch(() => undefined);
  mark(file);
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

  const sid = `zzr21g${Date.now().toString().slice(-6)}`;
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

    /* ── Desktop 1440 ── */
    await p.goto(URLR, { waitUntil: "networkidle" });
    await p.waitForTimeout(450);
    /* ① 첫 화면 한 흐름. 내 상태 → 그런데 → 지금 할 일 */
    await clipTo(p, ".rs-open", ".rs-do1", `${OUT}/d1-open.png`);
    /* ② 지금 할 일만 */
    await shot(p, ".rs-do1", `${OUT}/d2-do.png`);
    /* ③ 첫 창 그대로(스크롤 없이) */
    await p.screenshot({ path: `${OUT}/d3-fold.png` });
    mark(`${OUT}/d3-fold.png`);
    await openAll(p);
    await p.waitForTimeout(400);
    /* ④ 근거 */
    await clipTo(p, "#evidence > h2", ".rs-ev3-story.is-primary",
      `${OUT}/d4-evidence.png`);
    /* ⑤ 할 일 — 고르는 줄 */
    await shot(p, "#plan", `${OUT}/d5-action.png`);
    /* ⑥ 아래쪽 — 닿는 곳과 닫는 자리 */
    await clipTo(p, "#industry", ".rs-end", `${OUT}/d6-lower.png`);
    /* ⑦ 담아두기를 실제로 눌러 `/me/next` 가 그 할 일을 드는 것까지 */
    await p.goto(URLR, { waitUntil: "networkidle" });
    {
      const was = p.url();
      await p.locator("button.rs-keep").first().click({ timeout: 8000 });
      await p.waitForURL((x) => x.href !== was, { timeout: 20000 })
        .catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (!/\/me\/next/.test(p.url())) throw new Error(`담아두기가 ${p.url()} 로 갔습니다`);
    await p.waitForTimeout(400);
    await shot(p, ".cm-canvas", `${OUT}/d7-kept.png`);
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await shot(p, ".cm-canvas", `${OUT}/d8-me-home.png`);
    /* ⑨ 전체(접힌 기본 상태) */
    await p.goto(URLR, { waitUntil: "networkidle" });
    await p.waitForTimeout(450);
    await p.screenshot({ path: `${OUT}/d9-all.png`, fullPage: true });
    mark(`${OUT}/d9-all.png`);

    /* ── Mobile 390 ── **데스크톱을 줄인 것이 아니다** ── */
    const m = await ctx.newPage();
    await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(URLR, { waitUntil: "networkidle" });
    await m.waitForTimeout(450);
    /* ⑩ 첫 창 그대로. **스크롤 없이 보이는 것만** */
    await m.screenshot({ path: `${OUT}/m10-first.png` });
    mark(`${OUT}/m10-first.png`);
    /* ⑪ 지금 할 일 */
    await shot(m, ".rs-do1", `${OUT}/m11-do.png`);
    await openAll(m);
    await m.waitForTimeout(400);
    /* ⑫ 근거 */
    await clipTo(m, "#evidence > h2", ".rs-ev3-story.is-primary",
      `${OUT}/m12-evidence.png`);
    /* ⑬ 할 일 */
    await shot(m, "#plan", `${OUT}/m13-action.png`);
    /* ⑭ 닫는 자리 */
    await shot(m, ".rs-end", `${OUT}/m14-end.png`);
    /* ⑮ 아래 띠 */
    await m.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await m.waitForTimeout(400);
    await shot(m, ".cm-tabs", `${OUT}/m15-nav.png`);
    /* ⑯ 전체(접힌 기본 상태) */
    await m.goto(URLR, { waitUntil: "networkidle" });
    await m.waitForTimeout(450);
    await m.screenshot({ path: `${OUT}/m16-all.png`, fullPage: true });
    mark(`${OUT}/m16-all.png`);

    const h = await m.evaluate(() => ({
      doc: Math.round(document.documentElement.scrollHeight),
      win: window.innerHeight,
    }));
    console.log(`  손전화 펼침 ${h.doc}px (창 ${h.win}px · ${(h.doc / h.win).toFixed(1)}배)`);
    console.log(`  응시 ${att} · ${CORE} · 계정 ${sid}`);
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
