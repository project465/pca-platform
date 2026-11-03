/**
 * **영어판을 실제 브라우저로 한 바퀴 돈다.** 시작 → 검사 → 결과 → 종이.
 *
 * `v3:i18n` 은 파일과 사전을 센다. 그 검사가 녹색이어도 화면 어딘가가
 * 한국어로 떨어질 수 있다: 사전을 거치지 않고 글자를 박아 둔 자리, 응시
 * 언어를 들고 가지 않는 쪽, 종이를 그리는 머리 없는 브라우저가 쿠키를
 * 못 받는 자리가 그렇다. 그래서 **사람이 누르는 차례 그대로** 지나가면서
 * 화면마다 한글을 센다. 한 글자라도 서면 실패다.
 *
 *   V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 CORES=ME_CORE_V3,EE_CORE_V1,CS_CORE_V1 \
 *     TIER=PRO OUT=<저장소 밖> npm run v3:en:walk
 *
 * 찍은 그림은 `OUT` 에 남긴다(넓은 화면 1440 · 손전화 390).
 *
 * **입구부터 한 번 더 밟는다**(영어판 2단계, `ENTRY=0` 이면 건너뛴다). 쿠키를
 * 미리 넣지 않고 홈페이지가 넘겨 주는 주소(`/start?lang=en&market=GLOBAL`)로
 * 들어와서, 사람처럼 `개인으로 시작` → 가입 → 전공 고르기 → 무료 기본 검사 →
 * 결과까지 간다. 로그인 · 비밀번호 찾기 · 가격표 · 없는 쪽도 영어인지 센다.
 *
 * **DB 없이 배포본에서도 돈다**(`NODB=1`). 입구 한 바퀴만 브라우저로 지나가고,
 * DB 를 들여다보는 두 줄은 `못 봄` 으로 적는다. 전공별 PRO 바퀴는 이용권을 DB 에
 * 넣어야 해서 이 모드에서는 돌지 않는다.
 *
 *   NODB=1 UI_BASE=https://<staging> STAGING_BASIC_AUTH=<자물쇠> npm run v3:en:walk
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import {
  BASE, assertFreshServer, fillExperience, gateCreds, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { walk } from "./_v3-walk";
import { query } from "../src/lib/db";

loadEnv();

const CORES = (process.env.CORES ?? "ME_CORE_V3,EE_CORE_V1,CS_CORE_V1").split(",");
const TIER = (process.env.TIER ?? "PRO") as "BASIC" | "STANDARD" | "PRO";
const STAGE = process.env.STAGE ?? "bachelor";
const OUT = process.env.OUT ?? "";
const NODB = process.env.NODB === "1";
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
/** 손님 화면에 서면 안 되는 안쪽 코드 */
const INNER = /\bTD\d\d\b|\bJ[1-8]\b|INDUSTRY_|ROLE_|_CORE_V\d/;

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? " — " + saw : ""}`); }
};

/** 한글이 선 자리를 앞뒤 글자와 함께 돌려준다. 없으면 null */
function hangulAt(text: string): string | null {
  const m = HANGUL.exec(text);
  if (!m) return null;
  return text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, " ");
}

async function bodyText(p: Page): Promise<string> {
  return (await p.locator("body").innerText().catch(() => "")) ?? "";
}

async function shot(p: Page, name: string): Promise<void> {
  if (!OUT) return;
  await p.screenshot({ path: join(OUT, `${name}.png`), fullPage: true }).catch(() => undefined);
}

async function one(core: string): Promise<void> {
  console.log(`\n■ ${core} · ${TIER} · ${STAGE}`);
  const mail = `en-walk-${core.toLowerCase().replace(/_/g, "-")}@test.invalid`;
  const student = await makeStudent(mail);
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1, $2, 'report', $3, 'ME', 'ME_V3_2', 'active')`,
    [student.id, `ME_V3_${TIER}_KR`, TIER]);

  const gate = gateCreds();
  const browser = await chromium.launch();
  const host = new URL(BASE).hostname;
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    ...(gate ? { httpCredentials: gate } : {}),
  });
  /* **시장과 언어를 사람이 고른 것처럼 쿠키로 든다.** 주소에 `?lang=` 을
     붙이지 않는 까닭: 응시 언어는 응시 줄이 들고 다녀야 하고, 주소에만
     있으면 다음 쪽에서 떨어진다. 그것을 재려는 것이다 */
  await ctx.addCookies([
    { name: "cm_market", value: "GLOBAL", domain: host, path: "/" },
    { name: "metri_lang", value: "en", domain: host, path: "/" },
  ]);
  const errs: string[] = [];
  const p = await login(ctx, mail, student.pw);
  p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });

  try {
    await p.goto(`${BASE}/v3/start?core=${core}`, { waitUntil: "networkidle" });
    const start = await bodyText(p);
    ok("시작 화면에 한글이 없다", !hangulAt(start), hangulAt(start) ?? "");
    await shot(p, `${core}-start`);
    await p.locator(`label:has(input[name="stage"][value="${STAGE}"])`).first()
      .click().catch(() => undefined);
    if (STAGE !== "bachelor") {
      await p.locator('label:has(input[name="field"][value="STEM"])').first()
        .click().catch(() => undefined);
    }
    await Promise.all([
      p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
      p.locator('button[type="submit"]').last().click({ force: true }).catch(() => undefined),
    ]);
    await p.waitForLoadState("networkidle");
    const id = (p.url().match(/\/v3\/(\d+)/) ?? [])[1] ?? "";
    ok("응시가 열린다", !!id, new URL(p.url()).pathname);
    const row = await query<{ locale: string; core_code: string }>(
      `SELECT locale, core_code FROM v3_attempts WHERE id = $1::bigint`, [id]);
    ok("응시 줄의 언어가 en 이다", row[0]?.locale === "en", row[0]?.locale ?? "없음");
    ok("고른 전공으로 열린다", row[0]?.core_code === core, row[0]?.core_code ?? "없음");

    const hits: string[] = []; const inner: string[] = [];
    let n = 0; let mobileShots = 0;
    const out = await walk(p, 260, {
      note: "I set the load cases and boundary conditions myself and checked them against a hand calculation.",
      onScreen: async (pg) => {
        n += 1;
        const t = await bodyText(pg);
        const h = hangulAt(t);
        const path = new URL(pg.url()).pathname + new URL(pg.url()).search;
        if (h) hits.push(`${path} … ${h}`);
        const m = INNER.exec(t);
        if (m) inner.push(`${path} … ${m[0]}`);
        if (n <= 3 || n % 12 === 0) await shot(pg, `${core}-q${String(n).padStart(3, "0")}`);
        /* 손전화 폭으로 몇 화면만 다시 본다: 줄이 넘치는 자리는 영어가 더 길다 */
        if (OUT && (n === 2 || n === 10) && mobileShots < 2) {
          mobileShots += 1;
          await pg.setViewportSize({ width: 390, height: 844 });
          const wide = await pg.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (wide > 1) inner.push(`${path} … 390px 가로 넘침 ${wide}px`);
          await shot(pg, `${core}-q${String(n).padStart(3, "0")}-390`);
          await pg.setViewportSize({ width: 1440, height: 900 });
        }
      },
    });
    ok("검사가 끝까지 간다", out.done, `${out.screens}화면`);
    ok("검사 화면 전부에 한글이 없다", hits.length === 0,
      hits.length ? `${hits.length}화면 · 처음 ${hits.slice(0, 3).join(" | ")}` : `${n}화면`);
    ok("검사 화면에 안쪽 코드가 없다", inner.length === 0, inner.slice(0, 3).join(" | "));

    /* 결과 */
    if (!/\/result/.test(p.url())) {
      await p.goto(`${BASE}/v3/${id}/result`, { waitUntil: "networkidle" });
    }
    await p.waitForLoadState("networkidle");
    const res = await bodyText(p);
    ok("결과 화면이 선다", /\/result/.test(p.url()) && res.length > 400, `${res.length}자`);
    ok("결과 화면에 한글이 없다", !hangulAt(res), hangulAt(res) ?? "");
    const ri = INNER.exec(res);
    ok("결과 화면에 안쪽 코드가 없다", !ri, ri?.[0] ?? "");
    await shot(p, `${core}-result`);
    await p.setViewportSize({ width: 390, height: 844 });
    const wide = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("결과 화면이 390px 에서 가로로 넘치지 않는다", wide <= 1, `${wide}px`);
    await shot(p, `${core}-result-390`);
    await p.setViewportSize({ width: 1440, height: 900 });

    /* 종이. **부른 사람의 쿠키로** 받는다: 그 쿠키가 응시 언어를 들고 가는지가 질문이다 */
    const pdf = await ctx.request.get(`${BASE}/v3/${id}/result/pdf`, { timeout: 120000 });
    const ct = pdf.headers()["content-type"] ?? "";
    ok("PDF 를 받는다", pdf.status() === 200 && ct.includes("pdf"), `${pdf.status()} ${ct}`);
    if (pdf.status() === 200 && OUT) {
      const f = join(OUT, `${core}-${TIER}.pdf`);
      writeFileSync(f, await pdf.body());
      let txt = "";
      try { txt = execFileSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" }); }
      catch { txt = ""; }
      const pages = (() => {
        try {
          const info = execFileSync("pdfinfo", [f], { encoding: "utf8" });
          return Number((info.match(/Pages:\s+(\d+)/) ?? [])[1] ?? 0);
        } catch { return 0; }
      })();
      /* 시험 계정의 표시 이름(`홍길동`)은 사람이 적은 값이라 세지 않는다(/me 와 같은 규칙).
         PRO 는 영어 책이므로 쪽 수도 본다 */
      const body = txt.replace(/홍길동|홍/g, "");
      ok("PDF 에 한글이 없다", !!txt && !hangulAt(body), hangulAt(body) ?? `${pages}쪽`);
      if (TIER === "PRO") ok("PRO 종이가 영어 책(66쪽 이상)이다", pages >= 66, `${pages}쪽`);
    }

    /* 로그인한 사람의 첫 화면. **작업공간이 영어로 선다**(영어판 2단계b).
       시험 계정의 표시 이름(`홍길동`)은 사람이 적은 값이라 세지 않는다 */
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    const me = (await bodyText(p)).replace(/홍길동|홍/g, "");
    const mePath = new URL(p.url()).pathname;
    ok("내 CareerMatri 가 영어로 선다", mePath === "/me" && !hangulAt(me),
      `${mePath} ${hangulAt(me) ?? ""}`);
    await shot(p, `${core}-me`);

    ok("브라우저 오류와 500 이 없다", errs.length === 0, errs.slice(0, 3).join(" | "));
  } finally {
    await browser.close();
  }
}

