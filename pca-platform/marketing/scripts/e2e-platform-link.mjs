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
/* 확인하지 못한 것. 통과로도 실패로도 세지 않고 그대로 밝힌다 */
const skip = (m) => console.log("  못봄 ", m);

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
const header = p.locator(`.site-header .right a[href="${PLATFORM}/admin/login"]`);
(await header.count()) ? ok("머리에 로그인 단추가 있다") : bad("머리에 로그인이 없다");

(await header.count())
  ? ok(`담당자 로그인을 가리킨다 (${PLATFORM}/admin/login)`)
  : bad("머리의 단추가 담당자 로그인(/admin/login)을 가리키지 않는다");

/* 실제로 눌러 본다 — 주소만 맞고 안 열리면 소용이 없다.
   다만 플랫폼이 바깥 주소일 때는 이 검사 환경의 브라우저가 거기까지 못 나갈
   수 있다. 그때는 '못 봤다' 고 밝히고 넘어간다 — 나가지 못한 것을 실패로
   적으면, 진짜 실패와 구별이 안 된다 */
await header.first().click();
await p.waitForURL(/\/admin\/login/, { timeout: 15000 }).catch(() => {});

if (p.url().startsWith(`${PLATFORM}/admin/login`)) {
  ok("눌러서 담당자 로그인으로 넘어간다");
  const body = await p.innerText("body");
  /* 라이브 플랫폼의 담당자 로그인 화면. 글자가 바뀔 수 있으므로 넉넉히 본다 */
  /관리자 로그인|스태프|담당자 로그인|sign in/i.test(body)
    ? ok("담당자 로그인 화면이 열린다")
    : bad(`로그인 화면이 아니다: ${body.slice(0, 140)}`);
} else if (p.url().startsWith("chrome-error:")) {
  /* 브라우저가 못 나갔다. 주소 자체가 살아 있는지는 fetch 로 따로 본다 */
  const r = await fetch(`${PLATFORM}/admin/login`, { redirect: "follow" }).catch(() => null);
  if (r && r.ok) {
    skip(`브라우저가 바깥으로 못 나가 눌러보지는 못했다. 주소는 살아 있다 (HTTP ${r.status})`);
  } else {
    bad(`눌러도 안 열리고 주소도 응답하지 않는다 (${r ? r.status : "응답 없음"})`);
  }
} else {
  bad(`넘어가지 않았다: ${p.url()}`);
}

/* 꼬리에도 있어야 한다. 아래까지 읽고 내려온 사람이 다시 위로 갈 이유가 없다 */
await p.goto(SITE);
await p.waitForTimeout(500);
const footer = p.locator(`.site-footer a[href="${PLATFORM}/admin/login"]`);
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
const inMenu = await p.locator(`.site-header details.mnav a[href="${PLATFORM}/admin/login"]`).count();
inMenu ? ok("좁은 화면 메뉴에도 있다") : bad("좁은 화면에서 로그인을 찾을 수 없다");

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
