/**
 * **웹 결과지가 종이 문서를 그대로 펼쳐 놓고 있는가.**
 *
 * 운영에서 과거 결과를 열었을 때 오른쪽 스크롤이 끝없이 내려갔다. 쪽은
 * 200 이고 가로 넘침도 없고 내부 코드도 안 보이므로 **지금까지의 어느
 * 검사도 세지 않았다.** 상태코드로는 멀쩡한 화면이 종이 열세 장을 한
 * 쪽에 펼쳐 놓은 상태였다.
 *
 * 제품 방향은 둘로 갈려 있다.
 *
 *   웹  빠르게 이해하고 필요한 것만 펼친다
 *   종이 전체 상세 보고서
 *
 * 그래서 여기가 재는 것은 **처음 로드된 상태의 문서 높이**다. 고정
 * 픽셀을 박지 않고 창 높이 대비 비율로 센다: 폭과 글꼴이 바뀌면 픽셀은
 * 따라 움직이지만 `이 화면이 창 몇 개 분량인가` 는 그대로 남는다.
 *
 * 다섯 가지다(규격 §6).
 *
 *   A document height regression  초기 높이가 창 대비 몇 배인가
 *   B collapsed integrity         부록과 상세가 처음에 접혀 있는가
 *   C PDF independence            접어도 종이에는 전부 들어가는가
 *   D legacy compatibility        옛 결과가 500 없이 열리고 다 펼쳐지는가
 *   E V3 separation               두 판본이 renderer 를 섞어 쓰지 않는가
 *
 * **접는 것으로 세지 않는다.** 높이만 재면 `max-height: 300px; overflow:
 * hidden` 한 줄로 통과한다. 그래서 펼친 뒤의 높이도 같이 재서 **접기가
 * 실제로 내용을 담고 있는 drill-down 인지** 본다. 가려 둔 화면은 펼쳐도
 * 높이가 늘지 않는다.
 *
 * **열쇠는 이 자리에서 만들고 해시만 남긴다.** 저장소에도 문서에도
 * 로그에도 적지 않는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-result-height.ts
 */
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

import { BASE, cloneFinished, gateCreds, login, makeStudent } from "./_loop-fixture";
import { chromium, type Browser, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

/** 창 하나. 데스크톱 기준이 1440 × 900 이다(규격 §5) */
const VW = 1440, VH = 900;
/** 손전화. 아래 띠가 걸음 단추를 덮는지까지 보는 폭이다 */
const MW = 390, MH = 844;

/**
 * 초기 상태가 창 몇 개를 넘으면 걸린다.
 *
 * **이 수는 종이 쪽수와 무관해야 한다.** 그것이 이 검사의 요지다: 종이가
 * 열세 장이어도 웹의 첫 상태는 요약이므로 같은 한도 안에 들어온다. 6 은
 * `요약 + 할 일 + 단추 + 접힌 머리 열 줄` 이 넉넉히 들어가는 자리이고,
 * 본문을 펼쳐 놓으면 그 곱절을 넘는다(고치기 전 옛 결과가 14.9배였다).
 */
const RATIO_MAX = 6;
/** 펼치면 적어도 이만큼은 늘어나야 **담긴 내용을 접은 것**이다 */
const EXPAND_MIN = 1.6;

/** 주석을 걷고 코드만 본다. **`왜 지웠는가` 를 적어 둔 기록을 세면
 *  맞는 기록을 지우라고 요구하게 된다** */
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^[ \t]*\/\/.*$/gm, " ");

