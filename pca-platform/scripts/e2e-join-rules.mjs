/**
 * 전용 링크에 건 등록 조건을 확인한다.
 *
 * 링크를 학교 홈페이지처럼 공개된 곳에 걸 때 쓰는 장치다. 화면에서 막는
 * 것만으로는 부족하다 — 브라우저의 검사는 걷어낼 수 있으므로, 걷어내고
 * 보내도 서버가 막는지까지 본다.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORG_ID = process.env.ORG_ADMIN_ID ?? "me-admin";
const ORG_PW = process.env.ORG_ADMIN_PW ?? "pca-dev-org-1234";

let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

/* 시드에 이미 있는 학번(2021001234)과 겹치지 않게 실행마다 다른 꼬리를 쓴다 */
const tail = String(Date.now() % 10000).padStart(4, "0");
/** 마스크가 "20" + 숫자 8자리이므로 정확히 10자리로 만든다 */
const ID = (n) => `20${tail}00${n}`.padEnd(10, "0").slice(0, 10);
/** 이메일도 실행마다 달라야 한다. 같은 주소는 한 번만 등록된다 */
const MAIL = (n, host) => `qa${tail}${n}@${host}`;

const b = await chromium.launch();
const p = await (await b.newContext()).newPage();

await p.goto(`${BASE}/login`);
await p.fill('input[name="identifier"]', ORG_ID);
await p.fill('input[name="password"]', ORG_PW);
await p.click('button[type="submit"], button.act');
await p.waitForTimeout(1800);

/* ── 조건을 건 링크를 만든다 ── */
const label = `조건검사 ${Date.now().toString(36)}`;
await p.goto(`${BASE}/org`);
await p.waitForTimeout(600);
await p.click('button:text-is("새 링크 만들기")');
await p.waitForTimeout(400);
await p.fill("#label", label);
await p.fill("#days", "30");
await p.fill("#loginIdMask", "2099999999");   // 20 으로 시작하는 숫자 10자리
await p.fill("#emailDomains", "hanyang.ac.kr");
await p.click('button:text-is("만들기")');
await p.waitForTimeout(2200);

let body = await p.innerText("body");
body.includes("새 링크를 만들었습니다") ? ok("조건을 건 링크를 만들었다") : bad(`만들기 실패: ${body.slice(0,140)}`);

/* ── 잘못된 조건은 거절되는지 ── */
await p.goto(`${BASE}/org`);
await p.waitForTimeout(500);
await p.click('button:text-is("새 링크 만들기")');
await p.waitForTimeout(400);
await p.fill("#label", "나쁜조건");
await p.fill("#days", "30");
await p.fill("#loginIdMask", "^(a+)+$");            // 정규식은 받지 않는다
await p.click('button:text-is("만들기")');
await p.waitForTimeout(1800);
(await p.innerText("body")).includes("그 밖의 기호는 쓸 수 없습니다")
  ? ok("정규식 같은 마스크는 거절한다") : bad("이상한 마스크가 통과했다");

/* 앞선 오류로 폼이 다시 그려지며 이름 칸이 비었을 수 있다. 다시 채운다 */
await p.fill("#label", "나쁜도메인");
await p.fill("#days", "30");
await p.fill("#loginIdMask", "9999999999");
await p.fill("#emailDomains", "이건도메인이아님");
await p.click('button:text-is("만들기")');
await p.waitForTimeout(1800);
{
  const t = await p.innerText("body");
  t.includes("도메인 형식이 아닙니다")
    ? ok("도메인 형식이 아니면 거절한다")
    : bad(`이상한 도메인이 통과했다: ${t.slice(0, 200).replace(/\s+/g, " ")}`);
}

/* ── 학생 쪽 ── */
await p.goto(`${BASE}/org`);
await p.waitForTimeout(700);
const token = await p.evaluate((lb) => {
  for (const card of document.querySelectorAll(".card")) {
    if (card.innerText.includes(lb)) {
      const m = card.innerText.match(/\/join\/([A-Za-z0-9_-]+)/);
      if (m) return m[1];
    }
  }
  return null;
}, label);
token ? ok("만든 링크의 주소를 찾았다") : bad("링크를 찾지 못했다");
if (!token) { await b.close(); process.exit(1); }

