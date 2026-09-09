/**
 * 건당 정산 계약을 브라우저로 한 바퀴 돌린다.
 *
 * 대학 산학협력단, 지역 일자리·경제진흥원, 고용노동부 위탁사업은 응시권을
 * 미리 사 두지 않고 나간 건수로 정산한다. 그래서 여기서 확인할 것은
 * 돈이 걸린 세 가지다.
 *
 *   1. 미리 산 좌석이 없어도 학생이 등록하고 응시할 수 있는가
 *   2. 제출된 건에만 청구가 쌓이는가 (시작만 한 건은 세지 않는가)
 *   3. 발주처가 정한 건수 상한을 넘겨 응시가 시작되지 않는가
 *
 * 세 번째가 특히 중요하다. 상한을 넘겨 버리면 청구할 수 없는 건이 생기고,
 * 그 비용은 우리가 문다.
 *
 *   BASE_URL       기본 http://localhost:3000
 *   INTAKE_SECRET  접수 API 에 대는 값 (필수)
 *   ADMIN_ID/PW    운영자 계정
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.INTAKE_SECRET;
const ADMIN_ID = process.env.ADMIN_ID ?? "admin";
const ADMIN_PW = process.env.ADMIN_PW ?? "pca-dev-admin-1234";

if (!SECRET) {
  console.error("INTAKE_SECRET 이 없습니다.");
  process.exit(2);
}

let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

const tag = Date.now().toString(36).toUpperCase().slice(-6);
const ORG = `건당대학교-${tag}`;
const EMAIL = `pu-${tag.toLowerCase()}@example.ac.kr`;
const CODE = `PU-${tag}`;
const UNIT = 15000;   // 건당 단가
const CAP = 2;        // 발주처가 정한 건수 상한
const PW = "per-use-pass-1234";

const b = await chromium.launch();

/* ── 1. 신청 접수 ── */
const res = await fetch(`${BASE}/api/applications`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-intake-secret": SECRET },
  body: JSON.stringify({
    site: "kr", country: "KR", orgName: ORG, deptName: "기계공학과",
    contactName: "박담당", contactEmail: EMAIL, expectedSize: 40,
    message: "건당 정산 검사가 넣은 신청입니다.",
  }),
});
if (res.status !== 201) { bad(`신청 접수가 201 이 아니다 (${res.status})`); process.exit(1); }
const { refCode } = await res.json();
ok(`신청 접수됨 · ${refCode}`);

/* ── 2. 운영자가 건당 계약으로 승인 ── */
const actx = await b.newContext();
const ap = await actx.newPage();
await ap.goto(`${BASE}/login`);
await ap.fill('input[name="identifier"]', ADMIN_ID);
await ap.fill('input[name="password"]', ADMIN_PW);
await ap.click('button[type="submit"], button.act');
await ap.waitForTimeout(1800);

await ap.goto(`${BASE}/admin/applications`);
await ap.waitForTimeout(700);
const href = await ap.getAttribute(`a:near(:text("${refCode}"))`, "href").catch(() => null)
  ?? await ap.evaluate((code) => {
    const row = [...document.querySelectorAll("tr")].find((t) => t.textContent.includes(code));
    return row?.querySelector("a")?.getAttribute("href") ?? null;
  }, refCode);
if (!href) { bad("검토 링크를 찾지 못했다"); process.exit(1); }
await ap.goto(BASE + href);
await ap.waitForTimeout(800);

/* 정산 방식을 고르면 아래 칸들이 바뀐다 */
await ap.selectOption("#billing", "per_use");
await ap.waitForTimeout(300);
(await ap.locator("#unitPrice").count()) ? ok("건당을 고르면 단가 칸이 나온다") : bad("단가 칸이 없다");
(await ap.locator("#useCap").count()) ? ok("건수 상한 칸이 나온다") : bad("상한 칸이 없다");

/* 단가 없이 내면 막혀야 한다. 단가 없는 건당 계약은 청구할 수가 없다 */
await ap.selectOption("#orgType", "department");
await ap.waitForTimeout(300);
const parents = await ap.$$eval("#parentId option", (os) => os.map((o) => o.value).filter(Boolean));
if (parents.length) await ap.selectOption("#parentId", parents[0]);
await ap.fill("#code", CODE);
await ap.evaluate(() => document.querySelector("#unitPrice")?.removeAttribute("required"));
await ap.click('button:text-is("승인하고 발급")');
await ap.waitForTimeout(2000);
(await ap.innerText("body")).includes("단가를 적어야")
  ? ok("단가 없는 건당 계약은 막힌다")
  : bad("단가 없이도 승인되었다");

/* 제대로 채워 다시 승인 */
await ap.selectOption("#billing", "per_use");
await ap.waitForTimeout(300);
await ap.selectOption("#orgType", "department");
await ap.waitForTimeout(300);
const parents2 = await ap.$$eval("#parentId option", (os) => os.map((o) => o.value).filter(Boolean));
if (parents2.length) await ap.selectOption("#parentId", parents2[0]);
await ap.fill("#code", CODE);
await ap.fill("#unitPrice", String(UNIT));
await ap.fill("#useCap", String(CAP));
await ap.click('button:text-is("승인하고 발급")');
await ap.waitForTimeout(2500);

