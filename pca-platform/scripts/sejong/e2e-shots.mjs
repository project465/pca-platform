#!/usr/bin/env node
/**
 * 세종 MVP 를 **실제 브라우저로** 처음부터 끝까지 밟고 화면을 찍는다.
 *
 *   BASE=http://127.0.0.1:3000 DATABASE_URL=... OUT=docs/sejong/shots \
 *     node scripts/sejong/e2e-shots.mjs
 *
 * 앞서 할 것: 개발 서버가 떠 있고, `db/sejong/schema_sejong_demo.sql` 과
 * `scripts/sejong/seed-demo.mjs` 로 시연 DB 가 서 있어야 한다.
 * 플레이라이트는 저장소의 것 또는 샌드박스의 것(`/opt/node-tools`)을 쓴다.
 *
 * 밟는 길: 홈 → 공개 탐색 → 구직자 로그인 → 대시보드 → 진단 시작 → 문항 절반
 * → 새로고침(이어하기 확인) → 경험 둘 → 나머지 문항 → 제출 → 결과 → 내 직무로
 * 탐색 → 실행 계획 → 결과지 미리보기 → PDF → 동의 → 상담사(열람·거절) →
 * 관리자(대시보드·참여자·발급·상담사). 단계마다 통과/걸림을 센다.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require("/opt/node-tools/node_modules/playwright"); }

const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = process.env.OUT ?? "docs/sejong/shots";
const DB = process.env.DATABASE_URL ?? "";
/* 비밀번호는 시드에 준 것과 같은 환경변수로 받는다. 저장소에 적지 않는다 */
const need = (k) => { const v = process.env[k]; if (!v) { console.error(`${k} 가 필요합니다 (seed-demo 에 준 값)`); process.exit(2); } return v; };
mkdirSync(OUT, { recursive: true });

let pass = 0;
const bad = [];
const ok = (what, cond, saw = "") => {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
};
/* 요소가 없으면 스크립트를 멈추지 않고 그 줄만 걸린다. 무엇이 떴는지 앞부분을 남긴다 */
const txt = async (page, sel, ms = 15000) => {
  try { return (await page.locator(sel).first().textContent({ timeout: ms })) ?? ""; }
  catch {
    const body = ((await page.textContent("body").catch(() => "")) ?? "").replace(/\s+/g, " ").slice(0, 240);
    console.log(`    (${sel} 없음 · ${page.url()} · ${body})`);
    return "";
  }
};
const sql = (q) => (DB ? execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim() : "");

/* Staging 처럼 사이트 전체가 Basic 인증 뒤에 있으면 그 열쇠를 같이 넘긴다(값은 환경변수로만) */
const gate = (process.env.STAGING_BASIC_AUTH ?? "").trim();
const AUTH = gate.includes(":")
  ? { httpCredentials: { username: gate.slice(0, gate.indexOf(":")), password: gate.slice(gate.indexOf(":") + 1) } }
  : {};
const browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
const shot = async (page, name, full = true) => {
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), fullPage: full, type: "jpeg", quality: 78 });
};

async function login(ctx, id, pw_) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sejong/login`);
  await page.fill("#identifier", id);
  await page.fill("#password", pw_);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/sejong/login"), { timeout: 20000 }), page.click("button[type=submit]")]);
  return page;
}

console.log(`\n세종 MVP 브라우저 시연 — ${BASE}\n`);

/* 1. 공개 쪽 */
{
  const ctx = await browser.newContext({ ...AUTH, viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const r = await page.goto(`${BASE}/sejong`);
  ok("홈 200", r?.status() === 200, String(r?.status()));
  ok("홈에 시연판 표시", await page.locator("text=시연판").first().isVisible());
  await shot(page, "01-home");
  const e = await page.goto(`${BASE}/sejong/explore`);
  ok("탐색 200 (로그인 없이)", e?.status() === 200);
  const body = await page.textContent("body");
  ok("탐색에 '채용 여부 미확인'", body.includes("채용 여부 미확인"));
  ok("탐색에 '채용 중' 표기가 없다", !/채용 중(?!으로 표시한)/.test(body.replace("채용 중으로 표시한 곳", "")));
  ok("탐색에 '추천' 이 기업 소개로 쓰이지 않는다", !/추천 기업|추천합니다/.test(body));
  await shot(page, "02-explore-public");
  const m = await browser.newContext({ ...AUTH, viewport: { width: 390, height: 844 }, isMobile: true });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/sejong`);
  const over = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok("모바일 390 가로 넘침 없음", !over);
  await shot(mp, "01m-home-mobile");
  await m.close();
  await ctx.close();
}

