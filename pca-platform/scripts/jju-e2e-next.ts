/**
 * 전주대 학생 하루를 **실제 Next 서버와 실제 Auth.js 로그인**으로 끝까지 밟는다.
 *
 * R3 의 `jju-report-http.ts` 는 라우트의 `GET` 을 node 서버에 꽂고 하네스 세션을
 * 썼다. 그것은 Auth.js 쿠키·미들웨어·302 를 재지 않는다. 여기서는 `stage-serve.sh`
 * 로 띄운 standalone 서버에 Chromium 으로 로그인하고, 화면을 찍고, DB 를 같이 센다.
 *
 * 차례: 로그인 → 홈(1440 · 390) → 트랙 고르기 → 검사 시작 → 몇 화면 저장 →
 * 브라우저를 닫고 다시 로그인해 이어하기 → 제출 → 결과 → Evidence/Gap →
 * 리포트 PDF 내려받기 → 사업단 현황 → 기관 격리 거절. 그리고 `jju-verify.ts`
 * 가 서로 다른 답으로 끝낸 A/B/C 세 학생으로 로그인해 각자의 PDF 를 받는다.
 *
 * **합성 QA 계정만 쓴다.** 비밀번호는 실행마다 새로 만들어 해시만 DB 에 두고
 * 어디에도 적지 않는다. **운영에서 돌지 않는다.**
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json \
 *   V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1,BIZ_CORE_V1 bash scripts/stage-serve.sh 3100
 *   APPLY=yes npx tsx scripts/jju-verify.ts          # A/B/C · 담당자 · PCU 쪽
 *   UI_BASE=http://127.0.0.1:3100 OUT=var/jju-ci/e2e npx tsx scripts/jju-e2e-next.ts
 */
import { assertCampusFixtureServer, assertFreshServer, BASE, loadEnv, login } from "./_loop-fixture";
loadEnv();

/* eslint-disable import/first */
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { appEnv } from "../src/lib/env";
import { hashPassword } from "../src/lib/password";
import { checkStudent, provisionStudent } from "../src/lib/campus/students";
import { assertLoginFree } from "../src/lib/jju/login-guard";
import { JJU_CODE, jjuUniversity, tracksOf } from "../src/lib/jju/program";
import { walk, enterAssessment } from "./_v3-walk";

const OUT = process.env.OUT ?? "var/jju-ci/e2e";
const SHOTS = `${OUT}/shots`;
const PDFS = `${OUT}/pdf`;
const TRACK = process.env.TRACK ?? "JJU1_AI";
const DESK = { width: 1440, height: 900 };
const MOB = { width: 390, height: 844 };

let pass = 0; const bad: string[] = []; const log: string[] = [];
const say = (s: string) => { console.log(s); log.push(s); };
const ok = (w: string, c: boolean, saw = "") => {
  if (c) pass++; else bad.push(w);
  say(`  ${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`);
};

type Shot = { n: string; file: string; viewport: string; path: string; what: string; sha: string };
const shots: Shot[] = [];

/** 찍는다. **같은 그림이 두 이름으로 저장되면** 자리를 잘못 찾은 것이라 걸린다 */
async function shoot(p: Page, n: string, what: string): Promise<void> {
  await p.waitForLoadState("networkidle").catch(() => undefined);
  const vp = p.viewportSize();
  const file = `${n}.png`;
  const buf = await p.screenshot({ path: `${SHOTS}/${file}`, fullPage: true });
  const sha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const dup = shots.find((s) => s.sha === sha);
  ok(`그림 ${n} 이 앞의 그림과 다르다`, !dup, dup ? `= ${dup.n}` : sha);
  shots.push({ n, file, viewport: `${vp?.width}x${vp?.height}`, path: new URL(p.url()).pathname + new URL(p.url()).search, what, sha });
}

/** 실행마다 새 비밀번호. 해시만 DB 에 두고 값은 이 과정의 메모리에만 있다 */
async function freshPw(loginId: string): Promise<string> {
  const pw = randomBytes(18).toString("base64url");
  const r = await queryOne<{ id: string }>(
    `UPDATE users SET password_hash = $2, status = 'active', must_reset_pw = FALSE
      WHERE login_id = $1 RETURNING id::text`, [loginId, await hashPassword(pw)]);
  if (!r) throw new Error(`${loginId} 가 없습니다. 먼저 APPLY=yes npx tsx scripts/jju-verify.ts`);
  return pw;
}