const after = await ap.innerText("body");
after.includes("승인했습니다") ? ok("건당 계약으로 승인되었다") : bad(`승인 실패: ${after.slice(0, 200)}`);
const joinMatch = after.match(new RegExp(BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/join/[A-Za-z0-9_-]+"));
const setupMatch = after.match(new RegExp(BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/password/reset/[A-Za-z0-9_-]+"));
joinMatch ? ok("전용 링크가 발급된다") : bad("전용 링크가 없다");
/* 전달용 안내문은 textarea 안에 있어 innerText 로는 안 잡힌다 */
const notice = await ap.inputValue("textarea").catch(() => "");
notice.includes(`${CAP}명까지`)
  ? ok(`안내문의 등록 인원이 상한(${CAP})으로 맞춰진다`)
  : bad(`링크 인원이 상한과 다르다: ${notice.slice(0, 200)}`);
if (!joinMatch || !setupMatch) { await b.close(); process.exit(1); }

/* ── 3. 담당자 비밀번호 설정 ── */
const octx = await b.newContext();
const op = await octx.newPage();
await op.goto(setupMatch[0]);
await op.waitForTimeout(600);
await op.fill('input[name="next"]', PW);
await op.fill('input[name="confirm"]', PW);
await op.click('button[type="submit"], button.act');
await op.waitForTimeout(1800);

await op.goto(`${BASE}/login`);
await op.fill('input[name="identifier"]', EMAIL);
await op.fill('input[name="password"]', PW);
await op.click('button[type="submit"], button.act');
await op.waitForTimeout(1800);
op.url().includes("/org") ? ok("담당자로 로그인된다") : bad(`담당자 로그인 실패: ${op.url()}`);

const orgBody = await op.innerText("body");
orgBody.includes("나간 건수")
  ? ok("담당자 화면이 응시권 대신 건수를 보여준다")
  : bad(`건당 표시가 없다: ${orgBody.slice(0, 200)}`);
orgBody.includes("이번 달 예상 청구액")
  ? ok("이번 달 예상 청구액이 보인다") : bad("예상 청구액이 없다");
orgBody.includes(`${UNIT.toLocaleString("ko-KR")}원`)
  ? ok("건당 단가가 화면에 적혀 있다") : bad("단가가 화면에 없다");

/* 상한을 다 쓰기 전이므로 링크를 하나 더 만들 수 있다.
   상한(2)보다 많은 학생을 등록시켜 두어야 상한이 실제로 막는지 볼 수 있다 */
await op.click('button:has-text("새 링크 만들기")');
await op.waitForTimeout(400);
await op.fill("#label", `여분 ${tag}`);
await op.fill("#days", "30");
await op.fill("#maxUses", "1");
await op.click('button:text-is("만들기")');
await op.waitForTimeout(2500);
const extra = (await op.innerText("body")).match(/\/join\/[A-Za-z0-9_-]+/g);
const extraLink = extra ? BASE + extra[extra.length - 1] : null;
extraLink ? ok("여분 링크를 만들었다") : bad("여분 링크를 만들지 못했다");

/* 회차를 연다. 회차가 없으면 아무도 응시할 수 없다 */
await op.goto(`${BASE}/org`);
await op.waitForTimeout(600);
await op.click('button:has-text("회차 열기")');
await op.waitForTimeout(400);
await op.fill("#s-name", `건당 회차 ${tag}`);
const insts = await op.$$eval("#s-inst option", (os) => os.map((o) => o.value).filter(Boolean));
if (insts.length) await op.selectOption("#s-inst", insts[0]);
await op.click('button:text-is("회차 열기")');
await op.waitForTimeout(2500);
(await op.innerText("body")).includes(`건당 회차 ${tag}`) ? ok("회차를 열었다") : bad("회차를 열지 못했다");

/* ── 4. 학생 등록 — 미리 산 좌석이 없어도 들어와야 한다 ── */
const students = [];
const links = [joinMatch[0], joinMatch[0], extraLink];
for (let i = 0; i < 3; i++) {
  const ctx = await b.newContext();
  const sp = await ctx.newPage();
  await sp.goto(links[i]);
  await sp.waitForTimeout(500);
  const id = `${tag}P${i + 1}`;
  await sp.fill("#displayName", `건당학생${i + 1}`);
  await sp.fill("#loginId", id);
  await sp.fill("#password", PW);
  await sp.fill("#passwordConfirm", PW);
  await sp.check("#consent");
  await sp.click('button:text-is("응시자로 등록")');
  await sp.waitForTimeout(1800);
  if (sp.url().includes("/login")) { students.push(id); ok(`${i + 1}번째 학생 등록됨 (좌석 없이)`); }
  else bad(`${i + 1}번째 학생 등록 실패: ${(await sp.innerText("body")).slice(0, 120)}`);
  await ctx.close();
}

/* ── 5. 응시와 제출. 제출된 건에만 청구가 쌓인다 ── */
async function takeExam(loginId, submit) {
  const ctx = await b.newContext();
  const sp = await ctx.newPage();
  await sp.goto(`${BASE}/login`);
  await sp.fill('input[name="identifier"]', loginId);
  await sp.fill('input[name="password"]', PW);
  await sp.click('button[type="submit"], button.act');
  await sp.waitForTimeout(1800);
  await sp.goto(`${BASE}/my`);
  await sp.waitForTimeout(700);

  const CAPPED = "배정된 응시 건수가 모두 찼습니다";
  let capped = (await sp.innerText("body")).includes(CAPPED);

  /* 처음이면 '응시 시작', 이어가는 중이면 '이어서 응시하기' 다 */
  const start = sp.locator('button:text-is("응시 시작")');
  const cont = sp.locator('button:text-is("이어서 응시하기")');
  if (await start.count()) await start.first().click();
  else if (await cont.count()) await cont.first().click();
  else { await ctx.close(); return { started: false, capped }; }

  await sp.waitForURL(/\/test\//, { timeout: 15000 }).catch(() => {});
  if (!sp.url().includes("/test/")) {
    capped = capped || (await sp.innerText("body")).includes(CAPPED);
    await ctx.close();
    return { started: false, capped };
  }
  if (!submit) { await ctx.close(); return { started: true, submitted: false, capped }; }

  /* 안 고른 문항이면 고르고(고르면 다음으로 넘어간다), 이미 고른 문항이면
     '다음' 으로 넘긴다. 더 갈 곳이 없으면 마지막 문항이다 */
  const total = Number((await sp.innerText(".bar .count")).split("/")[1].trim());
  for (let n = 0; n < total * 3 + 10; n++) {
    if ((await sp.locator(".opt[aria-pressed='true']").count()) === 0) {
      await sp.locator(".opt").first().click();
      await sp.waitForTimeout(500);
      continue;
    }
    const next = sp.locator('button:text-is("다음")');
    if ((await next.count()) && (await next.first().isEnabled())) {
      await next.first().click();
      await sp.waitForTimeout(250);
      continue;
    }
    break;
  }

  const finalSubmit = sp.locator('button:text-is("제출하기")');
  if ((await finalSubmit.count()) && !(await finalSubmit.first().isDisabled())) {
    await finalSubmit.first().click();
    await sp.waitForTimeout(2200);
  }
  const done = (await sp.innerText("body")).includes("응답이 모두 제출되었습니다");
  await ctx.close();
  return { started: true, submitted: done, capped };
}

const a1 = await takeExam(students[0], true);
a1.submitted ? ok("첫 학생이 제출했다") : bad("첫 학생이 제출하지 못했다");

/* 두 번째는 시작만 한다. 시작만 한 건은 청구되지 않아야 한다 */
const a2 = await takeExam(students[1], false);
a2.started ? ok("두 번째 학생이 응시를 시작했다") : bad("두 번째 학생이 시작하지 못했다");

/* 여기까지 제출은 1건이다. 운영자 정산 화면에서 확인한다 */
await ap.goto(`${BASE}/admin/billing`);
await ap.waitForTimeout(800);
let bill = await ap.innerText("body");
bill.includes(ORG) ? ok("정산 화면에 이 기관이 보인다") : bad(`정산 화면에 기관이 없다: ${bill.slice(0, 200)}`);
bill.includes("1건") ? ok("제출 1건만 청구에 잡힌다 (시작만 한 건은 안 잡힌다)") : bad("건수가 1건이 아니다");
bill.includes(`${UNIT.toLocaleString("ko-KR")}원`) ? ok("금액이 단가대로 잡힌다") : bad("금액이 다르다");

/* 두 번째 학생도 제출한다 → 2건. 상한과 같아진다 */
const a2b = await takeExam(students[1], true);
a2b.submitted ? ok("두 번째 학생도 제출했다") : bad("두 번째 학생이 제출하지 못했다");

/* ── 6. 상한. 세 번째 학생은 시작되지 않아야 한다 ── */
const a3 = await takeExam(students[2], true);
if (a3.started) bad("상한을 넘겨 응시가 시작되었다 — 청구할 수 없는 건이 생긴다");
else ok(`상한(${CAP}건)을 넘으면 응시가 시작되지 않는다`);
a3.capped ? ok("왜 막혔는지 학생 화면에 나온다") : bad("막힌 이유가 화면에 없다");

await ap.goto(`${BASE}/admin/billing`);
await ap.waitForTimeout(800);
bill = await ap.innerText("body");
bill.includes("2건") ? ok("청구는 2건에서 멈춘다") : bad(`건수가 2건이 아니다: ${bill.slice(0, 200)}`);
bill.includes(`${(UNIT * CAP).toLocaleString("ko-KR")}원`)
  ? ok(`합계가 ${UNIT * CAP} 원이다`) : bad("합계가 다르다");

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
