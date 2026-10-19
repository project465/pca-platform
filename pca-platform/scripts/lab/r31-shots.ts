/**
 * **R31 · BIZ 전체 여정 캡처.** 학교가 발급한 계정 하나가 제품과 같은 길로
 * 밟는다: 홈 → 검사 시작 → 시작 안내 → 응시 화면(실제 클릭) → 결과 → 현재
 * 상태 → 근거 → 할 일 → 지원서·면접 → 경험 추가 세 걸음 → 저장 직후 → 경험
 * 목록 · 고치기 → 지원 기록 → Track. Desktop 1440×900 과 Mobile 390×844 다.
 *
 * **검사 화면 다섯 장까지는 실제로 눌러서 지나고**, 그 뒤의 응답은 사람 C 의
 * 규칙으로 채운다(`answerAll`). 그래야 결과지에 근거가 서서 결과 · 현재 상태 ·
 * 근거 절이 읽을 만한 값을 든다. 실제 클릭만으로 끝까지 간 증거는
 * `r31-e2e.ts` 가 따로 남긴다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ OUT=docs/metri/review/r31/shots \
 *     npx tsx scripts/lab/r31-shots.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
  fillExperience,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page, type BrowserContext, type Browser } from "playwright";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { attemptOf, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment, walk } from "../_v3-walk";
import { PEOPLE, answerAll } from "../_v3-answer";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const OUT = process.env.OUT ?? "var/r31/shots";
const TITLE = process.env.TITLE ?? "동아리 행사 예산 집행 계획";
const REF = "docs/metri/shots/reference/reference-home-desktop.png";

const seen = new Map<string, string>();
const dups: string[] = [];
const index: { file: string; target: string; scenario: string; viewport: string; note: string }[] = [];
function mark(file: string, target: string, note = ""): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) {
    /* **같은 그림을 두 이름으로 남기지 않는다.** 다만 한 장 때문에 스무 분짜리
       바퀴를 통째로 버리지 않는다: 그 파일을 지우고 적어 두고 끝에서 걸린다 */
    unlinkSync(file);
    dups.push(`${had} = ${file}`);
    console.log(`  같다 ${file} (= ${had}) · 지웠다`);
    return;
  }
  seen.set(sum, file);
  const base = file.slice(file.lastIndexOf("/") + 1);
  index.push({
    file: base, target, scenario: "BIZ · PCU26_BIZ · 학교 발급 계정 · 사람 C",
    viewport: /-m\.png$/.test(base) ? "Mobile 390×844 @2x" : "Desktop 1440×900",
    note,
  });
  console.log(`  떴다 ${file}`);
}

async function hideBars(p: Page, on: boolean): Promise<void> {
  await p.$$eval(".rs-head, .cm-topbar, .qs-top",
    (els, v) => { for (const x of els) (x as HTMLElement).style.visibility = v ? "hidden" : ""; },
    on).catch(() => undefined);
}

/** 한 자리를 뜬다. 붙어 있는 머리띠를 잠시 감춘다 */
async function shot(p: Page, sel: string, file: string, target: string, note = ""): Promise<boolean> {
  const e = p.locator(sel).first();
  if (!(await e.count())) { console.log(`  없다 ${sel}`); return false; }
  if (!(await e.isVisible().catch(() => false))) { console.log(`  숨김 ${sel}`); return false; }
  await e.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(250);
  await hideBars(p, true);
  await e.screenshot({ path: file });
  await hideBars(p, false);
  mark(file, target, note);
  return true;
}

/** 결과지의 접힌 절을 편다. 더 채울 부분과 번역 절은 기본으로 접혀 있다 */
async function expand(p: Page): Promise<void> {
  const fold = p.locator("button.rs-foldbtn, button.rs-more, button.rs-openbtn, button.rs-discbtn, .rs-disc > summary");
  const n = await fold.count();
  for (let i = 0; i < n; i += 1) await fold.nth(i).click({ timeout: 3000 }).catch(() => undefined);
  await p.waitForTimeout(400);
}

/** 첫 창. 접힌 기본 상태 그대로 */
async function viewport(p: Page, file: string, target: string, note = ""): Promise<void> {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(300);
  await p.screenshot({ path: file });
  mark(file, target, note);
}

