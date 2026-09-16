/**
 * 담당자 화면의 전용 링크 관리를 브라우저로 확인한다.
 *
 * 여기서 제일 중요한 것은 마지막 검사다 — 남의 기관 링크를 회수할 수
 * 있으면 안 된다. 화면에 안 보이는 것만으로는 부족하고, 폼에 남의 링크
 * id 를 넣어 보내도 막혀야 한다. 그래서 실제로 그렇게 해 본다.
 *
 * 준비:
 *   npm run db:reset && npm run db:seed
 *   npm run build && npm start
 *
 * 실행:
 *   node scripts/e2e-org-links.mjs
 *   FOREIGN_LINK_ID=5 node scripts/e2e-org-links.mjs   # 남의 링크까지 시험
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_ID = process.env.ORG_ADMIN_ID ?? "me-admin";
const ADMIN_PW = process.env.ORG_ADMIN_PW ?? "pca-dev-org-1234";
/** 이 담당자의 것이 아닌 링크 id. 주면 회수가 막히는지까지 본다 */
const FOREIGN = process.env.FOREIGN_LINK_ID;

const b = await chromium.launch();
let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

const p = await (await b.newContext()).newPage();
await p.goto(`${BASE}/login`);
await p.fill('input[name="identifier"]', ADMIN_ID);
await p.fill('input[name="password"]', ADMIN_PW);
await p.click('button[type="submit"], button.act');
await p.waitForTimeout(1800);
p.url().includes("/org") ? ok("담당자로 로그인된다") : bad(`로그인 실패: ${p.url()}`);

const label = `검사용 ${Date.now()}`;

/* 새 링크 — 좌석보다 큰 상한을 요청해도 서버가 눌러야 한다.
   화면의 max 속성은 걷어내고 보낸다. 그건 브라우저에만 있는 제한이다 */
await p.goto(`${BASE}/org`);
await p.waitForTimeout(500);
await p.click('button:has-text("새 링크 만들기")');
await p.waitForTimeout(400);
await p.fill("#label", label);
await p.fill("#days", "30");
const free = await p.evaluate(() => {
  const i = document.querySelector("#maxUses");
  const max = Number(i.getAttribute("max"));
  // 화면의 max 는 브라우저에만 있는 제한이다. 걷어내고 좌석보다 큰 값을 보낸다.
  // 스키마가 받아주는 범위(10만) 안에서 고른다 — 그 밖은 검증에서 걸리므로
  // 여기서 보려는 "좌석 수로 눌리는가" 를 시험하지 못한다
  i.removeAttribute("max");
  i.value = "5000";
  return max;
});
await p.click('button:text-is("만들기")');
await p.waitForTimeout(2500);
const made = await p.innerText("body");
made.includes("새 링크를 만들었습니다") ? ok("새 링크를 만들 수 있다") : bad(`만들기 실패: ${made.slice(0, 140)}`);
made.includes(label) ? ok("만든 링크가 목록에 보인다") : bad("만든 링크가 목록에 없다");
made.includes(`${free.toLocaleString("ko-KR")}명까지`)
  ? ok(`좌석보다 큰 상한 요청이 ${free} 로 눌린다`)
  : bad(`상한이 눌리지 않았다: ${made.slice(0, 160)}`);

/* 남의 링크를 회수해 본다 */
if (FOREIGN) {
  const sent = await p.evaluate((id) => {
    const input = document.querySelector('input[name="linkId"]');
    if (!input) return false;
    input.value = id;
    input.form.requestSubmit();
    return true;
  }, FOREIGN);
  if (!sent) bad("회수 폼이 없어 남의 링크를 시험하지 못했다");
  else {
    await p.waitForTimeout(2000);
    const t = await p.innerText("body");
    t.includes("찾을 수 없습니다")
      ? ok("남의 링크는 회수되지 않고 '찾을 수 없음' 으로 막힌다")
      : bad(`남의 링크 회수가 막히지 않았다: ${t.slice(0, 160)}`);
  }
}

/* 회수하면 학생이 못 들어와야 한다 */
await p.goto(`${BASE}/org`);
await p.waitForTimeout(600);
const token = await p.evaluate((lb) => {
  for (const card of document.querySelectorAll(".card")) {
    if (card.innerText.includes(lb)) {
      const m = card.innerText.match(/\/join\/([A-Za-z0-9_-]+)/);
      if (m) return m[1];
    }
  }
  return null;
}, label);
token ? ok("링크 주소를 화면에서 집어낼 수 있다") : bad("링크 주소가 화면에 없다");

if (token) {
  const before = await (await (await b.newContext()).newPage());
  await before.goto(`${BASE}/join/${token}`);
  await before.waitForTimeout(400);
  (await before.innerText("body")).includes("응시자 등록")
    ? ok("회수 전에는 학생이 들어올 수 있다")
    : bad("회수 전인데 등록 화면이 아니다");

  const idx = await p.evaluate((lb) => {
    const cards = [...document.querySelectorAll(".card")];
    const i = cards.findIndex((c) => c.innerText.includes(lb));
    if (i < 0) return false;
    const btn = [...cards[i].querySelectorAll("button")].find((x) => x.innerText.includes("회수"));
    if (!btn) return false;
    btn.click();
    return true;
  }, label);
  idx ? ok("회수 버튼을 눌렀다") : bad("회수 버튼이 없다");
  await p.waitForTimeout(2000);

  const after = await (await (await b.newContext()).newPage());
  await after.goto(`${BASE}/join/${token}`);
  await after.waitForTimeout(400);
  const t2 = await after.innerText("body");
  t2.includes("닫힌 링크")
    ? ok("회수한 뒤에는 학생이 막힌다")
    : bad(`회수했는데 아직 열린다: ${t2.slice(0, 140)}`);
}

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
