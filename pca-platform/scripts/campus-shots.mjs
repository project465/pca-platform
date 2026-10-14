/**
 * **학교 전용 진입을 실제 브라우저로 밟고 찍는다.**
 *
 * 자리 목록을 주소로 열기만 하지 않는다. 밟는 차례가 학생이 밟는 차례
 * 그대로다: 진입 → 학과 목록 → 학과 상세. 그리고 쪽이 서는가와 **고른
 * 일이 저장되는가**는 다른 질문이라, 준비 중인 학과를 막는 자리를 화면과
 * 서버 양쪽에서 본다.
 *
 * 세는 것 아홉.
 *
 *   ① 세 쪽이 200 으로 열린다
 *   ② 1440 과 390 에서 가로로 밀리지 않는다
 *   ③ 준비 중 학과 칸이 링크가 아니다
 *   ④ 준비 중 학과 주소를 손으로 쳐도 시작 단추가 없다
 *   ⑤ 준비 중 학과로 보낸 폼이 학과 목록으로 돌아온다
 *   ⑥ 안쪽 코드가 화면에 0건
 *   ⑦ 짙은 단추가 한 화면에 하나다
 *   ⑧ **한 화면에 한 Catalog 만 선다** — 다른 해에만 있는 학과가 섞이지 않는다
 *   ⑨ **다른 학년도로 가는 되돌림이 있다** — 개편으로 이름이 달라진 학생의 길
 *
 * **학과 이름을 이 파일에 적지 않는다.** 등록부에서 읽어 센다: 적어 두면
 * 학교가 이름을 바꾸는 날 이 검사가 멀쩡한 화면을 걸고 거짓 경보를 낸다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npm run campus:shots
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.UI_BASE || process.env.BASE
  || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = process.env.OUT || "docs/metri/shots/campus";
const UNI = (process.env.UNI || "pcu").toLowerCase();

/* 떠 있는 서버가 지금 빌드를 내주는가. 낡은 서버에서 돌린 결과는
   초록이든 빨강이든 아무것도 말하지 않는다 */
{
  const read = (f) => { try { return readFileSync(f, "utf8").trim(); } catch { return ""; } };
  const built = read(".next/BUILD_ID");
  const serving = read("var/.serving-build");
  if (built && serving && built !== serving) {
    console.error(`떠 있는 서버가 지난 빌드입니다(${serving} ≠ ${built}).`);
    process.exit(1);
  }
}

let pass = 0;
const bad = [];
const ok = (what, cond, saw = "") => {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
};

/* ── 등록부에서 셀 거리를 읽는다 ──────────────────────────────── */

const REG = JSON.parse(readFileSync(
  "sites/pca-platform/content/campus-universities.json", "utf8"));
const uni = REG.universities.find((u) => u.university_code.toLowerCase() === UNI);
if (!uni) { console.error(`등록부에 ${UNI} 가 없습니다.`); process.exit(1); }

const leaves = (cat) => cat.colleges.flatMap((c) => c.units.flatMap(
  (x) => (x.majors?.length ? x.majors : [x])));
const baseCat = uni.catalogs.find((c) => c.status === "ACTIVE") ?? uni.catalogs[0];
const otherCats = uni.catalogs.filter((c) => c !== baseCat && c.status !== "RETIRED");

/**
 * 그 Catalog 에만 있는 자리의 이름. **Catalog 가 섞이는지 재는 자.**
 *
 * **쪽의 글자를 통째로 훑어 찾지 않는다.** 2027 의 `컴퓨터공학` 은 현행
 * `컴퓨터공학전공` 의 앞토막이라, 글자로 찾으면 멀쩡한 목록이 섞인 것으로
 * 걸린다. 그래서 세는 자리는 **칸의 이름 그대로**다.
 */
const onlyIn = (cat, others) => {
  const elsewhere = new Set(others.flatMap((c) => leaves(c).map((l) => l.name)));
  return leaves(cat).filter((l) => l.student_visible !== false
    && !elsewhere.has(l.name)).map((l) => l.name);
};
const baseOnly = onlyIn(baseCat, otherCats);
const otherOnly = otherCats.length ? onlyIn(otherCats[0], [baseCat]) : [];

/** Core 를 아직 들지 않은 자리. **반드시 `준비 중` 이다** */
const prepCode = process.env.PREP_CODE
  || leaves(baseCat).find((l) => !l.core_code && !l.majors)?.code;

/** 손님 화면에 서면 안 되는 안쪽 코드. 등록부의 코드까지 함께 센다 */
const CODES = [
  uni.university_code,
  ...uni.catalogs.map((c) => c.catalog_code),
  ...uni.catalogs.flatMap((c) => leaves(c).map((l) => l.code)),
];
const INNER = /\b(ME_CORE_V3|[A-Z]{2,6}_CORE_V\d|SPEC_[A-Z_]+|TD\d\d|FOUNDATION|READY_FOR_REVIEW)\b/;

