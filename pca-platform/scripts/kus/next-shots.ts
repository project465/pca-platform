/**
 * KUS 화면을 **실제 Next 서버**에서 찍는다(R2). 하네스 그림을 UI 증거로 쓰지 않는다.
 *
 * 이 세션은 npm 이 막혀 Next 를 직접 못 띄우고, `.github/workflows/kus-verify.yml` 이
 * GitHub 러너에서 `next build` 한 서버를 띄운 뒤 이것을 돌린다. 찍는 것은 `[테스트]` 학생과
 * `[테스트]` 탐방뿐이고 비밀번호는 실행마다 새로 만든 값이라 그림에 나오지 않는다.
 *
 * 자리(1440 · 390 두 폭): 로그인 · 홈(검사 전 · 진행 중 · 완료 RICH/CONTRA) · 검사 첫 화면 ·
 * 검사 중간 · 결과 RICH/POOR/CONTRA · 기업탐방 작성 · 탐방 상세 · 실행 계획 · 보고서 쪽 ·
 * 담당자. 리포트 PDF 셋은 실제 Next 경로(`/kus/report/{id}/pdf`)로 내려받는다.
 *
 *   BASE=http://127.0.0.1:3100 KUS_PW=... KUS_ADMIN_PW=... OUT=var/kus-ci/shots-next \
 *     APP_ENV=dev npx tsx scripts/kus/next-shots.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright";
import { enterAssessment, walk } from "../_v3-walk";
import { kusOrgSetup, student } from "./demo-setup";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const PW = process.env.KUS_PW ?? "";
const APW = process.env.KUS_ADMIN_PW ?? "";
const OUT = process.env.OUT ?? "var/kus-ci/shots-next";
const VIEW = { pc: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
type View = keyof typeof VIEW;

let pass = 0; const bad: string[] = []; const made: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  console.log(`  ${c ? "PASS" : "FAIL"}  ${w}${saw ? " — " + saw : ""}`);
  if (c) pass += 1; else bad.push(w);
};
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

async function shot(p: Page, name: string, view: View) {
  const file = `${OUT}/${name}-${view}.next.jpg`;
  /* 그림 하나가 실제 Next 응답인지: 하네스 표지가 없고, Next 가 내주는 번들이 붙어 있어야 한다 */
  const html = await p.content();
  ok(`${name}(${view}) 는 Next 가 그린 쪽이다`, html.includes("/_next/static/") && !html.includes("harness"), path(p));
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`${name}(${view}) 가로로 넘치지 않는다`, over <= 1, `${over}px`);
  await p.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 72 });
  made.push(file);
}

async function as(browser: Browser, view: View, id: string | null, pw: string, next = "/kus") {
  const ctx = await browser.newContext({ viewport: VIEW[view], deviceScaleFactor: 1, acceptDownloads: true, locale: "ko-KR" });
  const p = await ctx.newPage();
  if (id) await login(p, id, pw, next);
  return p;
}

