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

/* 두 앱이 모두 우리가 방금 띄운 것인지 확인한다.
   3100 에 예전 빌드가 남아 있으면 — 다른 PLATFORM_URL 로 구운 빌드가 —
   검사는 남의 서버를 두드리면서 엉뚱하게 실패한다. 조용히 틀린 것을
   확인하느니 여기서 멈춘다. verify.sh 의 포트 검사와 같은 이유다 */
for (const [name, url] of [["소개 사이트", SITE], ["플랫폼", PLATFORM]]) {
  const r = await fetch(url, { redirect: "manual" }).catch(() => null);
  if (!r) {
    console.error(`${name}(${url})가 응답하지 않습니다. 먼저 띄우세요.`);
    process.exit(2);
  }
}

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

await p.goto(SITE);
await p.waitForTimeout(600);

/* 머리의 로그인.
   글자로 찾지 않는다 — 나라마다 말이 달라서(로그인 / Sign in / Кіру)
   글자로 찾으면 나라를 더할 때마다 이 파일을 고쳐야 한다. 가리키는 곳으로 찾는다 */
const header = p.locator(`.site-header .right a[href="${PLATFORM}/login"]`);
(await header.count()) ? ok("머리에 로그인 단추가 있다") : bad("머리에 로그인이 없다");

(await header.count())
  ? ok(`플랫폼 로그인을 가리킨다 (${PLATFORM}/login)`)
  : bad("머리의 단추가 플랫폼 로그인을 가리키지 않는다");

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
const footer = p.locator(`.site-footer a[href="${PLATFORM}/login"]`);
(await footer.count()) ? ok("꼬리에도 로그인이 있다") : bad("꼬리에 로그인이 없다");
(await footer.count())
  ? ok("꼬리도 같은 곳을 가리킨다") : bad("꼬리가 다른 곳을 가리킨다");

/* 처리방침도 플랫폼 한 군데에 둔다. 나라별로 복사본을 두면 갈라진다 */
const priv = p.locator(`.site-footer a[href="${PLATFORM}/privacy"]`);
if (await priv.count()) {
  ok("꼬리의 처리방침이 플랫폼을 가리킨다");
} else {
  ok("이 나라 사이트에는 처리방침 링크가 없다 — 그 말로 된 판이 아직 없다");
}

/* 좁은 화면의 메뉴 안에도 있어야 한다 */
await p.setViewportSize({ width: 420, height: 800 });
await p.goto(SITE);
await p.waitForTimeout(500);
await p.click(".site-header details.mnav summary").catch(() => {});
await p.waitForTimeout(300);
const inMenu = await p.locator(`.site-header details.mnav a[href="${PLATFORM}/login"]`).count();
inMenu ? ok("좁은 화면 메뉴에도 있다") : bad("좁은 화면에서 로그인을 찾을 수 없다");

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
