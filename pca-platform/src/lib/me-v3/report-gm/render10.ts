/**
 * **R5 긴 판(A안).** R5 결과지(`render9`)의 쪽과, v9 PRO 보고서(`render6`)의 **기업 · 공시 · 지역 기업을 뺀** 쪽을 한 권으로 묶는다.
 * 운영 PDF 경로와 연결하지 않는다.
 *
 * - v9 쪽의 **내용(굳은 결과 `Report3` 에서 읽는 글)** 은 그대로 쓰고, 겉모양은 R5 체계로 다시 입힌다:
 *   같은 머리 · 꼬리 · 범례 · 색 · 활자(Pretendard 한 벌 · 명조 없음) · 장 번호.
 * - 기업 쪽은 **자료 쪽에서** 뺀다: `Report3` 를 빈 기업 목록으로 만들어(`build3(..., EMPTY_ORGS)`) 기업 이름이 요약 · 계획 ·
 *   면접 재료에 끼어들지 않게 하고, 기업 · 지역 · 공시 쪽(설계 28 · 29 · 35~64 · 72 · 77 · 79)은 차례에서 뺀다.
 * - 두 체계의 CSS 가 같은 이름(`.pg` · `.bd`)을 쓰므로 한 문서에 섞지 않는다. 두 문서를 따로 인쇄한 뒤 이 순서로 쪽을 이어 붙인다
 *   (`scripts/lab/gm-r5long.ts`). 쪽 번호는 여기서 한 번에 매긴다.
 */
import type { Ed8 } from "./editorial8";
import { CSS9, type Fonts9, type Page9 } from "./render9";
import type { Report3 } from "./report3";
import { coverB, divider, dashboard, THEME_R5, THEME_V9 } from "./theme11";

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 설계 번호 가운데 이 판에 넣는 v9 쪽(기업 · 지역 · 공시 쪽은 넣지 않는다) */
export const KEEP9 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34,
  65, 66, 67, 68, 69, 70, 71, 73, 74, 75, 76, 78, 80];
/** 뺀 설계 번호와 까닭(문서에 그대로 적는다) */
export const DROP9: { ns: string; why: string }[] = [
  { ns: "28 · 29", why: "목표 직무 실무 가이드 ②③ — 사업보고서 · 재무제표를 읽는 쪽(공시 자료)" },
  { ns: "35~42", why: "지역 산업 · 기업 후보 — 지역 기업 · 공시 수치" },
  { ns: "43~54", why: "기업 ①~④ 심층 — 기업 자료(KODATA · 공시 · 검색 결과)" },
  { ns: "55~64", why: "기업별 지원 전략 — 기업 자료" },
  { ns: "72", why: "면접 질문 ③ 기업 장면에서 — 기업 자료" },
  { ns: "77 · 79", why: "기업 공식 자료 확인 기록지 · 기업 · 지역 출처" },
];

/** v9 쪽 제목을 R5 원칙(자기보고로 ‘강점’ 을 단정하지 않는다 · 영어 장 이름을 쓰지 않는다)에 맞게 바꾼다 */
export const RETITLE9: Record<number, string> = {
  3: "결과의 요점과 지금 할 일",
  14: "확인된 판단을 쓰는 곳",
};

export type Chap = { no: string; title: string };
const chapTitle = (no: string) => CHAPS.find((c) => c.no === no)?.title ?? "";
export const CHAPS: Chap[] = [
  { no: "01", title: "요약" }, { no: "02", title: "진단과 개인 역량" }, { no: "03", title: "근거" }, { no: "04", title: "직무" },
  { no: "05", title: "지원서 · 면접 · 포트폴리오" }, { no: "06", title: "실행 계획" }, { no: "07", title: "출처와 한계" },
];

/** 읽는 차례. `r5:키` 는 R5 쪽, 숫자는 v9 설계 번호 */
const ORDER: [string, (string | number)[]][] = [
  ["01", [3, 4, 5]],
  ["02", ["r5:diagnosis", 6, 7, 8, "r5:judgments", 9, 10, 11, 12, 13, 14, 15]],
  ["03", ["r5:case4", 16, 17, 18, 19, 20, 21, 22, 23, 24]],
  ["04", ["r5:jobs", 25, 26, 27, 30, 31, 32, 33, 34, "r5:flow"]],
  ["05", [65, 66, 67, 68, 69, "r5:apply", 70, 71, "r5:practice", 73]],
  ["06", [74, "r5:workbook", 75, "r5:templates", 76]],
  ["07", [78, 80, "r5:close"]],
];

