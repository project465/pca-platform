/**
 * **검사 가능한 학과의 길을 끝까지 밟는다.**
 *
 * 지금 배재대 학과 열 개가 전부 `준비 중` 이다(열린 Core 가 기계공학
 * 하나뿐이고 지시문이 준 학과에 기계공학 계열이 없다). 그래서 등록부에
 * **시험용 학교 하나**를 넣고 그 길을 밟는다. 끝나면 되돌린다.
 *
 * 학교가 하나라도 열리면 이 검사가 그 학교를 그대로 밟게 바꾼다. 그때까지
 * 시험용 학교가 서 있는 까닭은, **열리는 날 처음 밟아 보면 그날 고칠
 * 것이 생기기 때문**이다.
 *
 * 세는 것 열.
 *
 *   검사 가능 학과가 누를 수 있는 칸으로 선다 · 학과 상세가 영역을 적는다
 *   · 공통 시작 화면으로 간다 · 그 화면이 학교와 학과를 적는다 · 응시가
 *   열린다 · 응시 줄에 맥락이 적힌다 · 쿠키가 남지 않는다 · 일반 진입에는
 *   학교가 서지 않는다 · 일반 응시는 학교 칸이 비어 있다
 *
 *   UI_BASE=http://127.0.0.1:3100 npm run campus:walk
 */
import { copyFileSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, loadEnv, login, makeStudent } from "./_loop-fixture";
import { query, queryOne } from "../src/lib/db";

loadEnv();
/**
 * **두 자리를 같이 고친다.** standalone 서버는 빌드가 떠 둔 복사본을
 * 읽는다(`.next/standalone/sites/...`). 저장소 쪽만 고치면 화면은 그대로다.
 */
const REGS = [
  "sites/pca-platform/content/campus-universities.json",
  ".next/standalone/sites/pca-platform/content/campus-universities.json",
];
const REG = REGS[0];

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

