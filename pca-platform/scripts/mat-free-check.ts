/**
 * MAT 을 아무 도구나 합쳐 무료로 두 번 써 보고 세 번째부터 기간권으로 넘어가는가(2026-10-31).
 *
 *   npm run build && bash scripts/stage-serve.sh 3150
 *   UI_BASE=http://127.0.0.1:3150 npm run mat:free
 *
 * 기간권 없는 학생(결과 있음)이 공고 두 개를 무료로 보고, 세 번째 공고에서
 * 기간권 안내로 가는지 실제 브라우저로 센다. **서버가 막는지도 센다**: 화면이
 * 폼을 감춰도, 폼을 직접 보내면 서버가 돌려보내야 한다.
 */
import { loadEnv, BASE, login, makeStudent, cloneFinished } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { chromium } from "playwright";
import { query } from "../src/lib/db";
import { canUseMat, matAccess } from "../src/lib/mat-access";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

const POSTING = "연구개발 신입 채용. 담당 업무: 소재 공정 개발과 시험 평가. 자격 요건: 관련 전공 석사 이상, "
  + "실험 설계와 데이터 분석 경험. 우대 사항: 논문 실적, 특허, 국책 과제 참여 경험.";

async function main(): Promise<void> {
  const s = await makeStudent("zz-mat-free");
  await cloneFinished(s.id, "BASIC");
  await query(`DELETE FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [s.id]);
  for (const t of ["assistant_postings", "assistant_drafts", "assistant_uploads"]) {
    await query(`DELETE FROM ${t} WHERE user_id = $1`, [s.id]);
  }
  const a0 = await matAccess(s.id);
  ok("기간권 없음 · 결과 있음 · 도구가 선다", !a0.paid && a0.ready && a0.open);

  const br = await chromium.launch();
  try {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await login(ctx, "zz-mat-free", s.pw);
    await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
    const t0 = await p.locator("body").innerText();
    ok("무료로 써 보는 중 안내가 선다", t0.includes("무료로 써 보는 중"));
    ok("공고 붙이는 칸이 선다", await p.locator('form textarea[name="text"]').count() === 1);

    /* 1 — 첫 공고는 무료 */
    await p.fill('input[name="label"]', "무료 시험 공고");
    await p.fill('textarea[name="text"]', POSTING);
    await Promise.all([p.waitForURL(/\/me\/track\/posting\//, { timeout: 60000 }),
      p.getByRole("button", { name: "공고와 내 경험 맞대 보기" }).click()]);
    ok("첫 공고는 무료로 맞대 본다", /\/me\/track\/posting\//.test(p.url()), p.url());
    const t1 = await p.locator("body").innerText();
    ok("무료로 본 공고도 상태를 바꿀 수 있다", t1.includes("지원했어요"));

    /* 2 — 아무 도구나 합쳐 두 번이라, 두 번째 공고도 무료다 */
    const a0 = await matAccess(s.id);
    ok("한 번 쓰면 네 도구 모두 남은 무료가 1이다", a0.freeLeft === 1 && a0.left.draft === 1 && a0.left.upload === 1,
      JSON.stringify(a0.left));
    await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
    await p.fill('input[name="label"]', "무료 시험 공고 2");
    await p.fill('textarea[name="text"]', POSTING);
    await Promise.all([p.waitForURL(/\/me\/track\/posting\//, { timeout: 60000 }),
      p.getByRole("button", { name: "공고와 내 경험 맞대 보기" }).click()]);
    ok("두 번째 공고도 무료로 본다", /\/me\/track\/posting\//.test(p.url()), p.url());

    /* 2b — 세 번째는 기간권 안내 */
    await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
    const t2 = await p.locator("body").innerText();
    ok("두 번을 다 쓰면 붙이는 칸 대신 기간권 안내가 선다",
      t2.includes("무료 2번을 다 쓰셨습니다")
      && await p.locator('form textarea[name="text"]').count() === 0);
    ok("기간권 고르는 자리로 가는 단추가 있다", await p.locator('a[href="#plans"]').count() > 0);

    /* 3 — 화면을 건너뛰고 폼을 직접 보내도 서버가 막는다. 액션이 부르는 규칙을 그대로 묻는다 */
    const can = await canUseMat(s.id, "posting");
    ok("서버 규칙도 세 번째 공고를 막는다", !can.ok && can.why === "free", JSON.stringify(can));
    const a1 = await matAccess(s.id);
    ok("두 번을 쓰면 다른 도구의 무료도 끝난다", a1.freeLeft === 0 && a1.left.draft === 0 && a1.left.upload === 0,
      JSON.stringify(a1.left));
    const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("가로 스크롤이 없다", sx <= 0, String(sx));
    await ctx.close();
  } finally {
    await br.close();
  }
  console.log(`\nMAT 무료 → 기간권 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main();
