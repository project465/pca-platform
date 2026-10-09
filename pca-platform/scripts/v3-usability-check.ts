/**
 * 실사용 화면에서 **사람이 눌러 보고 걸린 것**을 기계가 다시 센다.
 *
 * 이 파일이 생긴 까닭은 세 가지가 전부 "화면은 200 으로 멀쩡히 뜨는데
 * 쓸 수 없는" 모양이었기 때문이다. 상태 코드와 캡처로는 셋 다 지나간다.
 *
 *   1. **두 문항이 한 화면에 선 자리에 문항별 질문이 없었다.** 머리글은
 *      `아래 두 가지에 각각 답해주세요` 한 줄이고 보기만 여덟 개가
 *      깔려서, 무엇을 묻는지가 화면 어디에도 없었다
 *   2. **학업 단계의 출처가 둘이었다.** 시작 화면이 아무 데도 적히지
 *      않은 기본값을 켜 두고, 열린 응시가 있으면 보낸 값을 조용히 버렸다
 *   3. **비기계 대학원생을 경고만 띄우고 통과시켰다.** `eligible()` 은
 *      있었고 부르는 곳이 없었다
 *
 * **정책을 여기서 다시 적지 않는다.** 막는 경우는 `runtime/routing.ts` 의
 * `eligible()` 하나가 정하고, 이 검사는 그 판정이 화면에 서는지만 본다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-usability-check.ts
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { chromium, type BrowserContext, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { attemptOf, planFor, saveAnswer, setProfile, openAttempt, type V3Attempt }
  from "../src/lib/me-v3/runtime/session";

const B = (process.env.UI_BASE || process.env.BASE
  || "http://127.0.0.1:3000").replace(/\/$/, "");
const GATE = process.env.STAGING_BASIC_AUTH || "";
const LOGIN = "v3usability@example.com";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? ` — ${d}` : ""}`); }
}

/** 열쇠는 이 자리에서 만든다. 저장소에도 문서에도 로그에도 남지 않는다 */
async function makeUser(): Promise<{ id: string; pw: string }> {
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [LOGIN]);
  if (old) {
    for (const t of ["v3_attempts", "v3_experiences", "v3_actions", "career_events",
                     "career_profiles", "memberships", "entitlements", "analytics_events"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1`, [old.id]).catch(() => undefined);
    }
    await query(`DELETE FROM users WHERE id = $1`, [old.id]).catch(() => undefined);
  }
  const pw = randomBytes(18).toString("base64url");
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,'실사용 점검',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
    [LOGIN, await hashPassword(pw)]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, NULL, 'student')
       ON CONFLICT DO NOTHING`, [row?.id]).catch(() => undefined);
  return { id: row?.id as string, pw };
}

async function login(ctx: BrowserContext, pw: string): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', LOGIN);
  await p.fill('input[type="password"]', pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
    .catch(() => undefined);
  return p;
}

/** 보기의 `input` 은 숨어 있다. 사람이 누르는 자리인 이름표를 누른다 */
async function pickValue(p: Page, name: string, value: string): Promise<void> {
  await p.locator(`label:has(input[name="${name}"][value="${value}"])`).first()
    .click({ timeout: 5000 }).catch(() => undefined);
  await p.waitForTimeout(250);
}

/** 기본 정보 화면의 보기에는 `value` 가 없다. 보이는 글자로 고른다 */
async function pickText(p: Page, text: string): Promise<void> {
  await p.locator(`.qs-opt:has-text("${text}")`).first()
    .click({ timeout: 5000 }).catch(() => undefined);
  await p.waitForTimeout(450);
}

/** 지금 켜져 있는 학업 단계를 사람이 읽는 글자로 돌려준다 */
async function stageOn(p: Page): Promise<string> {
  return p.$eval("fieldset.qs-opts", (e) =>
    e.querySelector(".qs-opt.is-on .qs-label")?.textContent?.trim() ?? "(없음)")
    .catch(() => "(못 읽음)");
}

/**
 * 두 문항이 한 화면에 선 자리를 찾는다.
 *
 * **화면 이름을 적어 두지 않는다.** 이름이 `probe-TD01_J3_1` 에서
 * `probe-TD01-J3` 으로 바뀐 날, 그렇게 적어 둔 캡처 세 자리가 조용히
 * 완료 화면을 찍고 있었다. 묶음 종류로 찾는다.
 */
async function pairIndexes(a: V3Attempt): Promise<number[]> {
  const plan = await planFor(a);
  return plan.screens.flatMap((s, i) => (s.kind === "pair" && s.items.length > 1 ? [i] : []));
}

async function main(): Promise<void> {
  const u = await makeUser();
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const gate = GATE.includes(":")
    ? { username: GATE.split(":")[0], password: GATE.slice(GATE.indexOf(":") + 1) } : null;
  const opts = gate ? { httpCredentials: gate } : {};

  try {
    /* ── 1. 학업 단계의 출처가 하나인가 ───────────────────────────── */
    const ctx = await browser.newContext(opts);
    const p = await login(ctx, u.pw);
    await p.goto(`${B}/v3/start`, { waitUntil: "networkidle" });
    const pre = await p.$$eval('input[name="stage"]', (els) =>
      els.filter((x) => (x as HTMLInputElement).checked).length);
    ok("시작 화면이 학업 단계를 미리 골라 두지 않는다", pre === 0,
      pre ? `${pre}개가 켜져 있다` : "고른 값만 켜진다");

    await pickValue(p, "stage", "phd");
    await pickValue(p, "field", "STEM");
    await Promise.all([
      p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
      p.locator('button[type="submit"]').last().click({ force: true }).catch(() => undefined),
    ]);
    await p.waitForLoadState("networkidle");
    const at1 = new URL(p.url()).pathname;
    const on1 = await stageOn(p);
    ok("시작 화면에서 고른 단계가 기본 정보에 그대로 선다", on1 === "박사",
      `${at1} · "${on1}"`);

    await p.goto(`${B}/v3/start`, { waitUntil: "networkidle" });
    const again = await p.locator('form button[type="submit"]').count();
    const at2 = new URL(p.url()).pathname;
    ok("이어 볼 응시가 있으면 단계를 다시 묻지 않는다",
      again === 0 && at2 === at1, `${at2} · 시작 폼 ${again}개`);

    /* **묶어 둔 폼이 조용히 버려지지 않는다.** 탭을 열어 둔 채 다른
       탭에서 응시를 열면 전에는 그 폼의 답이 사라져, 사람이 고른 값과
       화면에 선 값이 갈렸다 */
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [u.id]);
    const stale = await ctx.newPage();
    await stale.goto(`${B}/v3/start`, { waitUntil: "networkidle" });
    await pickValue(stale, "stage", "master");
    await pickValue(stale, "field", "STEM");
    const made = await openAttempt({
      userId: u.id, tier: "PRO", stage: "postdoc", gradField: "STEM", entitlementId: null,
    });
    await Promise.all([
      stale.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
      stale.locator('button[type="submit"]').last().click({ force: true }).catch(() => undefined),
    ]);
    await stale.waitForLoadState("networkidle");
    const landed = (stale.url().match(/\/v3\/(\d+)/) ?? [])[1] ?? "";
    const onStale = await stageOn(stale);
    ok("묶어 둔 시작 폼이 응시를 하나 더 열지 않는다", landed === String(made.id),
      `${made.id} → ${landed || "(못 감)"}`);
    ok("묶어 둔 시작 폼의 답이 버려지지 않는다", onStale === "석사",
      `보낸 것 석사 · 선 것 "${onStale}"`);
    await stale.close();

    /* ── 2. 비기계 대학원생을 묻기 전에 막는가 ─────────────────────── */
    const prof = await ctx.newPage();
    await prof.goto(`${B}/v3/${made.id}?s=0`, { waitUntil: "networkidle" });
    const nextOff = () => prof.$eval(".qs-nav button:last-of-type",
      (e) => (e as HTMLButtonElement).disabled).catch(() => null);
    await pickText(prof, "석사");
    await pickText(prof, "경상");
    await pickText(prof, "기계공학 계열이 아니었습니다");
    await prof.waitForTimeout(600);
    const stop = await prof.$eval(".qs-stop", (e) => e.textContent?.trim() ?? "")
      .catch(() => "");
    const way = await prof.$eval(".qs-stop a", (e) => e.getAttribute("href"))
      .catch(() => "");
    ok("학부와 대학원이 모두 비기계면 그 자리에서 멈춘다",
      !!stop && (await nextOff()) === true, stop ? "멈춤 패널이 선다" : "경고가 없다");
    ok("멈춘 자리에서 전공 목록으로 가는 길이 있다", way === "/cores", way || "없다");

    await pickText(prof, "기계공학 계열이었습니다");
    await prof.waitForTimeout(600);
    const stop2 = await prof.$eval(".qs-stop", (e) => e.textContent?.trim() ?? "")
      .catch(() => "");
    ok("학부가 기계공학이면 대학원 계열이 달라도 지나간다",
      !stop2 && (await nextOff()) === false, stop2 ? "막힌다" : "지나간다");

    await pickText(prof, "이공계");
    await prof.waitForTimeout(600);
    const stop3 = await prof.$eval(".qs-stop", (e) => e.textContent?.trim() ?? "")
      .catch(() => "");
    ok("이공계 대학원생은 막지 않는다", !stop3, stop3 ? "막힌다" : "지나간다");
    await prof.close();

    /* ── 3. 두 문항이 한 화면에 선 자리에 문항별 질문이 있는가 ────── */
    await setProfile(String(made.id), "phd", "STEM", "ME");
    let a = (await attemptOf(String(made.id), u.id)) as V3Attempt;
    /* 심화까지 열리게 영역 셋을 채워 둔다. 값은 routing 만 움직이고
       이 검사는 판정을 보지 않는다 */
    for (const [dom, v] of [["TD01", 5], ["TD02", 5], ["TD11", 4]] as const) {
      for (const [slot, val] of [["interest", v], ["exposure", 2], ["learning", v]] as const) {
        await saveAnswer(String(made.id), `SW_${dom}_${slot.toUpperCase()}`,
          { kind: "scale", value: val } as never).catch(() => undefined);
      }
    }
    a = (await attemptOf(String(made.id), u.id)) as V3Attempt;
    const pairs = await pairIndexes(a);
    ok("두 문항이 한 화면에 서는 자리가 있다", pairs.length > 0, `${pairs.length}자리`);

    const look = pairs.slice(0, 6);
    const empty: string[] = [];
    let seen = 0;
    for (const i of look) {
      const q = await ctx.newPage();
      await q.goto(`${B}/v3/${made.id}?s=${i}`, { waitUntil: "networkidle" });
      const rows = await q.$$eval(".qs-row", (els) => els.map((e) => ({
        q: e.querySelector(":scope > span")?.textContent?.trim() ?? "",
        opts: e.querySelectorAll(".qs-opts label").length,
      })));
      if (rows.length > 1) {
        seen += 1;
        for (const [n, r] of rows.entries()) {
          if (r.q.length < 10 || r.opts < 2) empty.push(`${i}번 화면 ${n + 1}째 줄`);
        }
      }
      await q.close();
    }
    ok("두 문항 화면마다 문항별 질문이 글자로 선다", seen > 0 && empty.length === 0,
      empty.length ? empty.join(" · ") : `${seen}자리 모두 두 줄에 질문이 있다`);

    /* **내부 scoring 문구를 남발하지 않는다.** 응시자에게 점수 구조를
       설명하는 줄이 화면마다 서면 그것이 검사의 주제처럼 읽힌다 */
    const leak: string[] = [];
    for (const i of [0, ...look]) {
      const q = await ctx.newPage();
      await q.goto(`${B}/v3/${made.id}?s=${i}`, { waitUntil: "networkidle" });
      const txt = await q.$eval("main", (e) => e.textContent ?? "").catch(() => "");
      if (/점수에는? 반영되지 않/.test(txt)) leak.push(`${i}번 화면`);
      await q.close();
    }
    ok("응시 화면에 점수 구조를 설명하는 줄이 없다", leak.length === 0,
      leak.length ? leak.join(" · ") : `화면 ${look.length + 1}자리`);

    await ctx.close();
  } finally {
    await browser.close();
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
