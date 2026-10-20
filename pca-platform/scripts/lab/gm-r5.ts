/**
 * **BIZ 진로·직무 리포트 R5 를 뽑는다.** 운영 PDF 경로와 연결하지 않는다(파일만 쓴다).
 *
 *   CASES=RICH:1,POOR:2,CONTRA:3 OUT=docs/metri/review/r5/pdf npx tsx scripts/lab/gm-r5.ts
 *
 *  1. 사례마다 6쪽 시안(`PROTO6/<TAG>.pdf` · `PROTO6/pages/<TAG>/p-NN.png`)
 *  2. 같은 렌더러의 전체(`FULL/<TAG>.pdf` · `FULL/pages/<TAG>/`) — 시안은 전체의 부분집합이다
 *  3. 같은 번호 6쪽을 세 사례 나란히(`COMPARE6/p-NN.png`)
 *  4. 검사 → `LINT_RESULTS.md`: 넘침 · 8.5pt 아래 · 빈 쪽 · 금지어 · 상투 · **단정 표현** · **POOR ‘강점’** ·
 *     **명조 글꼴 사용** · **쪽 문법 수(시안 6종 이상)** · **4쪽이 사례마다 다른 문법인가** · 조사 · 되풀이
 * 하나라도 걸리면 1 로 끝난다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { load3 } from "./gm-report3";
import { edit8, type Ed8 } from "../../src/lib/me-v3/report-gm/editorial8";
import { pages9, proto9, html9, type Page9 } from "../../src/lib/me-v3/report-gm/render9";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":") as [string, string]);
const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/r5/pdf";
const FONTS = { sans: "fonts/pretendard" };

/* 넘침 · 채움: 쪽 상자(.bd, 표지는 .pg) 안의 글이 바닥·오른쪽을 넘는가, 세로 몇 % 를 덮는가 */
const OVER_JS = `(() => [...document.querySelectorAll(".pg")].map((pg) => {
  const bd = pg.querySelector(".bd") || pg; const box = bd.getBoundingClientRect(); let max = 0, right = 0;
  for (const e of bd.querySelectorAll("*")) { const b = e.getBoundingClientRect(); if (b.height) { max = Math.max(max, b.bottom); right = Math.max(right, b.right); } }
  const iv = [...bd.querySelectorAll("*")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || e.matches(".wl,.st4,.i3,.mx .q,.cell,.chips span,.dl,.call,.nx")).map((e) => { const b = e.getBoundingClientRect(); return [Math.max(b.top, box.top), Math.min(b.bottom, box.bottom)]; }).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let cov = 0, cur = null; for (const [a, b] of iv) { if (!cur || a > cur[1]) { if (cur) cov += cur[1] - cur[0]; cur = [a, b]; } else cur[1] = Math.max(cur[1], b); } if (cur) cov += cur[1] - cur[0];
  const mid = box.top + box.height / 2; let low = 0; for (const [a, b] of iv) { const x = Math.max(a, mid); if (b > x) low += b - x; }
  return { key: pg.dataset.key, grammar: pg.dataset.grammar, over: Math.round(max - box.bottom), right: Math.round(right - box.right), fill: Math.round((cov / box.height) * 100), lower: Math.round(Math.min(100, (low / (box.height / 2)) * 100)) };
}))()`;
const FONT_JS = `(() => { const out = []; document.querySelectorAll(".pg").forEach((pg) => {
  for (const el of pg.querySelectorAll("*")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!own) continue; const r = el.getBoundingClientRect(); if (!r.width) continue;
    const cs = getComputedStyle(el);
    out.push({ key: pg.dataset.key, pt: Math.round(parseFloat(cs.fontSize) * 0.75 * 100) / 100, family: cs.fontFamily, text: own.slice(0, 30) });
  } }); return out; })()`;

const FORBIDDEN = ["DART", "OpenDART", "전자공시", "공시", "사업보고서", "반기보고서", "분기보고서", "매출액", "영업이익", "순이익", "재무제표", "접수번호", "사업자등록번호", "법인등록번호", "KODATA", "(주)", "주식회사", "확인 수준", "적합도", "합격률", "합격 가능", "채용 확률", "연봉", "지역 기업"];
const TEMPLATE = ["로 해석할 수 있습니다", "으로 해석할 수 있습니다", "확인할 필요가 있습니다", "현재 결과에서는", "가능성을 보여줍니다", "활용할 수 있습니다", "이 보고서는", "보여줍니다", "연결될 수 있습니다", "중요합니다", "확인해볼 필요", "역량을 강화", "성장 방향", "핵심 포인트", "강점이 드러납니다", "Evidence", "Insight", "Summary"];
/** 자기보고만으로 단정하는 말 */
const ASSERT = ["강점입니다", "능력이 있습니다", "역량이 있습니다", "잘합니다", "뛰어납니다", "갖추고 있습니다", "경험이 있습니다", "강점 세 가지", "지금 강한 쪽"];

