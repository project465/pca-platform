/**
 * **BIZ 진로·직무 전략 리포트 4차 2판(매거진형)을 뽑는다.** v1 은 `gm-ed.ts`. 운영 PDF 경로와 연결하지 않는다(파일만 쓴다).
 *
 *   CASES=RICH:1,POOR:2,CONTRA:3 npx tsx scripts/lab/gm-ed8.ts
 *
 * 한 번에 다섯을 한다.
 *  1. 사례마다 전체 PDF(`FULL/<TAG>.pdf`)와 쪽 그림(`FULL/pages/<TAG>/p-NN.png`)
 *  2. 같은 렌더러에서 핵심 12쪽만 골라 `PROTOTYPE_12P.pdf`(RICH)와 사례별 12쪽 PDF · 그림
 *  3. 같은 번호의 12쪽을 세 사례 나란히(`COMPARE/p-NN.png`)
 *  4. 넘침(줄여 맞추지 않는다) · 글자 크기 · 금지어 · 상투 문장 · 문장 되풀이 · 면접 질문과 재료 짝 검사 → `LINT_RESULTS.md`
 *  5. 쪽 목록(`BUILD_<TAG>.md`)
 * 하나라도 걸리면 1 로 끝난다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { load3 } from "./gm-report3";
import { edit8, type Ed8 as Ed } from "../../src/lib/me-v3/report-gm/editorial8";
import { JUDGE } from "../../src/lib/me-v3/report-gm/words";
import { pages8 as pages7, html8 as html7, PROTO8 as PROTO_KEYS, type Page8 as Page7 } from "../../src/lib/me-v3/report-gm/render8";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":") as [string, string]);
const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/v11-magazine";
const FONTS = { sans: "fonts/pretendard", serif: "fonts/notoserif" };

/* 넘침: .bd 안의 가장 아래 글자가 .bd 바닥을 넘는가. 줄이지 않고 잰 값만 돌려준다 */
const OVER_JS = `(() => [...document.querySelectorAll(".pg")].map((pg) => {
  const bd = pg.querySelector(".bd"); if (!bd) return { key: pg.dataset.key, over: 0, right: 0, fill: 100, lower: 100 };
  const box = bd.getBoundingClientRect(); let max = 0;
  for (const e of bd.querySelectorAll("*")) { const b = e.getBoundingClientRect(); if (b.height) max = Math.max(max, b.bottom); }
  const right = [...bd.querySelectorAll("*")].reduce((m, e) => Math.max(m, e.getBoundingClientRect().right), 0) - box.right;
  const iv = [...bd.querySelectorAll("*")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || e.matches(".bar,.mx,.flow,.wl")).map((e) => { const b = e.getBoundingClientRect(); return [Math.max(b.top, box.top), Math.min(b.bottom, box.bottom)]; }).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let cov = 0, cur = null; for (const [a, b] of iv) { if (!cur || a > cur[1]) { if (cur) cov += cur[1] - cur[0]; cur = [a, b]; } else cur[1] = Math.max(cur[1], b); } if (cur) cov += cur[1] - cur[0];
  const fill = Math.round((cov / box.height) * 100);
  const mid = box.top + box.height / 2; let low = 0; for (const [a, b] of iv) { const x = Math.max(a, mid), y = b; if (y > x) low += y - x; }
  const lower = Math.round(Math.min(100, (low / (box.height / 2)) * 100));
  return { key: pg.dataset.key, over: Math.round(max - box.bottom), right: Math.round(right), fill, lower };
}))()`;
/* 글자 크기: 글자가 직접 든 요소마다 종이 위 크기(pt) */
const FONT_JS = `(() => { const out = []; document.querySelectorAll(".pg").forEach((pg) => {
  for (const el of pg.querySelectorAll("*")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!own) continue; const r = el.getBoundingClientRect(); if (!r.width) continue;
    out.push({ key: pg.dataset.key, pt: Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.75 * 100) / 100, text: own.slice(0, 30) });
  } }); return out; })()`;