const joinUrl = `${BASE}/join/${token}`;

async function tryJoin({ loginId, email, expect }) {
  const ctx = await b.newContext();
  const sp = await ctx.newPage();
  await sp.goto(joinUrl);
  await sp.waitForTimeout(500);
  await sp.fill("#displayName", "검사학생");
  await sp.fill("#loginId", loginId);
  if (await sp.locator("#email").count()) await sp.fill("#email", email ?? "");
  await sp.fill("#password", "join-rules-pass-1234");
  await sp.fill("#passwordConfirm", "join-rules-pass-1234");
  await sp.check("#consent");
  /* 화면의 검사를 걷어낸다. 서버가 막는지 보려는 것이다.
     체크박스는 건드리지 않는다 — type 을 바꾸면 안 켠 동의도 값이 실려 나간다 */
  await sp.evaluate(() => {
    for (const el of document.querySelectorAll("input")) {
      if (el.type === "checkbox") continue;
      el.removeAttribute("pattern"); el.removeAttribute("required"); el.type = "text";
    }
    document.querySelector("form")?.setAttribute("novalidate", "novalidate");
  });
  await sp.click('button:text-is("응시자로 등록")');
  await sp.waitForTimeout(1600);
  const url = sp.url();
  const text = await sp.innerText("body");
  await ctx.close();
  return { joined: url.includes("/login"), text };
}

/* 안내가 화면에 보이는지 */
const ctx0 = await b.newContext();
const sp0 = await ctx0.newPage();
await sp0.goto(joinUrl); await sp0.waitForTimeout(500);
const intro = await sp0.innerText("body");
intro.includes("학번은 2000000000 형태여야 합니다") ? ok("학번 형태를 화면에 알린다") : bad(`학번 안내가 없다: ${intro.slice(0,140)}`);
intro.includes("@hanyang.ac.kr") ? ok("허용 도메인을 화면에 알린다") : bad("도메인 안내가 없다");
(await sp0.locator("#email").count()) ? ok("도메인을 걸면 이메일을 묻는다") : bad("이메일 칸이 없다");
await ctx0.close();

/* 형식이 틀린 학번 */
let r = await tryJoin({ loginId: "9911", email: MAIL(0, "hanyang.ac.kr") });
r.joined ? bad("형식이 틀린 학번이 통과했다") : ok("형식이 틀린 학번은 막힌다");
r.text.includes("학번 형태가 맞지 않습니다") ? ok("왜 막혔는지 알려준다") : bad("이유가 없다");

/* 다른 도메인 */
r = await tryJoin({ loginId: ID(1), email: MAIL(1, "gmail.com") });
r.joined ? bad("허용하지 않은 도메인이 통과했다") : ok("다른 도메인은 막힌다");
r.text.includes("주소만 등록할 수 있습니다") ? ok("허용 도메인을 다시 알려준다") : bad("이유가 없다");

/* 이름만 비슷한 도메인 — 통과하면 안 된다 */
r = await tryJoin({ loginId: ID(2), email: MAIL(2, "nothanyang.ac.kr") });
r.joined ? bad("이름만 비슷한 도메인이 통과했다") : ok("이름만 비슷한 도메인은 막힌다");

/* 이메일을 비운 채 */
r = await tryJoin({ loginId: ID(3), email: "" });
r.joined ? bad("이메일 없이 통과했다") : ok("도메인을 걸면 이메일 없이는 막힌다");

/* 둘 다 맞으면 통과 */
r = await tryJoin({ loginId: ID(4), email: MAIL(4, "hanyang.ac.kr") });
r.joined ? ok("조건을 맞추면 등록된다") : bad(`맞는데도 막혔다: ${r.text.slice(0, 140)}`);

/* 아래 도메인도 통과해야 한다 (ac.kr 규칙 확인은 하위 도메인으로) */
r = await tryJoin({ loginId: ID(5), email: MAIL(5, "cs.hanyang.ac.kr") });
r.joined
  ? ok("아래 도메인도 통과한다")
  : bad(`하위 도메인이 막혔다: ${r.text.replace(/\s+/g, " ").slice(0, 260)}`);

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
