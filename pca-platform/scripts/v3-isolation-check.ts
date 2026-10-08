/**
 * User A 의 것이 User B 에게 보이는가.
 *
 * **파일럿 전에 반드시 한 번 돌리는 자리다.** 참가자 둘이 같은 배포본에
 * 들어오는데, 주소에 적힌 응시 번호를 하나 올려서 남의 결과가 열리면
 * 그 날 파일럿이 끝난다.
 *
 * 묻는 것 여섯이다. 응시 · 결과 · 종이 · 경험 · 결과 이력 · 운영 화면.
 *
 * **막히는 것만 세지 않는다.** 전부 막는 코드는 이 검사를 통과하면서
 * 산 사람도 못 보게 한다. 그래서 자리마다 **A 는 열리고 B 는 막힌다**를
 * 짝으로 센다.
 *
 * **비밀번호를 적어 두지 않는다.** 이 자리에서 만들어 이 과정 안에서만
 * 쓰고, 해시만 DB 에 남는다. 화면에도 찍지 않는다.
 *
 *   UI_BASE=http://127.0.0.1:3200 DATABASE_URL=... \
 *     npx tsx scripts/v3-isolation-check.ts
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* tsx 는 .env.local 을 자동으로 읽지 않는다 */
for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { chromium, type BrowserContext } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { addExperience, experiencesOf } from "../src/lib/me-v3/platform";
import { applyRecompute } from "../src/lib/me-v3/recompute";
import {
  attemptOf, checklistFor, choosePack, content, moveTo, openAttempt,
  saveAnswer, savePicks, submit, viewOf, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import type { Answer, Tier } from "../src/lib/me-v3/scoring/types";

const B = (process.env.UI_BASE || process.env.BASE
  || "http://127.0.0.1:3000").replace(/\/$/, "");
const GATE = process.env.STAGING_BASIC_AUTH || "";

let fail = 0, pass = 0;
const rows: { what: string; a: string; b: string; verdict: string }[] = [];
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

/* ── 사람 둘 ─────────────────────────────────────────────────────── */

type Who = { id: string; login: string; pw: string };

/** 그 사람에게 달린 줄을 전부 치우고 사람을 지운다 */
async function wipe(id: string): Promise<void> {
  for (const t of ["v3_attempts", "v3_experiences", "v3_actions",
                   "career_events", "career_profiles", "v3_applications",
                   "v3_track_interest", "v3_saved_jobs", "memberships",
                   "entitlements", "analytics_events"]) {
    await query(`DELETE FROM ${t} WHERE user_id = $1`, [id]).catch(() => undefined);
  }
  await query(`DELETE FROM users WHERE id = $1`, [id]).catch(() => undefined);
}

async function makeUser(tag: string): Promise<Who> {
  const login = `v3iso-${tag}@example.com`;
  /* **열쇠는 여기서 만든다.** 저장소에도 문서에도 로그에도 남지 않는다 */
  const pw = randomBytes(18).toString("base64url");
  const hash = await hashPassword(pw);
  /* 앞선 회차가 남긴 자료를 먼저 치운다. 응시가 사람을 붙들고 있어서
     사람만 지우면 외래키가 막는다 */
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [login]);
  if (old) await wipe(old.id);
  const row = await queryOne<{ id: string }>(
    /* **비밀번호 바꾸기로 보내지 않는다.** 그 자리로 튕기면 모든 요청이
       200 으로 돌아와 이 검사가 아무것도 재지 못한다 */
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,$2,$3,'active','ko',TRUE,FALSE) RETURNING id::text`,
    [login, `격리 점검 ${tag}`, hash]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, NULL, 'student')
       ON CONFLICT DO NOTHING`, [row?.id]).catch(() => undefined);
  return { id: row?.id as string, login, pw };
}

/* ── 응시 한 벌 ──────────────────────────────────────────────────── */

const strong = (id: string): Answer | null => {
  const it = content().bank.items.find((x) => x.item_id === id);
  if (!it) return null;
  if (it.response_scale === "L0~L3") return { kind: "level", index: 3 };
  if (it.response_scale === "5점") return { kind: "scale5", value: 5 };
  if (it.response_scale === "4보기") return { kind: "level", index: 2 };
  if (it.module === "CORE-FORCE") return { kind: "choice", value: "A" };
  if (it.module === "TRANS-10" || it.module === "TARGET") return { kind: "choice", value: "x" };
  return null;
};