async function main() {
  mkdirSync(`${OUT}/pdf`, { recursive: true });
  /* 검사 전 학생 하나를 이 자리에서 세운다(다른 E2E 가 쓴 학생은 이미 응시를 끝냈다) */
  const { orgId } = await kusOrgSetup();
  await student("KUS", orgId, "QA26S01", "[테스트] KUS 캡처용", "KUS26_CBIZ_GM", PW);
  const fresh = "qa-kus-qa26s01";
  const browser = await chromium.launch();

  for (const view of ["pc", "mobile"] as View[]) {
    console.log(`\n── ${view}`);
    {
      const p = await as(browser, view, null, "");
      await p.goto(`${BASE}/campus/kus/login?next=%2Fkus`, { waitUntil: "networkidle" });
      await shot(p, "01-login", view);
      await p.context().close();
    }
    if (view === "pc") {
      /* 검사 전 → 시작 → 첫 화면 → 몇 화면 → 홈(진행 중). 한 번만 연다(응시는 하나다) */
      const p = await as(browser, view, fresh, PW);
      await shot(p, "02-home-START", view);
      await p.click('a:has-text("검사 시작하기")');
      await p.waitForURL(/\/campus\/kus\/start/, { timeout: 30000 }).catch(() => undefined);
      await p.locator('form button[type="submit"]').first().click();
      await p.waitForURL(/\/v3\/start/, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
      await p.getByText("학부", { exact: true }).click().catch(() => undefined);
      await p.getByRole("button", { name: "검사 시작" }).click();
      await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
      ok("캡처용 응시가 열린다", Boolean(att), path(p));
      await enterAssessment(p);
      await shot(p, "03-assess-first", view);
      await walk(p, 8);
      await shot(p, "03-assess-mid", view);
      await p.goto(`${BASE}/kus`, { waitUntil: "networkidle" });
      await shot(p, "02-home-PROGRESS", view);
      await p.context().close();
    } else {
      const p = await as(browser, view, fresh, PW);
      await shot(p, "02-home-PROGRESS", view);
      const go = p.locator('a:has-text("이어서 답하기")').first();
      if (await go.count()) {
        await go.click();
        await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
        await p.waitForLoadState("networkidle").catch(() => undefined);
        await shot(p, "03-assess-mid", view);
      }
      await p.context().close();
    }

    for (const [tag, id] of [["RICH", "qa-kus-qa26001"], ["POOR", "qa-kus-qa26002"], ["CONTRA", "qa-kus-qa26003"]] as const) {
      const p = await as(browser, view, id, PW);
      ok(`${tag}(${view}) 로그인하면 KUS 홈에 선다`, path(p) === "/kus", path(p));
      if (tag !== "POOR") await shot(p, `02-home-${tag}`, view);
      await p.goto(`${BASE}/kus/result`, { waitUntil: "networkidle" });
      const t = await p.locator("body").innerText();
      ok(`${tag}(${view}) 결과가 신뢰도 상자와 다음 한 가지를 든다`, t.includes("이 결과가 기대고 있는 것") && t.includes("30·60·90일 계획"));
      if (tag === "CONTRA") ok(`CONTRA(${view}) 결과 머리가 근거 확인 전이다`, t.includes("근거 확인 전") && t.includes("응답만으로 선 결과"));
      await shot(p, `04-result-${tag}`, view);
      if (tag === "RICH") {
        await p.goto(`${BASE}/kus/plan`, { waitUntil: "networkidle" });
        await shot(p, "06-plan-RICH", view);
        await p.goto(`${BASE}/kus/visits/new`, { waitUntil: "networkidle" });
        await shot(p, "05-visit-new", view);
        await p.goto(`${BASE}/kus/report`, { waitUntil: "networkidle" });
        await shot(p, "07-report", view);
      }
      if (tag === "CONTRA") {
        await p.goto(`${BASE}/kus/visits`, { waitUntil: "networkidle" });
        const first = p.locator('a[href^="/kus/visits/"]:not([href$="/new"])').first();
        if (await first.count()) {
          await first.click();
          await p.waitForLoadState("networkidle").catch(() => undefined);
          await shot(p, "05-visit-detail", view);
        }
      }
      if (view === "pc") {
        /* 리포트 PDF 를 실제 Next 경로로 내려받는다 */
        await p.goto(`${BASE}/kus/report`, { waitUntil: "networkidle" });
        const link = p.locator('a[href$="/pdf"]').first();
        if (await link.count()) {
          const href = await link.getAttribute("href");
          const res = await p.request.get(`${BASE}${href}`);
          const buf = Buffer.from(await res.body());
          ok(`${tag} 리포트 PDF 가 실제 Next 경로로 내려온다`, res.status() === 200 && buf.subarray(0, 4).toString() === "%PDF", `${res.status()} · ${buf.length}바이트`);
          if (buf.subarray(0, 4).toString() === "%PDF") { writeFileSync(`${OUT}/pdf/kus-report-${tag}.next.pdf`, buf); made.push(`${OUT}/pdf/kus-report-${tag}.next.pdf`); }
        } else ok(`${tag} 리포트 PDF 링크가 있다`, false);
      }
      await p.context().close();
    }

    {
      const p = await as(browser, view, "qa-kus-admin", APW, "/kus/admin");
      await p.goto(`${BASE}/kus/admin`, { waitUntil: "networkidle" });
      ok(`담당자(${view}) 화면이 선다`, path(p) === "/kus/admin", path(p));
      await shot(p, "08-admin", view);
      await p.context().close();
    }
  }
  await browser.close();
  writeFileSync(`${OUT}/INDEX.txt`, made.map((f) => f.replace(`${OUT}/`, "")).join("\n") + "\n");
  console.log(`\n  그림 ${made.length}장\n  PASS ${pass} · FAIL ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