async function open(ctx: BrowserContext, url: string): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(450);
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

/** 경험 추가 세 걸음과 저장 직후 */
async function experienceRound(ctx: BrowserContext, sfx: "d" | "m", title: string): Promise<void> {
  const p = await ctx.newPage();
  await fillExperience(p, title, {
    onStep: async (n) => {
      await viewport(p, `${OUT}/${12 + n}-exp-step${n}-${sfx}.png`,
        `경험 추가 ${n}단`, n === 2 ? "결과가 선 영역부터 세우고 나머지를 접는다 (R31)" : "");
    },
  });
  console.log(`  저장 뒤 ${p.url()}`);
  await viewport(p, `${OUT}/16-postsave-${sfx}.png`, "경험 저장 직후",
    "일곱 항목 구조 · 학생 실제 데이터만 (R31)");
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

  const sid = `zzr31s${Date.now().toString().slice(-7)}`;
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error("PCU 기관 줄이 없습니다");
  const actor = await queryOne<{ user_id: string; role: string; org_id: number }>(
    `SELECT m.user_id::text, m.role, m.org_id FROM memberships m
      WHERE m.org_id = $1::bigint AND m.role IN ('org_admin','org_manager') LIMIT 1`, [org.id]);
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
    /* ── 검사 전 홈 ── */
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await viewport(p, `${OUT}/00-home-before-d.png`, "홈 /me (검사 전)");

    /* 손전화의 시작 화면은 **응시를 열기 전에** 뜬다. `/v3/start` 는 열린
       응시가 있으면 그리로 돌려보내므로 뒤에 열면 응시 화면이 그 이름으로 선다
       (한 번 그랬다) */
    const mctx = await mobileCtx(browser, ctx);
    {
      const ms = await open(mctx, `${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`);
      await ms.locator('form button[type="submit"]').first().click({ timeout: 5000 }).catch(() => undefined);
      await ms.waitForURL(/\/v3\/start/, { timeout: 20000 }).catch(() => undefined);
      await ms.waitForLoadState("networkidle").catch(() => undefined);
      if (/\/v3\/start/.test(ms.url())) await viewport(ms, `${OUT}/02-assess-start-m.png`, "검사 시작 화면 /v3/start");
      await ms.close();
    }

    /* ── 학과 → 시작 화면 → 응시 ── */
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`, { waitUntil: "networkidle" });
    for (let t = 0; t < 2 && !/\/v3\//.test(p.url()); t += 1) {
      await p.locator('form button[type="submit"]').first().click({ timeout: 5000 }).catch(() => undefined);
      await p.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname), { timeout: 20000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (/\/v3\/start/.test(p.url())) {
      await viewport(p, `${OUT}/02-assess-start-d.png`, "검사 시작 화면 /v3/start");
      await p.getByText("학부", { exact: true }).click({ timeout: 5000 }).catch(() => undefined);
      await p.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 }).catch(() => undefined);
      await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
    if (!att) throw new Error(`응시가 열리지 않았습니다 ${p.url()}`);
    console.log(`응시 ${att}  ${CORE} / ${LEAF}`);
    if (/\/intro/.test(p.url())) {
      await viewport(p, `${OUT}/03-assess-intro-d.png`, "시작 안내 /v3/{id}/intro");
    }
    await enterAssessment(p);
    const firstUrl = p.url();
    await viewport(p, `${OUT}/04-assess-interest-d.png`, "응시 · 영역 훑기(관심)", "실제 클릭으로 진입");
    await walk(p, 4);
    await viewport(p, `${OUT}/05-assess-judgment-d.png`, "응시 · 판단 문항", "실제 클릭으로 4화면 지난 뒤");

    /* 손전화로 같은 응시를 이어서 밟는다. 열린 응시는 **지금 서 있는 화면**
       으로 열리므로 주소로 앞뒤 화면을 고를 수 없다: 손전화에서 몇 화면을
       실제로 눌러 지난 뒤 그 자리를 뜬다 */
    {
      const m1 = await open(mctx, `${BASE}/v3/${att}/intro`);
      if (/\/intro/.test(m1.url())) await viewport(m1, `${OUT}/03-assess-intro-m.png`, "시작 안내");
      await m1.close();
      const m2 = await open(mctx, `${BASE}/v3/${att}`);
      console.log(`  손전화 응시 화면 ${m2.url()}`);
      await viewport(m2, `${OUT}/04-assess-interest-m.png`, "응시 · 영역 훑기(관심)", "데스크톱이 지난 자리에서 이어서");
      await walk(m2, 3);
      await viewport(m2, `${OUT}/05-assess-judgment-m.png`, "응시 · 판단 문항", "손전화에서 실제 클릭으로 3화면 지난 뒤");
      await m2.close();
    }

    /* 사람 C 로 채워 제출 */
    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const pol = PEOPLE.find((x) => x.id === "C");
    if (!pol) throw new Error("사람 C 가 없습니다");
    await answerAll(CORE, a, stu.id, pol);
    await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
    if (/\/v3\/\d+$/.test(p.url()))
      await viewport(p, `${OUT}/05b-assess-submit-d.png`, "응시 · 제출 직전 (마지막 화면)", "실제 클릭으로 제출한다");
    for (let t = 0; t < 4 && !/\/(done|result)$/.test(p.url()); t += 1) {
      const btn = p.locator("button.qs-btn-main, a.qs-btn-main").first();
      if (!(await btn.count())) break;
      const was = p.url();
      await btn.click({ force: true }).catch(() => undefined);
      await p.waitForURL((x) => x.href !== was, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (!/\/(done|result)/.test(p.url())) throw new Error(`제출 못함 ${p.url()}`);
    if (/\/done$/.test(p.url())) await viewport(p, `${OUT}/06-done-d.png`, "완료 브리지 /v3/{id}/done");
    await p.close();
    const URLR = `${BASE}/v3/${att}/result`;

    /* ── Desktop: 결과 다섯 자리 ── */
    const d = await open(ctx, URLR);
    await viewport(d, `${OUT}/07-result-top-d.png`, "결과 첫 화면");
    await expand(d);
    await shot(d, ".rs-st", `${OUT}/08-result-state-d.png`, "결과 · 현재 상태", "카드 셋 세부가 한 종류 (R31)");
    await shot(d, "#evidence", `${OUT}/09-result-evidence-d.png`, "결과 · 근거(Evidence)");
    await shot(d, "#plan", `${OUT}/10-result-plan-d.png`, "결과 · 할 일(Action)");
    await shot(d, "#gaps", `${OUT}/11-result-gaps-d.png`, "결과 · 더 채울 부분(Gap)", "PARTIAL 말이 머리글과 부딪히지 않는다 (R31)");
    await shot(d, "#translation", `${OUT}/12-result-apply-d.png`, "결과 · 지원서·면접(PRO 번역)");
    await d.close();

    /* ── Desktop: 작업공간 ── */
    const w = await open(ctx, `${BASE}/me`);
    await viewport(w, `${OUT}/01-home-d.png`, "홈 /me (결과 뒤)", "레퍼런스 대조 대상");
    {
      const head = w.locator(".cm-sh", { hasText: "현재 상태" }).first();
      const tiles = w.locator(".cm-tiles").first();
      await head.scrollIntoViewIfNeeded().catch(() => undefined);
      const hb = await head.boundingBox(); const tb = await tiles.boundingBox();
      if (hb && tb) {
        const x = Math.min(hb.x, tb.x) - 8, y = hb.y - 8;
        const clip = { x, y, width: Math.max(hb.x + hb.width, tb.x + tb.width) - x + 8,
          height: tb.y + tb.height - y + 8 };
        await w.screenshot({ path: `${OUT}/08b-home-state-d.png`, clip });
        mark(`${OUT}/08b-home-state-d.png`, "홈 · 현재 상태 절", "결과지와 같은 함수 · 거드는 줄 두 줄까지 (R31)");
      }
    }
    await w.close();
    for (const [n, path, target] of [
      ["17", "/me/state", "현재 상태 /me/state"], ["18", "/me/next", "지금 할 일 /me/next"],
    ] as const) {
      const q = await open(ctx, `${BASE}${path}`);
      await viewport(q, `${OUT}/${n}-${path.replace(/\//g, "").replace("me", "me-")}-d.png`, target);
      await q.close();
    }
    await experienceRound(ctx, "d", TITLE);
    {
      const q = await open(ctx, `${BASE}/me`);
      await viewport(q, `${OUT}/23-home-after-save-d.png`, "홈 /me (경험 저장 뒤)", "저장 전 01-home-d 와 비교");
      await q.close();
    }
    const exp = await queryOne<{ id: string }>(
      `SELECT id::text FROM v3_experiences WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [stu.id]);
    for (const [n, path, target] of [
      ["19-exp-list", "/me/experience", "경험 목록"],
      ["20-exp-edit", exp ? `/me/experience/${exp.id}/edit` : "/me/experience", "경험 고치기"],
      ["21-me-apply", "/me/apply", "지원 기록 /me/apply"], ["22-me-track", "/me/track", "Track /me/track"],
    ] as const) {
      const q = await open(ctx, `${BASE}${path}`);
      await viewport(q, `${OUT}/${n}-d.png`, target);
      await q.close();
    }

    /* ── Mobile 390 ── */
    const m = await open(mctx, URLR);
    await viewport(m, `${OUT}/07-result-top-m.png`, "결과 첫 화면");
    await expand(m);
    await shot(m, ".rs-st", `${OUT}/08-result-state-m.png`, "결과 · 현재 상태");
    await shot(m, "#evidence", `${OUT}/09-result-evidence-m.png`, "결과 · 근거(Evidence)");
    await shot(m, "#plan", `${OUT}/10-result-plan-m.png`, "결과 · 할 일(Action)");
    await shot(m, "#gaps", `${OUT}/11-result-gaps-m.png`, "결과 · 더 채울 부분(Gap)");
    await shot(m, "#translation", `${OUT}/12-result-apply-m.png`, "결과 · 지원서·면접(PRO 번역)");
    await m.close();
    for (const [n, path, target] of [
      ["01", "/me", "홈 /me (결과 뒤)"], ["17", "/me/state", "현재 상태 /me/state"],
      ["18", "/me/next", "지금 할 일 /me/next"],
    ] as const) {
      const q = await open(mctx, `${BASE}${path}`);
      await viewport(q, `${OUT}/${n}-${path === "/me" ? "home" : path.replace(/\//g, "").replace("me", "me-")}-m.png`, target);
      await q.close();
    }
    await experienceRound(mctx, "m", `${TITLE} (발표 자료)`);
    {
      const q = await open(mctx, `${BASE}/me`);
      await viewport(q, `${OUT}/23-home-after-save-m.png`, "홈 /me (경험 저장 뒤)", "저장 전 01-home-m 와 비교");
      await q.close();
    }
    for (const [n, path, target] of [
      ["19-exp-list", "/me/experience", "경험 목록"],
      ["21-me-apply", "/me/apply", "지원 기록 /me/apply"], ["22-me-track", "/me/track", "Track /me/track"],
    ] as const) {
      const q = await open(mctx, `${BASE}${path}`);
      await viewport(q, `${OUT}/${n}-m.png`, target);
      await q.close();
    }
    await mctx.close();
  } finally {
    await browser.close();
  }
  /* 나란히 */
  execFileSync("python3", ["scripts/lab/r31_compare.py", `${OUT}/cmp-home-vs-reference.png`,
    "Reference (Premium Home)", REF, "CareerMatri /me (1440x900)", `${OUT}/01-home-d.png`], { stdio: "inherit" });
  index.push({ file: "cmp-home-vs-reference.png", target: "레퍼런스 ↔ 홈 나란히", scenario: "-",
    viewport: "폭 720 로 맞춤 · 세로 제 비율", note: "늘려 맞추지 않음" });
  execFileSync("python3", ["scripts/lab/r31_compare.py", `${OUT}/cmp-result-state-vs-home.png`,
    "Result · Current State", `${OUT}/08-result-state-d.png`, "/me Home · Current State", `${OUT}/08b-home-state-d.png`],
  { stdio: "inherit" });
  index.push({ file: "cmp-result-state-vs-home.png", target: "결과지 현재 상태 ↔ 홈 현재 상태", scenario: "-",
    viewport: "폭 720", note: "같은 함수(studentStateView)" });
  writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 2));
  console.log(`\n떴다 → ${OUT}  (응시자 ${sid})`);
  if (dups.length) { console.log(`\n같은 그림 ${dups.length}: ${dups.join(" / ")}`); process.exit(1); }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
