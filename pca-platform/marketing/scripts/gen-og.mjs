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
    kicker: "METRI · PERSONALIZED CAREER ANALYSIS",
    title: "적합 직무 · 업무 성향 · 실행 전략을 함께 분석해, 다음에 무엇을 준비해야 하는지까지.",
  },
  {
    file: "public/og-global.png",
    display: "They chose a major.<br>We design the <b>career strategy</b>.",
    kicker: "METRI · PERSONALIZED CAREER ANALYSIS",
    title: "Job fit, work style and execution strategy — read together, then turned into a plan.",
  },
  {
    /* 카자흐스탄판은 화면이 어두우므로 썸네일도 어두워야 한다.
       링크를 붙였을 때 사이트와 다른 것이 뜨면 그것부터 눈에 걸린다 */
    file: "public/og-kz.png",
    display: "«Мамандығыммен қайда барам?»<br>дегенге <b>құжатпен</b> жауап береміз",
    kicker: "METRI · PERSONALIZED CAREER ANALYSIS",
    title: "Қай кәсіби сала келеді, қалай жұмыс істейсіз және келесі он екі айда не істеу керек.",
    dark: true,
  },
];

/* 밝은 판과 어두운 판. 사이트의 토큰을 그대로 옮긴다 */
const SKIN = {
  light: { bg: "linear-gradient(180deg,#F5F7FA 0%,#FFFFFF 78%)", ink: "#0F1B2D",
           accent: "#A87F3F", sub: "#33445A", faint: "#6B7A8D", markOpacity: ".03" },
  dark:  { bg: "linear-gradient(180deg,#0B1319 0%,#131E28 78%)", ink: "#E9F1F5",
           accent: "#55BFD4", sub: "#BCCBD4", faint: "#8A9CA8", markOpacity: ".05" },
};

const html = (c) => { const k = SKIN[c.dark ? "dark" : "light"]; return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "P"; src: url("file://${FONT}") format("woff2");
  font-weight: 45 920; font-display: block; }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1200px; height:630px; font-family:"P",sans-serif; position:relative;
  background:${k.bg}; overflow:hidden;
  display:flex; flex-direction:column; justify-content:center; padding:76px 80px; color:${k.ink}; }
.mark { position:absolute; left:-20px; top:250px; font-size:250px; font-weight:800;
  letter-spacing:-0.07em; color:${k.ink}; opacity:${k.markOpacity}; line-height:.8; }
.k { font-size:18px; font-weight:800; letter-spacing:.22em; color:${k.accent}; margin-bottom:24px; }
.d { font-size:56px; font-weight:800; letter-spacing:-0.042em; line-height:1.2;
  margin-bottom:26px; word-break:keep-all; max-width:19ch; }
.d b { color:${k.accent}; }
.t { font-size:23px; font-weight:600; line-height:1.6; max-width:34ch;
  word-break:keep-all; color:${k.sub}; }
.f { margin-top:46px; font-size:20px; font-weight:800; letter-spacing:-0.02em; color:${k.ink}; }
.f em { font-style:normal; font-weight:500; color:${k.faint}; }
</style></head><body>
<div class="mark">METRI</div>\n<div class="k">${c.kicker}</div>
<div class="d">${c.display}</div>
<div class="t">${c.title}</div>
<div class="f">METRI <em>· ACADEMIX</em></div>
</body></html>`; };

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
