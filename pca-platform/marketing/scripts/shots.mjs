/**
 * 만든 사이트를 실제로 띄워 구간별로 촬영한다.
 *
 *   SITE=kr npm run build && SITE=kr npm start    (다른 창에서)
 *   node scripts/shots.mjs kr
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const site = process.argv[2] ?? "global";
const OUT = `/tmp/shots-mk/${site}`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
await page.waitForTimeout(600); // 웹폰트가 적용된 뒤에 찍는다

// 맨 위: 상단바와 히어로가 같이 보여야 한다
await page.screenshot({ path: `${OUT}/01-top.png` });

const parts = [
  [".pipeline", "02-pipeline"],
  ["#outputs", "03-outputs"],
  ["#process", "04-process"],
  ["#faq", "05-faq"],
  [".contact", "06-contact"],
  [".site-footer", "07-footer"],
];

for (const [sel, name] of parts) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot:", site, name);
}

await browser.close();
console.log("done:", site);