async function main(): Promise<void> {
  for (const f of REGS) copyFileSync(f, `${f}.walkbak`);
  try {
    const reg = JSON.parse(readFileSync(REG, "utf8"));
    reg.universities.push({
      university_code: "ZZTEST",
      university_name: "확인용 대학",
      market_code: "KR",
      entry_note: "검사 가능한 자리의 길을 밟는 용도. 커밋하지 않는다",
      brand_asset: null,
      source_url: "https://example.invalid/",
      source_year: 2027,
      verified_at: null,
      verification: "OFFICIAL_PAGE_UNREACHABLE",
      verification_note: "확인용",
      region_hint: "KR-CHUNGCHEONG",
      region_cities: ["대전"],
      colleges: [{
        code: "ZZ_ENG", name: "확인용 단과대학",
        units: [{
          code: "ZZ_FACULTY", name: "확인용 학부", kind: "faculty",
          majors: [{
            code: "ZZ_ME", name: "확인용 기계공학전공", kind: "major",
            core_code: "ME_CORE_V3", specialization: null,
          }],
        }],
      }],
    });
    for (const f of REGS) writeFileSync(f, JSON.stringify(reg, null, 2));

    const me = await makeStudent("campus-walk@test.invalid");
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await login(ctx, "campus-walk@test.invalid", me.pw);

    await page.goto(`${BASE}/campus/zztest/majors`, { waitUntil: "networkidle" });
    const open = await page.evaluate(() => [...document.querySelectorAll("a.cm-pc")]
      .map((e) => ({
        name: e.querySelector(".cm-pc-h > b")?.textContent?.trim(),
        state: e.querySelector(".cm-pc-h > em")?.textContent?.trim(),
        href: e.getAttribute("href"),
      })));
    ok("검사 가능 학과가 누를 수 있는 칸으로 선다",
      open.length === 1 && open[0].state === "검사 가능", JSON.stringify(open));

    await page.getByRole("link", { name: "확인용 기계공학전공" }).click();
    await page.waitForURL(/\/d\/ZZ_ME$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    const body = await page.evaluate(() => document.body.innerText);
    ok("학과 상세에 살펴보는 영역이 선다", body.includes("살펴보는 영역"));
    ok("학과 상세에 전공 이름이 선다", body.includes("기계공학"));
    await page.screenshot({
      path: "docs/metri/shots/campus/desktop/04-ready-detail.png", fullPage: true });

    await page.getByRole("button", { name: "이 전공으로 검사 시작" }).click();
    await page.waitForURL(/\/v3\/start/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    const start = await page.evaluate(() => document.body.innerText);
    ok("공통 검사 시작 화면으로 간다", /\/v3\/start/.test(page.url()), page.url());
    ok("시작 화면이 학교와 학과를 적는다",
      start.includes("확인용 대학") && start.includes("확인용 기계공학전공"),
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
    }>(`SELECT core_code, university_code, college_code, department_code,
               specialization_code
          FROM v3_attempts WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [me.id]);
    ok("응시 줄에 학교 맥락이 적힌다",
      row?.university_code === "ZZTEST" && row?.college_code === "ZZ_ENG"
      && row?.department_code === "ZZ_ME" && row?.core_code === "ME_CORE_V3",
      JSON.stringify(row));

    /* **쿠키를 더 들고 있지 않는다.** 다음 응시에 묻어 들어가면 그 사람이
       고르지 않은 학과로 검사가 시작된다 */
    const jar = await ctx.cookies();
    ok("학과 쿠키가 응시 뒤에 남지 않는다",
      !jar.some((c) => c.name === "cm_campus" && c.value),
      jar.filter((c) => c.name === "cm_campus").map((c) => c.value).join(" "));

    /**
     * **고친 쿠키로 남의 학과 맥락을 적을 수 없다**(규격 §11).
     *
     * 쿠키가 담는 것은 학교와 자리 코드 둘뿐이고 나머지는 서버가
     * 등록부에서 읽는다. 그래도 그 둘을 고쳐 **준비 중인 학과**나
     * **다른 학교의 자리**를 적을 수 있으면 안 된다. 셋을 그 자리에서
     * 넣어 보고, 적힌 줄이 비어 있는지 본다.
     */
    for (const forged of ["PCU:PCU_BATTERY", "PCU:ZZ_ME", "ZZTEST:PCU_EE"]) {
      await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [me.id]);
      await ctx.addCookies([{
        name: "cm_campus", value: forged, url: BASE,
        httpOnly: true, sameSite: "Lax",
      }]);
      await page.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
      await page.getByText("학부", { exact: true }).click();
      await page.getByRole("button", { name: "검사 시작" }).click();
      await page.waitForURL(/\/v3\/\d+/, { timeout: 30000 });
      const f = await queryOne<{ core_code: string; university_code: string | null;
        department_code: string | null }>(
        `SELECT core_code, university_code, department_code FROM v3_attempts
          WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [me.id]);
      ok(`고친 쿠키가 맥락을 적지 못한다 — ${forged}`,
        f?.university_code === null && f?.department_code === null
        && f?.core_code === "ME_CORE_V3", JSON.stringify(f));
    }

    /* 일반 B2C 로 들어오면 학교 맥락이 비어 있다 */
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [me.id]);
    await page.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
    const plain = await page.evaluate(() => document.body.innerText);
    ok("일반 진입에는 학교 이름이 서지 않는다", !plain.includes("확인용 대학"));
    await page.getByText("학부", { exact: true }).click();
    await page.getByRole("button", { name: "검사 시작" }).click();
    await page.waitForURL(/\/v3\/\d+/, { timeout: 30000 });
    const row2 = await queryOne<{ core_code: string; university_code: string | null }>(
      `SELECT core_code, university_code FROM v3_attempts
        WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [me.id]);
    ok("일반 응시는 학교 칸이 비어 있다",
      row2?.university_code === null && row2?.core_code === "ME_CORE_V3",
      JSON.stringify(row2));

    await browser.close();
  } finally {
    for (const f of REGS) { copyFileSync(`${f}.walkbak`, f); unlinkSync(`${f}.walkbak`); }
  }
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) process.exit(1);

}

void main();
