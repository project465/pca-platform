/**
 * **제출 캡처 열다섯 장**(R17 §8).
 *
 * Desktop 일곱과 Mobile 390 여덟이다. 곁근거는 접힘과 펼침을 따로 뜬다:
 * 접는 쪽이 이 회차에서 바뀐 자리라 한 장으로는 그 물음에 답할 수 없다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/shots/review-loop/r17 npx tsx scripts/lab/r17-shots.ts
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
const OUT = process.env.OUT ?? "docs/metri/shots/review-loop/r17";

const seen = new Map<string, string>();
/** 같은 그림이 두 이름으로 저장되면 그 자리에서 멈춘다 */
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
  console.log(`  떴다 ${file}`);
}

/** 접는 자리를 전부 편다. **곁근거는 빼고** 연다: 그 자리는 따로 뜬다 */
async function openAll(p: Page): Promise<void> {
  const SHUT = 'button.rs-openbtn[aria-expanded="false"]:not(.rs-ev3-tr),'
    + ' button.rs-discbtn[aria-expanded="false"],'
    + ' button.rs-foldbtn[aria-expanded="false"]';
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
    const box = (s.parentElement ?? s).getBoundingClientRect();
    const left = Math.min(sr.left, er.left, box.left);
    const right = Math.max(sr.right, er.right, box.right);
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

async function shot(p: Page, sel: string, file: string): Promise<void> {
  const e = p.locator(sel).first();
  if (!(await e.count())) throw new Error(`${sel} 자리가 없습니다`);
  await e.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(160);
  await e.screenshot({ path: file });
  mark(file);
}

/** 곁근거를 연다. 열리지 않으면 그 자리에서 멈춘다 */
async function openSecond(p: Page): Promise<void> {
  const b = p.locator("button.rs-ev3-tr").first();
  if (!(await b.count())) throw new Error("곁근거 단추가 없습니다");
  await b.click();
  await p.waitForTimeout(260);
  const on = await b.getAttribute("aria-expanded");
  if (on !== "true") throw new Error("곁근거가 열리지 않았습니다");
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

  const sid = `zzr17s${Date.now().toString().slice(-6)}`;
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
    /* ① 전체. **학생이 처음 보는 상태로 뜬다**: 다 펼쳐 놓고 뜨면 그
       그림은 아무도 보지 않는 화면이다 */
    await p.screenshot({ path: `${OUT}/d1-all.png`, fullPage: true });
    mark(`${OUT}/d1-all.png`);
    await shot(p, ".rs-hero", `${OUT}/d2-hero.png`);        /* ② */
    await shot(p, ".rs-use", `${OUT}/d3-summary.png`);      /* ③ */
    await openAll(p);
    await p.waitForTimeout(400);
    /* ④ 근거. 여는 경험까지다 */
    await clipTo(p, ".rs-ev3-intro", ".rs-ev3-story.is-primary", `${OUT}/d4-evidence.png`);
    /* ⑤ 할 일 */
    await shot(p, "#plan", `${OUT}/d5-action.png`);
    /* ⑥ 곁근거. 접힘과 펼침을 한 장에 담지 못하므로 **펼친 쪽**을 뜬다:
       접힌 모양은 손전화 쪽에서 따로 뜬다 */
    await openSecond(p);
    await shot(p, ".rs-ev3-second", `${OUT}/d6-second.png`);
    /* ⑦ Hero → 근거 흐름 */
    await clipTo(p, ".rs-hero", ".rs-ev3", `${OUT}/d7-flow.png`);

    /* ── Mobile 390 ── **데스크톱을 줄인 것이 아니다**(R17 §9) ── */
    const m = await ctx.newPage();
    await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(URLR, { waitUntil: "networkidle" });
    await m.waitForTimeout(450);
    await m.screenshot({ path: `${OUT}/m8-all.png`, fullPage: true });   /* ⑧ */
    mark(`${OUT}/m8-all.png`);
    await shot(m, ".rs-hero", `${OUT}/m9-hero.png`);                     /* ⑨ */
    await shot(m, ".rs-use", `${OUT}/m10-summary.png`);                  /* ⑩ */
    await openAll(m);
    await m.waitForTimeout(400);
    /* ⑪ 여는 경험 */
    await clipTo(m, ".rs-ev3-intro", ".rs-ev3-story.is-primary", `${OUT}/m11-evidence.png`);
    /* ⑫ 할 일 */
    await shot(m, "#plan", `${OUT}/m12-action.png`);
    /* ⑬ 곁근거 접힘 — 이 회차에서 바뀐 자리다 */
    await shot(m, ".rs-ev3-second", `${OUT}/m13-second-closed.png`);
    /* ⑭ 곁근거 펼침 */
    await openSecond(m);
    await shot(m, ".rs-ev3-second", `${OUT}/m14-second-open.png`);
    /* ⑮ Hero → 근거 흐름 */
    await clipTo(m, ".rs-hero", ".rs-ev3", `${OUT}/m15-flow.png`);

    /* 손전화에서 첫 화면이 몇 뼘인지 재어 둔다. 그림만으로는 가려지지
       않는다 */
    const h = await m.evaluate(() => ({
      doc: Math.round(document.documentElement.scrollHeight),
      win: window.innerHeight,
    }));
    console.log(`  손전화 펼침 ${h.doc}px (창 ${h.win}px · ${(h.doc / h.win).toFixed(1)}배)`);
    console.log(`  응시 ${att} · ${CORE}`);
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
