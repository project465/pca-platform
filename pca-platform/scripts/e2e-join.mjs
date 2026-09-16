/**
 * 단체 신청 → 승인 → 전용 링크 → 학생 등록 을 브라우저로 한 바퀴 돌린다.
 *
 * 이 흐름은 타입 검사와 빌드로는 확인할 수 없다. 화면·서버 액션·트랜잭션이
 * 함께 맞물려야 성립하고, 좌석 상한처럼 동시성이 걸린 규칙도 있기 때문이다.
 *
 * 필요한 것을 스스로 만든다 — 신청서를 접수 API 로 직접 넣고, 그 값으로
 * 화면을 확인한다. 미리 넣어 둔 자료에 기대지 않으므로 몇 번을 돌려도 같다.
 *
 *   BASE_URL       기본 http://localhost:3000
 *   INTAKE_SECRET  접수 API 에 대는 값 (필수)
 *   ADMIN_ID/PW    운영자 계정 (기본 admin / pca-dev-admin-1234)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.INTAKE_SECRET;
const ADMIN_ID = process.env.ADMIN_ID ?? "admin";
const ADMIN_PW = process.env.ADMIN_PW ?? "pca-dev-admin-1234";

if (!SECRET) {
  console.error("INTAKE_SECRET 이 없습니다. 플랫폼과 같은 값을 주세요.");
  process.exit(2);
}

let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

/* ── 이번 실행에서만 쓰는 값. 다시 돌려도 이름이 겹치지 않는다 ── */
const tag = Date.now().toString(36).toUpperCase().slice(-6);
const ORG = `검사대학교-${tag}`;
const DEPT = "기계공학과";
const EMAIL = `qa-${tag.toLowerCase()}@example.ac.kr`;
const SIZE = 120;
const CODE = `QA-${tag}`;
const SEATS = 3;               // 정원 초과가 막히는지 보려고 작게 잡는다

/* ── 1. 신청 접수 ── */
const res = await fetch(`${BASE}/api/applications`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-intake-secret": SECRET },
  body: JSON.stringify({
    site: "kr", country: "KR", orgName: ORG, deptName: DEPT,
    contactName: "김담당", contactEmail: EMAIL, expectedSize: SIZE,
    message: "자동 검사가 넣은 신청입니다.",
  }),
});
if (res.status !== 201) { bad(`신청 접수가 201 이 아니다 (${res.status})`); process.exit(1); }
const { refCode } = await res.json();
ok(`신청 접수됨 · ${refCode}`);

/* 인증과 검증이 실제로 막는지도 여기서 함께 본다 */
const noAuth = await fetch(`${BASE}/api/applications`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ site:"kr", country:"KR", orgName:"x", contactName:"y", contactEmail:"a@b.com" }),
});
noAuth.status === 401 ? ok("비밀값 없는 접수는 401") : bad(`인증 없이 통과됨 (${noAuth.status})`);

const badBody = await fetch(`${BASE}/api/applications`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-intake-secret": SECRET },
  body: JSON.stringify({ site:"kr", country:"KR", orgName:"", contactName:"y", contactEmail:"메일아님" }),
});
badBody.status === 422 ? ok("빈 기관명·잘못된 메일은 422") : bad(`검증이 통과됨 (${badBody.status})`);

/* ── 2. 운영자 화면 ── */
const b = await chromium.launch();
const admin = await b.newContext();
const p = await admin.newPage();

await p.goto(`${BASE}/login`);
await p.fill('input[name="identifier"]', ADMIN_ID);
await p.fill('input[name="password"]', ADMIN_PW);
await p.click('button[type="submit"], button.act');
await p.waitForURL(/admin|org|my/, { timeout: 15000 }).catch(() => {});
p.url().includes("/admin") ? ok("운영자로 로그인된다") : bad(`로그인 실패: ${p.url()}`);

await p.goto(`${BASE}/admin/applications`);
await p.waitForTimeout(600);
const list = await p.innerText("body");
list.includes(ORG) ? ok("신청 목록에 새 신청이 보인다") : bad("신청이 목록에 없다");
list.includes(refCode) ? ok("접수번호가 보인다") : bad("접수번호가 없다");

/* 방금 넣은 신청서를 연다. 목록의 "검토" 는 버튼이 아니라 링크다 */
const href = await p.evaluate((ref) => {
  for (const tr of document.querySelectorAll("tbody tr")) {
    if (tr.innerText.includes(ref)) {
      const a = tr.querySelector("a[href*='/admin/applications/']");
      if (a) return a.getAttribute("href");
    }
  }
  return null;
}, refCode);
if (!href) { bad("검토 링크를 찾지 못했다"); }
else { await p.goto(BASE + href); ok("검토 화면을 열었다"); }
await p.waitForTimeout(800);

const detail = await p.innerText("body");
detail.includes(EMAIL) ? ok("담당자 이메일이 보인다") : bad("담당자 이메일이 없다");
detail.includes(String(SIZE)) ? ok("예상 인원이 보인다") : bad("예상 인원이 없다");

const seatDefault = await p.inputValue("#seatCount");
seatDefault === String(SIZE) ? ok("응시권 수가 신청서 값으로 채워져 있다") : bad(`응시권 기본값이 ${seatDefault}`);
const countryDefault = await p.inputValue("#country");
countryDefault === "KR" ? ok("국가가 KR 로 채워져 있다") : bad(`국가 기본값이 ${countryDefault}`);

