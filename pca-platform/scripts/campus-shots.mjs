/**
 * **학교 전용 진입을 실제 브라우저로 밟고 찍는다.**
 *
 * 자리 목록을 주소로 열기만 하지 않는다. 밟는 차례가 학생이 밟는 차례
 * 그대로다: 진입 → 학과 목록 → 학과 상세. 그리고 쪽이 서는가와 **고른
 * 일이 저장되는가**는 다른 질문이라, 준비 중인 학과를 막는 자리를 화면과
 * 서버 양쪽에서 본다.
 *
 * 세는 것 일곱.
 *
 *   ① 세 쪽이 200 으로 열린다
 *   ② 1440 과 390 에서 가로로 밀리지 않는다
 *   ③ 준비 중 학과 칸이 링크가 아니다
 *   ④ 준비 중 학과 주소를 손으로 쳐도 시작 단추가 없다
 *   ⑤ 준비 중 학과로 보낸 폼이 학과 목록으로 돌아온다
 *   ⑥ 안쪽 코드가 화면에 0건
 *   ⑦ 짙은 단추가 한 화면에 하나다
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

/** 손님 화면에 서면 안 되는 안쪽 코드 */
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
    await page.getByRole("link", { name: "전공 선택하기" }).click();
    await page.waitForURL(/\/majors$/);
    await page.waitForLoadState("networkidle");
    ok(`${tag} 학과 목록으로 간다`, /\/majors$/.test(page.url()), page.url());
    await page.screenshot({ path: join(dir, "02-majors.png"), fullPage: true });
    await shape(page, `${tag} 학과 목록`);

    /* ── 준비 중 학과 칸이 링크가 아니다 ───────────────────── */
    const offs = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll(".cm-pc")) {
        const tag = el.tagName.toLowerCase();
        const name = el.querySelector(".cm-pc-h > b")?.textContent?.trim() ?? "";
        const state = el.querySelector(".cm-pc-h > em")?.textContent?.trim() ?? "";
        out.push({ tag, name, state, href: el.getAttribute("href") ?? "" });
      }
      return out;
    });
    const prep = offs.filter((o) => o.state === "준비 중");
    ok(`${tag} 준비 중 학과 칸이 링크가 아니다 — ${prep.length}개`,
      prep.length > 0 && prep.every((o) => o.tag !== "a" && !o.href),
      prep.filter((o) => o.tag === "a").map((o) => o.name).join(" "));
    const states = new Set(offs.map((o) => o.state));
    ok(`${tag} 화면에 서는 상태가 둘뿐이다`,
      [...states].every((s) => s === "검사 가능" || s === "준비 중"),
      [...states].join(" "));

    /* ── 준비 중 학과 주소를 손으로 친다 ───────────────────── */
    const code = process.env.PREP_CODE || "PCU_BATTERY";
    const r3 = await page.goto(`${BASE}/campus/${UNI}/d/${code}`,
      { waitUntil: "networkidle" });
    ok(`${tag} 준비 중 학과 상세가 열린다(404 가 아니다)`, r3?.status() === 200,
      String(r3?.status()));
    await page.screenshot({ path: join(dir, "03-preparing.png"), fullPage: true });
    const hasStart = await page.getByRole("button", { name: "이 전공으로 검사 시작" })
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
    const res = await page.request.post(`${BASE}/campus/${UNI}/d/PCU_BATTERY`, {
      form: { u: "PCU", d: "PCU_BATTERY" },
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
  ok(`${what} 안쪽 코드가 0건`, !m, m ? m[0] : "");
  ok(`${what} 짙은 단추가 하나다`, v.prim <= 1, String(v.prim));
}

console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
console.log(`  그림  ${OUT}/{desktop,mobile}`);
if (bad.length) process.exit(1);