async function playThrough(userId: string, tier: Tier): Promise<V3Attempt> {
  await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [userId]);
  const a0 = await openAttempt({
    userId, tier, stage: "bachelor", gradField: null });
  for (const d of content().domains.domains) {
    await saveAnswer(a0.id, `G_${d.code}_INT`, { kind: "scale5", value: 5 });
    await saveAnswer(a0.id, `G_${d.code}_EXP`, { kind: "exposure", value: 2 });
    await saveAnswer(a0.id, `G_${d.code}_LEA`, { kind: "scale5", value: 5 });
  }
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null, guard = 0;
  for (;;) {
    if ((guard += 1) > 400) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const ans = strong(id);
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain) {
      for (const g of checklistFor(v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
      }
    }
    if (v.screen.kind === "pick-industry") await choosePack(a.id, "industry", "INDUSTRY_MOBILITY_V2");
    if (v.screen.kind === "pick-role") await choosePack(a.id, "role", "ROLE_CAE_V2");
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
  const done = (await attemptOf(a.id, userId)) as V3Attempt;
  await submit(done);
  return (await attemptOf(a.id, userId)) as V3Attempt;
}

/* ── 브라우저 ────────────────────────────────────────────────────── */

async function login(ctx: BrowserContext, who: Who): Promise<string> {
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', who.login);
  await p.fill('input[type="password"]', who.pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => undefined);
  const at = new URL(p.url()).pathname;
  await p.close();
  return at;
}

type Hit = { code: number; at: string; asked: string; body: string };

