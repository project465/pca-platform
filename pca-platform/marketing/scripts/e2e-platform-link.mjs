/**
 * 소개 사이트에서 로그인을 누르면 검사 플랫폼으로 넘어가는지 확인한다.
 *
 * 두 앱은 별개다(설계 원칙 5). 소개 사이트는 나라별이고 플랫폼은 하나이므로,
 * 눌렀을 때 실제로 그 하나로 가는지는 두 앱을 함께 띄워야만 알 수 있다.
 *
 *   SITE=kr PLATFORM_URL=http://localhost:3000 npm start   (소개 사이트, 3100)
 *   npm start                                              (플랫폼, 3000)
 *   node scripts/e2e-platform-link.mjs
 */
import { chromium } from "playwright";

const SITE = process.env.SITE_URL ?? "http://localhost:3100";
const PLATFORM = process.env.PLATFORM_URL ?? "http://localhost:3000";

let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

await p.goto(SITE);
await p.waitForTimeout(600);

/* 머리의 로그인 */
const header = p.locator(".site-header .right a", { hasText: /로그인|Sign in/ });
(await header.count()) ? ok("머리에 로그인 단추가 있다") : bad("머리에 로그인이 없다");

const href = await header.first().getAttribute("href");
href === `${PLATFORM}/login`
  ? ok(`플랫폼 로그인을 가리킨다 (${href})`)
  : bad(`엉뚱한 곳을 가리킨다: ${href}`);

/* 실제로 눌러 본다 — 주소만 맞고 안 열리면 소용이 없다 */
await header.first().click();
await p.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
p.url().startsWith(`${PLATFORM}/login`)
  ? ok("눌러서 플랫폼으로 넘어간다")
  : bad(`넘어가지 않았다: ${p.url()}`);

const body = await p.innerText("body");
body.includes("학번 또는 이메일") || body.toLowerCase().includes("sign in")
  ? ok("플랫폼 로그인 화면이 열린다")
  : bad(`로그인 화면이 아니다: ${body.slice(0, 120)}`);

/* 꼬리에도 있어야 한다. 아래까지 읽고 내려온 사람이 다시 위로 갈 이유가 없다 */
await p.goto(SITE);
await p.waitForTimeout(500);
const footer = p.locator(".site-footer a", { hasText: /로그인|Sign in/ });
(await footer.count()) ? ok("꼬리에도 로그인이 있다") : bad("꼬리에 로그인이 없다");
(await footer.first().getAttribute("href")) === `${PLATFORM}/login`
  ? ok("꼬리도 같은 곳을 가리킨다") : bad("꼬리가 다른 곳을 가리킨다");

/* 처리방침도 플랫폼 한 군데에 둔다. 나라별로 복사본을 두면 갈라진다 */
const priv = p.locator(".site-footer a", { hasText: /개인정보 처리방침|Privacy/ });
if (await priv.count()) {
  (await priv.first().getAttribute("href")) === `${PLATFORM}/privacy`
    ? ok("꼬리의 처리방침이 플랫폼을 가리킨다")
    : bad(`처리방침이 다른 곳을 가리킨다: ${await priv.first().getAttribute("href")}`);
} else {
  ok("이 나라 사이트에는 처리방침 링크가 없다 — 그 말로 된 판이 아직 없다");
}

/* 좁은 화면의 메뉴 안에도 있어야 한다 */
await p.setViewportSize({ width: 420, height: 800 });
await p.goto(SITE);
await p.waitForTimeout(500);
await p.click(".site-header details.mnav summary").catch(() => {});
await p.waitForTimeout(300);
const inMenu = await p.locator(".site-header details.mnav a", { hasText: /로그인|Sign in/ }).count();
inMenu ? ok("좁은 화면 메뉴에도 있다") : bad("좁은 화면에서 로그인을 찾을 수 없다");

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
