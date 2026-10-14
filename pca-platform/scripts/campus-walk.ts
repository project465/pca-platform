/**
 * **검사 가능한 학과의 길을 끝까지 밟는다.**
 *
 * 지금 배재대의 고르는 자리가 두 Catalog 모두 `준비 중` 이다(열린 Core 가
 * 기계공학 하나뿐이고 사업주가 적어 준 학과에 기계공학 계열이 없다).
 * 그래서 **확인용 학교 하나**를 두고 그 길을 밟는다.
 *
 * **등록부 파일을 쓰지 않는다.** 전에는 `campus-universities.json` 자체를
 * 쓰고 끝에서 `.walkbak` 으로 되돌렸는데, 가운데서 터지면 확인용 학교가
 * 등록부에 남아 **다음 커밋에 손님 자료로 섞인다.** 지금은 그 학교가
 * `scripts/fixtures/campus-zztest.json` 에 있고 `V3_CAMPUS_FIXTURE` 를
 * 들고 띄운 서버만 읽는다(운영에서는 어떤 값으로도 붙지 않는다).
 *
 * 시험용 학교에 Catalog 를 **두 벌** 둔다. 이 회차가 세우는 구조가
 * `학년도별 Catalog` 라, 한 벌만 두면 **섞이지 않는가**를 재는 자가 없다.
 *
 * 세는 것 열넷.
 *
 *   기본 목록이 재학생 구조만 세운다 · 다른 학년도 구조로 되돌아갈 수
 *   있다 · 그쪽 목록에 이쪽 학과가 섞이지 않는다 · 다음 학년도 자리로도
 *   응시가 열리고 **응시 줄의 코드가 어느 해 구조인지 그대로 든다** ·
 *   검사 가능 학과가 누를 수 있는 칸으로 선다 · 학과 상세가 영역을 적는다
 *   · 공통 시작 화면으로 간다 · 그 화면이 학교와 학과를 적는다 · 응시가
 *   열린다 · 응시 줄에 맥락이 적힌다 · 쿠키가 남지 않는다 · 고친 쿠키가
 *   맥락을 적지 못한다 · 일반 진입에는 학교가 서지 않는다 · 일반 응시는
 *   학교 칸이 비어 있다
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
 *     bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 \
 *     V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
 *     npm run campus:walk
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import {
  BASE, assertCampusFixtureServer, loadEnv, login, makeStudent,
  registerCampusStudent,
} from "./_loop-fixture";
import { query, queryOne } from "../src/lib/db";
import { openAttempt } from "../src/lib/me-v3/runtime/session";

loadEnv();
/**
 * 끝에서 **쓰지 않았다는 것**을 세는 자리. 전에는 쓰는 자리였다.
 *
 * standalone 서버는 빌드가 떠 둔 복사본을 읽으므로 두 벌이 있다.
 */
const REGS = [
  "sites/pca-platform/content/campus-universities.json",
  ".next/standalone/sites/pca-platform/content/campus-universities.json",
];
const REG = REGS[0];
const FIXTURE = "scripts/fixtures/campus-zztest.json";
const sha = (f: string) =>
  createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);

/** 확인용 학교의 두 Catalog. **이름을 여기 적지 않고 fixture 에서 읽는다** */
const FX = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
  universities: {
    catalogs: { colleges: { units: { name: string; majors?: { name: string }[] }[] }[] }[];
  }[];
};
const unitName = (n: number): string => {
  const u = FX.universities[0].catalogs[n].colleges[0].units[0];
  return u.majors?.[0]?.name ?? u.name;
};
const CUR_NAME = unitName(0);
const NEXT_NAME = unitName(1);

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

/** 그 자리에서 응시를 열고 적힌 줄을 돌려준다 */
async function startAttempt(page: Page, path: string, userId: string): Promise<{
  core_code: string; university_code: string | null; college_code: string | null;
  department_code: string | null; specialization_code: string | null;
} | null> {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "검사 시작하기" }).click();
  await page.waitForURL(/\/v3\/start/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await page.getByText("학부", { exact: true }).click();
  await page.getByRole("button", { name: "검사 시작" }).click();
  await page.waitForURL(/\/v3\/\d+/, { timeout: 30000 });
  return queryOne(`SELECT core_code, university_code, college_code,
                          department_code, specialization_code
                     FROM v3_attempts WHERE user_id = $1
                    ORDER BY started_at DESC LIMIT 1`, [userId]);
}

