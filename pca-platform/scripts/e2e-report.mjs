/**
 * 결과지 화면의 세 가지 상태를 확인한다.
 *
 *   채점 전  →  공개 전  →  공개됨
 *
 * 채점 산식이 아직 없으므로 가운데를 넘어가려면 값을 넣어야 한다.
 * scripts/dev-sample-result.ts 가 그 일을 하며, 그 숫자는 채점 결과가 아니다.
 *
 * e2e-exam.mjs 가 먼저 돌아 제출된 응시가 있어야 한다.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SID = process.env.STUDENT_ID ?? "2021001234";
const SPW = process.env.STUDENT_PW_AFTER ?? "exam-student-pass-1234";
const ORG_ID = process.env.ORG_ADMIN_ID ?? "me-admin";
const ORG_PW = process.env.ORG_ADMIN_PW ?? "pca-dev-org-1234";

let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

const b = await chromium.launch();

async function signIn(page, id, pw) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="identifier"]', id);
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"], button.act');
  await page.waitForTimeout(1800);
}

/* ── 1. 채점 전 ── */
let ctx = await b.newContext();
let p = await ctx.newPage();
await signIn(p, SID, SPW);
await p.goto(`${BASE}/my`);
await p.waitForTimeout(700);

const reportHref = await p.evaluate(() => {
  const a = [...document.querySelectorAll("a")].find((x) => x.textContent.includes("결과지 보기"));
  return a ? a.getAttribute("href") : null;
});
reportHref ? ok("제출한 회차에 결과지 링크가 생긴다") : bad("결과지 링크가 없다");
if (!reportHref) { await b.close(); process.exit(1); }

await p.goto(BASE + reportHref);
await p.waitForTimeout(600);
let body = await p.innerText("body");
body.includes("채점을 기다리고 있습니다")
  ? ok("채점 전에는 기다리는 화면이 나온다")
  : bad(`채점 전 화면이 아니다: ${body.slice(0, 120)}`);

/* ── 2. 점수를 넣는다 (채점이 아니라 화면 확인용) ── */
try {
  execFileSync("npx", ["--yes", "tsx", "scripts/dev-sample-result.ts"], { stdio: "pipe" });
  ok("확인용 점수를 넣었다");
} catch (e) {
  bad(`점수를 넣지 못했다: ${String(e).slice(0, 140)}`);
}

await p.goto(BASE + reportHref);
await p.waitForTimeout(600);
body = await p.innerText("body");
body.includes("공개되지 않았습니다")
  ? ok("점수가 있어도 담당자가 공개하기 전에는 막힌다")
  : bad(`공개 전 화면이 아니다: ${body.slice(0, 140)}`);

/* ── 3. 담당자가 공개한다 ── */
const octx = await b.newContext();
const op = await octx.newPage();
await signIn(op, ORG_ID, ORG_PW);
await op.goto(`${BASE}/org`);
await op.waitForTimeout(800);
const before = await op.innerText("body");
before.includes("결과 공개") ? ok("담당자 화면에 결과 공개 단추가 있다") : bad("공개 단추가 없다");
await op.click('button:text-is("결과 공개")');
await op.waitForTimeout(2000);
(await op.innerText("body")).includes("공개")
  ? ok("공개했다")
  : bad("공개되지 않았다");
await octx.close();

/* ── 4. 학생이 결과지를 본다 ── */
await p.goto(BASE + reportHref);
await p.waitForTimeout(800);
body = await p.innerText("body");
body.includes("가장 가까운 직무") ? ok("결과지가 열린다") : bad(`결과지가 아니다: ${body.slice(0, 140)}`);
body.includes("구조·유동 해석") ? ok("1순위 직무가 보인다") : bad("직무가 없다");
body.includes("82") ? ok("적합도 점수가 보인다") : bad("점수가 없다");
body.includes("요구하는 역량") ? ok("요구 역량 절이 있다") : bad("역량 절이 없다");
body.includes("충족") && body.includes("부족") ? ok("충족·부족이 갈려 보인다") : bad("역량 판정이 없다");
body.includes("유한요소해석") ? ok("메울 과목이 보인다") : bad("과목이 없다");
body.includes("진로를 확정하는 판정이 아닙니다") ? ok("한계를 밝히는 문구가 있다") : bad("주의 문구가 없다");

const gauges = await p.locator(".gauge").count();
gauges === 5 ? ok(`직무 ${gauges}개가 모두 그려진다`) : bad(`직무 막대가 ${gauges}개`);
const blocks = await p.locator(".comp").count();
blocks === 6 ? ok(`역량 ${blocks}개가 모두 그려진다`) : bad(`역량 줄이 ${blocks}개`);

/* ── 5. 남의 결과지는 열리지 않는다 ── */
await p.goto(`${BASE}/report/999999`);
await p.waitForTimeout(600);
const t = await p.innerText("body");
(t.includes("찾을 수 없") || t.includes("could not be found"))
  ? ok("없는 결과지는 열리지 않는다")
  : bad(`없는 결과지가 열린다: ${t.slice(0, 90)}`);

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
