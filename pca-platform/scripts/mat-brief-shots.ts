/**
 * MAT 브리핑 판과 공고 쪽 지원서 문장 뼈대를 실제 브라우저로 찍는다.
 *
 *   npm run build && bash scripts/stage-serve.sh 3150
 *   UI_BASE=http://127.0.0.1:3150 npx tsx scripts/mat-brief-shots.ts
 *
 * 시험 사람을 새로 만든다(기계공학 결과 · 기간권 · 경험 셋 · 기계 공고 셋).
 * **그림만 남기지 않는다**: 그 판의 가르는 글자가 있는지, 가로 스크롤이
 * 생기는지를 함께 센다.
 */
import { loadEnv, BASE, gateCreds, login } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { seedMatStudent } from "./_mat-brief-fixtures";

const OUT = "docs/metri/shots/mat-brief";
const SIZES = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

/** 머리글부터 끝 표식까지를 한 장으로 */
async function clip(p: Page, from: string, to: string, file: string): Promise<void> {
  const box = await p.evaluate(([a, b]) => {
    const x = document.querySelector(a)?.getBoundingClientRect();
    const y = document.querySelector(b)?.getBoundingClientRect();
    if (!x || !y) return null;
    return { top: x.top + window.scrollY, bottom: y.bottom + window.scrollY };
  }, [from, to] as const);
  if (!box) { ok(`${file} 자리를 찾았다`, false); return; }
  /* 손전화의 아래 띠는 화면에 붙어 있어 긴 그림 한가운데에 끼어든다. 찍을 때만 감춘다 */
  await p.addStyleTag({ content: ".cm-tabs { visibility: hidden !important; }" });
  const width = p.viewportSize()!.width;
  await p.screenshot({ path: file, fullPage: true,
    clip: { x: 0, y: Math.max(0, box.top - 12), width, height: box.bottom - box.top + 24 } });
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const who = "zz-mat-brief-shot";
  const s = await seedMatStudent(who);
  const gate = gateCreds();
  const browser = await chromium.launch();
  try {
    for (const [name, vp] of Object.entries(SIZES)) {
      const ctx = await browser.newContext({ viewport: vp, ...(gate ? { httpCredentials: gate } : {}) });
      const p = await login(ctx, who, s.pw);
      await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
      const txt = await p.locator(".cm-brief").innerText().catch(() => "");
      ok(`[${name}] 브리핑 판이 맨 위에 선다`, /이번 주 할 일 하나/.test(txt) && /가까운 마감/.test(txt));
      ok(`[${name}] 여러 공고가 함께 요구하는 줄이 있다`, /붙여 둔 공고 3개 중 3개가 요구/.test(txt));
      const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`[${name}] 가로 스크롤이 없다`, sx <= 0, String(sx));
      await clip(p, "#brief + h2", ".cm-brief", `${OUT}/brief__${name}.png`);

      await p.goto(`${BASE}/me/track/posting/${s.postings[0]}`, { waitUntil: "networkidle" });
      const draft = await p.locator(".cm-draft").first().innerText().catch(() => "");
      ok(`[${name}] 문장 뼈대가 선다`, draft.length > 20, draft.slice(0, 80));
      ok(`[${name}] 빈 칸이 대괄호로 남는다`, /\[검증한 방법\]/.test(await p.content()));
      const sx2 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`[${name}] 공고 쪽 가로 스크롤이 없다`, sx2 <= 0, String(sx2));
      await clip(p, "#sentences + h2", "#sentences ~ .cm-note", `${OUT}/draft__${name}.png`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\n그림: ${OUT}/brief__desktop.png · brief__mobile.png · draft__desktop.png · draft__mobile.png`);
  process.exit(bad ? 1 : 0);
}

void main();
