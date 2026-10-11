/**
 * 실제 학교 담당자가 지금 검사를 시작해도 끝까지 가는가.
 *
 * 묻는 것은 `쪽이 서는가` 가 아니고 **`진입에서 결과까지 한 번도 막히지
 * 않는가`** 다. 그래서 자리 목록을 주소로 열지 않고, 로그인부터 결과지와
 * 종이까지 **한 사람이 이어서 누른다.** 폭 셋에서 같은 길을 밟는다:
 * 1440 · 1024 · 360.
 *
 * 다른 검사가 세지 않던 자리 넷을 여기서 센다.
 *
 *   하나. **새로고침하고 돌아와도 답이 남는가.** 저장은 `v3:runtime` 이
 *   서버 함수로 보고 있었는데, 사람이 브라우저를 다시 여는 길은 아무도
 *   눌러 보지 않았다.
 *   둘. **제출을 두 번 눌러도 결과가 한 벌인가.** 늦은 응답을 보고 다시
 *   누르는 일이 흔하고, 두 벌이 앉으면 그 사람의 결과가 둘이 된다.
 *   셋. **좁은 화면에서 바닥 띠가 `다음` 을 덮는가.** 덮으면 손전화로는
 *   검사가 끝나지 않는다.
 *   넷. **없는 쪽과 남의 결과가 사람의 말로 끝나는가.** 안쪽 사정이 그대로
 *   나가면 학교 담당자가 고장으로 읽는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npm run v3:launch
 */
import { loadEnv } from "./_loop-fixture";

loadEnv();

