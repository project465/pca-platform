/**
 * 잡인더스트리 공고 가져오기와 떠 있는 단추(2026-10-31).
 *
 *   JOBINDUSTRY_TEST_HOSTS=127.0.0.1:3988 bash scripts/stage-serve.sh 3151
 *   UI_BASE=http://127.0.0.1:3151 npm run partner:job
 *
 * 잡인더스트리 화면은 이 자리에서 열 수 없어서, 가짜 잡인더스트리(127.0.0.1:3988)를
 * 띄워 그 공고를 가져온다. 재는 것: 허용된 주소만 받는가 · 넘겨받는 주소로 밖에
 * 나가지 않는가 · 단추 한 줄이 서는가 · 로그인 전에는 기억만 하는가 · 누르면 공고가
 * 서고 요구 항목이 읽히는가 · 기억한 주소를 지우는가.
 */
import { loadEnv, BASE, login, makeStudent, cloneFinished } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { createServer } from "node:http";
import { chromium } from "playwright";
import { queryOne } from "../src/lib/db";
import { fetchJobPage, htmlToText, safeJobUrl } from "../src/lib/partner-job";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};
const FAKE = "127.0.0.1:3988";

const POSTING = `<!doctype html><html><head><title>[한국재료연구원] 이차전지 소재 박사후연구원 채용 | 잡인더스트리</title>
<script>var tracker = "<li>이건 읽히면 안 된다</li>";</script><style>.x{color:red}</style></head>
<body><header><nav><a href="/">홈</a><a href="/jobs">채용</a></nav></header>
<main><h1>이차전지 소재 박사후연구원</h1>
<h2>자격 요건</h2><ul><li>재료공학 또는 화학공학 박사 학위 소지자</li><li>양극재 합성 및 코팅 공정 연구 경험</li>
<li>XRD &amp; SEM 분석 가능자</li></ul>
<h2>우대 사항</h2><ul><li>실험계획법(DOE) 활용 경험</li><li>SCI 논문 주저자 2편 이상</li></ul>
<p>접수 마감: 2026-12-15</p></main>
<footer>잡인더스트리 · 사업자 정보</footer>
<script src="http://${"127.0.0.1:3151"}/embed/jobindustry.js" defer></script></body></html>`;

