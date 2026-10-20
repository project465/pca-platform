// harness-only 브라우저 검사. 실제 Chromium 으로 KUS 하네스 서버(server.mjs)를 누른다.
//
// 재는 것: 학교 로그인(틀린 비밀번호 · 맞는 비밀번호) · 홈(검사 전 · 진행 중 · RICH · POOR ·
// CONTRA) · 결과 · 탐방 기록을 폼으로 저장 · 초안 · 보고서 PDF 내려받기 · 학생 사이 격리 ·
// 기관 사이 격리 · 담당자 권한 · PC(1440) · 손전화(390).
// **찍는 서버는 Next 가 아니다**(harness render). 그림 파일 이름에 `harness` 를 붙인다.
//
//   BASE=http://127.0.0.1:3301 OUT=docs/kus/r1/shots PW=... APW=... node scripts/kus/lab/shots.mjs
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3301";
const OUT = process.env.OUT ?? "docs/kus/r1/shots";
const PW = process.env.PW ?? ""; const APW = process.env.APW ?? "";
mkdirSync(OUT, { recursive: true });
let pass = 0; const bad = []; const log = [];
const ok = (w, c, saw = "") => { const l = `  ${c ? "PASS" : "FAIL"}  ${w}${saw ? " — " + saw : ""}`; console.log(l); log.push(l); if (c) pass++; else bad.push(w); };
const say = (s) => { console.log(s); log.push(s); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const VIEW = { pc: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

async function as(login, pw, view = "pc") {
  const ctx = await browser.newContext({ viewport: VIEW[view], deviceScaleFactor: view === "mobile" ? 2 : 1, acceptDownloads: true, locale: "ko-KR" });
  const page = await ctx.newPage();
  if (login) {
    await page.goto(`${BASE}/campus/kus/login?next=%2Fkus`);
    await page.fill("#identifier", login); await page.fill("#password", pw);
    await Promise.all([page.waitForLoadState("load"), page.click("button[type=submit]")]);
  }
  return { ctx, page };
}
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}/${name}.harness.jpg`, fullPage: true, type: "jpeg", quality: 82 }); };
const text = (page) => page.locator("body").innerText();

say("── 1. 학교 로그인");
{
  const { ctx, page } = await as(null, null);
  await page.goto(`${BASE}/kus`);
  ok("로그인하지 않으면 KUS 홈이 학교 로그인으로 보낸다", page.url().includes("/campus/kus/login"), page.url().replace(BASE, ""));
  await shot(page, "01-login-pc");
  await page.fill("#identifier", "qa-kus-qa26001"); await page.fill("#password", "wrong-password");
  await Promise.all([page.waitForLoadState("load"), page.click("button[type=submit]")]);
  ok("틀린 비밀번호는 들어가지 못한다", page.url().includes("/campus/kus/login") && (await text(page)).includes("맞지 않습니다"));
  await ctx.close();
  const m = await as(null, null, "mobile"); await m.page.goto(`${BASE}/campus/kus/login?next=%2Fkus`); await shot(m.page, "01-login-mobile"); await m.ctx.close();
}

say("\n── 2. 홈 · 상태별");
const people = [
  ["qa-kus-qa2026001", "START", "검사 전"], ["qa-kus-qa26004", "MID", "진행 중"],
  ["qa-kus-qa26001", "RICH", ""], ["qa-kus-qa26002", "POOR", ""], ["qa-kus-qa26003", "CONTRA", ""],
];
const homes = {};
for (const [login, tag, want] of people) {
  for (const view of ["pc", "mobile"]) {
    const { ctx, page } = await as(login, PW, view);
    ok(`${tag}(${view}) 로그인하면 KUS 홈에 선다`, page.url().endsWith("/kus"), page.url().replace(BASE, ""));
    const t = await text(page);
    if (view === "pc") homes[tag] = t;
    if (want) ok(`${tag} 홈이 상태를 적는다(${want})`, t.includes(want) || t.includes(tag === "START" ? "시작 전" : "이어서"));
    ok(`${tag}(${view}) 가로로 넘치지 않는다`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await shot(page, `02-home-${tag}-${view}`);
    await ctx.close();
  }
}
ok("RICH · POOR · CONTRA 홈의 글이 서로 다르다", new Set([homes.RICH, homes.POOR, homes.CONTRA]).size === 3);

say("\n── 3. 결과 · 계획 · 보고서 화면");
for (const [login, tag] of people.slice(2)) {
  for (const view of ["pc", "mobile"]) {
    const { ctx, page } = await as(login, PW, view);
    for (const [path, nm] of [["/kus/result", "result"], ["/kus/plan", "plan"]]) {
      await page.goto(`${BASE}${path}`);
      const t = await text(page);
      if (nm === "result" && tag === "CONTRA") ok(`CONTRA(${view}) 결과 머리가 근거 확인 전이고 공통 상태 이름을 함께 적는다`, t.includes("근거 확인 전") && t.includes("공통 결과지의 상태 이름") && t.includes("응답만으로 선 결과"));
      if (nm === "result" && tag === "RICH") ok(`RICH(${view}) 결과가 근거가 받치는 결과로 읽힌다`, t.includes("응답과 근거 항목이 함께 받치는 결과"));
      if (nm === "result") ok(`${tag}(${view}) 결과가 일곱 묶음을 든다(R2 차례)`, ["이 결과가 기대고 있는 것", "영역마다 지금 상태", "근거 사슬", "준비가 필요한 영역", "관심 산업·직무", "직무 요구사항과의 연결", "탐방 경험과 직무 연결"].every((x) => t.includes(x)));
      await shot(page, `03-${nm}-${tag}-${view}`);
    }
    await ctx.close();
  }
}

say("\n── 4. 기업탐방 기록을 브라우저로 저장");
{
  const { ctx, page } = await as("qa-kus-qa2026001", PW);
  await page.goto(`${BASE}/kus/visits/new`);
  await shot(page, "04-visit-new-pc");
  await Promise.all([page.waitForLoadState("load"), page.click("form.kus-form button[type=submit]")]);
  ok("빈 폼은 저장되지 않고 까닭을 적는다", page.url().includes("/kus/visits/new?e="), decodeURIComponent(page.url().split("e=")[1] ?? ""));
  await page.check('input[name=role_codes] >> nth=0');
  await page.fill("#understood", "[테스트] 고객 문의를 분류해 담당 부서로 넘기는 흐름");
  await page.check('input[value=QNA]'); await page.check('input[value=HANDS_ON]');
  await page.fill('input[name=activity_text]', "[테스트] 문의 분류 기준표를 직접 써 봤다");
  await page.fill("#learned", "[테스트] 분류 기준이 응답 시간을 정한다는 것");
  await page.check('input[name=td_codes][value=TD09]');
  await page.fill("#visited_on", "2026-11-12");
  await Promise.all([page.waitForLoadState("load"), page.click("form.kus-form button[type=submit]")]);
  const t = await text(page);
  ok("저장하면 그 기록의 쪽으로 간다", /\/kus\/visits\/\d+\?saved=1/.test(page.url()), page.url().replace(BASE, ""));
  ok("저장한 기록이 다시 읽힌다(직접 해 봄 · 초안)", t.includes("문의 분류 기준표") && t.includes("자기소개서 문단") && t.includes("경험으로 옮기기"));
  await shot(page, "04-visit-detail-pc");
  homes.visitUrl = page.url().split("?")[0];
  const m = await browser.newContext({ viewport: VIEW.mobile, deviceScaleFactor: 2 });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/campus/kus/login?next=%2Fkus`); await mp.fill("#identifier", "qa-kus-qa2026001"); await mp.fill("#password", PW);
  await Promise.all([mp.waitForLoadState("load"), mp.click("button[type=submit]")]);
  await mp.goto(homes.visitUrl); await shot(mp, "04-visit-detail-mobile");
  await mp.goto(`${BASE}/kus/visits/new`); await shot(mp, "04-visit-new-mobile");
  await m.close();
  await ctx.close();
}

