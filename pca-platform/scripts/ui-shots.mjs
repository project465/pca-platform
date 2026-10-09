/**
 * 세 제품 화면을 역할마다 로그인해서 캡처한다.
 *
 * 화면을 다시 짜 놓고 눈으로 한 번 보는 것으로는 다음에 깨진 것을 못
 * 찾는다. 그래서 **찍는 목록을 코드에 적어 두고**, 브라우저 오류와 가로
 * 스크롤까지 같이 센다. 규격이 요구한 열두 장이 전부 이 목록에서 나온다.
 *
 * 먼저 띄워 두어야 한다:
 *
 *   npm run db:reset && npm run db:platform && npm run metri:seed && npm run db:seed
 *   AUTH_SECRET=$(openssl rand -base64 48) npx next dev -p 3100
 *   node scripts/ui-shots.mjs
 *
 * 계정은 `scripts/seed.ts` 가 만든 **개발용**이다.
 */
import { mkdirSync } from "node:fs";

import { devPassword } from "./dev-credentials.mjs";
const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/ui";
mkdirSync(OUT, { recursive: true });

/* 넓은 화면 셋과 좁은 화면 둘. 규격이 1440 · 1280 · 태블릿 · 모바일을 요구한다 */
const SIZES = {
  w1440: { width: 1440, height: 1000 },
  w1280: { width: 1280, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

const WHO = {
  /* 로그인 전 화면. **계정 없이 찍는다**: 사는 사람이 처음 보는 것이
     로그인한 머리띠가 아니다 */
  guest: { skip: true },
  /* 참여자는 첫 로그인에 비밀번호를 바꿔야 한다. 그래서 **두 벌을 들고
     간다**: 시드 그대로면 앞엣것, 이 스크립트가 한 번 바꿨으면 뒤엣것.
     그래야 같은 DB 에서 두 번 돌릴 수 있다 */
  individual: {
    id: "2021001234", pw: devPassword("student"),
    pw2: devPassword("student2"), first: true,
  },
  campus: { id: "me-admin", pw: devPassword("org") },
  admin: { id: "admin", pw: devPassword("admin") },
};

/** [역할, 주소, 파일이름, 찍을 크기들] */
const SHOTS = [
  ["individual", "/my", "01_individual_home", ["w1440", "mobile"]],
  ["individual", "/my/assessments", "02_individual_assessments", ["w1440"]],
  ["individual", "/my/results", "03_individual_results", ["w1440"]],
  ["individual", "/my/evidence", "04_individual_evidence", ["w1440"]],
  ["individual", "/my/applications", "05_individual_applications", ["w1440"]],
  /* 지원 경로. **막혔을 때 들어오는 자리다**(규격 §15) */
  ["individual", "/support", "21_individual_support", ["w1440", "mobile"]],

  ["campus", "/org", "06_campus_overview", ["w1440", "w1280", "mobile"]],
  ["campus", "/org/participants", "07_campus_participants", ["w1440", "tablet"]],
  ["campus", "/org/cohorts", "08_campus_cohorts", ["w1440"]],
  ["campus", "/org/licenses", "09_campus_licenses", ["w1440"]],
  ["campus", "/org/insights", "10_campus_career_insights", ["w1440"]],
  ["campus", "/org/evidence-insights", "11_campus_evidence_insights", ["w1440"]],
  ["campus", "/org/contract", "12_campus_contract", ["w1440"]],

  ["admin", "/admin", "13_admin_overview", ["w1440", "w1280", "mobile"]],
  ["admin", "/admin/organizations", "14_admin_organizations", ["w1440"]],
  ["admin", "/admin/contracts", "15_admin_contracts", ["w1440"]],
  ["admin", "/admin/sites", "16_admin_sites", ["w1440"]],
  ["admin", "/admin/countries", "17_admin_countries", ["w1440"]],
  ["admin", "/admin/users", "18_admin_notopen", ["w1440"]],
  /* 상용화 준비와 지역화 덮임. **막힌 것을 아침에 보이게 둔 자리다** */
  ["admin", "/admin/readiness", "19_admin_readiness", ["w1440", "mobile"]],
  ["admin", "/admin/localization", "20_admin_localization", ["w1440"]],
  /* 런칭과 사고. **아침에 여는 자리** */
  ["admin", "/admin/launch", "22_admin_launch", ["w1440", "mobile"]],
  ["admin", "/admin/incidents", "23_admin_incidents", ["w1440"]],
  ["admin", "/admin/refunds", "24_admin_refunds", ["w1440"]],
  ["admin", "/admin/funnel", "25_admin_funnel", ["w1440"]],
  /* 사업자 표시. **사업자가 직접 넣는 자리다** */
  ["admin", "/admin/business", "30_admin_business", ["w1440"]],

  /* 사는 쪽 화면. 로그인하지 않고 찍는다.
     **시장을 주소로 못 박는다**: 쿠키가 남아 있으면 지난번에 고른 시장이
     따라오고, 그러면 캡처마다 값이 달라진다 */
  ["guest", "/product?market=KR", "26_product", ["w1440", "mobile"]],
  ["guest", "/product?market=GLOBAL&lang=en", "27_product_en", ["w1440", "mobile"]],
  ["guest", "/sample", "28_sample", ["w1440"]],
  ["guest", "/pricing?market=GLOBAL&lang=en", "29_pricing", ["w1440", "mobile"]],
  /* 한국 시장. **먼저 켜는 시장이다**(규격 §1) */
  ["guest", "/pricing?market=KR", "31_pricing_kr", ["w1440", "mobile"]],
];

/* `--only=readiness,localization` 로 몇 장만 찍는다. 스무 장을 한
   브라우저로 찍으면 컨테이너가 메모리에서 죽는다(실제로 죽었다) */
const only = (process.argv.find((x) => x.startsWith("--only=")) || "").slice(7)
  .split(",").map((x) => x.trim()).filter(Boolean);
const PICK = only.length
  ? SHOTS.filter((s) => only.some((o) => s[2].includes(o)))
  : SHOTS;

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function login(ctx, who) {
  const p = await ctx.newPage();
  for (const pw of [who.pw, who.pw2].filter(Boolean)) {
    await p.goto(`${B}/login`, { waitUntil: "networkidle" });
    await p.fill('input[name="loginId"], input[name="id"], input[type="text"]', who.id)
      .catch(() => {});
    await p.fill('input[type="password"]', pw);
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
      .catch(() => {});
    if (!new URL(p.url()).pathname.startsWith("/login")) break;
  }
  /* 첫 로그인인 참여자는 비밀번호를 바꿔야 제 화면을 본다. 시드가 만든
     상태 그대로라 캡처 전에 한 번 넘어가 준다 */
  if (who.first) {
    await p.goto(`${B}/password/change`, { waitUntil: "networkidle" });
  }
  if (who.first && await p.$('input[name="current"]')) {
    const next = devPassword("student2");
    await p.fill('input[name="current"]', who.pw);
    /* 이미 바꿔 둔 뒤라면 이 칸이 틀리지만, 그때는 폼 자체가 안 뜬다 */
    await p.fill('input[name="next"]', next);
    await p.fill('input[name="confirm"]', next);
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !new URL(u).pathname.startsWith("/password"), { timeout: 20000 })
      .catch(() => {});
    if (new URL(p.url()).pathname.startsWith("/password")) {
      console.log("  (비밀번호 변경이 안 됐다: " +
        ((await p.textContent(".err, .error, [role=alert]").catch(() => null)) ?? "까닭 모름") + ")");
    }
  }
  await p.close();
}

const log = [];
const problems = [];
for (const role of Object.keys(WHO)) {
  const jobs = PICK.filter((s) => s[0] === role);
  if (!jobs.length) continue;
  const ctx = await browser.newContext({ viewport: SIZES.w1440 });
  if (!WHO[role].skip) await login(ctx, WHO[role]);

  for (const [, path, name, sizes] of jobs) {
    for (const size of sizes) {
      const p = await ctx.newPage();
      await p.setViewportSize(SIZES[size]);
      const errs = [];
      p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
      p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
      const r = await p.goto(B + path, { waitUntil: "networkidle" });
      await p.waitForTimeout(250);
      const at = new URL(p.url()).pathname;
      /* 주소에 `?lang=en` 처럼 질의가 붙은 목록은 경로만 견준다 */
      const want = path.split("?")[0];
      const code = r ? r.status() : 0;
      /* **가로 스크롤은 버그로 센다.** 좁은 화면에서 표가 쪽을 밀어내면
         규격의 반응형 요구가 깨진 것이다(표 자체의 넘침은 제 상자 안이다) */
      const overflow = await p.evaluate(() =>
        document.documentElement.scrollWidth > window.innerWidth + 1);
      const file = `${OUT}/${name}__${size}.png`;
      /* **붙어 있는 띠를 잠깐 떼고 찍는다.** `fullPage` 캡처는 쪽을 굴리면서
         찍는데, `position: sticky` 인 띠가 굴러간 자리에 한 번 더 그려져서
         화면 가운데에 동그라미가 떠 있는 그림이 나온다. 화면은 멀쩡하고
         그림만 틀리는 것이라, 찍을 때만 뗀다 */
      await p.addStyleTag({
        content: ".sf-top, .sf-side, .pubtop, .sf-rpnav, .sfm-save { position: static !important }",
      });
      await p.waitForTimeout(120);
      await p.screenshot({ path: file, fullPage: true });
      const tag = `${name} ${size}`;
      log.push(`${tag.padEnd(42)} ${code} ${at === want ? "" : `→ ${at} `}` +
        `${overflow ? "가로스크롤 " : ""}${errs.length ? `오류 ${errs.length}` : ""}`.trim());
      if (at !== want) problems.push(`${tag}: ${path} 가 ${at} 로 갔다`);
      if (overflow) problems.push(`${tag}: 가로 스크롤이 생긴다`);
      if (errs.length) problems.push(`${tag}: ${errs[0]}`);
      await p.close();
    }
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
  console.log(`\n화면 ${log.length}장 OK.`);
}