async function printPages(b: Awaited<ReturnType<typeof chromium.launch>>, e: Ed8, ps: Page9[], name: string, pdf: string) {
  const html = path.join(WORK, name + ".html");
  writeFileSync(html, html9(e, ps, FONTS));
  const p = await b.newPage();
  await p.goto("file://" + html, { waitUntil: "load" });
  await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  const over = (await p.evaluate(OVER_JS)) as { key: string; grammar: string; over: number; right: number; fill: number; lower: number }[];
  const fonts = (await p.evaluate(FONT_JS)) as { key: string; pt: number; family: string; text: string }[];
  mkdirSync(path.dirname(pdf), { recursive: true });
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await p.close();
  const fontsInPdf = execFileSync("pdffonts", [pdf]).toString();
  return { over, fonts, fontsInPdf, pages: Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())![1]) };
}
function pngs(pdf: string, dir: string, res = "80") {
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  execFileSync("pdftoppm", ["-r", res, "-png", pdf, path.join(dir, "p")]);
  for (const fn of readdirSync(dir)) { const m = /^p-0*(\d+)\.png$/.exec(fn); if (m && fn !== `p-${m[1].padStart(2, "0")}.png`) execFileSync("mv", [path.join(dir, fn), path.join(dir, `p-${m[1].padStart(2, "0")}.png`)]); }
}
function sentences(text: string): string[] {
  return text.split(/\n/).filter((l) => !/진로·직무 리포트|CareerMatri$|● 응답/.test(l.trim()))
    .join(" ").replace(/\s+/g, " ").split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.length >= 18);
}