say("\n── 5. 보고서 PDF 내려받기");
for (const [login, tag] of people.slice(2)) {
  const { ctx, page } = await as(login, PW);
  await page.goto(`${BASE}/kus/report`);
  await shot(page, `05-report-${tag}-pc`);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("a:has-text('PDF') >> nth=0")]);
  const f = `${OUT}/kus-report-${tag}.download.pdf`;
  await dl.saveAs(f);
  ok(`${tag} 보고서 PDF 를 브라우저로 내려받는다`, statSync(f).size > 20000, `${statSync(f).size}바이트 · ${dl.suggestedFilename()}`);
  homes[`report_${tag}`] = page.url();
  await ctx.close();
}

say("\n── 6. 학생 사이 · 기관 사이 격리");
{
  const { ctx, page } = await as("qa-kus-qa26002", PW);
  const r1 = await page.goto(homes.visitUrl);
  ok("POOR 는 다른 학생의 탐방 기록 주소를 열 수 없다(404)", r1.status() === 404, String(r1.status()));
  await ctx.close();
}
{
  /* RICH 의 응시 번호로 POOR 가 리포트를 연다 */
  const rich = await as("qa-kus-qa26001", PW);
  await rich.page.goto(`${BASE}/kus/report`);
  const href = await rich.page.locator("a:has-text('웹')").first().getAttribute("href");
  await rich.ctx.close();
  const poor = await as("qa-kus-qa26002", PW);
  const r = await poor.page.request.get(`${BASE}${href}`);
  const rp = await poor.page.request.get(`${BASE}${href}/pdf`);
  ok("POOR 는 RICH 의 리포트(웹 · PDF)를 열 수 없다(404)", r.status() === 404 && rp.status() === 404, `${href} → ${r.status()} · ${rp.status()}`);
  const own = await (await as("qa-kus-qa26001", PW)).page.request.get(`${BASE}${href}`);
  ok("RICH 는 자기 리포트를 연다(200)", own.status() === 200);
  await poor.ctx.close();
  for (const [login, who] of [["qa-pcu-qap1", "배재 학생"], ["qa-sj-seeker", "진흥원 대역 사용자"]]) {
    const o = await as(login, PW);
    await o.page.goto(`${BASE}/kus`);
    ok(`${who}는 KUS 홈에 들어가지 못하고 학교 로그인으로 간다`, o.page.url().includes("/campus/kus/login"), o.page.url().replace(BASE, ""));
    const rr = await o.page.request.get(`${BASE}${href}`);
    ok(`${who}는 KUS 리포트를 열 수 없다(404)`, rr.status() === 404, String(rr.status()));
    await o.page.goto(`${BASE}/kus/admin`);
    ok(`${who}는 KUS 담당자 화면에 들어가지 못한다`, o.page.url().includes("/kus/denied"), o.page.url().replace(BASE, ""));
    await o.ctx.close();
  }
}

