/**
 * **BIZ 진로·직무 리포트 R5 렌더러.** v11(매거진판)의 큰 명조 제목과 `번호 · 제목 · 세 줄` 을 되풀이하던 쪽 꼴을 버리고,
 * 12단 격자 위에 **쪽마다 다른 쪽 문법**을 세운다:
 *
 *   표지(풀블리드 + 열두 영역 띠) · 진단(관심×확인 매트릭스) · 직무 비교(줄 맞춘 비교표) ·
 *   사례별 4쪽(RICH 근거→쓰는 곳 흐름 / POOR 빈칸→4주 실습 / CONTRA 어긋남→가리는 질문) ·
 *   판단 여덟(점 그림) · 직무 한 주기(과정 흐름) · 경험 타임라인 · 90일 작업판 · 결과물 양식 · 지원서·면접 작업지 · 정리
 *
 * 내용은 `edit8()` 의 쪽 모델에서만 온다. 새 판단을 만들지 않는다. 다만 문장은 이 층이 다시 쓴다:
 * **자기보고 응답만으로 ‘강점입니다 · 능력이 있습니다’ 를 쓰지 않는다**(“기준을 직접 정했다고 응답했습니다. 실제 결과물의 품질은 확인하지 않았습니다.”).
 *
 * 글꼴은 Pretendard 하나(OFL) — 제목은 굵기와 자간으로 가른다. 명조를 쓰지 않는다. 8.5pt 아래 글자 없음. 줄여 맞추지 않는다.
 * 근거의 층은 배지 대신 작은 표시 넷(● 응답 · ○ 자기 기록 · ◇ 직무 일반 · → 제안)과 쪽 아래 범례 한 줄로 가른다.
 */
import { withJosa } from "../result/josa";
import { STEP, UNASKED, JUDGE } from "./words";
import { formal, ANSWER, type Ed8 } from "./editorial8";
import { ASKQ } from "./editorial";
import type { Line, Src, DnaDomain } from "./editorial";

export type Fonts9 = { sans: string };
export type Page9 = { key: string; grammar: string; title: string; html: string };

/** 6쪽 시안: 표지 · 진단 · 직무 비교 · 사례별 4쪽 · 90일 작업판 · 지원서·면접 작업지 */
export const PROTO9 = ["cover", "diagnosis", "jobs", "case4", "workbook", "apply"] as const;

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MARK: Record<Src, string> = { "응답 확인": "●", "학생 자기기록": "○", "일반 직무 안내": "◇", "분석 제안": "→" };
const mk = (s: Src) => `<span class="mk" title="${h(s)}">${MARK[s]}</span>`;
const and = (a: string[]) => (a.length <= 1 ? a.join("") : a.length === 2 ? `${withJosa(a[0], "과와")} ${a[1]}` : `${a.slice(0, -1).join(", ")}, ${a[a.length - 1]}`);
/** 응답을 그대로 적는 말. 단정하지 않는다 */
const SAID: Record<number, string> = {
  0: "해 본 적이 없다고 응답했습니다",
  1: "정해진 조건 안에서 해 봤다고 응답했습니다",
  2: "스스로 맡아 해 봤다고 응답했습니다",
  3: "기준까지 직접 정했다고 응답했습니다",
};
const said = (n: number | null) => (n === null ? "이번 검사에서 묻지 않았습니다" : SAID[n]);
const CAVEAT = "실제 결과물의 품질과 수치는 확인하지 않았습니다.";
const tag = (n: number | null) => (n === null ? UNASKED : STEP[n as 0 | 1 | 2 | 3].tag);
const strip = (s: string) => s.replace(/^[^:]+:\s*/, "");
/** 다른 쪽을 가리키는 말을 이 쪽 안에서 끝나게 */
const selfRef = (s: string) => s.replace("기록과 응답이 다르므로 아래 확인 방법을 참고하세요.", "응답과 기록이 이 지점에서 갈립니다.");
/** ‘~했다’ 문장을 따옴표 안에 그대로 둔다 */
const quote = (s: string) => `‘${s}’`;

