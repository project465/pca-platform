/**
 * **영어 사용자 한 바퀴**(2026-11-03 영어 화면 · 국내 유학생 · 외국인). 쿠키 없이 **브라우저 언어(en-US)만**
 * 들고 들어와서, 사람이 누르는 차례대로 지나간다.
 *
 *   가입(브라우저 영어) → 계정 언어 en → 전공 고르기(영어 원고가 없는 전공은 `available in Korean`)
 *   → CS 영어 응시 → 검사 몇 화면 → 결과(영어) → PDF(영어) → MAT 홈(영어)
 *   → 공고 붙여 넣기(영어 공고 · 한국어 공고) → 영어 분석(열쇠 없음 → 규칙) → 한국어 자기소개서 + 영어 대조본
 *   → 면접 연습 언어 고르기 → 요금(미국 접속 $9.99 · 한국 접속 9,900원) → 영어 법정 문서 · 문의
 *
 *   PORT=3203 PLATFORM_URL=http://localhost:3203 NODE_ENV=production SUBSCRIPTIONS_ENABLED=1 PAYMENTS_PROVIDER=mock \
 *     npx next start -p 3203                    (빌드한 서버 · ANTHROPIC_API_KEY 없음)
 *   BASE=http://127.0.0.1:3203 SHOTS=<저장소 밖> npm run en:walk
 *
 * 화면마다 **한글을 센다.** 세지 않는 것: 언어 고르기의 `한국어`, `lang="ko"` 로 표시한 자리(한국어 공고 원문 ·
 * 한국어 자기소개서 · 한국어 본문 링크), 시험 계정이 직접 친 말. 한국어 공고를 영어인 척 옮기지 않는지도 본다.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { BASE, loadEnv } from "./_loop-fixture";
import { walk } from "./_v3-walk";

loadEnv();
/* eslint-disable import/first */
import { query, queryOne } from "../src/lib/db";
import { catalog } from "../src/lib/assistant/catalog";

const CORE = process.env.CORE ?? "CS_CORE_V1";
const SHOTS = process.env.SHOTS ?? "";
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;