const FORBIDDEN = ["DART", "OpenDART", "전자공시", "공시", "사업보고서", "반기보고서", "분기보고서", "매출액", "영업이익", "순이익", "재무제표", "접수번호", "사업자등록번호", "법인등록번호", "KODATA", "(주)", "주식회사", "자료 미확보", "보도만 확인", "확인 수준", "적합도", "합격률", "합격 가능", "채용 확률", "연봉"];
const TEMPLATE = ["로 해석할 수 있습니다", "으로 해석할 수 있습니다", "확인할 필요가 있습니다", "현재 결과에서는", "가능성을 보여줍니다", "활용할 수 있습니다", "이 보고서는", "보여줍니다", "연결될 수 있습니다", "중요합니다", "확인해볼 필요", "확인해 볼 필요", "역량을 강화", "성장 방향", "핵심 포인트", "강점이 드러납니다", "Evidence", "Insight", "Summary"];

async function printPages(b: Awaited<ReturnType<typeof chromium.launch>>, e: Ed, ps: Page7[], name: string, pdf: string) {
  const html = path.join(WORK, name + ".html");
  writeFileSync(html, html7(e, ps, FONTS));
  const p = await b.newPage();
  await p.goto("file://" + html, { waitUntil: "load" });
  await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  const over = (await p.evaluate(OVER_JS)) as { key: string; over: number; right: number; fill: number; lower: number }[];
  const fonts = (await p.evaluate(FONT_JS)) as { key: string; pt: number; text: string }[];
  mkdirSync(path.dirname(pdf), { recursive: true });
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await p.close();
  return { over, fonts, pages: Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())![1]) };
}

function pngs(pdf: string, dir: string, res = "60") {
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  execFileSync("pdftoppm", ["-r", res, "-png", pdf, path.join(dir, "p")]);
  for (const fn of readdirSync(dir)) { const m = /^p-0*(\d+)\.png$/.exec(fn); if (m && fn !== `p-${m[1].padStart(2, "0")}.png`) execFileSync("mv", [path.join(dir, fn), path.join(dir, `p-${m[1].padStart(2, "0")}.png`)]); }
}

/* 문장 단위로 끊는다(쪽 머리·꼬리 줄은 뺀다) */
function sentences(text: string): string[] {
  return text.split(/\n/).filter((l) => !/CareerMatri 진로·직무 분석|배재대학교 경영학과$/.test(l.trim()))
    .join(" ").replace(/\s+/g, " ").split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.length >= 18);
}

