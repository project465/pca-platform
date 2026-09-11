/**
 * 문의 폼이 거짓말을 하지 않는지 본다.
 *
 * 정적으로 바뀌면서 폼이 브라우저에서 창구를 직접 부른다. 창구가 없거나
 * 거절하면 **접수되었다고 말하면 안 된다.** 이 검사가 지키는 것은 그 한 줄이다.
 * 접수됐다고 해 놓고 아무 데도 남지 않는 것이 이 사이트에서 가장 나쁜 고장이다.
 *
 *   npm run build:kr && node scripts/serve-static.mjs out-kr 3100   (다른 창)
 *   node scripts/e2e-contact.mjs
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
let fail = 0;
const ok = (c, m) => {
  console.log(`  ${c ? "통과" : "실패"}  ${m}`);
  if (!c) fail++;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });

/* 허니팟은 사람 눈에 보이면 안 된다 */
const hp = page.locator("form .hp").first();
ok((await hp.count()) > 0, "허니팟 칸이 있다");
/* Playwright 의 isVisible 은 1px 짜리 상자도 보인다고 한다. 사람 눈으로
   보이는지를 물어야 하므로 실제 위치와 투명도를 본다 */
const hpBox = await hp.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { left: r.left, opacity: getComputedStyle(el).opacity };
});
ok(hpBox.left < -1000, "허니팟 칸이 화면 밖에 있다");
ok(hpBox.opacity === "0", "허니팟 칸이 투명하다");
ok(await hp.evaluate((el) => el.getAttribute("aria-hidden") === "true"),
   "읽는 기계에도 감춰져 있다");

/* 창구를 가로채 거절을 돌려준다 — 창구가 죽었을 때와 같은 상황이다 */
await page.route("**/api/intake", (r) =>
  r.fulfill({ status: 500, contentType: "application/json", body: '{"ok":false}' }),
);

const form = page.locator("form").last();
await form.locator('input[name="org"]').fill("검사용 대학 경영학과");
await form.locator('input[name="name"]').fill("홍길동");
await form.locator('input[name="email"]').fill("test@example.ac.kr");
await form.locator('button[type="submit"]').click();
await page.waitForTimeout(1200);

const body = await page.innerText("body");
ok(!body.includes("문의가 접수되었습니다"), "거절당했을 때 접수됐다고 하지 않는다");
ok(body.includes("hari_info@hari.re.kr"), "대신 메일 주소를 알려 준다");

/* 이번에는 창구가 받아 준다 */
await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
await page.route("**/api/intake", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: '{"ok":true,"refCode":"MT-2026-0001"}',
  }),
);
const form2 = page.locator("form").last();
await form2.locator('input[name="org"]').fill("검사용 대학 경영학과");
await form2.locator('input[name="name"]').fill("홍길동");
await form2.locator('input[name="email"]').fill("test@example.ac.kr");
await form2.locator('button[type="submit"]').click();
await page.waitForTimeout(1200);

const body2 = await page.innerText("body");
ok(body2.includes("문의가 접수되었습니다"), "받아 주면 접수됐다고 한다");
ok(body2.includes("MT-2026-0001"), "접수번호를 보여 준다");

await browser.close();
console.log(fail === 0 ? "\n전부 통과" : `\n${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