export type LongPage = { i: number; src: "r5" | "v9"; key: string; n9?: number; chap: string; title: string; grammar: string; html: string;
  /** 한 쪽에 함께 놓은 v9 쪽(둘째부터). 각자 제목을 차례에 그대로 남긴다 */
  more?: { n9: number; title: string; html: string }[] };

/**
 * 한 권의 차례를 세운다. 없는 쪽(사례에 따라 v9 가 세우지 않은 쪽 · R5 가 세우지 않은 쪽)은 건너뛰고 다른 쪽으로 채우지 않는다.
 * 1쪽 표지 · 2쪽 차례는 R5 쪽이다.
 */
export function plan10(e: Ed8, r5: Page9[], v9: Map<number, { title: string; html: string }>): LongPage[] {
  const out: LongPage[] = [];
  const byKey = new Map(r5.map((p) => [p.key, p]));
  out.push({ i: 1, src: "r5", key: "cover", chap: "", title: "표지", grammar: "fullbleed", html: "" });
  out.push({ i: 2, src: "r5", key: "toc", chap: "", title: "차례", grammar: "toc", html: "" });
  for (const [chap, xs] of ORDER) {
    out.push({ i: 0, src: "r5", key: `div-${chap}`, chap, title: `${chap} ${chapTitle(chap)}`, grammar: "chapter", html: "" });
    if (chap === "01") out.push({ i: 0, src: "r5", key: "dash", chap, title: "대시보드 — 응답에서 센 수", grammar: "dashboard", html: "" });
    for (const x of xs) {
      if (typeof x === "string") {
        const p = byKey.get(x.slice(3));
        if (p) out.push({ i: 0, src: "r5", key: p.key, chap, title: p.title, grammar: p.grammar, html: p.html });
      } else {
        const p = v9.get(x);
        if (p) out.push({ i: 0, src: "v9", key: `v9-${x}`, n9: x, chap, title: RETITLE9[x] ?? p.title, grammar: `v9-${x}`, html: p.html });
      }
    }
  }
  out.forEach((p, k) => { p.i = k + 1; });
  return out;
}

/**
 * **반쪽이 빈 v9 쪽 둘을 한 쪽에.** 같은 장 안에서 이웃한 v9 쪽 둘이, 글이 닿는 높이를 더해 `limit`% 안이면 한 쪽에 놓는다.
 * 글은 한 줄도 덜어내지 않는다. 둘째 쪽은 여는 칸을 한 단 작게(작은 제목) 이어 붙이고, 차례에는 두 제목을 같은 쪽 번호로 적는다.
 * 합친 쪽이 그래도 넘치면(`undo`) 그 짝은 다시 가른다.
 */
export function merge10(plan: LongPage[], reach: Map<string, number>, limit = 92, undo = new Set<string>()): LongPage[] {
  const out: LongPage[] = [];
  for (const p of plan) {
    const prev = out[out.length - 1];
    const a = prev ? (reach.get(prev.key) ?? 100) + (prev.more ?? []).reduce((t, m) => t + (reach.get(`v9-${m.n9}`) ?? 100), 0) : 100;
    const b = reach.get(p.key) ?? 100;
    if (prev && prev.src === "v9" && p.src === "v9" && prev.chap === p.chap && !(prev.more?.length) && a + b <= limit && !undo.has(prev.key)) {
      prev.more = [{ n9: p.n9!, title: p.title, html: p.html }];
      continue;
    }
    out.push({ ...p, more: undefined });
  }
  out.forEach((p, k) => { p.i = k + 1; });
  return out;
}