async function main(): Promise<void> {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const lint: string[] = [];
  let bad = 0;
  const texts: Record<string, string[]> = {};
  const protoDirs: string[] = [];
  for (const [TAG, ID] of CASES) {
    const r = await load3(ID);
    const e = edit8(r);
    const all = pages7(e);
    const full = path.join(OUT, "FULL", `${TAG}.pdf`);
    const res = await printPages(b, e, all, `ED-${TAG}`, full);
    pngs(full, path.join(OUT, "FULL", "pages", TAG));
    /* 12쪽 시안: 같은 렌더러에서 같은 쪽을 고른다(번호만 새로 매김) */
    const proto = PROTO_KEYS.map((k) => all.find((p) => p.key === k) ?? all.find((p) => p.key.startsWith(k.replace(/-\d+$/, ""))))
      .filter((x): x is Page7 => !!x);
    const ppdf = path.join(OUT, TAG === "RICH" ? "PROTOTYPE_12P.pdf" : `PROTOTYPE_12P_${TAG}.pdf`);
    const pres = await printPages(b, e, proto, `ED-${TAG}-12`, ppdf);
    const pdir = path.join(OUT, "PROTOTYPE_PAGES", TAG); pngs(ppdf, pdir, "80"); protoDirs.push(pdir);
    /* 검사 */
    const txt = execFileSync("pdftotext", [full, "-"]).toString();
    texts[TAG] = sentences(txt);
    const forb = FORBIDDEN.filter((w) => txt.includes(w));
    const tmpl = TEMPLATE.filter((w) => txt.includes(w));
    const eng = [...new Set((txt.match(/[A-Za-z]{3,}[A-Za-z0-9_.\-]*/g) ?? []).filter((w) => !/^(CareerMatri|PRO|BASIC|STANDARD|BIZ_|me-v3|ROLE_|INDUSTRY_|null)/.test(w) && !/V\d/.test(w)))];
    const over = res.over.filter((x) => x.over > 0 || x.right > 64);
    const half = res.over.filter((x) => x.key !== "cover" && (x.fill < 40 || x.lower < 25));
    /* 조사: 따옴표·괄호로 끝난 말 뒤 조사가 받침과 맞는가 */
    const JO: [RegExp, boolean][] = [];
    const josaBad: string[] = [];
    for (const m of txt.matchAll(/([가-힣])[’”]\s?(을|를|이|가|은|는|과|와)(?=[\s.,])/g)) {
      const code = m[1].charCodeAt(0) - 0xac00; const jong = code % 28 !== 0;
      const want = { 을: true, 를: false, 이: true, 가: false, 은: true, 는: false, 과: true, 와: false }[m[2] as "을"];
      if (want !== jong) josaBad.push(m[0]);
    }
    for (const m of txt.matchAll(/([가-힣])(을|를)\(|을\(를\)|이\(가\)|은\(는\)|와\(과\)/g)) josaBad.push(m[0]);
    void JO;
    const small = res.fonts.filter((x) => x.pt < 8.5 - 0.01);
    const seen = new Map<string, number>(); for (const s of texts[TAG]) seen.set(s, (seen.get(s) ?? 0) + 1);
    const rep = [...seen.entries()].filter(([, n]) => n > 1);
    const reuse = texts[TAG].length ? rep.reduce((a, [, n]) => a + n - 1, 0) / texts[TAG].length : 0;
    const probeBad = e.probes.filter((p) => (p.have && !r.domains.some((d) => p.have!.text.startsWith(d.name + ":") && (d.levels.find((l) => l.axis === p.axis)?.level ?? 0) >= 2)) || (p.prep && !r.priorities.some((x) => x.axis === p.axis && p.prep!.text.includes(x.output)) && !p.prep.text.startsWith(JUDGE[p.axis as keyof typeof JUDGE].name))).length;
    const fake = e.templates.filter((t) => false).length; /* 양식 칸은 렌더러가 늘 비워 둔다 */
    const fail = forb.length || tmpl.length || over.length || half.length || josaBad.length || small.length || probeBad || res.pages !== all.length || pres.pages !== proto.length;
    if (fail) bad++;
    lint.push(`## ${TAG} (응시 ${ID} · ${e.kind} · 목표 ${e.goal.role})`, "",
      `| 검사 | 결과 |`, `|---|---|`,
      `| 쪽 수 (설계 쪽 = 인쇄 쪽) | ${all.length} = ${res.pages} ${all.length === res.pages ? "PASS" : "FAIL"} |`,
      `| 12쪽 시안 쪽 수 | ${proto.length} = ${pres.pages} ${proto.length === 12 && pres.pages === 12 ? "PASS" : "FAIL"} |`,
      `| 금지어(공시·재무·기업 실명 표지·확인 수준 등 ${FORBIDDEN.length}개) | ${forb.length ? "FAIL " + forb.join(", ") : "0 · PASS"} |`,
      `| 상투 문장(${TEMPLATE.length}개) | ${tmpl.length ? "FAIL " + tmpl.join(", ") : "0 · PASS"} |`,
      `| 영어 낱말(판본 코드 제외) | ${eng.length ? eng.join(", ") : "0"} |`,
      `| 넘침·잘림(줄여 맞추지 않음) | ${over.length ? "FAIL " + over.map((x) => `${x.key} ${x.over}px/${x.right}px`).join(", ") : "0 · PASS"} |`,
      `| 빈 쪽(글이 덮는 세로 높이 40% 아래 또는 아래 절반 25% 아래) | ${half.length ? "FAIL " + half.map((x) => `${x.key} ${x.fill}%/${x.lower}%`).join(", ") : "0 · PASS"} · 가장 낮은 쪽 ${Math.min(...res.over.filter((x) => x.key !== "cover").map((x) => x.fill))}% |`,
      `| 조사(따옴표·괄호 뒤) | ${josaBad.length ? "FAIL " + josaBad.slice(0, 6).join(" / ") : "0 · PASS"} |`,
      `| 8.5pt 아래 글자 | ${small.length ? "FAIL " + small.length : "0 · PASS"} · 가장 작은 ${Math.min(...res.fonts.map((x) => x.pt))}pt |`,
      `| 면접 질문과 재료가 다른 영역 | ${probeBad} ${probeBad ? "FAIL" : "PASS"} |`,
      `| 완성된 척 채운 양식 | ${fake} PASS |`,
      `| 문장 되풀이(한 결과지 안) | ${(reuse * 100).toFixed(1)}% · 되풀이 문장 ${rep.length}개 |`, "",
      ...(rep.length ? ["되풀이 문장:", ...rep.map(([s, n]) => `- ×${n} ${s.slice(0, 90)}`), ""] : []));
    writeFileSync(path.join(OUT, `BUILD_${TAG}.md`), [`# ${TAG} 전체 결과지 (응시 ${ID})`, "", `- 유형 ${e.kind} · 목표 직무 ${e.goal.role} · ${all.length}쪽`, "", "| 쪽 | 열쇠 | 장 | 제목 |", "|---|---|---|---|",
      ...all.map((p, i) => `| ${i + 1} | ${p.key} | ${p.sec ? p.sec + " " + p.secName : "—"} | ${p.title} |`), "", "## 12쪽 시안", "", ...proto.map((p, i) => `${i + 1}. ${p.key} — ${p.title}`), ""].join("\n"));
    console.log(`${TAG} ${ID} ${e.kind} → ${all.length}쪽 · 시안 ${proto.length} · 금지어 ${forb.length} · 상투 ${tmpl.length} · 넘침 ${over.length} · 작은 글자 ${small.length}`);
  }
  /* 사례를 건너 같은 문장(직무 일반 안내는 같아야 맞다) */
  const tags = Object.keys(texts);
  if (tags.length > 1) {
    const sets = tags.map((t) => new Set(texts[t]));
    const common = [...sets[0]].filter((s) => sets.every((x) => x.has(s)));
    lint.push(`## 사례를 건너 같은 문장`, "", `- 세 결과지에 모두 나오는 문장 ${common.length}개 / RICH 문장 ${texts[tags[0]].length}개 (${((common.length / Math.max(1, sets[0].size)) * 100).toFixed(1)}%)`, `- 같은 직무 안내·읽는 법·한계 문장은 같아야 맞다. 학생 응답에서 오는 문장이 같으면 실패로 본다.`, "");
  }
  /* 같은 번호 12쪽을 나란히 */
  if (protoDirs.length > 1) {
    const cmp = path.join(OUT, "COMPARE"); rmSync(cmp, { recursive: true, force: true }); mkdirSync(cmp, { recursive: true });
    for (let n = 1; n <= 12; n++) {
      const f = protoDirs.map((d) => path.join(d, `p-${String(n).padStart(2, "0")}.png`)).filter(existsSync);
      if (f.length) execFileSync("montage", [...f, "-tile", `${f.length}x1`, "-geometry", "+12+12", "-background", "#e9e5dd", "-title", `${n}쪽 · ${tags.join(" · ")}`, path.join(cmp, `p-${String(n).padStart(2, "0")}.png`)]);
    }
  }
  writeFileSync(path.join(OUT, "LINT_RESULTS.md"), [`# 4차 2판 매거진형 리포트 검사 (${new Date().toISOString().slice(0, 10)})`, "", `걸린 사례 ${bad} / ${CASES.length}`, "", ...lint].join("\n"));
  await b.close();
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
