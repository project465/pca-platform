/**
 * **홈페이지에서 온 개인이 사람처럼 끝까지 밟는다.**
 *
 * careermatri.com 의 `검사 시작하기` 와 `요금` 은 앱의 `/cores` 와
 * `/pricing` 으로 간다(`marketing/src/lib/platform.ts`). 그 다음부터를
 * 화면만 눌러 본다. 서버 함수를 부르지 않는다.
 *
 *   가격표 → 무료 BASIC → 가입 → 전공 고르기 → 검사 → 결과
 *   → 가격표 → PRO 결제 → 같은 응시 넓히기 → 새 화면만 풀기 → 결과 → PDF 책
 *
 * 묻는 것은 셋이다. 무료로 끝까지 가는가 · 산 등급이 **같은 응시**를 넓히는가
 * (새 응시가 하나 더 생기지 않는가) · PRO 의 종이가 책으로 내려오는가.
 *
 *   bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 OUT=<저장소 밖> CORE=BIZ_CORE_V1 npx tsx scripts/lab/personal-run.ts
 *
 * 결제는 가짜 결제(mock)로만 돈다. 운영에서는 돌리지 않는다. 계정은 지우지
 * 않고 열쇠는 OUT 의 account.txt 에만 적는다.
 */
import { chromium, type Page } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { BASE, assertFreshServer, gateCreds, loadEnv } from "../_loop-fixture";
import { walk } from "../_v3-walk";
import { query } from "../../src/lib/db";

loadEnv();

const OUT = process.env.OUT ?? "";
if (!OUT || path.resolve(OUT).startsWith(path.resolve("."))) {
  throw new Error("OUT 에 저장소 밖 자리를 적으십시오(열쇠가 적힌다)");
}
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const NAME = process.env.NAME ?? "한지우";
mkdirSync(OUT, { recursive: true });

const rows: { name: string; ok: boolean; got: string }[] = [];
function ok(name: string, pass: boolean, got = ""): void {
  rows.push({ name, ok: pass, got });
  console.log(`${pass ? "  ok " : "FAIL "} ${name}${got ? ` — ${got}` : ""}`);
}
const text = (p: Page) => p.locator("body").innerText().catch(() => "");
let shotN = 0;
async function shot(p: Page, label: string): Promise<void> {
  shotN += 1;
  await p.screenshot({
    path: path.join(OUT, `${String(shotN).padStart(2, "0")}-${label}.png`), fullPage: true,
  }).catch(() => undefined);
}

/** 시작 화면에서 학업 단계를 고르고 연다 */
async function startForm(p: Page): Promise<void> {
  await p.locator('label:has(input[name="stage"][value="bachelor"])').first()
    .click().catch(() => undefined);
  await Promise.all([
    p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
    p.locator('button[type="submit"]').last().click({ force: true }).catch(() => undefined),
  ]);
  await p.waitForLoadState("networkidle").catch(() => undefined);
}

async function finish(p: Page, id: string): Promise<void> {
  const out = await walk(p, 260, {
    note: "동아리 예산을 지난 학기 지출과 비교해 항목별 한도를 직접 정했습니다.",
  });
  ok(`검사가 끝까지 간다 (응시 ${id})`, out.done, `${out.screens}화면`);
  if (!/\/result/.test(p.url())) {
    await p.goto(`${BASE}/v3/${id}/result`, { waitUntil: "networkidle" });
  }
}