/* 2. 구직자 */
const seeker = await browser.newContext({ ...AUTH, viewport: { width: 1366, height: 900 } });
{
  const page = await login(seeker, "sj-demo01", need("SJ_PW_SEEKER"));
  ok("구직자 로그인 → 대시보드", page.url().endsWith("/sejong/me"), page.url());
  await shot(page, "03-me-before");

  await page.goto(`${BASE}/sejong/diagnosis`);
  await page.check("input[name=job_areas][value=JA03]");
  await page.check("input[name=job_areas][value=JA04]");
  await page.check("input[name=region_range][value=ADJACENT]");
  await page.check("input[name=audience][value=career_changer]");
  await page.fill("#skills", "엑셀, 지게차, 바코드 스캐너");
  await shot(page, "04-diagnosis-start");
  await Promise.all([page.waitForURL(/\/sejong\/diagnosis\/\d+/), page.click("button[type=submit]")]);
  const attemptUrl = page.url();

  const items = await page.locator("[data-item]").all();
  ok("문항 24개", items.length === 24, String(items.length));
  /* 앞 12문항: 판단마다 다르게. 저장됨이 뜰 때까지 기다린다 */
  /* 문항 차례는 J1×3 … J8×3. J6(15~17)은 2·2·1 로 답한다: 단계 2 이상이어야 경험 근거 둘이
   * '경험으로 확인됨' 으로 선다. 앞서는 1·0·1 이라 단계 1('들어 봄')에 머물렀고, 그것은 분석이 맞게
   * 돈 것이었다 (CI 에서 이 줄이 걸려 드러났다) */
  const pattern = [2, 2, 1, 1, 2, 1, 3, 2, 2, 2, 1, 1, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1, 1];
  for (let i = 0; i < 12; i++) {
    await items[i].locator(".sj-scale button").nth(pattern[i]).click();
    await items[i].locator(".sj-saved", { hasText: "저장됨" }).waitFor({ timeout: 10000 });
  }
  await shot(page, "05-diagnosis-half", false);
  await page.reload();
  const prog = await txt(page, "[data-testid=progress]");
  ok("새로고침 뒤에도 12/24 (문항마다 저장 · 이어하기)", prog?.trim() === "12 / 24", prog ?? "");

  /* 경험 둘. 검증 근거 둘이면 J6 이 '경험으로 확인됨' 이 된다 */
  for (const e of [
    { kind: "work", title: "물류센터 출고 검수 (계약직)", checks: ["verifications", "used_where", "problems"] },
    { kind: "parttime", title: "식품 공장 포장 라인 아르바이트", checks: ["verifications", "artifacts"] },
  ]) {
    await page.goto(`${BASE}/sejong/experience`);
    await page.selectOption("#kind", e.kind);
    await page.fill("#title", e.title);
    await page.selectOption("#job_area", "JA04");
    for (const c of e.checks) await page.check(`input[name=checks][value=${c}]`);
    await Promise.all([page.waitForURL(/saved=1/), page.click("form:has(#title) button[type=submit]")]);
  }
  await shot(page, "06-experience");

  await page.goto(attemptUrl);
  const items2 = await page.locator("[data-item]").all();
  for (let i = 12; i < 24; i++) {
    await items2[i].locator(".sj-scale button").nth(pattern[i]).click();
    await items2[i].locator(".sj-saved", { hasText: "저장됨" }).waitFor({ timeout: 10000 });
  }
  await Promise.all([page.waitForURL(/\/sejong\/result/), page.locator("form:has(input[name=attempt_id]) button[type=submit]").click()]);
  const rtext = await page.textContent("body");
  ok("제출 → 결과 화면", page.url().includes("/sejong/result"));
  ok("결과에 '경험으로 확인됨' 판단이 선다", rtext.includes("경험으로 확인됨"));
  ok("결과에 총점·순위가 없다", !/총점\s*\d|순위\s*\d|적합도\s*\d/.test(rtext));
  await shot(page, "07-result");

  await page.goto(`${BASE}/sejong/explore?mine=1&v=ready`);
  await shot(page, "08-explore-mine");
  await page.goto(`${BASE}/sejong/plan`);
  await page.locator("form.sj-step button").first().click();
  await page.waitForLoadState("networkidle");
  await shot(page, "09-plan");

  await page.goto(`${BASE}/sejong/report`);
  ok("결과지 미리보기에 '채용' 은 미확인으로만", (await txt(page, "#sj-report")).includes("미확인"));
  await shot(page, "10-report-preview");

  const res = await page.request.get(`${BASE}/sejong/report/pdf`, { timeout: 120000 });
  const buf = await res.body();
  ok("PDF 200 · %PDF", res.status() === 200 && buf.subarray(0, 4).toString() === "%PDF", `${res.status()} ${buf.length}B`);
  if (res.status() === 200) {
    const f = path.join(OUT, "sejong-report-sample.pdf");
    writeFileSync(f, buf);
    try {
      execFileSync("pdftoppm", ["-jpeg", "-r", "60", "-f", "1", "-l", "4", f, path.join(OUT, "11-pdf-page")]);
      const pages = execFileSync("pdfinfo", [f], { encoding: "utf8" }).match(/Pages:\s+(\d+)/)?.[1];
      ok(`PDF 쪽 수 ${pages}`, Number(pages) >= 3, pages ?? "");
    } catch (e) { console.log(`  (pdftoppm 없음: ${String(e).slice(0, 80)})`); }
  }

  /* 무단 접근: 남의 응시 · 상담사 화면 · 로그인 없는 PDF */
  const otherAtt = sql(`SELECT a.id FROM sj_attempts a JOIN users u ON u.id = a.user_id
     WHERE u.login_id <> 'sj-demo01' ORDER BY a.id LIMIT 1`);
  if (otherAtt) {
    await page.goto(`${BASE}/sejong/diagnosis/${otherAtt}`);
    ok("남의 응시 번호를 주소로 넣어도 문항이 열리지 않는다", (await page.locator("[data-item]").count()) === 0, page.url());
  }
  const someone = sql("SELECT user_id FROM sj_participants p JOIN users u ON u.id = p.user_id WHERE u.login_id = 'sj-v01'");
  await page.goto(`${BASE}/sejong/counselor/${someone}`);
  ok("구직자는 상담사 열람 화면에 못 들어간다", !(await page.locator("#sj-report").count()), page.url());
  {
    const anon = await browser.newContext({ ...AUTH });
    const r = await anon.request.get(`${BASE}/sejong/report/pdf`, { maxRedirects: 0 });
    const b = await r.body();
    ok("로그인 없이 PDF 를 받을 수 없다", r.status() !== 200 && b.subarray(0, 4).toString() !== "%PDF", String(r.status()));
    await anon.close();
  }

  await page.goto(`${BASE}/sejong/me`);
  await page.click("form.sj-actions button");
  await page.waitForLoadState("networkidle");
  ok("상담사 열람 동의 → '동의함'", (await page.textContent("body")).includes("동의함"));
  await shot(page, "12-me-after");
}

