/**
 * 단체 신청 → 승인 → 전용 링크 → 학생 등록 을 브라우저로 한 바퀴 돌린다.
 *
 * 이 흐름은 타입 검사와 빌드로는 확인할 수 없다. 화면·서버 액션·트랜잭션이
 * 함께 맞물려야 성립하고, 좌석 상한처럼 동시성이 걸린 규칙도 있기 때문이다.
 *
 * 준비 (DB 가 비어 있는 상태에서):
 *   npm run db:reset && npm run db:seed
 *   npm run build && npm start
 *   curl -X POST localhost:3000/api/applications \
 *     -H 'content-type: application/json' -H "x-intake-secret: $INTAKE_SECRET" \
 *     -d '{"site":"kr","country":"KR","orgName":"한양대학교","deptName":"기계공학과",
 *          "contactName":"김담당","contactEmail":"newdept@hyu.ac.kr","expectedSize":120}'
 *
 * 실행:
 *   node scripts/e2e-join.mjs
 */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch();
let fails = 0;
const ok = (m) => console.log("  통과 ", m);
const bad = (m) => { fails++; console.log("  실패 ", m); };

// ── 1. 운영자 로그인 ──
const admin = await b.newContext();
const p = await admin.newPage();
await p.goto(`${BASE}/login`);
await p.fill('input[name="identifier"]', "admin");
await p.fill('input[name="password"]', "pca-dev-admin-1234");
await p.click('button[type="submit"], button.act');
await p.waitForURL(/admin|org|my/, { timeout: 15000 }).catch(() => {});
console.log("로그인 후 주소:", p.url());

// ── 2. 신청 목록 ──
await p.goto(`${BASE}/admin/applications`);
await p.waitForTimeout(600);
const listText = await p.innerText("body");
listText.includes("한양대학교") ? ok("신청 목록에 새 신청이 보인다") : bad("신청이 목록에 없다");
listText.includes("PCA-2026") ? ok("접수번호가 보인다") : bad("접수번호가 없다");

// ── 3. 검토 화면 ──
await p.click('a:has-text("검토")');
await p.waitForTimeout(700);
const detail = await p.innerText("body");
detail.includes("newdept@hyu.ac.kr") ? ok("담당자 이메일이 보인다") : bad("담당자 이메일이 없다");
detail.includes("120") ? ok("예상 인원이 보인다") : bad("예상 인원이 없다");

// 기본값 확인
const seatDefault = await p.inputValue("#seatCount");
seatDefault === "120" ? ok("응시권 수가 신청서 값으로 채워져 있다") : bad(`응시권 기본값이 ${seatDefault}`);
const countryDefault = await p.inputValue("#country");
countryDefault === "KR" ? ok("국가가 KR 로 채워져 있다") : bad(`국가 기본값이 ${countryDefault}`);

// ── 4. 승인 ──
await p.selectOption("#orgType", "department");
await p.waitForTimeout(300);
const opts = await p.$$eval("#parentId option", (os) => os.map((o) => o.value).filter(Boolean));
if (opts.length === 0) { bad("고를 상위 대학이 없다"); }
await p.selectOption("#parentId", opts[0]);
await p.fill("#code", "HYU-ME-2026");
await p.fill("#seatCount", "3");           // 정원 상한을 실제로 시험하려고 작게 잡는다
await p.click('button:has-text("승인하고 발급")');
await p.waitForTimeout(2500);

const after = await p.innerText("body");
after.includes("승인했습니다") ? ok("승인되었다") : bad("승인 화면이 나오지 않았다");
const m = after.match(/http:\/\/localhost:3000\/join\/[A-Za-z0-9_-]+/);
if (!m) { bad("전용 링크가 화면에 없다"); }
const joinLink = m ? m[0] : null;
if (joinLink) ok(`전용 링크 발급: ${joinLink.slice(0, 46)}…`);
const setupMatch = after.match(/http:\/\/localhost:3000\/password\/reset\/[A-Za-z0-9_-]+/);
setupMatch ? ok("담당자 비밀번호 설정 링크가 보인다") : bad("설정 링크가 없다");
after.includes("임시 비밀번호")
  ? bad("임시 비밀번호가 아직 화면에 있다 — 메일로 나가면 안 되는 값이다")
  : ok("임시 비밀번호를 만들지도 보여주지도 않는다");
after.includes("안내 메일을 보냈습니다") || after.includes("메일을 보내지 못했습니다")
  ? ok("메일 발송 결과를 화면에 밝힌다")
  : bad("메일이 나갔는지 화면에 없다");

// ── 5. 두 번 승인되지 않는다 ──
await p.goto(p.url());
await p.waitForTimeout(600);
const second = await p.innerText("body");
second.includes("승인됨") ? ok("이미 승인된 신청은 폼이 아니라 결과를 보여준다") : bad("승인 뒤에도 폼이 남아 있다");
second.includes("/join/") ? ok("승인 뒤에도 전용 링크를 다시 볼 수 있다") : bad("전용 링크를 다시 볼 수 없다");

// ── 6. 학생이 전용 링크로 등록 ──
if (joinLink) {
  for (const [i, sid] of [["1", "20260001"], ["2", "20260002"], ["3", "20260003"], ["4", "20260004"]]) {
    const ctx = await b.newContext();
    const sp = await ctx.newPage();
    await sp.goto(joinLink);
    await sp.waitForTimeout(400);
    const body = await sp.innerText("body");
    if (Number(i) <= 3) {
      if (!body.includes("응시자 등록")) { bad(`${i}번째 학생: 등록 화면이 안 뜬다`); await ctx.close(); continue; }
      await sp.fill("#displayName", `학생${i}`);
      await sp.fill("#loginId", sid);
      await sp.fill("#password", "student-pass-1234");
      await sp.fill("#passwordConfirm", "student-pass-1234");
      await sp.click('button:has-text("응시자로 등록")');
      await sp.waitForTimeout(1200);
      sp.url().includes("/login") ? ok(`${i}번째 학생 등록됨`) : bad(`${i}번째 학생 등록 실패 (${sp.url()})`);
    } else {
      body.includes("정원이 찼습니다")
        ? ok("정원(3명)을 넘으면 4번째는 막힌다")
        : bad(`4번째가 막히지 않았다: ${body.slice(0, 80)}`);
    }
    await ctx.close();
  }
}

// ── 7. 없는 링크 ──
const ctx2 = await b.newContext();
const sp2 = await ctx2.newPage();
await sp2.goto(`${BASE}/join/definitely-not-a-real-token`);
await sp2.waitForTimeout(400);
(await sp2.innerText("body")).includes("찾을 수 없습니다")
  ? ok("없는 링크는 안내 화면을 보여준다")
  : bad("없는 링크 처리가 안 된다");
await ctx2.close();

await b.close();
console.log("");
console.log(fails === 0 ? "전부 통과" : `${fails}건 실패`);
process.exit(fails ? 1 : 0);