async function main(): Promise<void> {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const lint: string[] = []; let bad = 0;
  const protoDirs: string[] = []; const case4: Record<string, string> = {}; const tags: string[] = [];
  for (const [TAG, ID] of CASES) {
    tags.push(TAG);
    const e = edit8(await load3(ID));
    const all = pages9(e); const proto = proto9(all);
    const full = path.join(OUT, "FULL", `${TAG}.pdf`);
    const rf = await printPages(b, e, all, `R5-${TAG}`, full);
    pngs(full, path.join(OUT, "FULL", "pages", TAG), "60");
    const ppdf = path.join(OUT, "PROTO6", `${TAG}.pdf`);
    const rp = await printPages(b, e, proto, `R5-${TAG}-6`, ppdf);
    const pdir = path.join(OUT, "PROTO6", "pages", TAG); pngs(ppdf, pdir, "100"); protoDirs.push(pdir);
    case4[TAG] = all.find((p) => p.key === "case4")!.grammar;
    /* 검사 */
    const txt = execFileSync("pdftotext", [full, "-"]).toString();
    const forb = FORBIDDEN.filter((w) => txt.includes(w));
    const tmpl = TEMPLATE.filter((w) => txt.includes(w));
    const asrt = ASSERT.filter((w) => txt.includes(w));
    const serif = /Serif|Myeongjo|Batang/i.test(rf.fontsInPdf) || rf.fonts.some((x) => /\bS\b|serif/i.test(x.family.replace(/sans-serif/g, "")));
    const over = rf.over.filter((x) => x.over > 0 || x.right > 2);
    const thin = rf.over.filter((x) => x.key !== "cover" && (x.fill < 45 || x.lower < 30));
    const small = rf.fonts.filter((x) => x.pt < 8.5 - 0.01);
    const josaBad: string[] = [];
    for (const m of txt.matchAll(/([가-힣])[’”]\s?(을|를|이|가|은|는|과|와)(?=[\s.,])/g)) {
      const jong = (m[1].charCodeAt(0) - 0xac00) % 28 !== 0;
      const want = { 을: true, 를: false, 이: true, 가: false, 은: true, 는: false, 과: true, 와: false }[m[2] as "을"];
      if (want !== jong) josaBad.push(m[0]);
    }
    for (const m of txt.matchAll(/을\(를\)|이\(가\)|은\(는\)|와\(과\)|까지 직접 결정까지/g)) josaBad.push(m[0]);
    const grammars = new Set(proto.map((p) => p.grammar));
    const sen = sentences(txt); const seen = new Map<string, number>(); for (const s of sen) seen.set(s, (seen.get(s) ?? 0) + 1);
    const rep = [...seen.entries()].filter(([, n]) => n > 1);
    const fail = forb.length || tmpl.length || asrt.length || serif || over.length || thin.length || small.length || josaBad.length || grammars.size < 6 || rf.pages !== all.length || rp.pages !== 6;
    if (fail) bad++;
    lint.push(`## ${TAG} (응시 ${ID} · ${e.kind} · 목표 ${e.goal.role})`, "", `| 검사 | 결과 |`, `|---|---|`,
      `| 쪽 수 (전체 · 시안) | ${all.length} = ${rf.pages} · 6 = ${rp.pages} ${rf.pages === all.length && rp.pages === 6 ? "PASS" : "FAIL"} |`,
      `| 시안 쪽 문법 수(6 이상) | ${grammars.size} — ${[...grammars].join(" · ")} ${grammars.size >= 6 ? "PASS" : "FAIL"} |`,
      `| 4쪽 문법 | ${case4[TAG]} |`,
      `| 명조 글꼴 쓰임(PDF 글꼴 목록 · 계산된 글꼴) | ${serif ? "FAIL" : "0 · PASS"} |`,
      `| 금지어(공시·재무·기업·지역 등 ${FORBIDDEN.length}) | ${forb.length ? "FAIL " + forb.join(", ") : "0 · PASS"} |`,
      `| 상투 문장(${TEMPLATE.length}) | ${tmpl.length ? "FAIL " + tmpl.join(", ") : "0 · PASS"} |`,
      `| 자기보고만으로 단정하는 말(${ASSERT.length}: 강점입니다 · 능력이 있습니다 · 강점 세 가지 …) | ${asrt.length ? "FAIL " + asrt.join(", ") : "0 · PASS"} |`,
      `| 넘침·잘림(줄여 맞추지 않음) | ${over.length ? "FAIL " + over.map((x) => `${x.key} ${x.over}/${x.right}px`).join(", ") : "0 · PASS"} |`,
      `| 낮은 밀도(덮는 세로 45% 아래 또는 아래 절반 30% 아래, 표지 제외) | ${thin.length ? "FAIL " + thin.map((x) => `${x.key} ${x.fill}%/${x.lower}%`).join(", ") : "0 · PASS"} · 가장 낮은 쪽 ${Math.min(...rf.over.filter((x) => x.key !== "cover").map((x) => x.fill))}% |`,
      `| 8.5pt 아래 글자 | ${small.length ? "FAIL " + small.slice(0, 4).map((x) => `${x.key}:${x.pt}pt ${x.text}`).join(" / ") : "0 · PASS"} · 가장 작은 ${Math.min(...rf.fonts.map((x) => x.pt))}pt |`,
      `| 조사 · 겹말 | ${josaBad.length ? "FAIL " + josaBad.slice(0, 6).join(" / ") : "0 · PASS"} |`,
      `| 문장 되풀이(한 결과지 안) | 되풀이 문장 ${rep.length}개${rep.length ? " — " + rep.map(([s, n]) => `×${n} ${s.slice(0, 50)}`).join(" / ") : ""} |`, "",
      `쪽 목록: ${all.map((p, i) => `${i + 1} ${p.title}(${p.grammar}) ${rf.over[i]?.fill ?? ""}%`).join(" · ")}`, "");
    console.log(`${TAG} ${e.kind} → 전체 ${all.length}쪽 · 시안 6 · 문법 ${grammars.size} · 4쪽 ${case4[TAG]} · 넘침 ${over.length} · 밀도 ${thin.length} · 작은 글자 ${small.length} · 단정 ${asrt.length} · 금지 ${forb.length} · 명조 ${serif ? 1 : 0} · 조사 ${josaBad.length}`);
    if (over.length || thin.length) console.log("   ", JSON.stringify([...over, ...thin]));
  }
  const distinct4 = new Set(Object.values(case4)).size === tags.length;
  if (!distinct4) bad++;
  lint.push(`## 4쪽이 사례마다 다른 문법인가`, "", `${tags.map((t) => `${t} ${case4[t]}`).join(" · ")} → ${distinct4 ? "PASS" : "FAIL"}`, "");
  if (protoDirs.length > 1) {
    const cmp = path.join(OUT, "COMPARE6"); rmSync(cmp, { recursive: true, force: true }); mkdirSync(cmp, { recursive: true });
    for (let n = 1; n <= 6; n++) {
      const f = protoDirs.map((d) => path.join(d, `p-${String(n).padStart(2, "0")}.png`)).filter(existsSync);
      execFileSync("montage", [...f, "-tile", `${f.length}x1`, "-geometry", "+14+14", "-background", "#d9dce1", "-pointsize", "26", "-title", `${n}쪽 · ${tags.join(" · ")}`, path.join(cmp, `p-${String(n).padStart(2, "0")}.png`)]);
    }
  }
  writeFileSync(path.join(OUT, "LINT_RESULTS.md"), [`# R5 리포트 검사 (${new Date().toISOString().slice(0, 10)})`, "", `걸린 항목 ${bad}`, "", "자동 검사는 디자인 PASS 가 아니다. 사람 검수는 `02_HUMAN_REVIEW.md`.", "", ...lint].join("\n"));
  await b.close();
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