/* 3. 상담사 */
{
  const ctx = await browser.newContext({ ...AUTH, viewport: { width: 1366, height: 900 } });
  const page = await login(ctx, "sj-counsel1", need("SJ_PW_COUNSEL"));
  ok("상담사 로그인 → 상담사 화면", page.url().endsWith("/sejong/counselor"), page.url());
  await shot(page, "13-counselor-list");
  const demoId = sql("SELECT id FROM users WHERE login_id='sj-demo01'");
  await page.goto(`${BASE}/sejong/counselor/${demoId}`);
  ok("동의한 배정 참여자 → 결과지 열림", (await txt(page, "#sj-report")).length > 0);
  await shot(page, "14-counselor-view");
  /* 배정됐지만 동의 없는 사람 */
  const noConsent = sql(`SELECT p.user_id FROM sj_participants p JOIN sj_counselor_assignments ca
      ON ca.participant_user_id = p.user_id AND ca.active JOIN users u ON u.id = ca.counselor_user_id
     WHERE u.login_id = 'sj-counsel1' AND NOT EXISTS (SELECT 1 FROM consents c WHERE c.user_id = p.user_id AND c.granted)
     LIMIT 1`);
  await page.goto(`${BASE}/sejong/counselor/${noConsent}`);
  ok("동의 없는 참여자 → 열 수 없음", (await page.textContent("body")).includes("결과를 열 수 없습니다"));
  await shot(page, "15-counselor-denied");
  /* 다른 상담사에게 배정된 사람 */
  const other = sql(`SELECT ca.participant_user_id FROM sj_counselor_assignments ca JOIN users u ON u.id = ca.counselor_user_id
     WHERE u.login_id = 'sj-counsel2' AND ca.active LIMIT 1`);
  await page.goto(`${BASE}/sejong/counselor/${other}`);
  ok("배정 안 된 참여자 → 열 수 없음", (await page.textContent("body")).includes("배정된 참여자가 아닙니다"));
  const r = await page.goto(`${BASE}/sejong/admin`);
  ok("상담사는 관리자 화면에 못 들어간다", !page.url().endsWith("/sejong/admin"), `${r?.status()} ${page.url()}`);
  await ctx.close();
}

