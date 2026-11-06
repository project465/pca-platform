/**
 * **잡인더 입구 → 가입 → 그 공고 무료 분석** 끝까지(예시 공고 · 처음 온 예시 방문자). 로컬 서버(BASE) · 로컬 DB 에서만.
 *
 *   BASE=http://127.0.0.1:3100 SHOTS=<폴더> npx tsx scripts/mat-walk-ji.ts
 *
 * 걸음마다 화면을 찍고 주소를 적는다. 예시 공고 · 계정은 끝나면 지운다.
 */
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { loadEnv } from "./_loop-fixture";

loadEnv();
const BASE = (process.env.BASE ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const OUT = process.env.SHOTS ?? ".";
let bad = 0;
const ok = (n: string, c: boolean, d = "") => { if (!c) bad += 1; console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`); };

(async () => {
  const { query, queryOne } = await import("../src/lib/db");
  const idx = String(99_000_000 + Math.floor(Math.random() * 999_999));
  const email = `zzji${Date.now().toString(36)}@example.test`;
  const pw = `J${randomBytes(9).toString("base64url")}7!`;
  const post = (await queryOne<{ id: string }>(
    `INSERT INTO v3_job_postings (source, source_ref, source_url, mapping_grade, title, category, posting_kind, degree_label, closes_on,
       raw_requirements, posting_fields)
     VALUES ('jobindustry', $1, $2, '약함', '[예시] 데이터 분석 신입 연구원', '기업 R&D', 'job', '학사 이상', (now() + interval '14 days')::date,
       $3, $4) RETURNING id::text`,
    [idx, `https://www.jobindustry.co.kr/487/?bmode=view&idx=${idx}`,
      ["모집 분야: 데이터 분석", "지원 자격: 학사 이상, 통계 · 컴퓨터 관련 전공", "우대 사항: Python · SQL 사용 경험, 데이터 시각화 프로젝트 경험",
        "고용 형태: 정규직", "근무지: 대전 유성구"],
      JSON.stringify({ 모집분야: "데이터 분석", 지원자격: "학사 이상, 통계 · 컴퓨터 관련 전공", 우대사항: "Python · SQL 사용 경험, 데이터 시각화 프로젝트 경험", 고용형태: "정규직", 근무지: "대전 유성구" })]))!.id;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "ko-KR" });
  const p = await ctx.newPage();
  const shot = async (name: string) => { await p.screenshot({ path: `${OUT}/ji-${name}.png`, fullPage: true }); };
  try {
    await p.goto(`${BASE}/from/jobindustry?board=487&idx=${idx}`, { waitUntil: "networkidle" });
    ok("1. 입구 → 로그인 화면(다음 쪽 /mat/from-ji)", /\/login/.test(p.url()) && decodeURIComponent(p.url()).includes("/mat/from-ji"), p.url().replace(BASE, ""));
    await shot("1-login");
    const signup = p.locator('a[href*="/signup"]').first();
    const href = await signup.getAttribute("href");
    ok("2. 로그인 화면의 가입 링크가 다음 쪽을 들고 간다", !!href && decodeURIComponent(href).includes("/mat/from-ji"), href ?? "(링크 없음)");
    await signup.click(); await p.waitForLoadState("networkidle");
    await shot("2-signup");
    await p.fill('input[name="name"]', "예시");
    await p.fill('input[name="email"]', email);
    await p.fill('input[name="password"]', pw);
    const boxes = p.locator('input[type="checkbox"]');
    for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check().catch(() => undefined);
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/signup"), { timeout: 30000 }).catch(() => undefined), p.locator('form button[type="submit"]').last().click()]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    ok("3. 가입 뒤 그 공고 자리(/mat/from-ji)로 온다", new URL(p.url()).pathname === "/mat/from-ji", p.url().replace(BASE, ""));
    await shot("3-landing");
    const h1 = (await p.locator("h1").first().textContent())?.trim();
    ok("4. 그 공고 제목이 선다", h1 === "[예시] 데이터 분석 신입 연구원", h1 ?? "");
    const pick = p.locator('select[name="core"]');
    ok("4-1. 전공이 없으면 이 화면에서 고른다", await pick.count() === 1);
    if (await pick.count()) await pick.selectOption({ label: "컴퓨터·소프트웨어" });
    await shot("3b-pick");
    const go = p.locator('form button[type="submit"]').first();
    const label = (await go.textContent())?.trim();
    ok("5. 무료 분석 단추", !!label && /무료/.test(label), label ?? "");
    await Promise.all([p.waitForURL((u) => u.pathname !== "/mat/from-ji", { timeout: 60000 }).catch(() => undefined), go.click()]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await shot("4-result");
    const body = (await p.locator("main").first().innerText().catch(() => "")).replace(/\s+/g, " ");
    ok("6. 분석 화면으로 간다", /\/mat\/jobs\/\d+/.test(p.url()), p.url().replace(BASE, ""));
    console.log(`     화면 앞부분: ${body.slice(0, 260)}`);
    const claim = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM assistant_postings ap JOIN users u ON u.id = ap.user_id WHERE u.email = $1`, [email]);
    ok("7. 분석 한 건이 그 계정에 적힌다", (claim?.n ?? 0) === 1, String(claim?.n));
    const attr = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM user_attribution a JOIN users u ON u.id = a.user_id WHERE u.email = $1`, [email]).catch(() => null);
    console.log(`     유입 기록: ${attr ? attr.n : "(표 없음)"}`);
  } finally {
    await b.close();
    const u = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE email = $1`, [email]).catch(() => null);
    if (u) {
      for (const t of ["assistant_postings", "assistant_nudges", "mat_free_claims", "user_attribution", "memberships", "consents"]) {
        await query(`DELETE FROM ${t} WHERE user_id = $1`, [u.id]).catch(() => undefined);
      }
      await query(`DELETE FROM users WHERE id = $1`, [u.id]).catch(() => undefined);
    }
    await query(`DELETE FROM v3_job_postings WHERE id = $1`, [post]).catch(() => undefined);
  }
  console.log(`\n잡인더 입구 흐름 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
