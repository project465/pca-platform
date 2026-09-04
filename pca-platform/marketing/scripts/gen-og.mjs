/**
 * 공유 썸네일(OG 이미지)을 만든다.
 *
 * 링크를 붙였을 때 밋밋하게 나오지 않도록, 사이트와 같은 서체·색으로
 * 1200×630 카드를 그려 PNG 로 굽는다. 나라별로 문구가 다르므로 파일도 나뉜다.
 *
 *   node scripts/gen-og.mjs
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FONT = resolve("node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2");

const CARDS = [
  {
    file: "public/og-kr.png",
    display: "내 전공에 맞는<br><b>커리어 전략</b>을 설계해드립니다",
    kicker: "PCA · PERSONALIZED CAREER ANALYSIS",
    title: "적합 직무 · 업무 성향 · 실행 전략을 함께 분석해, 다음에 무엇을 준비해야 하는지까지.",
    foot: "PCA · ACADEMIX",
  },
  {
    file: "public/og-global.png",
    display: "They chose a major.<br>We design the <b>career strategy</b>.",
    kicker: "PCA · PERSONALIZED CAREER ANALYSIS",
    title: "Job fit, work style and execution strategy — read together, then turned into a plan.",
    foot: "PCA · ACADEMIX",
  },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "P"; src: url("file://${FONT}") format("woff2");
  font-weight: 45 920; font-display: block; }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1200px; height:630px; font-family:"P",sans-serif; position:relative;
  background:#0B0B0C; overflow:hidden;
  display:flex; flex-direction:column; justify-content:center; padding:76px 80px; color:#fff; }
.mark { position:absolute; right:-30px; top:150px; font-size:300px; font-weight:800;
  letter-spacing:-0.06em; color:#fff; opacity:.035; line-height:.8; }
.k { font-size:20px; font-weight:800; letter-spacing:.2em; color:#C9A063; margin-bottom:22px; }
.d { font-size:60px; font-weight:800; letter-spacing:-0.04em; line-height:1.2;
  margin-bottom:26px; word-break:keep-all; max-width:17ch; }
.d b { color:#E3C48F; }
.t { font-size:24px; font-weight:600; line-height:1.55; max-width:34ch;
  word-break:keep-all; color:#C6C6CD; }
.f { margin-top:44px; font-size:20px; font-weight:800; letter-spacing:-0.02em; color:#fff; }
.f em { font-style:normal; font-weight:500; color:#8B8B95; }
</style></head><body>
<div class="mark">PCA</div>\n<div class="k">${c.kicker}</div>
<div class="d">${c.display}</div>
<div class="t">${c.title}</div>
<div class="f">PCA <em>· ACADEMIX</em></div>
</body></html>`;

const browser = await chromium.launch();
for (const c of CARDS) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html(c), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  writeFileSync(c.file, await page.screenshot({ type: "png" }));
  console.log("wrote", c.file);
  await page.close();
}
await browser.close();