/* 4. 관리자 */
{
  const ctx = await browser.newContext({ ...AUTH, viewport: { width: 1440, height: 900 } });
  const page = await login(ctx, "sj-admin", need("SJ_PW_ADMIN"));
  ok("관리자 로그인 → 대시보드", page.url().endsWith("/sejong/admin"), page.url());
  const t = await page.textContent("body");
  ok("대시보드에 5명 미만 가림", t.includes("5명 미만"));
  await shot(page, "16-admin-dashboard");
  await page.goto(`${BASE}/sejong/admin/participants`);
  const ptab = await txt(page, "[data-testid=participants]");
  ok("참여자 표가 선다 · 결과 내용이 없다", ptab.length > 0 && !ptab.includes("경험으로 확인됨"));
  await page.fill("#name", "시연 신규 참여자");
  await page.fill("#participant_no", `SJ-A-${String(Date.now()).slice(-4)}`);
  await page.click("form:has(#participant_no) button[type=submit]");
  await page.locator("text=임시 비밀번호").waitFor({ timeout: 15000 });
  ok("참여자 계정 발급 → 임시 비밀번호 한 번 표시", true);
  await shot(page, "17-admin-participants");
  await page.goto(`${BASE}/sejong/admin/counselors`);
  await shot(page, "18-admin-counselors");
  const r = await page.goto(`${BASE}/sejong/me`);
  ok("관리자는 구직자 화면에 못 들어간다", !page.url().endsWith("/sejong/me"), `${r?.status()} ${page.url()}`);
  await ctx.close();
}

/* 5. DB 기록 */
if (DB) {
  ok("PDF 생성 기록이 남았다", Number(sql("SELECT count(*) FROM sj_report_renders WHERE status='ready'")) >= 1);
  ok("상담사 열람·거절 기록이 남았다",
    Number(sql("SELECT count(*) FROM sj_access_logs WHERE actor_kind='counselor' AND what='report_web'")) >= 1
    && Number(sql("SELECT count(*) FROM sj_access_logs WHERE what='denied'")) >= 2);
  ok("ME_V3 응시 표는 건드리지 않았다", sql("SELECT count(*) FROM v3_attempts") === "0");
}

await browser.close();
console.log(`\n${pass} 통과 · ${bad.length} 걸림 · 화면 ${OUT}/\n`);
process.exit(bad.length ? 1 : 0);
