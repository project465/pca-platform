/**
 * 완성된 화면을 실제로 띄워 촬영한다. 목업이 아니라 구동 화면이라는 점이 중요하다.
 *
 *   npm run build && npm start   (다른 창에서)
 *   node scripts/screenshots.mjs [출력 폴더]
 *
 * 계정은 scripts/seed*.ts 가 넣은 개발용 계정이다.
 * 한 묶음이 실패해도 나머지는 계속 찍는다 — 화면 하나 때문에 전부 잃지 않는다.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
let taken = 0;
const failures = [];

const settle = async (page) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(350);
};

const shot = async (page, name, full = false) => {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  taken++;
  console.log("  " + name);
};

/** 가운데 패널만 잘라낸다. 여백이 대부분인 화면을 줄여서 실으면 글자가 안 보인다. */
const shotPanel = async (page, name) => {
  await settle(page);
  await page.locator(".panel").first().screenshot({ path: `${OUT}/${name}.png` });
  taken++;
  console.log("  " + name);
};

const ctx = () =>
  browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    locale: "ko-KR",
  });

const login = async (page, id, pw) => {
  await page.goto(`${BASE}/login`);
  await page.fill("#identifier", id);
  await page.fill("#password", pw);
  await page.getByRole("button", { name: /로그인|재설정 링크 받기/ }).click();
  await page.waitForLoadState("networkidle");
};

/** 한 묶음이 깨져도 다음 묶음으로 넘어간다 */
const group = async (label, fn) => {
  console.log(label);
  const c = await ctx();
  const p = await c.newPage();
  try {
    await fn(p);
  } catch (e) {
    failures.push(`${label} — ${e.message.split("\n")[0]}`);
    console.log("  건너뜀: " + e.message.split("\n")[0]);
  }
  await c.close();
};

// ── 들어오는 자리 ────────────────────────────────────────────────
await group("로그인·가입", async (p) => {
  await p.goto(`${BASE}/login`);
  await shotPanel(p, "01-login");

  await p.goto(`${BASE}/signup`);
  await shotPanel(p, "02-signup");

  await p.goto(`${BASE}/login`);
  await p.fill("#identifier", "admin");
  await p.fill("#password", "wrong-password");
  await p.getByRole("button", { name: /로그인|재설정 링크 받기/ }).click();
  await p.waitForSelector(".notice.error");
  await shotPanel(p, "03-login-error");

  await p.goto(`${BASE}/password/forgot`);
  await shotPanel(p, "04-forgot");
});

// ── 학생: 응시 ───────────────────────────────────────────────────
await group("학생 응시", async (p) => {
  await login(p, "2026880003", "pca-dev-oh-1234");
  await shot(p, "10-student-home");

  await p.getByRole("link", { name: /시작|이어하기|응시/ }).first().click();
  await p.waitForURL("**/exam/**");
  await shot(p, "11-exam-intro");

  await p.getByRole("button", { name: /시작|이어하기/ }).first().click();
  await settle(p);
  await shot(p, "12-exam-question");

  // 끝까지 답해 제출 차단이 풀리는 자리를 본다. 키보드로 푸는 것도 이 화면의 기능이다
  for (let i = 0; i < 40; i++) {
    await p.locator('[role="radio"]').nth(2).click();
    await p.waitForTimeout(150);
    const next = p.getByRole("button", { name: /^다음$/ });
    if ((await next.count()) === 0) break;
    await next.click();
    await p.waitForTimeout(150);
  }
  await settle(p);
  await shot(p, "13-exam-last");

  const submit = p.getByRole("button", { name: /제출/ }).first();
  if (await submit.isEnabled()) {
    await submit.click();
    await settle(p);
    await shot(p, "14-exam-done");
  }
});

// ── 학생: 결과지와 현직자로 가는 길 ──────────────────────────────
await group("결과지 → 현직자", async (p) => {
  await login(p, "2021001234", "pca-dev-student-1234");
  await p.goto(`${BASE}/my`);
  await settle(p);
  const report = p.locator('a[href^="/my/report/"]').first();
  await report.click();
  await p.waitForURL("**/my/report/**");
  await shot(p, "15-report", true);

  const toMentors = p.locator('a[href*="/mentoring?job="]').first();
  await toMentors.click();
  await p.waitForURL("**/mentoring**");
  await shot(p, "16-gallery-from-report");
});

// ── 현멘 ─────────────────────────────────────────────────────────
await group("현멘 (로그인 없이)", async (p) => {
  await p.goto(`${BASE}/mentoring`);
  await shot(p, "19-mentoring-public", true);
});

await group("현멘 (신청자)", async (p) => {
  await login(p, "kim@example.com", "pca-dev-kim-1234");
  await p.goto(`${BASE}/mentoring`);
  await shot(p, "20-mentoring-gallery");

  const hrefs = await p
    .locator('a[href^="/mentoring/"]')
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const detail = hrefs.find(
    (h) => !["/mentoring", "/mentoring/requests", "/mentoring/mentor"].includes(h),
  );
  await p.goto(BASE + detail);
  await shot(p, "21-mentoring-detail", true);

  await p.goto(`${BASE}/mentoring/requests`);
  await shot(p, "22-mentoring-requests", true);
});

await group("현멘 (멘토)", async (p) => {
  await login(p, "mentor-semi", "pca-dev-mentor-1234");
  await p.goto(`${BASE}/mentoring/mentor`);
  await shot(p, "23-mentor-console", true);
});

// ── 학과 담당자 ──────────────────────────────────────────────────
await group("학과 담당자", async (p) => {
  await login(p, "me-admin", "pca-dev-org-1234");
  await shot(p, "30-org-home");

  await p.goto(`${BASE}/org/sessions/new`);
  await shot(p, "31-org-new-session", true);

  await p.goto(`${BASE}/org/sessions/3`);
  await shot(p, "32-org-session", true);

  await p.goto(`${BASE}/org/sessions/3/report`);
  await shot(p, "35-group-report", true);
});

// ── 운영사 ───────────────────────────────────────────────────────
await group("운영사", async (p) => {
  await login(p, "admin", "pca-dev-admin-1234");
  await shot(p, "40-admin-orgs");

  await p.goto(`${BASE}/admin/contracts`);
  await shot(p, "41-admin-contracts");

  await p.goto(`${BASE}/admin/mentors`);
  await shot(p, "42-admin-mentors", true);

  await p.goto(`${BASE}/admin/instruments/1`);
  await shot(p, "43-admin-weights", true);

  await p.goto(`${BASE}/admin/prices`);
  await shot(p, "44-admin-prices", true);

  await p.goto(`${BASE}/admin/payouts`);
  await shot(p, "45-admin-payouts", true);

  await p.goto(`${BASE}/admin/no-shows`);
  await shot(p, "46-admin-noshows", true);

  await p.goto(`${BASE}/admin/refunds`);
  await shot(p, "47-admin-refunds", true);
});

// ── 약관 (로그인 전에도 읽는다) ─────────────────────────────────
await group("약관", async (p) => {
  await p.goto(`${BASE}/terms`);
  await shot(p, "48-terms", true);

  await p.goto(`${BASE}/privacy`);
  await shot(p, "49-privacy", true);
});

await browser.close();
console.log(`\n${taken}장`);
if (failures.length > 0) {
  console.log("실패한 묶음:");
  for (const f of failures) console.log("  " + f);
}