async function main(): Promise<void> {
  /* **등록부를 쓰지 않는다.** 확인용 학교는 fixture 에 있고, 띄운 서버가
     그것을 읽고 있는지만 확인한다. 안 읽고 있으면 그 자리에서 멈춘다:
     확인용 학교가 없는 서버에서 밟으면 `/campus/zztest` 가 404 로 서고
     까닭을 **`학교 진입이 깨졌다` 로 거꾸로 적게 된다** */
  assertCampusFixtureServer("ZZTEST");
  process.env.V3_CAMPUS_FIXTURE = process.env.V3_CAMPUS_FIXTURE || FIXTURE;
  const before = REGS.map(sha);
  try {
    const reg = JSON.parse(readFileSync(REG, "utf8"));
    /** 준비 중인 자리 두 곳을 **등록부에서 읽는다.** 코드를 적어 두면 등록부를
        고친 날 이 검사가 멀쩡한 화면을 걸고 거짓 경보를 낸다 */
    const prep: string[] = [];
    for (const u of reg.universities) {
      for (const cat of u.catalogs ?? []) {
        for (const col of cat.colleges) {
          for (const x of col.units) {
            for (const l of x.majors?.length ? x.majors : [x]) {
              if (!l.core_code && !l.majors) prep.push(l.code);
            }
          }
        }
      }
    }

    const who = await makeStudent("campus-walk@test.invalid");
    /* **그 학교의 학생으로 적어 두고 밟는다.** 학교 쪽 `검사 시작` 과
       응시를 여는 경계가 그 줄을 본다(운영 Canary 에서 발급한 계정과
       응시한 계정이 갈린 자리다). 줄 없이 밟으면 학교 로그인으로
       되돌려지고, 그러면 아래가 제품이 아닌 길을 재게 된다 */
    await registerCampusStudent(who.id, "ZZTEST", "ZZ26_ME");
    const browser = await chromium.launch();
    const ctx: BrowserContext = await browser.newContext({
      viewport: { width: 1440, height: 900 } });
    const page = await login(ctx, "campus-walk@test.invalid", who.pw);

    /* ── 기본 목록은 재학생 구조만 세운다(규격 §2 · §3) ──────── */
    await page.goto(`${BASE}/campus/zztest/majors`, { waitUntil: "networkidle" });
    const open = await page.evaluate(() =>
      [...document.querySelectorAll("a.cm-cmp-row")].map((e) => ({
        name: e.querySelector(".cm-cmp-row-name")?.textContent?.trim(),
        state: e.querySelector(".cm-cmp-chip")?.textContent?.trim(),
        href: e.getAttribute("href"),
      })));
    ok("검사 가능 학과가 누를 수 있는 칸으로 선다",
      open.length === 1 && open[0].state === "검사 가능"
      && open[0].name === CUR_NAME, JSON.stringify(open));
    const curText = await page.evaluate(() => document.body.innerText);
    ok("기본 목록에 다음 학년도 학과가 섞이지 않는다",
      !curText.includes(NEXT_NAME));
    /* 되돌림은 링크가 아니라 폼이다. **고친 학년도를 기억해 두려는
       자리**라, 링크로 두면 주소를 벗어나는 순간 정정이 사라진다 */
    ok("다른 학년도로 가는 줄이 있다", await page.locator(
      'form:has(input[name="y"][value="2027"]) button[type="submit"]')
      .count() > 0);

    /* ── 다음 학년도 구조로 되돌아간다(규격 §4) ─────────────── */
    await page.goto(`${BASE}/campus/zztest/majors?y=2027`,
      { waitUntil: "networkidle" });
    const nextList = await page.evaluate(() =>
      [...document.querySelectorAll("a.cm-cmp-row")]
        .map((e) => e.querySelector(".cm-cmp-row-name")?.textContent?.trim()));
    ok("다음 학년도 목록에 그쪽 학과가 선다",
      nextList.length === 1 && nextList[0] === NEXT_NAME,
      JSON.stringify(nextList));
    const nextText = await page.evaluate(() => document.body.innerText);
    ok("다음 학년도 목록에 재학생 구조 학과가 섞이지 않는다",
      !nextText.includes(CUR_NAME));

    /**
     * **응시 줄의 코드가 어느 해 구조인지 그대로 든다**(규격 §1). 이것이
     * DB 에 Catalog 칸을 더하지 않아도 되는 까닭이다: 코드가 Catalog 를
     * 들지 않으면 집계와 담당자 화면이 두 해 구조를 한 줄로 뭉갠다.
     *
     * **어느 해 구조인지는 명단이 정한다.** 다른 해 자리를 눌러도 응시
     * 줄은 명단에 적힌 자리를 든다. 눌러서 바뀌게 두면 학생이 자기 학과와
     * 다른 자리를 고를 수 있고, 그 응시는 담당자 화면에서 **남의 학과
     * 줄에 선다**(규격 §7 · 학과 확인 쪽이 전부터 같은 까닭으로 다시
     * 고르게 하지 않는다). 고칠 자리는 명단이고 그 길은 `pcu:students`
     * 하나다.
     */
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [who.id]);
    const future = await startAttempt(page, "/campus/zztest/d/ZZ27_ME", who.id);
    ok("다른 해 자리를 눌러도 응시 줄은 명단의 자리를 든다",
      future?.department_code === "ZZ26_ME" && future?.college_code === "ZZ_ENG"
      && future?.university_code === "ZZTEST"
      && future?.core_code === "ME_CORE_V3", JSON.stringify(future));

    /* ── 재학생 구조 자리의 길을 끝까지 밟는다 ───────────────── */
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [who.id]);
    await page.goto(`${BASE}/campus/zztest/majors`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: CUR_NAME }).click();
    await page.waitForURL(/\/d\/ZZ26_ME$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    const body = await page.evaluate(() => document.body.innerText);
    ok("학과 상세에 살펴보는 영역이 선다", body.includes("살펴보는 영역"));
    ok("학과 상세에 전공 이름이 선다", body.includes("기계공학"));
    await page.screenshot({
      path: "docs/metri/shots/campus/desktop/04-ready-detail.png", fullPage: true });

    await page.getByRole("button", { name: "검사 시작하기" }).click();
    await page.waitForURL(/\/v3\/start/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    const start = await page.evaluate(() => document.body.innerText);
    ok("공통 검사 시작 화면으로 간다", /\/v3\/start/.test(page.url()), page.url());
    ok("시작 화면이 학교와 학과를 적는다",
      start.includes("확인용 대학") && start.includes(CUR_NAME),
      start.slice(0, 160));
    await page.screenshot({
      path: "docs/metri/shots/campus/desktop/05-ready-start.png", fullPage: true });

    /* 학업 단계를 고르고 시작한다. **공통 폼 그대로다** */
    await page.getByText("학부", { exact: true }).click();
    await page.getByRole("button", { name: "검사 시작" }).click();
    await page.waitForURL(/\/v3\/\d+/, { timeout: 30000 });
    ok("응시가 열린다", /\/v3\/\d+/.test(page.url()), page.url());

    const row = await queryOne<{
      core_code: string; university_code: string | null; college_code: string | null;
      department_code: string | null; specialization_code: string | null;
      tier: string;
    }>(`SELECT core_code, university_code, college_code, department_code,
               specialization_code, tier
          FROM v3_attempts WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [who.id]);
    ok("응시 줄에 학교 맥락이 적힌다",
      row?.university_code === "ZZTEST" && row?.college_code === "ZZ_ENG"
      && row?.department_code === "ZZ26_ME" && row?.core_code === "ME_CORE_V3",
      JSON.stringify(row));
    /* **학교 진입은 이용권이 없어도 PRO 다.** 이 사람에게 V3 이용권이 한
       줄도 없어서 화면이 넘긴 등급은 `BASIC` 이다. 그래도 PRO 로 적혀야
       같은 학과 학생의 결과를 한 표에서 읽을 수 있다 */
    ok("학교 응시는 이용권 없이도 PRO 로 열린다", row?.tier === "PRO", row?.tier);
    ok("시작 화면이 학생에게 등급을 적지 않는다",
      !/\bBASIC\b|\bSTANDARD\b|\bPRO\b/.test(start), start.slice(0, 200));

    /* **쿠키를 더 들고 있지 않는다.** 다음 응시에 묻어 들어가면 그 사람이
       고르지 않은 학과로 검사가 시작된다 */
    const jar = await ctx.cookies();
    ok("학과 쿠키가 응시 뒤에 남지 않는다",
      !jar.some((c) => c.name === "cm_campus" && c.value),
      jar.filter((c) => c.name === "cm_campus").map((c) => c.value).join(" "));

    /**
     * **고친 쿠키로 남의 학과 맥락을 적을 수 없다**(규격 §11 전 회차).
     *
     * 쿠키가 담는 것은 학교와 자리 코드 둘뿐이고 나머지는 서버가
     * 등록부에서 읽는다. 그래도 그 둘을 고쳐 **준비 중인 학과**나
     * **다른 학교의 자리**를 적을 수 있으면 안 된다. 넷을 그 자리에서
     * 넣어 보고, 적힌 줄이 비어 있는지 본다.
     */
    const forged = [
      `PCU:${prep[0]}`, `PCU:${prep[prep.length - 1]}`,
      "PCU:ZZ26_ME", "ZZTEST:ZZ26_FAC",
    ];
    for (const f of forged) {
      await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [who.id]);
      await ctx.addCookies([{
        name: "cm_campus", value: f, url: BASE,
        httpOnly: true, sameSite: "Lax",
      }]);
      await page.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
      await page.getByText("학부", { exact: true }).click();
      await page.getByRole("button", { name: "검사 시작" }).click();
      await page.waitForURL(/\/v3\/\d+/, { timeout: 30000 });
      const got = await queryOne<{ core_code: string; university_code: string | null;
        department_code: string | null }>(
        `SELECT core_code, university_code, department_code FROM v3_attempts
          WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [who.id]);
      ok(`고친 쿠키가 맥락을 적지 못한다 — ${f}`,
        got?.university_code === null && got?.department_code === null
        && got?.core_code === "ME_CORE_V3", JSON.stringify(got));
    }

    /**
     * **등급을 막는 자리가 서버 하나다**(설계 원칙 10).
     *
     * 화면에서 고르는 칸을 없앤 것으로는 모자란다: 폼이나 주소로 등급을
     * 넣는 길이 남아 있으면 어느 날 학교 응시 하나가 선별 등급으로 열리고,
     * 그 학생의 결과는 같은 학과의 나머지와 한 표에서 읽히지 않는다.
     * 그래서 **서버 함수를 직접 세 등급으로 불러** 본다: 학교 맥락이 선
     * 응시는 받은 등급을 보지 않고 PRO 로 열려야 하고, 개인 응시는 받은
     * 등급이 그대로여야 한다(B2C 는 셋을 계속 판다).
     */
    const CAMPUS = {
      university_code: "ZZTEST", college_code: "ZZ_ENG",
      department_code: "ZZ26_ME", core_code: "ME_CORE_V3",
      specialization: null,
    };
    for (const t of ["BASIC", "STANDARD", "PRO"] as const) {
      await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [who.id]);
      const a = await openAttempt({
        userId: who.id, tier: t, stage: "bachelor", gradField: null, campus: CAMPUS });
      ok(`학교 응시는 ${t} 를 넣어도 PRO 로 열린다`, a.tier === "PRO", a.tier);
    }
    for (const t of ["BASIC", "STANDARD", "PRO"] as const) {
      await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [who.id]);
      const a = await openAttempt({
        userId: who.id, tier: t, stage: "bachelor", gradField: null });
      ok(`개인 응시는 ${t} 가 그대로다`, a.tier === t, a.tier);
    }

    /**
     * **주소와 폼으로 넣어도 PRO 다** (운영 오픈 §2).
     *
     * 위의 줄은 서버 함수를 직접 부른다. 그것만으로는 **화면에서 서버까지
     * 가는 길에 등급이 끼어들 틈이 없는지**를 답하지 못한다: 폼에 칸을
     * 하나 더 꽂거나 주소에 `?tier=` 를 붙이는 것은 학생이 실제로 할 수
     * 있는 일이고, 거기서 한 번 새면 그 학생의 결과는 같은 학과의 나머지와
     * 한 표에서 읽히지 않는다.
     *
     * 그래서 **브라우저에서** 넣어 본다: 주소에 붙이고, 폼에 숨은 칸을
     * 그 자리에서 만들어 꽂고, 보내고, 적힌 줄의 등급을 본다.
     */
    for (const t of ["BASIC", "STANDARD"] as const) {
      await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [who.id]);
      /* 학과를 다시 고른다. 응시가 열리면 쿠키를 버리므로 */
      await page.goto(`${BASE}/campus/zztest/d/${encodeURIComponent("ZZ26_ME")}`,
        { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "검사 시작하기" }).click();
      await page.waitForURL(/\/v3\/start/, { timeout: 30000 });
      /* 주소에 등급을 붙인다 */
      await page.goto(`${BASE}/v3/start?tier=${t}&upgrade=${t}`,
        { waitUntil: "networkidle" });
      const txt = await page.evaluate(() => document.body.innerText);
      ok(`주소에 ${t} 를 붙여도 시작 화면이 등급을 적지 않는다`,
        !/\bBASIC\b|\bSTANDARD\b|\bPRO\b/.test(txt),
        (txt.match(/\bBASIC\b|\bSTANDARD\b|\bPRO\b/) ?? ["없다"])[0]);
      /* 폼에 숨은 칸 셋을 그 자리에서 꽂는다 */
      const put = await page.evaluate((want) => {
        const f = document.querySelector("form");
        if (!f) return 0;
        let n = 0;
        for (const name of ["tier", "upgrade", "product_code"]) {
          const i = document.createElement("input");
          i.type = "hidden"; i.name = name;
          i.value = name === "product_code" ? `ME_V3_${want}_KR` : want;
          f.appendChild(i); n += 1;
        }
        return n;
      }, t);
      ok(`폼에 숨은 등급 칸을 꽂았다 — ${t}`, put === 3, `${put}개`);
      await page.getByText("학부", { exact: true }).click();
      await page.getByRole("button", { name: "검사 시작" }).click();
      await page.waitForURL(/\/v3\/\d+/, { timeout: 30000 });
      const inj = await queryOne<{ tier: string; university_code: string | null }>(
        `SELECT tier, university_code FROM v3_attempts
          WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [who.id]);
      ok(`주소와 폼으로 ${t} 를 넣어도 PRO 응시가 만들어진다`,
        inj?.tier === "PRO" && inj?.university_code === "ZZTEST",
        JSON.stringify(inj));
    }

    /* 일반 B2C 로 들어오면 학교 맥락이 비어 있다 */
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [who.id]);
    await page.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
    const plain = await page.evaluate(() => document.body.innerText);
    ok("일반 진입에는 학교 이름이 서지 않는다", !plain.includes("확인용 대학"));
    await page.getByText("학부", { exact: true }).click();
    await page.getByRole("button", { name: "검사 시작" }).click();
    await page.waitForURL(/\/v3\/\d+/, { timeout: 30000 });
    const row2 = await queryOne<{ core_code: string; university_code: string | null }>(
      `SELECT core_code, university_code FROM v3_attempts
        WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [who.id]);
    ok("일반 응시는 학교 칸이 비어 있다",
      row2?.university_code === null && row2?.core_code === "ME_CORE_V3",
      JSON.stringify(row2));

    await browser.close();
  } finally {
    ok("등록부를 한 바이트도 쓰지 않았다",
      before.every((h, i) => h === REGS.map(sha)[i]), before[0]);
  }
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) process.exit(1);
}

void main();
