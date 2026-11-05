/**
 * 연구 이력 화면 견본(예시 계정 · 예시 공고). 로컬 서버(BASE)와 로컬 DB 에서만.
 *
 *   BASE=http://127.0.0.1:3100 SHOTS=<폴더> npx tsx scripts/research-shots.ts
 *
 * 예시 계정 하나 · 예시 자료 하나 · 예시 공고 넷을 만들고 세 화면을 찍은 뒤 모두 지운다.
 * 요건별 판단 상자는 AI 를 부르지 않고 문구 규칙대로 적은 **예시 값** 3건을 넣는다(열쇠가 없는 자리다).
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
    await P.saveItem(u, { kind: "degree", data: { level: "master", status: "done", major: "화학공학", advisorField: "전기화학", thesisTitle: "황화물계 고체 전해질의 계면 안정성 연구", year: 2025, keywords: ["이차전지"] } });
    await P.saveItem(u, { kind: "paper", data: { title: "황화물계 고체 전해질의 이온 전도도 향상", venue: "한국화학공학회지", year: 2025, authorRole: "first", keywords: ["고체 전해질", "이온 전도도"] } });
    await P.saveItem(u, { kind: "patent", data: { title: "고체 전해질 조성물 및 그 제조 방법", status: "filed", year: 2025, inventorOrder: 2, keywords: ["고체 전해질"] } });
    const projects: [string, string, number, "10to50" | "1to5" | "5to10"][] = [
      ["차세대 전고체 전지 소재 개발", "산업통상자원부", 40, "10to50"],
      ["리튬 금속 음극 계면 제어 기술", "과학기술정보통신부", 30, "1to5"],
      ["이차전지 셀 평가 표준화", "한국에너지기술평가원", 50, "5to10"],
    ];
    for (const [title, agency, participation, budget] of projects) {
      await P.saveItem(u, { kind: "project", data: { title, agency, from: "2023-03", to: "2025-12", budget, role: "member", participation, keywords: ["전고체 전지", "셀 평가"] } });
    }
    await P.saveItem(u, { kind: "method", data: { name: "XRD", level: "operate" } });
    const fields = {
      모집분야: "전고체 전지 셀 평가",
      지원자격: "화학공학·재료공학 등 관련 분야 석사 학위 이상",
      우대사항: "국가R&D 연구책임자 수행 경험, 고체 전해질 관련 SCI(E)급 논문 또는 특허 실적",
    };
    const add = async (ref: string, title: string, category: string, degree_min: string | null, degree_label: string | null) => {
      const r = await queryOne<{ id: string }>(
        `INSERT INTO v3_job_postings (source, source_ref, source_url, mapping_grade, title, category, degree_min, degree_label, posting_kind, closes_on, posting_fields)
         VALUES ('jobindustry', $1, 'https://www.jobindustry.co.kr/487/?bmode=view&idx=1', '약함', $2, $3, $4, $5, 'job', (now() + interval '20 days')::date, $6) RETURNING id::text`,
        [`${tag}-${ref}`, title, category, degree_min, degree_label, JSON.stringify(fields)]);
      posts.push(r!.id);
      return r!.id;
    };
    const p1 = await add("1", "[예시] 전고체 전지 고체 전해질 연구원", "기업 R&D", "master", "석사 이상");
    await add("2", "[예시] 이차전지 소재 이온 전도도 분석 연구원", "출연연", "master", "석사·박사");
    await add("3", "[예시] 이차전지 셀 평가 엔지니어", "공공기관", null, null);
    await add("4", "[예시] 전기화학 분석 박사후연구원", "출연연", "phd", "박사 이상");
    await M.refreshMatches(u);
    /*
     * 요건별 판단 견본 3건. **AI 를 부르지 않고 문구 규칙대로 손으로 적은 예시 값**이다(로컬에 열쇠가 없다).
     * 저장 전에 실제 경로와 같은 거르기(`cleanReading`)를 지난다: 인용이 공고 글에 있는지, 근거 번호가 이 사람 것인지
     */
    const its = await P.itemsOf(u);
    const id = (pred: (i: (typeof its)[number]) => boolean) => `R${its.find(pred)!.id}`;
    const deg = id((i) => i.kind === "degree");
    const paper = id((i) => i.kind === "paper");
    const patent = id((i) => i.kind === "patent");
    const projs = its.filter((i) => i.kind === "project").map((i) => `R${i.id}`);
    const A = await import("../src/lib/research/ai");
    const sample = A.cleanReading({ requirements: [
      { quote: "화학공학·재료공학 등 관련 분야 석사 학위 이상", kind: "required",
        eligibility: "입력하신 학위는 화학공학 석사(마침, 2025)로 이 요건을 채웁니다.",
        record: "학위논문은 '황화물계 고체 전해질의 계면 안정성 연구'입니다.", evidence: [deg],
        write: ["학위 취득일과 학위논문 제목을 지원서 학력 칸에 학위증명서와 같은 표기로 적어 두세요."] },
      { quote: "국가R&D 연구책임자 수행 경험", kind: "preferred",
        eligibility: "우대이므로 지원 자격에는 영향이 없습니다.",
        record: "입력하신 과제 3건은 모두 참여연구원(참여율 30~50%)입니다.", evidence: projs,
        write: ["'차세대 전고체 전지 소재 개발'(산업통상자원부, 총사업비 10억~50억 원)에서 2세부 실무를 맡고 단계평가 보고서를 직접 쓰셨다면 그 사실을 경력서에 적어 두세요."] },
      { quote: "고체 전해질 관련 SCI(E)급 논문 또는 특허 실적", kind: "preferred",
        eligibility: "우대이므로 지원 자격에는 영향이 없습니다.",
        record: "입력하신 실적은 논문 1편('황화물계 고체 전해질의 이온 전도도 향상', 한국화학공학회지, 2025, 제1저자)과 특허 1건('고체 전해질 조성물 및 그 제조 방법', 2025 출원, 발명자 2번째)입니다.",
        evidence: [paper, patent],
        write: ["한국화학공학회지가 공고 기준일에 SCI(E) 등재지인지 확인해, 등재지가 아니면 국내 학술지로 구분해 적으세요.", "특허는 출원번호와 발명자 순서를 함께 적어 두세요."] },
    ] }, A.postingBlock({ id: p1, title: "[예시] 전고체 전지 고체 전해질 연구원", field: null, category: "기업 R&D", degree_min: "master",
      degree_label: "석사 이상", posting_kind: "job", posting_fields: fields, raw_requirements: [] }), its.map((i) => i.id));
    console.log(`견본 요건 ${sample.requirements.length}건이 거르기를 지났다`);
    await query(`UPDATE research_matches SET ai = $3, ai_at = now() WHERE user_id = $1 AND posting_id = $2`, [u, p1, JSON.stringify(sample)]);

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
