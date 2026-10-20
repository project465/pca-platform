/**
 * KUS 학생 흐름을 **실제 Next 서버**에서 실제 브라우저로 끝까지 누른다.
 *
 * 하네스(scripts/kus/lab)와 다른 점: 라우팅 · 미들웨어 · Auth.js 로그인 쿠키 · 서버 액션 ·
 * 클라이언트 번들 · 공통 검사 화면(`/v3/...`)이 전부 진짜다. 이 세션은 npm 이 막혀 이것을
 * 직접 못 돌리고, `.github/workflows/kus-verify.yml` 이 GitHub 러너에서 돌린다.
 *
 * 차례: 로그인 전 차단 → 학교 로그인 → KUS 홈(검사 전) → 검사 시작(학교 진입 → 공통 시작)
 * → 몇 화면 답하고 나가기 → KUS 홈이 `진행 중` · 이어하기 → 끝까지 답하고 제출 →
 * KUS 홈 · 결과 · 계획 → 탐방 기록 저장(서버 액션) → 리포트 웹 · PDF 내려받기 → 다른 학생 ·
 * 다른 학교 · 담당자 권한.
 *
 *   BASE=http://127.0.0.1:3100 KUS_PW=... KUS_ADMIN_PW=... npx tsx scripts/kus/e2e-next.ts
 */
import { chromium, type Page } from "playwright";
import { walk } from "../_v3-walk";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const PW = process.env.KUS_PW ?? "";
const APW = process.env.KUS_ADMIN_PW ?? "";
let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  console.log(`  ${c ? "PASS" : "FAIL"}  ${w}${saw ? " — " + saw : ""}`);
  if (c) pass += 1; else bad.push(w);
};
const body = async (p: Page) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
const path = (p: Page) => p.url().replace(BASE, "");

