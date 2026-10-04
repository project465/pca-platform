/**
 * 셀프 서비스 한 바퀴를 브라우저로 끝까지 돌고 쪽마다 찍는다.
 *
 * **사람 없이 한 바퀴가 도는지를 화면에서 센다.** 서버 쪽은
 * `phase2:check` 와 `phase2:report` 가 세고, 여기서는 **실제로 눌러서**
 * 가입에서 PDF 까지 가는지를 본다. 규격이 요구한 장면을 한국 흐름과
 * 글로벌 흐름으로 각각 찍는다.
 *
 *   방문 → 가격표 → 가입 → 결제 → 이용권 → 학위 단계 → 응시 → 이어보기
 *        → 제출 → 경험 → 결과지 → PDF → 개인 첫 화면
 *
 * 먼저 띄워 두어야 한다:
 *
 *   DATABASE_URL=... npx next dev -p 3100
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/phase2-shots.mjs
 *
 * **가로 스크롤을 버그로 센다**(`ui-shots.mjs` 와 같은 규칙). 좁은 화면에서
 * 쪽이 밀려나면 규격의 반응형 요구가 깨진 것이다.
 */
import { mkdirSync } from "node:fs";

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/phase2";
mkdirSync(OUT, { recursive: true });

const SIZES = {
  w1440: { width: 1440, height: 1000 },
  w1280: { width: 1280, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

/* 이 검사가 만드는 계정. **운영에 쓰지 않는다**: 비밀번호가 코드에 적혀
   있고, 적혀 있는 비밀번호는 비밀번호가 아니다 */
const PW = "Phase2-Shots-2026!";
const RUN = Date.now().toString(36);

const log = [];
const problems = [];

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shot(page, name, size = "w1440") {
  await page.setViewportSize(SIZES[size]);
  await page.waitForTimeout(220);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1);
  /* 붙어 있는 띠를 잠깐 떼고 찍는다. `fullPage` 가 쪽을 굴리면서 찍어서
     sticky 띠가 굴러간 자리에 한 번 더 그려진다 */
  await page.addStyleTag({
    content: ".sf-top, .sf-side, .pubtop, .asnav, .rpnav { position: static !important }" +
      /* 개발 서버가 왼쪽 아래에 띄우는 동그라미는 제품이 아니다 */
      " nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important }",
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${OUT}/${name}__${size}.png`, fullPage: true });
  log.push(`${`${name} ${size}`.padEnd(46)} ${overflow ? "가로스크롤" : "ok"}`);
  if (overflow) problems.push(`${name} ${size}: 가로 스크롤이 생긴다`);
}

/** 쪽이 가야 할 곳에 갔는가. 안 갔으면 그 자리에서 적어 둔다 */
function at(page, want, tag) {
  const now = new URL(page.url()).pathname;
  const okd = typeof want === "string" ? now === want : want.test(now);
  if (!okd) problems.push(`${tag}: ${now} (바란 곳 ${want})`);
  return okd;
}

/**
 * 주소가 바뀔 때까지 기다린다.
 *
 * **`networkidle` 로 갈음하지 않는다.** 서버 액션은 화면을 새로 받아 오지
 * 않고 React 가 안에서 길을 바꾼다. 그래서 네트워크가 조용해진 순간에도
 * 주소는 아직 앞 쪽이고, 거기서 세면 멀쩡한 흐름이 실패로 찍힌다.
 */
async function waitPath(page, want, ms = 30000) {
  const hit = (u) => {
    const now = new URL(u).pathname;
    return typeof want === "string" ? now === want : want.test(now);
  };
  await page.waitForURL(hit, { timeout: ms }).catch(() => {});
  return hit(page.url());
}

/**
 * 한 시장을 끝까지 돈다.
 *
 * `market` 은 주소로 넘긴다. 운영에서는 도메인이 정하지만 개발 서버는
 * 호스트가 하나라서, 시장을 바꿔 보려면 주소뿐이다.
 */
async function flow({ market, tier, stage, prefix, langShots }) {
  const ctx = await browser.newContext({ viewport: SIZES.w1440 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));

  /* 1. 가격표 */
  await page.goto(`${B}/pricing?market=${market}`, { waitUntil: "networkidle" });
  at(page, "/pricing", `${prefix} 가격표`);
  await shot(page, `${prefix}01_pricing`);
  await shot(page, `${prefix}01_pricing`, "mobile");
  if (langShots) {
    /* **다른 창에서 찍는다.** `middleware.ts` 가 `?lang` 을 쿠키로 굳히므로,
       같은 창에서 영어를 한 번 열면 그 뒤 한국 흐름이 전부 영어로 찍힌다 */
    const en = await browser.newContext({ viewport: SIZES.w1440 });
    const ep = await en.newPage();
    await ep.goto(`${B}/pricing?market=${market}&lang=en`, { waitUntil: "networkidle" });
    await shot(ep, `${prefix}01b_pricing_en`);
    await en.close();
  }

  /* 2. 가입. **가격표에서 고른 등급을 들고 간다** */
  const code = `ME_V2_${tier}_${market === "KR" ? "KR" : "GL"}`;
  await page.setViewportSize(SIZES.w1440);
  await page.goto(`${B}/checkout?product=${code}`, { waitUntil: "networkidle" });
  if (!at(page, /^\/signup/, `${prefix} 가입으로 넘어감`)) {
    problems.push(`${prefix}: 로그인 안 한 사람이 결제 화면에 그대로 섰다`);
  }
  await shot(page, `${prefix}02_signup`);

  const email = `phase2.${market.toLowerCase()}.${RUN}@example.test`;
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="name"]', market === "KR" ? "검사 사용자" : "Test User");
  await page.fill('input[name="password"]', PW);
  const confirm = await page.$('input[name="confirm"], input[name="password2"]');
  if (confirm) await confirm.fill(PW);
  await page.locator('button[type="submit"]').first().click({ timeout: 15000 })
    .catch(() => {});
  await waitPath(page, "/checkout");

  /* 3. 결제 */
  at(page, "/checkout", `${prefix} 가입 뒤 결제로 돌아옴`);
  await shot(page, `${prefix}03_checkout`);
  /* 결제 단추가 두 번 선다: 주문을 만드는 것과 가짜 결제창의 '결제하기'.
     **둘을 같은 고리로 돌리지 않는다**: 첫 번째가 끝나기 전에 두 번째를
     세면 아직 안 뜬 폼을 눌렀다고 기록하게 된다 */
  await page.locator('button[type="submit"]').first().click({ timeout: 15000 })
    .catch(() => {});
  const pay = page.locator('.mockpay button[type="submit"]');
  await pay.waitFor({ state: "visible", timeout: 40000 })
    .catch(() => problems.push(`${prefix}: 결제창이 뜨지 않았다`));
  if (await pay.count()) {
    await pay.first().click({ timeout: 15000 }).catch(() => {});
    await waitPath(page, "/checkout/complete", 60000);
  }

  /* 4. 결제 완료 → 검사 시작 */
  at(page, "/checkout/complete", `${prefix} 결제 완료`);
  await shot(page, `${prefix}04_paid`);

  await page.goto(`${B}/assessment/start`, { waitUntil: "networkidle" });
  at(page, "/assessment/start", `${prefix} 학위 단계 고르기`);
  await shot(page, `${prefix}05_stage`);
  await page.check(`input[name="stage"][value="${stage}"]`).catch(() => {});
  const target = await page.$('select[name="target"]');
  if (target) await target.selectOption({ index: 1 }).catch(() => {});
  await page.locator('button[type="submit"]').first().click({ timeout: 15000 })
    .catch(() => {});
  await waitPath(page, /^\/assessment\/\d+$/);

  /* 5. 응시. 한 묶음씩 채우고 넘어간다 */
  if (!at(page, /^\/assessment\/\d+$/, `${prefix} 응시 화면`)) {
    await ctx.close();
    return;
  }
  const attempt = new URL(page.url()).pathname.split("/")[2];
  await shot(page, `${prefix}06_assessment`);
  await shot(page, `${prefix}06_assessment`, "mobile");
  await page.setViewportSize(SIZES.w1440);

  let guard = 0;
  while (guard++ < 20) {
    const filled = await page.evaluate(() => {
      let n = 0;
      for (const fs of document.querySelectorAll(".asq-opts")) {
        if (fs.querySelector("input:checked")) continue;
        const opts = fs.querySelectorAll('input[type="radio"]');
        if (!opts.length) continue;
        /* 가운데에서 한 칸 위로 민다. 한쪽으로 몰아 찍으면 결정 표가
           한 줄만 서서 결과지가 무엇을 가르는지가 안 보인다 */
        opts[Math.min(opts.length - 1, Math.floor(opts.length / 2) + 1)].click();
        n += 1;
      }
      return n;
    });
    await page.waitForTimeout(1100);   /* 모아 보내는 시간(0.9초)을 넘겨 준다 */

    /* 중간에 한 번 이어보기를 확인한다: 창을 새로 열어도 안 찬 묶음으로 가야 한다 */
    if (guard === 2) {
      const again = await ctx.newPage();
      await again.goto(`${B}/assessment/${attempt}`, { waitUntil: "networkidle" });
      const resumed = await again.evaluate(() =>
        document.querySelectorAll(".asstep.is-now").length);
      if (resumed !== 1) problems.push(`${prefix}: 이어보기가 지금 묶음을 못 집는다`);
      await shot(again, `${prefix}07_resume`);
      await again.close();
      await page.setViewportSize(SIZES.w1440);
    }

    const btn = page.locator(".asnav .sf-btn.accent").first();
    if (!(await btn.count())) break;
    const label = (await btn.textContent().catch(() => "")) ?? "";
    if (await btn.isDisabled().catch(() => true)) {
      problems.push(`${prefix}: 다 채웠는데 다음 단추가 안 열린다`);
      break;
    }
    await btn.click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);
    await page.waitForLoadState("networkidle").catch(() => {});
    if (/제출|Submit/.test(label)) break;
    if (!filled && new URL(page.url()).pathname.endsWith("/done")) break;
  }

  /* 6. 응시 완료 */
  if (!new URL(page.url()).pathname.endsWith("/done")) {
    await page.goto(`${B}/assessment/${attempt}/done`, { waitUntil: "networkidle" });
  }
  at(page, `/assessment/${attempt}/done`, `${prefix} 응시 완료`);
  await shot(page, `${prefix}08_done`);

  /* 7. 경험 적기 */
  await page.goto(`${B}/assessment/${attempt}/evidence?flow=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  /* **창이 섰다고 그려진 것은 아니다**(결과지 쪽과 같은 함정이다). 첫
     걸음의 고르는 칸이 실제로 섰는지 센다 */
  const evFrame = page.frames().find((f) => f.url().includes("evidence-host"));
  const chips = evFrame
    ? await evFrame.locator(".evchip, .evpick, button, label").count().catch(() => 0)
    : 0;
  if (chips < 5) problems.push(`${prefix}: 경험 입력 화면이 그려지지 않았다 (칸 ${chips})`);
  else log.push(`${`${prefix}경험 화면`.padEnd(46)} 칸 ${chips}`);
  await shot(page, `${prefix}09_evidence`);

  /* 8. 결과지. 아직 안 만든 자리를 먼저 찍는다 */
  await page.goto(`${B}/assessment/${attempt}/report`, { waitUntil: "networkidle" });
  at(page, `/assessment/${attempt}/report`, `${prefix} 결과지 자리`);
  await shot(page, `${prefix}10_report_empty`);

  /* 결과지를 내는 단추는 `<button>` 이다. 경험으로 가는 길은 링크라,
     단추만 집으면 엉뚱한 쪽으로 가지 않는다 */
  await page.locator("button.sf-btn.accent").first().click({ timeout: 15000 })
    .catch(() => problems.push(`${prefix}: 결과지 만들기 단추를 못 눌렀다`));
  /* 결과지를 그리는 데 몇 초가 걸린다. 다 되면 창이 서고 PDF 단추가 붙는다 */
  await page.waitForSelector('a[href$="/report/pdf"]', { timeout: 120000 })
    .catch(() => problems.push(`${prefix}: 결과지가 만들어지지 않았다`));
  await page.waitForTimeout(2500);
  /* **창이 섰다고 그려진 것은 아니다.** 결과지를 그리는 창은 제 안에서
     오류를 잡아 한 줄짜리 안내로 바꾸는데, 바깥에서 보면 쪽이 멀쩡히
     선 것처럼 보인다. 쪽 수를 세어야 그린 것이 확인된다 */
  const frame = page.frames().find((f) => f.url().includes("report-host"));
  const drawn = frame ? await frame.evaluate(() =>
    ({ pages: document.querySelectorAll(".rpage").length,
       wait: document.querySelector(".rpwait")?.textContent?.trim() ?? "" })
  ).catch(() => null) : null;
  if (!drawn || drawn.pages < 4) {
    problems.push(`${prefix}: 결과지가 그려지지 않았다 ` +
      `(쪽 ${drawn?.pages ?? "?"}${drawn?.wait ? ` · ${drawn.wait}` : ""})`);
  } else {
    log.push(`${`${prefix}결과지`.padEnd(46)} ${drawn.pages}쪽`);
  }
  await shot(page, `${prefix}11_report`);
  await shot(page, `${prefix}11_report`, "tablet");

  /* 9. PDF 가 실제로 내려오는가 */
  const pdf = await page.request.get(`${B}/assessment/${attempt}/report/pdf`);
  const bytes = pdf.ok() ? (await pdf.body()) : null;
  if (!bytes || bytes.subarray(0, 5).toString() !== "%PDF-") {
    problems.push(`${prefix}: PDF 가 내려오지 않았다 (${pdf.status()})`);
  } else {
    log.push(`${`${prefix}PDF`.padEnd(46)} ${Math.round(bytes.length / 1024)}KB`);
  }

  /* 10. 개인 첫 화면이 '끝났다' 로 바뀐다 */
  await page.setViewportSize(SIZES.w1440);
  await page.goto(`${B}/my`, { waitUntil: "networkidle" });
  at(page, "/my", `${prefix} 개인 첫 화면`);
  const hasReport = await page.$(`a[href="/assessment/${attempt}/report"]`);
  if (!hasReport) problems.push(`${prefix}: 첫 화면에 결과지로 가는 길이 없다`);
  await shot(page, `${prefix}12_home_done`);
  await shot(page, `${prefix}12_home_done`, "mobile");
  await shot(page, `${prefix}12_home_done`, "w1280");

  if (errs.length) problems.push(`${prefix}: 브라우저 오류 ${errs.length} — ${errs[0]}`);
  await ctx.close();
}

await flow({
  market: "KR", tier: "STANDARD", stage: "master",
  prefix: "kr_", langShots: true,
});
await flow({
  market: "GLOBAL", tier: "PRO", stage: "phd",
  prefix: "gl_", langShots: false,
});

/* 운영 화면: 막힌 것이 아침에 보이는가 */
{
  const ctx = await browser.newContext({ viewport: SIZES.w1440 });
  const page = await ctx.newPage();
  await page.goto(`${B}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="loginId"], input[name="id"], input[type="text"]', "admin")
    .catch(() => {});
  await page.fill('input[type="password"]', "pca-dev-admin-1234");
  await page.locator('button[type="submit"]').first().click({ timeout: 15000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.goto(`${B}/admin`, { waitUntil: "networkidle" });
  if (new URL(page.url()).pathname === "/admin") {
    await shot(page, "ops_01_admin_overview");
  } else {
    log.push("ops_01_admin_overview".padEnd(46) + "건너뜀 (운영자 계정 없음)");
  }
  await ctx.close();
}

await browser.close();

console.log(log.join("\n"));
if (problems.length) {
  console.log(`\n${problems.length}개가 걸렸다.`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
} else {
  console.log(`\n한 바퀴 OK · 화면 ${log.length}줄.`);
}
