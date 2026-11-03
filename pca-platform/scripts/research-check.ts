/**
 * 석·박사 자료 읽기와 내 자료로 공고 찾기(2026-10-31).
 *
 *   npm run build && bash scripts/stage-serve.sh 3150
 *   UI_BASE=http://127.0.0.1:3150 RDOCS=<pptx·docx·hwpx 가 있는 폴더> npm run mat:research
 *
 * **모델을 부르지 않는 부분을 센다.** Claude 가 논문을 읽는 품질은 열쇠가 있는
 * 배포본에서 실제 논문으로 본다. 여기서 보는 것은 그 앞뒤다: 파일에서 글을
 * 꺼내는가 · 읽은 결과가 화면에 서는가 · 공고와 겹치는 낱말을 바르게 세는가 ·
 * 기간권 없는 사람에게 세 건만 보이는가 · 학술지 지표를 IF 라고 부르지 않는가.
 */
import { loadEnv, BASE, login, makeStudent, cloneFinished } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { readFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { readOfficeText } from "../src/lib/sheet-read";
import { postingsForMe } from "../src/lib/assistant/match";
import { canUseMat } from "../src/lib/mat-access";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

async function main(): Promise<void> {
  /* 1 — 파일에서 글 꺼내기 */
  const dir = process.env.RDOCS ?? "";
  for (const [f, want, kind] of [["deck.pptx", "92.4%", "pptx"], ["cover.docx", "실험계획법", "docx"], ["report.hwpx", "이중차분법", "hwpx"]] as const) {
    const p = `${dir}/${f}`;
    if (!existsSync(p)) { ok(`${f} 견본이 있다`, false, p); continue; }
    const r = readOfficeText(readFileSync(p));
    ok(`${kind} 에서 글을 꺼낸다`, r?.kind === kind && (r?.text ?? "").includes(want), (r?.text ?? "").slice(0, 80).replace(/\n/g, " / "));
  }
  const deck = existsSync(`${dir}/deck.pptx`) ? readOfficeText(readFileSync(`${dir}/deck.pptx`)) : null;
  ok("발표자 노트도 그 슬라이드 뒤에 붙는다", (deck?.text ?? "").includes("(발표자 노트) I designed"));

  /* 2 — 읽은 결과 한 건과 공고 넷을 넣는다(모델 대신) */
  const s = await makeStudent("zz-research");
  await cloneFinished(s.id, "BASIC");
  await query(`DELETE FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [s.id]);
  await query(`DELETE FROM research_docs WHERE user_id = $1`, [s.id]);
  ok("자료 읽기 무료 한 번이 남아 있다", (await canUseMat(s.id, "research")).ok);
  await query(
    `INSERT INTO research_docs (user_id, core_code, sha256, file_kind, doc_type, lang, title, venue, year, doi, data, terms, metrics)
     VALUES ($1, 'ME_CORE_V3', 'zz-sha-1', 'pdf', 'paper', 'en',
       'Optimization of cathode coating for Li-ion batteries', 'Journal of Power Sources', 2025, NULL,
       $2::jsonb, $3::text[], $4::jsonb)`,
    [s.id, JSON.stringify({
      field: "stem", authors: ["A. Kim", "B. Lee"], summary: "양극재 코팅 두께를 실험계획법으로 최적화해 500사이클 뒤 용량 유지율 92.4%를 얻었습니다.",
      question: "코팅 두께가 수명에 주는 영향", methods: ["실험계획법(DOE)", "XRD", "SEM"],
      findings: ["500사이클 뒤 용량 유지율 92.4% (그림 4)"], contribution: ["두께-수명 관계를 정량화"],
      job_language: [{ skill: "실험계획법으로 공정 조건 최적화", evidence: "3장 · 표 2" }],
      sentences: ["[맡은 부분]에서 실험계획법으로 코팅 두께를 최적화해 용량 유지율을 92.4%까지 높였습니다."],
      interview: ["왜 3인자로 실험을 설계했나요?"], roles: ["이차전지 공정개발 연구원"], ask: ["저자 가운데 누구이신가요?"],
    }), ["이차전지", "양극재", "실험계획법", "XRD", "SEM", "battery"],
    JSON.stringify({ source: "OpenAlex", fetched_at: "2026-10-31T00:00:00Z", journal: "Journal of Power Sources",
      issn_l: "0378-7753", two_year_mean_citedness: 8.1, h_index: 300, cited_by_count: 3 })]);
  ok("한 건 읽은 뒤에는 무료 한 번이 없다", !(await canUseMat(s.id, "research")).ok);

  await query(`DELETE FROM v3_job_postings WHERE source = 'zz-test'`);
  const reqs = [
    ["이차전지 양극재 공정개발", "실험계획법 활용 경험 우대", "SEM 분석 가능자"],
    ["이차전지 셀 설계", "XRD 분석 경험"],
    ["양극재 품질 관리"],
    ["battery 시험 평가", "SEM"],
    ["회계 결산 업무", "세무 신고"],
  ];
  for (let i = 0; i < reqs.length; i++) {
    await query(
      `INSERT INTO v3_job_postings (source, source_ref, source_url, closes_on, raw_requirements, mapping_grade)
       VALUES ('zz-test', $1, 'https://example.test/p', (now() + interval '10 days')::date, $2::text[], '보통')`,
      [`r${i}`, reqs[i]]);
  }
  const m = await postingsForMe(s.id);
  const mine = m.rows.filter((r) => r.source === "zz-test");
  ok("겹치는 공고 넷이 선다(회계 공고는 빠진다)", mine.length === 4, String(mine.length));
  ok("가장 많이 겹친 공고가 맨 위다", mine[0]?.hits.length === 4, mine[0]?.hits.join(","));
  ok("겹친 낱말을 그대로 적는다", (mine[0]?.hits ?? []).includes("실험계획법"));

  /* 3 — 화면 */
  const br = await chromium.launch();
  try {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
    const p = await login(ctx, "zz-research", s.pw);
    await p.goto(`${BASE}/me/track/research`, { waitUntil: "networkidle" });
    const t1 = await p.locator("body").innerText();
    ok("자료 쪽에 읽은 자료가 선다", t1.includes("Optimization of cathode coating"));
    ok("핵심 결과와 근거 위치가 선다", t1.includes("92.4%") && t1.includes("그림 4"));
    ok("학술지 지표를 공식 IF 가 아니라고 적는다", t1.includes("공식 JCR 값은 아닙니다") && t1.includes("2년 평균 피인용 8.1"));
    ok("무료 한 번을 쓴 뒤에는 올리는 칸 대신 기간권 안내", t1.includes("무료로 읽어 볼 수 있는 자료 1건을 쓰셨습니다"));
    await p.goto(`${BASE}/me/track/jobs`, { waitUntil: "networkidle" });
    const t2 = await p.locator("body").innerText();
    ok("공고 찾기에 겹친 낱말이 선다", t2.includes("겹친 낱말 4개"));
    ok("기간권 없이는 세 건만, 나머지는 몇 건 더 있는지", t2.includes("1건 더 있습니다"), (t2.match(/\d+건 더 있습니다/) ?? [""])[0]);
    ok("추천 · 합격 가능성 말이 없다", !/추천|합격 가능성|합격률/.test(t2));
    const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("휴대폰 폭에서 가로 스크롤이 없다", sx <= 0, String(sx));
    await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
    const t3 = await p.locator("body").innerText();
    ok("MAT 첫 화면에 내 자료로 찾기가 선다", t3.includes("내 자료 읽기") && t3.includes("내 자료로 공고 찾기"));
    await ctx.close();
  } finally {
    await br.close();
    await query(`DELETE FROM v3_job_postings WHERE source = 'zz-test'`);
  }
  console.log(`\n자료 읽기 · 공고 찾기 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main();
