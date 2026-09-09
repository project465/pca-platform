/**
 * 응시를 브라우저로 한 바퀴 돌린다 — 시작, 즉시 저장, 이어보기, 제출.
 *
 * 이어보기가 이 검사의 핵심이다. 창을 닫아도 응답이 남고 답한 다음 문항부터
 * 다시 시작해야 한다. 그래서 중간에 브라우저 맥락을 통째로 버리고 새로
 * 들어가 확인한다 — 화면 안에서만 눌러 보면 서버에 저장됐는지 알 수 없다.
 *
 *   BASE_URL      기본 http://localhost:3000
 *   STUDENT_ID/PW 시드가 만든 학생 (기본 2021001234 / TempPass2026)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SID = process.env.STUDENT_ID ?? "2021001234";
const SPW = process.env.STUDENT_PW ?? "TempPass2026";
const NEW_PW = "exam-student-pass-1234";

let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

const b = await chromium.launch();

async function signIn(page, pw) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="identifier"]', SID);
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"], button.act');
  await page.waitForTimeout(1800);
}

/* ── 첫 로그인은 비밀번호를 바꾸게 되어 있다 ── */
let ctx = await b.newContext();
let p = await ctx.newPage();
await signIn(p, SPW);
if (p.url().includes("/password/change")) {
  ok("첫 로그인은 비밀번호 변경으로 보낸다");
  // 이 화면은 지금 쓰던 임시 비밀번호도 함께 묻는다
  await p.fill('input[name="current"]', SPW);
  await p.fill('input[name="next"]', NEW_PW);
  await p.fill('input[name="confirm"]', NEW_PW);
  await p.click('button[type="submit"], button.act');
  await p.waitForTimeout(1800);
} else {
  bad(`비밀번호 변경 화면으로 가지 않았다: ${p.url()}`);
}

await p.goto(`${BASE}/my`);
await p.waitForTimeout(700);
let body = await p.innerText("body");
body.includes("응시 시작") || body.includes("이어서 응시하기")
  ? ok("내 검사에 응시할 회차가 보인다")
  : bad(`회차가 없다: ${body.slice(0, 140)}`);

/* ── 응시 시작 ── */
await p.click('button:text-is("응시 시작")').catch(async () => {
  await p.click('button:text-is("이어서 응시하기")');
});
await p.waitForURL(/\/test\//, { timeout: 15000 }).catch(() => {});
p.url().includes("/test/") ? ok("응시 화면으로 들어간다") : bad(`응시 화면이 아니다: ${p.url()}`);
const testUrl = p.url();

const total = Number((await p.innerText(".bar .count")).split("/")[1].trim());
total > 0 ? ok(`문항 ${total}개를 받았다`) : bad("문항 수를 읽지 못했다");

/* 세 문항을 답한다 */
for (let n = 0; n < 3; n++) {
  await p.locator(".opt").first().click();
  await p.waitForTimeout(700);
}
(await p.innerText("body")).includes("문항 4") ? ok("답하면 다음 문항으로 넘어간다") : bad("문항이 넘어가지 않는다");

/* ── 여기서 브라우저를 통째로 버린다. 저장이 서버에 갔는지 보려면 이래야 한다 ── */
await ctx.close();
ctx = await b.newContext();
p = await ctx.newPage();
await signIn(p, NEW_PW);
await p.goto(`${BASE}/my`);
await p.waitForTimeout(700);
body = await p.innerText("body");
body.includes("이어서 응시하기") ? ok("다시 들어오면 이어하기로 바뀐다") : bad("이어하기가 없다");
body.includes("3번까지 답하셨습니다") ? ok("어디까지 답했는지 기억한다") : bad(`진행 상황이 없다: ${body.slice(0,160)}`);

await p.click('button:text-is("이어서 응시하기")');
await p.waitForURL(/\/test\//, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(600);
const qno = await p.innerText(".qno");
qno.includes("문항 4") ? ok("답한 다음 문항부터 이어진다") : bad(`이어보기 지점이 틀렸다: ${qno}`);

/* ── 다 답하지 않은 채로는 제출되지 않아야 한다 ── */
await p.goto(testUrl);
await p.waitForTimeout(600);
for (let n = 0; n < total - 4; n++) {
  await p.locator(".opt").first().click();
  await p.waitForTimeout(600);
}
// 마지막 문항 화면. 아직 한 문항이 비어 있다
const submitBtn = p.locator('button:text-is("제출하기")');
if (await submitBtn.count()) {
  const disabled = await submitBtn.first().isDisabled();
  disabled ? ok("빠뜨린 문항이 있으면 제출 단추가 잠긴다") : bad("덜 답했는데 제출할 수 있다");
} else {
  bad("마지막 문항에서 제출 단추가 보이지 않는다");
}

/* 남은 문항을 채운다 */
for (let n = 0; n < total; n++) {
  const shown = await p.locator(".opt[aria-pressed='true']").count();
  if (shown === 0) { await p.locator(".opt").first().click(); await p.waitForTimeout(600); }
  const prev = p.locator('button:text-is("이전")');
  if (await prev.isEnabled()) { await prev.click(); await p.waitForTimeout(300); } else break;
}
// 마지막으로 이동해 제출
await p.goto(testUrl);
await p.waitForTimeout(600);
for (let n = 0; n < total; n++) {
  const nextBtn = p.locator('button:text-is("다음")');
  if (await nextBtn.count() && await nextBtn.first().isEnabled()) {
    await nextBtn.first().click(); await p.waitForTimeout(250);
  } else break;
}
const finalSubmit = p.locator('button:text-is("제출하기")');
if (await finalSubmit.count() && !(await finalSubmit.first().isDisabled())) {
  await finalSubmit.first().click();
  await p.waitForTimeout(2000);
  const after = await p.innerText("body");
  after.includes("응답이 모두 제출되었습니다") ? ok("제출된다") : bad(`제출 화면이 아니다: ${after.slice(0,140)}`);
} else {
  bad("모두 답했는데도 제출 단추가 잠겨 있다");
}

/* ── 제출한 뒤에는 다시 응시할 수 없다 ── */
await p.goto(testUrl);
await p.waitForTimeout(700);
(await p.innerText("body")).includes("응답이 모두 제출되었습니다")
  ? ok("제출한 응시를 다시 열면 완료 화면이 나온다")
  : bad("제출 뒤에도 문항이 다시 열린다");

/* ── 남의 응시는 열리지 않는다 ── */
const foreign = testUrl.replace(/\/test\/\d+$/, "/test/999999");
await p.goto(foreign);
await p.waitForTimeout(600);
const t = await p.innerText("body");
(t.includes("찾을 수 없") || t.includes("404") || t.includes("This page could not be found"))
  ? ok("없는 응시는 열리지 않는다")
  : bad(`없는 응시가 열린다: ${t.slice(0, 90)}`);

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