const answers = async (att: string) => Number((await queryOne<{ n: string }>(
  `SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1::bigint`, [att]))?.n ?? 0);

async function ctxOf(b: Browser, vp: typeof DESK): Promise<BrowserContext> {
  return b.newContext({ viewport: vp, deviceScaleFactor: vp === MOB ? 2 : 1, acceptDownloads: true });
}

/** 같은 로그인을 손전화 폭으로도 연다(쿠키를 옮긴다) */
async function mobileOf(b: Browser, desk: BrowserContext): Promise<BrowserContext> {
  const m = await ctxOf(b, MOB);
  await m.addCookies(await desk.cookies());
  return m;
}

/** 보이는 접는 자리를 펴서 그 안까지 찍히게 한다 */
async function unfold(p: Page): Promise<void> {
  for (const sel of ["button.rs-openbtn", "details:not([open]) > summary"]) {
    const n = await p.locator(sel).count();
    for (let i = 0; i < n; i += 1) {
      await p.locator(sel).nth(i).click({ timeout: 2000 }).catch(() => undefined);
    }
  }
  await p.waitForTimeout(300);
}

async function pdfOf(p: Page, att: string, who: string): Promise<{ status: number; type: string; disp: string; body: Buffer }> {
  const r = await p.request.get(`${BASE}/jju/report/${att}/pdf`, { timeout: 180000, maxRedirects: 0 });
  return { status: r.status(), type: r.headers()["content-type"] ?? "", disp: r.headers()["content-disposition"] ?? "", body: Buffer.from(await r.body()) };
  void who;
}

