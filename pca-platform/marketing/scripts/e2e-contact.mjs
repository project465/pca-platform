/**
 * 문의 폼이 거짓말을 하지 않는지 본다.
 *
 * 정적으로 바뀌면서 폼이 브라우저에서 창구를 직접 부른다. 창구가 없거나
 * 거절하면 **접수되었다고 말하면 안 된다.** 이 검사가 지키는 것은 그 한 줄이다.
 * 접수됐다고 해 놓고 아무 데도 남지 않는 것이 이 사이트에서 가장 나쁜 고장이다.
 *
 * **글자가 아니라 화면의 모양으로 본다.** 판이 셋이고 말이 다 다르므로
 * 한국어 문구로 확인하면 나머지 두 판에서 거짓 실패가 난다. 성공은
 * `.notice.ok` 가 나오는 것이고 실패는 `.notice.err` 가 나오는 것이다.
 *
 *   npm run build:kr && node scripts/serve-static.mjs out-kr 3100   (다른 창)
 *   node scripts/e2e-contact.mjs
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
/** 세 판이 함께 쓰는 것. 응급 문구에는 이 주소가 들어 있어야 한다 */
const FALLBACK_MAIL = "hari_info@hari.re.kr";

let fail = 0;
const ok = (c, m) => {
  console.log(`  ${c ? "통과" : "실패"}  ${m}`);
  if (!c) fail++;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function fillAndSend() {
  const form = page.locator("form").last();
  await form.locator('input[name="org"]').fill("Test University · Dept");
  await form.locator('input[name="name"]').fill("Test Person");
  await form.locator('input[name="email"]').fill("test@example.ac.kr");
  await form.locator('button[type="submit"]').click();
  await page.waitForTimeout(1200);
}

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
ok(
  await hp.evaluate((el) => el.getAttribute("aria-hidden") === "true"),
  "읽는 기계에도 감춰져 있다",
);

/* ① 창구가 거절한다 — 창구가 죽었을 때와 같은 상황이다 */
await page.route("**/api/intake", (r) =>
  r.fulfill({ status: 500, contentType: "application/json", body: '{"ok":false}' }),
);
await fillAndSend();

ok((await page.locator(".notice.ok").count()) === 0, "거절당했을 때 접수됐다고 하지 않는다");
const err = page.locator(".notice.err").first();
ok((await err.count()) > 0, "거절당했을 때 알린다");
ok(((await err.innerText().catch(() => "")) || "").includes(FALLBACK_MAIL),
   "대신 메일 주소를 알려 준다");

/* ② 창구가 200 을 주지만 본문이 ok:false 다. 이것도 실패다 */
await page.unroute("**/api/intake");
await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
await page.route("**/api/intake", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":false,"error":"spam"}' }),
);
await fillAndSend();
ok((await page.locator(".notice.ok").count()) === 0, "200 이어도 ok:false 면 접수가 아니다");

/* ③ 창구가 받아 준다 */
await page.unroute("**/api/intake");
await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
await page.route("**/api/intake", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: '{"ok":true,"refCode":"MT-2026-0001"}',
  }),
);
await fillAndSend();

const okBox = page.locator(".notice.ok").first();
ok((await okBox.count()) > 0, "받아 주면 접수됐다고 한다");
ok(((await okBox.innerText().catch(() => "")) || "").includes("MT-2026-0001"),
   "접수번호를 보여 준다");

await browser.close();
console.log(fail === 0 ? "\n전부 통과" : `\n${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