/** R5 의 차례 쪽: 장마다 쪽 번호와 제목, 그리고 이 판에 넣지 않은 것 */
export function tocHtml(e: Ed8, plan: LongPage[]): string {
  const who = `${e.who.school} ${e.who.department}`;
  const chaps = CHAPS.map((c) => {
    const ps = plan.filter((p) => p.chap === c.no && !p.key.startsWith("div-"));
    if (!ps.length) return "";
    return `<div class="tc"><div class="tch"><b>${c.no}</b><span>${h(c.title)}</span><em>${ps[0].i}–${ps[ps.length - 1].i}</em></div>
      <ol>${ps.flatMap((p) => [p.title, ...(p.more ?? []).map((m) => m.title)].map((t) => `<li><span>${p.i}</span>${h(t)}</li>`)).join("")}</ol></div>`;
  }).join("");
  return `<div class="hd"><span><b>${h(who)}</b> · 진로·직무 리포트</span><span>차례 · 2</span></div>
<div class="bd"><div class="ey">차례 · 이 리포트를 읽는 순서</div><h1 class="h1">${plan.length}쪽 · ${CHAPS.filter((c) => plan.some((p) => p.chap === c.no)).length}장 · 꼭지 ${plan.reduce((t, p) => t + 1 + (p.more?.length ?? 0), 0)}</h1>
<p class="lead">응답에서 확인된 것 → 근거 → 직무 → 지원서와 면접 → 실행 계획 차례로 읽습니다. 어느 장이든 앞 장의 결론을 다시 묻지 않고 거기서 이어집니다.</p>
<div class="tcs">${chaps}</div>
<div class="tnote"><b>이 판에 넣지 않은 것</b> 회사별 자료를 읽는 쪽은 넣지 않았습니다. 자료의 학생 배포 권리와 원문 확인이 끝나기 전이라 학생에게 나가는 리포트에서 뺍니다.</div></div>
<div class="ft"><span class="lg"><span>● 응답</span><span>○ 학생이 적은 기록</span><span>◇ 직무 일반 안내</span><span>→ 이 리포트의 제안</span></span><span>CareerMatri</span></div>`;
}

const TOC_CSS = `
.tcs{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm 5mm;margin-top:5mm;align-items:start}
.tc{border-top:1.2pt solid var(--ink);padding-top:2mm;break-inside:avoid}
.tch{display:flex;gap:3mm;align-items:baseline;margin-bottom:1.4mm}.tch b{color:var(--acc);font-size:var(--t-h2);font-weight:800}
.tch span{font-size:var(--t-h2);font-weight:700;flex:1}.tch em{font-style:normal;color:var(--mute);font-size:var(--t-small)}
.tc ol{list-style:none;margin:0;padding:0}.tc li{display:flex;gap:2mm;font-size:8.6pt;line-height:1.38;padding:.35mm 0;border-bottom:.4pt solid var(--line2)}
.tc li span{width:6mm;flex:none;color:var(--mute);font-variant-numeric:tabular-nums}
.tnote{margin-top:auto;font-size:var(--t-small);color:var(--ink2);border-top:.6pt solid var(--line);padding-top:2.4mm;line-height:1.55}.tnote b{color:var(--ink);margin-right:2mm}
.pg .ey{font-size:var(--t-label);color:var(--acc);font-weight:600;margin-bottom:1.6mm}.pg .h1{font-size:var(--t-h1);font-weight:800;margin:0 0 2mm}
.pg .lead{font-size:var(--t-lead);line-height:1.6;color:var(--ink2);margin:0}
`;

