/**
 * 연구 이력 화면 견본(예시 계정 · 예시 공고). 로컬 서버(BASE)와 로컬 DB 에서만.
 *
 *   BASE=http://127.0.0.1:3100 SHOTS=<폴더> npx tsx scripts/research-shots.ts
 *
 * 예시 계정 하나 · 예시 자료 하나 · 예시 공고 넷을 만들고 세 화면을 찍은 뒤 모두 지운다.
 * 요건 맞춰 보기 상자는 AI 를 부르지 않고 **예시 값**을 넣어 모양만 본다(열쇠가 없는 자리다).
 */
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { loadEnv } from "./_loop-fixture";

loadEnv();
const BASE = (process.env.BASE ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const OUT = process.env.SHOTS ?? ".";

(async () => {
  const { query, queryOne } = await import("../src/lib/db");
  const { hashPassword } = await import("../src/lib/password");
  const P = await import("../src/lib/research/profile");
  const M = await import("../src/lib/research/match");
  const tag = `zzrpshot${Date.now().toString(36)}`;
  const login = `${tag}@example.test`;
  const pw = `S${randomBytes(9).toString("base64url")}7!`;
  const u = (await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, is_demo, must_reset_pw)
     VALUES ($1, $1, '예시', $2, 'active', 'ko', TRUE, FALSE) RETURNING id::text`, [login, await hashPassword(pw)]))!.id;
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1, NULL, 'student') ON CONFLICT DO NOTHING`, [u]).catch(() => undefined);
  const posts: string[] = [];
  try {
    const doc = (await queryOne<{ id: string }>(
      `INSERT INTO research_docs (user_id, core_code, sha256, file_kind, doc_type, lang, title, venue, year, doi, data, terms)
       VALUES ($1, 'CHE', $2, 'pdf', 'paper', 'en', 'Sulfide solid electrolyte for all-solid-state batteries', 'Journal of Power Sources', 2025,
               '10.0000/example', $3, $4) RETURNING id::text`,
      [u, randomBytes(16).toString("hex"), JSON.stringify({ methods: ["XRD", "EIS 분석", "SEM"], roles: [], authors: [] }),
        ["고체 전해질", "전고체 전지", "이온 전도도"]]))!.id;
    await P.saveItem(u, { kind: "degree", data: { level: "master", status: "done", major: "화학공학", advisorField: "전기화학", keywords: ["이차전지"] } });
    await P.saveItem(u, { kind: "paper", data: { title: "황화물계 고체 전해질의 이온 전도도 향상", venue: "한국화학공학회지", year: 2025, authorRole: "first", keywords: ["고체 전해질", "이온 전도도"] } });
    await P.saveItem(u, { kind: "project", data: { title: "차세대 전고체 전지 소재 개발", agency: "산업통상자원부", from: "2024-03", to: "2026-02", budget: "10to50", role: "member", tasks: "전해질 합성과 셀 평가를 맡았습니다.", keywords: ["전고체 전지", "셀 평가"] } });
    await P.saveItem(u, { kind: "method", data: { name: "XRD", level: "operate" } });
    const add = async (ref: string, title: string, category: string, degree_min: string | null, degree_label: string | null) => {
      const r = await queryOne<{ id: string }>(
        `INSERT INTO v3_job_postings (source, source_ref, source_url, mapping_grade, title, category, degree_min, degree_label, posting_kind, closes_on, posting_fields)
         VALUES ('jobindustry', $1, 'https://www.jobindustry.co.kr/487/?bmode=view&idx=1', '약함', $2, $3, $4, $5, 'job', (now() + interval '20 days')::date, $6) RETURNING id::text`,
        [`${tag}-${ref}`, title, category, degree_min, degree_label, JSON.stringify({ 모집분야: "전고체 전지 셀 평가", 지원자격: "관련 전공 석사 이상" })]);
      posts.push(r!.id);
    };
    await add("1", "[예시] 전고체 전지 고체 전해질 연구원", "기업 R&D", "master", "석사 이상");
    await add("2", "[예시] 이차전지 소재 이온 전도도 분석 연구원", "출연연", "master", "석사·박사");
    await add("3", "[예시] 이차전지 셀 평가 엔지니어", "공공기관", null, null);
    await add("4", "[예시] 전기화학 분석 박사후연구원", "출연연", "phd", "박사 이상");
    await M.refreshMatches(u);
    const first = (await M.matchesOf(u))[0];
    if (first) {
      await query(`UPDATE research_matches SET ai = $3, ai_at = now() WHERE user_id = $1 AND posting_id = $2`, [u, first.posting_id, JSON.stringify({
        summary: "(예시 값) 고체 전해질 논문과 과제가 모집 분야와 맞습니다. 셀 평가 경력 기간은 원문에서 확인하세요.",
        requirements: [
          { text: "관련 전공 석사 이상", status: "met", evidence: [], note: "화학공학 석사를 마쳤습니다." },
          { text: "전고체 전지 셀 평가", status: "partial", evidence: [], note: "과제에서 셀 평가를 맡았습니다. 기간을 지원서에 적으세요." },
        ],
      })]);
    }

    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "ko-KR" });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login`);
    await p.fill("#identifier", login); await p.fill("#password", pw);
    await Promise.all([p.waitForURL((x) => !x.pathname.endsWith("/login"), { timeout: 30000 }).catch(() => undefined), p.click('button[type="submit"]')]);
    for (const [name, path] of [["1-research", "/mat/research"], ["2-from-file", `/mat/research/item?from=${doc}`], ["3-matches", "/mat/research/matches"]] as const) {
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await p.screenshot({ path: `${OUT}/research-${name}.png`, fullPage: true });
      console.log(`찍음 ${name} ${p.url().replace(BASE, "")} · 제목 ${(await p.locator("h1").first().textContent())?.trim()}`);
    }
    /* 파일로 채운 칸을 화면에서 확인하고 저장해 본다(확인 칸 없이는 브라우저가 막고, 서버도 받지 않는다) */
    await p.goto(`${BASE}/mat/research/item?from=${doc}`, { waitUntil: "networkidle" });
    const before = (await P.itemsOf(u)).length;
    await p.click('form.mt-form button[type="submit"]');
    await p.waitForTimeout(800);
    const blocked = (await P.itemsOf(u)).length === before;
    await p.check('form.mt-form input[name="confirm"]');
    await Promise.all([p.waitForURL(/ok=saved/, { timeout: 30000 }).catch(() => undefined), p.click('form.mt-form button[type="submit"]')]);
    const after = await P.itemsOf(u);
    const saved = after.find((i) => i.source_doc_id === doc);
    console.log(`확인 없이 저장 막힘 ${blocked ? "예" : "아니오"} · 확인 후 저장 ${saved ? "예" : "아니오"} · 낱말 ${saved?.terms.join("|") ?? "-"} · 주소 ${p.url().replace(BASE, "")}`);
    await b.close();
  } finally {
    await query(`DELETE FROM users WHERE id = $1`, [u]).catch(() => undefined);
    await query(`DELETE FROM v3_job_postings WHERE id = ANY($1::bigint[])`, [posts]).catch(() => undefined);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