const WIDTHS = [[1440, 900, "desktop"], [390, 844, "mobile"]];

const browser = await chromium.launch();
try {
  for (const [w, h, tag] of WIDTHS) {
    const dir = join(OUT, tag);
    mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();

    /* ── 진입 ─────────────────────────────────────────────── */
    const r1 = await page.goto(`${BASE}/campus/${UNI}`, { waitUntil: "networkidle" });
    ok(`${tag} 진입이 열린다`, r1?.status() === 200, String(r1?.status()));
    await page.screenshot({ path: join(dir, "01-entry.png"), fullPage: true });
    await shape(page, `${tag} 진입`);

    /* 첫 화면의 한 가지를 눌러 학과 목록으로 간다 */
    await page.getByRole("link", { name: "학과 선택하기" }).click();
    await page.waitForURL(/\/majors/);
    await page.waitForLoadState("networkidle");
    ok(`${tag} 학과 목록으로 간다`, /\/majors/.test(page.url()), page.url());
    await page.screenshot({ path: join(dir, "02-majors.png"), fullPage: true });
    await shape(page, `${tag} 학과 목록`);

    /* ── 한 화면에 한 Catalog 만 선다(규격 §3) ────────────── */
    {
      const tiles = await tileNames(page);
      const mixed = otherOnly.filter((n) => tiles.includes(n));
      ok(`${tag} 기본 목록에 다른 학년도 학과가 섞이지 않는다`
        + ` — 그쪽에만 있는 이름 ${otherOnly.length}개`,
        !mixed.length, mixed.slice(0, 4).join(" "));
      const mine = baseOnly.filter((n) => tiles.includes(n));
      ok(`${tag} 기본 목록에 이 학년도 학과가 선다`, mine.length > 0,
        `${mine.length}/${baseOnly.length}`);
    }

    /* ── 다른 학년도로 가는 되돌림(규격 §4) ───────────────── */
    if (otherCats.length) {
      const y = otherCats[0].catalog_year;
      /* **줄이 있는가와 눌러서 바뀌는가는 다른 질문이다.** 되돌림을
         기억해 두려고 폼으로 두었으므로 링크가 아니라 단추를 찾고,
         찾은 뒤에는 실제로 눌러서 그 편제로 가는지 본다 */
      const swap = page.locator(
        `form:has(input[name="y"][value="${y}"]) button[type="submit"]`);
      ok(`${tag} 다른 학년도로 가는 줄이 있다`, await swap.count() > 0);
      await swap.first().click();
      await page.waitForURL(new RegExp(`y=${y}`), { timeout: 30000 });
      await page.waitForLoadState("networkidle");
      ok(`${tag} 눌러서 다른 학년도 목록으로 간다`,
        new RegExp(`y=${y}`).test(page.url()), page.url());
      /* **정정이 기억되는가.** 주소에서 해를 떼고 다시 열어도 그 편제가
         서야 쪽을 옮길 때마다 다시 고치지 않는다 */
      await page.goto(`${BASE}/campus/${UNI}/majors`, { waitUntil: "networkidle" });
      const kept = await tileNames(page);
      ok(`${tag} 고쳐 고른 학년도가 기억된다`,
        otherOnly.some((n) => kept.includes(n))
        && !baseOnly.some((n) => kept.includes(n)),
        kept.slice(0, 3).join(" "));
      const r = await page.goto(`${BASE}/campus/${UNI}/majors?y=${y}`,
        { waitUntil: "networkidle" });
      ok(`${tag} 다른 학년도 목록이 열린다`, r?.status() === 200, String(r?.status()));
      await page.screenshot({
        path: join(dir, "04-other-catalog.png"), fullPage: true });
      const tiles = await tileNames(page);
      const mixed = baseOnly.filter((n) => tiles.includes(n));
      ok(`${tag} 다른 학년도 목록에 기본 학년도 학과가 섞이지 않는다`,
        !mixed.length, mixed.slice(0, 4).join(" "));
      const mine = otherOnly.filter((n) => tiles.includes(n));
      ok(`${tag} 다른 학년도 목록에 그쪽 학과가 선다`, mine.length > 0,
        `${mine.length}/${otherOnly.length}`);
      await shape(page, `${tag} 다른 학년도 목록`);
    }

    /* ── 준비 중 학과 칸이 링크가 아니다 ───────────────────── */
    /* 기억해 둔 정정을 지우고 기본 편제로 돌아간다. 지우지 않으면 아래
       걸음이 **앞 걸음이 남긴 상태**를 재게 된다 */
    await ctx.clearCookies();
    await page.goto(`${BASE}/campus/${UNI}/majors`, { waitUntil: "networkidle" });
    const offs = await rows(page);
    const prep = offs.filter((o) => o.state === "준비 중");
    ok(`${tag} 준비 중 학과 칸이 링크가 아니다 — ${prep.length}개`,
      prep.length > 0 && prep.every((o) => o.tag !== "a" && !o.href),
      prep.filter((o) => o.tag === "a").map((o) => o.name).join(" "));
    const states = new Set(offs.map((o) => o.state));
    ok(`${tag} 화면에 서는 상태가 둘뿐이다`,
      [...states].every((s) => s === "검사 가능" || s === "준비 중"),
      [...states].join(" "));

    /* ── 준비 중 학과 주소를 손으로 친다 ───────────────────── */
    const r3 = await page.goto(`${BASE}/campus/${UNI}/d/${prepCode}`,
      { waitUntil: "networkidle" });
    ok(`${tag} 준비 중 학과 상세가 열린다(404 가 아니다)`, r3?.status() === 200,
      String(r3?.status()));
    await page.screenshot({ path: join(dir, "03-preparing.png"), fullPage: true });
    const hasStart = await page.getByRole("button", { name: "검사 시작하기" })
      .count();
    ok(`${tag} 준비 중 학과에 시작 단추가 없다`, hasStart === 0, String(hasStart));
    await shape(page, `${tag} 준비 중 학과`);

    await ctx.close();
  }

  /* ── 서버가 막는다 ───────────────────────────────────────── */
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    /* 폼을 그 자리에서 세워 보낸다. **화면에 단추가 없는 것과 서버가
       거절하는 것은 다른 일이다** */
    await page.goto(`${BASE}/campus/${UNI}/majors`, { waitUntil: "networkidle" });
    const res = await page.request.post(`${BASE}/campus/${UNI}/d/${prepCode}`, {
      form: { u: uni.university_code, d: prepCode },
      headers: { "next-action": "x" },
      maxRedirects: 0,
    }).catch(() => null);
    /* 서버 액션 호출 규약은 판본마다 달라서 상태 코드로 재지 않는다.
       재는 것은 **응시가 열리지 않았는가**다 */
    ok("준비 중 학과로 보낸 폼이 응시를 열지 않는다",
      !res || res.status() >= 400 || !/\/v3\/start/.test(
        res.headers()["x-action-redirect"] ?? res.headers().location ?? ""),
      String(res?.status()));
    await ctx.close();
  }
} finally {
  await browser.close();
}

