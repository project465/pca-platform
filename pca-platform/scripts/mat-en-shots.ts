/**
 * MAT 영어판과 `무료 검사 먼저` 를 실제 브라우저로 본다.
 *
 *   npm run build && bash scripts/stage-serve.sh 3150
 *   UI_BASE=http://127.0.0.1:3150 npx tsx scripts/mat-en-shots.ts
 *
 * 사람 셋.
 *   ① 영어 응시를 끝내고 MAT 을 쓰는 사람: `/me/track` 이 영어로 서고 한글이 없는가,
 *      해외판 값이 승인되기 전이라 사는 단추가 0원으로 서지 않는가
 *   ② 결과가 없는 한국 사람: 사는 단추 대신 무료 검사 칸이 서는가, 결제 주소를 직접
 *      쳐도 MAT 화면으로 돌아가는가
 *   ③ 결과가 있고 MAT 을 쓰지 않는 한국 사람: 홈 `최근 기록` 에 MAT 한 줄이 서는가
 *
 * **그림만 남기지 않는다**: 가르는 글자와 가로 스크롤과 한글을 센다.
 */
import { loadEnv, BASE, gateCreds, login, makeStudent } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { query } from "../src/lib/db";
import { analyzePosting } from "../src/lib/assistant/posting";
import { seedMatStudent } from "./_mat-brief-fixtures";

const OUT = "docs/metri/shots/mat-en";
const SIZES = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

/** 언어 고르개의 `한국어` 는 뺀다: 고르는 자리라 한글이 맞다 */
const hangul = (s: string): string | null => {
  const m = s.replace(/한국어/g, "").match(/[가-힣][^\n]{0,30}/);
  return m ? m[0] : null;
};

const EN_POSTINGS = [
  {
    label: "Graduate Mechanical Design Engineer",
    days: 4,
    text: `Responsibilities
- Design brackets, housings and sheet metal parts in SolidWorks
- Create 2D drawings with GD&T for manufacturing
- Run hand calculations and basic FEA to check stress and deflection
Requirements
- Bachelor's degree in Mechanical Engineering
- Experience with 3D CAD (SolidWorks or Creo)
- Understanding of tolerances and fits
Preferred
- FEA experience (ANSYS or Abaqus)
- Experience building prototypes
Apply by: see posting`,
  },
  {
    label: "Junior Test Engineer",
    days: 12,
    text: `What you'll do
- Plan and run mechanical tests on new components
- Set up sensors and data acquisition
- Write test reports and compare results with design calculations
What we're looking for
- Degree in Mechanical or Electrical Engineering
- Hands-on lab experience with strain gauges or accelerometers
Nice to have
- Python or MATLAB for data analysis`,
  },
];

async function seedEnglish(who: string): Promise<{ pw: string }> {
  const s = await seedMatStudent(who);
  /* 응시를 영어로 돌린다. 작업공간 언어는 가장 최근 응시가 정한다(`wsLang`) */
  await query(`UPDATE v3_attempts SET locale = 'en' WHERE user_id = $1`, [s.id]);
  await query(`DELETE FROM assistant_postings WHERE user_id = $1`, [s.id]);
  await query(`DELETE FROM assistant_nudges WHERE user_id = $1`, [s.id]);
  const titles: Record<string, string> = {
    capstone: "Capstone: drive unit for a small conveyor",
    assignment: "FEA assignment: bracket stress analysis",
    course: "Machine shop lab: lathe part measurement and defect log",
  };
  for (const [kind, title] of Object.entries(titles)) {
    await query(`UPDATE v3_experiences SET title = $3, decisions = '{}', artifacts = '{}',
                        verifications = '{}', problems = '{}'
                  WHERE user_id = $1 AND kind = $2`, [s.id, kind, title]);
  }
  const kst = new Date(Date.now() + 9 * 3600_000);
  for (const p of EN_POSTINGS) {
    const d = new Date(kst.getTime() + p.days * 86400_000).toISOString().slice(0, 10);
    await analyzePosting(s.id, { label: p.label, text: p.text, deadline: d });
  }
  return { pw: s.pw };
}

