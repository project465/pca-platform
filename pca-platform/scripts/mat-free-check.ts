/**
 * MAT 무료 범위(2026-11-03 대표 결정): 공고 AI 분석 **검사 없이 1회 + 검사를 끝내면 1회 더**, 그다음은 요금 화면.
 * 지원서 초안 · 파일 · 자료 읽기는 유료. 무료 분석은 계정이 아니라 사람(정규화한 메일 · 소셜 번호)에 붙는다.
 *
 *   npx next build && PORT=3201 npx next start -p 3201
 *   UI_BASE=http://127.0.0.1:3201 npm run mat:free
 *
 * 실제 브라우저로 센다. **서버가 막는지도 센다**: 화면이 단추를 감춰도 폼을 직접 보내면 서버가 돌려보내야 한다.
 */
import { loadEnv, BASE, login, makeStudent, cloneFinished } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { chromium, type Page } from "playwright";
import { query } from "../src/lib/db";
import { canUseMat, identityKeys, matAccess, takeFreeAnalysis, normalizeEmail } from "../src/lib/mat-access";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

const POSTING = "연구개발 신입 채용. 담당 업무: 소재 공정 개발과 시험 평가. 자격 요건: 관련 전공 석사 이상, "
  + "실험 설계와 데이터 분석 경험. 우대 사항: 논문 실적, 특허, 국책 과제 참여 경험.";

async function paste(p: Page, label: string): Promise<string> {
  await p.goto(`${BASE}/mat/jobs#paste`, { waitUntil: "networkidle" });
  await p.fill('input[name="label"]', label);
  await p.fill('textarea[name="text"]', POSTING);
  await Promise.all([
    p.waitForURL((u) => /\/mat\/(jobs\/\d+|pricing)/.test(u.pathname), { timeout: 60000 }),
    p.locator('form:has(textarea[name="text"]) button[type="submit"]').click(),
  ]);
  return new URL(p.url()).pathname;
}

