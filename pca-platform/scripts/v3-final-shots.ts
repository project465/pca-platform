/**
 * Final UI Build 의 **Core 화면 일곱과 거드는 화면**을 실제로 밟으며 찍는다.
 *
 * 이 회차가 판단하는 것은 `돈을 받는 제품으로 보이는가` 이고, 그 답은
 * 상태코드에도 글자 수에도 없다. 그래서 첫 창만 자른 그림(`view`)과 쪽
 * 전체 그림(`page`)을 함께 남긴다. **고치기 전과 뒤를 같은 자리에서**
 * 찍어야 무엇이 달라졌는지 견줄 수 있다.
 *
 *   OUT=docs/metri/shots/final/before npx tsx scripts/v3-final-shots.ts
 *   OUT=docs/metri/shots/final/after  npx tsx scripts/v3-final-shots.ts
 *
 * **밟는 차례 그대로 찍는다.** 자리 목록을 주소로 하나씩 열면 그 쪽이
 * 어떤 상태인지는 지난번 누군가가 눌러 둔 상태에 달려 있다.
 *
 * **같은 그림이 두 이름으로 저장되면 걸린다.** 자리를 잘못 찾아 쪽 맨
 * 위를 열두 번 찍어 두고도 아무 검사가 세지 않던 일이 있었다.
 *
 * **폭은 규격 §57 그대로다.** 기본은 데스크톱 1440 과 손전화 390 이고,
 * `WIDE=1` 이면 일곱 폭을 전부 돈다(1440 · 1280 · 1024 · 430 · 390 ·
 * 360 · 320).
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { BASE, cloneFinished, gateCreds, login, makeStudent } from "./_loop-fixture";
import { chromium, type Browser, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const OUT = resolve(process.cwd(), process.env.OUT || "docs/metri/shots/final/after");

type Size = { w: number; h: number };
const ALL: Record<string, Size> = {
  d1440: { w: 1440, h: 900 },
  d1280: { w: 1280, h: 860 },
  d1024: { w: 1024, h: 800 },
  m430: { w: 430, h: 932 },
  m390: { w: 390, h: 844 },
  m360: { w: 360, h: 800 },
  m320: { w: 320, h: 720 },
};
const SIZES: Record<string, Size> = process.env.WIDE
  ? ALL
  : { d1440: ALL.d1440, m390: ALL.m390 };

const seen = new Map<string, string>();
let dup = 0, overflow = 0;

/** 찍고, 지문과 가로 넘침을 같이 센다 */
async function shot(p: Page, name: string): Promise<void> {
  for (const [kind, full] of [["view", false], ["page", true]] as const) {
    const buf = await p.screenshot({ fullPage: full });
    writeFileSync(resolve(OUT, `${name}.${kind}.png`), buf);
    /* 첫 창이 쪽 전체와 같은 화면은 정상이다. 견주는 것은 **다른 자리가
       같은 그림으로 저장된 경우**뿐이라 종류를 섞지 않는다 */
    const h = createHash("sha256").update(kind).update(buf).digest("hex");
    const twin = seen.get(h);
    if (twin) { dup += 1; console.log(`  겹침  ${name}.${kind} == ${twin}`); }
    else seen.set(h, `${name}.${kind}`);
  }
  const m = await p.evaluate(() => {
    /* **첫 창에서 뜻이 있는 것이 어디까지 내려오는가**(규격 §31).
       빈 칸이 넓어 보이는 까닭은 content 가 모자라서가 아니라 그 아래가
       통째로 비어서다. 그래서 **창 안에서 실제로 그려진 것의 맨 아래**를
       잰다. 띠와 바탕 판은 담긴 것이 없어도 창을 채우므로 뺀다 */
    const vh = window.innerHeight;
    const SKIP_TAG = ["HTML", "BODY", "MAIN", "SECTION", "FORM", "DIV"];
    let low = 0;
    for (const el of document.querySelectorAll("main *")) {
      if (SKIP_TAG.includes(el.tagName)) continue;
      if (el.closest(".cm-rail, .sf-nav, .cm-bot")) continue;
      if (el.closest("details:not([open])")) continue;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.height < 2 || r.width < 2) continue;
      if (r.top > vh) continue;
      low = Math.max(low, Math.min(r.bottom, vh));
    }
    return {
      doc: document.documentElement.scrollHeight,
      over: document.documentElement.scrollWidth > window.innerWidth + 1,
      fill: Math.round((low / vh) * 100),
    };
  });
  if (m.over) { overflow += 1; console.log(`  넘침  ${name} 가로로 밀린다`); }
  const vh = p.viewportSize()?.height ?? 900;
  console.log(
    `  찍음  ${name}  ${m.doc}px · 창 ${Math.round((m.doc / vh) * 10) / 10}배`
    + ` · 첫 창 ${m.fill}%`);
}

/**
 * 검사를 **실제로 시작한다.**
 *
 * **고르지 않고 보내면 그 자리에서 되돌아온다.** 시작 화면은 학업 단계를
 * 미리 켜 두지 않으므로(`start-form.tsx`), 단추만 누르면 서버가
 * `?e=stage` 로 돌려보낸다. 한동안 이 자리가 `시작 단추를 찾지 못했다` 로
 * 적혀 있었다 — **단추는 있었고 고르지 않은 것이었다.** 못 들어가면 지금
 * 선 주소와 쪽 머리글을 적어 다음 사람이 까닭을 본다.
 */
