/**
 * MAT 의 대학원생 자리를 실제 브라우저로 찍는다.
 *
 *   npm run build && bash scripts/stage-serve.sh 3150
 *   UI_BASE=http://127.0.0.1:3150 npx tsx scripts/mat-grad-shots.ts
 *
 * 시험 사람을 새로 만들어 학위 단계를 박사로 두고, 연구 기록 둘과 연구직 공고
 * 하나를 넣는다. **그림만 남기지 않는다**: 대학원 자리의 가르는 글자가 서는지와
 * 가로 스크롤을 함께 센다. 학부생으로 되돌리면 그 자리가 사라지는지도 본다.
 */
import { loadEnv, BASE, login } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { seedMatStudent } from "./_mat-brief-fixtures";
import { query } from "../src/lib/db";
import { analyzePosting } from "../src/lib/assistant/posting";
import { addExperience } from "../src/lib/me-v3/platform";

const OUT = process.env.OUT ?? "docs/metri/shots/mat-grad";
let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

const POSTING = `[OO연구원] 구조해석 연구직(박사후연구원) 채용
담당업무
- 구조해석 및 내구 설계 연구
- 국책과제 수행 및 연구계획서 작성
자격요건
- 기계공학 박사 학위 소지자
- 최근 3년 이내 SCI(E)급 논문 제1저자 2편 이상
- ANSYS 등 유한요소해석 경험
우대사항
- 관련 분야 특허 출원 또는 등록 실적
- 국제 학술대회 발표 경험`;

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const s = await seedMatStudent("zz-mat-grad-phd");
  await query(`UPDATE v3_attempts SET education_stage = 'phd', grad_field = 'STEM' WHERE user_id = $1`, [s.id]);
  await query(`DELETE FROM v3_experiences WHERE user_id = $1 AND kind IN ('research','paper')`, [s.id]);
  await addExperience(s.id, {
    kind: "paper", title: "복합재 브래킷 피로 수명 예측 논문",
    td_codes: ["TD02"], axis_codes: ["J3", "J6"],
    problems: ["어떤 하중 조건과 현상을 볼지 정했다"],
    decisions: ["구속 조건과 하중 작용점을 정했다"],
    artifacts: ["SCIE 저널 논문"], verifications: ["시험값"],
  });
  await addExperience(s.id, {
    kind: "research", title: "박사 학위 연구: 경량 브래킷 내구 시험",
    td_codes: ["TD02", "TD07"], axis_codes: ["J1", "J5"],
    decisions: ["시험 하중 범위와 반복 횟수를 정했다"],
    artifacts: [], verifications: [],
  });
  const pid = (await analyzePosting(s.id, { label: "OO연구원 구조해석 박사후연구원", text: POSTING, deadline: null })).id;

  const br = await chromium.launch();
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "mobile"]] as const) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } });
    const p = await login(ctx, "zz-mat-grad-phd", s.pw);
    await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
    const main = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    if (tag === "desktop") {
      ok("① MAT 첫 화면에 `연구 경험을 직무 말로` 가 선다", /연구 경험을 직무 말로/.test(main));
      ok("② 박사 단계 한 줄이 붙는다", /지도교수와 함께 정한 것과 내가 혼자 정한 것/.test(main));
      /* 이용 중이면 안내가 접혀 있다. 접힌 글은 innerText 에 안 잡히므로 textContent 로 본다 */
      const guide = (await p.locator("main").textContent()) ?? "";
      ok("③ 안내(접힘)에 대학원생 카드가 있다", /대학원생 · 연구 경험 정리/.test(guide));
    }
    const sx1 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const r = p.locator("#research");
    if (await r.count()) {
      await r.scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${OUT}/track-research-${tag}.png`, fullPage: false });
    }
    await p.goto(`${BASE}/me/track/posting/${pid}`, { waitUntil: "networkidle" });
    const pm = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    if (tag === "desktop") {
      ok("④ 공고 쪽에 `연구 실적 요구` 표가 선다", /연구 실적 요구/.test(pm) && /SCI/.test(pm));
      ok("⑤ 논문은 적어 둔 기록으로 받친다", /적어 둔 기록 있음/.test(pm));
      ok("⑥ 학위 줄은 판단하지 않는다", /학위 조건/.test(pm));
      ok("⑦ 학위 연구 질문 셋이 선다", /지도교수가 정한 것과 본인이 정한 것/.test(pm));
    }
    const sx2 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`⑧ 가로 스크롤 없음 (${tag})`, sx1 <= 0 && sx2 <= 0, `${sx1} · ${sx2}`);
    const rr = p.locator("#research");
    if (await rr.count()) {
      await rr.scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${OUT}/posting-research-${tag}.png`, fullPage: false });
    }
    await p.screenshot({ path: `${OUT}/posting-full-${tag}.png`, fullPage: true });
    await ctx.close();
  }

  /* 학부생으로 되돌리면 대학원 자리가 사라진다(연구 실적 표는 그대로 선다) */
  await query(`UPDATE v3_attempts SET education_stage = 'bachelor', grad_field = NULL WHERE user_id = $1`, [s.id]);
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await login(ctx, "zz-mat-grad-phd", s.pw);
  await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
  const m1 = await p.locator("main").innerText();
  await p.goto(`${BASE}/me/track/posting/${pid}`, { waitUntil: "networkidle" });
  const m2 = await p.locator("main").innerText();
  ok("⑨ 학부생에게는 `연구 경험을 직무 말로` 와 학위 질문이 서지 않는다",
    !/연구 경험을 직무 말로/.test(m1) && !/학위 연구를 두고 자주 받는 질문/.test(m2));
  ok("⑩ 학부생도 연구직 공고면 연구 실적 표는 받는다", /연구 실적 요구/.test(m2));
  await br.close();
  console.log(`\nMAT 대학원생 화면 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}
void main();
