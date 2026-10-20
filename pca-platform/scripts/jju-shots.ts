/**
 * 전주대학교 부트캠프 MVP 를 **사람이 누르는 차례 그대로** 밟고 찍는다.
 *
 * 공개 쪽(소개 · 교육 분야 · 학교 진입 · 트랙 목록) → 학생(트랙 상세 →
 * 시작 → 검사 첫 화면 → 끝까지 → 결과 → PDF → 작업공간 → 경험 기록) →
 * 사업단(현황 · 상세 집계 · 명단). 학생 길은 두 트랙을 밟는다: 지금 학생에게
 * 열린 검사로 재는 트랙 하나(`LIVE`)와 미리보기로만 여는 트랙 하나(`DEMO`).
 *
 * **등록부를 쓰지 않는다.** 전주대는 fixture 로만 서고, 닫힌 검사는 서버의
 * `V3_PREVIEW_OPEN` 이 연다.
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json \
 *   V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1 bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json \
 *   V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1 JJU_ADMIN_PW=<jju-demo-setup 이 준 값> \
 *   OUT=docs/jju/shots npx tsx scripts/jju-shots.ts
 */
import {
  BASE, assertCampusFixtureServer, assertFreshServer, gateCreds, loadEnv, login,
  makeStudent, registerCampusStudent,
} from "./_loop-fixture";
loadEnv();

/* eslint-disable import/first */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import { enterAssessment, walk } from "./_v3-walk";
import { jjuUniversity, tracksOf } from "../src/lib/jju/program";

const OUT = process.env.OUT ?? "docs/jju/shots";
const LIVE = process.env.LIVE_TRACK ?? "JJU1_SF";
const DEMO = process.env.DEMO_TRACK ?? "JJU1_AI";

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? " — " + saw : ""}`); }
};

async function shoot(p: Page, name: string): Promise<void> {
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const status = await p.evaluate(() => document.title);
  console.log(`  찍음  ${name} · ${new URL(p.url()).pathname} · ${status}`);
}

async function both(ctx: BrowserContext, mob: BrowserContext, path: string, name: string) {
  for (const [c, tag] of [[ctx, "desktop"], [mob, "mobile"]] as const) {
    const p = await c.newPage();
    const r = await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    ok(`${path} 가 열린다 (${tag})`, (r?.status() ?? 0) < 400, String(r?.status()));
    await shoot(p, `${name}.${tag}`);
    await p.close();
  }
}

async function student(
  browser: Awaited<ReturnType<typeof chromium.launch>>, code: string, tag: string,
): Promise<void> {
  const u = jjuUniversity()!;
  const t = tracksOf(u).find((x) => x.code === code);
  if (!t) throw new Error(`fixture 에 ${code} 가 없습니다`);
  console.log(`\n── 학생 · ${t.short} (${t.mode})`);
  const s = await makeStudent(`jju-shot-${code.toLowerCase()}@test.invalid`);
  await registerCampusStudent(s.id, "JJU", code);
  const gate = gateCreds();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, ...(gate ? { httpCredentials: gate } : {}),
  });
  const p = await login(ctx, `jju-shot-${code.toLowerCase()}@test.invalid`, s.pw);
  await p.goto(`${BASE}/campus/jju/d/${code}?y=${t.cohort.year}`, { waitUntil: "networkidle" });
  await shoot(p, `${tag}-01-track`);
  await p.getByRole("button", { name: "검사 시작하기" }).click();
  await p.waitForURL(/\/v3\/start/, { timeout: 30000 });
  await shoot(p, `${tag}-02-start`);
  await p.getByText("학부", { exact: true }).click();
  await p.getByRole("button", { name: "검사 시작" }).click();
  await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  await shoot(p, `${tag}-03-intro`);
  await enterAssessment(p);
  await shoot(p, `${tag}-04-question`);
  const m = /\/v3\/(\d+)/.exec(p.url());
  ok(`${t.short} 응시가 열린다`, !!m, new URL(p.url()).pathname);
  if (!m) return;
  const w = await walk(p, 400);
  ok(`${t.short} 끝까지 간다`, w.done, `화면 ${w.screens}`);
  await p.goto(`${BASE}/v3/${m[1]}/result`, { waitUntil: "networkidle" });
  const body = await p.locator("body").innerText();
  ok(`${t.short} 결과가 트랙 이름을 적는다`, body.includes(t.short), "");
  await shoot(p, `${tag}-05-result`);
  const pdf = await p.request.get(`${BASE}/v3/${m[1]}/result/pdf`, { timeout: 120000 });
  ok(`${t.short} PDF 가 나온다`, pdf.status() === 200
    && (pdf.headers()["content-type"] ?? "").includes("pdf"), String(pdf.status()));
  if (pdf.status() === 200) writeFileSync(`${OUT}/${tag}-06-report.pdf`, await pdf.body());
  for (const [path, n] of [["/me", "07-workspace"], ["/me/experience/new", "08-experience"],
    ["/me/state", "09-state"]] as const) {
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await shoot(p, `${tag}-${n}`);
  }
  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    ...(gate ? { httpCredentials: gate } : {}),
  });
  await mob.addCookies(await ctx.cookies());
  const mp = await mob.newPage();
  await mp.goto(`${BASE}/v3/${m[1]}/result`, { waitUntil: "networkidle" });
  await shoot(mp, `${tag}-05-result.mobile`);
  await mob.close(); await ctx.close();
}

async function main(): Promise<void> {
  assertFreshServer();
  assertCampusFixtureServer("JJU");
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const gate = gateCreds();
  const desk = await browser.newContext({
    viewport: { width: 1440, height: 900 }, ...(gate ? { httpCredentials: gate } : {}),
  });
  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    ...(gate ? { httpCredentials: gate } : {}),
  });

  console.log("── 공개 쪽");
  await both(desk, mob, "/jju", "p-01-home");
  await both(desk, mob, "/jju/fields", "p-02-fields");
  await both(desk, mob, "/campus/jju", "p-03-campus");
  await both(desk, mob, "/campus/jju/majors", "p-04-tracks");

  await student(browser, LIVE, "s-live");
  await student(browser, DEMO, "s-demo");

  const pw = process.env.JJU_ADMIN_PW;
  if (pw) {
    console.log("\n── 사업단");
    const a = await login(desk, "jju-admin", pw);
    for (const [path, n] of [["/jju/admin?demo=1", "a-01-admin"],
      ["/org/v3?demo=1", "a-02-insights"], ["/org/v3/students?demo=1", "a-03-students"]] as const) {
      const r = await a.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      ok(`${path} 가 열린다`, (r?.status() ?? 0) < 400, String(r?.status()));
      await shoot(a, n);
    }
  } else {
    console.log("\n  적어둠  JJU_ADMIN_PW 가 없어 사업단 화면을 찍지 않았습니다");
  }
  await browser.close();
  console.log(`\n  통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