async function clean(id: string): Promise<void> {
  /* 무료 칸은 사람 열쇠에 붙어 계정을 지워도 남는다(그것이 규칙이다). 시험을 다시 돌리려면 열쇠로 지운다 */
  await query(`DELETE FROM mat_free_claims WHERE identity_hash = ANY($1::text[])`, [await identityKeys(id)]).catch(() => undefined);
  for (const t of ["assistant_postings", "assistant_drafts", "assistant_uploads", "mat_free_claims"]) {
    await query(`DELETE FROM ${t} WHERE user_id = $1`, [id]).catch(() => undefined);
  }
  await query(`DELETE FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [id]);
}

async function main(): Promise<void> {
  ok("메일 정규화: 대소문자 · +꼬리 · gmail 점", normalizeEmail("Zz.Free+abc@GoogleMail.com") === "zzfree@gmail.com");

  const br = await chromium.launch();
  try {
    /* 1 — 검사 결과가 있는 학생: 무료 2번(검사 전 몫 + 검사 후 몫), 세 번째는 요금 화면 */
    const s = await makeStudent("zz-mat-free");
    await cloneFinished(s.id);
    await clean(s.id);
    const a0 = await matAccess(s.id);
    ok("결과 있음 · 기간권 없음: 무료 분석 2번", !a0.paid && a0.ready && a0.freeLeft === 2, String(a0.freeLeft));
    ok("지원서 초안 · 파일 · 자료는 무료가 없다", a0.left.draft === 0 && a0.left.upload === 0 && a0.left.research === 0);
    const ctx = await br.newContext({ viewport: { width: 390, height: 860 } });
    const p = await login(ctx, "zz-mat-free", s.pw);
    const u1 = await paste(p, "무료 시험 공고 1");
    ok("첫 공고는 무료로 분석한다", /^\/mat\/jobs\/\d+$/.test(u1), u1);
    const t1 = await p.locator("body").innerText();
    ok("분석 결과 바로 아래 결제 입구가 선다", /공고 \d+개가 더 있어요|다른 공고도 분석할 수 있어요/.test(t1));
    const u2 = await paste(p, "무료 시험 공고 2");
    ok("두 번째(검사 후 몫)도 무료다", /^\/mat\/jobs\/\d+$/.test(u2), u2);
    const u3 = await paste(p, "무료 시험 공고 3");
    ok("세 번째는 요금 화면으로 간다", u3 === "/mat/pricing", u3);
    const can = await canUseMat(s.id, "posting");
    ok("서버 규칙도 세 번째를 막는다", !can.ok && can.why === "free", JSON.stringify(can));
    const d = await canUseMat(s.id, "draft");
    ok("메모 초안은 유료다", !d.ok && d.why === "free");
    const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("휴대폰 폭에서 가로 스크롤이 없다", sx <= 0, String(sx));
    await ctx.close();

    /* 2 — 검사 없이 시작: 전공 고르기 → NoTest 홈 → 무료 1번 → 두 번째는 요금 화면 */
    const n = await makeStudent("zz-mat-notest");
    await clean(n.id);
    await query(`DELETE FROM career_profiles WHERE user_id = $1`, [n.id]);
    const ctx2 = await br.newContext({ viewport: { width: 390, height: 860 } });
    const q = await login(ctx2, "zz-mat-notest", n.pw);
    await q.goto(`${BASE}/mat`, { waitUntil: "networkidle" });
    const h0 = await q.locator("body").innerText();
    const pick = await q.locator('select[name="core"]').count();
    ok("전공이 없으면 MAT 홈에서 전공을 고른다(검사로 보내지 않는다)", pick === 1 && new URL(q.url()).pathname === "/mat", h0.slice(0, 80));
    await q.selectOption('select[name="core"]', "ME_CORE_V3");
    await q.getByRole("button", { name: "이 전공으로 시작" }).click();
    await q.getByText("관심 있는 공고부터 분석해 볼까요?").waitFor({ timeout: 30000 }).catch(() => undefined);
    const h1 = await q.locator("body").innerText();
    ok("NoTest 홈: 관심 있는 공고부터", h1.includes("관심 있는 공고부터 분석해 볼까요?"));
    ok("NoTest 홈: 무료 1회 단추", h1.includes("공고 분석하기 · 무료 1회"));
    ok("NoTest 홈: 검사 전 · 후 비교에 숫자가 없다", h1.includes("검사 전") && h1.includes("검사 후") && !/\d+\s*%/.test(h1));
    ok("NoTest 홈: 검사를 끝내면 1회 더", h1.includes("검사를 끝내면 무료 분석 1회 더"));
    const v1 = await paste(q, "검사 없이 공고");
    ok("검사 없이 첫 분석이 된다", /^\/mat\/jobs\/\d+$/.test(v1), v1);
    const v2 = await paste(q, "검사 없이 공고 2");
    ok("검사 없이 두 번째는 요금 화면", v2 === "/mat/pricing", v2);
    const b = await matAccess(n.id);
    ok("검사 후 몫은 잠겨 있다", b.slots.notest === "used" && b.slots.aftertest === "locked");
    await ctx2.close();

    /* 3 — 같은 사람이 계정을 새로 만들어도(같은 gmail, 점 · +꼬리만 다름) 무료가 다시 생기지 않는다 */
    await query(`DELETE FROM users WHERE email IN ('zz.abuse@gmail.com', 'zzabuse+2@gmail.com')`).catch(() => undefined);
    for (const e of ["zz.abuse@gmail.com"]) {
      const { createHash } = await import("node:crypto");
      const hk = createHash("sha256").update(`${process.env.AUTH_SECRET || "cm-free-dev"}:free:email:${normalizeEmail(e)}`).digest("hex").slice(0, 32);
      await query(`DELETE FROM mat_free_claims WHERE identity_hash = $1`, [hk]);
    }
    const mk = async (email: string) => (await query<{ id: string }>(
      `INSERT INTO users (email, display_name, password_hash, must_reset_pw, status, is_demo)
       VALUES ($1, '시험', 'x', false, 'active', true) RETURNING id::text`, [email]))[0].id;
    const x1 = await mk("zz.abuse@gmail.com");
    await query(`INSERT INTO career_profiles (user_id, core_code, market_code) VALUES ($1, 'ME_CORE_V3', 'KR')`, [x1]);
    const c1 = await takeFreeAnalysis(x1);
    ok("첫 계정이 무료 칸을 잡는다", !!c1);
    await query(`UPDATE mat_free_claims SET posting_id = 1 WHERE user_id = $1`, [x1]);
    await query(`DELETE FROM users WHERE id = $1`, [x1]);
    const x2 = await mk("zzabuse+2@gmail.com");
    await query(`INSERT INTO career_profiles (user_id, core_code, market_code) VALUES ($1, 'ME_CORE_V3', 'KR')`, [x2]);
    const a2 = await matAccess(x2);
    ok("지운 뒤 같은 사람이 다시 가입하면 무료가 없다", a2.freeLeft === 0 && a2.slots.notest === "used", JSON.stringify(a2.slots));
    ok("다시 가입한 계정이 무료 칸을 못 잡는다", (await takeFreeAnalysis(x2)) === false);
    await query(`DELETE FROM users WHERE id = $1`, [x2]);
  } finally {
    await br.close();
  }
  console.log(`\nMAT 무료 범위 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main().catch((e) => { console.error(e); process.exit(1); });