async function login(p: Page, id: string, pw: string, next = "/kus") {
  await p.goto(`${BASE}/campus/kus/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"]', id);
  await p.fill('input[name="password"]', pw);
  await Promise.all([
    p.waitForURL((u) => !new URL(u).pathname.startsWith("/campus/kus/login"), { timeout: 30000 }).catch(() => undefined),
    p.click('form button[type="submit"]'),
  ]);
  await p.waitForLoadState("networkidle").catch(() => undefined);
}

async function main() {
  const browser = await chromium.launch();
  const fresh = async () => (await browser.newContext({ acceptDownloads: true, locale: "ko-KR" })).newPage();

  console.log("── 1. 로그인");
  {
    const p = await fresh();
    await p.goto(`${BASE}/kus`, { waitUntil: "domcontentloaded" });
    ok("로그인 전 /kus 는 학교 로그인으로 간다", path(p).startsWith("/campus/kus/login"), path(p));
    await login(p, "qa-kus-qa2026001", "wrong-pw");
    ok("틀린 비밀번호로는 들어가지 못한다", path(p).startsWith("/campus/kus/login"), path(p));
    await p.context().close();
  }

  console.log("\n── 2. 검사: 시작 · 중간에 나가기 · 이어하기 · 제출");
  const p = await fresh();
  await login(p, "qa-kus-qa2026001", PW);
  ok("학교 로그인 뒤 KUS 홈에 선다", path(p) === "/kus", path(p));
  ok("KUS 홈이 검사 전 상태를 적는다", (await body(p)).includes("시작 전"));
  await p.click('a:has-text("검사 시작하기")');
  await p.waitForURL(/\/campus\/kus\/start/, { timeout: 30000 }).catch(() => undefined);
  ok("검사 시작은 공통 학교 진입으로 간다", path(p).startsWith("/campus/kus/start"), path(p));
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForURL(/\/v3\/start/, { timeout: 30000 }).catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  const common = await body(p);
  ok("공통 시작 화면에 등급 선택이 없다", !/BASIC|STANDARD|등급을 고르/.test(common));
  await p.getByText("학부", { exact: true }).click().catch(() => undefined);
  await p.getByRole("button", { name: "검사 시작" }).click();
  await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
  ok("응시가 열린다", Boolean(att), path(p));
  const half = await walk(p, 6);
  ok("몇 화면 답한다", half.screens >= 3, `화면 ${half.screens}`);
  await p.goto(`${BASE}/kus`, { waitUntil: "networkidle" });
  const mid = await body(p);
  ok("KUS 홈이 진행 중 · 이어하기를 적는다", mid.includes("검사를 푸는 중") && mid.includes("이어서 답하기"));
  await p.click('a:has-text("이어서 답하기")');
  await p.waitForURL(new RegExp(`/v3/${att}`), { timeout: 30000 }).catch(() => undefined);
  ok("이어하기는 같은 응시로 간다", p.url().includes(`/v3/${att}`), path(p));
  const rest = await walk(p, 220);
  ok("끝까지 답하고 제출한다", rest.done, `화면 ${rest.screens}`);
  await p.goto(`${BASE}/kus`, { waitUntil: "networkidle" });
  const after = await body(p);
  ok("제출 뒤 KUS 홈이 결과를 적는다", after.includes("제출 완료") && after.includes("나의 분석 결과 보기"));

  console.log("\n── 3. 결과 · 계획");
  await p.goto(`${BASE}/kus/result`, { waitUntil: "networkidle" });
  const res = await body(p);
  ok("개인별 결과가 일곱 묶음을 든다(R2 차례)", ["이 결과가 기대고 있는 것", "영역마다 지금 상태", "근거 사슬", "준비가 필요한 영역", "관심 산업·직무", "직무 요구사항과의 연결", "탐방 경험과 직무 연결"].every((x) => res.includes(x)));
  await p.goto(`${BASE}/kus/plan`, { waitUntil: "networkidle" });
  ok("30·60·90일 계획이 선다", (await body(p)).includes("30일"));

  console.log("\n── 4. 기업탐방 기록(서버 액션)");
  await p.goto(`${BASE}/kus/visits/new`, { waitUntil: "networkidle" });
  await p.locator('input[name="role_codes"]').first().check();
  await p.fill("#understood", "[테스트] 고객 문의 분류 흐름");
  await p.check('input[value="QNA"]'); await p.check('input[value="TASK"]');
  await p.fill('input[name="activity_text"]', "[테스트] 분류 기준표 작성");
  await p.fill("#learned", "[테스트] 분류 기준이 응답 시간을 정한다");
  await p.locator('input[name="td_codes"]').first().check();
  await Promise.all([p.waitForURL(/\/kus\/visits\/\d+/, { timeout: 30000 }).catch(() => undefined), p.click('form.kus-form button[type="submit"]')]);
  const vurl = p.url().split("?")[0];
  ok("탐방 기록이 저장되고 그 쪽으로 간다", /\/kus\/visits\/\d+$/.test(vurl), path(p));
  ok("초안이 선다", (await body(p)).includes("자기소개서 문단"));

  console.log("\n── 5. 리포트");
  const web = await p.request.get(`${BASE}/kus/report/${att}`);
  ok("리포트 웹이 열린다", web.status() === 200 && (await web.text()).includes("30·60·90일 실행 계획"));
  await p.goto(`${BASE}/kus/report`, { waitUntil: "networkidle" });
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 120000 }), p.click('a:has-text("PDF") >> nth=0')]);
  const file = await dl.path();
  const { statSync } = await import("node:fs");
  ok("PDF 를 내려받는다", Boolean(file) && statSync(file as string).size > 20000, `${file ? statSync(file).size : 0}바이트`);
  await p.context().close();

  console.log("\n── 6. 격리 · 권한");
  const other = await fresh();
  await login(other, "qa-kus-qa26002", PW);
  const r1 = await other.request.get(`${BASE}/kus/report/${att}`);
  const r2 = await other.request.get(`${BASE}/kus/report/${att}/pdf`);
  const r3 = await other.goto(vurl);
  ok("다른 KUS 학생은 리포트 · PDF · 탐방 기록을 열 수 없다", r1.status() === 404 && r2.status() === 404 && r3?.status() === 404, `${r1.status()} ${r2.status()} ${r3?.status()}`);
  await other.goto(`${BASE}/kus/admin`);
  ok("KUS 학생은 담당자 화면에 못 들어간다", path(other).startsWith("/kus/denied"), path(other));
  await other.context().close();
  for (const [id, who] of [["qa-pcu-qap1", "배재 학생"], ["qa-sj-seeker", "진흥원 대역"]] as const) {
    const o = await fresh();
    await login(o, id, PW);
    await o.goto(`${BASE}/kus`, { waitUntil: "domcontentloaded" });
    ok(`${who}는 KUS 홈에 못 들어간다`, path(o).startsWith("/campus/kus/login"), path(o));
    const rr = await o.request.get(`${BASE}/kus/report/${att}`);
    ok(`${who}는 KUS 리포트를 못 연다`, rr.status() === 404, String(rr.status()));
    await o.context().close();
  }
  const ad = await fresh();
  await login(ad, "qa-kus-admin", APW, "/kus/admin");
  await ad.goto(`${BASE}/kus/admin`, { waitUntil: "networkidle" });
  const at = await body(ad);
  ok("KUS 담당자는 집계 화면을 연다", path(ad) === "/kus/admin" && at.includes("프로그램 현황"), path(ad));
  ok("담당자 화면에 개인 결과 문장이 없다", !at.includes("고객 문의 분류 흐름"));
  const ar = await ad.request.get(`${BASE}/kus/report/${att}`);
  ok("KUS 담당자도 학생 리포트를 못 연다", ar.status() === 404, String(ar.status()));

  await browser.close();
  console.log(`\n  PASS ${pass} · FAIL ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
