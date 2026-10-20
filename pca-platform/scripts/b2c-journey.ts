/**
 * **본체 개인(B2C) 한 바퀴를 배포본에 대고 브라우저로 밟는다.**
 *
 * 다른 검사들은 이 기계의 DB 를 같이 열어 센다. 여기는 **DB 를 열지 않는다**:
 * Staging 처럼 DB 에 닿을 수 없는 배포본에서도 돌아야 하고, 사람이 그 주소에서
 * 실제로 겪는 것만 센다. 그래서 확인은 전부 화면과 응답에서 온다.
 *
 *   1  홈 → 공개 첫 화면          2  가입 (개인)            3  전공 고르기
 *   4  검사 시작 · 응답 · 제출     5  결과                    6  PDF
 *   7  내 CareerMatri(현재 상태 · 다음 할 일)                 8  로그아웃 → 재로그인
 *   9  다른 사용자가 A 의 결과와 PDF 를 열지 못한다           10 손전화 화면
 *
 * **계정은 그 자리에서 만들고 밖에 적지 않는다.** 주소는 `@b2c.test.invalid`
 * 라 시연 자료로 걸러지고(RFC 2606), 비밀번호는 실행마다 새로 만든다.
 *
 *   BASE=https://<staging>.up.railway.app STAGING_BASIC_AUTH=qa:<비밀번호> \
 *     OUT=var/b2c npx tsx scripts/b2c-journey.ts
 *
 * 결과는 `OUT/report.json` 과 단계마다의 그림이고, 걸린 것이 있으면 1 로 끝난다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { walk } from "./_v3-walk";

const BASE = (process.env.BASE || process.env.UI_BASE || "http://127.0.0.1:3100").replace(/\/$/, "");
const OUT = process.env.OUT ?? "var/b2c";
const GATE = (() => {
  const g = process.env.STAGING_BASIC_AUTH ?? "";
  if (!g.includes(":")) return undefined;
  return { username: g.slice(0, g.indexOf(":")), password: g.slice(g.indexOf(":") + 1) };
})();
/* 손님 화면에 서면 안 되는 안쪽 코드 */
const INNER = /\b(?:[A-Z]{2,}_CORE_V\d|TD\d{2}|Z[1-5]_[A-Z]|NOT_EXPLORED|INDUSTRY_[A-Z]+_V\d|ROLE_[A-Z]+_V\d|undefined|NaN|\[object Object\])\b/;

type Row = { step: string; ok: boolean; detail: string };
const rows: Row[] = [];
function ok(step: string, good: boolean, detail = ""): void {
  rows.push({ step, ok: good, detail });
  console.log(`  ${good ? "통과" : "걸림"}  ${step}${detail ? ` — ${detail}` : ""}`);
}

mkdirSync(OUT, { recursive: true });
const shot = async (p: Page, name: string, full = false): Promise<void> => {
  await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }).catch(() => undefined);
};

async function newCtx(b: Browser, mobile = false): Promise<BrowserContext> {
  return b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
    ...(GATE ? { httpCredentials: GATE } : {}),
  });
}

async function signup(ctx: BrowserContext, who: string): Promise<{ p: Page; email: string; pw: string }> {
  const email = `b2c-${who}-${Date.now()}@b2c.test.invalid`;
  const pw = `B2c-${randomBytes(9).toString("base64url")}`;
  const p = await ctx.newPage();
  await p.goto(`${BASE}/signup?next=%2Fcores`, { waitUntil: "networkidle" });
  await p.fill('input[name="name"]', `개인 ${who}`);
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', pw);
  /* 동의는 `모두 동의` 한 칸으로 켠다. 필수가 빠지면 서버가 가입을 되돌린다 */
  await p.locator(".cnall input[type=checkbox]").check().catch(() => undefined);
  await Promise.all([
    p.waitForURL((u) => !new URL(u).pathname.startsWith("/signup"), { timeout: 30000 }).catch(() => undefined),
    p.locator('form button[type="submit"]').first().click(),
  ]);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  return { p, email, pw };
}

