/**
 * 배포본에서 자리가 500 없이 열리고, Workspace 자료 경로가 실제로 도는가.
 *
 * **저장소 코드를 보지 않는다.** `v3:all` 은 코드가 그렇게 짜여 있는지를
 * 묻고 이것은 **거기서 그렇게 도는지**를 묻는다. 둘 다 있어야 한다: 스키마가
 * 안 올라간 배포본은 코드가 멀쩡해도 `/v3/start` 에서 500 이다.
 *
 * **아무것도 만들지 않는다.** 응시를 새로 열거나 결과를 만들지 않고, 이미
 * 있는 것만 연다. 그래서 운영에서도 돌릴 수 있다.
 *
 *   BASE=https://app.careermatri.com node scripts/v3-smoke.mjs
 *   UI_BASE=http://127.0.0.1:3230 node scripts/v3-smoke.mjs    # 공개 전 배포본
 *
 * 로그인이 필요한 자리는 `SMOKE_LOGIN=아이디:비밀번호` 로 넘긴다.
 * **비밀번호를 여기 적어 두지 않는다.**
 */
import { chromium } from "playwright";

const B = (process.env.UI_BASE || process.env.BASE
  || "http://127.0.0.1:3000").replace(/\/$/, "");
const LOGIN = process.env.SMOKE_LOGIN || "";
const GATE = process.env.STAGING_BASIC_AUTH || "";

let fail = 0, pass = 0;
const ok = (n, good, d = "") => {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
};

/* 로그인 없이 열려야 하는 자리와, 로그인한 뒤에 열려야 하는 자리를 가른다.
   **로그인 벽을 500 과 섞지 않는다**: 앞엣것은 설계고 뒤엣것은 고장이다 */
const PUBLIC = [
  ["/api/health", "살아 있는가"],
  ["/cores", "전공 Core 고르기"],
  ["/v3/start", "검사 시작"],
  ["/pricing", "가격표"],
  ["/sample", "견본 결과지"],
];
const PRIVATE = [
  ["/me", "내 CareerMatri"],
  ["/me/results", "결과 기록"],
  ["/me/state", "지금 상태"],
  ["/me/next", "다음 할 일"],
  ["/me/experience", "내 경험"],
  ["/me/experience/new", "경험 추가"],
  ["/me/recompute", "새 경험 반영하기"],
  /* 넘기는 자리. **404 로 버리지 않는다**: 결과지와 전 회차 화면이 이
     주소를 가리키고 있다 */
  ["/me/gap", "옛 주소 넘기기"],
  ["/me/explore", "산업과 직무"],
  ["/me/region", "지역과 기관"],
  ["/me/jobs", "공고"],
  ["/me/apply", "지원한 곳"],
  ["/me/track", "Track"],
  /* 계정 영역 */
  ["/my", "계정"],
  ["/my/account", "비밀번호와 파기"],
  ["/my/assessments", "옛 검사 기록"],
  ["/my/results", "옛 검사 결과"],
  ["/my/evidence", "옛 경험 기록"],
];

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const gate = GATE.includes(":")
  ? { username: GATE.split(":")[0], password: GATE.slice(GATE.indexOf(":") + 1) } : null;
const ctx = await browser.newContext(gate ? { httpCredentials: gate } : {});

async function hit(path, need = []) {
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  let code = 0, at = path;
  const got = [];
  try {
    const r = await p.goto(B + path, { waitUntil: "domcontentloaded", timeout: 45000 });
    code = r ? r.status() : 0;
    at = new URL(p.url()).pathname;
    /* **200 만 보면 모자란다.** 서버 쪽에서 질의가 깨지면 Next 가 오류
       경계를 200 으로 내주는 배포본이 있다. 그러면 표가 통째로 없는 날에도
       이 검사가 초록으로 선다. 그 자리에 **실제로 서 있어야 하는 것**을
       같이 본다 */
    for (const sel of need) {
      got.push(await p.locator(sel).first().count().catch(() => 0));
    }
  } catch (e) {
    errs.push(String(e.message).slice(0, 120));
  }
  await p.close();
  return { code, at, errs, missing: need.filter((_, i) => !got[i]) };
}

/** Workspace 껍데기. 쪽이 터지면 이 띠가 서지 않는다 */
const RAIL = 'nav[aria-label="CareerMatri 메뉴"]';

