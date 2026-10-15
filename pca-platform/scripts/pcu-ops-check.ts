/**
 * **배재대 담당자가 아침에 여는 화면이 실제 학생 응시를 반영하는가.**
 *
 * 묻는 것은 `집계 함수가 맞는 수를 내는가` 가 아니다. 그쪽은
 * `campus:walk` 이 센다. 여기가 묻는 것은 **담당자 계정으로 로그인해 그
 * 화면을 열면 그 수가 서는가**다. 둘은 다른 질문이다: 집계가 맞아도
 * `organizations.code` 가 `PCU` 가 아니면 학교 진입으로 들어온 학생이 한
 * 명도 잡히지 않고, **담당자는 그것을 `아직 아무도 안 쳤다` 로 읽는다.**
 *
 * **운영 DB 에 쓰지 않는다.** 로컬이 아닌 주소면 그 자리에서 멈춘다
 * (`backup-restore.sh` 가 운영처럼 보이는 주소를 거절하는 것과 같은
 * 까닭이다). 만드는 것은 전부 `is_demo` 이고 끝에서 치운다.
 *
 * **운영에 무엇을 만들어야 하는지는 읽어서 적는다.** `PCU` 기관과 담당자
 * 계정이 있는지 먼저 세고, 없으면 **그것을 운영에서 만들 일로 적는다.**
 * 이 검사가 운영에 만들어 주지 않는다: 담당자 계정은 사람이 받는 것이고
 * 열쇠가 그 자리에서 한 번만 보여야 한다.
 *
 *   V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npm run pcu:ops
 */
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import {
  BASE, assertFreshServer, assertPreviewServer, gateCreds, loadEnv, login,
  makeStudent,
} from "./_loop-fixture";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { appEnv } from "../src/lib/env";
import { MIN_CELL as MIN } from "../src/lib/org";
import {
  allLeaves, facultyOf, readinessOf, specializationName, university,
} from "../src/lib/campus/registry";
import { openAttempt } from "../src/lib/me-v3/runtime/session";

loadEnv();

const UNI = "PCU";
/**
 * 5명 규칙의 선. **여기 적지 않고 제품에서 읽는다**: 손으로 적어 두면
 * 그 선을 고친 날 이 검사가 옛 선으로 센다.
 */