say("\n── 7. 담당자");
{
  const s = await as("qa-kus-qa26001", PW);
  await s.page.goto(`${BASE}/kus/admin`);
  ok("KUS 학생은 담당자 화면에 들어가지 못한다", s.page.url().includes("/kus/denied"));
  await s.ctx.close();
  for (const view of ["pc", "mobile"]) {
    const ctx = await browser.newContext({ viewport: VIEW[view], deviceScaleFactor: view === "mobile" ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/campus/kus/login?next=%2Fkus%2Fadmin`);
    await page.fill("#identifier", "qa-kus-admin"); await page.fill("#password", APW);
    await Promise.all([page.waitForLoadState("load"), page.click("button[type=submit]")]);
    await page.goto(`${BASE}/kus/admin`);
    const t = await text(page);
    ok(`KUS 담당자(${view})는 집계 화면을 연다`, page.url().endsWith("/kus/admin") && t.includes("프로그램 현황"));
    ok(`담당자 화면에 학생 개인 결과 문장이 없다(${view})`, !t.includes("[테스트] KUS RICH") && !t.includes("출시 국가"));
    await shot(page, `06-admin-${view}`);
    await ctx.close();
  }
}

writeFileSync(`${OUT}/shots.log`, log.join("\n") + `\n\nPASS ${pass} · FAIL ${bad.length}\n`);
console.log(`\n  PASS ${pass} · FAIL ${bad.length}`);
await browser.close();
process.exit(bad.length ? 1 : 0);