async function sx(p: Page): Promise<number> {
  return p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const gate = gateCreds();
  const browser = await chromium.launch();
  const ctxOf = (vp: { width: number; height: number }) =>
    browser.newContext({ viewport: vp, ...(gate ? { httpCredentials: gate } : {}) });
  try {
    /* ① 영어 · MAT 이용 중 */
    const en = await seedEnglish("zz-mat-en-on");
    for (const [name, vp] of Object.entries(SIZES)) {
      const ctx = await ctxOf(vp);
      const p = await login(ctx, "zz-mat-en-on", en.pw);
      await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
      const path = new URL(p.url()).pathname;
      ok(`[${name}] 영어 작업공간에서 MAT 이 열린다`, path === "/me/track", path);
      const txt = await p.locator("main").innerText().catch(() => "");
      ok(`[${name}] 영어 브리핑이 선다`, /This week's briefing/.test(txt) && /Nearest deadlines/.test(txt));
      const h = hangul(txt);
      ok(`[${name}] MAT 화면에 한글이 없다`, !h, h ?? "");
      ok(`[${name}] AI 동의 칸이 서지 않는다`, !/Anthropic/.test(txt));
      ok(`[${name}] 0원 사는 단추가 없다`, (await p.locator('a[href^="/checkout?product=TRACK_"]').count()) === 0);
      ok(`[${name}] 가로 스크롤이 없다`, (await sx(p)) <= 0, String(await sx(p)));
      await p.screenshot({ path: `${OUT}/en-track__${name}.png`, fullPage: true });
      await ctx.close();
    }

    /* ② 결과가 없는 한국 사람 */
    const fresh = await makeStudent("zz-mat-kr-new");
    {
      const ctx = await ctxOf(SIZES.mobile);
      const p = await login(ctx, "zz-mat-kr-new", fresh.pw);
      await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
      const txt = await p.locator("main").innerText().catch(() => "");
      ok("결과가 없으면 무료 검사 칸이 선다", /먼저 무료 검사부터/.test(txt) && /무료 검사 시작/.test(txt));
      ok("결과가 없으면 사는 단추가 없다", (await p.locator('a[href^="/checkout?product=TRACK_"]').count()) === 0);
      await p.screenshot({ path: `${OUT}/kr-new-track__mobile.png`, fullPage: true });
      await p.goto(`${BASE}/checkout?product=TRACK_30D`, { waitUntil: "networkidle" });
      const u = new URL(p.url());
      ok("결제 주소를 직접 쳐도 MAT 화면으로 돌아간다",
        u.pathname === "/me/track" && u.searchParams.get("e") === "needtest", `${u.pathname}${u.search}`);
      await ctx.close();
    }

    /* ③ 결과가 있고 MAT 을 쓰지 않는 한국 사람 */
    const kr = await seedMatStudent("zz-mat-kr-off");
    await query(`DELETE FROM entitlements WHERE user_id = (SELECT id FROM users WHERE login_id = 'zz-mat-kr-off')
                   AND kind = 'track'`);
    {
      const ctx = await ctxOf(SIZES.desktop);
      const p = await login(ctx, "zz-mat-kr-off", kr.pw);
      await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
      const txt = await p.locator("main").innerText().catch(() => "");
      ok("홈에 MAT 한 줄이 선다", /이 결과로 매주 챙기기 · MAT/.test(txt));
      await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
      const t2 = await p.locator("main").innerText().catch(() => "");
      ok("결과가 있으면 사는 단추가 선다", (await p.locator('a[href^="/checkout?product=TRACK_"]').count()) > 0);
      ok("한국어 MAT 화면이 그대로다", /AI 취업비서/.test(t2) && /기간권 고르기/.test(t2));
      await p.screenshot({ path: `${OUT}/kr-off-track__desktop.png`, fullPage: true });
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\n그림: ${OUT}/ · 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main();
