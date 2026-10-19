/**
 * **R33 · 운영 완성 E2E.** 실제 브라우저(Chromium)와 실제 DB 로 한 학생의
 * 하루를 끝까지 밟는다. 자리마다 **서버 응답 · DB 영구 저장 · 화면 반영**을
 * 같이 센다.
 *
 *   로그인 → 검사 시작 → 응답 저장 → 새로고침 → 이어하기 → (저장 실패 →
 *   다시 시도) → (서버 재시작) → 제출(중복 클릭) → 결과 → PDF → 경험 추가 →
 *   현재 상태 반영 → 로그아웃 → 재로그인 → 기존 기록 재조회 → 권한 →
 *   (PDF 오류) → 서버 재시작 뒤 자료 그대로
 *
 * **고장을 실제로 낸다.** 저장 실패는 PostgreSQL 을 실제로 멈추고, PDF 오류는
 * 서버를 그리는 쪽이 닿을 수 없는 주소로 다시 띄워서 낸다. 환경값으로 흉내
 * 내지 않는다. 그래서 이 검사는 **이 기계의 서버와 DB 를 제어할 수 있는
 * 자리**에서만 돈다(운영에 대고 돌리지 않는다: `assertLocal`).
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
 *     CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ OUT=var/r33/e2e npx tsx scripts/lab/r33-e2e.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
  makeStudent, fillExperience,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { attemptOf, domainName, latestResult, submit } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment, pickOne, walk } from "../_v3-walk";
import { headlineKo } from "../../src/lib/me-v3/result/text.ko";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const OUT = process.env.OUT ?? "var/r33/e2e";
const PORT = Number(new URL(BASE).port || 80);

let pass = 0; const bad: string[] = []; const rows: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  const line = `${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`;
  (c ? pass++ : bad.push(w)); rows.push(line); console.log("  " + line);
};
const note = (w: string): void => { rows.push(`적어둠  ${w}`); console.log(`  적어둠  ${w}`); };
const head = (w: string): void => { rows.push(``, `## ${w}`); console.log(`\n── ${w}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function assertLocal(): void {
  const h = new URL(BASE).hostname;
  if (!["127.0.0.1", "localhost"].includes(h)) {
    throw new Error(`이 검사는 서버와 DB 를 멈추고 다시 띄운다. 로컬 주소에만 대고 돈다: ${BASE}`);
  }
}

/** DB 를 멈춘 직후의 질의는 한 번 끊길 수 있다. 짧게 다시 묻는다 */
async function q1<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  for (let i = 0; i < 6; i += 1) {
    try { return await queryOne<T>(sql, params); } catch (e) {
      if (i === 5) throw e; await sleep(800);
    }
  }
  return null;
}
const count = async (sql: string, params: unknown[] = []): Promise<number> =>
  Number((await q1<{ n: string }>(sql, params))?.n ?? 0);

async function health(): Promise<number> {
  try { return (await fetch(`${BASE}/api/health`)).status; } catch { return 0; }
}

/** 듣는 소켓의 inode 로 서버 프로세스를 찾는다. `pkill -f` 는 제 셸을 집는다 */
function serverPid(): number | null {
  const hex = PORT.toString(16).toUpperCase().padStart(4, "0");
  const lines = readFileSync("/proc/net/tcp", "utf8").split("\n").slice(1);
  const inode = lines.map((l) => l.trim().split(/\s+/))
    .find((c) => c[1]?.endsWith(`:${hex}`) && c[3] === "0A")?.[9];
  if (!inode) return null;
  for (const d of readdirSync("/proc").filter((x) => /^\d+$/.test(x))) {
    try {
      for (const fd of readdirSync(`/proc/${d}/fd`)) {
        try { if (readlinkSync(`/proc/${d}/fd/${fd}`) === `socket:[${inode}]`) return Number(d); }
        catch { /* 닫힌 fd */ }
      }
    } catch { /* 남의 프로세스 */ }
  }
  return null;
}

/** 서버를 끄고 같은 빌드로 다시 띄운다. `extra` 는 그 한 번에만 들어가는 환경값 */
async function restartServer(extra: Record<string, string>, tag: string): Promise<void> {
  const pid = serverPid();
  if (pid) {
    process.kill(pid, "SIGTERM");
    for (let i = 0; i < 40 && (await health()) !== 0; i += 1) await sleep(250);
    if ((await health()) !== 0) process.kill(pid, "SIGKILL");
    for (let i = 0; i < 40 && (await health()) !== 0; i += 1) await sleep(250);
  }
  const log = openSync(`${OUT}/serve-${tag}.log`, "w");
  const child = spawn("bash", ["scripts/stage-serve.sh", String(PORT)], {
    detached: true, stdio: ["ignore", log, log],
    env: {
      ...process.env,
      V3_PREVIEW_OPEN: process.env.V3_PREVIEW_OPEN ?? "*",
      ...(process.env.V3_CAMPUS_FIXTURE ? { V3_CAMPUS_FIXTURE: process.env.V3_CAMPUS_FIXTURE } : {}),
      ...extra,
    },
  });
  child.unref();
  for (let i = 0; i < 120 && (await health()) !== 200; i += 1) await sleep(500);
  if ((await health()) !== 200) throw new Error(`서버가 다시 뜨지 않았다 (${tag})`);
  assertFreshServer();
}