/* eslint-disable import/first */
import { chromium, devices, type Browser, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import {
  assertFreshServer, BASE, cloneFinished, gateCreds, login, makeStudent,
} from "./_loop-fixture";
import { pickByValue, walk } from "./_v3-walk";

let bad = 0;
function ok(t: string, n: string): void { console.log(`  통과  ${t} — ${n}`); }
function no(t: string, n: string): void { bad += 1; console.log(`  걸림  ${t} — ${n}`); }
function say(t: string, cond: boolean, n: string): void { (cond ? ok : no)(t, n); }

/**
 * 학생 하나와 BASIC 이용권 한 줄. **주문을 만들지 않는다**: 돈이 한 푼도
 * 움직이지 않는다.
 *
 * 사람을 만드는 일은 `_loop-fixture` 가 들고 있다. 여기서 또 적으면
 * 사용자 표에 칸이 하나 더 생긴 날 한쪽만 고쳐진다.
 */
async function student(key: string): Promise<{ login: string; pw: string; id: string }> {
  const lg = `qa-${key}-${Date.now()}@example.com`;
  const me = await makeStudent(lg);
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1, 'ME_V3_BASIC_KR', 'report', 'BASIC', 'ME', 'ME_V3_2', 'active')`,
    [me.id]);
  return { login: lg, pw: me.pw, id: me.id };
}

/** 지금 보이는 `다음` 단추가 바닥 띠에 덮이지 않는가 */
async function clear(p: Page): Promise<string> {
  return p.evaluate(() => {
    const b = document.querySelector("button.qs-btn-main, a.qs-btn-main");
    if (!b) return "단추 없음";
    const r = b.getBoundingClientRect();
    const mid = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    if (mid.y < 0 || mid.y > innerHeight) return "창 밖";
    const top = document.elementFromPoint(mid.x, mid.y);
    return top && (top === b || b.contains(top)) ? "" : `덮임 ${top?.className || "?"}`;
  });
}

async function run(
  br: Browser, tag: string, w: number, h: number, mobile: boolean,
): Promise<void> {
  console.log(`\n── ${tag} ${w}×${h}`);
  const me = await student(tag);
  const ctx = await br.newContext({
    ...(mobile ? devices["Pixel 5"] : {}),
    viewport: { width: w, height: h },
    httpCredentials: gateCreds() ?? undefined,
  });
  const errs: string[] = [];
  ctx.on("weberror", (e) => errs.push(String(e.error()).slice(0, 120)));

  /* 1~3. 진입 · 로그인 · 검사 시작 */
  const p = await login(ctx, me.login, me.pw);
  say(`${tag} 로그인이 작업공간으로 간다`, /\/me/.test(p.url()), new URL(p.url()).pathname);
  await p.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  await pickByValue(p, "stage", "bachelor");
  const picked = await p.locator('input[name="stage"]:checked').count();
  say(`${tag} 학업 단계를 고를 수 있다`, picked === 1, `고른 칸 ${picked}`);
  const go = p.locator("button[type=submit]").first();
  await go.scrollIntoViewIfNeeded().catch(() => undefined);
  await go.click({ timeout: 8000 }).catch(() => undefined);
  /* **`networkidle` 로 기다리지 않는다.** 서버 액션은 눌린 뒤에 POST 가
     나가는데, 그 순간 쪽은 이미 조용해서 `networkidle` 이 **바로**
     돌아온다. 그러면 아직 그대로인 주소를 읽고 `검사가 열리지 않는다` 로
     적는다. 기다릴 것은 조용해지는 때가 아니라 주소가 바뀌는 때다 */
  await p.waitForURL(/\/v3\/\d+/, { timeout: 20000 }).catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  const m = /\/v3\/(\d+)/.exec(p.url());
  say(`${tag} 검사가 열린다`, !!m,
    m ? new URL(p.url()).pathname
      : `${new URL(p.url()).pathname}${new URL(p.url()).search}`);
  if (!m) { await ctx.close(); return; }
  const att = m[1];

  /* 4~6. 문항 응답 · 다음 · 이전 */
  const first = await walk(p, 6);
  say(`${tag} 화면이 넘어간다`, first.screens >= 5, `화면 ${first.screens}`);
  const covered = await clear(p);
  say(`${tag} 다음 단추가 덮이지 않는다`, covered === "", covered || "열려 있다");
  /* **`이전` 은 거드는 단추다**(`qs-btn-ghost`). 첫 화면에만 서지 않는다 */
  const prev = p.locator("nav.qs-nav button.qs-btn-ghost");
  const urlNow = p.url();
  if (await prev.count()) {
    await prev.first().click().catch(() => undefined);
    /* 화면을 옮기는 것은 `router` 라 주소가 바뀌는 때를 기다린다.
       `networkidle` 은 그 순간 이미 조용해서 바로 돌아온다 */
    await p.waitForURL((u) => u.toString() !== urlNow, { timeout: 15000 })
      .catch(() => undefined);
    await p.waitForTimeout(300);
    say(`${tag} 이전으로 돌아간다`, p.url() !== urlNow, `${new URL(p.url()).search || "그대로"}`);
    const kept = await p.locator("input:checked").count();
    say(`${tag} 돌아간 화면에 답이 남아 있다`, kept > 0, `고른 칸 ${kept}`);
    await p.goto(urlNow, { waitUntil: "networkidle" });
  } else { no(`${tag} 이전 단추가 있다`, "없다"); }

  /* 7~8. 저장 · 새로고침하고 다시 들어오기 */
  const saved = Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`, [att]))?.n ?? 0);
  say(`${tag} 답이 서버에 쌓인다`, saved > 0, `${saved}개`);
  await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
  const again = Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`, [att]))?.n ?? 0);
  say(`${tag} 다시 들어와도 답이 그대로다`, again >= saved, `${saved} → ${again}`);

  /* 9~11. 끝까지 · 제출 · 결과 */
  const rest = await walk(p, 400);
  say(`${tag} 끝까지 간다`, rest.done, `화면 ${first.screens + rest.screens}`);
  say(`${tag} 결과 쪽으로 간다`, /\/result/.test(p.url()), new URL(p.url()).pathname);
  const snaps = async () => Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_snapshots WHERE attempt_id = $1`, [att]))?.n ?? 0);
  say(`${tag} 결과가 만들어졌다`, (await snaps()) === 1, `스냅샷 ${await snaps()}벌`);
  /* 제출을 한 번 더 — 늦은 응답을 보고 다시 누르는 일이 흔하다 */
  await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
  await p.locator("button.qs-btn-main, a.qs-btn-main").first()
    .click({ timeout: 4000 }).catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  say(`${tag} 두 번 눌러도 결과가 한 벌이다`, (await snaps()) === 1, `스냅샷 ${await snaps()}벌`);

  /* 12~15. 결과 Summary · Detail · PDF · 복귀 */
  await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
  const head = (await p.locator("h1").first().innerText().catch(() => "")).trim();
  say(`${tag} 결과 첫 화면이 선다`, head.length > 0, head.slice(0, 24));
  const fold = p.locator("button.rs-foldbtn, button.rs-more").first();
  if (await fold.count()) {
    await fold.click().catch(() => undefined);
    await p.waitForTimeout(300);
    ok(`${tag} 상세를 펴는 단추가 있다`, "눌린다");
  } else { no(`${tag} 상세를 펴는 단추가 있다`, "화면에 없다"); }
  const pdf = await p.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 90000 });
  say(`${tag} 종이가 나온다`, pdf.status() === 200
    && (pdf.headers()["content-type"] || "").includes("pdf"),
    `${pdf.status()} ${pdf.headers()["content-type"] ?? ""}`);
  await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
  const home = await p.locator("body").innerText();
  say(`${tag} 홈이 결과를 들고 있다`, /결과 보기|내 커리어/.test(home),
    home.split("\n").find((l) => l.trim())?.slice(0, 20) ?? "");

  say(`${tag} 브라우저 오류 0`, errs.length === 0, errs[0] ?? "없음");
  await ctx.close();
}

