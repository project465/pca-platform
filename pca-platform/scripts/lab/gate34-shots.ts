/**
 * **Gate 3·4 를 글자가 읽히는 크기로 뜬다**(R2 §24).
 *
 * 긴 쪽을 통째로 떠서 줄여 보내지 않는다. Gate 3 은 첫 화면(신분 → 한
 * 문장 → 카드 넷 → 산업·직무 한 줄)까지만 뜨고, Gate 4 는 근거 절
 * (`section#evidence`)과 그 안의 네 단계 카드 하나를 따로 뜬다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ OUT=... npx tsx scripts/lab/gate34-shots.ts
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
const OUT = process.env.OUT ?? "docs/metri/shots/review-loop/r2";

const seen = new Map<string, string>();
/** 같은 그림이 두 이름으로 저장되면 그 자리에서 멈춘다 */
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
  console.log(`  떴다 ${file}`);
}

/** 접는 자리를 전부 편다. 단추를 눌러야 열리는 React 상태다 */
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

/** 첫 자리부터 끝 자리까지를 잘라 뜬다. 줄여 보내지 않게 폭을 그대로 둔다 */
async function clipTo(p: Page, from: string, to: string, file: string): Promise<void> {
  const box = await p.evaluate(([a, b]) => {
    const s = document.querySelector(a as string);
    const e = document.querySelector(b as string);
    if (!s) return null;
    const sr = s.getBoundingClientRect();
    const er = (e ?? s).getBoundingClientRect();
    /* **폭은 그 묶음에서 가장 넓은 자리를 따른다.** 첫 자리의 폭으로
       자르면 그보다 넓은 카드가 오른쪽에서 잘려 나간다 */
    const box = (s.parentElement ?? s).getBoundingClientRect();
    const left = Math.min(sr.left, er.left, box.left);
    const right = Math.max(sr.right, er.right, box.right);
    return {
      x: Math.max(0, left + window.scrollX - 8),
      y: Math.max(0, sr.top + window.scrollY - 8),
      width: Math.min(window.innerWidth, right - left + 16),
      height: er.bottom + window.scrollY - (sr.top + window.scrollY) + 16,
    };
  }, [from, to]);
  if (!box) throw new Error(`${from} 자리를 찾지 못했습니다`);
  await p.screenshot({ path: file, fullPage: true, clip: box });
  mark(file);
}

/** 근거 절과 경험마다의 세로 길이를 잰다. 손전화 한 화면에 드는지는
    그림만으로 가려지지 않는다 */
async function evSize(p: Page, name: string): Promise<void> {
  const out = await p.evaluate(() => {
    const s = document.querySelector("section#evidence") as HTMLElement | null;
    const xs = Array.from(
      document.querySelectorAll("section#evidence .rs-st, section#evidence .rs-nx")) as HTMLElement[];
    return {
      sec: s ? Math.round(s.getBoundingClientRect().height) : -1,
      ex: xs.map((x) => Math.round(x.getBoundingClientRect().height)),
    };
  });
  console.log(`  ${name} 근거 절 ${out.sec}px · 경험 ${out.ex.join(" / ")}px`);
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

  const sid = `zzr2${Date.now().toString().slice(-8)}`;
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

    /* ── Gate 3 Desktop ── 첫 화면만. 아래 절은 Gate 4 가 든다 */
    await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await clipTo(p, ".rs-hero", ".rs-use", `${OUT}/gate3-desktop.png`);
    /* **Hero 와 Summary 를 따로 더 뜬다**(R3 §49). 첫 화면 한 장은 글자가
       작아져서 결론 한 줄의 활자 위계와 네 칸의 무게 차등을 눈으로 가릴 수
       없다. 자른 자리가 겹치지만 **같은 그림은 아니다**: `mark()` 가 지문을
       견주므로 둘이 같은 그림이면 그 자리에서 멈춘다 */
    await clipTo(p, ".rs-hero", ".rs-hero", `${OUT}/gate3-desktop-hero.png`);
    await clipTo(p, ".rs-use", ".rs-use", `${OUT}/gate3-desktop-summary.png`);

    /* ── Gate 4 Desktop ── 근거 절과 그 안의 네 단계 카드 하나 */
    await openAll(p);
    await p.waitForTimeout(400);
    /* **Gate 4 는 네 줄 이야기까지다.** 절 전체를 뜨면 아래 펼친 자리까지
       딸려와 글자가 작아지고, 묻는 것(`한 경험으로 읽히는가`)에 답할 수
       없다 */
    await clipTo(p, "section#evidence h2", ".rs-chain", `${OUT}/gate4-desktop.png`);
    await evSize(p, "desktop");
    /* **경험마다 따로 뜬다**(R7 §제출). 둘이 같은 틀의 변형인지는 둘을
       나란히 놓고 글자가 읽히는 크기로 봐야 가려진다 */
    const cards = p.locator("section#evidence .rs-st, section#evidence .rs-nx");
    for (let i = 0; i < Math.min(2, await cards.count()); i += 1) {
      const f = `${OUT}/gate4-desktop-card${i ? "2" : ""}.png`;
      await cards.nth(i).screenshot({ path: f });
      mark(f);
    }

    /* ── 390px ── */
    const m = await ctx.newPage();
    await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await m.waitForTimeout(400);
    await clipTo(m, ".rs-hero", ".rs-use", `${OUT}/gate3-mobile.png`);
    await clipTo(m, ".rs-hero", ".rs-hero", `${OUT}/gate3-mobile-hero.png`);
    await clipTo(m, ".rs-use", ".rs-use", `${OUT}/gate3-mobile-summary.png`);
    await openAll(m);
    await m.waitForTimeout(400);
    await clipTo(m, "section#evidence h2", ".rs-chain", `${OUT}/gate4-mobile.png`);
    await evSize(m, "mobile");
    const mcards = m.locator("section#evidence .rs-st, section#evidence .rs-nx");
    for (let i = 0; i < Math.min(2, await mcards.count()); i += 1) {
      const f = `${OUT}/gate4-mobile-card${i ? "2" : ""}.png`;
      await mcards.nth(i).screenshot({ path: f });
      mark(f);
    }
    console.log(`  응시 ${att} · ${CORE}`);
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