/** 홈페이지에서 넘어온 처음 온 사람. 이용권 없이 무료 기본 검사로 간다 */
async function entry(core: string): Promise<void> {
  console.log(`\n■ 입구부터 · ${core} · 무료 기본`);
  const mail = `en-entry-${Date.now()}@test.invalid`;
  const gate = gateCreds();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, locale: "en-US",
    ...(gate ? { httpCredentials: gate } : {}),
  });
  const p = await ctx.newPage();
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
  const clean = async (what: string, name: string) => {
    /* 언어 고르기의 `한국어` 는 뺀다. 언어 이름은 그 언어로 적는 것이 맞다 */
    const t = (await bodyText(p)).replace(/한국어/g, "");
    ok(`${what}에 한글이 없다`, !hangulAt(t), hangulAt(t) ?? new URL(p.url()).pathname);
    await shot(p, `entry-${name}`);
  };
  try {
    await p.goto(`${BASE}/start?lang=en&market=GLOBAL`, { waitUntil: "networkidle" });
    await clean("문 고르기", "1-start");
    for (const path of ["/login", "/password/forgot", "/pricing", "/this-page-does-not-exist"]) {
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await clean(path, path.replace(/\W+/g, "-"));
    }
    await p.goto(`${BASE}/start`, { waitUntil: "networkidle" });
    await Promise.all([
      p.waitForURL(/\/signup/, { timeout: 20000 }).catch(() => undefined),
      p.locator("a.en-door.is-primary").first().click(),
    ]);
    ok("개인으로 시작이 가입으로 간다", /\/signup/.test(p.url()), new URL(p.url()).pathname);
    await clean("가입", "2-signup");
    await p.fill('input[name="name"]', "Alex Kim");
    await p.fill('input[name="email"]', mail);
    await p.fill('input[name="password"]', "short");
    for (const c of await p.locator('input[type="checkbox"]').all()) await c.check({ force: true }).catch(() => undefined);
    await p.locator('button[type="submit"]').click();
    await p.waitForTimeout(1500);
    await clean("가입 오류 문구", "2b-signup-error");
    ok("오류가 나도 적은 이름 · 이메일 · 동의가 남는다",
      (await p.inputValue('input[name="email"]')) === mail
      && (await p.locator('input[name="consent"]:checked').count()) > 0);
    await p.fill('input[name="password"]', `Pw-${Date.now()}-walk`);
    await Promise.all([
      p.waitForURL((u) => !u.pathname.startsWith("/signup"), { timeout: 30000 }).catch(() => undefined),
      p.locator('button[type="submit"]').click(),
    ]);
    await p.waitForLoadState("networkidle");
    ok("가입하면 전공 고르기로 간다", new URL(p.url()).pathname === "/cores", new URL(p.url()).pathname);
    await clean("전공 고르기", "3-cores");
    if (NODB) console.log("  못 봄  계정에 영어가 적힌다 — NODB");
    else {
      const u = await query<{ locale: string }>(`SELECT locale FROM users WHERE email = $1`, [mail]);
      ok("계정에 영어가 적힌다", u[0]?.locale?.trim() === "en", u[0]?.locale ?? "없음");
    }
    const cards = await p.locator("a.en-door").count();
    ok("전공 카드는 영어 원고가 있는 셋이다", cards === 3, `${cards}장`);
    await Promise.all([
      p.waitForURL(/\/v3\/start/, { timeout: 20000 }).catch(() => undefined),
      p.locator(`a.en-door[href*="${core}"]`).first().click(),
    ]);
    await p.waitForLoadState("networkidle");
    await clean("검사 시작 화면", "4-v3start");
    await p.locator('label:has(input[name="stage"][value="bachelor"])').first().click().catch(() => undefined);
    await Promise.all([
      p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
      p.locator('button[type="submit"]').last().click({ force: true }),
    ]);
    const id = (p.url().match(/\/v3\/(\d+)/) ?? [])[1] ?? "";
    if (NODB) ok("응시가 열린다", Boolean(id), new URL(p.url()).pathname);
    else {
      const row = await query<{ locale: string; tier: string; core_code: string }>(
        `SELECT locale, tier, core_code FROM v3_attempts WHERE id = $1::bigint`, [id]);
      ok("무료 기본 · 영어 · 고른 전공으로 열린다",
        row[0]?.locale === "en" && row[0]?.tier === "BASIC" && row[0]?.core_code === core,
        `${row[0]?.locale} ${row[0]?.tier} ${row[0]?.core_code}`);
    }
    const hits: string[] = [];
    const out = await walk(p, 200, {
      note: "I chose the motor size myself after working out load and inertia.",
      onScreen: async (pg) => {
        const h = hangulAt(await bodyText(pg));
        if (h) hits.push(`${new URL(pg.url()).pathname} … ${h}`);
      },
    });
    ok("검사가 끝까지 가고 한글이 없다", out.done && !hits.length,
      `${out.screens}화면 ${hits.slice(0, 2).join(" | ")}`);
    if (!/\/result/.test(p.url())) await p.goto(`${BASE}/v3/${id}/result`, { waitUntil: "networkidle" });
    await clean("결과", "5-result");
    ok("결과에서 내 CareerMatri 로 가는 길이 선다",
      (await p.locator('a[href="/me"]').count()) > 0);

    /* ── 작업공간(영어판 2단계b). **화면마다 한글을 세고**, 경험을 하나 적어
       반영까지 간다. 한국 자료에 서 있는 쪽은 영어에서 홈으로 돌아가야 한다 */
    for (const path of ["/me", "/me/state", "/me/next", "/me/experience",
      "/me/results", "/me/explore", "/me/prep", "/me/track", "/my"]) {
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      ok(`${path} 가 열린다`, new URL(p.url()).pathname === path, new URL(p.url()).pathname);
      await clean(`작업공간 ${path}`, `7-ws${path.replace(/\W+/g, "-")}`);
    }
    /* MAT(`/me/track`)은 2026-10-26 부터 영어로도 열린다. 위 목록에서 센다 */
    for (const path of ["/me/region", "/me/jobs", "/me/apply"]) {
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      ok(`한국 전용 ${path} 는 홈으로 돌아간다`, new URL(p.url()).pathname === "/me",
        new URL(p.url()).pathname);
    }
    const title = "Gearbox redesign for a capstone rig";
    const picked = await fillExperience(p, title, {
      onStep: async (n) => {
        const t = (await bodyText(p)).replace(/한국어/g, "");
        ok(`경험 적기 ${n}단계에 한글이 없다`, !hangulAt(t), hangulAt(t) ?? "");
        await shot(p, `8-exp-step${n}`);
      },
    });
    ok("경험에서 기술영역이 골라졌다", picked > 0, `${picked}개`);
    ok("저장하면 반영 화면으로 간다", new URL(p.url()).pathname === "/me/recompute",
      new URL(p.url()).pathname);
    await clean("반영 화면", "9-recompute");
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    ok("홈에 방금 적은 경험이 선다", (await bodyText(p)).includes(title));
    await clean("반영 뒤 홈", "10-home-after");
    await p.goto(`${BASE}/me/state`, { waitUntil: "networkidle" });
    await clean("반영 뒤 현재 상태", "11-state-after");

    await p.goto(`${BASE}/cores`, { waitUntil: "networkidle" });
    await clean("다 푼 뒤 전공 고르기", "6-cores-done");
    ok("다 푼 뒤에는 결과로 가는 단추가 선다",
      (await p.locator(`a.en-door[href="/v3/${id}/result"]`).count()) === 1);
    ok("브라우저 오류와 500 이 없다", errs.length === 0, errs.slice(0, 3).join(" | "));
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  if (!NODB) assertFreshServer();
  if (OUT) mkdirSync(OUT, { recursive: true });
  if (process.env.ENTRY !== "0") await entry(CORES[0]);
  if (!NODB) for (const c of CORES) await one(c);
  console.log(`\n통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) { console.log(bad.map((b) => `  - ${b}`).join("\n")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