async function main(): Promise<void> {
  assertFreshServer();
  const br = await chromium.launch({ args: ["--no-sandbox"] });
  await run(br, "데스크톱", 1440, 900, false);
  await run(br, "노트북", 1024, 768, false);
  await run(br, "손전화", 360, 740, true);

  /* B-6. 계정 쪽과 손님 화면의 안쪽 흔적 */
  console.log("\n── 계정과 안쪽 흔적");
  {
    const me = await student("acct");
    const ctx = await br.newContext({
      viewport: { width: 1440, height: 900 },
      httpCredentials: gateCreds() ?? undefined,
    });
    const p = await login(ctx, me.login, me.pw);
    await p.goto(`${BASE}/my`, { waitUntil: "networkidle" });
    const t = await p.locator("body").innerText();
    say("계정에 이름이 선다", /홍길동/.test(t), "홍길동");
    say("계정에 전공이 선다", /기계공학/.test(t), "기계공학");
    say("계정에서 나가는 길이 있다", /로그아웃/.test(t), "로그아웃");
    /* **안쪽에서만 쓰는 말이 손님 화면에 나가지 않는다**(규격 B-6).
       띄운 글자에서만 센다: 식별자와 `왜 지웠는가` 를 적어 둔 주석까지
       세면 맞는 기록을 지우라고 요구하게 된다 */
    const BAN = ["제품 루프 점검", "test user", "fixture", "debug",
                 "snapshot", "recompute", "axis", "owned", "confirmed",
                 "undefined", "NaN", "[object Object]"];
    for (const path of ["/me", "/my", "/me/state", "/me/next", "/me/experience",
                        "/me/results", "/me/explore", "/v3/start"]) {
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const body = await p.locator("body").innerText();
      const hit = BAN.filter((w) => body.toLowerCase().includes(w.toLowerCase()));
      say(`${path} 에 안쪽 흔적이 없다`, hit.length === 0, hit.join(" · ") || "없음");
    }
    await ctx.close();
  }

  /* B-10. 되풀이해 눌러도 그 자리에서 무너지지 않는가 */
  console.log("\n── 반복");
  {
    const me = await student("rep");
    await cloneFinished(me.id, "PRO");
    const ctx = await br.newContext({
      viewport: { width: 1440, height: 900 },
      httpCredentials: gateCreds() ?? undefined,
    });
    const p = await login(ctx, me.login, me.pw);
    let worst = 200;
    for (let i = 0; i < 8; i += 1) {
      const r = await p.goto(`${BASE}/me`, { waitUntil: "domcontentloaded" });
      worst = Math.max(worst, r?.status() ?? 0);
    }
    say("홈을 여덟 번 새로 열어도 선다", worst < 400, `가장 나쁜 상태 ${worst}`);
    const att = await p.evaluate(() => ([...document.querySelectorAll("a")]
      .map((x) => x.getAttribute("href") || "")
      .find((h) => /^\/v3\/\d+\/result$/.test(h)) || ""));
    if (att) {
      let w2 = 200;
      for (let i = 0; i < 5; i += 1) {
        const r = await p.goto(`${BASE}${att}`, { waitUntil: "domcontentloaded" });
        w2 = Math.max(w2, r?.status() ?? 0);
      }
      say("결과를 다섯 번 열어도 선다", w2 < 400, `가장 나쁜 상태 ${w2}`);
      let w3 = 200;
      for (let i = 0; i < 3; i += 1) {
        const r = await p.request.get(`${BASE}${att}/pdf`, { timeout: 120000 });
        w3 = Math.max(w3, r.status());
      }
      say("종이를 세 번 뽑아도 나온다", w3 === 200, `가장 나쁜 상태 ${w3}`);
    } else { no("결과 링크를 찾는다", "홈에 없다"); }
    await ctx.close();
  }

  /* B-7. 손님이 보는 오류 쪽. **안쪽 사정이 그대로 나가지 않는다** */
  console.log("\n── 오류와 권한");
  const ctx = await br.newContext({ httpCredentials: gateCreds() ?? undefined });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/v3/999999999/result`, { waitUntil: "domcontentloaded" });
  const txt = await p.locator("body").innerText().catch(() => "");
  say("없는 결과가 사람의 말로 끝난다",
    !/stack|Error:|at \w+ \(|relation |column |ECONN|undefined is not/i.test(txt),
    txt.replace(/\s+/g, " ").slice(0, 48));
  for (const r of ["/admin", "/admin/business", "/org"]) {
    const res = await p.goto(`${BASE}${r}`, { waitUntil: "domcontentloaded" });
    const u = new URL(p.url()).pathname;
    say(`비로그인이 ${r} 에 못 들어간다`,
      u !== r || (res?.status() ?? 0) >= 400, `${res?.status()} ${u}`);
  }
  await ctx.close();
  await br.close();

  console.log(`\n확인 ${bad === 0 ? "전부 통과" : `걸림 ${bad}`}`);
  process.exitCode = bad ? 1 : 0;
}
main().then(() => process.exit(process.exitCode ?? 0),
  (e) => { console.error(e); process.exit(1); });