async function hit(ctx: BrowserContext, path: string): Promise<Hit> {
  const p = await ctx.newPage();
  let code = 0, at = path, body = "";
  try {
    const r = await p.goto(B + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    code = r ? r.status() : 0;
    at = new URL(p.url()).pathname;
    body = (await p.content()).slice(0, 400_000);
  } catch (e) {
    body = String((e as Error).message);
  }
  await p.close();
  return { code, at, asked: path, body };
}

/**
 * 종이는 창으로 열지 않는다.
 *
 * `application/pdf` 는 브라우저가 **내려받기로 처리하고 이동을 끊는다**.
 * 그러면 멀쩡히 뽑힌 종이가 `열지 못했다` 로 적힌다. 쿠키를 같이 쓰는
 * 요청으로 받아 상태와 꼴을 본다.
 */
async function hitFile(ctx: BrowserContext, path: string): Promise<Hit> {
  try {
    const r = await ctx.request.get(B + path, { timeout: 120_000 });
    const type = r.headers()["content-type"] ?? "";
    const n = (await r.body()).length;
    return { code: r.status(), at: type.includes("pdf") && n > 20_000 ? path : "",
             asked: path, body: `${type} ${n}B` };
  } catch (e) {
    return { code: 0, at: "", asked: path, body: String((e as Error).message) };
  }
}

/**
 * 남의 것이 열렸는가.
 *
 * **200 만 보지 않는다.** 로그인이나 비밀번호 바꾸기로 튕긴 자리도 200 으로
 * 돌아오므로, **물어본 주소에 그대로 서 있는지**를 함께 본다.
 */
const opened = (h: Hit) => h.code === 200 && h.at === h.asked;

function pair(what: string, mine: Hit, theirs: Hit): void {
  const good = opened(mine) && !opened(theirs);
  rows.push({
    what,
    a: opened(mine) ? "열림" : `막힘(${mine.code}${mine.at !== "" ? ` → ${mine.at}` : ""})`,
    b: opened(theirs) ? `열림(${theirs.code})` : `막힘(${theirs.code} → ${theirs.at})`,
    verdict: good ? "PASS" : "FAIL",
  });
  ok(what, good, `A ${mine.code} · B ${theirs.code} → ${theirs.at}`);
}

/* ── 본문 ────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const A = await makeUser("a");
  const Bu = await makeUser("b");
  console.log(`  사람 둘 — A ${A.id} · B ${Bu.id}\n`);

  const aAttempt = await playThrough(A.id, "PRO");
  const bAttempt = await playThrough(Bu.id, "BASIC");
  ok("A 와 B 가 각자 응시를 끝냈다",
     aAttempt.status === "scored" && bAttempt.status === "scored",
     `A ${aAttempt.id}/${aAttempt.status} · B ${bAttempt.id}/${bAttempt.status}`);

  /* A 쪽에만 경험을 적고 다시 계산한다. B 의 화면에 그 제목이 보이면 실패다 */
  const title = `격리 점검 경험 ${randomBytes(4).toString("hex")}`;
  const doms = content().domains.domains;
  const td = doms[0].code;
  const aExp = await addExperience(A.id, {
    kind: "capstone", title, td_codes: [td],
    problems: [], decisions: [], artifacts: (doms[0].artifacts ?? []).slice(0, 1),
    verifications: (doms[0].verify_targets ?? []).slice(0, 1),
    used_where: [],
  });
  await applyRecompute(A.id).catch(() => undefined);

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const gate = GATE.includes(":")
    ? { username: GATE.split(":")[0], password: GATE.slice(GATE.indexOf(":") + 1) } : null;
  const ctxA = await browser.newContext(gate ? { httpCredentials: gate } : {});
  const ctxB = await browser.newContext(gate ? { httpCredentials: gate } : {});

  try {
    ok("A 로 로그인된다", !(await login(ctxA, A)).startsWith("/login"));
    ok("B 로 로그인된다", !(await login(ctxB, Bu)).startsWith("/login"));

    /* 1. 응시 */
    pair("응시 — 남의 응시 화면이 열리지 않는다",
         await hit(ctxA, `/v3/${aAttempt.id}`), await hit(ctxB, `/v3/${aAttempt.id}`));
    /* 2. 결과 */
    const aRes = await hit(ctxA, `/v3/${aAttempt.id}/result`);
    const bRes = await hit(ctxB, `/v3/${aAttempt.id}/result`);
    pair("결과 — 남의 결과지가 열리지 않는다", aRes, bRes);
    /* 3. 종이 */
    pair("PDF — 남의 결과지 PDF 가 열리지 않는다",
         await hitFile(ctxA, `/v3/${aAttempt.id}/result/pdf`),
         await hitFile(ctxB, `/v3/${aAttempt.id}/result/pdf`));
    /* 4. 경험 */
    const aExpPage = await hit(ctxA, "/me/experience");
    const bExpPage = await hit(ctxB, "/me/experience");
    const aSees = aExpPage.body.includes(title);
    const bSees = bExpPage.body.includes(title);
    rows.push({ what: "경험 — 남이 적은 경험이 보이지 않는다",
                a: aSees ? "보인다" : "안 보인다", b: bSees ? "보인다" : "안 보인다",
                verdict: aSees && !bSees ? "PASS" : "FAIL" });
    ok("경험 — 남이 적은 경험이 보이지 않는다", aSees && !bSees,
       `A ${aSees ? "보임" : "안 보임"} · B ${bSees ? "보임" : "안 보임"}`);
    /* 서버 함수 쪽도 본다. 화면이 거르는 것과 질의가 거르는 것은 다르다 */
    const bList = await experiencesOf(Bu.id);
    ok("경험 — 질의가 남의 줄을 돌려주지 않는다",
       !bList.some((x) => x.id === aExp), `B 의 경험 ${bList.length}개`);
    /* 5. 결과 이력 */
    const aMe = await hit(ctxA, "/me");
    const bMe = await hit(ctxB, "/me");
    const leak = bMe.body.includes(`/v3/${aAttempt.id}/result`);
    rows.push({ what: "결과 이력 — 남의 결과가 내 대시보드에 없다",
                a: aMe.body.includes(`/v3/${aAttempt.id}/result`) ? "내 것이 걸린다" : "안 걸린다",
                b: leak ? "남의 것이 걸린다" : "안 걸린다",
                verdict: !leak ? "PASS" : "FAIL" });
    ok("결과 이력 — 남의 결과가 내 대시보드에 없다", !leak);
    /* 6. 운영 화면 */
    const bAdmin = await hit(ctxB, "/admin/v3-pilot");
    rows.push({ what: "운영 — 일반 사용자가 파일럿 운영 화면을 못 본다",
                a: "—", b: opened(bAdmin) ? `열림(${bAdmin.code})` : `막힘(${bAdmin.code} → ${bAdmin.at})`,
                verdict: opened(bAdmin) ? "FAIL" : "PASS" });
    ok("운영 — 일반 사용자가 파일럿 운영 화면을 못 본다", !opened(bAdmin),
       `${bAdmin.code} → ${bAdmin.at}`);

    /* 굳은 결과가 남의 재분석으로 바뀌지 않는다 */
    const snap = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_snapshots s
         JOIN v3_attempts t ON t.id = s.attempt_id WHERE t.user_id = $1`, [Bu.id]);
    ok("B 의 스냅샷이 A 의 재분석으로 늘지 않았다", snap?.n === "1", `${snap?.n}줄`);
  } finally {
    await browser.close();
    for (const u of [A.id, Bu.id]) await wipe(u);
    console.log("\n  치웠다  점검용 사람 둘과 그 자료를 지웠다");
  }

  console.log(`\n| 자리 | A | B | 판정 |`);
  console.log(`|---|---|---|---|`);
  for (const r of rows) console.log(`| ${r.what} | ${r.a} | ${r.b} | ${r.verdict} |`);
  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  await query("SELECT 1");
  process.exit(fail ? 1 : 0);
}

void main();
