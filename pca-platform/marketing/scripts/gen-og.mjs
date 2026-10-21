/**
 * 공유 썸네일(OG 이미지)을 만든다. 1200×630.
 *
 * 홈페이지와 같은 활자(public/fonts/pretendard)와 같은 상표
 * (public/brand/mark.svg)로 그린다. 문구는 원고의 hero 와 맞춘다.
 *
 *   node scripts/gen-og.mjs        (PW_CHROME 으로 크로뮴 경로를 줄 수 있다)
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FONT = resolve("public/fonts/pretendard/PretendardVariable.woff2");
const MARK = readFileSync(resolve("public/brand/mark.svg"), "utf8").replace(/<!--[\s\S]*?-->/g, "");

const CARDS = [
  {
    file: "public/og-kr.png",
    kicker: "전공별 진로 진단 · 커리어 작업공간",
    display: "내 전공에서 해 본 일이<br><b>어떤 일로 이어지는지</b> 확인하세요",
    sub: "검사 → 결과지 → 내 CareerMatri 작업공간. 대학·기관은 학과 단위로 도입합니다.",
  },
  {
    file: "public/og-global.png",
    kicker: "Major-based career diagnosis · Workspace",
    display: "See where the work you did<br>in your major <b>can take you</b>",
    sub: "Assessment → report → your CareerMatri workspace. Universities adopt it by department.",
  },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "P"; src: url("file://${FONT}") format("woff2"); font-weight: 45 920; font-display: block; }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1200px; height:630px; font-family:"P",sans-serif; overflow:hidden; position:relative;
  background:#0e1a30; color:#fff; padding:72px 84px; display:flex; flex-direction:column; }
.glow { position:absolute; right:-160px; top:-200px; width:640px; height:640px; border-radius:50%;
  background:radial-gradient(circle, rgba(47,107,255,.45) 0%, rgba(47,107,255,0) 68%); }
.brand { display:flex; align-items:center; gap:16px; font-size:30px; font-weight:800; letter-spacing:-.02em; }
.brand svg { width:52px; height:52px; }
.k { margin-top:auto; font-size:20px; font-weight:700; color:#9fb9ff; margin-bottom:20px; }
.d { font-size:60px; font-weight:800; letter-spacing:-.035em; line-height:1.22; word-break:keep-all; max-width:20ch; }
.d b { color:#6f9bff; font-weight:800; }
.s { margin-top:26px; font-size:22px; font-weight:500; line-height:1.55; color:#c3cde0; max-width:46ch; word-break:keep-all; }
</style></head><body>
<div class="glow"></div>
<div class="brand">${MARK}<span>CareerMatri</span></div>
<div class="k">${c.kicker}</div>
<div class="d">${c.display}</div>
<div class="s">${c.sub}</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ["--no-sandbox"] });
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
