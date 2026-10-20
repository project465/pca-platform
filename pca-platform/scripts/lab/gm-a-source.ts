/**
 * **기업 숫자마다 출처 줄과 검증 등급이 붙어 있는가를 센다.** (Track A · v9)
 *
 * gm-full6 가 남긴 HTML(var/pdf-gm/BIZ-PRO-<TAG>.html)을 브라우저로 열고, 쪽 본문에서 기업 숫자
 * (억 · 명 · % · 접수번호가 아닌 금액)를 찾는다. 숫자마다 가까운 조상(그 숫자를 담은 칸·줄·카드)을
 * 거슬러 올라가며 출처 표시(접수번호 · OpenDART · 사업보고서 · KODATA · 검색 · 보도 · ‘리포트가 계산’)와
 * 검증 등급 표시(`.vt` 이름표)가 있는지 본다. 같은 칸에 있으면 ‘칸’, 쪽 아래 출처 줄에만 있으면 ‘쪽’,
 * 어디에도 없으면 ‘없음’ 이다. 없음은 0 이어야 한다.
 *
 *   CASES=RICH,POOR,CONTRA npx tsx scripts/lab/gm-a-source.ts
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import path from "node:path";

const CASES = (process.env.CASES ?? "RICH,POOR,CONTRA").split(",");
const WORK = path.resolve("var/pdf-gm");

const JS = `(() => {
  const FIG = /(-?[0-9][0-9,]*(?:\\.[0-9]+)?)\\s*(억|명|%)/g;
  const SRC = /접수번호|OpenDART|사업보고서|공시|KODATA|검색|보도|리포트가 계산|기업종합보고서|홈페이지/;
  const out = [];
  document.querySelectorAll(".pg").forEach((pg, i) => {
    const bd = pg.querySelector(".bd"); if (!bd) return;
    const walker = document.createTreeWalker(bd, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent || ""; FIG.lastIndex = 0; let m;
      while ((m = FIG.exec(t))) {
        const el = n.parentElement;
        if (el.closest(".rh,.rf,.x-toc")) continue;
        /* 학생 응답의 수(‘판단 3가지’ 같은)나 쪽 번호는 기업 숫자가 아니다: 억·명·% 만 센다.
           단위 설명(‘÷ 1억’)과 팀 규모(‘팀 3~5명’)도 기업 숫자가 아니다 */
        const pre = t.slice(Math.max(0, m.index - 6), m.index);
        if (/÷\\s*$/.test(pre) || /팀\\s*[0-9]+~$/.test(pre) || /~$/.test(pre)) continue;
        let lvl = "없음", hop = 0, a = el, grade = false;
        for (; a && a !== bd && hop <= 5; a = a.parentElement, hop++) {
          const at = a.textContent || "";
          if (!grade && (a.classList.contains("vt") || a.querySelector(".vt"))) grade = true;
          if (lvl === "없음" && SRC.test(at)) lvl = "칸";
        }
        if (lvl === "없음") { const src = bd.querySelector(".src"); if (src && SRC.test(src.textContent || "")) { lvl = "쪽"; grade = grade || !!src.querySelector(".vt"); } }
        out.push({ page: i + 1, n: Number(pg.dataset.page), fig: m[0], ctx: t.trim().slice(0, 60), lvl, grade });
      }
    }
  });
  return out;
})()`;

async function main(): Promise<void> {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  let none = 0;
  for (const TAG of CASES) {
    const html = path.join(WORK, `BIZ-PRO-${TAG}.html`);
    if (!existsSync(html)) { console.log(`${TAG}: HTML 없음(gm-full6 을 먼저 돌린다)`); continue; }
    const p = await b.newPage();
    await p.goto("file://" + html, { waitUntil: "load" });
    const rows = await p.evaluate(JS) as { page: number; n: number; fig: string; ctx: string; lvl: string; grade: boolean }[];
    await p.close();
    const by = (k: string) => rows.filter((x) => x.lvl === k);
    console.log(`\n## ${TAG} · 기업 숫자 ${rows.length}개 · 칸에 출처 ${by("칸").length} · 쪽 출처 줄만 ${by("쪽").length} · 출처 없음 ${by("없음").length} · 등급 표시 없음 ${rows.filter((x) => !x.grade).length}`);
    for (const x of rows.filter((x) => x.lvl !== "칸" || !x.grade)) console.log(`  ${x.page}쪽(설계 ${x.n}) ${x.fig} [${x.lvl}${x.grade ? "" : " · 등급 없음"}] ${x.ctx}`);
    none += by("없음").length;
  }
  await b.close();
  console.log(`\n출처 없음 합계 ${none}`);
  process.exit(none ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