/* ── 3. 승인 ── */
await p.selectOption("#orgType", "department");
await p.waitForTimeout(300);
const parents = await p.$$eval("#parentId option", (os) => os.map((o) => o.value).filter(Boolean));
parents.length ? ok("소속 대학을 고를 수 있다") : bad("고를 상위 대학이 없다");
if (parents.length) await p.selectOption("#parentId", parents[0]);
await p.fill("#code", CODE);
await p.fill("#seatCount", String(SEATS));
await p.click('button:text-is("승인하고 발급")');
await p.waitForTimeout(2500);

const after = await p.innerText("body");
after.includes("승인했습니다") ? ok("승인되었다") : bad(`승인 화면이 나오지 않았다: ${after.slice(0, 200)}`);
const joinMatch = after.match(new RegExp(BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/join/[A-Za-z0-9_-]+"));
joinMatch ? ok(`전용 링크 발급: …${joinMatch[0].slice(-12)}`) : bad("전용 링크가 화면에 없다");
const joinLink = joinMatch ? joinMatch[0] : null;

after.match(/\/password\/reset\/[A-Za-z0-9_-]+/)
  ? ok("담당자 비밀번호 설정 링크가 보인다") : bad("설정 링크가 없다");
after.includes("임시 비밀번호")
  ? bad("임시 비밀번호가 화면에 있다 — 메일로 나가면 안 되는 값이다")
  : ok("임시 비밀번호를 만들지도 보여주지도 않는다");
after.includes("안내 메일을 보냈습니다") || after.includes("메일을 보내지 못했습니다")
  ? ok("메일 발송 결과를 화면에 밝힌다") : bad("메일이 나갔는지 화면에 없다");

/* 두 번 승인되지 않는다 */
await p.reload();
await p.waitForTimeout(800);
const second = await p.innerText("body");
second.includes("승인됨") ? ok("이미 승인된 신청은 폼이 아니라 결과를 보여준다") : bad("승인 뒤에도 폼이 남아 있다");
second.includes("/join/") ? ok("승인 뒤에도 전용 링크를 다시 볼 수 있다") : bad("전용 링크를 다시 볼 수 없다");

/* ── 4. 학생이 전용 링크로 등록 ── */
if (joinLink) {
  for (let i = 1; i <= SEATS + 1; i++) {
    const ctx = await b.newContext();
    const sp = await ctx.newPage();
    await sp.goto(joinLink);
    await sp.waitForTimeout(500);
    const body = await sp.innerText("body");

    if (i <= SEATS) {
      if (!body.includes("응시자 등록")) { bad(`${i}번째 학생: 등록 화면이 안 뜬다`); await ctx.close(); continue; }
      await sp.fill("#displayName", `검사학생${i}`);
      await sp.fill("#loginId", `${tag}${i}`);
      await sp.fill("#password", "student-pass-1234");
      await sp.fill("#passwordConfirm", "student-pass-1234");

      if (i === 1) {
        /* 동의를 안 켠 채로 낸다. 체크박스에는 required 가 없으므로
           브라우저가 아니라 서버가 막아야 한다 */
        await sp.click('button:text-is("응시자로 등록")');
        await sp.waitForTimeout(1500);
        const refused = await sp.innerText("body");
        sp.url().includes("/join/")
          ? ok("동의 없이 내면 등록되지 않는다")
          : bad(`동의 없이도 등록되었다 (${sp.url()})`);
        refused.includes("동의해야 등록할 수 있습니다")
          ? ok("동의가 왜 필요한지 화면에 나온다")
          : bad("동의를 막은 이유가 화면에 없다");
        /* 서버 액션이 돌아온 뒤 입력이 남아 있는지는 보장되지 않는다. 다시 채운다 */
        await sp.fill("#displayName", `검사학생${i}`);
        await sp.fill("#loginId", `${tag}${i}`);
        await sp.fill("#password", "student-pass-1234");
        await sp.fill("#passwordConfirm", "student-pass-1234");
      }

      await sp.check("#consent");
      await sp.click('button:text-is("응시자로 등록")');
      await sp.waitForTimeout(1500);
      sp.url().includes("/login") ? ok(`${i}번째 학생 등록됨`) : bad(`${i}번째 학생 등록 실패 (${sp.url()})`);
    } else {
      body.includes("정원이 찼습니다")
        ? ok(`정원(${SEATS}명)을 넘으면 ${i}번째는 막힌다`)
        : bad(`정원 초과가 막히지 않았다: ${body.slice(0, 90)}`);
    }
    await ctx.close();
  }
}

/* ── 5. 개인정보 처리방침 ── */
const ctxP = await b.newContext();
const pp = await ctxP.newPage();
await pp.goto(`${BASE}/privacy`);
await pp.waitForTimeout(400);
const privacy = await pp.innerText("body");
privacy.includes("개인정보 처리방침") ? ok("처리방침 화면이 열린다") : bad("처리방침 화면이 안 열린다");
privacy.includes("무엇을 받고") ? ok("수집 항목이 적혀 있다") : bad("수집 항목이 없다");
privacy.includes("초안") ? ok("검토 전 초안임을 화면에 밝힌다") : bad("초안 표시가 없다 — 빈칸이 다 채워졌는지 확인할 것");
await ctxP.close();

/* ── 6. 없는 링크 ── */
const ctx2 = await b.newContext();
const sp2 = await ctx2.newPage();
await sp2.goto(`${BASE}/join/definitely-not-a-real-token`);
await sp2.waitForTimeout(500);
(await sp2.innerText("body")).includes("찾을 수 없습니다")
  ? ok("없는 링크는 안내 화면을 보여준다") : bad("없는 링크 처리가 안 된다");
await ctx2.close();

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