let pass = 0, fail = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? ` — ${d}` : ""}`); }
}

/**
 * 옛 판본 결과 하나를 열 수 있게 만든다.
 *
 * **그 결과를 고치지 않는다.** 응시도 응답도 굳은 결과도 그대로이고,
 * 바꾸는 것은 그 계정의 비밀번호 해시 하나다. 옛 결과는 시드가 만든 것이라
 * 열쇠를 아무도 들고 있지 않다.
 *
 * **아이디는 학번이거나 이메일이다**(`auth.ts` 의 `findUserByIdentifier`).
 * 시드가 만든 옛 계정에는 학번이 없어서 학번만 읽으면 빈 값으로 로그인을
 * 시도하고, 그 자리에서 검사가 멈춘다.
 */
async function legacyFixture(): Promise<
  { id: string; login: string; pw: string; tier: string; sheets: number } | null
> {
  const row = await queryOne<{
    id: string; uid: string; login: string; tier: string; sheets: string | null;
  }>(
    `SELECT a.id::text, a.user_id::text AS uid,
            COALESCE(u.login_id, u.email) AS login, a.tier,
            (rs.payload->>'sheets') AS sheets
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN report_snapshots rs ON rs.attempt_id = a.id
      WHERE a.status = 'scored' AND a.assessment_version = 'ME_V2'
        AND rs.payload IS NOT NULL
      ORDER BY a.id DESC LIMIT 1`);
  if (!row) return null;
  const pw = randomBytes(18).toString("base64url");
  await query(
    `UPDATE users SET password_hash = $2, must_reset_pw = FALSE WHERE id = $1`,
    [row.uid, await hashPassword(pw)]);
  return { id: row.id, login: row.login, pw, tier: row.tier,
    sheets: Number(row.sheets ?? 0) };
}

/** 문서 높이. **창 높이로 나눠 적는다** */
async function docRatio(p: Page, vh: number): Promise<{ h: number; r: number }> {
  const h = await p.evaluate(() => Math.max(
    document.documentElement.scrollHeight, document.body.scrollHeight));
  return { h, r: Math.round((h / vh) * 10) / 10 };
}

/** 옛 결과지 창이 다 그려질 때까지 기다린다 */
async function waitLegacy(p: Page): Promise<void> {
  const fr = p.frameLocator("iframe.rpframe");
  await fr.locator(".rpage, .rpwait").first().waitFor({ timeout: 30000 });
  await p.waitForTimeout(1200);
}

async function run(browser: Browser): Promise<void> {
  const gate = gateCreds();
  const extra = gate ? { httpCredentials: gate } : {};

  /* ── 옛 판본 (ME_V2) ──────────────────────────────────────────── */
  const lg = await legacyFixture();
  if (!lg) {
    ok("옛 판본 결과 하나를 찾았다", false, "ME_V2 결과가 이 DB 에 없습니다");
    return;
  }
  const lctx = await browser.newContext({ viewport: { width: VW, height: VH }, ...extra });
  const lp = await login(lctx, lg.login, lg.pw);
  const errs: string[] = [];
  lp.on("pageerror", (e) => errs.push(e.message));

  const res = await lp.goto(`${BASE}/assessment/${lg.id}/report`,
    { waitUntil: "networkidle" });
  ok("D 옛 결과가 500 없이 열린다", res?.status() === 200, `HTTP ${res?.status()}`);
  await waitLegacy(lp);

  const first = await docRatio(lp, VH);
  ok(`A 옛 결과 초기 높이 (${lg.tier} · 종이 ${lg.sheets}장)`,
    first.r <= RATIO_MAX, `${first.h}px · 창 ${first.r}배 (한도 ${RATIO_MAX})`);

  /* B 처음에 접혀 있는가. **창 안쪽의 DOM 으로 본다** */
  const folded = await lp.frameLocator("iframe.rpframe")
    .locator(".rpfold.is-folded").count();
  const apx = await lp.frameLocator("iframe.rpframe")
    .locator("#apBody.is-folded").count();
  ok("B 옛 결과의 본문 절이 접혀 있다", folded >= 3, `${folded}절`);
  ok("B 옛 결과의 부록이 접혀 있다", apx === 1);

  /* 띠가 가리키는 자리가 열리는가. **닫힌 자리로 보내는 띠는 길 안내가
     아니다**: 누른 사람이 접힌 머리 앞에 떨어져 한 번 더 눌러야 한다 */
  const fr0 = lp.frameLocator("iframe.rpframe");
  await fr0.locator(".rpnav a").first().click({ timeout: 5000 }).catch(() => undefined);
  await lp.waitForTimeout(600);
  const navOpen = await fr0.locator(".rpage").first()
    .locator(".rpfold:not(.is-folded)").count();
  ok("D 띠를 누르면 그 절이 열린다", navOpen === 1, `${navOpen}개`);

  /* 사용자가 직접 읽을 수 있는가. **펼치면 늘어나야 담긴 것을 접은 것이다** */
  const btns = lp.frameLocator("iframe.rpframe").locator(".rpfoldbtn");
  const n = await btns.count();
  for (let i = 0; i < n; i += 1) {
    await btns.nth(i).click({ timeout: 5000 }).catch(() => undefined);
  }
  await lp.frameLocator("iframe.rpframe").locator("#apFold")
    .click({ timeout: 5000 }).catch(() => undefined);
  await lp.waitForTimeout(1200);
  const open = await docRatio(lp, VH);
  ok("D 옛 결과의 전체 상세를 펼쳐서 볼 수 있다",
    open.h > first.h * EXPAND_MIN,
    `${first.h}px → ${open.h}px (${Math.round((open.h / first.h) * 10) / 10}배)`);

  /* 펼친 자리에 부록 본문이 실제로 서 있는가. 높이만 보면
     `max-height` 로 가려 둔 화면도 통과한다 */
  const apxText = await lp.frameLocator("iframe.rpframe")
    .locator("#apBody").innerText().catch(() => "");
  ok("D 부록 본문이 비어 있지 않다", apxText.replace(/\s/g, "").length > 200,
    `${apxText.replace(/\s/g, "").length}자`);

  /* C 종이는 그대로다. 내려받는 길이 살아 있고 접힌 자리가 인쇄에서 펴진다 */
  const pdf = await lp.request.get(`${BASE}/assessment/${lg.id}/report/pdf`);
  const len = Number(pdf.headers()["content-length"] ?? "0")
    || (await pdf.body()).length;
  ok("C 옛 결과 PDF 가 그대로 내려온다",
    pdf.ok() && len > 20000, `HTTP ${pdf.status()} · ${len}바이트`);

  await lp.reload({ waitUntil: "networkidle" });
  await waitLegacy(lp);
  await lp.emulateMedia({ media: "print" });
  await lp.waitForTimeout(400);
  const printShown = await lp.frameLocator("iframe.rpframe").locator(".rpfold")
    .evaluateAll((els) => els.filter((e) => {
      const r = (e as HTMLElement).getBoundingClientRect();
      return r.height > 4;
    }).length);
  const printAll = await lp.frameLocator("iframe.rpframe").locator(".rpfold").count();
  ok("C 인쇄에서는 접힌 절이 전부 펴진다",
    printAll > 0 && printShown === printAll, `${printShown}/${printAll}`);
  await lp.emulateMedia({ media: "screen" });

  /* E 두 판본이 섞이지 않는다 */
  const frames = await lp.locator("iframe").count();
  const v3hero = await lp.locator(".rs-hero").count();
  ok("E 옛 결과 화면에 V3 renderer 조각이 없다", v3hero === 0 && frames === 1,
    `iframe ${frames} · rs-hero ${v3hero}`);

  /* 손전화에서도 같은 상태인가 */
  const lm = await browser.newContext({ viewport: { width: MW, height: MH }, ...extra });
  const lmp = await login(lm, lg.login, lg.pw);
  await lmp.goto(`${BASE}/assessment/${lg.id}/report`, { waitUntil: "networkidle" });
  await waitLegacy(lmp);
  const mobile = await docRatio(lmp, MH);
  ok("A 옛 결과 초기 높이 (손전화 390px)", mobile.r <= RATIO_MAX,
    `${mobile.h}px · 창 ${mobile.r}배`);
  await lm.close();

  ok("D 옛 결과를 여는 동안 브라우저 오류가 없다", errs.length === 0,
    errs.slice(0, 2).join(" | "));
  await lctx.close();

  /* ── 지금 판본 (ME_V3) 세 등급 ─────────────────────────────────── */
  const who = "v3heightA@example.com";
  const me = await makeStudent(who);
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, ...extra });
  const p = await login(ctx, who, me.pw);

  for (const tier of ["BASIC", "STANDARD", "PRO"] as const) {
    const at = await cloneFinished(me.id, tier);
    if (!at) { ok(`A V3 ${tier} 결과를 찾았다`, false, "이 DB 에 없습니다"); continue; }
    const r = await p.goto(`${BASE}/v3/${at}/result`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    const got = await docRatio(p, VH);
    ok(`A V3 ${tier} 초기 높이`, r?.status() === 200 && got.r <= RATIO_MAX,
      `${got.h}px · 창 ${got.r}배 (한도 ${RATIO_MAX})`);

    const hidden = await p.locator(".rs-open > div[hidden]").count();
    ok(`B V3 ${tier} 상세 본문이 접혀 있다`, hidden === 1, `${hidden}개`);

    await p.locator(".rs-openbtn").click({ timeout: 5000 }).catch(() => undefined);
    await p.waitForTimeout(600);
    const opened = await docRatio(p, VH);
    ok(`A V3 ${tier} 펼치면 늘어난다`, opened.h > got.h * EXPAND_MIN,
      `${got.h}px → ${opened.h}px`);

    if (tier === "PRO") {
      /* C 인쇄에서는 본문이 전부 선다.
         **이름을 적어 센다.** `.rs-sect` 를 통째로 세면 종이에서 일부러
         빼 둔 절(`#next` 는 눌릴 수 없는 링크뿐이라 인쇄 규칙이 지운다)
         때문에 멀쩡한 결과지가 걸린다. 반대로 `몇 개 이상` 으로 두면 어느
         절이 사라져도 지나간다 */
      await p.reload({ waitUntil: "networkidle" });
      await p.emulateMedia({ media: "print" });
      await p.waitForTimeout(400);
      const want = ["focus", "zones", "evidence", "gaps", "industry", "role",
        "plan", "howto"];
      const gone: string[] = [];
      for (const id of want) {
        const h = await p.locator(`#${id}`).evaluate((e) => {
          const b = (e as HTMLElement).getBoundingClientRect();
          return b.height;
        }).catch(() => 0);
        if (h <= 4) gone.push(id);
      }
      ok("C V3 인쇄에서는 본문 절이 전부 펴진다", gone.length === 0,
        gone.length ? `빠진 절 ${gone.join(" · ")}` : `${want.length}절`);
      await p.emulateMedia({ media: "screen" });

      /* E V3 쪽에 옛 renderer 창이 없다 */
      const ifr = await p.locator("iframe").count();
      const host = await p.locator(".rphost, .rpframe").count();
      ok("E V3 결과 화면에 옛 renderer 창이 없다", ifr === 0 && host === 0,
        `iframe ${ifr}`);

      const mctx = await browser.newContext(
        { viewport: { width: MW, height: MH }, ...extra });
      const mp = await login(mctx, who, me.pw);
      await mp.goto(`${BASE}/v3/${at}/result`, { waitUntil: "networkidle" });
      await mp.waitForTimeout(400);
      const m = await docRatio(mp, MH);
      ok("A V3 PRO 초기 높이 (손전화 390px)", m.r <= RATIO_MAX,
        `${m.h}px · 창 ${m.r}배`);
      await mctx.close();
    }
  }
  await ctx.close();
}

