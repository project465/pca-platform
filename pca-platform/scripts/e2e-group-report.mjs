/**
 * 단체 리포트를 확인한다.
 *
 * 담당자가 보는 화면이고 개인 결과지와 목적이 다르다 — 한 사람이 어디로
 * 갈지가 아니라 학과가 무엇을 손봐야 하는지를 본다. 그래서 개인이 드러나지
 * 않는지도 함께 본다.
 *
 * e2e-report.mjs 가 먼저 돌아 채점된 응시가 있어야 한다.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORG_ID = process.env.ORG_ADMIN_ID ?? "me-admin";
const ORG_PW = process.env.ORG_ADMIN_PW ?? "pca-dev-org-1234";
const COHORT = Number(process.env.DEMO_STUDENTS ?? 24);

let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

/* 한 명뿐이면 분포도 충족률도 볼 것이 없다. 화면 확인용 응시자를 더 만든다 */
try {
  execFileSync("npx", ["--yes", "tsx", "scripts/dev-sample-result.ts", "--students", String(COHORT)],
    { stdio: "pipe" });
  ok(`확인용 응시자 ${COHORT}명을 더 만들었다`);
} catch (e) {
  bad(`응시자를 만들지 못했다: ${String(e).slice(0, 140)}`);
}

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();

await p.goto(`${BASE}/login`);
await p.fill('input[name="identifier"]', ORG_ID);
await p.fill('input[name="password"]', ORG_PW);
await p.click('button[type="submit"], button.act');
await p.waitForTimeout(1800);

await p.goto(`${BASE}/org`);
await p.waitForTimeout(800);
const href = await p.evaluate(() => {
  const a = [...document.querySelectorAll("a")].find((x) => x.textContent.includes("단체 리포트"));
  return a ? a.getAttribute("href") : null;
});
href ? ok("회차 표에 단체 리포트 링크가 있다") : bad("링크가 없다");
if (!href) { await b.close(); process.exit(1); }

await p.goto(BASE + href);
await p.waitForTimeout(900);
const body = await p.innerText("body");

body.includes("단체 리포트") ? ok("리포트가 열린다") : bad(`리포트가 아니다: ${body.slice(0, 140)}`);
body.includes("학생들이 몰린 직무") ? ok("직무 분포 절이 있다") : bad("직무 분포가 없다");
body.includes("비어 있는 역량") ? ok("역량 충족률 절이 있다") : bad("충족률이 없다");
body.includes("커리큘럼 검토가 필요한 과목") ? ok("과목 절이 있다") : bad("과목 절이 없다");
body.includes("미제출") ? ok("미제출 인원이 보인다") : bad("미제출이 없다");

const bands = await p.locator(".band div").count();
bands > 1 ? ok(`직무가 ${bands}갈래로 나뉘어 보인다`) : bad(`분포 막대가 ${bands}칸뿐이다`);

/* 막대 너비의 합이 100% 여야 한다. 한 칸이라도 어긋나면 눈에 띈다 */
const widthSum = await p.evaluate(() =>
  [...document.querySelectorAll(".band div")]
    .reduce((s, d) => s + parseFloat(d.style.width), 0));
Math.abs(widthSum - 100) < 0.6 ? ok("분포 막대가 정확히 폭을 채운다") : bad(`막대 합이 ${widthSum.toFixed(1)}%`);

const meters = await p.locator(".cg").count();
meters > 0 ? ok(`역량 ${meters}개의 충족률이 보인다`) : bad("충족률 줄이 없다");

/* 충족률이 낮은 것부터 나와야 한다 — 손대야 할 것이 위에 있어야 쓸모가 있다 */
const pcts = await p.evaluate(() =>
  [...document.querySelectorAll(".cg .pct")].map((e) => parseInt(e.textContent, 10)));
const sorted = pcts.every((v, i) => i === 0 || pcts[i - 1] <= v);
sorted ? ok("충족률이 낮은 역량이 위에 온다") : bad(`정렬이 틀렸다: ${pcts.join(", ")}`);

body.includes("개인이 무엇이 부족한지는 이 화면에 나오지 않습니다")
  ? ok("집계만 보여준다는 것을 밝힌다") : bad("주의 문구가 없다");

/* 개인 이름이 새어 나오면 안 된다 */
body.includes("예시응시자") ? bad("개인 이름이 리포트에 드러난다") : ok("개인 이름이 드러나지 않는다");

/* ── 남의 기관 회차는 열리지 않는다 ── */
await p.goto(`${BASE}/org/report/999999`);
await p.waitForTimeout(600);
const t = await p.innerText("body");
(t.includes("찾을 수 없") || t.includes("could not be found"))
  ? ok("없는 회차의 리포트는 열리지 않는다")
  : bad(`없는 회차가 열린다: ${t.slice(0, 90)}`);

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