/**
 * 목록에 선 줄 그대로. **탭을 전부 돌아 모은다.**
 *
 * 학과 목록은 단과대학 탭 하나씩 선다(규격 §4). 첫 탭만 보면 그 뒤의
 * 단과대학이 통째로 안 세어지고, 그러면 `섞이지 않는다` 가 **아무것도
 * 재지 않은 채** 통과한다. 이 저장소에서 선택자가 바뀐 날 그 모양으로
 * 거짓 통과가 났다.
 */
async function rows(page) {
  const grab = () => page.evaluate(() =>
    [...document.querySelectorAll(".cm-cmp-row")].map((el) => ({
      tag: el.tagName.toLowerCase(),
      name: el.querySelector(".cm-cmp-row-name")?.textContent?.trim() ?? "",
      state: el.querySelector(".cm-cmp-chip")?.textContent?.trim() ?? "",
      href: el.getAttribute("href") ?? "",
    })));
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll(".cm-cmp-tab")]
      .map((a) => a.getAttribute("href") ?? "").filter(Boolean));
  const out = await grab();
  const seen = new Set(out.map((r) => r.name));
  for (const href of tabs) {
    await page.goto(new URL(href, page.url()).toString(),
      { waitUntil: "networkidle" });
    for (const r of await grab()) {
      if (seen.has(r.name)) continue;
      seen.add(r.name); out.push(r);
    }
  }
  return out;
}

async function tileNames(page) {
  return (await rows(page)).map((r) => r.name);
}

/** 가로 넘침 · 안쪽 코드 · 짙은 단추 */
async function shape(page, what) {
  const v = await page.evaluate(() => {
    const over = document.documentElement.scrollWidth
      - document.documentElement.clientWidth;
    let prim = 0;
    for (const el of document.querySelectorAll("a, button")) {
      if (!el.checkVisibility({ contentVisibilityAuto: true })) continue;
      const bg = getComputedStyle(el).backgroundColor;
      const m = bg.match(/\d+(\.\d+)?/g);
      if (!m || m.length < 3) continue;
      const [r, g, b] = m.map(Number);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (lum < 0.55 && (m[3] === undefined || Number(m[3]) > 0.5)) prim++;
    }
    return { over, prim, text: document.body.innerText };
  });
  ok(`${what} 가로로 밀리지 않는다`, v.over <= 1, `${v.over}px`);
  const m = v.text.match(INNER);
  const codes = CODES.filter((c) => new RegExp(`\\b${c}\\b`).test(v.text));
  ok(`${what} 안쪽 코드가 0건`, !m && !codes.length,
    [m ? m[0] : "", ...codes].filter(Boolean).join(" "));
  ok(`${what} 짙은 단추가 하나다`, v.prim <= 1, String(v.prim));
}

console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
console.log(`  그림  ${OUT}/{desktop,mobile}`);
if (bad.length) process.exit(1);