/**
 * E 는 실행 전에 소스로도 본다.
 *
 * 화면에 안 보이는 것과 **들여오지 않는 것**은 다른 질문이다. 지금 섞여
 * 있지 않아도 다음 사람이 옛 component 를 가져다 쓰면 그날 두 판본이 한
 * 벌이 된다.
 */
function separation(): void {
  const v3 = readFileSync("src/app/v3/[attemptId]/result/page.tsx", "utf8");
  const lg = readFileSync("src/app/assessment/[attemptId]/report/page.tsx", "utf8");
  ok("E V3 결과 쪽이 옛 결과지 틀을 들여오지 않는다",
    !/report-host|ReportFrame|me-v2\//.test(code(v3)));
  ok("E 옛 결과 쪽이 V3 결과 component 를 들여오지 않는다",
    !/from "\.\/detail"|\/v3\/\[attemptId\]\/result/.test(code(lg)));
  /* C 종이를 그리는 자리는 옛 정적 결과지이고 웹 틀과 다른 파일이다.
     한 파일을 돌려 쓰면 웹에서 접은 것이 종이에서도 접힌다 */
  const render = readFileSync("src/lib/me-v2/render.ts", "utf8");
  ok("C 옛 PDF 는 웹 틀이 아닌 정적 결과지로 그린다",
    /\/pca\/v2\.html/.test(render) && !/report-host/.test(render));

  /**
   * E 판본 분기를 화면이 글자로 적지 않는다.
   *
   * `attempts` 에는 `ME_V2` 가 들어가고 `report_snapshots` 에는
   * `ME_V2_DECISION_2026` 이 들어간다. 화면마다 `=== "ME_V2"` 로 적어
   * 두면, 뒤엣값이 들어오는 자리에서 **옛 결과가 다른 판본의 renderer
   * 로 조용히 간다.** 판단하는 자리를 하나로 둔다(설계 원칙 10).
   */
  const inline: string[] = [];
  for (const f of walk("src/app")) {
    if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
    const t = code(readFileSync(f, "utf8"));
    if (/(===|!==)\s*"ME_V[12]/.test(t)) inline.push(f.replace("src/app/", ""));
  }
  ok("E 판본 분기를 화면이 글자로 적지 않는다", inline.length === 0,
    inline.slice(0, 3).join(" · "));
}

/** `src/app` 아래 파일을 걷는다 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  console.log("웹 결과지 길이 — 초기 상태가 종이 분량인가\n");
  separation();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try { await run(browser); } finally { await browser.close(); }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  if (fail) process.exit(1);
  console.log("\n  웹은 요약에서 시작하고, 종이는 전부 들고 있다.");
}

main().catch((e) => { console.error(e); process.exit(1); });
