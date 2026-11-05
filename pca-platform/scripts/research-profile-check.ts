/**
 * **MAT 연구 이력 · 공고 추천 점검**(2026-11-05).
 *
 *   npm run research:check
 *
 * 1. 순수 함수: 입력 받기(확인 칸 · 필수 칸) · 낱말 · 학위 단계 · 파일로 미리 채우기 · 1차 점수 · AI 근거 거르기 · 메일 문면
 * 2. DB(로컬만): 예시 계정 둘과 예시 공고로 저장 → 맞춤 → 새 공고 알림 → 하루 메일(설정 없음 · 있음) → 남의 줄 막기 → 지우기.
 *    예시 계정 · 공고 · 알림 · 메일 줄은 이 점검이 만들고 끝나면 지운다. 실제 학생 계정은 건드리지 않는다
 */
import { loadEnv } from "./_loop-fixture";

loadEnv();
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, why = "") => {
  if (cond) pass += 1; else fail += 1;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${!cond && why ? ` — ${why}` : ""}`);
};
const form = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
};

(async () => {
  const P = await import("../src/lib/research/profile");
  const M = await import("../src/lib/research/match");
  const A = await import("../src/lib/research/ai");
  const { renderMailWith } = await import("../src/lib/outbox");

  console.log("입력 받기");
  ok("확인 칸이 없으면 저장하지 않는다", (P.parseItem(form({ kind: "paper", title: "x" })) as { why?: string }).why === "confirm");
  ok("필수 칸(제목)이 비면 저장하지 않는다", (P.parseItem(form({ kind: "paper", confirm: "1" })) as { why?: string }).why === "required");
  ok("모르는 종류는 받지 않는다", (P.parseItem(form({ kind: "salary", confirm: "1" })) as { why?: string }).why === "kind");
  const proj = P.parseItem(form({
    kind: "project", confirm: "1", title: "차세대 전해질 과제", budget: "10to50", role: "member", from: "2024-03", to: "2026-13",
    keywords: "전해질, 이차전지,  전해질 , x", tasks: "셀 평가\n\n\n\n보고서",
  }));
  const pd = proj.ok ? (proj.data as import("../src/lib/research/profile").ProjectData) : null;
  ok("과제: 총사업비 구간 · 역할 · 기간(틀린 달은 버림) · 낱말(중복 · 한 글자 버림)", !!pd && pd.budget === "10to50" && pd.role === "member"
    && pd.from === "2024-03" && pd.to === undefined && pd.keywords.join("|") === "전해질|이차전지" && pd.tasks === "셀 평가\n\n보고서", JSON.stringify(pd));
  ok("정확한 금액 칸은 받지 않는다(구간 밖 값은 버림)", (() => { const r = P.parseItem(form({ kind: "project", confirm: "1", title: "a", budget: "1234000000" })); return r.ok && (r.data as { budget?: string }).budget === undefined; })());
  const deg = P.parseItem(form({ kind: "degree", confirm: "1", level: "phd", status: "in_progress", major: "화학공학", advisorField: "전기화학", keywords: "배터리" }));
  ok("학위: 전공 · 지도교수 분야 · 낱말이 맞출 낱말이 된다", deg.ok && P.termsOf("degree", deg.data).join("|") === "화학공학|전기화학|배터리");
  ok("기법 이름이 맞출 낱말", P.termsOf("method", { name: "XRD" }).join("|") === "XRD");

  console.log("학위 단계");
  const lv = (xs: [string, string][]) => P.degreeLevelOf(xs.map(([level, status]) => ({ kind: "degree" as const, data: { level, status, major: "m", keywords: [] } as never })));
  ok("박사 과정 중 = 석사로 친다", lv([["phd", "in_progress"]]) === "master");
  ok("박사 마침 = 박사, 박사후 = 박사", lv([["phd", "done"]]) === "phd" && lv([["postdoc", "done"]]) === "phd");
  ok("가장 높은 단계", lv([["bachelor", "done"], ["master", "done"]]) === "master");
  ok("학위 줄이 없으면 모름", P.degreeLevelOf([]) === null);

  console.log("파일로 미리 채우기");
  const doc = (doc_type: string) => ({ doc_type, title: "Solid electrolyte study", venue: "J. Power", year: 2025, doi: "10.1/x", terms: ["solid electrolyte", "battery"], data: { methods: ["XRD", "EIS 분석"] } }) as never;
  ok("논문 자료 → 논문 칸(제목 · 학술지 · 연도 · DOI · 낱말), 저자 역할은 비움", (() => { const p = P.prefillFromDoc(doc("paper")); return p.kind === "paper" && p.values.venue === "J. Power" && p.values.keywords === "solid electrolyte, battery" && !("authorRole" in p.values); })());
  ok("학위논문 → 학위 칸의 논문 제목", (() => { const p = P.prefillFromDoc(doc("thesis")); return p.kind === "degree" && p.values.thesisTitle === "Solid electrolyte study"; })());
  ok("특허 → 특허, 보고서 → 연구과제(총사업비 · 역할은 비움)", P.prefillFromDoc(doc("patent")).kind === "patent"
    && (() => { const p = P.prefillFromDoc(doc("report")); return p.kind === "project" && !p.values.budget && !p.values.role; })());
  ok("자료의 방법 → 장비와 기법 후보", P.methodNamesFromDoc(doc("paper")).join("|") === "XRD|EIS 분석");

  console.log("1차 점수");
  const post = (o: Partial<import("../src/lib/research/match").PostingForMatch>) => ({
    id: "1", title: "", field: null, category: "기업 R&D", degree_min: null, degree_label: null, posting_kind: "job",
    posting_fields: null, raw_requirements: [], ...o,
  });
  const me = (terms: string[], level: "master" | "phd" | null = "master", categories: string[] = []) =>
    ({ items: [{ id: "11", terms }], level, categories });
  ok("영문 짧은 낱말은 낱말 경계로만(AI 가 MAIL 에 맞지 않음)", M.hasTerm("mail 담당", "AI") === false && M.hasTerm("ai 연구원", "AI") === true);
  ok("한글 낱말은 포함으로", M.hasTerm("고체 전해질 연구원", "전해질"));
  const s1 = M.scorePosting(post({ title: "이차전지 전해질 연구원", degree_min: "master" }), me(["전해질", "이차전지", "XRD"]));
  ok("낱말 2개 45 + 학위 충족 15 + 종류 미선택 10 = 70", s1?.score === 70 && s1.reasons.degree === "fit" && s1.reasons.terms.length === 2, JSON.stringify(s1));
  ok("낱말이 하나도 없으면 맞춤 아님", M.scorePosting(post({ title: "회계 담당" }), me(["전해질"])) === null);
  ok("학위 요구보다 낮으면 뺀다(박사 요구 · 석사)", M.scorePosting(post({ title: "전해질 박사급", degree_min: "phd" }), me(["전해질"])) === null);
  ok("학위 줄이 없으면 학위로 빼지 않는다", M.scorePosting(post({ title: "전해질 박사급", degree_min: "phd" }), me(["전해질"], null))?.reasons.degree === "unknown");
  ok("고른 종류가 아니면 뺀다 · 고른 종류면 15", M.scorePosting(post({ title: "전해질" }), me(["전해질"], "master", ["출연연"])) === null
    && M.scorePosting(post({ title: "전해질", category: "출연연" }), me(["전해질"], "master", ["출연연"]))?.score === 25 + 5 + 15);
  ok("모집 분야 · 지원 자격 칸에서도 찾는다", M.scorePosting(post({ title: "연구원 채용", posting_fields: { 모집분야: "고체 전해질 개발", 근무지: "XRD시" } }), me(["전해질"]))?.score === 25 + 5 + 10);
  ok("근무지 칸은 보지 않는다", M.scorePosting(post({ title: "연구원 채용", posting_fields: { 근무지: "전해질시" } }), me(["전해질"])) === null);
  ok("점수는 100을 넘지 않는다", (M.scorePosting(post({ title: "a b c d e", degree_min: "master", category: "출연연" }), me(["a1", "b", "c", "d", "e"].map((x) => `${x}x`).concat(["a b", "b c", "c d", "d e"]), "phd", ["출연연"]))?.score ?? 0) <= 100);

  console.log("2차 요건 풀이(근거 거르기)");
  const kept = A.keepKnownEvidence({ summary: "s", requirements: [{ text: "SCI", status: "met", evidence: ["R11", "R99", " R12 "], note: "n" }] }, ["11", "12"]);
  ok("넘기지 않은 이력 번호는 버린다", kept.requirements[0].evidence.join("|") === "R11|R12");
  ok("이력 한 줄에 번호를 붙인다", A.itemLine({ id: "7", kind: "method", data: { name: "XRD", level: "operate" } }).startsWith("R7 [장비·기법] name=XRD"));

  console.log("메일 문면");
  const ko = renderMailWith("assistant_digest", "ko", { research: "1", n: "3" });
  const en = renderMailWith("assistant_digest", "en", { research: "1", n: "3" });
  ok("한국어: 몇 건인지만 · 끄는 곳 안내", !!ko && ko.subject === "내 연구 이력과 맞는 새 공고 3건" && ko.text.includes("/mat/research/matches") && ko.text.includes("메일 받기를 끄시면"));
  ok("영어 문면", !!en && en.subject.startsWith("3 new posting(s)"));
  ok("주간 정리 메일은 그대로", renderMailWith("assistant_digest", "ko", { n: "2" })?.subject.includes("알림이 왔습니다") === true);

  /* ── DB ─────────────────────────────────────────────── */
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    console.log("\n(로컬 DB 가 아니라 DB 점검은 건너뜀)");
  } else {
    console.log("DB(예시 계정 · 예시 공고)");
    const { query, queryOne } = await import("../src/lib/db");
    const { execFileSync } = await import("node:child_process");
    execFileSync("psql", [url, "-q", "-v", "ON_ERROR_STOP=1", "-f", "db/schema_research_profile.sql"], { stdio: "pipe" });
    const tag = `zzrp${Date.now().toString(36)}`;
    const mk = async (n: string) => (await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, is_demo, must_reset_pw)
       VALUES ($1, $1, '예시', 'x', 'active', 'ko', TRUE, FALSE) RETURNING id::text`, [`${tag}${n}@example.test`]))!.id;
    const u1 = await mk("a"), u2 = await mk("b");
    const posts: string[] = [];
    const addPost = async (ref: string, o: { title: string; degree_min?: string; category?: string; kind?: string; closes?: string }) => {
      const r = await queryOne<{ id: string }>(
        `INSERT INTO v3_job_postings (source, source_ref, source_url, mapping_grade, title, category, degree_min, posting_kind, closes_on)
         VALUES ('jobindustry', $1, 'https://www.jobindustry.co.kr/487/?bmode=view&idx=1', '약함', $2, $3, $4, $5, $6) RETURNING id::text`,
        [`${tag}-${ref}`, o.title, o.category ?? "기업 R&D", o.degree_min ?? null, o.kind ?? "job", o.closes ?? null]);
      posts.push(r!.id); return r!.id;
    };
    try {
      const p1 = await addPost("1", { title: `${tag} 고체 전해질 연구원(석사 이상)`, degree_min: "master" });
      await addPost("2", { title: `${tag} 고체 전해질 박사급 책임연구원`, degree_min: "phd" });
      await addPost("3", { title: `${tag} 고체 전해질 연구비 공모`, kind: "funding" });
      await addPost("4", { title: `${tag} 고체 전해질 지난 공고`, closes: "2020-01-01" });
      const term = `${tag}전해질`;
      await query(`UPDATE v3_job_postings SET title = replace(title, '고체 전해질', $2) WHERE source_ref LIKE $1`, [`${tag}-%`, `고체 ${term}`]);
      const i1 = await P.saveItem(u1, { kind: "paper", data: { title: "예시 논문", keywords: [term] } });
      await P.saveItem(u1, { kind: "degree", data: { level: "master", status: "done", major: "화학공학", keywords: [] } });
      const r1 = await M.refreshMatches(u1);
      const rows = await M.matchesOf(u1);
      ok("저장 뒤 맞춤: 석사 요구 공고만(박사 요구 · 연구비 · 지난 공고 빼고)", r1.matched === 1 && rows.length === 1 && rows[0].posting_id === p1, JSON.stringify(rows.map((r) => r.title)));
      ok("처음 맞춤은 알림 · 메일 없이 바로 채운다", !!(await queryOne(`SELECT 1 FROM research_matches WHERE user_id = $1 AND notified_at IS NOT NULL AND mailed_at IS NOT NULL`, [u1])));
      ok("맞은 낱말과 그 이력 번호를 남긴다", rows[0].reasons.terms[0]?.items.includes(i1!) === true && rows[0].reasons.degree === "fit");

      const since = new Date(Date.now() - 1000);
      const p5 = await addPost("5", { title: `${tag} 고체 ${term} 신규 연구원`, degree_min: "master" });
      const r2 = await M.matchNewPostings(since);
      const nudge = await queryOne<{ title: string; href: string }>(`SELECT title, href FROM assistant_nudges WHERE user_id = $1 AND kind = 'match' AND dedupe_key LIKE 'research:%'`, [u1]);
      ok("새 공고 → 맞는 사람에게 MAT 알림 한 줄(공고 이름 없이)", r2.fresh >= 1 && nudge?.title === "내 연구 이력과 맞는 새 공고 1건" && nudge.href === "/mat/research/matches", JSON.stringify({ r2, nudge }));
      ok("이력이 없는 사람에게는 알림이 없다", !(await queryOne(`SELECT 1 FROM assistant_nudges WHERE user_id = $1`, [u2])));
      const again = await M.matchNewPostings(since);
      ok("같은 공고로 알림을 두 번 쌓지 않는다", again.nudged === 0 && (await query(`SELECT 1 FROM assistant_nudges WHERE user_id = $1`, [u1])).length === 1);

      await P.savePrefs(u1, { screen: false, email_daily: true, categories: [], min_score: 40 });
      await addPost("6", { title: `${tag} 고체 ${term} 또 다른 연구원`, degree_min: "master" });
      await M.matchNewPostings(new Date(Date.now() - 1000));
      ok("화면 알림을 끄면 쌓지 않는다", (await query(`SELECT 1 FROM assistant_nudges WHERE user_id = $1`, [u1])).length === 1);

      const env = { h: process.env.MAIL_HOST, f: process.env.MAIL_FROM };
      delete process.env.MAIL_HOST; delete process.env.MAIL_FROM;
      const nine = new Date(Date.UTC(2026, 10, 6, 0, 30));
      const off = await M.researchDailyMail(nine);
      ok("운영 메일 설정이 없으면 메일을 쌓지 않는다(화면 알림만)", off.skipped === "mail" && !(await queryOne(`SELECT 1 FROM outbox WHERE user_id = $1`, [u1])));
      process.env.MAIL_HOST = "smtp.example.test"; process.env.MAIL_FROM = "noreply@example.test";
      ok("8시 전에는 보내지 않는다", (await M.researchDailyMail(new Date(Date.UTC(2026, 10, 5, 22, 0)))).skipped === "hour");
      const on = await M.researchDailyMail(nine);
      const mail = await query<{ payload: Record<string, string>; dedupe_key: string }>(`SELECT payload, dedupe_key FROM outbox WHERE user_id = $1`, [u1]);
      ok("하루 한 통: 새 맞춤 수만 담는다", on.mailed >= 1 && mail.length === 1 && mail[0].payload.research === "1" && mail[0].payload.n === "2", JSON.stringify(mail));
      ok("같은 날 다시 불러도 한 통", (await M.researchDailyMail(new Date(nine.getTime() + 3600_000))).mailed === 0
        && (await query(`SELECT 1 FROM outbox WHERE user_id = $1`, [u1])).length === 1);
      await P.savePrefs(u1, { screen: true, email_daily: false, categories: [], min_score: 40 });
      await addPost("7", { title: `${tag} 고체 ${term} 세 번째 연구원`, degree_min: "master" });
      await M.matchNewPostings(new Date(Date.now() - 1000));
      ok("메일을 끄면 다음 날에도 쌓지 않는다", (await M.researchDailyMail(new Date(nine.getTime() + 86_400_000))).mailed === 0);
      if (env.h) process.env.MAIL_HOST = env.h; else delete process.env.MAIL_HOST;
      if (env.f) process.env.MAIL_FROM = env.f; else delete process.env.MAIL_FROM;

      console.log("본인만");
      ok("남의 이력은 읽지 못한다", (await P.itemsOf(u2)).length === 0 && (await P.itemOf(u2, i1!)) === null);
      const hijack = await P.saveItem(u2, { id: i1!, kind: "paper", data: { title: "가로채기", keywords: [] } });
      ok("남의 줄 번호로 고치지 못한다", hijack === null && ((await P.itemOf(u1, i1!))?.data as { title?: string } | undefined)?.title === "예시 논문");
      await P.deleteItem(u2, i1!);
      ok("남의 줄을 지우지 못한다", (await P.itemOf(u1, i1!)) !== null);
      ok("남의 맞춤은 보이지 않는다", (await M.matchesOf(u2)).length === 0 && (await M.matchOf(u2, p5)) === null);
      await P.deleteItem(u1, i1!);
      await M.refreshMatches(u1);
      ok("낱말을 준 이력을 지우면 맞춤도 사라진다", (await M.matchesOf(u1)).length === 0);
    } finally {
      await query(`DELETE FROM outbox WHERE user_id = ANY($1::bigint[])`, [[u1, u2]]).catch(() => undefined);
      await query(`DELETE FROM assistant_nudges WHERE user_id = ANY($1::bigint[])`, [[u1, u2]]).catch(() => undefined);
      await query(`DELETE FROM users WHERE id = ANY($1::bigint[])`, [[u1, u2]]).catch(() => undefined);
      await query(`DELETE FROM v3_job_postings WHERE id = ANY($1::bigint[])`, [posts]).catch(() => undefined);
    }
    ok("예시 계정 · 공고 · 이력 · 맞춤을 모두 지웠다", !(await queryOne(`SELECT 1 FROM research_items WHERE user_id = ANY($1::bigint[]) UNION ALL SELECT 1 FROM research_matches WHERE user_id = ANY($1::bigint[])`, [[u1, u2]])));
  }
  console.log(`\n통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