async function login(ctx: BrowserContext, email: string, pw: string): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[type="text"], input[type="email"]', email);
  await p.fill('input[type="password"]', pw);
  await Promise.all([
    p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 }).catch(() => undefined),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  return p;
}

async function bodyText(p: Page): Promise<string> {
  return (await p.locator("body").innerText().catch(() => "")) ?? "";
}

async function main(): Promise<void> {
  console.log(`\n── 본체 B2C 한 바퀴 · ${BASE}${GATE ? " (자물쇠 있음)" : ""}\n`);
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const errs: string[] = [];
  try {
    /* 1. 공개 첫 화면 */
    const ctxA = await newCtx(browser);
    {
      const p = await ctxA.newPage();
      p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
      await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
      ok("1 비로그인 첫 화면이 공개 문으로 간다", /\/start/.test(p.url()), new URL(p.url()).pathname);
      const door = await p.locator("a.door-card.primary").getAttribute("href").catch(() => null);
      ok("1 개인 문이 가입 → 전공 고르기로 간다", !!door && door.startsWith("/signup"), door ?? "없음");
      await shot(p, "01-start");
      await p.close();
    }

    /* 2. 가입 */
    const A = await signup(ctxA, "a");
    A.p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
    ok("2 가입하면 바로 로그인돼 전공 고르기로 간다", /\/cores/.test(A.p.url()), new URL(A.p.url()).pathname);
    await shot(A.p, "02-cores");

    /* 3. 전공 고르기: 열린 카드만 `지금 검사 가능` 이다 */
    const cards = A.p.locator('a[href^="/v3/start?core="]');
    const nCards = await cards.count();
    ok("3 응시할 수 있는 전공 카드가 하나 이상 선다", nCards > 0, `${nCards}장`);
    const href = nCards ? await cards.first().getAttribute("href") : null;

    /* 4. 시작 → 응답 → 제출 */
    await A.p.goto(`${BASE}${href ?? "/v3/start"}`, { waitUntil: "networkidle" });
    await shot(A.p, "03-v3-start");
    await A.p.getByText("학부", { exact: true }).first().click().catch(() => undefined);
    await Promise.all([
      A.p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
      A.p.getByRole("button", { name: /검사 시작/ }).first().click().catch(() => undefined),
    ]);
    const m = /\/v3\/(\d+)/.exec(A.p.url());
    ok("4 응시가 열린다", !!m, new URL(A.p.url()).pathname);
    if (!m) throw new Error("응시가 열리지 않았습니다");
    const attempt = m[1];
    await shot(A.p, "04-assessment");
    /* 이어하기: 몇 화면 답한 뒤 새로 고쳐도 같은 응시로 돌아온다 */
    const first = await walk(A.p, 6);
    const mid = A.p.url();
    await A.p.reload({ waitUntil: "networkidle" });
    ok("4 새로 고쳐도 같은 응시에 머문다", A.p.url().includes(`/v3/${attempt}`), new URL(mid).pathname);
    const rest = await walk(A.p, 400);
    ok("4 끝까지 답하고 제출된다", rest.done || first.done, `화면 ${first.screens + rest.screens}`);

    /* 5. 결과 */
    await A.p.goto(`${BASE}/v3/${attempt}/result`, { waitUntil: "networkidle" });
    const res = await bodyText(A.p);
    ok("5 결과 쪽이 선다", res.length > 500, `${res.length}자`);
    ok("5 결과 쪽에 안쪽 코드가 없다", !INNER.test(res), (res.match(INNER) ?? ["없음"])[0]);
    await shot(A.p, "05-result");
    await shot(A.p, "05-result-full", true);

    /* 6. PDF */
    const pdf = await A.p.request.get(`${BASE}/v3/${attempt}/result/pdf`, { timeout: 120000 });
    const ct = pdf.headers()["content-type"] ?? "";
    const buf = await pdf.body().catch(() => Buffer.alloc(0));
    if (ct.includes("pdf")) writeFileSync(path.join(OUT, "06-result.pdf"), buf);
    ok("6 PDF 가 내려온다", pdf.status() === 200 && ct.includes("pdf") && buf.subarray(0, 4).toString() === "%PDF",
      `${pdf.status()} ${ct} ${buf.length}B`);

    /* 7. 내 CareerMatri */
    for (const [route, name] of [["/me", "07-home"], ["/me/state", "07-state"], ["/me/next", "07-next"]] as const) {
      const r = await A.p.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const t = await bodyText(A.p);
      ok(`7 ${route} 가 열린다`, (r?.status() ?? 0) < 400 && new URL(A.p.url()).pathname === route,
        `${r?.status()} ${new URL(A.p.url()).pathname}`);
      ok(`7 ${route} 에 안쪽 코드가 없다`, !INNER.test(t), (t.match(INNER) ?? ["없음"])[0]);
      await shot(A.p, name);
    }

    /* 8. 로그아웃 → 재로그인 → 결과가 그대로 */
    await A.p.goto(`${BASE}/my`, { waitUntil: "networkidle" });
    await Promise.all([
      A.p.waitForURL(/\/login/, { timeout: 20000 }).catch(() => undefined),
      A.p.locator('form button[type="submit"]').filter({ hasText: /로그아웃|Sign out/ }).first().click()
        .catch(() => undefined),
    ]);
    ok("8 로그아웃하면 로그인 화면으로 간다", /\/login/.test(A.p.url()), new URL(A.p.url()).pathname);
    const back = await A.p.goto(`${BASE}/v3/${attempt}/result`, { waitUntil: "networkidle" });
    ok("8 로그아웃 뒤에는 결과가 열리지 않는다", /\/login/.test(A.p.url()) || (back?.status() ?? 0) >= 400,
      new URL(A.p.url()).pathname);
    await ctxA.clearCookies();
    const A2 = await login(ctxA, A.email, A.pw);
    await A2.goto(`${BASE}/me/results`, { waitUntil: "networkidle" });
    const hist = await A2.locator(`a[href*="/v3/${attempt}/result"]`).count();
    ok("8 다시 들어오면 결과 기록이 그대로다", hist > 0, `링크 ${hist}`);
    await shot(A2, "08-relogin-results");

    /* 9. 다른 사용자 */
    const ctxB = await newCtx(browser);
    const B = await signup(ctxB, "b");
    const rb = await B.p.goto(`${BASE}/v3/${attempt}/result`, { waitUntil: "networkidle" });
    const bt = await bodyText(B.p);
    /* A 의 결과 글 한 토막이 B 의 화면에 서면 샌 것이다 */
    const flat = (x: string) => x.replace(/\s+/g, " ");
    const probe = flat(res).slice(120, 200);
    ok("9 B 가 A 의 결과를 열지 못한다", !!probe && !flat(bt).includes(probe),
      `${rb?.status()} ${new URL(B.p.url()).pathname}`);
    const pb = await B.p.request.get(`${BASE}/v3/${attempt}/result/pdf`, { timeout: 60000 });
    ok("9 B 가 A 의 PDF 를 받지 못한다", !(pb.headers()["content-type"] ?? "").includes("pdf"), `${pb.status()}`);
    await ctxB.close();

    /* 10. 손전화 */
    const ctxM = await newCtx(browser, true);
    const M = await login(ctxM, A.email, A.pw);
    for (const [route, name] of [["/me", "10-m-home"], [`/v3/${attempt}/result`, "10-m-result"], ["/cores", "10-m-cores"]] as const) {
      await M.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const over = await M.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`10 손전화 ${route} 가 가로로 밀리지 않는다`, over <= 1, `${over}px`);
      await shot(M, name);
    }
    await ctxM.close();
    await ctxA.close();
  } finally {
    await browser.close();
  }
  ok("서버 오류(5xx)가 없다", errs.length === 0, errs.slice(0, 3).join(" · ") || "0건");

  const fail = rows.filter((r) => !r.ok).length;
  writeFileSync(path.join(OUT, "report.json"),
    `${JSON.stringify({ base: BASE, at: new Date().toISOString(), pass: rows.length - fail, fail, rows }, null, 1)}\n`);
  console.log(`\n  통과 ${rows.length - fail} · 걸림 ${fail} · ${OUT}/report.json`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