async function main(): Promise<void> {
  assertFreshServer();
  const gate = gateCreds();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, locale: "ko-KR",
    ...(gate ? { httpCredentials: gate } : {}),
  });
  const p = await ctx.newPage();
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });

  const email = `personal-${Date.now()}@example.com`;
  const pw = randomBytes(9).toString("base64url");
  writeFileSync(path.join(OUT, "account.txt"), `${email}\n${pw}\n`);

  try {
    /* 1. 가격표. 홈페이지의 `요금` 이 오는 자리 */
    await p.goto(`${BASE}/pricing?market=KR`, { waitUntil: "networkidle" });
    const pr = await text(p);
    ok("가격표에 세 등급이 선다", ["BASIC", "STANDARD", "PRO"].every((t) => pr.includes(t)));
    ok("가격표에 승인된 값이 적힌다", /14,900/.test(pr) && /21,900/.test(pr));
    ok("판매 닫힘 문구가 없다", !/판매를 아직 열지 않았습니다/.test(pr));
    ok("가격표 머리에 한 전공 이름을 박지 않는다", !/기계공학 진로 진단/.test(pr));
    await shot(p, "pricing");

    /* 2. 무료 BASIC → 가입 */
    await Promise.all([
      p.waitForURL(/\/signup/, { timeout: 20000 }).catch(() => undefined),
      p.locator(".pxtier").first().locator("form button").click(),
    ]);
    ok("무료 시작을 누르면 가입으로 간다", /\/signup/.test(p.url()), new URL(p.url()).pathname);
    await p.fill('input[name="name"]', NAME);
    await p.fill('input[name="email"]', email);
    await p.fill('input[name="password"]', pw);
    const boxes = p.locator('input[type="checkbox"][name="consent"]');
    for (let i = 0; i < await boxes.count(); i += 1) {
      if (await boxes.nth(i).getAttribute("required") !== null) await boxes.nth(i).check();
    }
    await shot(p, "signup");
    await Promise.all([
      p.waitForURL((u) => !new URL(u).pathname.startsWith("/signup"), { timeout: 30000 })
        .catch(() => undefined),
      p.locator('button[type="submit"]').last().click(),
    ]);
    /* 가입 → `/free-start`(무료 이용권을 만든다) → `/cores` 로 두 번 넘어간다 */
    await p.waitForURL(/\/cores/, { timeout: 30000 }).catch(() => undefined);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    ok("가입 뒤 전공 고르기로 돌아온다", /\/cores/.test(p.url()), new URL(p.url()).pathname);
    await shot(p, "cores");

    /* 3. 전공 고르기 → 시작 */
    const card = p.locator(`a[href="/v3/start?core=${CORE}"]`).first();
    ok("고를 전공 카드가 있다", (await card.count()) > 0, CORE);
    await Promise.all([p.waitForURL(/\/v3\/start/, { timeout: 20000 }), card.click()]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await shot(p, "start");
    await startForm(p);
    if (/\/intro/.test(p.url())) {
      await p.locator("a.qs-btn-go").first().click().catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    const id = (p.url().match(/\/v3\/(\d+)/) ?? [])[1] ?? "";
    ok("BASIC 응시가 열린다", !!id, new URL(p.url()).pathname);
    const r0 = await query<{ tier: string; core_code: string; entitlement_id: string | null }>(
      `SELECT tier, core_code, entitlement_id::text FROM v3_attempts WHERE id = $1::bigint`, [id]);
    ok("BASIC · 고른 전공 · 무료 이용권으로 열린다",
      r0[0]?.tier === "BASIC" && r0[0]?.core_code === CORE && !!r0[0]?.entitlement_id,
      JSON.stringify(r0[0] ?? {}));
    await finish(p, id);
    const res1 = await text(p);
    ok("BASIC 결과가 선다", /\/result/.test(p.url()) && res1.length > 400, `${res1.length}자`);
    await shot(p, "basic-result");

    /* 4. PRO 결제 (가짜 결제) */
    await p.goto(`${BASE}/pricing?market=KR`, { waitUntil: "networkidle" });
    const proBtn = p.locator(".pxtier").nth(2).locator('a[href*="/checkout"]');
    ok("PRO 결제 단추가 눌린다", (await proBtn.count()) > 0);
    await Promise.all([p.waitForURL(/\/checkout/, { timeout: 20000 }), proBtn.click()]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await shot(p, "checkout");
    const agree = p.locator('input[type="checkbox"]');
    for (let i = 0; i < await agree.count(); i += 1) await agree.nth(i).check().catch(() => undefined);
    await p.locator('button[type="submit"]').last().click();
    await p.waitForLoadState("networkidle").catch(() => undefined);
    const pay = p.locator(".mockpay button[type=submit]");
    await pay.waitFor({ timeout: 30000 }).catch(() => undefined);
    if (await pay.count()) {
      await Promise.all([
        p.waitForURL(/\/checkout\/complete/, { timeout: 30000 }).catch(() => undefined),
        pay.click(),
      ]);
    }
    await p.waitForLoadState("networkidle").catch(() => undefined);
    ok("결제가 끝난다", /\/checkout\/complete/.test(p.url()), new URL(p.url()).pathname);
    await shot(p, "paid");
    const go = p.locator('a[href="/v3/upgrade"]');
    ok("결제 끝 화면이 같은 응시 넓히기로 보낸다", (await go.count()) > 0);
    await Promise.all([p.waitForURL(/\/v3\/upgrade/, { timeout: 20000 }), go.first().click()]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    const up = await text(p);
    ok("넓히기 화면이 무엇이 달라지는지 적는다", /그대로/.test(up) && /PRO/.test(up));
    await shot(p, "upgrade");

    /* 5. 넓힌 응시를 끝까지 */
    await Promise.all([
      p.waitForURL(new RegExp(`/v3/${id}(?!/result)`), { timeout: 30000 }).catch(() => undefined),
      p.locator("form button").first().click(),
    ]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    ok("같은 응시로 들어간다", p.url().includes(`/v3/${id}`), new URL(p.url()).pathname);
    await finish(p, id);
    const n = await query<{ n: string; tier: string }>(
      `SELECT count(*)::text AS n, max(tier) AS tier FROM v3_attempts
        WHERE user_id = (SELECT id FROM users WHERE email = $1)`, [email]);
    ok("응시는 하나뿐이고 PRO 가 됐다", n[0]?.n === "1" && n[0]?.tier === "PRO",
      JSON.stringify(n[0] ?? {}));
    const res2 = await text(p);
    ok("PRO 결과가 선다", /\/result/.test(p.url()) && res2.length > res1.length,
      `${res1.length}자 → ${res2.length}자`);
    await shot(p, "pro-result");

    /* 6. 다시 시작 주소를 눌러도 새 응시가 생기지 않는다 */
    await p.goto(`${BASE}/v3/start?core=${CORE}`, { waitUntil: "networkidle" });
    ok("다 끝낸 뒤 시작 주소는 결과로 보낸다", /\/result/.test(p.url()), new URL(p.url()).pathname);

    /* 7. 종이. PRO 는 책이다 */
    const pdf = await ctx.request.get(`${BASE}/v3/${id}/result/pdf`, { timeout: 180000 });
    ok("PDF 를 받는다", pdf.status() === 200
      && (pdf.headers()["content-type"] ?? "").includes("pdf"), String(pdf.status()));
    if (pdf.status() === 200) {
      const f = path.join(OUT, `CareerMatri_개인_${NAME}.pdf`);
      writeFileSync(f, await pdf.body());
      const info = execFileSync("pdfinfo", [f], { encoding: "utf8" });
      const pages = Number((info.match(/Pages:\s+(\d+)/) ?? [])[1] ?? 0);
      ok("PRO 종이가 책(66쪽 이상)이다", pages >= 66, `${pages}쪽`);
    }

    /* 8. 내 CareerMatri */
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    ok("내 CareerMatri 가 열린다", new URL(p.url()).pathname === "/me");
    await shot(p, "me");

    ok("브라우저 오류와 500 이 없다", errs.length === 0, errs.slice(0, 3).join(" | "));
  } finally {
    await browser.close();
  }
  const bad = rows.filter((r) => !r.ok);
  console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
  writeFileSync(path.join(OUT, "REPORT.md"),
    rows.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.got ? ` — ${r.got}` : ""}`).join("\n") + "\n");
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
