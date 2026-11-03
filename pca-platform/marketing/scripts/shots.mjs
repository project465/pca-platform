/**
 * 떠 있는 홈페이지를 쪽마다 데스크톱(1440)과 손전화(390)로 통째로 찍는다.
 *
 *   SITE=kr npm run build && SITE=kr npm start          (다른 창에서, 기본 3200)
 *   BASE=http://127.0.0.1:3200 OUT=/tmp/shots node scripts/shots.mjs
 *
 * 크로뮴 경로가 따로 있으면 `PW_CHROME` 으로 넘긴다. 찍기 전에 활자가
 * 다 받아졌는지 기다린다: 다른 활자로 찍힌 그림은 실제 화면이 아니다.
 * 손전화 메뉴를 연 그림을 한 장 더 찍는다(닫힌 그림만 보면 메뉴 안이
 * 깨져도 모른다).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3200";
const OUT = process.env.OUT ?? "/tmp/shots-mk";
const PAGES = (process.env.PAGES ?? "/,/universities,/assistant,/contact,/404-check").split(",");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROME || undefined,
  args: ["--no-sandbox"],
});

const name = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/[^a-z0-9-]/gi, "_"));
const views = [
  { tag: "desktop", width: 1440, height: 900, mobile: false },
  { tag: "mobile", width: 390, height: 844, mobile: true },
];

const made = [];
for (const v of views) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.mobile ? 2 : 1,
    isMobile: v.mobile,
    hasTouch: v.mobile,
  });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    const res = await page.goto(BASE + p, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const status = res?.status();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const file = `${OUT}/${name(p)}-${v.tag}.png`;
    await page.screenshot({ path: file, fullPage: true });
    made.push({ file, status, overflow });
    console.log(`${String(status).padEnd(4)} overflow=${overflow}px  ${file}`);
  }
  if (v.mobile) {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.click(".mmenu-toggle");
    await page.waitForTimeout(200);
    const file = `${OUT}/menu-open-mobile.png`;
    await page.screenshot({ path: file });
    made.push({ file, status: 200, overflow: 0 });
    console.log(`open menu  ${file}`);
  }
  await ctx.close();
}
await browser.close();

const bad = made.filter((m) => m.overflow > 0);
if (bad.length) {
  console.log(`\n가로로 넘치는 쪽 ${bad.length}곳`);
  process.exit(1);
}