async function openAssessment(p: Page): Promise<boolean> {
  await p.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  /* 이어 볼 응시가 있으면 시작 화면이 거기로 돌려보낸다. 그러면 이미 안이다 */
  if (/\/v3\/\d+/.test(p.url())) return true;

  await p.locator('.qs-opt:has(input[name="stage"])').first()
    .click({ timeout: 8000 }).catch(() => undefined);
  await p.locator('button[type="submit"]').first()
    .click({ timeout: 10000 }).catch(() => undefined);
  await p.waitForURL(/\/v3\/\d+/, { timeout: 20000 }).catch(() => undefined);
  if (/\/v3\/\d+/.test(p.url())) return true;

  const head = await p.locator("h1").first().textContent().catch(() => null);
  console.log(`  못 들어감  ${p.url()} · ${String(head ?? "").trim().slice(0, 40)}`);
  return false;
}

/** 지금 선 화면에 답한다. **답하지 않으면 `다음` 이 막혀 있다** */
async function answer(p: Page): Promise<void> {
  /* 열두 줄 격자. 줄마다 가운데 칸을 누른다 */
  const rows = p.locator("fieldset.qs-sw");
  const n = await rows.count();
  if (n) {
    for (let i = 0; i < n; i += 1) {
      await rows.nth(i).locator(".qs-grade-b").nth(2)
        .click({ timeout: 2500 }).catch(() => undefined);
    }
    return;
  }
  /* 보기 묶음마다 하나씩. 묶음이 둘인 화면이 검사의 절반이다 */
  const sets = p.locator("fieldset.qs-opts");
  const m = await sets.count();
  for (let i = 0; i < m; i += 1) {
    await sets.nth(i).locator("label.qs-opt").nth(1)
      .click({ timeout: 2500 }).catch(() => undefined);
  }
}

/**
 * 밟아 가며 **성격이 다른 화면 둘**을 찍는다.
 *
 * 자리 목록을 주소로 열면 그 쪽이 어떤 상태인지는 지난번에 눌러 둔 상태에
 * 달려 있고, 검사 화면은 앞 화면에 답하지 않으면 애초에 서지 않는다.
 */
async function walkAssessment(p: Page, sz: string): Promise<void> {
  let grid = false, judge = false;
  for (let step = 0; step < 24 && !(grid && judge); step += 1) {
    if (/\/result/.test(p.url())) break;
    if (!grid && await p.locator(".qs-sweep").count()) {
      await shot(p, `08_assess_grid.${sz}`); grid = true;
    } else if (!judge && await p.locator(".qs-own").count()) {
      await shot(p, `09_assess_judge.${sz}`); judge = true;
    }
    await answer(p);
    const go = p.locator(".qs-nav button").filter({ hasText: /다음|계속/ }).first();
    if (!(await go.count())) break;
    await go.click({ timeout: 6000 }).catch(() => undefined);
    await p.waitForTimeout(700);
  }
  if (!grid) console.log(`  건너뜀  영역 훑기 (${sz})`);
  if (!judge) console.log(`  건너뜀  판단 보기 (${sz})`);
}

async function run(browser: Browser, sz: string, vp: Size): Promise<void> {
  const gate = gateCreds();
  const extra = gate ? { httpCredentials: gate } : {};
  const who = `final.${sz}@example.com`;
  const me = await makeStudent(who);
  const at = await cloneFinished(me.id, "PRO");
  if (!at) throw new Error("끝낸 PRO 결과가 이 DB 에 없습니다");

  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h }, ...extra,
  });
  const p = await login(ctx, who, me.pw);

  /* ── Core ───────────────────────────────────────────────────────── */
  await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await shot(p, `01_home.${sz}`);

  await p.goto(`${BASE}/me/state`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await shot(p, `02_state.${sz}`);

  await p.goto(`${BASE}/me/next`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await shot(p, `03_next.${sz}`);

  await p.goto(`${BASE}/me/experience/new`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await shot(p, `04_exp1.${sz}`);
  /* 2단으로 넘어가 본다. 고르지 않아도 넘어가면 그 모양을 찍는다 */
  await p.fill('input[name="title"]', "구조해석 캡스톤").catch(() => undefined);
  await p.locator('.cm-pick:has(input[name="kind"])').first()
    .click({ timeout: 3000 }).catch(() => undefined);
  await p.locator('.cm-wiz-nav button:has-text("다음")')
    .click({ timeout: 5000 }).catch(() => undefined);
  await p.waitForTimeout(600);
  await shot(p, `05_exp2.${sz}`);

  await p.goto(`${BASE}/v3/${at}/result`, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await shot(p, `06_result.${sz}`);
  await p.locator(".rs-openbtn").click({ timeout: 5000 }).catch(() => undefined);
  await p.waitForTimeout(700);
  await shot(p, `07_result_detail.${sz}`);

  if (await openAssessment(p)) await walkAssessment(p, sz);

  /* ── 거드는 화면 ────────────────────────────────────────────────── */
  for (const [n, path] of [
    ["10_results", "/me/results"], ["11_explore", "/me/explore"],
    ["12_region", "/me/region"], ["13_apply", "/me/apply"],
    ["14_track", "/me/track"], ["15_account", "/my"],
  ] as const) {
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(350);
    await shot(p, `${n}.${sz}`);
  }
  await ctx.close();
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  console.log(`Final UI 캡처 → ${OUT}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    for (const [sz, vp] of Object.entries(SIZES)) {
      console.log(`\n── ${sz} (${vp.w} × ${vp.h}) ──`);
      await run(browser, sz, vp);
    }
  } finally { await browser.close(); }
  console.log(`\n그림 ${seen.size + dup}장 · 겹침 ${dup} · 가로 넘침 ${overflow}`);
  if (dup || overflow) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
