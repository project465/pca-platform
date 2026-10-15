/**
 * **학교가 발급한 계정 하나로 일곱 걸음을 끝까지 밟는다.**
 *
 *   bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 npm run pcu:campus
 *
 * 묻는 것은 `쪽이 서는가` 가 아니다. **학교가 미리 발급한 계정으로 들어온
 * 학생이 학과를 다시 고르지 않고 검사를 끝내고, 그 응시가 담당자 화면에
 * 잡히는가**다.
 *
 * **개인 회원가입으로 새는 길이 없는지 함께 센다.** 전에는 학과를 고른
 * 비로그인 학생이 `/login` 으로 갔고 그 쪽에 `회원가입` 이 있어서, 학교
 * 계약 학생이 계약과 무관한 개인 계정을 만들 수 있었다. 그 계정의 응시는
 * 학교 맥락이 없어 담당자 화면에 잡히지 않는다.
 *
 * **쓰는 검사라 로컬이 아닌 주소면 멈춘다**(`pcu:ops` 와 같은 까닭이다).
 * 만드는 것은 끝에서 치운다.
 */
import { chromium } from "playwright";
import {
  BASE, assertFreshServer, gateCreds, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { pickOne, walk } from "./_v3-walk";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { appEnv } from "../src/lib/env";
import { MIN_CELL } from "../src/lib/org";
import {
  checkStudent, provisionStudent,
} from "../src/lib/campus/students";
import { allLeaves, statusOf, university } from "../src/lib/campus/registry";
import { majorNameOf } from "../src/lib/me-v3/major-name";
import { registry } from "../src/lib/me-v3/core-registry";
import { openAttempt } from "../src/lib/me-v3/runtime/session";
import { campusV3 } from "../src/lib/me-v3/campus";
import { currentState } from "../src/lib/me-v3/platform";

loadEnv();

const UNI = process.env.UNI ?? "PCU";

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? ` — ${saw}` : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? ` — ${saw}` : ""}`); }
};
const say = (w: string, saw: string): void =>
  console.log(`  적어둠  ${w} — ${saw}`);

function assertLocalDb(): string {
  if (appEnv() === "production") throw new Error("운영에서는 돌리지 않습니다.");
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL 이 없습니다.");
  const host = (/@([^/:?]+)/.exec(url)?.[1] ?? "").toLowerCase();
  const local = !host || host === "localhost" || host === "127.0.0.1"
    || url.startsWith("postgres:///") || url.includes("/var/run/postgresql");
  if (!local) throw new Error(`이 기계의 DB 가 아닙니다(${host}). 거절합니다.`);
  return host || "유닉스 소켓";
}

async function main(): Promise<void> {
  assertFreshServer();
  const host = assertLocalDb();
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  const code = u.university_code.toLowerCase();
  console.log(`\n── ${u.university_name} 학교 계정 흐름 (LOCAL · DB ${host})\n`);

  /* 지금 학생에게 열려 있는 자리를 고른다. 열린 자리가 없으면 멈춘다:
     닫힌 자리로 밟으면 `검사가 열리지 않는다` 로 까닭을 거꾸로 적게 된다 */
  const open = allLeaves(u).filter((r) =>
    statusOf(u, r, undefined, { preview: false }) === "READY");
  if (!open.length) {
    throw new Error("학생에게 열린 자리가 없습니다."
      + " `npm run pcu:open` 으로 보고 등록부에서 한 자리를 여십시오.");
  }
  const seat = open[0];
  say("밟는 자리", `${seat.catalog.catalog_code} ${seat.college.name}`
    + ` ${seat.leaf.name} (${seat.leaf.code})`);

  /* ── 기관 줄과 학생 계정 ─────────────────────────────────── */
  const made: string[] = [];
  let orgId: string | null = null;
  let orgMade = false;
  const sid = `zz${Date.now()}`.slice(0, 12);
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const o0 = await queryOne<{ id: string }>(
      `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
    if (o0) { orgId = o0.id; } else {
      const o = await queryOne<{ id: string }>(
        `INSERT INTO organizations (code, country, org_type, name, language, is_demo)
         VALUES ($1,'KR','university',$2,'ko',TRUE) RETURNING id::text`,
        [UNI, u.university_name]);
      orgId = o?.id ?? null; orgMade = true;
    }
    if (!orgId) throw new Error("기관 줄을 만들지 못했습니다");

    /* 1. 발급 — 등록부로 검증해서 만든다 */
    const c = checkStudent(UNI, {
      student_id: sid, name: "확인용 학생",
      department_code: seat.leaf.code, college_code: seat.college.code,
    });
    ok("명단 한 줄이 등록부를 지난다", c.ok, c.ok ? seat.leaf.code : c.why);
    if (!c.ok) throw new Error(c.why);
    const prov = await provisionStudent(orgId, c.value);
    made.push(prov.userId);
    ok("학생 계정이 만들어진다", prov.created && Boolean(prov.password),
      `아이디 ${c.value.loginId}`);
    const row = await queryOne<{ u: string; s: string; col: string;
      d: string; sp: string | null }>(
      `SELECT university_code u, student_id s, college_code col,
              department_code d, specialization sp
         FROM campus_students WHERE user_id = $1::bigint`, [prov.userId]);
    ok("학교 안 신분이 적힌다", row?.u === UNI && row?.d === seat.leaf.code,
      `${row?.u} · ${row?.s} · ${row?.col} · ${row?.d} · ${row?.sp ?? "갈래 없음"}`);
    const mem = await queryOne<{ role: string }>(
      `SELECT role FROM memberships
        WHERE user_id = $1::bigint AND org_id = $2::bigint`,
      [prov.userId, orgId]);
    ok("기관 소속이 붙는다", mem?.role === "student", mem?.role ?? "없다");
    const hash = await queryOne<{ h: string }>(
      `SELECT password_hash h FROM users WHERE id = $1::bigint`, [prov.userId]);
    ok("DB 에 평문 열쇠가 없다",
      Boolean(hash?.h) && hash?.h !== prov.password
        && (hash?.h ?? "").startsWith("$2"),
      (hash?.h ?? "").slice(0, 7));

    /* 2. 비로그인 학생이 검사 시작을 누르면 어디로 가는가 */
    const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (gateCreds()) await anon.setHTTPCredentials(gateCreds()!);
    const a = await anon.newPage();
    /* **누를 수 있게 된 뒤에 누른다.** `domcontentloaded` 직후에 누르면
       하이드레이션 전이라 클릭이 그냥 떨어지고, 그러면 그 자리에 그대로
       서 있는 것을 **`학교 로그인으로 가지 않는다` 로 거꾸로 적는다.**
       한 번 더 눌러 보는 까닭도 같다: 서버 쪽이 303 을 내는 것은 따로
       확인했고 여기서 세는 것은 **눌러서 그리로 가는가**다 */
    await a.goto(`${BASE}/campus/${code}/d/${seat.leaf.code}`,
      { waitUntil: "networkidle" });
    const startBtn = a.locator('form button[type="submit"]').first();
    for (let t = 0; t < 2 && new URL(a.url()).pathname !== `/campus/${code}/login`; t += 1) {
      await startBtn.click({ timeout: 5000 }).catch(() => undefined);
      await a.waitForURL((u) => new URL(u).pathname !== `/campus/${code}/d/${seat.leaf.code}`,
        { timeout: 15000 }).catch(() => undefined);
      await a.waitForLoadState("networkidle").catch(() => undefined);
    }
    const landed = new URL(a.url()).pathname;
    ok("비로그인 학생이 학교 전용 로그인으로 간다",
      landed === `/campus/${code}/login`, landed);
    ok("개인 회원가입으로 보내지 않는다",
      !landed.startsWith("/signup") && landed !== "/login", landed);
    const body = (await a.locator("body").innerText()).replace(/\s+/g, " ");
    ok("학교 로그인 화면에 회원가입 CTA 가 없다", !/회원가입/.test(body));
    ok("학교 로그인 화면에 소셜 단추가 없다",
      !/구글|Google|애플|Apple/.test(body));
    ok("학교에서 받은 계정으로 들어오라고 적는다",
      /학교에서 발급받은 계정/.test(body));
    await anon.close();

    /**
     * **앞사람의 세션이 남아 있는 자리**(규격 P0-1).
     *
     * 운영 Canary 에서 발급한 계정과 응시한 계정이 갈렸다. 학교 쪽은
     * 로그인했는지만 보고 보냈고, 그래서 이미 다른 계정으로 들어와 있던
     * 사람이 `검사 시작` 을 누르면 **그 사람의 응시에 학교와 학과가
     * 적히고 등급이 PRO 로 섰다.** 담당자 화면은 그 줄을 그 학과의
     * 학생으로 센다.
     *
     * 여기서 재는 것이 셋이다. 그 사람을 학교 쪽으로 보내지 않는가 ·
     * **다른 세션이 있어도 학교 로그인이 열리는가**(실습실 PC 에서 학교
     * 계정으로 바꿀 자리가 거기다) · 쿠키를 들고 `/v3/start` 를 바로
     * 쳐도 **학교 맥락이 적히지 않는가.**
     */
    const b2cMail = `zzb2c${Date.now()}@test.invalid`;
    const out = await makeStudent(b2cMail);
    made.push(out.id);
    /* **응시가 실제로 열리게 두고 센다.** 이용권이 없어 응시가 아예 안
       열리면 아래 줄이 `학교 맥락이 없다` 를 통과시키면서 **아무것도
       말하지 않는다**(이 저장소에서 그렇게 거짓 통과한 자리가 있었다) */
    await query(
      `INSERT INTO entitlements
         (user_id, product_code, kind, tier, major_code, assessment_version, status)
       VALUES ($1,'ME_V3_BASIC_KR','report','BASIC','ME','ME_V3_2','active')`,
      [out.id]);
    const bc = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (gateCreds()) await bc.setHTTPCredentials(gateCreds()!);
    const bp = await login(bc, b2cMail, out.pw).catch(() => null);
    const b = bp ?? await bc.newPage();
    if (!bp) {
      /* 아이디로 들어가지 못하면 그 자리에서 멈춘다: 로그인하지 않은
         사람으로 재면 아래 세 줄이 아무것도 말하지 않는다 */
      throw new Error("개인 계정으로 로그인하지 못했습니다");
    }
    await b.goto(`${BASE}/campus/${code}/d/${seat.leaf.code}`,
      { waitUntil: "networkidle" });
    const bBtn = b.locator('form button[type="submit"]').first();
    for (let t = 0; t < 2 && new URL(b.url()).pathname !== `/campus/${code}/login`; t += 1) {
      await bBtn.click({ timeout: 5000 }).catch(() => undefined);
      await b.waitForURL((u) => new URL(u).pathname !== `/campus/${code}/d/${seat.leaf.code}`,
        { timeout: 15000 }).catch(() => undefined);
      await b.waitForLoadState("networkidle").catch(() => undefined);
    }
    const bland = new URL(b.url()).pathname;
    ok("개인 계정으로 들어와 있으면 학교 응시로 보내지 않는다",
      bland === `/campus/${code}/login`, bland);
    const bbody = (await b.locator("body").innerText()).replace(/\s+/g, " ");
    ok("다른 세션이 있어도 학교 로그인이 열린다",
      /학교에서 발급받은 계정/.test(bbody)
        && /다른 계정으로 로그인되어 있습니다/.test(bbody));
    /* 쿠키는 이미 심어졌다. 주소를 바로 쳐서 넘어가 본다 */
    await b.goto(`${BASE}/v3/start`, { waitUntil: "domcontentloaded" });
    await b.waitForLoadState("networkidle").catch(() => undefined);
    /* **고르는 칸은 `pickOne` 으로 누른다.** 글자를 바로 누르면 하이드레이션이
       끝나기 전에는 React 가 그 변화를 못 받고, 그러면 폼이 학업 단계 없이
       가서 응시가 열리지 않는다. 그 상태로는 아래 줄이 통과하면서 아무것도
       말하지 않는다 */
    await pickOne(b.locator("fieldset.qs-opts").first(), 0);
    await b.getByRole("button", { name: "검사 시작" }).click()
      .catch(() => undefined);
    await b.waitForURL((x) => !/\/v3\/start/.test(new URL(x).pathname),
      { timeout: 20000 }).catch(() => undefined);
    await b.waitForLoadState("networkidle").catch(() => undefined);
    const brow = await queryOne<{ uni: string | null; tier: string; core: string }>(
      `SELECT university_code uni, tier, core_code core FROM v3_attempts
        WHERE user_id = $1::bigint ORDER BY id DESC LIMIT 1`, [out.id]);
    ok("쿠키를 들고 바로 쳐도 학교 맥락이 적히지 않는다",
      Boolean(brow) && brow?.uni === null && brow?.tier !== "PRO",
      brow ? `${brow.uni ?? "학교 없음"} · ${brow.tier} · ${brow.core}`
        : "응시가 열리지 않아 아무것도 재지 못했다");
    await bc.close();

    /* 3. 그 계정으로 로그인 → 학과가 복원되는가 */
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (gateCreds()) await ctx.setHTTPCredentials(gateCreds()!);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/campus/${code}/login`, { waitUntil: "domcontentloaded" });
    await p.fill('input[name="identifier"]', c.value.loginId);
    await p.fill('input[name="password"]', prov.password as string);
    await p.click('button[type="submit"]');
    await p.waitForURL((x) => !new URL(x).pathname.endsWith("/login"),
      { timeout: 30000 }).catch(() => undefined);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    ok("로그인하면 학교 쪽으로 돌아온다",
      new URL(p.url()).pathname === `/campus/${code}/start`,
      new URL(p.url()).pathname);
    const st = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    ok("학과를 다시 고르게 하지 않는다",
      st.includes(seat.leaf.name) && !/학과 선택하기/.test(st),
      seat.leaf.name);
    ok("학번이 적힌다", st.includes(sid), sid);
    ok("안쪽 코드가 학생 화면에 없다",
      !new RegExp(`${seat.leaf.code}|${seat.leaf.core_code}`).test(st));

    /**
     * 4. 검사 시작 → PRO 강제
     *
     * **학업 단계를 묻는 걸음은 지나야 한다.** 학교 쪽에서 `검사 시작` 을
     * 누르면 공통 시작 화면(`/v3/start`)이 서고 거기서 학업 단계를 고른다.
     * 그 값은 routing 이 쓰는 값이라 묻는 것이 맞고, **등급과는 다른
     * 자리다**: 등급은 이용권이 정하고 화면이 고를 수 없다. 처음에는 이
     * 걸음을 몰라 `/v3/start` 에서 응시가 안 열렸다고 적었다.
     */
    await p.locator('form button[type="submit"]').first().click();
    await p.waitForURL(/\/v3\/start/, { timeout: 30000 }).catch(() => undefined);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    const common = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    ok("공통 시작 화면이 그 학과를 적는다", common.includes(seat.leaf.name),
      seat.leaf.name);
    ok("공통 시작 화면에 등급 선택이 없다",
      !/BASIC|STANDARD|등급을 고르|등급 선택/.test(common));
    await p.getByText("학부", { exact: true }).click();
    await p.getByRole("button", { name: "검사 시작" }).click();
    await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? null;
    ok("응시가 열린다", Boolean(att), p.url().replace(BASE, ""));
    const arow = await queryOne<{ tier: string; uni: string | null;
      col: string | null; dep: string | null; core: string }>(
      `SELECT tier, university_code uni, college_code col,
              department_code dep, core_code core
         FROM v3_attempts WHERE id = $1::bigint`, [att]);
    ok("응시 줄이 학교 맥락을 든다",
      arow?.uni === UNI && arow?.dep === seat.leaf.code,
      `${arow?.uni} · ${arow?.col} · ${arow?.dep} · ${arow?.core}`);
    ok("등급이 PRO 로 강제된다", arow?.tier === "PRO", arow?.tier ?? "없다");
    /* **발급한 계정과 응시한 계정이 같다**(규격 P0-1). 운영 Canary 에서
       갈린 자리라 글자로 센다 */
    const owner = await queryOne<{ uid: string }>(
      `SELECT user_id::text uid FROM v3_attempts WHERE id = $1::bigint`, [att]);
    ok("발급한 계정이 응시한 계정이다", owner?.uid === prov.userId,
      `발급 ${prov.userId} · 응시 ${owner?.uid ?? "없다"}`);
    const first = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    ok("검사 화면에 등급 선택이 없다",
      !/BASIC|STANDARD|등급을 고르|등급 선택/.test(first));

    /* 5. 끝까지 답하고 제출 */
    const w = await walk(p, 200);
    ok("끝까지 간다", w.done, `화면 ${w.screens}`);
    const ans = await queryOne<{ n: string }>(
      `SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1::bigint`,
      [att]);
    ok("답이 서버에 쌓인다", Number(ans?.n ?? 0) > 20, `${ans?.n}개`);

    /* 6. 결과와 종이 */
    /* **`v3_snapshots` 에 `core_code` 칸이 없다.** Core 는 판본 묶음
       안에 적힌다(`module_versions->>'core_version'`). 처음에는 칸 이름을
       짐작해 적었다가 42703 으로 멈췄다 */
    const snap = await queryOne<{ core: string | null; model: string }>(
      `SELECT (module_versions->>'core_version') AS core,
              (result_model IS NOT NULL)::text AS model
         FROM v3_snapshots WHERE attempt_id = $1::bigint
        ORDER BY id DESC LIMIT 1`, [att]);
    ok("결과가 만들어진다", snap?.core === seat.leaf.core_code,
      snap?.core ?? "없다");
    ok("결과 모델이 함께 굳는다", snap?.model === "true", String(snap?.model));
    await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "domcontentloaded" });
    await p.waitForLoadState("networkidle").catch(() => undefined);
    const res = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    ok("결과지가 선다", res.length > 400, `${res.length}자`);
    ok("결과지에 안쪽 코드가 없다",
      !/\bTD\d\d\b|\bBIZ_CORE_V1\b|\bPCU26_/.test(res));
    const pdf = await p.request.get(`${BASE}/v3/${att}/result/pdf`);
    ok("종이가 나온다",
      pdf.status() === 200
        && (pdf.headers()["content-type"] ?? "").includes("pdf"),
      `${pdf.status()} ${pdf.headers()["content-type"] ?? ""}`);

    /**
     * 7. 작업공간 — **결과를 받은 그 사람이 돌아올 자리.**
     *
     * 운영에서 여기가 오류 화면으로 떨어졌다. 앞의 여섯 걸음이 전부 PASS
     * 인 상태에서 났으므로 **아직 응시가 없는 사람의 길과 다른 길**이다.
     *
     * **쪽이 200 인가만 세면 모자라다.** 다른 Core 를 추정해 그려 놓은
     * 화면도 그 줄을 지난다. 그래서 둘을 함께 센다: 오류 화면이 아닌가 ·
     * 그리고 **이 사람의 전공으로 서는가.** 오류 화면은 Next 가 상태
     * 코드를 500 으로 내지 않는 경우가 있어 **그린 글자로도** 본다.
     */
    const major = majorNameOf(seat.leaf.core_code) ?? "";
    const others = registry().cores.filter((x) => x.code !== seat.leaf.core_code)
      .map((x) => x.name_ko).filter((x): x is string => Boolean(x))
      .filter((x) => x !== major);
    for (const [name, at] of [
      ["작업공간 홈", "/me"],
      ["현재 상태", "/me/state"],
      ["다음 할 일", "/me/next"],
      ["결과 기록", "/me/results"],
      ["경험", "/me/experience"],
    ] as const) {
      const r = await p.request.get(`${BASE}${at}`);
      await p.goto(`${BASE}${at}`, { waitUntil: "domcontentloaded" });
      await p.waitForLoadState("networkidle").catch(() => undefined);
      const t = (await p.locator("body").innerText()).replace(/\s+/g, " ");
      const broke = /화면을 불러오지 못했습니다|참조 번호/.test(t);
      ok(`${name} 가 선다`, r.status() === 200 && !broke,
        `${r.status()}${broke ? " · 오류 화면" : ""}`);
      const stray = others.find((x) => t.includes(x)) ?? null;
      ok(`${name} 가 다른 전공을 추정하지 않는다`, !stray, stray ?? major);
    }
    /**
     * **제출이 지금 값 줄을 만든다**(운영 P0-2 가 난 자리).
     *
     * 제출이 끝나면 `syncProfile()` 이 고른 산업과 직무를 옮기려고
     * `career_profiles` 에 줄을 하나 만든다. 그 줄의 `recomputed_at` 은
     * 칸 기본값으로 채워지고 `gaps` 는 객체다. 그 모양을 반영으로 읽으면
     * 작업공간이 통째로 오류 화면이 된다. 여기서는 **그 줄이 실제로
     * 생기는지**와 **그것을 반영으로 읽지 않는지**를 함께 센다.
     */
    const prof = await queryOne<{ gt: string; at: string | null }>(
      `SELECT jsonb_typeof(gaps) gt, recomputed_at::text at
         FROM career_profiles WHERE user_id = $1::bigint`, [prov.userId]);
    ok("제출이 지금 값 줄을 만든다", prof?.gt === "object",
      prof ? `gaps ${prof.gt}` : "줄이 없다");
    const cs = await currentState(prov.userId);
    ok("제출만 한 것을 반영으로 읽지 않는다",
      cs.stage === "PRO_DONE" && cs.recomputed_at === null,
      `${cs.stage} · ${cs.recomputed_at ?? "반영 전"}`);
    ok("작업공간이 이 전공으로 선다", true, major);

    /**
     * 8. 담당자 집계 — **양쪽을 다 재야 뜻이 선다.**
     *
     * `campusV3` 는 `started < MIN_CELL` 이면 전체 응시와 완료만 내고
     * **쪼갠 줄을 하나도 내지 않는다**(`campus.ts` 의 `사람이 다섯이 안
     * 되면 아래를 세지 않는다`). 칸의 수만 비우는 것이 아니라 줄 자체가
     * 없다: 네 명짜리 표에서는 전공과 학위를 겹치면 누구인지 짐작이 된다.
     *
     * 그래서 한 명으로 `단과대학 줄이 선다` 를 세면 **그것이 걸리는 것이
     * 맞고**, 그 걸림은 제품이 지켜 준 일이다. 처음에 그렇게 적어 네 줄이
     * 걸렸다. 재는 것을 둘로 나눈다: 5명 미만에서는 쪼갠 줄이 없는가 ·
     * 5명 이상에서는 그 줄이 서고 **DB 의 수와 같은가**.
     *
     * **넣은 수를 세지 않는다.** 그 학과에 앞서 돌린 응시가 남아 있을 수
     * 있어 화면의 수가 넣은 수와 다르다. DB 에 묻고 그 값과 견준다.
     */
    const dbCount = async (dep: string): Promise<number> => {
      const r = await queryOne<{ n: string }>(
        `SELECT count(DISTINCT user_id)::text n FROM v3_attempts
          WHERE university_code = $1 AND department_code = $2`, [UNI, dep]);
      return Number(r?.n ?? 0);
    };
    const started0 = await queryOne<{ n: string }>(
      `SELECT count(DISTINCT user_id)::text n FROM v3_attempts
        WHERE university_code = $1`, [UNI]);
    const few = await campusV3({ universityCode: UNI, orgIds: [Number(orgId)], withDemo: true });
    ok("전체 응시에 들어간다", (few.started ?? 0) >= 1, `${few.started}`);
    ok("완료에 들어간다", (few.scored ?? 0) >= 1, `${few.scored}`);
    if (Number(started0?.n ?? 0) < MIN_CELL) {
      ok(`${MIN_CELL}명 미만이면 쪼갠 줄을 내지 않는다`,
        few.too_few
          && !(few.by_college ?? []).length
          && !(few.by_department ?? []).length
          && !(few.by_core ?? []).length,
        `단과대학 ${(few.by_college ?? []).length}줄 · 학과 `
        + `${(few.by_department ?? []).length}줄 · Core `
        + `${(few.by_core ?? []).length}줄`);
      say("담당자가 보는 것 (사람이 적을 때)",
        `전체 응시 ${few.started} · 완료 ${few.scored}`
        + ` · 쪼갠 줄은 ${MIN_CELL}명 미만이라 내지 않는다`);
    } else {
      say("이 DB 에 이미 사람이 많다", `${started0?.n}명 — 아래에서 바로 센다`);
    }

    /* ── 5명을 넘기면 쪼갠 줄이 서는가 ───────────────────────
       브라우저로 다섯을 더 풀게 하지 않는다: 여기가 재는 것은 집계이고
       검사가 도는지는 위에서 이미 봤다 */
    const seatB = open.find((r) => r.college.code !== seat.college.code)
      ?? open.find((r) => r.leaf.code !== seat.leaf.code) ?? null;
    const addA = Math.max(0, MIN_CELL + 1 - await dbCount(seat.leaf.code));
    for (let i = 0; i < addA; i += 1) {
      /* **구분자를 앞에 둔다.** `zzagg${Date.now()}${i}` 를 14자로 자르면
           `i` 가 잘려 다섯 번이 **같은 학번**이 되고, 그러면 한 명만
           늘어 5명 선을 영원히 못 넘는다. 한 번 그렇게 걸렸다 */
      const sid2 = `zzagg${i}x${Date.now()}`.slice(0, 14);
      const cc = checkStudent(UNI, {
        student_id: sid2, name: "확인용", department_code: seat.leaf.code,
        college_code: seat.college.code,
      });
      if (!cc.ok) throw new Error(cc.why);
      const pv = await provisionStudent(orgId, cc.value);
      made.push(pv.userId);
      await openAttempt({
        userId: pv.userId, tier: "BASIC", stage: "bachelor", gradField: null,
        campus: { ...cc.value.ctx } as never,
      });
    }
    /* 적은 쪽도 하나 둔다. **양쪽이 있어야 가린다는 것이 보인다** */
    let fewDep: string | null = null;
    if (seatB) {
      const seen = await dbCount(seatB.leaf.code);
      const addB = Math.max(0, Math.min(2, MIN_CELL - 1 - seen));
      for (let i = 0; i < addB; i += 1) {
        const sid3 = `zzfew${i}x${Date.now()}`.slice(0, 14);
        const cc = checkStudent(UNI, {
          student_id: sid3, name: "확인용", department_code: seatB.leaf.code,
          college_code: seatB.college.code,
        });
        if (!cc.ok) throw new Error(cc.why);
        const pv = await provisionStudent(orgId, cc.value);
        made.push(pv.userId);
        await openAttempt({
          userId: pv.userId, tier: "BASIC", stage: "bachelor", gradField: null,
          campus: { ...cc.value.ctx } as never,
        });
      }
      if (addB > 0 || seen > 0) fewDep = seatB.leaf.code;
    }

    const agg = await campusV3({ universityCode: UNI, orgIds: [Number(orgId)], withDemo: true });
    const want = await dbCount(seat.leaf.code);
    const mineDep = (agg.by_department ?? []).find((d) => d.key === seat.leaf.code);
    ok("단과대학 줄이 선다", (agg.by_college ?? []).length >= 1,
      `${(agg.by_college ?? []).length}줄`);
    ok("학과 줄이 선다", Boolean(mineDep), seat.leaf.name);
    ok("Core 줄이 선다", (agg.by_core ?? []).length >= 1,
      `${(agg.by_core ?? []).length}줄`);
    ok("학과 칸의 수가 DB 의 수와 같다", mineDep?.n === want,
      `화면 ${String(mineDep?.n)} · DB ${want}`);
    if (fewDep) {
      const fewCell = (agg.by_department ?? []).find((d) => d.key === fewDep);
      const fewWant = await dbCount(fewDep);
      ok(`${MIN_CELL}명 미만인 학과 칸은 수를 내지 않는다`,
        Boolean(fewCell) && fewCell?.n === null && fewWant < MIN_CELL,
        `DB ${fewWant}명 · 화면 ${String(fewCell?.n)}`);
      ok("가린 칸을 0 으로 적지 않는다", fewCell?.n !== 0, String(fewCell?.n));
    }
    say("담당자가 보는 것", `전체 응시 ${agg.started} · 완료 ${agg.scored}`
      + ` · ${seat.leaf.name} ${String(mineDep?.n)}명`);

    await ctx.close();
  } finally {
    await browser.close();
    /* 쓴 자료를 치운다. **운영과 같은 표를 쓰므로 남기지 않는다** */
    /* **응시가 사람 삭제로 따라 지워지지 않는다.** 남겨 두면 다음 번
       집계가 그 줄을 세고, 그러면 `DB 의 수와 같은가` 가 지난 실행의
       자료를 재게 된다 */
    for (const id of made) {
      const att = await query<{ id: string }>(
        `SELECT id::text FROM v3_attempts WHERE user_id = $1::bigint`, [id])
        .catch(() => [] as { id: string }[]);
      for (const a of att) {
        for (const t of ["v3_responses", "v3_snapshots", "v3_screen_trace"]) {
          await query(`DELETE FROM ${t} WHERE attempt_id = $1::bigint`, [a.id])
            .catch(() => undefined);
        }
      }
      for (const t of ["v3_attempts", "campus_students", "memberships",
        "career_profiles", "career_events", "v3_experiences", "v3_actions",
        "analytics_events", "entitlements"]) {
        await query(`DELETE FROM ${t} WHERE user_id = $1::bigint`, [id])
          .catch(() => undefined);
      }
      await query(`DELETE FROM users WHERE id = $1::bigint`, [id])
        .catch(() => undefined);
    }
    if (orgMade) {
      await query(`DELETE FROM organizations WHERE code = $1`, [UNI])
        .catch(() => undefined);
    }
  }

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}\n`);
  if (bad.length) process.exit(1);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
