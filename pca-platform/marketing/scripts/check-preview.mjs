/**
 * 뽑아낸 정적 미리보기가 실제로 넘어가는지 확인한다.
 *
 * 타입 검사와 빌드로는 이걸 못 잡는다. 한번 이런 일이 있었다 —
 * 본문에 이미 있던 앵커 id="pricing" 과 페이지를 감싸는 칸의 id 가
 * 겹쳐서, 요금제를 눌러도 홈이 그대로 있었다. 타입도 맞고 빌드도 됐다.
 * 브라우저로 열어 봐야만 드러나는 종류라 여기서 본다.
 *
 *   node scripts/check-preview.mjs /tmp/preview-kr.html
 *
 * 경로 목록은 파일에서 읽는다. 페이지를 늘려도 이 파일은 고치지 않는다.
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("쓸 파일을 받지 못했습니다. 예: node scripts/check-preview.mjs /tmp/preview-kr.html");
  process.exit(2);
}
const path = resolve(file);
if (!existsSync(path)) {
  console.error(`파일이 없습니다: ${path}`);
  process.exit(2);
}

/** 본문이 있다고 볼 최소 높이. 빈 칸이 통과하지 않게 한다 */
const MIN_HEIGHT = 1200;

const fails = [];
const fail = (m) => { fails.push(m); console.log(`  실패  ${m}`); };
const pass = (m) => console.log(`  통과  ${m}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(`file://${path}`);
await page.waitForTimeout(400);

const routes = await page.evaluate(() =>
  [...document.querySelectorAll(".route")].map((r) => r.id)
);

if (routes.length < 2) {
  fail(`페이지 칸이 ${routes.length}개뿐입니다. 뽑아내기가 제대로 되지 않았습니다`);
} else {
  pass(`페이지 ${routes.length}개를 찾았습니다: ${routes.join(", ")}`);
}

/* 칸의 id 를 본문의 앵커가 가로채고 있지 않은지.
   :target 은 문서에서 먼저 나오는 쪽을 잡으므로 이름이 겹치면 안 된다 */
const stolen = await page.evaluate(() =>
  [...document.querySelectorAll(".route")]
    .map((r) => r.id)
    .filter((id) => document.getElementById(id)?.classList.contains("route") === false)
);
if (stolen.length) fail(`본문 앵커와 이름이 겹치는 칸: ${stolen.join(", ")}`);
else pass("칸의 id 를 본문 앵커가 가로채지 않습니다");

/* 해시가 없을 때는 홈 */
const home = await page.evaluate(() =>
  [...document.querySelectorAll(".route")]
    .filter((r) => getComputedStyle(r).display !== "none")
    .map((r) => r.id)
);
if (home.length !== 1) fail(`해시 없이 열었을 때 보이는 페이지가 ${home.length}개입니다`);
else if (!home[0].endsWith("home")) fail(`해시 없이 열면 홈이 아니라 ${home[0]} 이 나옵니다`);
else pass("해시 없이 열면 홈이 나옵니다");

/* 경로마다 제 페이지 하나만 */
for (const id of routes) {
  await page.goto(`file://${path}#${id}`);
  await page.waitForTimeout(250);
  const seen = await page.evaluate(() => {
    const shown = [...document.querySelectorAll(".route")].filter(
      (r) => getComputedStyle(r).display !== "none"
    );
    return { ids: shown.map((r) => r.id), height: document.body.scrollHeight };
  });
  if (seen.ids.length !== 1) fail(`#${id} → 보이는 페이지가 ${seen.ids.length}개 (${seen.ids.join(", ")})`);
  else if (seen.ids[0] !== id) fail(`#${id} → 엉뚱하게 ${seen.ids[0]} 이 나옵니다`);
  else if (seen.height < MIN_HEIGHT) fail(`#${id} → 내용이 비어 보입니다 (${seen.height}px)`);
  else pass(`#${id} (${seen.height}px)`);
}

/* 메뉴가 없는 페이지를 가리키고 있지 않은지 */
await page.goto(`file://${path}`);
await page.waitForTimeout(250);
const dangling = await page.evaluate(() => {
  const ids = new Set([...document.querySelectorAll(".route")].map((r) => r.id));
  return [...document.querySelectorAll(".site-header a, .site-footer a")]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h.startsWith("#page-"))
    .filter((h) => !ids.has(h.slice(1)));
});
if (dangling.length) fail(`가리키는 페이지가 없는 링크: ${[...new Set(dangling)].join(", ")}`);
else pass("메뉴와 바닥글 링크가 전부 실제 페이지를 가리킵니다");

/* 남은 것: 가로 스크롤과 자바스크립트 오류 */
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 2
);
if (overflow) fail("가로 스크롤이 생깁니다");
else pass("가로 스크롤 없음");

if (errors.length) fail(`자바스크립트 오류 ${errors.length}건: ${errors[0]}`);
else pass("자바스크립트 오류 없음");

await browser.close();

console.log("");
if (fails.length) {
  console.error(`${fails.length}건 실패`);
  process.exit(1);
}
console.log("전부 통과");