const MIN_CELL = MIN;
/** 적은 쪽에 몇 명을 세울까 */
const FEW = 3;

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? ` — ${saw}` : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? ` — ${saw}` : ""}`); }
};
const say = (w: string, saw: string): void => {
  console.log(`  적어둠  ${w} — ${saw}`);
};

/**
 * **이 DB 가 이 기계의 것인가.**
 *
 * 쓰는 검사라 주소를 먼저 본다. 운영처럼 보이면 그 자리에서 멈춘다:
 * 여기서 만드는 사람과 기관이 운영 DB 에 남으면 그날 집계가 거짓이 된다.
 */
function assertLocalDb(): string {
  if (appEnv() === "production") throw new Error("운영에서는 돌리지 않습니다.");
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL 이 없습니다.");
  const host = (/@([^/:?]+)/.exec(url)?.[1] ?? "").toLowerCase();
  const local = !host || host === "localhost" || host === "127.0.0.1"
    || url.startsWith("postgres:///") || url.includes("/var/run/postgresql");
  if (!local) {
    throw new Error(
      `이 기계의 DB 가 아닙니다(${host}). **쓰는 검사라 거절합니다.**`);
  }
  return host || "유닉스 소켓";
}

async function main(): Promise<void> {
  assertFreshServer();
  const host = assertLocalDb();
  console.log(`\n── 배재대 운영 화면 (LOCAL · DB ${host})\n`);

  const u = university(UNI);
  if (!u) throw new Error("등록부에 PCU 가 없습니다");

  /* ── 1. 운영에 무엇이 있어야 하는가 (읽기만) ─────────────── */
  const orgNow = await queryOne<{ id: string; name: string | null; is_demo: boolean }>(
    `SELECT id::text, name, is_demo FROM organizations WHERE code = $1`, [UNI]);
  const adminNow = orgNow ? await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM memberships
      WHERE org_id = $1::bigint AND role IN ('org_admin','instructor')`,
    [orgNow.id]) : null;
  say("이 DB 의 PCU 기관",
    orgNow ? `있다 (${orgNow.name ?? "이름 없음"}${orgNow.is_demo ? " · 시연" : ""})`
      : "없다 — 운영에서 만들어야 한다");
  say("이 DB 의 PCU 담당자",
    adminNow ? `${adminNow.n}명` : "없다 — 운영에서 만들어야 한다");
  if (!orgNow) {
    console.log("    운영에서 할 일: `organizations` 에 code='PCU' 한 줄"
      + "(org_type='university' · country='KR' · is_demo=false)");
    console.log("    그리고 그 기관에 role='org_admin' membership 하나."
      + " **열쇠는 그 자리에서 만들어 한 번만 보여 준다**");
  }

  /* ── 2. 세울 자리 둘을 등록부에서 고른다 ─────────────────── */
  const rows = allLeaves(u).filter((r) =>
    readinessOf(u, r, undefined, { preview: false }) === "ASSESSMENT_READY");
  if (rows.length < 2) throw new Error(`자료가 다 선 자리가 ${rows.length}개뿐이다`);
  /**
   * **이미 들어 있는 응시를 세고 나서 올린다.**
   *
   * 처음에는 `MANY` 명을 그냥 넣고 화면에 그 수가 서는지 봤는데, 그 학과에
   * 앞서 돌린 검사의 응시가 한 줄 남아 있어 화면이 7 을 적었다. **멀쩡한
   * 화면이 걸렸다.** 세는 것은 넣은 수가 아니라 **DB 의 수와 화면의 수가
   * 같은가**다.
   */
  const seen = new Map((await query<{ d: string; n: string }>(
    `SELECT department_code d, count(DISTINCT user_id)::text n FROM v3_attempts
      WHERE university_code = $1 AND department_code IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM users du
                         WHERE du.id = user_id AND du.is_demo)
      GROUP BY 1`,
    [UNI])).map((r) => [r.d, Number(r.n)]));
  const A = rows[0];
  const B = rows.find((r) => r.college.code !== A.college.code
    && !seen.get(r.leaf.code)) ?? rows[1];
  /* 많은 쪽은 다섯을 넘기고, 적은 쪽은 다섯에 못 미치게 둔다 */
  const addA = Math.max(0, MIN_CELL + 1 - (seen.get(A.leaf.code) ?? 0));
  const addB = Math.max(0, Math.min(FEW, MIN_CELL - 1 - (seen.get(B.leaf.code) ?? 0)));
  for (const r of [A, B]) assertPreviewServer(r.leaf.core_code as string);
  console.log(`  자리  많은 쪽 ${A.leaf.name} (+${addA}) `
    + `· 적은 쪽 ${B.leaf.name} (+${addB})\n`);
  if (addB < 1) throw new Error(`적은 쪽에 자리가 없다: ${B.leaf.name}`);

  const made: string[] = [];
  let orgId = orgNow?.id ?? null;
  let orgMade = false;
  const adminMail = `pcu-ops-admin-${Date.now()}@test.invalid`;
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    /* ── 3. 담당자 쪽 fixture ─────────────────────────────── */
    if (!orgId) {
      const o = await queryOne<{ id: string }>(
        `INSERT INTO organizations (code, country, org_type, name, language, is_demo)
         VALUES ($1,'KR','university',$2,'ko',TRUE) RETURNING id::text`,
        [UNI, u.university_name]);
      orgId = o?.id ?? null;
      orgMade = true;
    }
    ok("PCU 기관이 선다 (없으면 이 검사가 만든다)", Boolean(orgId),
      orgMade ? "이 검사가 만들었다 (시연)" : "이미 있었다");

    const pw = randomBytes(18).toString("base64url");
    const admin = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [adminMail, await hashPassword(pw)]);
    made.push(admin?.id as string);
    await query(
      `INSERT INTO memberships (user_id, org_id, role)
       VALUES ($1,$2::bigint,'org_admin')`, [admin?.id, orgId]);
    ok("담당자 계정으로 붙을 수 있다", Boolean(admin?.id), "열쇠는 그 자리에서 만들었다");

    /* ── 4. 학생 응시를 세운다 ────────────────────────────── */
    const put = async (
      leaf: { leaf: { code: string; core_code?: string | null;
                      specialization?: string | null };
              college: { code: string } },
      n: number, tag: string,
    ): Promise<void> => {
      for (let i = 0; i < n; i += 1) {
        const st = await makeStudent(`pcu-ops-${tag}-${i}@test.invalid`);
        made.push(st.id);
        /* **시연 계정이 아니어야 담당자 화면에 선다**(§23). 집계와 명단이
           둘 다 시연·검사 계정을 거르므로, 시연으로 두면 이 줄이 화면에
           아예 서지 않고 **세는 자리가 아무것도 말하지 않는 채로 걸린다**:
           DB 의 수와 화면의 수가 서로 다른 모집단이 된다 */
        await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`,
          [st.id]);
        await openAttempt({
          userId: st.id, tier: "BASIC", stage: "bachelor", gradField: null,
          campus: {
            university_code: UNI, college_code: leaf.college.code,
            department_code: leaf.leaf.code,
            core_code: leaf.leaf.core_code as string,
            specialization: leaf.leaf.specialization ?? null,
          } as never,
        });
      }
    };
    await put(A, addA, "many");
    await put(B, addB, "few");

    /* ── 5. 적힌 줄이 등록부와 맞는가 (§5) ────────────────── */
    const ctx0 = await query<{ college_code: string | null;
      department_code: string | null; specialization_code: string | null;
      tier: string }>(
      `SELECT college_code, department_code, specialization_code, tier
         FROM v3_attempts WHERE user_id = ANY($1::bigint[])`, [made]);
    const wrong = ctx0.filter((r) => {
      const row = allLeaves(u).find((x) => x.leaf.code === r.department_code);
      if (!row) return true;
      if (row.college.code !== r.college_code) return true;
      return (row.leaf.specialization ?? null) !== r.specialization_code;
    });
    ok("학생 응시의 학교·단과대학·학과·갈래가 등록부와 맞는다", wrong.length === 0,
      wrong.length ? JSON.stringify(wrong[0]) : `${ctx0.length}줄`);
    ok("학교 응시가 전부 PRO 다", ctx0.every((r) => r.tier === "PRO"),
      [...new Set(ctx0.map((r) => r.tier))].join(" "));

    /* ── 6. 담당자 화면 ───────────────────────────────────── */
    const gate = gateCreds();
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const errs: string[] = [];
    const p = await login(ctx, adminMail, pw);
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
    await p.goto(`${BASE}/org/v3`, { waitUntil: "networkidle" });
    /* **접힌 자리를 펴고 본다.** 담당자 화면의 묶음 여럿이 펼침 안에 있고,
       `innerText` 는 닫힌 자리의 글을 돌려주지 않는다. 그 상태로 세면
       **담긴 묶음을 없는 것으로 적는다** */
    await p.evaluate(() => {
      for (const d of document.querySelectorAll("details")) d.open = true;
    });
    await p.waitForTimeout(150);
    const txt = await p.evaluate(() => document.body.innerText);
    ok("담당자 화면이 열린다", /전공 진단 집계/.test(txt), p.url());
    ok("`연결된 기관이 없습니다` 가 아니다", !txt.includes("연결된 기관이 없습니다"));

    /* **화면과 같은 모집단을 센다**(§23). 집계는 시연·검사 계정을 거르므로
       거르지 않은 수와 견주면 **두 수가 다른 사람들을 센 값**이 되고, 그
       차이를 화면의 잘못으로 적게 된다 */
    const started = await queryOne<{ n: string }>(
      `SELECT count(DISTINCT user_id)::text n FROM v3_attempts
        WHERE university_code = $1
          AND NOT EXISTS (SELECT 1 FROM users du
                           WHERE du.id = user_id AND du.is_demo)`, [UNI]);
    const kpi = await p.evaluate(() => [...document.querySelectorAll(".sf-kpi")]
      .map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim()));
    ok("검사를 시작한 학생 수가 DB 와 같다",
      kpi.some((k) => k.includes("검사를 시작한 학생") && k.includes(String(started?.n))),
      `DB ${started?.n}명 · 화면 ${kpi[0] ?? "없다"}`);

    const section = (title: string): string => {
      const i = txt.indexOf(title);
      return i < 0 ? "" : txt.slice(i, i + 900);
    };
    ok("단과대학 묶음이 선다", Boolean(section("단과대학")));
    ok("학과 묶음이 선다", Boolean(section("학과\n")) || txt.includes("학과별 응시"));
    ok("Core(전공) 묶음이 선다", txt.includes("어느 Major Core 로 응시했는가"));

    /* 5명 규칙의 양쪽. **DB 의 수와 견준다** */
    const dept = section("학과별 응시");
    const nA = Number((await queryOne<{ n: string }>(
      `SELECT count(DISTINCT user_id)::text n FROM v3_attempts
        WHERE university_code = $1 AND department_code = $2
          AND NOT EXISTS (SELECT 1 FROM users du
                           WHERE du.id = user_id AND du.is_demo)`,
      [UNI, A.leaf.code]))?.n ?? "0");
    const nB = Number((await queryOne<{ n: string }>(
      `SELECT count(DISTINCT user_id)::text n FROM v3_attempts
        WHERE university_code = $1 AND department_code = $2
          AND NOT EXISTS (SELECT 1 FROM users du
                           WHERE du.id = user_id AND du.is_demo)`,
      [UNI, B.leaf.code]))?.n ?? "0");
    ok(`많은 쪽을 다섯 넘게 세웠다 (${nA}명)`, nA >= MIN_CELL);
    ok(`적은 쪽은 다섯에 못 미친다 (${nB}명)`, nB > 0 && nB < MIN_CELL);
    ok(`${nA}명인 학과는 그 수를 낸다`,
      new RegExp(`${A.leaf.name}[\\s\\S]{0,40}\\b${nA}\\b`).test(dept),
      dept.split("\n").slice(0, 6).join(" / "));
    ok(`${nB}명인 학과는 숫자를 내지 않는다`,
      !new RegExp(`${B.leaf.name}[\\s\\S]{0,40}\\b${nB}\\b`).test(dept)
      && (dept.includes(`${MIN_CELL}명 미만`) || !dept.includes(B.leaf.name)),
      B.leaf.name);
    ok("0 으로 적지 않는다",
      !new RegExp(`${MIN_CELL}명 미만[\\s\\S]{0,20}\\b0\\b`).test(dept));

    /* 안쪽 코드 */
    const INNER = /\b[A-Z]+_CORE_V\d\b|\bPCU2[67]_[A-Z_]+\b|\bSPEC_[A-Z0-9_]+\b|\bTD\d\d\b|\bJ[1-8]\b|\bOC[1-7]\b|\bZ[1-5]\b|INDUSTRY_|ROLE_/;
    ok("담당자 화면에 안쪽 코드가 없다", !INNER.test(txt),
      (txt.match(INNER) ?? ["없다"])[0]);
    ok("등수와 합격 가능성을 내지 않는다고 적는다",
      txt.includes("줄을 세우지 않습니다") && txt.includes("합격 가능성"));
    ok("브라우저 오류 0", errs.length === 0, errs[0] ?? "없음");
    await ctx.close();
  } finally {
    await browser.close();
    /* **치운다.** 남겨 두면 다음 사람이 이 줄을 손님 자료로 읽는다 */
    for (const id of made.filter(Boolean)) {
      for (const t of ["v3_responses", "v3_evidence_picks", "v3_snapshots"]) {
        await query(
          `DELETE FROM ${t} WHERE attempt_id IN
             (SELECT id FROM v3_attempts WHERE user_id = $1::bigint)`, [id])
          .catch(() => undefined);
      }
      for (const t of ["v3_attempts", "v3_experiences", "v3_actions",
                       "career_events", "career_profiles", "memberships",
                       "entitlements", "analytics_events"]) {
        await query(`DELETE FROM ${t} WHERE user_id = $1::bigint`, [id])
          .catch(() => undefined);
      }
      await query(`DELETE FROM users WHERE id = $1::bigint`, [id])
        .catch(() => undefined);
    }
    if (orgMade && orgId) {
      await query(`DELETE FROM organizations WHERE id = $1::bigint`, [orgId])
        .catch(() => undefined);
    }
    const left = await queryOne<{ n: string }>(
      `SELECT count(*)::text n FROM users WHERE id = ANY($1::bigint[])`,
      [made.filter(Boolean)]);
    ok("쓴 자료를 지웠다", left?.n === "0", `사람 ${made.length}벌`);
    if (orgMade) {
      const o = await queryOne<{ n: string }>(
        `SELECT count(*)::text n FROM organizations WHERE code = $1`, [UNI]);
      ok("이 검사가 만든 기관을 지웠다", o?.n === "0");
    }
  }

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  for (const b of bad) console.log(`  · ${b}`);
  console.log("\n  **LOCAL 결과다.** 운영 DB 와 운영 배포본은 이 세션에서 열지 못했다.");
  if (bad.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
