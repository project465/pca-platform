/**
 * 앱 화면(`/m`)을 휴대전화 크기로 찍고, 찍는 김에 다섯 가지를 센다.
 *
 *   npm run build && bash scripts/stage-serve.sh 3150
 *   UI_BASE=http://127.0.0.1:3150 npx tsx scripts/app-shots.ts
 *
 * 시험 사람은 MAT 브리핑 그림과 같은 것을 쓴다(기계공학 결과 · 기간권 ·
 * 경험 셋 · 공고 셋). 첫 화면은 로그인하지 않은 채로 찍는다.
 *
 * 세는 것: 열리는가(500 없음) · 가로 스크롤이 없는가 · 브라우저 오류가
 * 없는가 · 안쪽 코드(TD01 · Z1_ …)가 화면에 없는가 · 아래 띠가 서는 자리에
 * 서는가.
 */
import { loadEnv, BASE, gateCreds, login } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { mkdirSync } from "node:fs";
import { chromium, type BrowserContext } from "playwright";
import { seedMatStudent } from "./_mat-brief-fixtures";
import { nudgeUser } from "../src/lib/assistant/nudges";

const OUT = "docs/metri/shots/app";
const PHONE = { width: 390, height: 844 };

const SCREENS: { slug: string; path: string; tabs: boolean }[] = [
  { slug: "02-home", path: "/m", tabs: true },
  { slug: "03-todo", path: "/m/todo", tabs: true },
  { slug: "04-experience", path: "/m/experience", tabs: true },
  { slug: "05-capture", path: "/m/capture", tabs: false },
  { slug: "06-mat", path: "/m/mat", tabs: true },
  { slug: "07-alerts", path: "/m/alerts", tabs: true },
  { slug: "08-profile", path: "/m/profile", tabs: true },
];

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

async function shoot(ctx: BrowserContext, slug: string, path: string, tabs: boolean): Promise<void> {
  const p = await ctx.newPage();
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  const res = await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const status = res?.status() ?? 0;
  ok(`[${slug}] 열린다`, status < 400, String(status));
  const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`[${slug}] 가로 스크롤이 없다`, sx <= 0, String(sx));
  const text = await p.locator("body").innerText();
  const code = text.match(/\b(TD\d{2}|Z[1-4]_[A-Z_]+|OC\d|ORG_[A-Z]+|[A-Z]{2,}_CORE_V\d)\b/);
  ok(`[${slug}] 안쪽 코드가 없다`, !code, code?.[0] ?? "");
  const hasTabs = await p.locator(".ma-tabs").count();
  ok(`[${slug}] 아래 띠 ${tabs ? "있음" : "없음"}`, (hasTabs > 0) === tabs);
  ok(`[${slug}] 브라우저 오류가 없다`, !errs.length, errs[0]?.slice(0, 120) ?? "");
  await p.screenshot({ path: `${OUT}/${slug}.png`, fullPage: false });
  /* 아래 띠는 화면에 붙어 있어 긴 그림 한가운데에 끼어든다. 긴 그림에서만 감춘다 */
  await p.addStyleTag({ content: ".ma-tabs, .ma-fab { visibility: hidden !important; }" });
  await p.screenshot({ path: `${OUT}/${slug}__full.png`, fullPage: true });
  await p.close();
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const gate = gateCreds();
  const browser = await chromium.launch();
  const device = {
    viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    ...(gate ? { httpCredentials: gate } : {}),
  };
  try {
    const anon = await browser.newContext(device);
    await shoot(anon, "01-welcome", "/m/welcome", false);
    /* 로그인하지 않고 홈을 열면 첫 화면으로 가는가 */
    const pg = await anon.newPage();
    await pg.goto(`${BASE}/m`, { waitUntil: "networkidle" });
    ok("로그인 전 홈은 첫 화면으로 보낸다", new URL(pg.url()).pathname === "/m/welcome", pg.url());
    await anon.close();

    const who = "zz-app-shot";
    const s = await seedMatStudent(who);
    /* 알림 화면이 빈 채로 찍히지 않게 이번 주 브리핑 한 줄을 쌓는다(밤 당번과 같은 함수) */
    await nudgeUser(s.id).catch(() => undefined);
    const ctx = await browser.newContext(device);
    const p = await login(ctx, who, s.pw);
    await p.close();
    for (const sc of SCREENS) await shoot(ctx, sc.slug, sc.path, sc.tabs);
    await ctx.close();
  } finally {
    await browser.close();
  }
  console.log(`\n그림: ${OUT}/*.png · 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main();
