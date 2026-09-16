/**
 * 한 판의 글만 순서대로 뽑는다. 원어민 검수자에게 넘길 형태다.
 *
 * 화면 구조를 빼고 문단만 남긴다. 검수자는 개발자가 아니고, 원고를
 * `src/content/kz.ts` 로 넘기면 따옴표와 중괄호부터 읽게 된다.
 *
 * 원고 파일에서 문자열만 긁지 않고 실제로 그려서 뽑는 이유가 있다.
 * 원고에 있는 순서와 화면에 나오는 순서가 다르고, 검수자가 고쳐야 하는 것은
 * 화면에 나오는 순서다.
 *
 *   SITE=kz npm start                        (다른 창에서)
 *   node scripts/export-text.mjs kz out.txt
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const site = process.argv[2] ?? "kz";
const out = process.argv[3] ?? `/tmp/metri-${site}-text.txt`;
const BASE = "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE + "/", { waitUntil: "networkidle" });

/* 머리 내비와 꼬리의 안쪽 링크. 미리보기를 뽑을 때와 같은 방식이다 —
   처리방침은 내비에 없고 꼬리에만 있다 */
const routes = await page.evaluate(() => {
  const pick = (sel) =>
    [...document.querySelectorAll(sel)]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.startsWith("/"));
  return ["/", ...new Set([...pick(".site-header nav.wide a"), ...pick(".site-footer a")])];
});

const lines = [];
const head = (t) => lines.push("", "=".repeat(60), t, "=".repeat(60), "");

head(`METRI ${site.toUpperCase()} — 화면에 나오는 글 전부 (검수용)`);
lines.push(
  "· 화면 순서 그대로입니다. 한 줄이 한 덩어리입니다.",
  "· 고칠 곳은 줄 옆에 그대로 적어 주시면 됩니다.",
  "· 이 파일은 사람이 읽으라고 만든 것이고, 코드가 아닙니다.",
);

for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const text = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main ? main.innerText : "";
  });
  head(`[${r}]`);
  for (const l of text.split("\n").map((s) => s.trim()).filter(Boolean)) lines.push(l);
}

/* 머리와 꼬리는 모든 페이지에 같은 것이 나오므로 한 번만 싣는다 */
for (const [name, sel] of [["머리", ".site-header"], ["꼬리", ".site-footer"]]) {
  const text = await page.evaluate((s) => document.querySelector(s)?.innerText ?? "", sel);
  head(`[${name} — 모든 페이지 공통]`);
  for (const l of text.split("\n").map((s) => s.trim()).filter(Boolean)) lines.push(l);
}

await browser.close();
writeFileSync(out, lines.join("\n") + "\n", "utf8");
console.log("wrote", out, lines.length, "lines");