/* 네 칸 단계 막대(0~3 · 묻지 않음은 빗금) */
function steps4(n: number | null): string {
  if (n === null) return `<span class="st4 un" aria-label="${UNASKED}"><i></i><i></i><i></i><i></i></span>`;
  return `<span class="st4" aria-label="${h(tag(n))}">${[0, 1, 2, 3].map((i) => `<i class="${i <= n ? (n === 3 && i === 3 ? "on top" : "on") : ""}"></i>`).join("")}</span>`;
}
/* 관심 세 칸 */
function int3(v: "HIGH" | "MID" | "LOW"): string {
  const n = v === "HIGH" ? 3 : v === "MID" ? 2 : 1;
  return `<span class="i3">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
}
const INT_KO = { HIGH: "관심 높음", MID: "관심 보통", LOW: "관심 낮음" } as const;

const CSS = (f: Fonts9) => `
@font-face{font-family:P;src:url("${f.sans}/Pretendard-Regular.otf");font-weight:400}
@font-face{font-family:P;src:url("${f.sans}/Pretendard-Medium.otf");font-weight:500}
@font-face{font-family:P;src:url("${f.sans}/Pretendard-SemiBold.otf");font-weight:600}
@font-face{font-family:P;src:url("${f.sans}/Pretendard-Bold.otf");font-weight:700}
@font-face{font-family:P;src:url("${f.sans}/Pretendard-ExtraBold.otf");font-weight:800}
:root{
  --ink:#14171d;--ink2:#3a404a;--mute:#69707b;--line:#d5d9df;--line2:#e9ecef;--tint:#f3f4f6;--paper:#ffffff;
  --dark:#111620;--dark2:#1d2431;--onDark:#eef0f3;--onDark2:#a9b0bb;--acc:#d9582b;--accT:#fbe8df;--blue:#2f4a7a;--blueT:#e7ecf4;
  --t-display:28pt;--t-h1:19pt;--t-h2:12.5pt;--t-lead:11.5pt;--t-body:10pt;--t-small:9.2pt;--t-label:8.5pt;--t-num:24pt;
}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:var(--ink);font-family:P,sans-serif;font-variant-numeric:tabular-nums;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;padding:13mm 16mm 11mm;background:var(--paper);display:flex;flex-direction:column;page-break-after:always;overflow:hidden;position:relative;word-break:keep-all;overflow-wrap:break-word}
.pg:last-child{page-break-after:auto}
.hd{display:flex;justify-content:space-between;align-items:baseline;font-size:var(--t-label);color:var(--mute);padding-bottom:2.2mm;border-bottom:.6pt solid var(--line);margin-bottom:7mm}
.hd b{color:var(--ink);font-weight:600}
.ft{display:flex;justify-content:space-between;align-items:baseline;font-size:var(--t-label);color:var(--mute);padding-top:2.2mm;border-top:.6pt solid var(--line2);margin-top:5mm}
.ft .lg span{margin-right:3.4mm}
.bd{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}
.g12{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm}
.s2{grid-column:span 2}.s3{grid-column:span 3}.s4{grid-column:span 4}.s5{grid-column:span 5}.s6{grid-column:span 6}.s7{grid-column:span 7}.s8{grid-column:span 8}.s9{grid-column:span 9}.s12{grid-column:span 12}
.eye{font-size:var(--t-label);font-weight:600;color:var(--acc);letter-spacing:.02em;margin:0 0 2mm}
h1{font-size:var(--t-h1);line-height:1.32;font-weight:800;letter-spacing:-.018em;margin:0 0 3mm;text-wrap:balance}
h2{font-size:var(--t-h2);line-height:1.4;font-weight:700;letter-spacing:-.01em;margin:0 0 2mm}
.lead{font-size:var(--t-lead);line-height:1.62;font-weight:500;color:var(--ink2);margin:0 0 6mm;max-width:150mm}
p{margin:0 0 2mm;font-size:var(--t-body);line-height:1.62}
.sm{font-size:var(--t-small);line-height:1.58;color:var(--ink2)}
.lab{font-size:var(--t-label);font-weight:600;color:var(--mute);margin:0 0 1.6mm;letter-spacing:.02em}
.mk{display:inline-block;width:3.4mm;font-size:var(--t-label);color:var(--mute);font-weight:400}
.rule{border-top:.8pt solid var(--ink);padding-top:3mm}
.sp{flex:1 0 5mm}
ul.ln{list-style:none;margin:0;padding:0}
ul.ln li{font-size:var(--t-small);line-height:1.55;padding:1.5mm 0;border-bottom:.5pt solid var(--line2)}
.wl{height:7.2mm;border-bottom:.6pt dotted #9aa1ab}
.chk{display:inline-block;width:3.2mm;height:3.2mm;border:.7pt solid var(--ink2);margin-right:1.6mm;vertical-align:-.4mm}
/* 단계 막대 · 관심 */
.st4{display:inline-grid;grid-template-columns:repeat(4,4.2mm);gap:.8mm;vertical-align:middle}
.st4 i{display:block;height:2.6mm;background:var(--line2)}
.st4 i.on{background:var(--blue)}
.st4 i.top{background:var(--acc)}
.st4.un i{background:repeating-linear-gradient(135deg,var(--line) 0 .6mm,transparent .6mm 1.4mm)}
.i3{display:inline-grid;grid-template-columns:repeat(3,2.4mm);gap:.6mm;vertical-align:middle}
.i3 i{display:block;height:2.4mm;border-radius:50%;background:var(--line)}
.i3 i.on{background:var(--ink)}
/* ── 표지: 풀블리드 ── */
.cv{padding:0}
.cv .cvtop{background:var(--dark);color:var(--onDark);padding:15mm 16mm 12mm;min-height:150mm;display:flex;flex-direction:column}
.cv .meta{display:flex;justify-content:space-between;font-size:var(--t-label);color:var(--onDark2);border-bottom:.6pt solid #2d3644;padding-bottom:2.4mm}
.cv .kind{margin-top:30mm;font-size:var(--t-label);font-weight:600;color:var(--acc);letter-spacing:.04em}
.cv .disp{font-size:var(--t-display);line-height:1.28;font-weight:800;letter-spacing:-.025em;margin:3mm 0 6mm;max-width:160mm;text-wrap:balance}
.cv .q{font-size:var(--t-lead);line-height:1.6;color:var(--onDark2);max-width:140mm;margin:0}
.cv .q b{color:var(--onDark);font-weight:600}
.cv .low{padding:9mm 16mm 11mm;flex:1;display:flex;flex-direction:column}
.dm{display:grid;grid-template-columns:repeat(6,1fr);gap:4.2mm 2.4mm}
.dm .t{border-top:1.4pt solid var(--line);padding:2mm 0 0}
.dm .t.hot{border-top-color:var(--ink)}
.dm .t.ev{border-top-color:var(--acc)}
.dm .nm{font-size:9.2pt;font-weight:700;line-height:1.35;min-height:8.4mm}
.dm .dt{font-size:var(--t-label);color:var(--ink2);margin-top:1.2mm}
.dm .rw{display:flex;align-items:center;gap:1.4mm;font-size:var(--t-label);color:var(--mute);margin-top:1.2mm}
.cv .tk{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin-top:7mm;border-top:.8pt solid var(--ink);padding-top:4mm}
.toc{margin-top:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1.4mm 6mm;border-top:.6pt solid var(--line);padding-top:3mm}
.toc div{font-size:var(--t-small);display:flex;gap:2.4mm}
.toc b{color:var(--acc);font-weight:700;width:5mm}
.cv .tk .k{font-size:var(--t-label);color:var(--mute);margin-bottom:1.2mm}
.cv .tk .v{font-size:12pt;font-weight:700;line-height:1.4}
.cv .fn{font-size:var(--t-label);color:var(--mute);margin-top:4mm}
/* ── 진단 매트릭스 ── */
.mx{display:grid;grid-template-columns:1fr 1fr;gap:0}
.mx .ax{font-size:var(--t-label);color:var(--mute);font-weight:600}
.mx .ay{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-size:var(--t-label);color:var(--mute);font-weight:600}
.mx .q{border:.6pt solid var(--line);padding:3.6mm 4mm;min-height:60mm}
.mx .q.a{background:var(--accT);border-color:#f0c9b8}
.mx .q .qt{font-size:10.5pt;font-weight:700;margin-bottom:.6mm}
.mx .q .qs{font-size:var(--t-label);color:var(--mute);margin-bottom:2.4mm}
.mx .q ul{list-style:none;margin:0;padding:0}
.mx .q li{font-size:var(--t-small);line-height:1.5;padding:.7mm 0;display:flex;justify-content:space-between;gap:2mm}
.mx .q li em{font-style:normal;font-size:var(--t-label);color:var(--mute);white-space:nowrap}
.mx .q li.un{color:var(--mute)}
/* ── 직무 비교표 ── */
.jt{border-top:1pt solid var(--ink)}
.jt .r{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;border-bottom:.5pt solid var(--line2);padding:3.4mm 0}
.jt .r>:first-child{grid-column:span 2;font-size:var(--t-label);font-weight:600;color:var(--mute);padding-top:.6mm}
.jt .r>:nth-child(2),.jt .r>:nth-child(3){grid-column:span 5;font-size:var(--t-small);line-height:1.55}
.jt .hdr>:nth-child(2),.jt .hdr>:nth-child(3){font-size:15pt;font-weight:800;letter-spacing:-.015em;line-height:1.25}
.jt .hdr small{display:block;font-size:var(--t-label);font-weight:600;color:var(--acc);margin-top:1mm;letter-spacing:0}
.jt .lv{display:flex;align-items:center;gap:2mm}
.call{background:var(--dark);color:var(--onDark);padding:5mm 6mm;margin-top:5mm;display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm}
.call .c{grid-column:span 5;font-size:13pt;font-weight:800;line-height:1.38;letter-spacing:-.01em}
.call ul{grid-column:span 7;margin:0;padding:0;list-style:none}
.call li{font-size:var(--t-small);line-height:1.55;color:var(--onDark2);padding:.8mm 0}
/* ── 사례 4쪽: RICH 흐름 ── */
.fl .r{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;align-items:stretch;margin-bottom:3.4mm}
.fl .cell{border:.6pt solid var(--line);padding:3.4mm 3.6mm;position:relative;min-height:44mm}
.fl .cell.e{grid-column:span 4;border-left:2.2pt solid var(--blue)}
.fl .cell.g{grid-column:span 3;background:var(--tint);border-color:var(--tint)}
.fl .cell.u{grid-column:span 5;border-left:2.2pt solid var(--acc)}
.fl .cell.e::after,.fl .cell.g::after{content:"";position:absolute;right:-3.6mm;top:50%;width:3.2mm;border-top:.8pt solid var(--ink2)}
.fl .k{font-size:var(--t-label);font-weight:600;color:var(--mute);margin-bottom:1.2mm}
.fl .v{font-size:var(--t-small);line-height:1.55}
.fl .v b{font-weight:700}
.fl .hdr{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;margin-bottom:2mm}
.fl .hdr div{font-size:var(--t-label);font-weight:600;color:var(--ink)}
.chips{display:flex;flex-wrap:wrap;gap:2mm}
.chips span{font-size:var(--t-small);border:.6pt solid var(--line);padding:1.2mm 2.6mm}
/* POOR 빈칸 → 4주 */
.gp{display:grid;grid-template-columns:repeat(8,1fr);gap:2mm}
.gp .a{border-top:1.2pt solid var(--line);padding-top:1.8mm}
.gp .a.zero{border-top-color:var(--acc)}
.gp .n{font-size:var(--t-label);font-weight:600;line-height:1.35;min-height:8mm}
.gp .st{font-size:var(--t-label);color:var(--mute);margin-top:1mm;line-height:1.35}
.tl{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:2mm}
.tl::before{content:"";position:absolute;left:0;right:0;top:3.6mm;border-top:1pt solid var(--ink)}
.tl .w{position:relative;padding-top:8.4mm}
.tl .w::before{content:"";position:absolute;left:0;top:2.2mm;width:3mm;height:3mm;border-radius:50%;background:var(--paper);border:1.2pt solid var(--ink)}
.tl .w:last-child::before{background:var(--acc);border-color:var(--acc)}
.tl .wn{font-size:var(--t-label);font-weight:700;color:var(--acc);margin-bottom:1mm}
.tl .wt{font-size:var(--t-small);line-height:1.55;margin-bottom:2mm}
.tl .wo{font-size:var(--t-label);color:var(--ink2);border-top:.5pt solid var(--line2);padding-top:1.4mm}
.dl{background:var(--dark);color:var(--onDark);padding:5mm 6mm;display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;align-items:center}
.dl .k{grid-column:span 3;font-size:var(--t-label);color:var(--onDark2)}
.dl .v{grid-column:span 5;font-size:14pt;font-weight:800;letter-spacing:-.01em}
.dl .c{grid-column:span 4;font-size:var(--t-small);color:var(--onDark2);line-height:1.5}
/* CONTRA 어긋남 */
.cf{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;align-items:stretch}
.cf .side{grid-column:span 4;padding:4mm;border:.6pt solid var(--line)}
.cf .side.goal{border:1.4pt solid var(--acc)}
.cf .mid{grid-column:span 4;display:flex;flex-direction:column;justify-content:center;padding:0 1mm}
.cf .mid .br{border-top:1pt dashed var(--ink2);border-bottom:1pt dashed var(--ink2);padding:3mm 0}
.cf .ttl{font-size:13pt;font-weight:800;margin-bottom:2mm;letter-spacing:-.01em}
.cf ul{list-style:none;margin:0;padding:0}
.cf li{font-size:var(--t-small);line-height:1.5;padding:.9mm 0;display:flex;justify-content:space-between;gap:2mm;border-bottom:.5pt solid var(--line2)}
.cf li em{font-style:normal;font-size:var(--t-label);color:var(--mute);white-space:nowrap}
.vq{border-top:1pt solid var(--ink)}
.vq .r{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;padding:3mm 0;border-bottom:.5pt solid var(--line2);align-items:start}
.vq .no{grid-column:span 1;font-size:15pt;font-weight:800;color:var(--acc);line-height:1}
.vq .tx{grid-column:span 8}
.vq .tx b{display:block;font-size:11pt;font-weight:700;line-height:1.45;margin:1mm 0}
.vq .ys{grid-column:span 3;font-size:var(--t-small);display:flex;gap:3mm;padding-top:.6mm}
/* 판단 여덟: 점 그림 */
.dp{border-top:1pt solid var(--ink)}
.dp .r{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;align-items:center;border-bottom:.5pt solid var(--line2);padding:3.2mm 0}
.dp .nm{grid-column:span 4;font-size:10pt;font-weight:600}
.dp .nm .pl{display:block;font-size:var(--t-label);font-weight:400;color:var(--mute);line-height:1.4;margin-top:.6mm}
.dp .sc{grid-column:span 5;display:grid;grid-template-columns:repeat(4,1fr);position:relative;height:5mm}
.dp .sc::before{content:"";position:absolute;left:0;right:0;top:50%;border-top:.6pt solid var(--line)}
.dp .sc span{position:relative;display:flex;justify-content:center;align-items:center}
.dp .sc span i{width:2mm;height:2mm;border-radius:50%;background:var(--line);display:block}
.dp .sc span.on i{width:3.8mm;height:3.8mm;background:var(--blue)}
.dp .sc span.top i{background:var(--acc)}
.dp .wh{grid-column:span 3;font-size:var(--t-label);color:var(--mute);line-height:1.4}
.dp .ax{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;padding-top:1.6mm}
.dp .ax .k{grid-column:5 / span 5;display:grid;grid-template-columns:repeat(4,1fr);font-size:var(--t-label);color:var(--mute);text-align:center;line-height:1.3}
/* 과정 흐름 */
.pf{display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-top:1pt solid var(--ink)}
.pf .st{padding:3.4mm 3mm 3mm 0;border-right:.5pt solid var(--line2)}
.pf .st+.st{padding-left:3mm}
.pf .st:last-child{border-right:0}
.pf .ph{font-size:var(--t-label);font-weight:700;color:var(--acc);margin-bottom:1.6mm}
.pf .sc2{font-size:var(--t-small);line-height:1.6;margin-bottom:2.4mm;min-height:58mm}
.pf .io{font-size:var(--t-label);line-height:1.45;color:var(--ink2);border-top:.5pt solid var(--line2);padding-top:1.4mm;margin-top:1.4mm}
.pf .io b{display:block;color:var(--mute);font-weight:600}
/* 경험 타임라인 */
.et .r{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;border-top:1pt solid var(--ink);padding:4mm 0 6mm}
.et .rows div{min-height:24mm}
.et .when{grid-column:span 2;font-size:var(--t-label);color:var(--mute);line-height:1.45}
.et .when b{display:block;font-size:10pt;color:var(--ink);font-weight:700;margin-bottom:.6mm}
.et .main{grid-column:span 10}
.et .rows{display:grid;grid-template-columns:repeat(5,1fr);gap:2.4mm;margin-top:2.4mm}
.et .rows div{border-top:.6pt solid var(--line);padding-top:1.4mm;font-size:var(--t-small);line-height:1.45}
.et .rows div.empty{color:var(--mute);border-top-style:dashed}
.et .rows small{display:block;font-size:var(--t-label);color:var(--mute);font-weight:600;margin-bottom:.6mm}
/* 90일 작업판 */
.wb{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}
.wb::before{content:"";position:absolute;left:0;right:0;top:4.2mm;border-top:1pt solid var(--ink)}
.wb .m{position:relative;padding-top:9.4mm}
.wb .m::before{content:"";position:absolute;left:0;top:2.6mm;width:3.4mm;height:3.4mm;background:var(--ink)}
.wb .d{font-size:var(--t-label);font-weight:700;color:var(--acc);margin-bottom:1mm}
.wb .ti{font-size:11pt;font-weight:700;line-height:1.42;margin-bottom:1.6mm}
.wb .o{font-size:var(--t-small);border-top:.5pt solid var(--line2);padding-top:1.4mm;margin-top:1.6mm}
.wb .o b{font-weight:700}
.ws{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;border-top:1pt solid var(--ink);padding-top:3.4mm}
.ws .f{grid-column:span 12;display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;align-items:end}
.ws .f .k{grid-column:span 3;font-size:var(--t-small);font-weight:600;padding-bottom:1.4mm}
.ws .f .wl{grid-column:span 9}
/* 양식 */
.tp{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}
.tp .c{border-top:1.4pt solid var(--ink);padding-top:2.6mm}
.tp .c.new{border-top-color:var(--acc)}
.tp .tt{font-size:11pt;font-weight:700;margin-bottom:.8mm}
.tp .us{font-size:var(--t-label);color:var(--mute);margin-bottom:2.4mm}
.tp .fd2{margin-bottom:2.4mm}
.tp .fd2 span{font-size:var(--t-label);font-weight:600;color:var(--ink2)}
.tp .fd2 .wl{height:7.6mm}
.tp .fd{display:flex;align-items:end;gap:2mm;font-size:var(--t-label);color:var(--ink2);margin-bottom:.4mm}
.tp .fd span{flex:0 0 auto}
.tp .fd .wl{flex:1;height:6.2mm}
/* 지원서·면접 */
.ap{display:grid;grid-template-columns:repeat(12,1fr);column-gap:5mm}
.ap .l{grid-column:span 6}
.ap .r{grid-column:span 6}
.para{font-size:11pt;line-height:2.05;margin:0;font-weight:500}
.para .bl{color:var(--acc);border-bottom:.8pt solid var(--acc);font-weight:600}
.iq{border-top:1pt solid var(--ink);padding:2.6mm 0 2.4mm}
.iq .q{font-size:10.2pt;font-weight:700;line-height:1.45;margin-bottom:1.2mm}
.iq dl{margin:0;display:grid;grid-template-columns:13mm 1fr;gap:.8mm 2.4mm;font-size:var(--t-label);line-height:1.45}
.iq dt{color:var(--mute);font-weight:600}
.iq dd{margin:0;color:var(--ink2)}
/* 면접 답 연습 */
.pr{border-top:1pt solid var(--ink);padding:2.6mm 0 3.4mm}
.pr .pq{font-size:10.5pt;font-weight:700;line-height:1.45;margin-bottom:1mm;display:flex;gap:3mm}
.pr .pq b{color:var(--acc);font-weight:800}
.pr .pl{display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;align-items:end}
.pr .pk{grid-column:span 2;font-size:var(--t-label);color:var(--mute);font-weight:600;padding-bottom:1.4mm}
.pr .pl .wl{grid-column:span 10;height:8.4mm}
/* 정리 */
.ck{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;border-top:1pt solid var(--ink);padding-top:3mm;margin-bottom:7mm}
.ck .d{font-size:var(--t-label);font-weight:700;color:var(--acc);margin-bottom:1mm}
.ck .t{font-size:11pt;font-weight:700;margin-bottom:1.4mm}
.nx{background:var(--dark);color:var(--onDark);padding:8mm 7mm;margin-bottom:6mm}
.nx .k{font-size:var(--t-label);color:var(--onDark2);margin-bottom:2mm}
.nx .v{font-size:17pt;font-weight:800;line-height:1.38;letter-spacing:-.015em;margin-bottom:3mm}
.nx .s{font-size:var(--t-small);color:var(--onDark2);line-height:1.55}
`;

/* ────────────────────────────── 문장 ────────────────────────────── */

/** 표지 아래 한 줄: 이 리포트가 답하려는 질문(사례마다 다르다) */
function coverQ(e: Ed8): string {
  if (e.kind === "EVIDENCE") return `응답에 있는 근거를 <b>${h(e.versus.a.name)}</b>의 말로 옮기려면 무엇을 먼저 할까.`;
  if (e.kind === "MIXED") return `해 본 일과 가려는 일(<b>${h(e.goal.role)}</b>)이 어디서 어긋나고, 무엇으로 가릴까.`;
  return `관심(<b>${h(e.goal.role)}</b>)을 첫 근거로 바꾸려면 무엇부터 만들까.`;
}
const KIND_KO = { EVIDENCE: "근거가 있는 응답", EARLY: "근거가 아직 적은 응답", MIXED: "해 본 일과 목표가 다른 응답" } as const;

/** 관심(높음/아님) × 확인(직접 수행 이상 / 그 아래 / 묻지 않음) 사분면 */
function quads(e: Ed8) {
  const hi = (r: { interest: string }) => r.interest === "HIGH";
  const ok = (r: { depth: number | null }) => r.depth !== null && r.depth >= 2;
  const rows = e.map.rows;
  return {
    a: rows.filter((r) => hi(r) && ok(r)),
    b: rows.filter((r) => hi(r) && !ok(r)),
    c: rows.filter((r) => !hi(r) && ok(r)),
    d: rows.filter((r) => !hi(r) && !ok(r)),
  };
}
function diagTitle(e: Ed8): string {
  const q = quads(e);
  if (e.kind === "EVIDENCE") return `관심과 근거가 함께 있는 영역은 ${q.a.length}곳, 관심만 있는 영역은 ${q.b.length}곳입니다.`;
  if (e.kind === "MIXED") return `근거는 관심이 낮은 쪽(${q.c.length}곳)에 있고, 관심이 높은 ${q.b.length}곳은 아직 근거가 없습니다.`;
  return `관심이 높은 영역은 ${q.b.length + q.a.length}곳, 근거가 선 영역은 아직 ${q.a.length + q.c.length}곳입니다.`;
}

/* ────────────────────────────── 쪽 ────────────────────────────── */

function frame(e: Ed8, title: string, body: string): string {
  const who = `${e.who.school} ${e.who.department}`;
  return `<div class="hd"><span><b>${h(who)}</b> · 진로·직무 리포트</span><span>${h(title)} · <span class="pn"></span></span></div>
<div class="bd">${body}</div>
<div class="ft"><span class="lg"><span>● 응답</span><span>○ 학생이 적은 기록</span><span>◇ 직무 일반 안내</span><span>→ 이 리포트의 제안</span></span><span>CareerMatri</span></div>`;
}

function cover(e: Ed8): string {
  const dm = e.map.rows.map((r) => {
    const cls = r.depth !== null && r.depth >= 2 ? "ev" : r.interest === "HIGH" ? "hot" : "";
    return `<div class="t ${cls}"><div class="nm">${h(r.name)}</div><div class="rw">${int3(r.interest)}<span>${h(INT_KO[r.interest])}</span></div><div class="rw">${steps4(r.depth)}</div><div class="dt">${r.depth === null ? "묻지 않음" : h(tag(r.depth))}</div></div>`;
  }).join("");
  const tk = e.takeaways.map((t, i) => {
    const k = i === 1 ? (e.kind === "EARLY" ? "출발점" : "응답에서 가장 깊은 판단") : t.k;
    const v = i === 1 ? (e.kind === "EARLY" ? t.v.replace(/이 끌립니다$|가 끌립니다$/, " — 관심 높음") : deepest(e)) : t.v;
    return `<div><div class="k">${h(k)}</div><div class="v">${h(v)}</div></div>`;
  }).join("");
  return `<div class="cvtop">
  <div class="meta"><span>${h(e.who.school)} · ${h(e.who.department)}${e.who.specialization ? " · " + h(e.who.specialization) : ""}</span><span>${h(e.who.answeredOn)} 응답</span></div>
  <div class="kind">${h(KIND_KO[e.kind])} · 목표 직무 ${h(e.goal.role)}</div>
  <div class="disp">${h(coverHead(e))}</div>
  <p class="q">${coverQ(e)}</p>
</div>
<div class="low">
  <div class="lab">열두 영역 — 점은 관심, 막대는 응답한 깊이(빗금은 이번 검사에서 묻지 않음) · 주황 선은 직접 수행 이상으로 응답한 영역</div>
  <div class="dm">${dm}</div>
  <div class="tk">${tk}</div>
  <!--TOC-->
  <div class="fn">학생이 고른 응답과 직접 적은 기록으로 만든 리포트입니다. 점수와 순위를 만들지 않았고, 채용 결과를 예측하지 않습니다.</div>
</div>`;
}
/** 자기보고만으로 ‘경험이 있습니다’ 라고 단정하지 않는다 */
function coverHead(e: Ed8): string {
  return e.verdict.head.replace(/정해 본 경험이 있습니다\.$/, "정했다고 응답했습니다.").replace(/해 본 경험이 있습니다\.$/, "해 봤다고 응답했습니다.");
}
/** 표지 둘째 칸: 가장 깊이 응답한 판단(단정하지 않는 짧은 꼴) */
const SAID_SHORT: Record<number, string> = { 0: "해 본 적 없다고 응답", 1: "정해진 조건 안에서 해 봤다고 응답", 2: "스스로 해 봤다고 응답", 3: "기준까지 직접 정했다고 응답" };
function deepest(e: Ed8): string {
  const top = [...e.style].filter((s) => s.best !== null).sort((a, b) => (b.best ?? 0) - (a.best ?? 0))[0];
  return top ? `${top.name} — ${SAID_SHORT[top.best ?? 0]}` : "아직 없음";
}

function diagnosis(e: Ed8): string {
  const q = quads(e);
  const li = (rows: typeof e.map.rows) => rows.length
    ? rows.map((r) => `<li class="${r.depth === null ? "un" : ""}"><span>${h(r.name)}</span><em>${r.depth === null ? "묻지 않음" : h(tag(r.depth))}</em></li>`).join("")
    : `<li class="un"><span>해당 영역 없음</span></li>`;
  const have = e.verdict.have.map((x) => `<li>${mk(x.src)}${h(x.text)}</li>`).join("");
  const unk = e.verdict.unknown.map((x) => `<li>${mk(x.src)}${h(x.text)}</li>`).join("");
  return `<div class="eye">진단 · 관심과 근거를 따로 본다</div>
<h1>${h(diagTitle(e))}</h1>
<p class="lead">${h(e.verdict.sub)}</p>
<div class="g12">
  <div class="s8">
    <div class="mx">
      <div class="q a"><div class="qt">바로 꺼낼 수 있는 근거</div><div class="qs">관심 높음 · 응답 확인</div><ul>${li(q.a)}</ul></div>
      <div class="q"><div class="qt">만들어야 할 근거</div><div class="qs">관심 높음 · 아직 확인 안 됨</div><ul>${li(q.b)}</ul></div>
      <div class="q"><div class="qt">옮겨 쓸 경험</div><div class="qs">관심 낮음 · 응답 확인</div><ul>${li(q.c)}</ul></div>
      <div class="q"><div class="qt">지금은 미뤄도 되는 곳</div><div class="qs">관심 낮음 · 확인 안 됨</div><ul>${li(q.d)}</ul></div>
    </div>
  </div>
  <div class="s4">
    <div class="lab">응답과 기록으로 확인된 것</div><ul class="ln">${have}</ul>
    <div class="lab" style="margin-top:5mm">이 리포트가 확인하지 않은 것</div><ul class="ln">${unk}</ul>
  </div>
</div>
<div class="sp"></div>
<p class="sm"><b>읽는 법.</b> 가로는 응답한 깊이, 세로는 관심입니다. 둘을 더해 하나의 점수로 만들지 않습니다.</p>`;
}

function jobs(e: Ed8): string {
  const { a, b } = e.versus;
  const sit0 = (r: typeof a) => r.guide.situations[0];
  const outs = (r: typeof a) => [...new Set(r.guide.cycle.map((c) => c.output))].slice(0, 3).join(" · ");
  const have = (r: typeof a) => r.have.length ? r.have.map((x) => `${mk(x.src)}${h(x.text)}<br>`).join("") : `<span style="color:var(--mute)">응답에서 아직 확인된 근거가 없습니다.</span>`;
  const head = (r: typeof a, role: string) => `<div>${h(r.name)}<small>${role} · ${h(r.readiness)}</small></div>`;
  const rows: [string, string, string][] = [
    ["하는 일", `${mk("일반 직무 안내")}${h(a.guide.line)}`, `${mk("일반 직무 안내")}${h(b.guide.line)}`],
    ["먼저 정하는 것", `${h(sit0(a).when)} — ${h(sit0(a).decide)}`, `${h(sit0(b).when)} — ${h(sit0(b).decide)}`],
    ["남기는 결과물", h(outs(a)), h(outs(b))],
    ["중심 영역 · 내 응답", `<div class="lv">${steps4(a.tdDepth)}<span>${h(a.tdName)} — ${h(said(a.tdDepth))}</span></div>`, `<div class="lv">${steps4(b.tdDepth)}<span>${h(b.tdName)} — ${h(said(b.tdDepth))}</span></div>`],
    ["지금 가진 근거", have(a), have(b)],
    ["채울 판단", h(a.need.join(" · ") || "—"), h(b.need.join(" · ") || "—")],
    ["헷갈리기 쉬운 점", `${mk("일반 직무 안내")}${h(a.guide.notThis)}`, `${mk("일반 직무 안내")}${h(b.guide.notThis)}`],
  ];
  const aRole = e.kind === "MIXED" ? "목표로 고른 직무" : "먼저 볼 직무";
  const bRole = e.kind === "MIXED" ? "응답이 더 가까운 직무" : "함께 볼 직무";
  return `<div class="eye">직무 비교 · 같은 칸에 놓고 본다</div>
<h1>${h(e.versus.call)}</h1>
<div class="jt">
  <div class="r hdr"><div></div>${head(a, aRole)}${head(b, bRole)}</div>
  ${rows.map(([k, x, y]) => `<div class="r"><div>${h(k)}</div><div>${x}</div><div>${y}</div></div>`).join("")}
</div>
<div class="sp"></div>
<div class="call"><div class="c">${h(e.kind === "MIXED" ? `${a.name}로 가려면, ${a.tdName} 일을 작게 한 번 해 보는 것이 먼저입니다.` : `${a.name}부터 봅니다. ${b.name}는 같은 근거로 함께 준비합니다.`)}</div><ul>${e.versus.why.map((w) => `<li>→ ${h(w.replace("기준까지 직접 결정까지 답했습니다", "기준까지 직접 정했다고 응답했습니다"))}</li>`).join("")}</ul></div>`;
}

/* 사례별 4쪽 */
function case4(e: Ed8): string {
  if (e.kind === "EVIDENCE") return case4Rich(e);
  if (e.kind === "MIXED") return case4Contra(e);
  return case4Poor(e);
}
/** RICH: 확인된 근거 → 아직 모르는 것 → 쓰는 곳(면접 질문 · 문장) */
const UNKNOWN_AX: Record<string, string> = {
  J1: "무엇을 뺐고 왜 뺐는지는 기록에 없습니다.", J2: "목표값을 어떻게 정했는지는 기록에 없습니다.", J3: "버린 안과 그 까닭은 기록에 없습니다.",
  J4: "다른 방법과 견준 기록은 없습니다.", J5: "그 문서를 누가 받아 썼는지는 기록에 없습니다.", J6: "같은 조건으로 견줬는지는 기록에 없습니다.",
  J7: "까닭을 좁힌 근거는 기록에 없습니다.", J8: "결정에 실제로 쓰였는지는 확인하지 않았습니다.",
};
const TITLE_AX: Record<string, string> = { "일의 범위를 먼저 자릅니다": "J1", "목표를 숫자로 바꿉니다": "J2", "기준을 세우고 고릅니다": "J3", "방법을 골라 분석합니다": "J4", "판단을 문서로 남깁니다": "J5", "대안과 같은 조건으로 견줍니다": "J6", "틀린 까닭을 좁힙니다": "J7", "결과를 결정에 씁니다": "J8" };
/** RICH: 확인된 근거 → 기록으로 채울 것 → 쓰는 곳(자기소개서 첫 문장 · 면접 질문) */
function case4Rich(e: Ed8): string {
  const rows = e.strengths.slice(0, 3).map((s) => {
    const ax = TITLE_AX[s.title] ?? "";
    const st = e.style.find((x) => x.axis === ax);
    const name = JUDGE[ax as keyof typeof JUDGE]?.name ?? s.title;
    const pick = /‘([^’]+)’/.exec(s.proof)?.[1] ?? "";
    const dom = s.proof.split("에서 ")[0];
    return `<div class="r">
      <div class="cell e"><div class="k">${mk(s.src)}응답 · ${h(name)}</div><div class="v"><b>${h(dom)}</b><br>${h(quote(pick))}<br><span class="sm">${h(said(st?.best ?? null))}</span></div></div>
      <div class="cell g"><div class="k">기록으로 채울 것</div><div class="v">${h(UNKNOWN_AX[ax] ?? "")}</div></div>
      <div class="cell u"><div class="k">→ 자기소개서 첫 문장</div><div class="v">“${h(formal(pick))}”</div><div class="k" style="margin-top:2.4mm">→ 이어서 받을 면접 질문</div><div class="v"><b>${h(ASKQ[ax] ?? "")}</b><br><span class="sm">${h(ANSWER[ax] ?? "")}</span></div></div>
    </div>`;
  }).join("");
  const arts = [...new Set(e.chains.flatMap((c) => c.rows.find((r) => r.label === "남긴 결과물")?.items ?? []))];
  return `<div class="eye">근거 → 직무에서 쓰는 곳</div>
<h1>응답에 있는 근거 셋을 ${h(e.versus.a.name)} 지원서의 어디에 쓰는가</h1>
<p class="lead">세 줄 모두 학생이 고른 응답입니다. ${h(CAVEAT)} 그래서 가운데 칸을 기록으로 채운 뒤에 오른쪽 문장과 답을 씁니다.</p>
<div class="fl">
  <div class="hdr"><div style="grid-column:span 4">● 응답으로 확인된 것</div><div style="grid-column:span 3">기록으로 채울 것</div><div style="grid-column:span 5">→ 쓰는 곳</div></div>
  ${rows}
</div>
<div class="sp"></div>
<div class="rule"><div class="lab">○ 기록에 이름이 남은 결과물 — 면접에서 보여 달라고 할 수 있는 것</div>
<div class="chips">${arts.map((x) => `<span>${h(x)}</span>`).join("") || `<span>기록된 결과물 없음</span>`}</div>
<p class="sm" style="margin-top:3mm">결과물 파일은 이름 그대로 둡니다. 완성도와 수치는 이 리포트가 확인하지 않았습니다. 수치는 기록에 있는 것만 적습니다.</p></div>`;
}
/** POOR: 목표 영역의 여덟 판단(빈칸) → 4주 첫 실습 → 남길 결과물 */
function case4Poor(e: Ed8): string {
  const d: DnaDomain | undefined = e.dna.domains.find((x) => x.name === e.versus.a.tdName) ?? e.dna.domains[0];
  const lv = d ? d.levels : [];
  const gp = lv.map((l) => `<div class="a ${l.level === null || l.level <= 1 ? "zero" : ""}"><div class="n">${h(l.name)}</div><div>${steps4(l.level)}</div><div class="st">${h(tag(l.level))}</div></div>`).join("");
  const wk = (e.weeks ?? []).map((w) => `<div class="w"><div class="wn">${w.no}주</div><div class="wt">${h(w.what)}</div><div class="wo">남는 것 · ${h(w.out)}</div></div>`).join("");
  return `<div class="eye">비어 있는 판단 → 첫 실습</div>
<h1>${h(d?.name ?? e.goal.role)}의 여덟 판단은 아직 스스로 맡아 본 응답이 없습니다</h1>
<p class="lead">관심은 높게 나왔습니다. 그래서 ‘강점’ 대신 출발점을 적습니다. 첫 4주는 판단 하나 — ${h(e.first.title)} — 를 처음부터 끝까지 직접 맡아 보는 데 씁니다.</p>
<div class="lab">${h(d?.name ?? "")} · 여덟 판단의 응답 ● (주황 선은 지시받은 범위 안이거나 해 본 적 없음)</div>
<div class="gp">${gp}</div>
<div style="height:8mm"></div>
<div class="lab">→ 첫 4주 · ${h(e.first.where)}</div>
<div class="tl">${wk}</div>
<div style="height:8mm"></div>
<div class="g12 rule">
  <div class="s5"><div class="lab">왜 이 판단부터인가</div><p class="sm">${h(e.first.why)} ${h(e.versus.a.name)}에서 ${h(e.versus.a.guide.situations[0]?.when ?? "")} 가장 먼저 내리는 판단이 이것입니다.</p></div>
  <div class="s7"><div class="lab">◇ ${h(e.versus.a.name)}에서 이 판단이 필요한 순간</div><ul class="ln">${e.versus.a.guide.situations.map((x) => `<li><b>${h(x.when)}</b> — ${h(x.decide)}</li>`).join("")}</ul></div>
</div>
<div class="sp"></div>
<div class="dl"><div class="k">4주 뒤 손에 남을 것 →</div><div class="v">${h(e.first.output)}</div><div class="c"><span class="chk"></span>${h(e.first.check)}</div></div>`;
}
/** CONTRA: 해 본 일 ↔ 가려는 일, 사이의 기록 → 어느 쪽인지 가리는 질문 */
function case4Contra(e: Ed8): string {
  const m = e.mismatch!;
  const did = e.map.rows.filter((r) => m.did.includes(r.name)).map((r) => `<li><span>${h(r.name)}</span><em>${h(tag(r.depth))} · ${h(INT_KO[r.interest])}</em></li>`).join("");
  const goalRow = e.map.rows.find((r) => r.name === m.targetTd);
  const ch = e.chains[0];
  const conflict = selfRef(ch?.tests?.[0] ?? "");
  const ASK = ["이 일을 맡아 끝까지 해 보고 싶은가?", "이 판단을 매주 해도 지치지 않을 것 같은가?", "이렇게 정한 까닭을 다른 사람에게 설명할 수 있겠는가?"];
  const items = e.plan.flatMap((p) => p.items);
  const qs = e.versus.a.guide.situations.slice(0, 3).map((s, i) => `<div class="r"><div class="no">${i + 1}</div><div class="tx"><span class="sm">◇ ${h(s.when)} — ${h(s.decide)}</span><b>${h(ASK[i])}</b><span class="sm">→ 해 볼 자리: ${h(items[i]?.where ?? e.first.where)} · 남길 것 ${h(items[i]?.output ?? e.first.output)}</span></div><div class="ys"><span><span class="chk"></span>예</span><span><span class="chk"></span>아니오</span><span><span class="chk"></span>아직</span></div></div>`).join("");
  return `<div class="eye">어긋나는 곳 → 가리는 질문</div>
<h1>해 본 일은 ${h(m.closer)} 쪽에 있고, 가려는 일은 ${h(m.target)}입니다</h1>
<p class="lead">어느 쪽이 맞다고 이 리포트가 정하지 않습니다. 응답과 기록이 어디서 갈리는지 보이고, 학생이 직접 답할 질문 셋으로 가립니다.</p>
<div class="cf">
  <div class="side"><div class="lab">● 해 본 일 — 응답</div><div class="ttl">${h(m.did.length)}개 영역</div><ul>${did}</ul></div>
  <div class="mid"><div class="lab" style="text-align:center">○ 사이에 걸친 기록</div><div class="br"><p class="sm" style="margin:0;text-align:center"><b>${h(ch?.title ?? "")}</b><br>${h(m.overlap ? strip(m.overlap) : "")}</p></div>
    <p class="sm" style="margin-top:2.4mm;text-align:center">${h(conflict)}</p></div>
  <div class="side goal"><div class="lab">가려는 일 — 목표</div><div class="ttl">${h(m.target)}</div><ul><li><span>중심 영역 ${h(m.targetTd)}</span><em>${h(tag(goalRow?.depth ?? null))}</em></li><li><span>관심</span><em>${h(INT_KO[goalRow?.interest ?? "MID"])}</em></li></ul>
  <p class="sm" style="margin-top:2.4mm">응답만 보면 더 가까운 쪽은 ${h(m.closer)}입니다. ${h(m.closerWhy.replace("직접 수행까지 답했습니다", "스스로 맡아 해 봤다고 응답했습니다"))}</p></div>
</div>
<div class="sp"></div>
<div class="lab">${h(m.target)}의 실제 장면으로 가리는 질문 셋 — 응답에는 아직 이 장면이 없으므로, 해 본 뒤에 답합니다. 셋 모두 ‘예’면 목표를 그대로 둡니다</div>
<div class="vq">${qs}</div>`;
}

function judgments(e: Ed8): string {
  const rows = e.style.map((s) => `<div class="r"><div class="nm">${h(s.name)}<span class="pl">${h(JUDGE[s.axis as keyof typeof JUDGE]?.scene ?? "")}</span></div><div class="sc">${[0, 1, 2, 3].map((i) => `<span class="${s.best !== null && i === s.best ? (i === 3 ? "on top" : "on") : ""}"><i></i></span>`).join("")}</div><div class="wh">${s.best === null ? UNASKED : h(s.where)}</div></div>`).join("");
  return `<div class="eye">여덟 판단 · 가장 깊이 응답한 자리</div>
<h1>${h(e.kind === "EARLY" ? "여덟 판단 모두 아직 정해진 조건 안의 응답입니다" : e.kind === "MIXED" ? "여러 판단을 스스로 해 봤다고 응답했지만, 목표 직무의 영역 밖입니다" : "기준까지 직접 정했다고 응답한 판단이 넷입니다")}</h1>
<p class="lead">${h(e.kind === "EARLY" ? "점 하나가 그 판단에서 가장 깊이 응답한 자리입니다. 하나라도 오른쪽으로 옮기는 것이 첫 목표입니다." : "점 하나가 그 판단에서 가장 깊이 응답한 자리입니다. 응답한 깊이이고, 실력을 잰 값은 아닙니다.")}</p>
<div class="dp">${rows}
  <div class="ax"><div class="k"><span>해 본 적 없음</span><span>지시받아 수행</span><span>직접 수행</span><span>기준까지 직접 결정</span></div></div>
</div>
<div class="sp"></div>
<p class="sm">${h(e.styleLine)} ${h(CAVEAT)}</p>`;
}

function flow(e: Ed8): string {
  const g = e.versus.a.guide;
  const st = g.cycle.slice(0, 5).map((c) => `<div class="st"><div class="ph">${h(c.phase)}</div><div class="sc2">${h(c.scene)}</div><div class="io"><b>받는 것</b>${h(c.input)}</div><div class="io"><b>정하는 것</b>${h(c.decide)}</div><div class="io"><b>남기는 것</b>${h(c.output)}</div></div>`).join("");
  return `<div class="eye">◇ ${h(g.name)}의 한 주기 · 직무 일반 안내</div>
<h1>${h(g.name)}은 다섯 걸음으로 돌아갑니다. 걸음마다 정하는 것이 다릅니다</h1>
<p class="lead">${h(g.line)} 아래는 특정 기업이 아니라 직무 일반의 장면입니다.</p>
<div class="pf">${st}</div>
<div class="sp"></div>
<div class="g12 rule"><div class="s4"><div class="lab">판단이 필요한 순간</div></div>${g.situations.map((s) => `<div class="s8" style="grid-column:span 8"><p class="sm" style="margin:0 0 1.6mm"><b>${h(s.when)}</b> — ${h(s.decide)}</p></div><div class="s4"></div>`).join("").replace(/<div class="s4"><\/div>$/, "")}</div>`;
}

function timeline(e: Ed8): string {
  const rows = e.chains.map((c) => `<div class="r"><div class="when"><b>${h(c.period)}</b>${h(c.kind)}</div><div class="main"><h2 style="margin:0">${mk("학생 자기기록")}${h(c.title)}</h2>
    <div class="rows">${c.rows.map((r) => `<div class="${r.items.length ? "" : "empty"}"><small>${h(r.label)}</small>${r.items.length ? h(r.items.join(" · ")) : h(r.empty)}</div>`).join("")}</div>
    <div class="lab" style="margin-top:3mm">응답과 기록을 견주면</div><ul class="ln">${c.tests.map((t) => `<li>${h(selfRef(t))}</li>`).join("")}</ul></div></div>`).join("");
  const empty = e.chains.reduce((n, c) => n + c.rows.filter((r) => !r.items.length).length, 0);
  return `<div class="eye">○ 경험 타임라인 · 학생이 적은 기록</div>
<h1>적어 둔 경험 ${e.chains.length}개, 아직 빈 칸 ${empty}개</h1>
<p class="lead">기록은 학생이 직접 적은 것이고 이 리포트가 확인하지 않았습니다. 점선 칸은 비어 있는 칸입니다. 빈 칸이 채워지면 지원서 한 문단이 됩니다.</p>
<div class="et">${rows}</div>
<div class="sp"></div>
<div class="rule"><div class="lab">빈 칸을 채울 때 볼 것</div><ul class="ln">${(e.chains[0]?.check ?? []).map((x) => `<li><span class="chk"></span>${h(x)}</li>`).join("")}</ul></div>`;
}

function workbook(e: Ed8): string {
  const items = e.plan.flatMap((p) => p.items).slice(0, 3);
  const ms = items.map((x) => `<div class="m"><div class="d">${h(x.when)} · ${h(x.domain)}</div><div class="ti">${h(x.title)}</div><p class="sm" style="margin:0">${h(x.where)}</p><div class="o">→ 남길 것 <b>${h(x.output)}</b></div><div class="o"><span class="chk"></span>${h(x.check)}</div></div>`).join("");
  const pj = e.project;
  return `<div class="eye">→ 90일 작업판</div>
<h1>90일 동안 결과물 ${items.length}개 — 기간마다 하나</h1>
<p class="lead">${h(pj.why)} 첫 결과물은 아래 칸을 그대로 채우면 됩니다.</p>
<div class="wb">${ms}</div>
<div style="height:9mm"></div>
<div class="ws">
  <div class="s12" style="grid-column:span 12"><h2>${h(pj.title)} <span class="sm" style="font-weight:500">· ${h(pj.where)}</span></h2></div>
  ${pj.steps.map((s) => `<div class="f"><div class="k">${h(s.replace(/을 적습니다$|를 적습니다$|을 정하고 .*$/, ""))}</div><div class="wl"></div></div><div class="f"><div class="k"></div><div class="wl"></div></div>`).join("")}
</div>
<div class="sp"></div>
<div class="g12 rule"><div class="s6"><div class="lab">다 됐는지 보는 법</div>${pj.done.map((d) => `<p class="sm" style="margin:0 0 1mm"><span class="chk"></span>${h(d)}</p>`).join("")}</div><div class="s6"><div class="lab">이 결과물로 답할 면접 질문</div><p class="sm"><b>${h(pj.answers)}</b></p></div></div>`;
}

function templates(e: Ed8): string {
  const tp = e.templates.slice(0, 3).map((t) => `<div class="c ${t.status === "새로 만들기" ? "new" : ""}"><div class="tt">${h(t.title)}</div><div class="us">${h(t.status)} · ${h(t.use)}${t.mine.length ? ` · 기록 ○ ${h(t.mine.join(", "))}` : ""}</div>
    ${t.fields.map((f) => `<div class="fd2"><span>${h(f)}</span><div class="wl"></div><div class="wl"></div></div>`).join("")}
    <div class="lab" style="margin-top:3mm">검토 질문</div>${t.judge.map((j) => `<p class="sm" style="margin:0 0 .8mm"><span class="chk"></span>${h(j)}</p>`).join("")}</div>`).join("");
  return `<div class="eye">◇ 포트폴리오에 넣을 결과물 양식</div>
<h1>보여 줄 결과물은 세 장이면 충분합니다</h1>
<p class="lead">양식은 비어 있습니다. 완성된 예시를 지어내지 않았습니다. ‘비슷한 기록 있음’은 학생 기록에 이름이 비슷한 결과물이 있다는 뜻이고, 내용은 확인하지 않았습니다.</p>
<div class="tp">${tp}</div>`;
}

function apply(e: Ed8, ans = e.answers.slice(0, 4)): string {
  const para = e.draft.parts.map((p) => (p.blank ? `<span class="bl">${h(p.text)}</span>` : h(p.text.replace(/습니다 $/, "습니다. ")))).join("");
  const iq = ans.map((a) => `<div class="iq"><div class="q">${h(a.q)}</div><dl><dt>보는 것</dt><dd>${h(a.why)}</dd><dt>내 재료</dt><dd>${a.have ? `${mk("응답 확인")}${h(a.have)}` : `${mk("분석 제안")}${h(a.prep ?? "다음 과제에서 이 판단을 직접 맡아 봅니다")}`}</dd><dt>답 순서</dt><dd>${h(a.dir)}</dd></dl></div>`).join("");
  return `<div class="eye">지원서 · 면접 작업지</div>
<h1>지원서 한 문단과 면접 답 ${ans.length}개를 여기서 시작합니다</h1>
<div class="ap">
  <div class="l">
    <div class="lab">자기소개서 한 문단 — 주황 칸은 기록에 있는 것만 채웁니다 ${mk(e.draft.from.includes("—") ? "학생 자기기록" : "응답 확인")}</div>
    <p class="para">${para}</p>
    <div class="lab" style="margin-top:5mm">쓰는 법</div>
    <ul class="ln">${e.draft.tips.map((t) => `<li>${h(t)}</li>`).join("")}</ul>
    <div class="lab" style="margin-top:5mm">둘째 문단 — 직접 써 봅니다</div>
    ${'<div class="wl"></div>'.repeat(9)}
  </div>
  <div class="r">
    <div class="lab">면접에서 받을 질문</div>
    ${iq}
  </div>
</div>
<div class="sp"></div>
<p class="sm">질문은 학생이 응답한 판단에서 나왔습니다. ‘내 재료’가 → 로 시작하면 아직 재료가 없다는 뜻이고, 그 과제를 끝낸 뒤 답합니다.</p>`;
}

/** 면접 답 연습: 질문마다 첫 문장 · 근거 · 끝맺음 세 줄을 직접 쓴다 */
function practice(e: Ed8): string {
  const qs = e.answers.slice(0, 4);
  return `<div class="eye">면접 답 연습</div>
<h1>질문 ${qs.length}개에 세 줄씩 — 정한 것, 근거, 바뀐 것</h1>
<p class="lead">답은 길게 쓰지 않습니다. 첫 줄에 내가 정한 것, 둘째 줄에 그렇게 정한 근거, 셋째 줄에 그 결과 바뀐 것 하나를 씁니다. 기록에 없는 수치는 쓰지 않습니다.</p>
${qs.map((a, i) => `<div class="pr"><div class="pq"><b>${i + 1}</b>${h(a.q)}</div><div class="pl">${["정한 것", "근거", "바뀐 것"].map((k) => `<div class="pk">${k}</div><div class="wl"></div>`).join("")}</div></div>`).join("")}`;
}

function close(e: Ed8): string {
  return `<div class="eye">정리</div>
<div class="nx"><div class="k">다음 한 가지 →</div><div class="v">${h(e.first.title)}</div><div class="s">${h(e.first.where)} · 남길 것: ${h(e.first.output)} · 점검: ${h(e.first.check)}</div></div>
<h2>90일 동안 이 리포트를 다시 펴는 때</h2>
<div class="ck">${e.plan.flatMap((p) => p.items).slice(0, 3).map((x, i) => `<div><div class="d">${["30일 뒤", "60일 뒤", "90일 뒤"][i]}</div><div class="t">${h(x.output)}</div><p class="sm">이 결과물이 있으면 경험 기록에 더하고 결과를 다시 봅니다. 확인할 것: ${h(x.check)}</p></div>`).join("")}</div>
<h2>이 리포트가 하지 않은 것</h2>
<ul class="ln">${e.limits.map((l) => `<li>${h(l)}</li>`).join("")}</ul>
<div class="sp"></div>
<div class="g12 rule"><div class="s3"><div class="lab">표시 넷</div></div><div class="s9"><p class="sm" style="margin:0"><b>●</b> 학생이 검사에서 고른 응답 · <b>○</b> 학생이 직접 적은 경험 기록(확인하지 않음) · <b>◇</b> 특정 기업이 아닌 직무 일반 안내 · <b>→</b> 응답을 읽고 이 리포트가 권하는 것</p></div></div>`;
}

export function pages9(e: Ed8): Page9[] {
  const P: Page9[] = [];
  const add = (key: string, grammar: string, title: string, body: string, bare = false) => P.push({ key, grammar, title, html: bare ? body : frame(e, title, body) });
  add("cover", "fullbleed", "표지", cover(e), true);
  add("diagnosis", "matrix", "진단", diagnosis(e));
  add("jobs", "comparison", "직무 비교", jobs(e));
  add("case4", e.kind === "EVIDENCE" ? "evidence-flow" : e.kind === "MIXED" ? "conflict-map" : "gap-timeline", e.kind === "EVIDENCE" ? "근거와 쓰는 곳" : e.kind === "MIXED" ? "어긋나는 곳" : "첫 실습", case4(e));
  add("judgments", "dot-plot", "여덟 판단", judgments(e));
  add("flow", "process-flow", "직무 한 주기", flow(e));
  if (e.chains.length) add("timeline", "timeline", "경험 기록", timeline(e));
  add("workbook", "workbook", "90일 작업판", workbook(e));
  add("templates", "worksheet-cards", "결과물 양식", templates(e));
  add("apply", "worksheet", "지원서·면접", apply(e));
  add("practice", "answer-drill", "면접 답 연습", practice(e));
  add("close", "closing", "정리", close(e));
  return P;
}

export function proto9(all: Page9[]): Page9[] {
  return PROTO9.map((k) => all.find((p) => p.key === k)!).filter(Boolean);
}

export function html9(e: Ed8, ps: Page9[], f: Fonts9): string {
  const toc = `<div class="toc">${ps.slice(1).map((p, i) => `<div><b>${i + 2}</b><span>${h(p.title)}</span></div>`).join("")}</div>`;
  ps = ps.map((p) => (p.key === "cover" ? { ...p, html: p.html.replace("<!--TOC-->", toc) } : p));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri 진로·직무 리포트</title><style>${CSS(f)}</style></head><body>
${ps.map((p, i) => `<section class="pg${p.key === "cover" ? " cv" : ""}" data-key="${p.key}" data-grammar="${p.grammar}">${p.html.replace('<span class="pn"></span>', `${i + 1}`)}</section>`).join("\n")}
</body></html>`;
}