function pg(action: "stop" | "start"): void {
  execFileSync("pg_ctlcluster", ["16", "main", action], { stdio: "ignore" });
}

async function openPage(ctx: BrowserContext, url: string, errs: string[]): Promise<Page> {
  const q = await ctx.newPage();
  q.setDefaultTimeout(20000);
  q.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  q.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
  await q.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await q.locator("h1").first().waitFor({ timeout: 20000 }).catch(() => undefined);
  await q.waitForTimeout(500);
  return q;
}

async function main(): Promise<void> {
  assertLocal();
  assertFreshServer();
  assertPreviewServer(CORE);
  mkdirSync(`${OUT}/pdf`, { recursive: true });
  const u = university(UNI);
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const seat = allLeaves(u).find((r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE);
  if (!seat) throw new Error(`${LEAF} 자리가 ${CORE} 를 가리키지 않습니다`);

  /* ── 0. 학교가 발급한 계정 (운영과 같은 함수) ─────────────────── */
  head("0. 계정 발급");
  const sid = `zzr33e${Date.now().toString().slice(-7)}`;
  const org = await q1<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error("PCU 기관 줄이 없습니다 (pcu:org)");
  const actor = await q1<{ user_id: string; role: string; org_id: number }>(
    `SELECT m.user_id::text, m.role, m.org_id FROM memberships m
      WHERE m.org_id = $1::bigint AND m.role IN ('org_admin','org_manager') LIMIT 1`, [org.id]);
  if (!actor) throw new Error("PCU 담당자 줄이 없습니다 (pcu:org)");
  const st = await addStudentAccount(UNI, org.id, {
    student_id: sid, name: "운영 점검 학생", email: null, login_id: sid,
    college_code: seat.college.code, department_code: seat.leaf.code,
  }, { userId: actor.user_id, role: actor.role, orgId: Number(actor.org_id) });
  if (!st.ok || !st.password) throw new Error(`계정 발급 ${st.why ?? ""}`);
  const stu = await q1<{ id: string; h: string }>(
    `SELECT id::text, password_hash h FROM users WHERE login_id = $1`, [sid]);
  if (!stu) throw new Error("발급한 계정을 찾지 못했다");
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [stu.id]);
  ok("DB 에 계정 줄과 학교 신분이 선다",
    (await count(`SELECT count(*)::text n FROM campus_students WHERE user_id = $1::bigint`, [stu.id])) === 1,
    `아이디 ${sid}`);
  ok("DB 에 평문 비밀번호가 없다", stu.h !== st.password && stu.h.length > 20);

  const browser: Browser = await chromium.launch();
  const gate = gateCreds();
  const mk = () => browser.newContext({
    viewport: { width: 1440, height: 900 }, acceptDownloads: true,
    ...(gate ? { httpCredentials: gate } : {}),
  });
  const errs: string[] = [];
  let att = "";
  let pdfBytes = 0;
  try {
    /* ── 1. 로그인 ───────────────────────────────────────────────── */
    head("1. 로그인");
    let ctx = await mk();
    let p: Page = await login(ctx, sid, st.password);
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
    ok("브라우저에서 로그인된다", !/\/login/.test(p.url()), new URL(p.url()).pathname);
    const cookieNames = (await ctx.cookies()).map((c) => c.name);
    ok("세션 쿠키가 생긴다", cookieNames.some((n) => /session-token/.test(n)), cookieNames.join(","));

    /* ── 2. 검사 시작 ────────────────────────────────────────────── */
    head("2. 검사 시작");
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`, { waitUntil: "networkidle" });
    await p.getByRole("button", { name: "검사 시작하기" }).click();
    await p.waitForURL(/\/v3\/start/, { timeout: 30000 });
    await p.waitForLoadState("networkidle");
    await p.getByText("학부", { exact: true }).click();
    await p.getByRole("button", { name: "검사 시작" }).click();
    await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await enterAssessment(p);
    att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
    ok("응시가 열린다", !!att, new URL(p.url()).pathname);
    if (!att) throw new Error("응시가 열리지 않았다");
    const arow = await q1<{ core_code: string; tier: string; department_code: string | null; status: string }>(
      `SELECT core_code, tier, department_code, status FROM v3_attempts WHERE id = $1`, [att]);
    ok("DB 응시 줄: 이 Core · 이 학과 · in_progress",
      arow?.core_code === CORE && arow?.department_code === seat.leaf.code && arow?.status === "in_progress",
      `${arow?.core_code} · ${arow?.department_code} · ${arow?.status}`);
    ok("학교 진입은 서버가 PRO 로 연다 (Campus PRO)", arow?.tier === "PRO", `${arow?.tier}`);

    /* ── 3. 응답 저장 ────────────────────────────────────────────── */
    head("3. 응답 저장");
    p.setDefaultTimeout(20000); p.setDefaultNavigationTimeout(45000);
    const w1 = await walk(p, 6);
    const n1 = await count(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1`, [att]);
    const cur1 = await q1<{ s: string | null; t: string | null }>(
      `SELECT current_screen s, last_saved_at::text t FROM v3_attempts WHERE id = $1`, [att]);
    ok("화면 여섯을 지나면 답이 DB 에 쌓인다", w1.screens >= 5 && n1 > 0, `화면 ${w1.screens} · 답 ${n1}개`);
    ok("어디까지 왔는지(current_screen)와 저장 시각이 적힌다", !!cur1?.s && !!cur1?.t, `${cur1?.s}`);

    /* ── 4. 새로고침 → 이어하기 ─────────────────────────────────── */
    head("4. 새로고침과 이어하기");
    const urlBefore = p.url();
    await p.reload({ waitUntil: "networkidle" });
    ok("새로고침해도 같은 화면에 선다", p.url() === urlBefore, new URL(p.url()).pathname + new URL(p.url()).search);
    const n1b = await count(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1`, [att]);
    ok("새로고침으로 답이 늘거나 줄지 않는다", n1b === n1, `${n1b}개`);
    /* 앞 화면으로 돌아가면 고른 것이 켜져 있다 */
    const prev = p.locator("button.qs-btn-ghost, button:has-text('이전')").first();
    let checkedPrev = -1;
    if (await prev.count()) {
      const was = p.url();
      await prev.click({ force: true }).catch(() => undefined);
      await p.waitForURL((x) => x.href !== was, { timeout: 15000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
      checkedPrev = await p.locator("input:checked").count();
      ok("앞 화면으로 돌아가면 고른 답이 서버에서 다시 켜진다", checkedPrev > 0, `켜진 보기 ${checkedPrev}개`);
      const nxt = p.locator("button.qs-btn-main").first();
      const was2 = p.url();
      await nxt.click({ force: true }).catch(() => undefined);
      await p.waitForURL((x) => x.href !== was2, { timeout: 15000 }).catch(() => undefined);
    } else note("이전 단추를 찾지 못해 앞 화면 확인을 건너뛴다");
    /* 새 탭에서 /v3/start 를 치면 열린 응시로 돌려보낸다 */
    const p2 = await ctx.newPage();
    await p2.goto(`${BASE}/v3/start`, { waitUntil: "domcontentloaded" });
    await p2.waitForURL(new RegExp(`/v3/${att}`), { timeout: 20000 }).catch(() => undefined);
    ok("/v3/start 를 다시 치면 열린 응시로 이어진다 (새 응시를 만들지 않는다)",
      new RegExp(`/v3/${att}(\\?|/|$)`).test(p2.url()), new URL(p2.url()).pathname);
    const nAtt = await count(`SELECT count(*)::text n FROM v3_attempts WHERE user_id = $1::bigint`, [stu.id]);
    ok("이 학생의 응시는 그대로 하나다", nAtt === 1, `${nAtt}개`);
    await p2.close();
    /* 브라우저를 완전히 닫고 다시 로그인해도 이어진다 */
    await ctx.close();
    ctx = await mk();
    p = await login(ctx, sid, st.password);
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
    p.setDefaultTimeout(20000); p.setDefaultNavigationTimeout(45000);
    await p.goto(`${BASE}/v3/start`, { waitUntil: "domcontentloaded" });
    await p.waitForURL(new RegExp(`/v3/${att}`), { timeout: 20000 }).catch(() => undefined);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    ok("브라우저를 닫고 다시 로그인해도 같은 응시로 이어진다",
      new RegExp(`/v3/${att}(\\?|/|$)`).test(p.url()), new URL(p.url()).pathname);

    /* ── 5. 저장 실패 → 다시 시도 (PostgreSQL 을 실제로 멈춘다) ───── */
    head("5. 저장 실패");
    const errsBeforeOutage = errs.length;
    const nBeforeFail = await count(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1`, [att]);
    pg("stop");
    await sleep(800);
    const box = p.locator("fieldset.qs-opts, .qs-cards, .qs-list").first();
    let picked = "none";
    if (await box.count()) picked = await pickOne(box, 1);
    const bad1 = p.locator("button.qs-save.is-bad");
    const shown = await bad1.waitFor({ state: "visible", timeout: 20000 }).then(() => true).catch(() => false);
    ok("DB 가 멈추면 `저장 실패 · 다시 시도` 가 선다 (조용히 넘어가지 않는다)", shown, `고른 보기 ${picked}`);
    const body5 = await p.locator("body").innerText().catch(() => "");
    ok("저장 실패 상태에서 `저장됨` 을 적지 않는다", !/저장됨/.test(body5));
    pg("start");
    for (let i = 0; i < 20; i += 1) {
      try { await queryOne(`SELECT 1`); break; } catch { await sleep(500); }
    }
    if (shown) {
      await bad1.click({ timeout: 5000 }).catch(() => undefined);
      const gone = await bad1.waitFor({ state: "hidden", timeout: 20000 }).then(() => true).catch(() => false);
      ok("DB 가 돌아온 뒤 `다시 시도` 를 누르면 저장된다", gone);
    }
    await sleep(600);
    const nAfterFail = await count(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1`, [att]);
    ok("다시 시도한 답이 DB 에 실제로 들어간다", nAfterFail > nBeforeFail, `${nBeforeFail} → ${nAfterFail}`);

    /* DB 가 멈춘 동안 쪽을 다시 그리는 요청이 500 을 받는 것은 그 고장의 모양이다.
       세는 것은 **DB 가 돌아온 뒤**의 5xx 다 */
    const duringOutage = errs.splice(errsBeforeOutage);
    if (duringOutage.length) note(`DB 가 멈춘 동안 받은 응답: ${duringOutage.join(" | ").slice(0, 160)}`);
    ok("저장 실패 뒤에도 응시 화면에 그대로 있다 (로그인이나 홈으로 튕기지 않는다)",
      new RegExp(`/v3/${att}`).test(p.url()), new URL(p.url()).pathname);
    if (!new RegExp(`/v3/${att}`).test(p.url())) {
      await p.goto(`${BASE}/v3/start`, { waitUntil: "domcontentloaded" });
      await p.waitForURL(new RegExp(`/v3/${att}`), { timeout: 20000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }

    /* ── 6. 응시 도중 서버 재시작 ───────────────────────────────── */
    head("6. 응시 도중 서버 재시작");
    const urlMid = p.url();
    const nMid = nAfterFail;
    await restartServer({}, "mid");
    ok("서버가 같은 빌드로 다시 뜬다", (await health()) === 200);
    await p.reload({ waitUntil: "networkidle" }).catch(() => undefined);
    ok("재시작 뒤 세션이 살아 있다 (다시 로그인하라고 하지 않는다)", !/\/login/.test(p.url()), new URL(p.url()).pathname);
    ok("재시작 뒤 같은 화면에서 이어진다", p.url() === urlMid, new URL(p.url()).search);
    const nMid2 = await count(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1`, [att]);
    ok("재시작으로 답이 사라지지 않는다", nMid2 === nMid, `${nMid2}개`);

    /* ── 7. 끝까지 → 제출 (중복 클릭) ──────────────────────────── */
    head("7. 제출 (중복 클릭)");
    if (!new RegExp(`/v3/${att}`).test(p.url())) {
      await p.goto(`${BASE}/v3/start`, { waitUntil: "domcontentloaded" });
      await p.waitForURL(new RegExp(`/v3/${att}`), { timeout: 20000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    let dbl = false;
    const t0 = Date.now();
    const w2 = await Promise.race([
      walk(p, 400, {
        onFinish: async (btn: Locator) => {
          dbl = true;
          /* 사람이 급하게 두 번 누른다. 두 클릭이 한 묶음으로 간다 */
          await btn.dblclick({ force: true }).catch(() => undefined);
          await btn.click({ force: true, timeout: 1500 }).catch(() => undefined);
        },
      }),
      new Promise<null>((r) => setTimeout(() => r(null), 14 * 60 * 1000)),
    ]);
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    if (w2) ok("모든 화면을 눌러 끝까지 간다", w2.done, `화면 ${w2.screens} · ${mins}분`);
    else note(`걸음이 14분 안에 돌아오지 않았다 — DB 상태로 이어 간다`);
    await sleep(1500);
    const stt = await q1<{ status: string; sub: string | null }>(
      `SELECT status, submitted_at::text sub FROM v3_attempts WHERE id = $1`, [att]);
    ok("응시가 제출돼 채점됐다 (status=scored · submitted_at)", stt?.status === "scored" && !!stt?.sub, `${stt?.status}`);
    const nSnap = await count(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id = $1`, [att]);
    ok("`결과 만들기` 를 두 번 눌러도 결과가 한 벌이다", dbl && nSnap === 1, `스냅샷 ${nSnap}개 · 두 번 누름 ${dbl}`);
    const nAns = await count(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1`, [att]);
    ok("답이 서버에 다 쌓였다", nAns > 60, `${nAns}개`);
    const landed = new URL(p.url()).pathname;
    ok("제출 뒤 완료 안내나 결과에 선다", /\/(done|result)$/.test(landed), landed);

    /* 7b. 같은 순간에 들어온 제출 둘 — 서버 함수 수준의 경쟁 */
    head("7b. 동시 제출 (서버 함수 두 번 동시에)");
    const twin = await makeStudent(`zzr33t${Date.now().toString().slice(-7)}`);
    const twinAtt = await q1<{ id: string }>(
      `INSERT INTO v3_attempts
         (user_id, tier, core_code, market_code, education_stage, grad_field, undergrad_core,
          assessment_version, item_bank_version, scoring_version, status, current_screen,
          opened_probe, opened_deep, fourth_reason, industry_pack, role_pack, started_at,
          industry_interest, role_interest, org_interest)
       SELECT $1, tier, core_code, market_code, education_stage, grad_field, undergrad_core,
              assessment_version, item_bank_version, scoring_version, 'in_progress', current_screen,
              opened_probe, opened_deep, fourth_reason, industry_pack, role_pack, started_at,
              industry_interest, role_interest, org_interest
         FROM v3_attempts WHERE id = $2::bigint RETURNING id::text`, [twin.id, att]);
    await query(`INSERT INTO v3_responses (attempt_id, item_id, kind, value_int, value_text, answered_at, note_text)
                 SELECT $1::bigint, item_id, kind, value_int, value_text, answered_at, note_text
                   FROM v3_responses WHERE attempt_id = $2::bigint`, [twinAtt!.id, att]);
    await query(`INSERT INTO v3_evidence_picks (attempt_id, domain_code, slot, item_text)
                 SELECT $1::bigint, domain_code, slot, item_text FROM v3_evidence_picks WHERE attempt_id = $2::bigint`,
      [twinAtt!.id, att]);
    const ta = await attemptOf(twinAtt!.id, twin.id);
    const twinResults = await Promise.allSettled([submit(ta!), submit(ta!)]);
    const twinSnaps = await count(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id = $1`, [twinAtt!.id]);
    ok("같은 순간에 제출 둘이 들어와도 결과가 한 벌이다",
      twinSnaps === 1, `스냅샷 ${twinSnaps}개 · 호출 결과 ${twinResults.map((r) => r.status).join("/")}`);
    for (const t of ["v3_snapshots", "v3_evidence_picks", "v3_responses"]) {
      await query(`DELETE FROM ${t} WHERE attempt_id = $1::bigint`, [twinAtt!.id]).catch(() => undefined);
    }
    for (const t of ["career_events", "career_profiles", "v3_attempts", "entitlements", "memberships", "analytics_events"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1::bigint`, [twin.id]).catch(() => undefined);
    }
    await query(`DELETE FROM users WHERE id = $1::bigint`, [twin.id]).catch(() => undefined);

    /* ── 8. 결과 생성 ─────────────────────────────────────────────── */
    head("8. 결과");
    const model = await latestResult(att);
    ok("결과 모델이 DB 에 굳어 있다", !!model, model ? `영역 ${model.domains.length}` : "없다");
    if (!model) throw new Error("결과 모델이 없다");
    const headline = headlineKo(model, (td) => domainName(CORE, td));
    await p.close().catch(() => undefined);
    const rp = await openPage(ctx, `${BASE}/v3/${att}/result`, errs);
    const h1 = (await rp.locator("h1").first().innerText().catch(() => "")).trim();
    ok("결과 화면이 열리고 머리글이 모델과 같다", h1 === headline.title, `"${h1.slice(0, 40)}"`);
    const prof = await q1<{ g: string; at: string | null }>(
      `SELECT jsonb_typeof(gaps) g, recomputed_at::text at FROM career_profiles WHERE user_id = $1::bigint AND core_code = $2`,
      [stu.id, CORE]);
    ok("제출이 지금 값 줄을 만들고, 제출만 한 것을 반영으로 읽지 않는다",
      prof?.g === "object" || prof?.g === "array", `gaps ${prof?.g} · recomputed_at ${prof?.at ?? "비어 있음"}`);

    /* ── 9. PDF ───────────────────────────────────────────────────── */
    head("9. PDF 다운로드");
    const pdf = await rp.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 180000 });
    const ct = pdf.headers()["content-type"] ?? "";
    ok("PDF 가 내려온다", pdf.status() === 200 && ct.includes("pdf"), `${pdf.status()} ${ct}`);
    const buf = Buffer.from(await pdf.body());
    pdfBytes = buf.length;
    writeFileSync(`${OUT}/result.pdf`, buf);
    ok("PDF 파일이 비어 있지 않다", buf.length > 50_000, `${buf.length} 바이트`);
    const text = execFileSync("pdftotext", ["-layout", `${OUT}/result.pdf`, "-"]).toString("utf8");
    const pagesN = (text.match(/\f/g) ?? []).length + 1;
    const hangul = (text.match(/[가-힣]/g) ?? []).length;
    ok("종이의 한글이 글자로 꺼내진다", hangul > 2000, `${pagesN}쪽 · 한글 ${hangul}자`);
    ok("종이에 학교와 학과가 선다", text.includes("배재대학교") && text.replace(/\s/g, "").includes(seat.leaf.name.replace(/\s/g, "")));

    /* ── 10. 경험 추가 → 현재 상태 반영 ────────────────────────── */
    head("10. 경험 추가와 현재 상태");
    const title = `운영 점검 경험 ${Date.now().toString().slice(-5)}`;
    const ep = await ctx.newPage();
    ep.setDefaultTimeout(20000);
    ep.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    ep.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
    const pickedTd = await fillExperience(ep, title);
    const exp = await q1<{ id: string; td: number }>(
      `SELECT id::text, coalesce(array_length(td_codes,1),0) td FROM v3_experiences WHERE user_id = $1::bigint AND title = $2`,
      [stu.id, title]);
    ok("저장 단추가 DB 에 경험 줄을 만든다", !!exp && Number(exp.td) > 0, `기술영역 ${exp?.td ?? 0}개 (화면에서 고른 ${pickedTd})`);
    const landedE = new URL(ep.url()).pathname + new URL(ep.url()).search;
    ok("저장하면 달라진 것을 먼저 보여 준다 (/me/recompute?new=)", landedE.startsWith("/me/recompute") && landedE.includes("new="), landedE);
    const pending = await count(
      `SELECT count(*)::text n FROM career_events WHERE user_id = $1::bigint AND status <> 'done'`, [stu.id]);
    const prof2 = await q1<{ g: string; at: string | null }>(
      `SELECT jsonb_typeof(gaps) g, recomputed_at::text at FROM career_profiles WHERE user_id = $1::bigint AND core_code = $2`,
      [stu.id, CORE]);
    ok("저장하면 누르지 않아도 현재 상태에 반영된다 (recomputed_at · 밀린 일 0)",
      !!prof2?.at && prof2?.g === "array" && pending === 0, `recomputed_at ${prof2?.at ?? "없음"} · 밀린 일 ${pending}`);
    /* 저장 직후 쪽이 달라진 것을 적는다. `/me/state` 는 기준 시각으로 반영을 적는다
       (`새 경험을 더했습니다` 배너는 사람이 반영 단추를 누른 길(`?r=1`)에만 선다) */
    const recTxt = await ep.locator("body").innerText();
    ok("저장 직후 쪽이 그 경험으로 달라지는 현재 상태를 적는다",
      /달라진|현재 상태/.test(recTxt) && recTxt.includes(title));
    await ep.goto(`${BASE}/me/state`, { waitUntil: "networkidle" });
    const stateTxt = await ep.locator("body").innerText();
    ok("현재 상태 화면이 경험을 얹은 값이라고 적는다 (반영 시각 기준)",
      /그 뒤의 경험을 얹은 값/.test(stateTxt) && /기준/.test(stateTxt));
    await ep.goto(`${BASE}/me/experience`, { waitUntil: "networkidle" });
    const listTxt = await ep.locator("body").innerText();
    ok("경험 목록에 그 경험이 있고 더했는지가 적힌다", listTxt.includes(title) && /더함|더하지 않음/.test(listTxt));
    await ep.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    const homeTxt = await ep.locator("body").innerText();
    ok("홈의 최근 기록에 결과와 경험이 선다", homeTxt.includes(title) && (await ep.locator(`a[href="/v3/${att}/result"]`).count()) > 0);
    await ep.close();

    /* ── 11. 로그아웃 → 재로그인 → 기존 기록 ───────────────────── */
    head("11. 로그아웃과 재로그인");
    const lp = await ctx.newPage();
    lp.setDefaultTimeout(20000);
    await lp.goto(`${BASE}/my`, { waitUntil: "networkidle" });
    const outBtn = lp.locator("form button:has-text('로그아웃')").first();
    ok("계정 화면에 로그아웃 단추가 있다", (await outBtn.count()) > 0);
    await outBtn.click({ timeout: 5000 }).catch(() => undefined);
    await lp.waitForURL(/\/login/, { timeout: 20000 }).catch(() => undefined);
    ok("로그아웃하면 로그인 화면으로 간다", /\/login/.test(lp.url()), new URL(lp.url()).pathname);
    const after = (await ctx.cookies()).filter((c) => /session-token/.test(c.name));
    ok("세션 쿠키가 지워진다", after.length === 0, `${after.length}개 남음`);
    const r403 = await lp.goto(`${BASE}/me`, { waitUntil: "domcontentloaded" }).catch(() => null);
    ok("로그아웃 뒤 /me 는 로그인으로 돌려보낸다", /\/login/.test(lp.url()), `${r403?.status()} → ${new URL(lp.url()).pathname}`);
    const pdfOut = await lp.request.get(`${BASE}/v3/${att}/result/pdf`, { maxRedirects: 0 }).catch(() => null);
    ok("로그아웃 뒤 PDF 가 막힌다", !!pdfOut && pdfOut.status() !== 200, `${pdfOut?.status()}`);
    await lp.close();
    await ctx.close();
    ctx = await mk();
    const rp2 = await login(ctx, sid, st.password);
    rp2.setDefaultTimeout(20000);
    ok("다시 로그인된다", !/\/login/.test(rp2.url()), new URL(rp2.url()).pathname);
    await rp2.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    const home2 = await rp2.locator("body").innerText();
    ok("재로그인 뒤 홈에 결과 기록과 경험이 그대로 있다",
      (await rp2.locator(`a[href="/v3/${att}/result"]`).count()) > 0 && home2.includes(title));
    await rp2.goto(`${BASE}/me/results`, { waitUntil: "networkidle" });
    ok("결과 기록 목록에 그 응시가 있다", (await rp2.locator(`a[href^="/v3/${att}/result"]`).count()) > 0);
    const rp3 = await openPage(ctx, `${BASE}/v3/${att}/result`, errs);
    const h1b = (await rp3.locator("h1").first().innerText().catch(() => "")).trim();
    ok("재로그인 뒤 결과지가 같은 머리글로 열린다", h1b === headline.title);
    const pdf2 = await rp3.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 180000 });
    ok("재로그인 뒤 PDF 가 다시 내려온다", pdf2.status() === 200 && (pdf2.headers()["content-type"] ?? "").includes("pdf"), `${pdf2.status()}`);
    await rp3.goto(`${BASE}/me/experience`, { waitUntil: "networkidle" });
    ok("재로그인 뒤 경험 목록이 그대로다", (await rp3.locator("body").innerText()).includes(title));
    await rp3.goto(`${BASE}/v3/start`, { waitUntil: "domcontentloaded" });
    await rp3.waitForLoadState("networkidle").catch(() => undefined);
    ok("결과를 받은 뒤 /v3/start 는 새 응시를 열지 않고 지난 결과로 보낸다",
      new RegExp(`/v3/${att}/result`).test(rp3.url()), new URL(rp3.url()).pathname);
    ok("이 학생의 응시는 여전히 하나다",
      (await count(`SELECT count(*)::text n FROM v3_attempts WHERE user_id = $1::bigint`, [stu.id])) === 1);
    await rp3.close();

    /* ── 12. 권한 오류 ─────────────────────────────────────────── */
    head("12. 권한");
    const otherLogin = `zzr33o${Date.now().toString().slice(-7)}`;
    const other = await makeStudent(otherLogin);
    const octx = await mk();
    const op = await login(octx, otherLogin, other.pw);
    op.setDefaultTimeout(20000);
    const o1 = await op.request.get(`${BASE}/v3/${att}/result/pdf`, { maxRedirects: 0 }).catch(() => null);
    ok("다른 학생에게 PDF 가 막힌다", !!o1 && o1.status() !== 200, `${o1?.status()}`);
    const o2 = await op.goto(`${BASE}/v3/${att}/result`, { waitUntil: "domcontentloaded" }).catch(() => null);
    await op.waitForTimeout(600);
    const ob = await op.locator("body").innerText().catch(() => "");
    ok("다른 학생에게 결과 화면이 막힌다 (404 · 머리글이 새지 않는다)",
      (o2?.status() === 404 || !ob.includes(headline.title)), `${o2?.status()}`);
    const o3 = await op.goto(`${BASE}/v3/${att}?s=3`, { waitUntil: "domcontentloaded" }).catch(() => null);
    ok("다른 학생에게 응시 화면이 막힌다", o3?.status() === 404 || /\/(login|me|cores)/.test(op.url()), `${o3?.status()} ${new URL(op.url()).pathname}`);
    const o4 = await op.goto(`${BASE}/org/v3`, { waitUntil: "domcontentloaded" }).catch(() => null);
    await op.waitForTimeout(400);
    const o4b = await op.locator("body").innerText().catch(() => "");
    ok("학생은 담당자 집계 화면을 열 수 없다", (o4?.status() ?? 0) >= 400 || !/전공 진단 집계|완료율/.test(o4b) || !/\/org\/v3/.test(op.url()),
      `${o4?.status()} ${new URL(op.url()).pathname}`);
    await octx.close();
    for (const t of ["entitlements", "memberships", "analytics_events", "v3_attempts"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1`, [other.id]).catch(() => undefined);
    }
    await query(`DELETE FROM users WHERE id = $1`, [other.id]).catch(() => undefined);
    const anon = await mk();
    const ap = await anon.newPage();
    const a1 = await ap.request.get(`${BASE}/v3/${att}/result/pdf`, { maxRedirects: 0 }).catch(() => null);
    ok("로그인하지 않으면 PDF 가 막힌다", !!a1 && [302, 307, 401, 404].includes(a1.status()), `${a1?.status()}`);
    await ap.goto(`${BASE}/v3/${att}/result`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    ok("로그인하지 않으면 결과 화면이 로그인으로 간다", /\/login/.test(ap.url()), new URL(ap.url()).pathname);
    await anon.close();

    /* ── 13. PDF 오류 (그리는 쪽이 닿을 수 없는 주소) ──────────── */
    head("13. PDF 오류");
    const failBefore = await count(`SELECT count(*)::text n FROM job_failures WHERE kind = 'pdf' AND trace_id LIKE $1`, [`v3-pdf-%-${att}`]);
    await restartServer({ PDF_BASE: "http://127.0.0.1:9" }, "pdf-broken");
    const fp = await ctx.newPage();
    fp.setDefaultTimeout(30000);
    const bad13 = await fp.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 180000 });
    const badBody = await bad13.text();
    ok("PDF 를 못 만들면 503 과 사람이 읽는 안내가 선다 (날글자 오류가 아니다)",
      bad13.status() === 503 && /PDF를 만들지 못했습니다/.test(badBody) && /웹 결과 보기/.test(badBody), `${bad13.status()}`);
    const failAfter = await count(`SELECT count(*)::text n FROM job_failures WHERE kind = 'pdf' AND trace_id LIKE $1`, [`v3-pdf-%-${att}`]);
    ok("실패가 운영 표(job_failures)에 적힌다", failAfter === failBefore + 1, `${failBefore} → ${failAfter}`);
    const web13 = await fp.goto(`${BASE}/v3/${att}/result`, { waitUntil: "domcontentloaded" }).catch(() => null);
    ok("PDF 가 깨져도 웹 결과는 그대로 열린다", web13?.status() === 200);
    await fp.close();

    /* ── 14. 정상 재시작 → 자료 그대로 ─────────────────────────── */
    head("14. 서버 재시작 뒤");
    await restartServer({}, "final");
    const fp2 = await ctx.newPage();
    fp2.setDefaultTimeout(30000);
    const pdf3 = await fp2.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 180000 });
    ok("정상으로 다시 띄우면 PDF 가 다시 내려온다", pdf3.status() === 200, `${pdf3.status()}`);
    const after14 = {
      ans: await count(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1`, [att]),
      snap: await count(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id = $1`, [att]),
      exp: await count(`SELECT count(*)::text n FROM v3_experiences WHERE user_id = $1::bigint`, [stu.id]),
    };
    ok("재시작 전후로 답 · 결과 · 경험의 수가 같다",
      after14.ans === nAns && after14.snap === 1 && after14.exp === 1, `답 ${after14.ans} · 결과 ${after14.snap} · 경험 ${after14.exp}`);
    await fp2.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    ok("재시작 뒤 세션이 그대로 살아 있다", !/\/login/.test(fp2.url()));
    await fp2.close();
    ok("브라우저 오류 · 5xx 0", errs.length === 0, errs.slice(0, 2).join(" | ") || "없음");
    await ctx.close();
  } finally {
    await browser.close();
    /* 어느 자리에서 멈췌도 DB 와 서버는 켜 둔다 */
    try { pg("start"); } catch { /* 이미 켜져 있다 */ }
    if ((await health()) !== 200) await restartServer({}, "recover").catch(() => undefined);
  }

  note(`응시 ${att} · 아이디 ${sid} (비밀번호는 적지 않는다) · PDF ${pdfBytes} 바이트 · 계정과 응시를 남겨 둔다`);
  const summary = `확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`;
  writeFileSync(`${OUT}/e2e.json`, JSON.stringify({
    core: CORE, leaf: LEAF, attempt: att, login_id: sid, base: BASE,
    build: existsSync("var/.serving-build") ? readFileSync("var/.serving-build", "utf8").trim() : null,
    at: new Date().toISOString(), pass, fail: bad,
  }, null, 2));
  writeFileSync(`${OUT}/e2e.md`, [
    `# R33 운영 완성 E2E (${CORE} · ${LEAF})`, "",
    `- 서버: ${BASE} · 빌드 ${existsSync("var/.serving-build") ? readFileSync("var/.serving-build", "utf8").trim() : "?"} · 응시 ${att} · 아이디 ${sid}`,
    `- 날짜: ${new Date().toISOString()}`,
    "- 방식: 실제 브라우저(Chromium) · 실제 PostgreSQL. 저장 실패는 DB 를 실제로 멈춰서, PDF 오류는 서버를 닿을 수 없는 주소로 다시 띄워서 냈다.",
    ...rows.map((r) => (r.startsWith("## ") || r === "" ? r : `- ${r}`)), "", summary,
  ].join("\n"));
  console.log(`\n${summary}`);
  process.exit(bad.length ? 1 : 0);
}
void main().catch((e) => { console.error(e); process.exit(2); });