/** R5 쪽만 담은 문서(표지 · 차례 · 장 표지 · 대시보드 포함). 쪽 번호는 긴 판의 것으로 적는다 */
export function r5Doc(e: Ed8, r: Report3, plan: LongPage[], f: Fonts9): string {
  const ps = plan.filter((p) => p.src === "r5").map((p) => {
    if (p.key === "toc") return `<section class="pg" data-key="toc" data-grammar="toc" data-i="${p.i}">${tocHtml(e, plan)}</section>`;
    if (p.key === "cover") return `<section class="pg full" data-key="cover" data-grammar="fullbleed" data-i="${p.i}">${coverB(e)}</section>`;
    if (p.key.startsWith("div-")) {
      const items = plan.filter((x) => x.chap === p.chap && !x.key.startsWith("div-")).flatMap((x) => [x.title, ...(x.more ?? []).map((m) => m.title)].map((t) => ({ i: x.i, title: t })));
      return `<section class="pg full" data-key="${p.key}" data-grammar="chapter" data-i="${p.i}">${divider(p.chap, items)}</section>`;
    }
    if (p.key === "dash") return `<section class="pg" data-key="dash" data-grammar="dashboard" data-i="${p.i}">${dashboard(e, r, p.i)}</section>`;
    return `<section class="pg" data-key="${p.key}" data-grammar="${p.grammar}" data-i="${p.i}">${p.html.replace('<span class="pn"></span>', String(p.i))}</section>`;
  });
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri 진로·직무 리포트</title><style>${CSS9(f)}${TOC_CSS}${THEME_R5}</style></head><body>${ps.join("\n")}</body></html>`;
}

/**
 * v9 쪽을 R5 겉모양으로 다시 입힌다. 머리와 꼬리를 R5 의 것으로 바꾸고, 여는 칸의 장 이름을 새 장으로, 제목을 고친 이름으로 적는다.
 * v9 의 색 이름(`--navy` · `--blue` …)은 그대로 두고 값만 R5 팔레트로 바꾼다 — 그래야 v9 의 칸 구조를 건드리지 않는다.
 */
export function v9Doc(e: Ed8, plan: LongPage[], v9css: string, f: { href: string }): string {
  const who = `${e.who.school} ${e.who.department}`;
  const kick = (p: LongPage, x: string) => x.replace(/<div class="kick">[\s\S]*?<\/div>/, `<div class="kick"><span>${p.chap} ${h(chapTitle(p.chap))}</span></div>`);
  const retitle = (n9: number, x: string) => RETITLE9[n9] ? x.replace(/(<div class="op">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/, `$1${h(RETITLE9[n9])}$2`) : x;
  const inner = (x: string) => /<div class="bd">([\s\S]*)<\/div>\s*<footer class="rf">/.exec(x)?.[1] ?? "";
  const ps = plan.filter((p) => p.src === "v9").map((p) => {
    let x = subst9(p.html);
    if (p.more?.length) {
      const add = p.more.map((m) => `<div class="mg">${retitle(m.n9, kick(p, inner(subst9(m.html)))).replace('<div class="op">', '<div class="op op2">')}</div>`).join("");
      x = x.replace(/(<div class="bd">[\s\S]*)(<\/div>\s*<footer class="rf">)/, `$1${add}$2`);
    }
    x = x.replace(/<header class="rh">[\s\S]*?<\/header>/, `<header class="rh"><span><b>${h(who)}</b> · 진로·직무 리포트</span><span>${h(p.title)} · ${p.i}</span></header>`);
    x = x.replace(/<footer class="rf">[\s\S]*?<\/footer>/, `<footer class="rf"><span class="lg"><span>● 응답</span><span>○ 학생이 적은 기록</span><span>◇ 직무 일반 안내</span><span>→ 이 리포트의 제안</span></span><span>CareerMatri</span></footer>`);
    x = retitle(p.n9!, kick(p, x));
    x = x.replace(/<section class="pg"/, `<section class="pg" data-key="${p.key}" data-grammar="${p.grammar}" data-i="${p.i}"`);
    return x;
  });
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri 진로·직무 리포트</title><style>${v9css}${SKIN(f)}${THEME_V9}</style></head><body>${ps.join("\n")}</body></html>`;
}

/**
 * v9 쪽의 글 가운데 R5 원칙에 걸리는 말만 바꾼다(뜻은 그대로). 공시 · DART · 사업보고서를 읽으라는 안내는 공개 통계 · IR 자료로,
 * ‘적합도 · 합격 가능성을 계산하지 않았다’ 는 부정문도 그 낱말을 쓰지 않고 같은 말을 한다(R5 결과지가 쓰는 말과 같다).
 * 바꿀 말이 v9 글에 실제로 있는지는 검사(`gm-r5long.ts`)가 금지어로 다시 센다.
 */
