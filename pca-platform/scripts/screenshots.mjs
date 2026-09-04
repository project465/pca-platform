/**
 * 완성된 화면을 실제로 띄워 촬영한다. 목업이 아니라 구동 화면이라는 점이 중요하다.
 *
 *   npm run build && npm start   (다른 창에서)
 *   node scripts/screenshots.mjs
 *
 * 계정은 scripts/seed.ts 가 넣은 개발용 계정이다.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const shot = async (page, name, full = false) => {
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("shot:", name, page.url());
};

/** 가운데 패널만 잘라낸다. 여백이 대부분인 화면을 줄여서 실으면 글자가 안 보인다. */
const shotPanel = async (page, name) => {
  await page.waitForLoadState("networkidle");
  await page.locator(".panel").first().screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot(panel):", name, page.url());
};

const ctx = async () =>
  browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1, locale: "ko-KR" });

// 1) 로그인 화면
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await shotPanel(p, "01-login");
  await c.close();
}

// 2) 비밀번호 재설정 요청
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto(`${BASE}/password/forgot`);
  await shotPanel(p, "02-forgot");
  await p.fill("#identifier", "2021001234");
  await p.getByRole("button", { name: /로그인|재설정 링크 받기/ }).click();
  await p.waitForSelector(".notice.ok");
  await shotPanel(p, "03-forgot-sent");
  await c.close();
}

// 3) 잘못된 로그인
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill("#identifier", "admin");
  await p.fill("#password", "wrong-password");
  await p.getByRole("button", { name: /로그인|재설정 링크 받기/ }).click();
  await p.waitForSelector(".notice.error");
  await shotPanel(p, "04-login-error");
  await c.close();
}

// 4) 학생 첫 로그인 → 강제 비밀번호 변경
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill("#identifier", "2021001234");
  await p.fill("#password", "TempPass2026");
  await p.getByRole("button", { name: /로그인|재설정 링크 받기/ }).click();
  await p.waitForURL("**/password/change");
  await shotPanel(p, "05-forced-change");
  await c.close();
}

// 5) 운영사 관리자 → 기관 목록 / 기관 등록
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill("#identifier", "admin");
  await p.fill("#password", "pca-dev-admin-1234");
  await p.getByRole("button", { name: /로그인|재설정 링크 받기/ }).click();
  await p.waitForURL("**/admin/organizations");
  await shot(p, "06-org-list");

  await p.click('a[href="/admin/organizations/new"]');
  await p.waitForURL("**/organizations/new");
  await shot(p, "07-org-new", true);

  // 실제로 하나 등록해 본다
  await p.selectOption("#orgType", "department");
  await p.selectOption("#parentId", { label: "경북대학교 (KNU)" });
  await p.fill("#code", "KNU-EE");
  await p.fill("#nameKo", "경북대학교 전자공학부");
  await p.fill("#nameEn", "School of Electronic Engineering, KNU");
  await p.getByRole("button", { name: "등록", exact: true }).click();
  await p.waitForURL("**/admin/organizations");
  await shot(p, "08-org-list-after");
  await c.close();
}

// 6) 학과 담당자 / 학생 홈
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill("#identifier", "me-admin");
  await p.fill("#password", "pca-dev-org-1234");
  await p.getByRole("button", { name: /로그인|재설정 링크 받기/ }).click();
  await p.waitForURL("**/org");
  await shot(p, "09-org-home");
  await c.close();
}

await browser.close();
console.log("done");