let pass = 0;
const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? ` — ${saw}` : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? ` — ${saw}` : ""}`); }
};

/** 화면 글자에서 세지 않는 자리(`lang="ko"` · 언어 고르기)를 걷어 낸 글 */
async function enText(p: Page): Promise<string> {
  return p.evaluate(() => {
    const b = document.body.cloneNode(true) as HTMLElement;
    b.querySelectorAll('[lang="ko"], .langsw, .sf-lang, script, style').forEach((x) => x.remove());
    return b.innerText ?? b.textContent ?? "";
  }).catch(() => "");
}
function hangulAt(text: string): string | null {
  const m = HANGUL.exec(text);
  return m ? text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, " ") : null;
}
async function clean(p: Page, what: string): Promise<void> {
  const t = await enText(p);
  ok(`${what}: 한글이 없다`, !hangulAt(t), hangulAt(t) ?? new URL(p.url()).pathname);
}
let shotN = 0;
async function shot(p: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  shotN += 1;
  await p.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
  await p.screenshot({ path: join(SHOTS, `${String(shotN).padStart(2, "0")}-${name}.png`), fullPage: false }).catch(() => undefined);
}
const path = (p: Page) => new URL(p.url()).pathname;

async function context(br: Browser, country: string): Promise<BrowserContext> {
  return br.newContext({
    viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1,
    locale: "en-US", extraHTTPHeaders: { "accept-language": "en-US,en;q=0.9", "cf-ipcountry": country },
  });
}

async function main(): Promise<void> {
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const br = await chromium.launch();
  const email = `en.walk.${Date.now().toString(36)}@test.invalid`;
  const pw = `En-walk-${Date.now()}!`;
  const errs: string[] = [];
  try {
    /* ── 1. 가입: 쿠키 없이 브라우저 영어만 ── */
    console.log("\n── 1. 가입(브라우저 영어, 쿠키 없음)");
    const ctx = await context(br, "US");
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
    ok("쿠키가 없다", (await ctx.cookies()).every((c) => c.name !== "metri_lang"));
    await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await clean(p, "로그인 화면");
    await p.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    await clean(p, "가입 화면");
    ok("가입 화면이 영어다", /Sign up|Create|account/i.test(await enText(p)), (await enText(p)).slice(0, 60));
    await p.fill('input[name="name"]', "Alex Kim");
    await p.fill('input[name="email"]', email);
    await p.fill('input[name="password"]', pw);
    for (const c of await p.locator('input[name="consent"]').all()) await c.check({ force: true }).catch(() => undefined);
    await Promise.all([
      p.waitForURL((u) => !u.pathname.startsWith("/signup"), { timeout: 30000 }).catch(() => undefined),
      p.locator('button[type="submit"]').last().click(),
    ]);
    await p.waitForLoadState("networkidle");
    const u = await queryOne<{ id: string; locale: string }>(`SELECT id::text, trim(locale) AS locale FROM users WHERE email = $1`, [email]);
    ok("가입하면 계정 언어가 en 으로 적힌다", u?.locale === "en", u?.locale ?? "계정 없음");
    if (!u) throw new Error("가입이 되지 않았다");
    const mail = await queryOne<{ locale: string | null }>(
      `SELECT trim(locale) AS locale FROM outbox WHERE user_id = $1 AND kind = 'signup' ORDER BY id DESC LIMIT 1`, [u.id]).catch(() => null);
    ok("가입 인사 메일이 영어로 줄 선다(outbox.locale = en)", mail?.locale === "en", mail?.locale ?? "줄 없음");

    /* ── 2. 전공 고르기 → CS 영어 응시 ── */
    console.log("\n── 2. 전공 고르기 · 응시");
    await p.goto(`${BASE}/cores`, { waitUntil: "networkidle" });
    await clean(p, "전공 고르기");
    const koOnly = await p.locator("[data-ko-only]").count();
    ok("영어 원고가 없는 전공은 'available in Korean' 으로 선다(영어 검토본은 내놓지 않는다)",
      koOnly === 0 || (await p.locator("body").innerText()).includes("This major's test is available in Korean"),
      `${await p.locator("a.en-door").count()}장`);

    /* 영어 원고가 없는 전공을 영어로 고르면 조용히 한국어로 열지 않는다 */
    const hidden = await p.locator('[data-ko-only] a[href*="/v3/start?core="]').first().getAttribute("href").catch(() => null);
    if (hidden) {
      const code = /core=([A-Z0-9_]+)/.exec(hidden)?.[1];
      await p.goto(`${BASE}/v3/start?core=${code}`, { waitUntil: "networkidle" });
      ok("영어로 고른 한국어 전용 전공: 영어 안내가 선다", (await p.locator("body").innerText()).includes("This major's test is available in Korean"), code ?? "");
      const att = await queryOne<{ n: string }>(`SELECT count(*)::text AS n FROM v3_attempts WHERE user_id = $1`, [u.id]);
      ok("그 안내는 응시를 열지 않는다", att?.n === "0", att?.n ?? "");
    }
    await p.goto(`${BASE}/cores`, { waitUntil: "networkidle" });
    await Promise.all([
      p.waitForURL(/\/v3\/start/, { timeout: 20000 }).catch(() => undefined),
      p.locator(`a.en-door[href*="${CORE}"]`).first().click(),
    ]);
    await p.waitForLoadState("networkidle");
    await clean(p, "검사 시작");
    await p.locator('label:has(input[name="stage"][value="bachelor"])').first().click().catch(() => undefined);
    await Promise.all([
      p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
      p.locator('button[type="submit"]').last().click({ force: true }),
    ]);
    const id = (p.url().match(/\/v3\/(\d+)/) ?? [])[1] ?? "";
    const row = id ? await queryOne<{ locale: string; core_code: string; tier: string }>(
      `SELECT locale, core_code, tier FROM v3_attempts WHERE id = $1::bigint`, [id]) : null;
    ok("CS 영어 응시가 열린다", row?.locale === "en" && row.core_code === CORE, `${row?.locale} ${row?.core_code} ${row?.tier}`);

    const hits: string[] = [];
    let n = 0;
    const out = await walk(p, 220, {
      note: "I designed the REST API myself and checked it against the load test results.",
      onScreen: async (pg) => {
        n += 1;
        const h = hangulAt(await enText(pg));
        if (h) hits.push(`${path(pg)} … ${h}`);

      },
    });
    ok("검사가 끝까지 가고 화면에 한글이 없다", out.done && !hits.length, `${out.screens}화면 ${hits.slice(0, 2).join(" | ")}`);

    /* ── 3. 결과 · PDF ── */
    console.log("\n── 3. 결과 · PDF");
    if (!/\/result/.test(p.url())) await p.goto(`${BASE}/v3/${id}/result`, { waitUntil: "networkidle" });
    await p.waitForLoadState("networkidle");
    await clean(p, "결과");
    await shot(p, "result-en");
    const pdf = await ctx.request.get(`${BASE}/v3/${id}/result/pdf`, { timeout: 180000 });
    const ct = pdf.headers()["content-type"] ?? "";
    ok("PDF 를 받는다", pdf.status() === 200 && ct.includes("pdf"), `${pdf.status()} ${ct}`);
    if (pdf.status() === 200) {
      const f = join(SHOTS || "/tmp", `en-walk-${id}.pdf`);
      writeFileSync(f, await pdf.body());
      let txt = "";
      try { txt = execFileSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" }); } catch { txt = ""; }
      ok("PDF 가 영어다(한글 없음)", !!txt && !hangulAt(txt), hangulAt(txt) ?? `${txt.length}자`);
    }

    /* ── 4. MAT ── */
    console.log("\n── 4. MAT");
    await p.goto(`${BASE}/mat`, { waitUntil: "networkidle" });
    ok("MAT 홈이 열린다", path(p) === "/mat", path(p));
    await clean(p, "MAT 홈");
    ok("MAT 홈이 영어다", /this week|Home/i.test(await enText(p)));
    await shot(p, "mat-home-en");
    for (const sub of ["/mat/jobs", "/mat/draft", "/mat/consult", "/mat/files", "/mat/settings", "/mat/pass", "/mat/brief"]) {
      await p.goto(`${BASE}${sub}`, { waitUntil: "networkidle" });
      await clean(p, `MAT ${sub}`);
    }

    /* 영어 공고 붙여 넣기 → 영어 분석(열쇠 없음 → 규칙) */
    const paste = async (label: string, text: string): Promise<string> => {
      await p.goto(`${BASE}/mat/jobs#paste`, { waitUntil: "networkidle" });
      await p.fill('input[name="label"]', label);
      await p.fill('textarea[name="text"]', text);
      await Promise.all([
        p.waitForURL(/\/mat\/(jobs\/\d+|pricing)/, { timeout: 60000 }).catch(() => undefined),
        p.locator('form:has(textarea[name="text"]) button[type="submit"]').click(),
      ]);
      await p.waitForLoadState("networkidle");
      return /\/mat\/jobs\/(\d+)/.exec(p.url())?.[1] ?? "";
    };
    const enId = await paste("Backend developer (entry level)",
      "Backend Developer, entry level. Requirements: experience designing REST APIs; database schema design and SQL; " +
      "writing unit tests and code review with Git. Preferred: cloud deployment (AWS), CI/CD pipelines, performance testing.");
    ok("영어 공고 분석 화면이 선다", !!enId, p.url());
    await clean(p, "영어 공고 분석");
    const a1 = await p.locator("body").innerText();
    ok("분석이 영어 머리로 선다(What fits · What to fill in · Conditions 가운데 하나 이상)", /What fits|What to fill in|Conditions|Requirements not linked/.test(a1));
    await shot(p, "mat-analysis-en");

    /* 국내 유학생: 한국어 공고. 열쇠가 없으면 지어 옮기지 않고 한국어 줄 그대로 + `Korean posting` 표시 */
    const koId = await paste("Korean posting test",
      "백엔드 개발자 신입 채용. 자격 요건: REST API 설계 경험, 데이터베이스 설계와 SQL 활용, Git 을 이용한 협업 경험. 우대 사항: AWS 배포 경험, CI/CD 구축 경험.");
    if (koId) {
      ok("한국어 공고: 'Korean posting' 표시가 선다", (await p.locator("body").innerText()).includes("Korean posting"));
      /* 영어 질문 · 안내가 한국어 공고 줄을 “ ” 안에 그대로 옮겨 적는 자리는 원문 인용이다(옮기지 않는다) */
      const kt = (await enText(p)).replace(/“[^”]*”/g, "");
      ok("한국어 공고 분석: 원문 인용(lang=ko · “ ”) 밖에 한글이 없다", !hangulAt(kt), hangulAt(kt) ?? "");
      const fake = await queryOne<{ n: string }>(`SELECT count(*)::text AS n FROM job_posting_en`).catch(() => null);
      ok("열쇠가 없을 때 영어 요약을 지어 적지 않는다", fake !== null, `job_posting_en ${fake?.n ?? "?"}줄`);
    } else ok("한국어 공고: 무료 분석이 남아 있지 않아 요금으로 간다(무료 범위)", path(p) === "/mat/pricing", path(p));

    /* 한국어 자기소개서 + 영어 대조본: 분석의 첫 필수 영역에 경험 하나를 적어 둔다(영어 보기 문장) */
    const an = await queryOne<{ analysis: { items: { kind: string; domain: string | null }[] } }>(
      `SELECT analysis FROM assistant_postings WHERE id = $1::bigint`, [enId]).catch(() => null);
    const dom = an?.analysis.items.find((i) => i.kind === "must" && i.domain)?.domain ?? null;
    if (dom) {
      const d = catalog(CORE, "en").find((x) => x.code === dom)!;
      await query(
        `INSERT INTO v3_experiences (user_id, core_code, kind, title, td_codes, problems, decisions, artifacts, verifications, status)
         VALUES ($1, $2, 'project', 'Campus club booking service', $3, $4, $5, $6, $7, 'saved')`,
        [u.id, CORE, [dom], (d.checklist.J1 ?? []).slice(0, 1), (d.checklist.J3 ?? []).slice(0, 1), d.artifacts.slice(0, 1), d.verify.slice(0, 1)]);
    }
    ok("분석에 영역이 이어진 필수 요건이 있다", !!dom, dom ?? "없음");
    await p.goto(`${BASE}/mat/draft?p=${enId}`, { waitUntil: "networkidle" });
    await clean(p, "지원서(한국어 자기소개서는 lang=ko)");
    const bi = await p.locator("[data-bi-draft]").count();
    const biText = await p.locator("body").innerText();
    ok("지원서: 한국어 자기소개서 + 영어 대조본이 나란히 선다",
      bi > 0 && biText.includes("Korean self-introduction (for Korean companies)") && await p.locator('[data-bi-draft] p[lang="ko"]').count() > 0
      && await p.locator('[data-bi-draft] p[lang="en"]').count() > 0, `${bi}벌`);
    await shot(p, "mat-draft-ko-en");
    const iv = await p.locator('#iv a[href*="il=ko"]').count();
    ok("면접 연습: 한국어 · 영어를 고를 수 있다", iv > 0);
    if (iv) {
      await p.goto(`${BASE}/mat/draft?p=${enId}&il=ko`, { waitUntil: "networkidle" });
      const koQ = await p.locator('#iv [lang="ko"]').first().innerText().catch(() => "");
      ok("한국어를 고르면 질문이 한국어로 선다", HANGUL.test(koQ), koQ.slice(0, 40));
      await p.goto(`${BASE}/mat/draft?p=${enId}&il=en`, { waitUntil: "networkidle" });
      const enQ = await p.locator('#iv [lang="en"]').first().innerText().catch(() => "");
      ok("영어를 고르면 질문이 영어로 선다", !!enQ && !HANGUL.test(enQ), enQ.slice(0, 40));
    }

    /* ── 5. 요금: 미국 접속 $9.99 · 한국 접속 9,900원 ── */
    console.log("\n── 5. 요금");
    await p.goto(`${BASE}/mat/pricing`, { waitUntil: "networkidle" });
    const us = await p.locator("body").innerText();
    ok("미국 접속: 1군 기본 $9.99 · 달러", us.includes("$9.99") && await p.locator('[data-currency="USD"]').count() > 0, us.match(/\$\d+\.\d\d/g)?.slice(0, 2).join(" ") ?? "");
    await clean(p, "요금(미국)");
    await shot(p, "mat-pricing-usd");
    const kr = await context(br, "KR");
    await kr.addCookies(await ctx.cookies());
    const pk = await kr.newPage();
    await pk.goto(`${BASE}/mat/pricing`, { waitUntil: "networkidle" });
    const krText = await pk.locator("body").innerText();
    ok("한국 접속: 원화 9,900원", /9,900/.test(krText) && await pk.locator('[data-currency="KRW"]').count() > 0, krText.match(/[\d,]+원|₩[\d,]+|KRW ?[\d,]+/)?.[0] ?? "");
    await kr.close();

    /* ── 6. 법정 문서 · 문의 ── */
    console.log("\n── 6. 법정 문서 · 문의");
    for (const k of ["terms", "privacy", "refund", "subscription"]) {
      await p.goto(`${BASE}/legal/${k}?lang=en`, { waitUntil: "networkidle" });
      const t = await p.locator("body").innerText();
      ok(`/legal/${k}: 영어 초안 · 맨 위 '한국어본 우선' 안내`, (await p.locator("[data-legal-draft]").count()) === 1 && t.includes("The Korean version governs"));
      /* 초안은 한국 법 이름 · 회사 이름을 한국어로 괄호에 둔다(초안 README 규칙). 본문이 영어인지는 한글 비율로 본다 */
      const body = await enText(p);
      const ko = (body.match(/[가-힣]/g) ?? []).length;
      const ratio = ko / Math.max(1, body.replace(/\s+/g, "").length);
      ok(`/legal/${k}: 본문이 영어다(한글은 괄호 속 법 이름 · 회사 이름뿐, 2% 미만)`, ratio < 0.02, `${(ratio * 100).toFixed(2)}% · ${body.length}자`);
    }

    await p.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
    await clean(p, "문의하기");
    ok("문의하기에 메일 칸이 있다", await p.locator('input[name="email"]').count() === 1);
    await p.waitForTimeout(1700);
    await p.fill('input[name="name"]', "Alex Kim");
    await p.fill('input[name="email"]', email);
    await p.fill('textarea[name="message"]', "I am an international student in Seoul. Can I take the test in English?");
    await p.check('input[name="consent"]');
    await Promise.all([p.waitForURL(/sent=1|e=/, { timeout: 20000 }).catch(() => undefined), p.locator('form button[type="submit"]').click()]);
    const inq = await queryOne<{ lang: string }>(`SELECT lang FROM inquiries WHERE email = $1 ORDER BY id DESC LIMIT 1`, [email]);
    ok("영어 문의가 접수된다(언어 en)", /sent=1/.test(p.url()) && inq?.lang === "en", `${p.url().replace(BASE, "")} ${inq?.lang ?? "줄 없음"}`);

    /* 언어를 바꾸면 계정 언어도 바뀐다 */
    await p.goto(`${BASE}/mat/settings`, { waitUntil: "networkidle" });
    await p.locator('.langsw button:has-text("한국어")').first().click();
    await p.waitForTimeout(2500);
    const after = await queryOne<{ locale: string }>(`SELECT trim(locale) AS locale FROM users WHERE id = $1`, [u.id]);
    ok("언어 전환기가 계정 언어를 ko 로 바꾼다", after?.locale === "ko", after?.locale ?? "");
    await p.goto(`${BASE}/mat`, { waitUntil: "networkidle" });
    ok("한국어로 바꾸면 MAT 이 한국어다", (await p.locator("body").innerText()).includes("이번 주"));

    ok("브라우저 오류와 500 이 없다", errs.length === 0, errs.slice(0, 3).join(" | "));
    await ctx.close();
  } finally {
    await br.close();
  }
  console.log(`\n통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) { for (const b of bad) console.log(`  - ${b}`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
