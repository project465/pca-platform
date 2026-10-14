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
  BASE, assertFreshServer, gateCreds, loadEnv,
} from "./_loop-fixture";
import { walk } from "./_v3-walk";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { appEnv } from "../src/lib/env";
import { MIN_CELL } from "../src/lib/org";
import {
  checkStudent, provisionStudent,
} from "../src/lib/campus/students";
import { allLeaves, statusOf, university } from "../src/lib/campus/registry";
import { campusV3 } from "../src/lib/me-v3/campus";

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
    await a.goto(`${BASE}/campus/${code}/d/${seat.leaf.code}`,
      { waitUntil: "domcontentloaded" });
    await a.locator('form button[type="submit"]').first().click()
      .catch(() => undefined);
    await a.waitForLoadState("networkidle").catch(() => undefined);
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
      /학교에서 안내받은 계정/.test(body));
    await anon.close();

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

    /* 7. 담당자 집계 */
    const agg = await campusV3({ universityCode: UNI, orgIds: [Number(orgId)] });
    /* 칸의 열쇠가 `key` 다. 학과 코드를 그 자리에서 찾는다 */
    const mineDep = (agg.by_department ?? [])
      .find((d) => d.key === seat.leaf.code);
    ok("전체 응시에 들어간다", (agg.started ?? 0) >= 1, `${agg.started}`);
    ok("완료에 들어간다", (agg.scored ?? 0) >= 1, `${agg.scored}`);
    ok("단과대학 줄이 선다", (agg.by_college ?? []).length >= 1,
      `${(agg.by_college ?? []).length}줄`);
    ok("학과 줄이 선다", Boolean(mineDep), seat.leaf.name);
    ok("Core 줄이 선다", (agg.by_core ?? []).length >= 1,
      `${(agg.by_core ?? []).length}줄`);
    /* **한 명이면 학과 칸의 수를 내지 않는 것이 맞다.** 담당자가 그 빈
       칸을 `집계가 안 된다` 로 읽지 않게 여기서 적어 둔다 */
    ok(`${MIN_CELL}명 미만인 학과 칸은 수를 내지 않는다`,
      mineDep ? mineDep.n === null : false,
      mineDep ? `n=${String(mineDep.n)}` : "줄이 없다");
    say("담당자가 보는 것", `전체 응시 ${agg.started} · 완료 ${agg.scored}`
      + ` · 학과 칸은 ${MIN_CELL}명 미만이라 빈칸`);

    await ctx.close();
  } finally {
    await browser.close();
    /* 쓴 자료를 치운다. **운영과 같은 표를 쓰므로 남기지 않는다** */
    for (const id of made) {
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
