/**
 * **Owner Test 를 시작해도 되는가.** 사람이 눌러 보기 전에 기계가 먼저 센다.
 *
 * 이 파일이 보는 것은 배포가 아니라 **그 배포본 안에서 도는 제품**이다.
 * 네 묶음이고, 전부 지난 회차에 실제로 깨졌던 자리다.
 *
 *   12. 로그인한 사람이 작업공간으로 가는가 (`/my` 가 아니라 `/me`)
 *   13. 경험이 실제로 저장되고 목록과 지금 상태까지 가는가
 *   14. production build 에서 hydration 과 DOM 중첩 오류가 0 인가
 *   15. 손님 화면에 내부 코드가 한 글자도 없는가
 *
 * **열쇠는 이 자리에서 만들고 해시만 남긴다.** 저장소에도 문서에도 로그에도
 * 적지 않는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-owner-gate.ts
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { fillExperience } from "./_loop-fixture";
import { enterAssessment } from "./_v3-walk";
import { defaultCore, sellableCores } from "../src/lib/me-v3/core-registry";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { CM_NAV } from "../src/app/me/nav";

const B = (process.env.UI_BASE || process.env.BASE
  || "http://127.0.0.1:3000").replace(/\/$/, "");
const GATE = process.env.STAGING_BASIC_AUTH || "";
const LOGIN = "v3gate@example.com";

/** 응시자에게 보이면 안 되는 모양. 영역·축·역할·문항 번호와 판본 이름 */
const INTERNAL: RegExp[] = [
  /\bTD\d{2}\b/, /\bOC[1-9]\b/, /\bRF\d\b/, /\bJ[1-8]\b/,
  /\bTR_[A-Z0-9_]+\b/, /\b[A-Z]{2,4}_[A-Z0-9]{2,}\b/,
  /ME_V3|ITEM_BANK|me-v3-scoring|result-model/,
];

/**
 * **떠 있는 서버가 지금 몇 전공을 열어 두었는가.**
 *
 * 전공을 아직 고르지 않은 학생이 로그인해서 가는 자리는 그 수가 정한다:
 * 하나면 작업공간 첫 화면(`/me`)이고, 둘 이상이면 고르는 자리(`/cores`)다.
 * 둘 다 작업공간 안이고 둘 다 맞는 상태라, **그 수를 보지 않고 한쪽만
 * 요구하면 멀쩡한 배포본이 걸린다**(운영 Canary 로 경영학을 열고 나서
 * 실제로 그렇게 걸렸다).
 *
 * 그 수를 정하는 것은 이 과정이 아니라 **서버의** 환경(`V3_PREVIEW_OPEN`)
 * 이므로, 띄우는 쪽이 `var/.serving-preview` 에 적어 둔 것을 읽어 같은
 * 값으로 센다. 느슨하게 세는 것이 아니다: 어느 쪽을 요구할지가 그 값으로
 * **못 박힌다.**
 */
function openCoreCount(): number {
  try {
    /* **빈 값도 그대로 쓴다.** 띄운 쪽이 미리보기 없이 띄웠다는 뜻이고,
       그때 이 과정의 환경(`V3_PREVIEW_OPEN`)을 그대로 두면 서버가 열지
       않은 전공까지 세어 **기대하는 자리를 거꾸로 적는다** */
    process.env.V3_PREVIEW_OPEN =
      readFileSync(resolve(process.cwd(), "var/.serving-preview"), "utf8").trim();
  } catch { /* 적어 둔 것이 없다. 이 과정의 환경으로 센다 */ }
  return sellableCores("KR").length;
}

