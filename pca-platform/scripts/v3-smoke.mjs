/**
 * 배포본에서 열두 자리가 500 없이 열리는가.
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
  ["/me/experience", "경험"],
  ["/me/experience/new", "경험 추가"],
  ["/me/recompute", "재분석"],
  ["/me/gap", "Gap 과 할 일"],
  ["/me/explore", "탐색"],
  ["/me/region", "지역과 기관"],
  ["/me/jobs", "공고"],
  ["/me/apply", "지원한 곳"],
  ["/me/track", "Track"],
  ["/my/assessments", "내 검사 목록"],
];

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const gate = GATE.includes(":")
  ? { username: GATE.split(":")[0], password: GATE.slice(GATE.indexOf(":") + 1) } : null;
const ctx = await browser.newContext(gate ? { httpCredentials: gate } : {});

async function hit(path) {
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  let code = 0, at = path;
  try {
    const r = await p.goto(B + path, { waitUntil: "domcontentloaded", timeout: 45000 });
    code = r ? r.status() : 0;
    at = new URL(p.url()).pathname;
  } catch (e) {
    errs.push(String(e.message).slice(0, 120));
  }
  await p.close();
  return { code, at, errs };
}

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
    const r = await hit(path);
    const good = r.code === 200 && !r.at.startsWith("/login") && r.errs.length === 0;
    if (!good) bad.push(`${path} ${r.code} ${r.at}`);
    ok(`${what} ${path}`, good,
       `${r.code}${r.at !== path ? ` → ${r.at}` : ""}${r.errs.length ? ` · ${r.errs[0]}` : ""}`);
  }
} else {
  /* **못 본 것을 초록으로 적지 않는다.** 로그인 열쇠가 없으면 뒤쪽 열한
     자리는 보지 못한 것이고, 그 사실을 적는다 */
  console.log(`  못 봄  로그인이 필요한 ${PRIVATE.length}자리 — SMOKE_LOGIN 을 주면 봅니다`);
}

await browser.close();
console.log(`\n확인 ${pass + fail}자리 — 통과 ${pass} · 걸림 ${fail}`);
if (bad.length) console.log(`  ${bad.join(" / ")}`);
process.exitCode = fail ? 1 : 0;