const bad = [];
for (const [path, what] of PUBLIC) {
  const r = await hit(path);
  /* 공개 전 배포본의 자물쇠(401)와 상거래 잠금은 고장이 아니다 */
  const good = r.code === 200 || r.code === 401;
  if (!good) bad.push(`${path} ${r.code}`);
  ok(`${what} ${path}`, good, `${r.code}${r.errs.length ? ` · ${r.errs[0]}` : ""}`);
}

if (LOGIN) {
  const [id, pw] = [LOGIN.slice(0, LOGIN.indexOf(":")), LOGIN.slice(LOGIN.indexOf(":") + 1)];
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', id);
  await p.fill('input[type="password"]', pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => {});
  const landed = new URL(p.url()).pathname;
  await p.close();
  ok("로그인이 된다", !landed.startsWith("/login"), landed);

  for (const [path, what] of PRIVATE) {
    /* 넘기는 자리는 다른 쪽에 떨어지므로 띠를 그 자리에서 요구하지 않는다 */
    const want = path.startsWith("/me") && path !== "/me/gap" ? [RAIL] : [];
    const r = await hit(path, want);
    const good = r.code === 200 && !r.at.startsWith("/login")
      && r.errs.length === 0 && r.missing.length === 0;
    if (!good) bad.push(`${path} ${r.code} ${r.at}`);
    ok(`${what} ${path}`, good,
       `${r.code}${r.at !== path ? ` → ${r.at}` : ""}${r.errs.length ? ` · ${r.errs[0]}` : ""}` +
       `${r.missing.length ? ` · 자리표 없음 ${r.missing.join(" ")}` : ""}`);
  }

  /* ── Workspace 자료 경로를 실제로 밟는다 ───────────────────────
     이 셋이 이번 장애가 난 자리다. `/me` 와 `/me/state` 와 `/me/results`
     는 전부 `currentState(userId)` 를 부르고 그 함수가
     `career_profiles` 를 조회한다(`/me/state` 는 `profileOf()` 까지).
     그래서 **그 표가 없으면 이 셋이 서지 못한다** — 운영에서
     `relation "career_profiles" does not exist` 로 죽은 그 자리다.

     쪽이 열리는 것과 자료 경로가 돈 것을 가르기 위해, 껍데기 띠와 함께
     **그 쪽이 제 머리글과 제 본문을 그렸는지**를 본다. 자리표를 한
     모양으로 못 박지 않는 까닭은 상태마다 그리는 것이 갈리기 때문이다
     (검사 전은 `.cm-soon`, 끝낸 뒤는 `.cm-card`, 반영한 뒤는 `.cm-live`).
     어느 쪽이든 **질의가 돌아야만** 그 가운데 하나가 선다. */
  const DATA = [
    ["/me", "내 CareerMatri 홈이 지금 상태를 읽는다",
     [RAIL, ".cm-h1", ".cm-grid, .cm-card, .cm-soon"]],
    ["/me/state", "지금 상태가 career_profiles 와 굳은 결과를 읽는다",
     [RAIL, ".cm-h1", ".cm-card, .cm-soon"]],
    ["/me/results", "결과 기록이 스냅샷 이력을 읽는다",
     [RAIL, ".cm-h1", ".cm-card, .cm-soon, .cm-live"]],
  ];
  let dataOk = true;
  for (const [path, what, need] of DATA) {
    const r = await hit(path, need);
    const good = r.code === 200 && !r.at.startsWith("/login")
      && r.errs.length === 0 && r.missing.length === 0;
    if (!good) { dataOk = false; bad.push(`${path} 자료 경로`); }
    ok(what, good,
       `${r.code}${r.missing.length ? ` · 자리표 없음 ${r.missing.join(" ")}` : " · 그려졌다"}`);
  }
  ok("career_profiles 를 읽는 세 자리가 전부 돈다", dataOk,
     dataOk ? "표가 없으면 이 줄이 먼저 걸린다" : "위 줄을 보십시오");
} else {
  /* **못 본 것을 초록으로 적지 않는다.** 로그인 열쇠가 없으면 뒤쪽 열한
     자리는 보지 못한 것이고, 그 사실을 적는다 */
  console.log(`  못 봄  로그인이 필요한 ${PRIVATE.length}자리 — SMOKE_LOGIN 을 주면 봅니다`);
}

await browser.close();
console.log(`\n확인 ${pass + fail}자리 — 통과 ${pass} · 걸림 ${fail}`);
if (bad.length) console.log(`  ${bad.join(" / ")}`);
process.exitCode = fail ? 1 : 0;