let pass = 0, fail = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? ` — ${d}` : ""}`); }
}

/**
 * 학생 계정을 그 자리에서 만든다.
 *
 * **`me-admin` 으로 재지 않는다**: 그 계정은 기관 담당자라 첫 화면이
 * `/org` 이고, 그것이 맞는 동작이다. `로그인하면 작업공간으로 간다` 는
 * **학생에게** 물어야 하는 질문이다.
 */
async function makeStudent(): Promise<{ id: string; pw: string }> {
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [LOGIN]);
  if (old) {
    for (const t of ["v3_attempts", "v3_experiences", "v3_actions", "career_events",
                     "career_profiles", "memberships", "entitlements", "analytics_events"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1`, [old.id]).catch(() => undefined);
    }
    await query(`DELETE FROM users WHERE id = $1`, [old.id]).catch(() => undefined);
  }
  const pw = randomBytes(18).toString("base64url");
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,'Owner Test 전 점검',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
    [LOGIN, await hashPassword(pw)]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, NULL, 'student')
       ON CONFLICT DO NOTHING`, [row?.id]).catch(() => undefined);
  return { id: row?.id as string, pw };
}

async function login(ctx: BrowserContext, who: string, pw: string): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', who);
  await p.fill('input[type="password"]', pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
    .catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  return p;
}

async function main(): Promise<void> {
  const stu = await makeStudent();
  const browser: Browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const gate = GATE.includes(":")
    ? { username: GATE.split(":")[0], password: GATE.slice(GATE.indexOf(":") + 1) } : null;
  const opts = gate ? { httpCredentials: gate } : {};

  /** hydration 과 DOM 중첩만 모은다. 네트워크 404 는 다른 질문이다 */
  const errs: string[] = [];
  /* **어느 쪽인지를 함께 적는다.** 전에는 오류 글만 모아서, 걸렸을 때
     쪽 열두 곳 가운데 어디인지 사람이 다시 찾아다녀야 했다. React 는
     운영 빌드에서 메시지를 줄여 내보내므로 더 그렇다 */
  const where = (pg: { url: () => string }) => new URL(pg.url()).pathname;
  const watch = (ctx: BrowserContext) => {
    ctx.on("page", (pg) => {
      pg.on("pageerror", (e) =>
        errs.push(`${where(pg)} pageerror ${String(e.message).slice(0, 110)}`));
      pg.on("console", (m) => {
        if (m.type() !== "error") return;
        const t = m.text();
        if (/hydrat|#418|#419|#423|#425|validateDOMNesting|did not match/i.test(t)) {
          errs.push(`${where(pg)} console ${t.slice(0, 130)}`);
        }
      });
    });
  };

  try {
    /* ── 12. 로그인한 사람이 작업공간으로 가는가 ─────────────────── */
    console.log("\n── 12. Workspace");
    const c1 = await browser.newContext({ ...opts, viewport: { width: 1440, height: 900 } });
    watch(c1);
    const p = await login(c1, LOGIN, stu.pw);
    const at = new URL(p.url()).pathname;
    const opened = openCoreCount();
    /* 전공을 고르지 않은 학생의 자리는 열린 전공 수가 정한다. 하나면
       `/me`, 둘 이상이면 고르는 자리다. 아래 12b 가 **고른 뒤에는 늘
       `/me` 인 것**을 따로 센다 */
    const land = opened === 1 ? "/me" : "/cores";
    ok("학생이 로그인하면 작업공간으로 간다", at === land,
      `${at} · 열린 전공 ${opened} · 기대 ${land}`);
    if (land === "/cores") {
      const pick = await p.evaluate(() => document.body.innerText);
      ok("전공을 고르는 자리가 선다", /전공을 선택|사용 가능한 전공/.test(pick),
        pick.replace(/\s+/g, " ").slice(0, 60));
    }

    const nav = await p.$eval("body", (e) => e.textContent ?? "").catch(() => "");
    /* 띠의 이름은 `me/nav.ts` 가 들고 있다. 여기 글자로 적어 두면 이름을
       고친 날 멀쩡한 화면이 걸린다 */
    ok("작업공간 띠가 선다",
      CM_NAV.every((x) => nav.includes(x.label)), `줄 ${CM_NAV.length}`);
    ok("검사 전인 사람에게 옛 검사가 주된 길로 서지 않는다",
      !(await p.$('a[href="/test"], a[href^="/test?"]')));

    for (const [path, want] of [
      ["/me/results", /결과 기록|검사 당시|아직/],
      ["/me/state", /현재 상태|설명할 수 있는 경험|아직/],
      ["/me/next", /다음 할 일|할 수 있는 때|아직/],
      ["/me/experience", /경험/],
      ["/me/explore", /산업|직무/],
      ["/me/track", /Track|준비 중/],
      ["/my/account", /계정|비밀번호|파기/],
      /* **계정 영역의 두 쪽도 본다.** 옛 응시를 이어하는 줄이 여기 있고,
         그 줄의 주소를 `resumePathFor` 로 옮기면서 markup 이 바뀌었다.
         바뀐 자리를 아무 검사도 열어 보지 않으면 다음에 또 바뀐다 */
      ["/my", /계정|로그인|결제/],
      ["/my/assessments", /응시|검사|아직/],
    ] as const) {
      const r = await p.goto(B + path, { waitUntil: "networkidle" });
      const txt = await p.evaluate(() => document.body.innerText);
      ok(`${path} 가 열리고 그 쪽의 글이 선다`,
        r?.status() === 200 && want.test(txt), `${r?.status()}`);
    }

    /* ── 12b. 전공을 고른 뒤에는 늘 작업공간 첫 화면이다 ─────────── */
    /**
     * **고르는 자리에서 실제로 골라 본다.**
     *
     * 위의 열두 줄은 전공을 **아직 고르지 않은** 학생을 재고, 여기서부터는
     * 고른 학생을 잰다. 두 처지가 다른 화면을 받는 것이 맞고, 한쪽만 재면
     * 다른 쪽이 깨진 줄 아무도 모른다. 고르는 길은 제품의 길 그대로다:
     * 전공 목록 → 검사 시작 → 학업 단계 → 응시.
     *
     * **경험을 적는 자리는 전공이 정해진 뒤에만 선다**: 걸음 2가 그 전공의
     * 기술영역을 묻기 때문이다. 그래서 아래 열세 줄도 이 자리를 지나야
     * 뜻이 있다.
     */
    console.log("\n── 12b. 전공 고르기");
    await p.goto(`${B}/cores`, { waitUntil: "networkidle" });
    /* **기본 전공이 아닌 자리를 고른다.** 첫 카드는 `defaultCore()` 와
       같아서, 고른 값을 들고 가지 않아도 그 자리가 열린다. 그러면 이 줄이
       아무것도 세지 않는다. 열린 전공이 하나뿐이면 고를 것이 하나이므로
       그때는 그 하나다 */
    const cards = p.locator('a[href^="/v3/start"]');
    const card = cards.nth(Math.max(0, (await cards.count()) - 1));
    const href = await card.getAttribute("href").catch(() => null);
    ok("전공 카드가 고른 전공을 들고 간다", /\/v3\/start\?core=[A-Z0-9_]+/.test(href ?? ""),
      href ?? "링크 없음");
    await Promise.all([
      p.waitForURL(/\/v3\/start/, { timeout: 30000 }).catch(() => undefined),
      card.click().catch(() => undefined),
    ]);
    /* **이름표를 누른다.** 보기의 `input` 은 숨어 있고 눌리는 자리가
       이름표다(`v3:owner` 와 같은 까닭) */
    await p.locator('label:has(input[name="stage"][value="bachelor"])').first()
      .click().catch(() => undefined);
    await Promise.all([
      p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
      p.locator('button[type="submit"]').last().click({ force: true })
        .catch(() => undefined),
    ]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await enterAssessment(p);
    const started = /\/v3\/\d+/.test(p.url());
    ok("고른 전공으로 응시가 열린다", started, new URL(p.url()).pathname);
    /* **고른 전공이 그 응시 줄에 적혔는가.** 화면이 그 전공 이름을 적는
       것과 응시 줄이 그 Core 를 들고 있는 것은 다른 질문이다 */
    const wantCore = (href ?? "").split("core=")[1] ?? "";
    const row = await queryOne<{ core: string }>(
      `SELECT core_code AS core FROM v3_attempts
        WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [stu.id]);
    ok("응시 줄에 고른 전공이 적힌다", !!wantCore && row?.core === wantCore,
      `${row?.core ?? "없음"} ← ${wantCore || "없음"} · 기본 ${defaultCore()}`);

    const c2 = await browser.newContext({ ...opts, viewport: { width: 1440, height: 900 } });
    watch(c2);
    const p2 = await login(c2, LOGIN, stu.pw);
    ok("전공을 고른 학생은 로그인하면 작업공간 첫 화면이다",
      new URL(p2.url()).pathname === "/me", new URL(p2.url()).pathname);
    await c2.close();

    /* ── 13. 경험이 실제로 저장되는가 ────────────────────────────── */
    console.log("\n── 13. 경험 저장");
    await p.goto(`${B}/me/experience/new`, { waitUntil: "networkidle" });
    const title = `점검 경험 ${randomBytes(3).toString("hex")}`;
    /* **달까지만 받는다**(ME 기준 UX §2). 브라우저 기본 달 고르기를
       걷고 `[연도] [월]` 고르기 둘로 받으므로, 세는 것은 그 둘이 서는가와
       **날을 받는 칸이 없는가**다. 날을 받기 시작하면 적는 사람이 기억에
       없는 자리를 채워야 한다 */
    const ySel = await p.$('select[name="started_on_y"]');
    const mSel = await p.$('select[name="started_on_m"]');
    const dayBox = await p.$('input[type="date"], input[type="month"]');
    ok("달까지만 받는 고르기 둘이 선다", !!ySel && !!mSel && !dayBox,
      `연도 ${!!ySel} · 월 ${!!mSel} · 날 칸 ${!!dayBox}`);
    /* **`아직 진행 중` 이 끝난 달 자리에 있다.** 비어 있는 것이 전부터
       `아직 안 끝났다` 를 뜻하므로(`ended_on IS NULL`), 그 뜻을 화면이
       글자로 들고 있어야 비워 둔 사람이 자기가 빠뜨린 줄로 읽지 않는다 */
    const onBox = await p.$('input[name="ongoing"]');
    ok("`아직 진행 중` 을 고를 자리가 있다", !!onBox);
    /* **폼을 여기서 적지 않는다.** 세 걸음짜리 폼을 누르는 줄을 검사마다
       따로 들고 있으면, 걸음이 넷이 되는 날 한 곳만 고쳐진다. 그리고
       가린 판의 칸은 눌리지 않으므로 `다음` 을 거치지 않고 고르면
       **아무것도 골리지 않은 채로 저장된다**(`2025-03` 이 `DATE` 칸에서
       거절되던 자리도 그 함수가 같이 든다) */
    const picked = await fillExperience(p, title);
    ok("기술영역이 실제로 골라졌다", picked > 0, `${picked}개`);
    const after = await p.evaluate(() => document.body.innerText);
    const bad = /오류가|문제가 생겼|Application error|Internal Server/.test(after);
    ok("저장에서 오류 화면이 뜨지 않는다", !bad,
      bad ? after.replace(/\s+/g, " ").slice(0, 90) : new URL(p.url()).pathname);

    await p.goto(`${B}/me/experience`, { waitUntil: "networkidle" });
    const list = await p.evaluate(() => document.body.innerText);
    ok("경험 목록에 방금 적은 것이 선다", list.includes(title),
      list.includes(title) ? title : "목록에 없다");

    const st = await p.goto(`${B}/me/state`, { waitUntil: "networkidle" });
    ok("현재 상태가 열린다", st?.status() === 200, `${st?.status()}`);

    /* ── 14. hydration 과 DOM 중첩 ───────────────────────────────── */
    console.log("\n── 14. hydration · DOM 중첩");
    const PAGES = ["/me", "/me/results", "/me/state", "/me/next", "/me/experience",
      "/me/experience/new", "/me/explore", "/me/region", "/me/track", "/me/apply",
      "/cores", "/v3/start"];
    for (const path of PAGES) {
      await p.goto(B + path, { waitUntil: "networkidle" });
      await p.waitForTimeout(250);
    }
    ok("hydration·DOM 중첩 오류 0", errs.length === 0,
      errs.length ? errs.slice(0, 2).join(" / ") : `쪽 ${PAGES.length}자리`);

    /* ── 15. 내부 코드 ───────────────────────────────────────────── */
    console.log("\n── 15. 내부 코드");
    const leaks: string[] = [];
    for (const path of PAGES) {
      await p.goto(B + path, { waitUntil: "networkidle" });
      const t = await p.evaluate(() => document.body.innerText);
      for (const re of INTERNAL) {
        const m = t.match(re);
        if (m) leaks.push(`${path}: ${m[0]}`);
      }
    }
    ok("손님 화면에 내부 코드가 없다", leaks.length === 0,
      leaks.length ? leaks.slice(0, 3).join(" · ") : `쪽 ${PAGES.length}자리`);
    await c1.close();
  } finally {
    await browser.close();
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  console.log("\n  이 결과는 **이 기계의 배포본**에서 돈 것입니다. 운영 배포본을");
  console.log("  밖에서 눌러 보는 것은 docs/metri/75_owner_gate.md 가 맡습니다.\n");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