async function main(): Promise<void> {
  /* 1 — 받는 주소 */
  ok("잡인더스트리 https 주소는 받는다", safeJobUrl("https://www.jobindustry.co.kr/job/view?id=12#top") === "https://www.jobindustry.co.kr/job/view?id=12");
  ok("잡인더스트리라도 http 는 받지 않는다", safeJobUrl("http://www.jobindustry.co.kr/job/1") === null);
  ok("이름만 비슷한 주소는 받지 않는다", safeJobUrl("https://jobindustry.co.kr.evil.example/x") === null
    && safeJobUrl("https://evil.example/?u=jobindustry.co.kr") === null);
  ok("계정이 붙은 주소는 받지 않는다", safeJobUrl("https://a:b@www.jobindustry.co.kr/") === null);
  ok("안쪽 주소는 받지 않는다", safeJobUrl("http://169.254.169.254/latest/meta-data") === null
    && safeJobUrl("http://localhost:3151/") === null);

  /* 2 — 읽는 법 */
  const t = htmlToText(POSTING);
  ok("제목을 읽는다", t.title.startsWith("[한국재료연구원] 이차전지"), t.title);
  ok("스크립트 · 메뉴 · 꼬리말은 걷는다", !t.text.includes("이건 읽히면") && !t.text.includes("사업자 정보") && !t.text.includes("color:red"));
  ok("목록은 줄마다 남고 &amp; 를 푼다", t.text.includes("- XRD & SEM 분석 가능자") && t.text.includes("- 양극재 합성"));

  /* 가짜 잡인더스트리 */
  const srv = createServer((req, res) => {
    if (req.url === "/job/1") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(POSTING); return; }
    if (req.url === "/away") { res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data" }); res.end(); return; }
    if (req.url === "/hop") { res.writeHead(302, { location: "/job/1" }); res.end(); return; }
    res.writeHead(404); res.end();
  });
  await new Promise<void>((r) => srv.listen(3988, "127.0.0.1", () => r()));

  /* 서버가 여는 쪽: 같은 호스트 안의 넘김은 따라가고, 밖으로 넘기면 멈춘다 */
  process.env.JOBINDUSTRY_TEST_HOSTS = FAKE;
  const hop = await fetchJobPage(`http://${FAKE}/hop`);
  ok("같은 잡인더스트리 안의 넘김은 따라간다", hop.ok && hop.title.includes("박사후연구원"));
  const away = await fetchJobPage(`http://${FAKE}/away`);
  ok("밖(안쪽 메타데이터 주소)으로 넘기면 열지 않는다", !away.ok && away.why === "url", JSON.stringify(away));

  const s = await makeStudent("zz-ji-job");
  await cloneFinished(s.id, "BASIC");
  const br = await chromium.launch();
  try {
    /* 3 — 로그인 전: 기억만 하고 소개 쪽으로 */
    const c0 = await br.newContext({ viewport: { width: 390, height: 844 } });
    const p0 = await c0.newPage();
    await p0.goto(`http://${FAKE}/job/1`, { waitUntil: "load" });
    const fab = p0.locator("#cm-mat-fab");
    await fab.waitFor({ timeout: 8000 }).catch(() => undefined);
    ok("잡인더스트리 화면에 떠 있는 단추가 선다", await fab.count() === 1 && (await fab.innerText()).includes("AI 취업 도우미"));
    const box = await fab.boundingBox();
    ok("단추는 누르기 넉넉하고 한 줄이다(44~60px)", (box?.height ?? 0) >= 44 && (box?.height ?? 0) <= 60, String(box?.height));
    await fab.click();
    await p0.waitForURL(/\/partner\/jobindustry/, { timeout: 15000 }).catch(() => undefined);
    ok("로그인 전에는 소개 쪽이 열린다", p0.url().endsWith("/partner/jobindustry"), p0.url());
    const t0 = await p0.locator("body").innerText();
    ok("보던 공고를 기억해 두었다고 적는다", t0.includes("보시던 공고를 기억해 두었습니다"));
    const ck = (await c0.cookies()).find((c) => c.name === "cm_job");
    ok("기억은 쿠키 하나(브라우저 스크립트가 못 읽는다)", Boolean(ck?.httpOnly) && (ck?.value ?? "").includes("job%2F1") || (ck?.value ?? "").includes("/job/1"), ck?.value);
    await c0.close();

    /* 4 — 허용되지 않은 주소는 기억하지 않는다 */
    const r = await fetch(`${BASE}/from/jobindustry?job=${encodeURIComponent("https://evil.example/job")}`, { redirect: "manual" });
    ok("남의 주소는 기억하지 않는다", r.status === 302 && !/cm_job=/.test(r.headers.get("set-cookie") ?? ""));

    /* 5 — 로그인한 뒤: 누르면 공고가 선다 */
    const c1 = await br.newContext({ viewport: { width: 390, height: 844 } });
    const p1 = await login(c1, "zz-ji-job", s.pw);
    await p1.goto(`${BASE}/from/jobindustry?job=${encodeURIComponent(`http://${FAKE}/job/1`)}`, { waitUntil: "networkidle" });
    ok("로그인했으면 바로 비교하기 쪽으로 간다", p1.url().endsWith("/me/track/import"), p1.url());
    const t1 = await p1.locator("body").innerText();
    ok("어느 공고인지 적는다", t1.includes(`${FAKE}/job/1`) && t1.includes("무료로 비교할 수 있는 공고 1건"));
    await p1.locator("button", { hasText: "이 공고와 비교하기" }).click();
    await p1.waitForURL(/\/me\/track\/posting\/\d+/, { timeout: 30000 }).catch(() => undefined);
    ok("누르면 공고 쪽이 선다", /\/me\/track\/posting\/\d+/.test(p1.url()), p1.url());
    const row = await queryOne<{ label: string }>(
      `SELECT label FROM assistant_postings WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [s.id]).catch(() => null);
    ok("공고 이름은 그 화면 제목이다", (row?.label ?? "").includes("이차전지 소재 박사후연구원"), row?.label);
    const t2 = await p1.locator("body").innerText();
    ok("요구 항목을 읽었다", t2.includes("양극재") && t2.includes("XRD"));
    ok("기억한 주소를 지웠다", !(await c1.cookies()).some((c) => c.name === "cm_job"));
    const sx = await p1.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("휴대폰 폭에서 가로 스크롤이 없다", sx <= 0, String(sx));

    await c1.close();
  } finally {
    await br.close();
    srv.close();
  }
  console.log(`\n잡인더스트리 공고 가져오기 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main();