function pdfText(file: string): string {
  try { return execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" }); }
  catch { return ""; }
}

async function main(): Promise<void> {
  if (appEnv() === "production") throw new Error("운영에서 돌지 않는다");
  assertFreshServer();
  assertCampusFixtureServer(JJU_CODE);
  mkdirSync(SHOTS, { recursive: true }); mkdirSync(PDFS, { recursive: true });
  const u = jjuUniversity();
  const t = u && tracksOf(u).find((x) => x.code === TRACK);
  if (!t) throw new Error(`fixture 에 ${TRACK} 가 없다`);
  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [JJU_CODE]);
  if (!org) throw new Error("JJU 기관이 없다. 먼저 jju-verify.ts");

  /* ── 학생 D: 학교가 발급하는 길(provisionStudent) 그대로 만든 새 계정 ── */
  const LOGIN = "qa-jju-qad";
  const old = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id = $1`, [LOGIN]);
  if (old) {
    await query(`DELETE FROM v3_snapshots WHERE attempt_id IN (SELECT id FROM v3_attempts WHERE user_id=$1::bigint)`, [old.id]);
    await query(`DELETE FROM v3_attempts WHERE user_id=$1::bigint`, [old.id]);
  }
  const c = checkStudent(JJU_CODE, { student_id: "QAD", name: "QA 학생 D", login_id: LOGIN, department_code: TRACK });
  if (!c.ok) throw new Error(c.why);
  await assertLoginFree(LOGIN, JJU_CODE);
  const got = await provisionStudent(org.id, c.value, { rotate: true });
  const pwD = got.password ?? await freshPw(LOGIN);
  const browser = await chromium.launch();

  say("── 1. 로그인 · 홈 · 트랙 고르기 (1440 · 390)");
  {
    const d = await ctxOf(browser, DESK); const m = await ctxOf(browser, MOB);
    for (const [cx, tag] of [[d, "desktop"], [m, "mobile"]] as const) {
      const p = await cx.newPage();
      const r = await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
      ok(`로그인 쪽이 열린다 (${tag})`, (r?.status() ?? 0) === 200, String(r?.status()));
      await shoot(p, `01-login.${tag}`, "Auth.js 로그인 화면(로그인 전)");
      await p.close();
    }
    await d.close(); await m.close();
  }
  let desk = await ctxOf(browser, DESK);
  let p = await login(desk, LOGIN, pwD);
  ok("학생 D 가 실제 Auth.js 로 로그인한다", !new URL(p.url()).pathname.startsWith("/login"), new URL(p.url()).pathname);
  const sess = (await desk.cookies()).find((k) => /authjs\.session-token/.test(k.name));
  ok("세션 쿠키가 Auth.js 것이다(httpOnly)", !!sess && sess.httpOnly, sess?.name ?? "없음");
  {
    const mob = await mobileOf(browser, desk);
    for (const [cx, tag] of [[desk, "desktop"], [mob, "mobile"]] as const) {
      const q = await cx.newPage();
      const r = await q.goto(`${BASE}/jju`, { waitUntil: "networkidle" });
      ok(`전주대 홈이 열린다 (${tag})`, (r?.status() ?? 0) === 200, String(r?.status()));
      await shoot(q, `02-home.${tag}`, "전주대 학생 홈");
      await q.goto(`${BASE}/campus/jju/majors`, { waitUntil: "networkidle" });
      await shoot(q, `03-tracks.${tag}`, "트랙(전공) 고르기");
      await q.close();
    }
    await mob.close();
  }

  say("\n── 2. 검사 시작 · 저장");
  await p.goto(`${BASE}/campus/jju/d/${TRACK}?y=${t.cohort.year}`, { waitUntil: "networkidle" });
  await shoot(p, "04-track", `트랙 ${t.short} 상세`);
  await p.getByRole("button", { name: "검사 시작하기" }).click();
  await p.waitForURL(/\/v3\/start/, { timeout: 30000 }).catch(() => undefined);
  await shoot(p, "05-start", "검사 시작(학업 단계 고르기)");
  await p.getByText("학부", { exact: true }).click();
  await p.getByRole("button", { name: "검사 시작" }).click();
  await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  await enterAssessment(p);
  const m0 = /\/v3\/(\d+)/.exec(p.url());
  ok("응시가 열린다", !!m0, new URL(p.url()).pathname);
  if (!m0) throw new Error("응시가 열리지 않았다");
  const att = m0[1];
  const row = await queryOne<{ tier: string; core_code: string; university_code: string; department_code: string }>(
    `SELECT tier, core_code, university_code, department_code FROM v3_attempts WHERE id = $1::bigint`, [att]);
  ok("응시가 전주대 트랙 맥락·PRO 로 적힌다", row?.university_code === JJU_CODE && row?.department_code === TRACK
    && row?.tier === "PRO" && row?.core_code === t.core_code, JSON.stringify(row));
  await walk(p, 6);
  const saved = await answers(att);
  ok("몇 화면 답한 것이 DB 에 저장된다", saved > 0, `답 ${saved}개`);
  await shoot(p, "06-save", `저장된 상태(답 ${saved}개)`);

  say("\n── 3. 브라우저를 닫고 다시 로그인해 이어하기");
  const stopAt = p.url();
  await desk.close();
  desk = await ctxOf(browser, DESK);
  p = await login(desk, LOGIN, pwD);
  await p.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  await enterAssessment(p);
  const m1 = /\/v3\/(\d+)/.exec(p.url());
  ok("같은 응시로 돌아온다", m1?.[1] === att, `${new URL(p.url()).pathname} (멈춘 곳 ${new URL(stopAt).pathname}${new URL(stopAt).search})`);
  ok("저장한 답이 그대로다", (await answers(att)) === saved, `답 ${await answers(att)}개`);
  const n1 = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_attempts WHERE user_id=$1::bigint`, [got.userId]);
  ok("응시가 하나다", n1?.n === "1", n1?.n);
  await shoot(p, "07-resume.desktop", "다시 로그인 뒤 이어하기");
  {
    const mob = await mobileOf(browser, desk); const q = await mob.newPage();
    await q.goto(p.url(), { waitUntil: "networkidle" });
    await shoot(q, "07-resume.mobile", "이어하기(390)"); await mob.close();
  }

  say("\n── 4. 제출");
  const w = await walk(p, 500, {
    onFinish: async (btn, page) => {
      await shoot(page, "08-submit", "제출 직전 끝 화면");
      await Promise.all([
        page.waitForURL((x) => /\/(done|result)/.test(new URL(x).pathname), { timeout: 120000 }).catch(() => undefined),
        btn.click(),
      ]);
    },
  });
  ok("끝까지 간다", w.done, `화면 ${w.screens}`);
  for (let i = 0; i < 60; i += 1) {
    const s = await queryOne<{ status: string }>(`SELECT status FROM v3_attempts WHERE id=$1::bigint`, [att]);
    if (s?.status === "scored") break;
    await p.waitForTimeout(1000);
  }
  const fin = await queryOne<{ status: string; n: string }>(
    `SELECT a.status, (SELECT count(*) FROM v3_snapshots s WHERE s.attempt_id=a.id)::text n FROM v3_attempts a WHERE a.id=$1::bigint`, [att]);
  ok("제출되어 결과가 한 벌 굳는다", fin?.status === "scored" && fin.n === "1", JSON.stringify(fin));

  say("\n── 5. 결과 · Evidence/Gap");
  await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
  const body = await p.locator("body").innerText();
  ok("결과에 트랙 이름이 적힌다", body.includes(t.short), t.short);
  ok("결과에 안쪽 코드가 새지 않는다", !/\b(CS_CORE_V1|TD\d\d|SPEC_[A-Z_]+|Z[1-4]_[A-Z_]+)\b/.test(body));
  await shoot(p, "09-result.desktop", "결과 첫 화면");
  {
    const mob = await mobileOf(browser, desk); const q = await mob.newPage();
    await q.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await shoot(q, "09-result.mobile", "결과(390)"); await mob.close();
  }
  await unfold(p);
  for (const [id, n, what] of [["evidence", "10-evidence", "Evidence(내가 이미 가진 근거)"], ["gaps", "11-gap", "Gap(더 채울 부분)"]] as const) {
    const el = p.locator(`#${id}`).first();
    const there = (await el.count()) > 0 && await el.isVisible().catch(() => false);
    ok(`결과에 #${id} 절이 선다`, there);
    if (there) {
      await el.scrollIntoViewIfNeeded();
      const buf = await el.screenshot({ path: `${SHOTS}/${n}.png` });
      const sha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
      shots.push({ n, file: `${n}.png`, viewport: "1440x900 (절)", path: `/v3/${att}/result#${id}`, what, sha });
    }
  }

  say("\n── 6. 전주대 리포트 · PDF 내려받기");
  {
    const r = await p.goto(`${BASE}/jju/report/${att}`, { waitUntil: "networkidle" });
    ok("본인 웹 리포트 200", r?.status() === 200, String(r?.status()));
    await shoot(p, "12-report-web.desktop", "본인 전주대 리포트(웹)");
    const x = await pdfOf(p, att, "D");
    const head = x.body.subarray(0, 5).toString();
    ok("본인 PDF 200 · application/pdf · attachment · %PDF", x.status === 200 && x.type === "application/pdf"
      && /^attachment; filename="careermatri-jju-\d+\.pdf"$/.test(x.disp) && head.startsWith("%PDF"), `${x.status} ${x.type} ${x.disp} ${x.body.length}B`);
    if (x.status === 200) writeFileSync(`${PDFS}/jju-report-D.pdf`, x.body);
    /* 브라우저가 실제로 파일을 받는가: 링크를 눌러 Download 사건을 받는다 */
    const dl = await Promise.all([
      p.waitForEvent("download", { timeout: 180000 }),
      p.evaluate((href) => { const a = document.createElement("a"); a.href = href; a.textContent = "PDF"; document.body.append(a); a.click(); }, `/jju/report/${att}/pdf`),
    ]).then(([d]) => d).catch(() => null);
    ok("브라우저가 PDF 를 파일로 내려받는다", !!dl, dl?.suggestedFilename() ?? "download 사건 없음");
    if (dl) await dl.saveAs(`${PDFS}/jju-report-D.download.pdf`);
    await p.setContent(`<html><body style="font:16px sans-serif;padding:40px"><h1>PDF 내려받기 확인</h1>
      <p>요청: GET /jju/report/${att}/pdf (로그인한 본인)</p><p>상태: ${x.status}</p>
      <p>content-type: ${x.type}</p><p>content-disposition: ${x.disp}</p>
      <p>바이트: ${x.body.length} · 첫 다섯 바이트: ${head.replace(/[^\x20-\x7e]/g, "?")}</p>
      <p>브라우저 download 사건: ${dl ? dl.suggestedFilename() : "없음"}</p></body></html>`);
    await shoot(p, "13-pdf-download", "PDF 응답 헤더와 내려받기 사건(서버 응답에서 그대로 적음)");
  }

  say("\n── 7. 사업단 현황 (실제 로그인)");
  const pwAdmin = await freshPw("qa-jju-admin");
  {
    const a = await ctxOf(browser, DESK);
    const q = await login(a, "qa-jju-admin", pwAdmin);
    for (const [path, n, what] of [["/jju/admin", "14-admin.desktop", "사업단 현황"],
      ["/org/v3", "15-org-insights", "담당자 집계"], ["/org/v3/students", "16-org-students", "담당자 명단"]] as const) {
      const r = await q.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      ok(`${path} 가 담당자에게 열린다`, (r?.status() ?? 0) === 200, String(r?.status()));
      await shoot(q, n, what);
    }
    const txt = await q.locator("body").innerText();
    void txt;
    const mob = await mobileOf(browser, a); const mq = await mob.newPage();
    await mq.goto(`${BASE}/jju/admin`, { waitUntil: "networkidle" });
    await shoot(mq, "14-admin.mobile", "사업단 현황(390)"); await mob.close();
    const x = await pdfOf(q, att, "admin");
    ok("담당자도 계약·동의 없이 학생 PDF 를 열 수 없다(404)", x.status === 404 && !x.body.subarray(0, 4).toString().startsWith("%PDF"), String(x.status));
    const r = await q.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    ok("담당자가 학생 결과 쪽을 열 수 없다", (r?.status() ?? 0) === 404, String(r?.status()));
    await a.close();
  }

  say("\n── 8. 격리 거절");
  const pwB = await freshPw("qa-jju-qab");
  {
    const b = await ctxOf(browser, DESK);
    const q = await login(b, "qa-jju-qab", pwB);
    const r = await q.goto(`${BASE}/jju/report/${att}`, { waitUntil: "networkidle" });
    ok("같은 학교 학생 B 가 D 의 리포트를 열면 404", r?.status() === 404, String(r?.status()));
    await shoot(q, "17-deny-peer", "학생 B 가 학생 D 의 리포트를 연 화면(404)");
    const x = await pdfOf(q, att, "B");
    ok("학생 B 는 D 의 PDF 를 받지 못한다(404)", x.status === 404, String(x.status));
    await b.close();
  }
  const pwP = await freshPw("qa-pcu-admin");
  {
    const c2 = await ctxOf(browser, DESK);
    const q = await login(c2, "qa-pcu-admin", pwP);
    await q.goto(`${BASE}/jju/admin`, { waitUntil: "networkidle" });
    const txt = await q.locator("body").innerText();
    ok("배재대 담당자는 전주대 사업단 현황을 보지 못한다", txt.includes("전주대학교 사업단 계정이 아닙니다") && !txt.includes("QA 학생"), txt.slice(0, 80).replace(/\s+/g, " "));
    await shoot(q, "18-deny-pcu-admin", "배재대 담당자가 전주대 사업단 현황을 연 화면(거절)");
    const x = await pdfOf(q, att, "pcu");
    ok("배재대 담당자는 전주대 학생 PDF 를 받지 못한다(404)", x.status === 404, String(x.status));
    await c2.close();
  }
  {
    const anon = await ctxOf(browser, DESK);
    const q = await anon.newPage();
    const r = await q.request.get(`${BASE}/jju/report/${att}/pdf`, { maxRedirects: 0 });
    const loc = r.headers()["location"] ?? "";
    ok("로그인하지 않으면 PDF 대신 로그인으로 보낸다", [302, 303, 307].includes(r.status()) && loc.includes("/login"), `${r.status()} → ${loc}`);
    await q.goto(`${BASE}/jju/report/${att}`, { waitUntil: "networkidle" });
    ok("로그인 안 한 브라우저는 로그인 화면에 선다", new URL(q.url()).pathname.startsWith("/login"), new URL(q.url()).pathname);
    await shoot(q, "19-deny-anon", "로그인 없이 리포트를 연 화면(로그인으로 보냄)");
    await anon.close();
  }

  say("\n── 9. 학생 A/B/C: 다른 답 → 다른 결과 → 다른 PDF (실제 로그인)");
  const abc: Record<string, { att: string; sha: string; text: string; bytes: number }> = {};
  for (const k of ["A", "B", "C"]) {
    const loginId = `qa-jju-qa${k.toLowerCase()}`;
    const pw = k === "B" ? pwB : await freshPw(loginId);
    const a = await queryOne<{ id: string }>(
      `SELECT a.id::text FROM v3_attempts a JOIN users u ON u.id=a.user_id
        WHERE u.login_id=$1 AND a.status='scored' ORDER BY a.id DESC LIMIT 1`, [loginId]);
    if (!a) { ok(`${k} 의 끝낸 응시가 있다`, false); continue; }
    const cx = await ctxOf(browser, DESK);
    const q = await login(cx, loginId, pw);
    await q.goto(`${BASE}/v3/${a.id}/result`, { waitUntil: "networkidle" });
    await shoot(q, `20-abc-${k}-result`, `학생 ${k} 결과`);
    const x = await pdfOf(q, a.id, k);
    ok(`${k} PDF 200 · application/pdf · attachment · %PDF`, x.status === 200 && x.type === "application/pdf"
      && x.disp.startsWith("attachment;") && x.body.subarray(0, 4).toString() === "%PDF", `${x.status} ${x.body.length}B`);
    const file = `${PDFS}/jju-report-${k}.pdf`;
    if (x.status === 200) writeFileSync(file, x.body);
    abc[k] = { att: a.id, sha: createHash("sha256").update(x.body).digest("hex"), text: pdfText(file), bytes: x.body.length };
    if (k !== "A" && abc.A) {
      const y = await pdfOf(q, abc.A.att, k);
      ok(`${k} 는 A 의 PDF 를 받지 못한다(404)`, y.status === 404, String(y.status));
    }
    await cx.close();
  }
  const ks = Object.keys(abc);
  ok("세 PDF 의 바이트가 서로 다르다", new Set(ks.map((k) => abc[k].sha)).size === 3, ks.map((k) => `${k}:${abc[k].sha.slice(0, 10)}`).join(" "));
  const texts = ks.map((k) => abc[k].text.replace(/careermatri-jju-\d+|\d{4}[.-]\s?\d{1,2}[.-]\s?\d{1,2}|응시\s*\d+/g, ""));
  ok("응시번호·날짜를 빼도 세 PDF 의 글이 서로 다르다", texts.every((x) => x.length > 200) && new Set(texts).size === 3,
    ks.map((k) => `${k}:${abc[k].text.length}자`).join(" "));

  await browser.close();
  /* ── 남기기 ── */
  const idx = ["# 전주대 R5 브라우저 E2E 캡처", "",
    "실제 Next.js standalone 서버 · 실제 Auth.js 로그인 · Chromium. 합성 QA 계정. 비밀번호는 실행마다 새로 만들고 적지 않았다.", "",
    "| # | 파일 | 폭 | 주소 | 무엇 | sha256(16) |", "|---|---|---|---|---|---|",
    ...shots.map((s, i) => `| ${i + 1} | ${s.file} | ${s.viewport} | \`${s.path.replace(/\d{2,}/g, "{id}")}\` | ${s.what} | ${s.sha} |`), ""];
  writeFileSync(`${OUT}/SHOTS.md`, idx.join("\n"));
  writeFileSync(`${OUT}/abc-pdf.json`, JSON.stringify(Object.fromEntries(ks.map((k) => [k, { attempt: abc[k].att, sha256: abc[k].sha, bytes: abc[k].bytes, text_chars: abc[k].text.length }])), null, 1));
  writeFileSync(`${OUT}/jju-e2e-next.log`, log.join("\n") + `\n\nPASS ${pass} · FAIL ${bad.length}\n${bad.map((b) => "- " + b).join("\n")}\n`);
  say(`\n  캡처 ${shots.length}장 · PASS ${pass} · FAIL ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
