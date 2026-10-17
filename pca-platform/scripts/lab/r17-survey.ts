/**
 * **먼저 전체 화면을 보고 결정한다**(R17 §12).
 *
 * CSS 를 고치기 전에 지금 BIZ Result 를 Desktop / Mobile 로 통째로 뜨고
 * 절마다 따로 뜬다. 절 하나씩 봐야 KEEP / REBUILD / DELETE 를 가릴 수 있다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/shots/review-loop/r17-before npx tsx scripts/lab/r17-survey.ts
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
const OUT = process.env.OUT ?? "docs/metri/shots/review-loop/r17-before";

const seen = new Map<string, string>();
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
}

async function openAll(p: Page): Promise<void> {
  const SHUT = 'button.rs-openbtn[aria-expanded="false"],'
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

/** 절마다 세로 길이를 재어 둔다. 그림만으로는 긴 자리가 가려지지 않는다 */
async function measure(p: Page, tag: string): Promise<void> {
  const rows = await p.evaluate(() => {
    const out: { sel: string; h: number; top: number }[] = [];
    const want = [
      ".rs-hero", ".rs-use", "#translation", ".rs-paths", ".rs-explore",
      ".rs-banner", "#evidence", "#deptartifacts", "#focus", "#gaps",
      "#industry", "#role", "#plan", "#deptnext", "#next", "#appendix",
      "#spread", "#zones", "#region", "#nearby", "#fourkeys", "#howto",
    ];
    for (const sel of want) {
      const e = document.querySelector(sel) as HTMLElement | null;
      if (!e) { out.push({ sel, h: -1, top: -1 }); continue; }
      const r = e.getBoundingClientRect();
      out.push({
        sel, h: Math.round(r.height), top: Math.round(r.top + window.scrollY),
      });
    }
    return {
      doc: Math.round(document.documentElement.scrollHeight),
      win: window.innerHeight, rows: out,
    };
  });
  console.log(`\n── ${tag} · 문서 ${rows.doc}px (창 ${rows.win}px · ${(rows.doc / rows.win).toFixed(1)}배)`);
  for (const r of rows.rows) {
    if (r.h < 0) { console.log(`   ${r.sel.padEnd(16)} 없음`); continue; }
    console.log(`   ${r.sel.padEnd(16)} ${String(r.top).padStart(6)}px 부터 ${String(r.h).padStart(5)}px`);
  }
}

async function shootSection(p: Page, sel: string, file: string): Promise<void> {
  const e = p.locator(sel).first();
  if (!(await e.count())) { console.log(`   건너뜀 ${sel}`); return; }
  await e.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(140);
  await e.screenshot({ path: file }).catch(() => undefined);
  try { mark(file); console.log(`   떴다 ${file}`); } catch (err) {
    console.log(`   ${(err as Error).message}`);
  }
}

const SECTS: [string, string][] = [
  [".rs-hero", "hero"],
  [".rs-use", "summary"],
  ["#translation", "translation"],
  [".rs-paths", "paths"],
  [".rs-explore", "explore"],
  [".rs-banner", "banner"],
  ["#evidence", "evidence"],
  ["#deptartifacts", "deptartifacts"],
  ["#focus", "focus"],
  ["#gaps", "gaps"],
  ["#industry", "industry"],
  ["#role", "role"],
  ["#plan", "plan"],
  ["#deptnext", "deptnext"],
  ["#next", "next"],
  ["#appendix", "appendix"],
  ["#spread", "spread"],
  ["#zones", "zones"],
  ["#region", "region"],
  ["#nearby", "nearby"],
  ["#fourkeys", "fourkeys"],
  ["#howto", "howto"],
];

async function main(): Promise<void> {
  assertFreshServer();
  assertPreviewServer(CORE);
  mkdirSync(OUT, { recursive: true });
  const u = university(UNI);
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const seat = allLeaves(u).find(
    (r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE);
  if (!seat) throw new Error(`${LEAF} 자리가 ${CORE} 를 가리키지 않습니다`);

  const sid = `zzr17${Date.now().toString().slice(-7)}`;
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

    /* ── Desktop 1440 ── */
    await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/all-desktop-closed.png`, fullPage: true });
    mark(`${OUT}/all-desktop-closed.png`);
    await measure(p, "Desktop 접힘");
    await openAll(p);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/all-desktop.png`, fullPage: true });
    mark(`${OUT}/all-desktop.png`);
    await measure(p, "Desktop 펼침");
    for (const [sel, name] of SECTS) {
      await shootSection(p, sel, `${OUT}/d-${name}.png`);
    }

    /* ── Mobile 390 ── */
    const m = await ctx.newPage();
    await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await m.waitForTimeout(400);
    await m.screenshot({ path: `${OUT}/all-mobile-closed.png`, fullPage: true });
    mark(`${OUT}/all-mobile-closed.png`);
    await measure(m, "Mobile 390 접힘");
    await openAll(m);
    await m.waitForTimeout(500);
    await m.screenshot({ path: `${OUT}/all-mobile.png`, fullPage: true });
    mark(`${OUT}/all-mobile.png`);
    await measure(m, "Mobile 390 펼침");
    for (const [sel, name] of SECTS) {
      await shootSection(m, sel, `${OUT}/m-${name}.png`);
    }
    console.log(`\n  응시 ${att} · ${CORE} · ${OUT}`);
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
