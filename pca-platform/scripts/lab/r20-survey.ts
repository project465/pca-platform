/**
 * **ROUND 1 — 제품 비평용 전수 캡처**(GOLD MASTER CLOSURE §11).
 *
 * 지난 회차의 KEEP 판정을 믿지 않고 **자리마다 다시 뜬다**. Desktop 1440
 * 과 Mobile 390 에서 절을 하나씩 따로 떠서, 색과 여백이 아니라 **그 자리가
 * 무엇으로 읽히는지**를 사람이 읽는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/shots/review-loop/r20-before npx tsx scripts/lab/r20-survey.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { attemptOf, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment } from "../_v3-walk";
import { PEOPLE, answerAll } from "../_v3-answer";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const OUT = process.env.OUT ?? "docs/metri/shots/review-loop/r20-before";

/** 자리 목록. 이름이 곧 그 자리가 맡은 일이다 */
const SPOTS: [string, string][] = [
  ["01-hero", ".rs-hero"],
  ["02-use", ".rs-use"],
  ["03-now", ".rs-now"],
  ["04-state", ".rs-cs"],
  ["05-evidence", "#evidence"],
  ["06-plan", "#plan"],
  ["06b-pick", ".rs-pk"],
  ["07-industry", "#industry"],
  ["08-role", "#role"],
  ["09-focus", "#focus"],
  ["10-gaps", "#gaps"],
  ["11-spread", "#spread"],
  ["12-region", "#region"],
  ["13-records", "#records"],
  ["14-end", ".rs-end"],
];

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

async function shot(p: Page, sel: string, file: string): Promise<boolean> {
  const e = p.locator(sel).first();
  if (!(await e.count())) { console.log(`  없다 ${sel}`); return false; }
  await e.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(140);
  await p.$$eval(".rs-head, .cm-topbar",
    (els) => { for (const x of els) (x as HTMLElement).style.visibility = "hidden"; })
    .catch(() => undefined);
  await e.screenshot({ path: file }).catch(() => undefined);
  await p.$$eval(".rs-head, .cm-topbar",
    (els) => { for (const x of els) (x as HTMLElement).style.visibility = ""; })
    .catch(() => undefined);
  console.log(`  떴다 ${file}`);
  return true;
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

  const sid = `zzr20s${Date.now().toString().slice(-6)}`;
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

    for (const [w, tag] of [[1440, "d"], [390, "m"]] as [number, string][]) {
      const pg = w === 1440 ? p : await ctx.newPage();
      if (w !== 1440) await pg.setViewportSize({ width: 390, height: 844 });
      await pg.goto(URLR, { waitUntil: "networkidle" });
      await pg.waitForTimeout(450);
      await pg.screenshot({ path: `${OUT}/${tag}00-all-folded.png`, fullPage: true });
      console.log(`  떴다 ${OUT}/${tag}00-all-folded.png`);
      {
        const f = await pg.evaluate(() => ({
          doc: Math.round(document.documentElement.scrollHeight),
          win: window.innerHeight,
        }));
        console.log(`  ${w}px 접힘 ${f.doc}px (창 ${f.win}px · ${(f.doc / f.win).toFixed(1)}배)`);
      }
      await openAll(pg);
      await pg.waitForTimeout(400);
      for (const [name, sel] of SPOTS) {
        await shot(pg, sel, `${OUT}/${tag}${name}.png`);
      }
      const h = await pg.evaluate(() => ({
        doc: Math.round(document.documentElement.scrollHeight),
        win: window.innerHeight,
      }));
      console.log(`  ${w}px 펼침 ${h.doc}px (창 ${h.win}px · ${(h.doc / h.win).toFixed(1)}배)`);
    }
    console.log(`  응시 ${att} · ${CORE} · 계정 ${sid}`);
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