export const SUBST9: [RegExp, string][] = [
  [/합격 가능성이나 적합도를 계산한 것이 아닙니다/g, "점수를 매기거나 채용 결과를 예측한 것이 아닙니다"],
  [/직무 적합도나 합격 가능성을 계산한 것이 아닙니다/g, "점수를 매기거나 채용 결과를 예측한 것이 아닙니다"],
  [/직무 적합도나 합격 가능성을 계산하지 않습니다/g, "점수를 매기거나 채용 결과를 예측하지 않습니다"],
  [/점수와 적합도를 계산하지 않았습니다/g, "점수를 계산하지 않았습니다"],
  [/적합도/g, "점수"],
  [/합격 가능성/g, "채용 결과"],
  [/공시·통계 자료 찾는 법\(DART·KOSIS\)/g, "공개 통계 자료 찾는 법(KOSIS)"],
  [/IR·공시 지원/g, "IR 지원"],
  [/관심 기업 한 곳의 사업보고서를/g, "관심 산업의 공개 자료(IR 자료 · 산업 통계)를"],
  [/사업보고서·IR 자료/g, "공개된 IR 자료 · 산업 통계"],
  [/사업보고서/g, "공개된 회사 소개 자료"],
  [/전자공시|공시/g, "공개 자료"],
  [/OpenDART|DART/g, "공개 자료"],
  [/지역 기업 연계 현장실습/g, "학교 연계 현장실습"],
  [/이 보고서는/g, "이 리포트는"],
  [/가장 분명한 강점/g, "가장 분명하게 확인된 판단"],
  [/검사 응답 강점은/g, "여기 적은 판단은"],
  [/강점은 다른 학생과/g, "여기 적은 판단은 다른 학생과"],
  [/강점 활용 전략/g, "확인된 판단을 쓰는 곳"],
  [/강점 활용/g, "확인된 판단 쓰기"],
  [/쪽의 강점을 앞세우는/g, "쪽의 경험을 앞세우는"],
  [/지역 기업/g, "지역 일터"],
];
const subst9 = (html: string) => html.replace(/>([^<]+)</g, (_m, t: string) => `>${SUBST9.reduce((a, [re, to]) => a.replace(re, to), t)}<`);

/** v9 위에 R5 를 입히는 층: 팔레트 · 머리 · 꼬리 · 여는 칸 · 활자 크기의 역할을 R5 와 맞춘다 */
const SKIN = (f: { href: string }) => `
@font-face{font-family:"Pretendard";font-weight:800;src:url("${f.href}/Pretendard-ExtraBold.otf")}
:root{--navy:#14171d;--ink:#14171d;--muted:#69707b;--rule:#d5d9df;--tint:#f3f4f6;--blue:#2f4a7a;--sky:#e7ecf4;--amber:#d9582b;--amber-t:#fbe8df;--teal:#2f4a7a}
body{color:#14171d}
.pg{padding:0 16mm}
.rh{top:13mm;left:16mm;right:16mm;font-size:8.5pt;color:#69707b;border-bottom:.6pt solid #d5d9df;padding-bottom:2.2mm}
.rh b{color:#14171d;font-weight:600}
.rf{bottom:11mm;left:16mm;right:16mm;font-size:8.5pt;color:#69707b;border-top:.6pt solid #e9ecef;padding-top:2.2mm}
.rf .lg span{margin-right:3.4mm}
.bd{top:22mm;bottom:18mm;left:16mm;right:16mm}
.op{border-bottom:.8pt solid #14171d;padding-bottom:2.4mm;margin-bottom:3.6mm}
.kick{font-size:8.9pt;letter-spacing:0;color:#d9582b;font-weight:600}
.kick .no{display:none}
.op h1{font-size:19pt;font-weight:800;letter-spacing:0;margin:1.4mm 0 1.6mm;color:#14171d}
.dek{font-size:11pt;line-height:1.55;color:#3a404a}
.eyebrow{color:#14171d;border-top:.6pt solid #14171d;font-size:9.2pt}
h1,h2,h3,h4{color:#14171d}
.x-map td b.z-Z1{background:#111620}
.x-qa li>span{background:#111620}
.x-miss{border-color:#d9582b;background:#fbe8df}.x-miss b,.x-miss li span{color:#a8401c}
.x-slot{border-bottom-color:#d9582b;color:#a8401c}
.rd-l{font-size:11.4px}
.mg{margin-top:6mm}
.op2{border-top:1.2pt solid #14171d;border-bottom:.6pt solid #d5d9df;padding-top:2.2mm}.op2 .kick{display:none}.op2 h1{font-size:14pt;margin:0 0 1mm}.op2 .dek{font-size:10pt}
`;
