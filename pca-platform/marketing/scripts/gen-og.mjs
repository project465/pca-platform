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
    display: "PERSONALIZED<br>CAREER ANALYSIS",
    kicker: "당신의 전공이 성공으로 이어지도록",
    title: "전공은 선택했지만, 그 다음 길을 모르는 당신을 위한 정밀 진단",
    foot: "PCA · ACADEMIX",
  },
  {
    file: "public/og-global.png",
    display: "PERSONALIZED<br>CAREER ANALYSIS",
    kicker: "So that a major leads somewhere",
    title: "They chose a major. The next step is still a guess.",
    foot: "PCA · ACADEMIX",
  },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "P"; src: url("file://${FONT}") format("woff2");
  font-weight: 45 920; font-display: block; }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1200px; height:630px; font-family:"P",sans-serif;
  background: radial-gradient(900px 420px at 82% -12%, #E3EDFD 0%, rgba(227,237,253,0) 62%), #F4F7FC;
  display:flex; flex-direction:column; justify-content:center; padding:72px 76px; color:#16232E; }
.k { font-size:24px; font-weight:700; color:#2E6BE6; margin-bottom:18px; }
.d { font-size:78px; font-weight:800; letter-spacing:-0.045em; line-height:1.02;
  background:linear-gradient(96deg,#2E6BE6 8%,#6AA0F5 62%,#9CC0FA 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent; margin-bottom:26px; }
.t { font-size:34px; font-weight:800; letter-spacing:-0.035em; line-height:1.3; max-width:22ch;
  word-break:keep-all; }
.f { position:absolute; left:76px; bottom:56px; font-size:22px; font-weight:800;
  letter-spacing:-0.02em; color:#16232E; }
.f em { font-style:normal; font-weight:500; color:#5C6B78; }
</style></head><body>
<div class="k">${c.kicker}</div>
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
