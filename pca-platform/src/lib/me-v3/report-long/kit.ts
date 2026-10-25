/**
 * 쪽 틀과 작은 그리기 도구. 쪽마다 A4 한 장이고, 넘치면 점검 스크립트가 잡는다.
 */
import { C } from "./charts";
import type { Level } from "./types";
import { STEP_WORD, ZONE_WORD, type ZoneKey, notAsked } from "./derive";
import { isEn, T as L } from "./lang";

export type Page = {
  part: string; partName: string; title: string; body: string;
  kind?: "outer" | "cover" | "chapter" | "plain" | "sheet" | "fill";
  /** 한 장으로 읽어야 하는 쪽. 쪽 모으기가 나누지 않고 통째로만 옮긴다 */
  keep?: boolean;
};

/** 꺾쇠를 막고 대시를 쉼표로 푼다. 사전 자료에 섞인 대시가 종이에 나가지 않게 한다 */
export const E = (s: unknown) => String(s ?? "")
  .replace(/\s*[—–]\s*/g, ", ")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const PAL = {
  blue: "#2c63d6", teal: "#13a08a", amber: "#e0861f", coral: "#e5566f", violet: "#7b5cd6",
  sky: "#2fa9d6", green: "#5ea34a", gold: "#c9a227", plum: "#a8488f", brick: "#c8553d", mint: "#3fbfa0", navy: "#14264d",
};
export const DOMPAL = [PAL.blue, PAL.coral, PAL.amber, PAL.teal, PAL.violet, PAL.sky, PAL.green, PAL.gold, PAL.plum, PAL.brick, PAL.mint, PAL.navy];
export const DC = (code: string) => DOMPAL[(Number(String(code).replace(/\D/g, "")) - 1 + 12) % 12];
export const CYC = [PAL.blue, PAL.teal, PAL.amber, PAL.coral, PAL.violet, PAL.sky, PAL.green, PAL.gold, PAL.plum];
/** 단계 색: 지시받아 · 직접 수행 · 기준까지 결정이 색상부터 갈린다 */
export const LVC = ["#eceef3", "#f6c26b", "#2fb59c", "#3a56d4"];
export const ZC: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: PAL.blue, Z2_EVIDENCE_INCOMPLETE: PAL.teal, Z3_EVIDENCE_LOW_INTEREST: PAL.violet,
  Z4_INSUFFICIENT_EVIDENCE: PAL.amber, NOT_EXPLORED: "#cfd5df",
};
export const IC: Record<string, string> = { HIGH: PAL.coral, MID: "#f5a8b6", LOW: "#e9ecf2" };

export const T = (title: string, dek?: string) => `<div class="ph"><h1>${title}</h1>${dek ? `<p class="dek">${dek}</p>` : ""}</div>`;
export const H = (t: string, sub?: string) => `<h3 class="sh">${t}${sub ? `<span>${sub}</span>` : ""}</h3>`;
export const band = (label: string, text: string) => `<div class="band"><b>${label}</b><span>${text}</span></div>`;
export const tag = (t: string, color?: string) => `<span class="tag" style="${color ? `background:${color}` : ""}">${E(t)}</span>`;
export const zoneTag = (z: string) => `<span class="ztag" style="--z:${ZC[z] ?? "#c9ced8"}">${E(ZONE_WORD[z as ZoneKey]?.tag ?? "")}</span>`;
export const pip = (lv: Level | null) => lv == null
  ? `<span class="pp na">${notAsked()}</span>`
  : `<span class="pp"><i style="background:${lv >= 1 ? LVC[Math.max(1, lv)] : C.l0}"></i><i style="background:${lv >= 2 ? LVC[lv] : C.l0}"></i><i style="background:${lv >= 3 ? LVC[3] : C.l0}"></i><em>${E(STEP_WORD[lv].tag)}</em></span>`;
export const ul = (xs: string[], cls = "") => (xs.length ? `<ul class="ls ${cls}">${xs.map((x) => `<li>${x}</li>`).join("")}</ul>` : "");
/** 쓰는 칸: 줄만 긋는다. 학생이 채운다 */
export const lines = (n: number, label?: string) => `<div class="wl">${label ? `<p class="wl-l">${label}</p>` : ""}${"<i></i>".repeat(n)}</div>`;
/** 학생 자신의 기록에서 온 글을 담는 칸 */
export const mine = (label: string, text: string) => `<div class="fl">${label ? `<p class="wl-l">${label}</p>` : ""}<p class="fl-t">${text}</p></div>`;
export const card = (inner: string, cls = "") => `<div class="card ${cls}">${inner}</div>`;
export const note = (title: string, body: string, warm = false) => `<div class="note${warm ? " warm" : ""}"><b>${title}</b>${body.startsWith("<") ? body : `<p>${body}</p>`}</div>`;
/**
 * 그래프 읽는 법. 그래프마다 바로 아래에 붙인다(`docs/metri/report-writing-rules.md` 4절).
 * `marks` 는 [표시, 뜻] 이고 표시는 색(#...)이거나 짧은 말(가로축 · 숫자 · 점 크기)이다
 */
export const howto = (marks: [string, string][], lead?: string) =>
  `<div class="howto"><b>${L("그래프 읽는 법", "How to read this chart")}</b>${lead ? `<p>${lead}</p>` : ""}<ul>${marks.map(([k, v]) =>
    `<li>${/^#[0-9a-f]{3,8}$/i.test(k) ? `<i style="background:${k}"></i>` : `<em>${E(k)}</em>`}<span>${v}</span></li>`).join("")}</ul></div>`;
export const chips = (xs: string[], cls = "") => (xs.length ? `<div class="chips ${cls}">${xs.map((t) => `<span>${E(t)}</span>`).join("")}</div>` : "");

/** 줄 묶음을 쪽 높이에 맞춰 나눈다. 무게는 줄마다 대략의 높이(1 = 한 줄)다 */
export function paginate<T>(items: T[], weight: (t: T) => number, cap: number, firstCap = cap): T[][] {
  const out: T[][] = [];
  let cur: T[] = [], h = 0;
  for (const it of items) {
    const w = weight(it), lim = out.length ? cap : firstCap;
    if (cur.length && h + w > lim) { out.push(cur); cur = []; h = 0; }
    cur.push(it); h += w;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** 글을 대략 몇 줄로 접힐지 센다(한글 기준 n 자 한 줄) */
export const rowsOf = (t: string, n: number) => Math.max(1, Math.ceil([...t].reduce((a, ch) => a + (/[ -~]/.test(ch) ? 0.55 : 1), 0) / n));

export const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="CareerMatri"><rect width="100%" height="100%" rx="34" fill="#2F6BFF"/><g transform="translate(60 60) scale(2.9) translate(-12 -12)"><path d="M5 19V5l7 8 7-8v14" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

/** 겉표지의 선 그림: 여덟 판단의 고리와 그 사람의 가장 깊은 단계 선 */
export function lineArt(levels: (number | null)[]): string {
  const S = 600, cx = 300, cy = 300, R = 230, n = 8;
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const f = (x: number) => Math.round(x * 10) / 10;
  const rings = [0.25, 0.5, 0.75, 1, 1.18, 1.36].map((k, i) => `<polygon points="${Array.from({ length: n }, (_, j) => pt(j, k).map(f).join(",")).join(" ")}" fill="none" stroke="rgba(255,255,255,${i > 3 ? 0.12 : 0.26})" stroke-width="${i === 3 ? 1.4 : 0.8}"/>`).join("");
  const spokes = Array.from({ length: n }, (_, j) => { const [x, y] = pt(j, 1.36); return `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" stroke="rgba(255,255,255,.18)" stroke-width=".8"/>`; }).join("");
  const me = levels.map((v, j) => pt(j, Math.max(0.08, (v ?? 0) / 3)));
  const poly = `<polygon points="${me.map((p) => p.map(f).join(",")).join(" ")}" fill="rgba(201,162,39,.16)" stroke="#d9b54a" stroke-width="2.2" stroke-linejoin="round"/>` +
    me.map((p, j) => (levels[j] == null ? "" : `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="4.5" fill="#14264d" stroke="#d9b54a" stroke-width="2"/>`)).join("");
  return `<svg viewBox="0 0 ${S} ${S}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${rings}${spokes}${poly}</svg>`;
}

export function css(fontBase: string): string {
  return `
${[400, 600, 700, 800].map((w) => `@font-face{font-family:"CM Book Sans";src:url("${fontBase}cm-book-sans-${w}.woff2") format("woff2");font-weight:${w};font-style:normal;font-display:block}`).join("")}PretendardVariable.woff2") format("woff2");font-weight:45 920;font-style:normal;font-display:block}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#e9ecf1}
body{font-family:"CM Book Sans",Pretendard,"Noto Sans CJK KR","Noto Sans KR",sans-serif;color:${C.ink};font-size:9.6pt;line-height:1.58;word-break:keep-all;overflow-wrap:break-word;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg[data-kind="fill"]{display:none}.pg{contain:layout paint;width:210mm;height:297mm;padding:13mm 15mm 11mm;background:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;page-break-after:always;break-after:page;margin:0 auto}
@media screen{.pg{margin:0 auto 6mm;box-shadow:0 1px 6px rgba(20,38,77,.12)}}
.rh{display:flex;align-items:baseline;gap:10px;border-bottom:1.5px solid ${C.navy};padding-bottom:2.2mm;margin-bottom:5mm;font-size:8.6pt;color:${C.ink3}}
.rh-n{font-weight:800;color:#a8871c;letter-spacing:.04em}.rh-t{font-weight:700;color:${C.navy}}.rh-r{margin-left:auto}
.rf{display:flex;gap:12px;border-top:1px solid ${C.line};padding-top:2mm;margin-top:3mm;font-size:8pt;color:${C.ink3}}.rf-no{margin-left:auto;font-weight:700;color:${C.navy}}
.bd{flex:1;display:flex;flex-direction:column;gap:6.5mm;min-height:0}.seg{flex:none;display:flex;flex-direction:column;gap:4.2mm}.seg+.seg{border-top:1px solid #d6dbe4;padding-top:5.5mm}.cont{font-size:8.6pt;font-weight:700;color:#a8871c;letter-spacing:.02em}
.ph h1{font-size:18.5pt;line-height:1.32;margin:0;color:${C.navy};font-weight:800;letter-spacing:-.015em;text-wrap:balance}
.dek{font-size:10.4pt;color:${C.ink2};margin:2mm 0 0;line-height:1.62;text-wrap:pretty}
.sh{font-size:11pt;color:${C.navy};margin:1mm 0 -1.5mm;font-weight:800;display:flex;align-items:baseline;gap:8px}.sh span{font-size:8.6pt;color:${C.ink3};font-weight:500}
h4{font-size:10.8pt;margin:0 0 1.5mm;color:${C.ink};font-weight:700;line-height:1.4;text-wrap:balance}
p{margin:0}p,li,td,dd{text-wrap:pretty}.nw{white-space:nowrap;font-style:normal}.k{font-size:8.4pt;color:${C.blue};font-weight:700;margin-bottom:1mm;letter-spacing:.01em}.mut{color:${C.ink3}}.sm{font-size:8.6pt}.big{font-size:10.8pt;line-height:1.65;color:${C.ink}}
.two{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.two.r64{grid-template-columns:1.25fr 1fr}.two.r46{grid-template-columns:.85fr 1.15fr;align-items:center}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.g2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.card{border:1px solid ${C.line};border-radius:14px;padding:4mm;background:#fff}.card.cen{display:flex;flex-direction:column;align-items:center;gap:2mm;text-align:center}.card.cen svg{max-width:100%}
.note{border-left:0;box-shadow:inset 3px 0 0 ${C.blue};background:#f5f8fe;padding:3mm 4mm;border-radius:14px}.note b{display:block;color:${C.navy};margin-bottom:1mm;font-size:9.8pt}.note.warm{box-shadow:inset 3px 0 0 ${C.amber};background:#fdf7ec}
.howto{margin-top:2mm;padding:2.4mm 3.4mm;border:1px solid ${C.line};border-radius:12px;background:#fbfcfe;font-size:8.6pt;color:${C.ink2}}.howto b{display:block;color:${C.navy};font-size:8.8pt;margin-bottom:1mm}.howto p{margin:0 0 1mm}.howto ul{display:flex;flex-wrap:wrap;gap:1mm 4mm;list-style:none;margin:0;padding:0}.howto li{display:flex;align-items:baseline;gap:1.4mm}.howto li i{display:inline-block;width:3mm;height:3mm;border-radius:2px;flex:none;transform:translateY(.4mm)}.howto li em{font-style:normal;font-weight:700;color:${C.ink}}
.band{display:flex;gap:4mm;align-items:baseline;background:#eef3fc;border-radius:14px;padding:3.2mm 4mm;font-size:9.3pt}.band b{color:${C.navy};white-space:nowrap}
.ls{margin:0;padding-left:4.5mm}.ls li{margin:.6mm 0}
.tag{display:inline-block;color:#fff;background:${C.navy};border-radius:999px;padding:.3mm 2.4mm;font-size:8.2pt;font-weight:700;white-space:nowrap}
.ztag{display:inline-flex;align-items:center;gap:1.6mm;font-size:8.6pt;font-weight:700;color:${C.ink2};white-space:nowrap}.ztag::before{content:"";width:3mm;height:3mm;border-radius:50%;background:var(--z)}
.dot{display:inline-block;width:2.4mm;height:2.4mm;border-radius:50%;margin:0 1.4mm 0 1mm;vertical-align:middle}
.pp{display:inline-flex;align-items:center;gap:1px;white-space:nowrap}.pp i{width:3.2mm;height:3.2mm;border-radius:50%;display:inline-block}.pp em{font-style:normal;font-size:8.3pt;color:${C.ink2};margin-left:1.6mm}.pp.na{font-size:8.1pt;color:${C.ink3};border:1px dashed ${C.line};border-radius:999px;padding:0 1.6mm}
.tb{width:100%;border-collapse:collapse;font-size:9pt}.tb th,.tb td{border-bottom:1px solid ${C.line2};padding:1.6mm 2mm;text-align:left;vertical-align:top}.tb thead th{font-size:8.4pt;color:${C.ink3};font-weight:700;border-bottom:1.5px solid ${C.line}}
.tb tbody th{color:${C.navy};font-weight:700;width:1%;white-space:nowrap}.tb-s{font-size:8.7pt}.tb-xs{font-size:8.3pt}.tb-xs td,.tb-xs th{padding:1.1mm 1.6mm}.tb td.c{text-align:center}
.w34{width:34%}.w30{width:30%}.w24{width:24%}.w22{width:22%}.w18{width:18%}
.ws{border-collapse:separate;border-spacing:0;border:1px solid ${C.line};border-radius:14px;overflow:hidden}.ws td{height:9.5mm;border:0;border-bottom:1px solid ${C.line2};border-left:1px solid ${C.line2};vertical-align:middle;background:#fff}.ws th{border:0;border-bottom:1px solid ${C.line2};background:#f6f8fc;width:26%;white-space:normal}.ws tr:last-child td,.ws tr:last-child th{border-bottom:0}.ws tr>*:first-child{border-left:0}.ws.tall td{height:15mm}.ax2 td{vertical-align:top}.wf2s .wf2-i p{font-size:8.4pt;line-height:1.45}.w16{width:16%}.ws.wk td{height:36mm}.ws.wk{table-layout:fixed}.ws.big td{height:25mm}.ws.log td{height:27mm}.trs .wl i{height:10.5mm}.tr-note{display:block;margin-top:1mm;color:${C.ink2};font-size:8.4pt;line-height:1.45}.rec td{height:24mm;vertical-align:top}.ws.cl td{height:21mm;vertical-align:top}
.wide-art{display:flex;justify-content:center}.wide-art svg{max-height:120mm}.ring-art svg{max-height:96mm}
.radar-big{display:flex;justify-content:center;margin:-2mm 0}.radar-big svg{width:168mm}
.lg{display:flex;flex-wrap:wrap;gap:2mm 5mm;justify-content:center;font-size:8.6pt;color:${C.ink2}}.lg i{display:inline-block;width:3.2mm;height:3.2mm;border-radius:50%;margin-right:1.4mm;vertical-align:-.4mm}.lg i.thin{height:1.4mm;border-radius:999px;vertical-align:.4mm}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm}
.kpi{border:1px solid ${C.line};border-radius:14px;padding:3.6mm 4mm;box-shadow:inset 0 3px 0 ${C.navy}}.kpi p{font-size:8.6pt;color:${C.ink3};font-weight:600}.kpi b{display:block;font-size:24pt;line-height:1.15;color:${C.navy};font-weight:800;margin:1mm 0}.kpi b small{font-size:10pt;margin-left:1mm;color:${C.ink3}}.kpi span{font-size:8.4pt;color:${C.ink2}}
.pts{display:flex;flex-direction:column;gap:3.4mm}.pt{display:flex;gap:4mm;border:1px solid ${C.line};border-radius:14px;padding:3.4mm 4mm}.pt-n{font-size:22pt;font-weight:800;color:#a8871c;line-height:1;min-width:8mm}
.pt h4{font-size:10.6pt}.pt-a{margin-top:1.4mm;font-size:9.1pt}.pt-a b{color:${C.teal}}.pt-l{font-size:8.4pt;color:${C.ink3};margin-top:.8mm}
.chips{display:flex;flex-wrap:wrap;gap:1.8mm}.chips span{border:1px solid ${C.line};border-radius:999px;padding:.8mm 3mm;font-size:8.7pt;background:#fafbfc}.chips.art span{border-color:${C.navy};color:${C.navy};font-weight:700;background:#eef2fa}
.steps4{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.st4{border:1px solid ${C.line};border-radius:14px;padding:3mm}.st4-b{display:flex;gap:1.2mm;margin-bottom:2mm}.st4-b i{flex:1;height:3.4mm;border-radius:999px}.st4 b{font-size:10pt;color:${C.navy}}.st4 p{font-size:8.6pt;color:${C.ink2};margin-top:1mm}
.zones5{display:grid;grid-template-columns:1fr 1fr;gap:2.6mm 5mm}.zn{display:flex;gap:3mm;align-items:flex-start}.zsw{width:5mm;height:5mm;border-radius:50%;flex:none;margin-top:.6mm}.zn p{font-size:8.6pt;color:${C.ink2}}
.flow5{display:grid;grid-template-columns:repeat(5,1fr);gap:2.6mm}.flow5.f4{grid-template-columns:repeat(4,1fr)}.f5{border:1px solid ${C.line};box-shadow:inset 0 3px 0 ${C.blue};border-radius:14px;padding:2.8mm}.f5-t{font-size:8.4pt;color:${C.blue};font-weight:800}.f5 b{display:block;color:${C.navy};margin:.6mm 0}.f5 p{font-size:8.6pt;color:${C.ink2}}
.qs{margin:0;padding-left:5mm;display:flex;flex-direction:column;gap:2mm}.qs li{font-size:10pt;line-height:1.55}
.toc{display:flex;flex-direction:column}.toc-r{display:flex;gap:6mm;align-items:baseline;border-bottom:1px solid ${C.line2};padding:3.1mm 0}.toc-n{font-size:21pt;font-weight:800;color:#a8871c;width:16mm}.toc-b{flex:1}.toc-b b{display:block;font-size:12.6pt;color:${C.navy}}.toc-b span{font-size:8.6pt;color:${C.ink3}}.toc-p{font-size:12.6pt;font-weight:800;color:${C.navy}}
.dh{display:flex;gap:5mm;align-items:center}.dh-n{font-size:30pt;font-weight:800;color:#a8871c;line-height:1}.dh h1{font-size:18pt;margin:0;color:${C.navy};font-weight:800;line-height:1.25}.dh-t{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:1mm;font-size:8.6pt;text-align:right}
.wf{margin:0;padding:0;list-style:none;counter-reset:w;display:grid;grid-template-columns:5mm 27mm 1fr;gap:1.3mm 2.6mm;font-size:8.7pt;align-items:baseline}.wf li{display:contents}.wf li::before{counter-increment:w;content:counter(w);font-weight:800;color:${C.blue}}.wf b{color:${C.navy}}.wf span{color:${C.ink2}}
.wf2{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,auto);grid-auto-flow:column;gap:1.5mm 6mm}.wf2-i{display:grid;grid-template-columns:4.5mm 1fr;gap:1.2mm;font-size:8.5pt;line-height:1.5}.wf2-i>span{font-weight:800;color:${C.blue}}.wf2-i b{color:${C.navy};margin-right:1.6mm}.wf2-i p{color:${C.ink2}}
.b4{box-shadow:inset 0 3px 0 var(--c);background:#f7f9fc;border-radius:14px;padding:2.4mm 3mm}.b4 b{display:block;color:var(--c);font-size:9.6pt}.b4 p{font-size:8.6pt;color:${C.ink2};margin-top:.8mm}
.est3{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;width:100%;margin-top:1mm}.est3 div{background:#f2f5fb;border-radius:14px;padding:1.6mm 1mm;text-align:center}.est3 span{display:block;font-size:8pt;color:${C.ink3}}.est3 b{font-size:10pt;color:${C.navy}}
.na-box{border:1.5px dashed ${C.line};border-radius:16px;padding:6mm;text-align:center;color:${C.ink2};width:100%}.na-box b{display:block;color:${C.navy};margin-bottom:2mm}
.rec{box-shadow:inset 4px 0 0 var(--c);padding:2.4mm 4mm;background:#fafbfc;border-radius:14px}.rec-h{display:flex;flex-direction:column;gap:.4mm;margin-bottom:1.6mm}.rec-h b{color:${C.navy};font-size:10.2pt}.rec-h span{font-size:8.4pt;color:${C.ink3}}
.wl{display:flex;flex-direction:column;gap:0}.wl i{display:block;height:7.6mm;border-bottom:1px dashed #9aa3b2}.wl-l{font-size:8.6pt;color:${C.ink3};font-weight:600}
.lo{margin:0;padding-left:5mm;display:flex;flex-direction:column;gap:1.6mm}.lo li b{display:block;color:${C.navy}}.lo li span{font-size:8.8pt;color:${C.ink2}}.lo.big li{font-size:10pt}.lo.big li span{font-size:9.3pt}
.prose{display:flex;flex-direction:column;gap:3mm}.pr{display:grid;grid-template-columns:24mm 1fr;gap:4mm;border-bottom:1px solid ${C.line2};padding-bottom:3mm}.pr-n{font-weight:800;color:${C.blue};font-size:9.6pt}.pr p{font-size:10pt;line-height:1.68}
.story{border:1px solid ${C.line};border-radius:14px;padding:3.4mm}.story-h{display:flex;justify-content:space-between;gap:4mm;margin-bottom:2mm}.story-h b{color:${C.navy}}.story-h span{font-size:8.4pt;color:${C.ink3};text-align:right}
.story-g{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}.sp{background:#f2f6fd;border-radius:14px;padding:2.4mm;font-size:8.7pt}.sp.empty{background:#fff;border:1.5px dashed ${C.line}}.sp.empty p:last-child{color:${C.ink3}}
.frame{border:1px solid ${C.line};border-radius:14px;padding:4mm 5mm;display:flex;flex-direction:column;gap:2.4mm;font-size:10.2pt;line-height:1.75}.frame u{text-decoration:none;border-bottom:1.5px solid ${C.amber};color:${C.ink}}.frame .blank{display:inline-block;min-width:38mm;border-bottom:1px dashed #9aa3b2}.fb{font-weight:800;color:${C.blue};margin-right:1mm}
.qa{border:1px solid ${C.line};border-radius:14px;padding:3mm 3.6mm}.qa-q{display:flex;gap:3mm;align-items:baseline;margin-bottom:1.6mm}.qa-q span{font-weight:800;color:${C.blue};white-space:nowrap;font-size:9pt}.qa-q b{font-size:10.2pt;color:${C.navy};line-height:1.45}.qa-b{font-size:8.7pt;gap:3mm}
.x-ol{margin:0;padding-left:5mm;display:flex;flex-direction:column;gap:1.6mm}.x-ol li{padding-left:1mm}.cb{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1.8mm}.cb li{display:flex;gap:2.4mm;align-items:flex-start}.cb i{width:3.8mm;height:3.8mm;border:1.4px solid ${C.ink3};border-radius:50%;flex:none;margin-top:.6mm}
.prio{border:1px solid ${C.line};border-radius:14px;padding:3mm 3.6mm;display:flex;flex-direction:column;gap:2mm}.prio-h{display:flex;gap:3mm;align-items:center}.prio-h>span:first-child{font-size:16pt;font-weight:800;color:#a8871c}.prio-h b{font-size:10.6pt;color:${C.navy}}.prio-h .mut{margin-left:auto;font-size:8.6pt;white-space:nowrap}
.quote{font-size:8.9pt;line-height:1.62;color:${C.ink2};border-left:2px solid ${C.line};padding-left:3mm}
.dl{display:grid;grid-template-columns:34mm 1fr;gap:3.6mm 6mm;margin:0;font-size:9.8pt;line-height:1.6}.dl dt{font-weight:800;color:${C.navy}}.dl dd{margin:0;color:${C.ink2}}
.close-box{background:${C.navy};color:#fff;border-radius:18px;padding:6mm}.close-box .k{color:#e6c766}.close-box h3{margin:1mm 0 2mm;font-size:15pt}.close-box p{color:#dbe4f5}
.fl{display:flex;flex-direction:column;gap:1mm}.fl-t{box-shadow:inset 3px 0 0 ${C.amber};background:#fdf7ec;border-radius:14px;padding:2.4mm 3.4mm;font-size:9.4pt;line-height:1.65;color:${C.ink}}
.sj{font-size:7.9pt}.sj td,.sj th{padding:.85mm 1.6mm}.sj tr.sj-g td{background:#f2f5fb;border-top:1.5px solid ${C.line};padding:1.8mm 2mm}.sj-g b{display:block;color:${C.navy};font-size:9pt}.sj-g span{display:block;color:${C.ink2};margin-top:.4mm}.sj-g em{display:block;font-style:normal;color:${C.teal};font-weight:700;margin-top:.4mm}
.sj-l{display:inline-block;font-size:7pt;color:#fff;background:${C.blue};border-radius:999px;padding:0 1.6mm;margin-left:1mm;vertical-align:1px}
.sj-c{border-top:1px solid ${C.line};padding-top:2mm}.sj-ch b{color:${C.navy};margin-right:2mm}.sj-ch span{color:${C.ink2};font-size:8.6pt}.sj-cl{font-size:8pt;line-height:1.7;color:${C.ink};margin-top:1mm}
/* 장 표지 */
.pg.chap{background:${C.navy};color:#fff}.pg.chap .rf{color:#9fb0cf;border-color:#2c406b}.pg.chap .rf-no{color:#fff}
.ch-top{display:flex;align-items:baseline;gap:4mm;margin-top:12mm}.ch-k{font-size:11pt;letter-spacing:.32em;color:#e6c766;font-weight:700}.ch-no{font-size:96pt;font-weight:800;line-height:.9;color:#fff;letter-spacing:-.04em}
.ch-t{font-size:29pt;margin:5mm 0 3mm;font-weight:800;color:#fff;letter-spacing:-.015em}.ch-p{font-size:11.6pt;line-height:1.7;color:#d5def0;max-width:150mm}
.ch-art{margin:8mm 0 4mm;max-height:90mm;overflow:hidden;display:flex;justify-content:center;opacity:.95}.ch-art svg{width:104mm}
/* 숫자를 짙게 칠한 칸(관심·경험만 본 영역)은 짙은 글자 그대로 둔다. 흰 글자로 바꾸면 연회색 칸에서 안 읽힌다 */
.pg.chap .ch-art svg text:not([fill="#3b4556"]){fill:#fff!important}
/* 그래프와 읽는 법을 나란히. 어두운 바탕이라 읽는 법 상자도 어둡게 깐다 */
.ch-fig{justify-content:flex-start;align-items:center;gap:6mm;max-height:none;overflow:visible;opacity:1;margin:6mm 0 3mm}
.ch-pic{flex:none;width:86mm;display:flex;justify-content:center}.ch-fig .ch-pic svg{width:86mm;max-height:86mm}
.ch-how{flex:1;min-width:0}.pg.chap .howto{margin:0;background:rgba(255,255,255,.06);border-color:#34497a;color:#d5def0;font-size:8.8pt;line-height:1.5}
.pg.chap .howto b{color:#e6c766;font-size:9.4pt;margin-bottom:1.6mm}.pg.chap .howto p{margin:0 0 1.8mm}.pg.chap .howto ul{flex-direction:column;gap:1.3mm}
.pg.chap .howto li em{color:#fff;flex:none}.pg.chap .howto li i{box-shadow:0 0 0 1px rgba(255,255,255,.35)}
.ch-art svg[aria-hidden]{width:72mm}.pg.chap .howto .ch-keyp{margin:2mm 0 0;font-size:8pt;line-height:1.55;color:#aebbd6}
.ch-in{margin-top:auto;border-top:1px solid #34497a;padding-top:5mm}.ch-in .sh{color:#e6c766}.ch-in .ls li{color:#d5def0;font-size:10.2pt}.ch-in .ch-ls{columns:2;column-gap:8mm}.ch-in .ch-ls li{break-inside:avoid}
/* 표지 */
.pg.cover{padding:16mm 17mm 14mm;background:#fff}
.cv-top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid ${C.navy};padding-bottom:3mm}.cv-org{font-size:15pt;font-weight:800;color:${C.navy}}.cv-s{font-size:9pt;color:${C.ink3}}
.cv-mid{margin-top:9mm}.cv-k{font-size:10pt;color:#a8871c;font-weight:800;letter-spacing:.06em}.cv-t{font-size:27pt;line-height:1.3;margin:3mm 0 4mm;color:${C.navy};font-weight:800}.cv-d{font-size:10.8pt;line-height:1.68;color:${C.ink2};max-width:164mm}
.cv-art{display:flex;justify-content:center;margin-top:3mm}.cv-art svg{width:140mm}.cv-legend{display:flex;flex-wrap:wrap;gap:3mm 6mm;justify-content:center;font-size:9pt;color:${C.ink2};margin-top:-2mm}.cv-legend i{display:inline-block;width:3.4mm;height:3.4mm;border-radius:50%;margin-right:1.6mm;vertical-align:-.5mm}
.cv-meta{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin:5mm -17mm 0;padding:5mm 17mm 4mm;background:#f2f5fb}.cv-meta div{border-top:1px solid ${C.line};padding-top:2mm}.cv-meta span{display:block;font-size:8.4pt;color:${C.ink3}}.cv-meta b{font-size:10.2pt;color:${C.ink}}
.cv-foot{position:absolute;left:17mm;right:17mm;bottom:12mm;font-size:8.6pt;color:${C.ink2};border:1px solid ${C.line};background:#fff;border-radius:14px;padding:3mm 4mm}.cv-foot b{color:${C.rose};margin-right:2mm}
/* 겉표지 */
.pg.outer{padding:18mm 18mm 16mm;background:linear-gradient(162deg,#0c1a38 0%,#14264d 52%,#1d3a78 100%);color:#fff}
.oc-top{display:flex;align-items:center;gap:3mm}.oc-mark{width:11mm;height:11mm;display:inline-block}.oc-brand{font-size:15pt;font-weight:800;letter-spacing:.01em}.oc-tier{margin-left:auto;border:1px solid #d9b54a;color:#e6c766;border-radius:999px;padding:.6mm 3.4mm;font-size:9pt;font-weight:700;letter-spacing:.14em}
.oc-art{position:absolute;right:-34mm;top:118mm;width:150mm;opacity:.9}.oc-art svg{width:100%}
.oc-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:12mm 12mm}
.oc-mid{margin-top:62mm;position:relative;max-width:118mm}.oc-k{font-size:10.4pt;color:#e6c766;font-weight:700;letter-spacing:.08em}.oc-t{font-size:40pt;line-height:1.16;margin:4mm 0 4mm;font-weight:800;letter-spacing:-.02em}.oc-s{font-size:13pt;color:#dbe4f5;line-height:1.5}
.oc-who{position:absolute;left:18mm;right:18mm;bottom:40mm;display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:6mm;border-top:1px solid rgba(255,255,255,.35);padding-top:5mm}.oc-who span{display:block;font-size:8.6pt;color:#a9c2f3;margin-bottom:1mm}.oc-who b{font-size:12.6pt}
.oc-foot{position:absolute;left:18mm;right:18mm;bottom:16mm;display:flex;flex-wrap:wrap;align-items:baseline;gap:2.4mm;font-size:11pt}.oc-foot span{color:#a9c2f3}.oc-foot em{flex-basis:100%;font-style:normal;font-size:8.6pt;color:#c4d2ee;margin-top:2mm}
`;
}

/** 그 사람과 기관이 적은 글자(이름 · 학교). 영어 책 검사가 한글을 세지 않게 `data-own` 을 단다 */
const own = (t: string) => `<em class="nw" data-own>${E(t)}</em>`;

/** 쪽 하나를 틀에 담는다 */
export function shell(p: Page, i: number, total: number, ctx: { issuer: string; major: string; tier: string; person: string; answeredOn: string }): string {
  const attrs = (k: string) => `data-title="${E(p.title)}" data-kind="${k}" data-part="${E(p.partName)}" data-base="${E(p.title.replace(/ \(\d+\)$/, "").replace(/ \(계속\)$/, "").replace(/ \(cont\.\)$/, ""))}"${p.keep ? ` data-keep="1"` : ""}`;
  if (p.kind === "outer") return `<section class="pg outer" ${attrs("outer")}>${p.body}</section>`;
  if (p.kind === "cover") return `<section class="pg cover" ${attrs("cover")}>${p.body}</section>`;
  const head = p.kind === "chapter" ? "" : `<header class="rh"><span class="rh-n">${p.part ? `PART ${p.part}` : ""}</span><span class="rh-t">${E(p.partName)}</span><span class="rh-r">${isEn() ? `${own(ctx.issuer)} · Career Analysis Report` : `${E(ctx.issuer)} · 진로 분석 리포트`}</span></header>`;
  const foot = `<footer class="rf"><span>CareerMatri · ${E(ctx.major)} · ${E(ctx.tier)}</span><span>${L(`${E(ctx.person)} 님 · ${E(ctx.answeredOn)} 응답`, `${own(ctx.person)} · answered ${E(ctx.answeredOn)}`)}</span><span class="rf-no">${i + 1} / ${total}</span></footer>`;
  const body = p.kind === "chapter" ? p.body : `<div class="seg">${p.body}</div>`;
  return `<section class="pg ${p.kind === "chapter" ? "chap" : ""}" ${attrs(p.kind ?? "plain")}>${head}<div class="bd">${body}</div>${foot}</section>`;
}

/**
 * 쪽 모으기. 글꼴이 다 내려온 뒤 브라우저에서 한 번 돈다(웹과 종이가 같은 일을 한다).
 *
 * 같은 장 안에서 뒤 쪽의 내용을 앞 쪽의 남은 자리로 차례대로 끌어 올린다. 통째로 들어가면
 * 통째로, 아니면 덩이(표 · 상자 · 문단) 단위로 들어가는 데까지 옮기고, 긴 표는 줄 단위로
 * 나눠 머리줄을 다시 단다. 차례는 바꾸지 않는다. 제목이나 작은 머리가 쪽 끝에 혼자 남지
 * 않게 다음 덩이와 함께 넘긴다. `data-keep` 이 붙은 쪽(한 장으로 읽어야 하는 쪽)은
 * 통째로만 옮긴다. 넣어 보고 넘치면 되돌린다. 다 모은 뒤 쪽 번호와 차례를 다시 적는다.
 */
export const PACK_JS = String.raw`(function () {
  function plain(pg) { return pg.getAttribute("data-kind") === "plain"; }
  function bdOf(pg) { return pg.querySelector(".bd"); }
  function segs(pg) { return Array.prototype.slice.call(bdOf(pg).children).filter(function (e) { return e.classList.contains("seg"); }); }
  function fits(pg) {
    var bd = bdOf(pg); var b = bd.getBoundingClientRect().bottom; var m = 0;
    var ss = segs(pg); if (!ss.length) return true;
    /* 마지막 덩이만 재지 않는다. 덩이 사이를 벌린 쪽에서는 앞 덩이의 안쪽이 바닥을 넘기도 한다 */
    ss.forEach(function (s) { var q = s.getBoundingClientRect(); if (q.bottom > m) m = q.bottom; s.querySelectorAll("*").forEach(function (e) { var r = e.getBoundingClientRect(); if (r.height && r.width && r.bottom > m) m = r.bottom; }); });
    return m <= b - 1;
  }
  /* 쪽에 남은 자리(본문 높이에 대한 비율) */
  function gap(pg) {
    var bd = bdOf(pg); var r = bd.getBoundingClientRect(); var ss = segs(pg); var last = ss[ss.length - 1];
    if (!last) return 1;
    var m = last.getBoundingClientRect().bottom;
    last.querySelectorAll("*").forEach(function (e) { var q = e.getBoundingClientRect(); if (q.height && q.width && q.bottom > m) m = q.bottom; });
    return Math.max(0, (r.bottom - m) / r.height);
  }
  function isHead(e) {
    if (!e) return false;
    if (e.matches("h1,h2,h3,h4,.ph,.sh,.cont,p.k")) return true;
    return false;
  }
  /* 표를 줄 단위로 옮긴다. 옮긴 줄이 둘보다 적으면 되돌린다 */
  function splitTable(tb, into, pg) {
    var body = tb.tBodies[0]; if (!body || body.rows.length < 4) return false;
    var cl = tb.cloneNode(false); if (tb.tHead) cl.appendChild(tb.tHead.cloneNode(true));
    var nb = document.createElement("tbody"); cl.appendChild(nb); into.appendChild(cl);
    var n = 0;
    while (body.rows.length > 1) {
      nb.appendChild(body.rows[0]);
      if (!fits(pg)) { body.insertBefore(nb.lastElementChild, body.firstElementChild); break; }
      n++;
    }
    if (n < 2) { while (nb.rows.length) body.insertBefore(nb.lastElementChild, body.firstElementChild); into.removeChild(cl); return false; }
    return true;
  }
  /* 그림 덩이가 조금 넘치면 그림을 줄여 넣는다. 원래 크기의 72% 아래로는 줄이지 않는다 */
  function shrink(c, pg) {
    var svg = c.matches(".wide-art") ? c.querySelector("svg") : null; if (!svg) return false;
    var r = svg.getBoundingClientRect(); var over = 0;
    var b = bdOf(pg).getBoundingClientRect().bottom; var m = 0;
    c.querySelectorAll("*").forEach(function (e) { var q = e.getBoundingClientRect(); if (q.height && q.bottom > m) m = q.bottom; });
    over = Math.max(m, c.getBoundingClientRect().bottom) - b + 2;
    var h = r.height - over; if (h < r.height * 0.72) return false;
    svg.style.height = h + "px"; svg.style.width = (r.width * h / r.height) + "px"; svg.style.maxHeight = "none";
    if (fits(pg)) return true;
    svg.style.height = ""; svg.style.width = ""; svg.style.maxHeight = "";
    return false;
  }
  /* 카드 격자를 줄 단위로 옮긴다. 한 줄도 못 옮기거나 남는 줄이 없으면 되돌린다 */
  function splitGrid(c, into, pg) {
    var cols = c.matches(".g3") ? 3 : 2; if (c.children.length <= cols) return false;
    var cl = c.cloneNode(false); into.appendChild(cl); var n = 0;
    while (c.children.length > cols) {
      var row = Array.prototype.slice.call(c.children, 0, cols);
      row.forEach(function (e) { cl.appendChild(e); });
      if (!fits(pg)) { row.reverse().forEach(function (e) { c.insertBefore(e, c.firstElementChild); }); break; }
      n++;
    }
    if (!n) { into.removeChild(cl); return false; }
    return true;
  }
  /* 다음 쪽의 앞 덩이를 cur 로 끌어 올린다. 다 옮겼으면 true */
  function pull(cur, nx) {
    var keep = nx.getAttribute("data-keep") === "1";
    var bd = bdOf(cur);
    while (segs(nx).length) {
      var s = segs(nx)[0];
      bd.appendChild(s);
      if (fits(cur)) continue;
      bdOf(nx).insertBefore(s, bdOf(nx).firstChild);
      if (keep) return false;
      var ns = document.createElement("div"); ns.className = s.className; bd.appendChild(ns);
      var moved = 0;
      while (s.firstElementChild) {
        var c = s.firstElementChild; ns.appendChild(c);
        /* 그래프와 바로 뒤의 읽는 법은 한 덩이다. 그래프만 올라가면 읽는 법이 다음 쪽
           맨 위에 혼자 서서, 무엇을 읽는 법인지 모르게 된다 */
        var hw = s.firstElementChild && s.firstElementChild.matches(".howto") ? s.firstElementChild : null;
        if (hw) ns.appendChild(hw);
        if (fits(cur)) { moved++; continue; }
        if (hw) { s.insertBefore(hw, s.firstElementChild); }
        else if (shrink(c, cur)) { moved++; continue; }
        s.insertBefore(c, s.firstElementChild);
        if (c.tagName === "TABLE" && splitTable(c, ns, cur)) moved++;
        else if (c.matches(".g2,.g3") && splitGrid(c, ns, cur)) moved++;
        break;
      }
      while (ns.lastElementChild && isHead(ns.lastElementChild)) { s.insertBefore(ns.lastElementChild, s.firstElementChild); moved--; }
      /* 남는 쪽이 안내 띠 하나만 들고 가지 않게, 앞 덩이 하나를 함께 넘긴다 */
      while (s.firstElementChild && Array.prototype.every.call(s.children, function (e) { return e.matches(".band,.cont"); }) && Array.prototype.filter.call(ns.children, function (e) { return !isHead(e); }).length > 1) {
        s.insertBefore(ns.lastElementChild, s.firstElementChild);
        while (ns.lastElementChild && isHead(ns.lastElementChild)) s.insertBefore(ns.lastElementChild, s.firstElementChild);
      }
      var meaningful = Array.prototype.some.call(ns.children, function (e) { return !isHead(e); });
      if (!meaningful) { while (ns.lastElementChild) s.insertBefore(ns.lastElementChild, s.firstElementChild); bd.removeChild(ns); return false; }
      if (s.firstElementChild && !s.firstElementChild.matches(".ph,.cont")) {
        var t = document.createElement("p"); t.className = "cont"; t.textContent = (nx.getAttribute("data-base") || "") + " (계속)";
        s.insertBefore(t, s.firstElementChild);
      }
      return false;
    }
    return true;
  }
  /* 다른 쪽을 통째로 붙여 본다. 안 들어가면 되돌린다 */
  function whole(cur, q) {
    var bd = bdOf(cur); var moved = segs(q);
    moved.forEach(function (s) { bd.appendChild(s); });
    if (fits(cur)) return true;
    moved.forEach(function (s) { bdOf(q).appendChild(s); });
    return false;
  }
  function run() {
    /* 덧붙일 거리는 그 장의 맨 끝으로 옮겨 둔다. 본문 쪽 사이에 끼어 있으면 끌어 올리기가 거기서 멈춘다 */
    Array.prototype.slice.call(document.querySelectorAll('section.pg[data-kind="fill"]')).forEach(function (f) {
      var same = Array.prototype.slice.call(document.querySelectorAll("section.pg")).filter(function (pg) { return pg.getAttribute("data-part") === f.getAttribute("data-part") && pg.getAttribute("data-kind") !== "fill"; });
      var last = same[same.length - 1]; if (last && last.nextSibling !== f) last.parentNode.insertBefore(f, last.nextSibling);
    });
    var list = Array.prototype.slice.call(document.querySelectorAll("section.pg"));
    for (var i = 0; i < list.length; i++) {
      var cur = list[i]; if (!plain(cur) || cur.getAttribute("data-keep") === "1") continue;
      var part = cur.getAttribute("data-part");
      while (i + 1 < list.length) {
        var nx = list[i + 1];
        if (!plain(nx) || nx.getAttribute("data-part") !== part) break;
        if (pull(cur, nx)) { nx.parentNode.removeChild(nx); list.splice(i + 1, 1); continue; }
        break;
      }
      /* 남은 자리에 같은 장의 조금 뒤 쪽이 통째로 들어가면 당겨 온다. 이어지는 쪽이 제 앞 쪽을 앞지르지는 않는다 */
      var skipped = []; var j = i + 1;
      while (j < list.length && skipped.length < 4) {
        var q = list[j];
        if (!plain(q) || q.getAttribute("data-part") !== part) break;
        var base = q.getAttribute("data-base");
        var blocked = skipped.some(function (k) { return k.getAttribute("data-base") === base; });
        if (j > i + 1 && !blocked && whole(cur, q)) { q.parentNode.removeChild(q); list.splice(j, 1); continue; }
        skipped.push(q); j++;
      }
    }
    /* 남은 자리가 넓은 쪽을 그 장의 덧붙일 거리로 채운다. 들어갈 자리가 없는 거리는 싣지 않는다 */
    var pages = Array.prototype.slice.call(document.querySelectorAll("section.pg"));
    var fills = pages.filter(function (pg) { return pg.getAttribute("data-kind") === "fill"; });
    pages.forEach(function (pg) {
      if (!plain(pg) || pg.getAttribute("data-keep") === "1") return;
      var part = pg.getAttribute("data-part");
      for (var k = 0; k < fills.length && gap(pg) > 0.2; k++) {
        var f = fills[k]; if (!f.parentNode || f.getAttribute("data-part") !== part) continue;
        if (whole(pg, f)) { f.parentNode.removeChild(f); }
      }
    });
    fills.forEach(function (f) { if (f.parentNode) f.parentNode.removeChild(f); });
    /* 쓰는 칸 표(.ws)가 있는 쪽은 남은 자리를 그 표의 쓰는 줄에 나눠 준다(줄마다 20mm 까지) */
    Array.prototype.slice.call(document.querySelectorAll("section.pg")).forEach(function (pg) {
      if (!plain(pg)) return;
      var g = gap(pg); if (g <= 0.03) return;
      var ws = pg.querySelectorAll(".bd table.ws tbody tr"); if (!ws.length) return;
      var px = (g - 0.02) * bdOf(pg).getBoundingClientRect().height;
      var add = Math.min(px / ws.length, 20 * 96 / 25.4);
      ws.forEach(function (tr) { var h = tr.getBoundingClientRect().height; Array.prototype.forEach.call(tr.cells, function (c) { c.style.height = (h + add) + "px"; }); });
      if (!fits(pg)) ws.forEach(function (tr) { Array.prototype.forEach.call(tr.cells, function (c) { c.style.height = ""; }); });
    });
    /* 그림이 있는 쪽은 남은 자리만큼 그림을 키운다(원래 크기의 135% 까지) */
    Array.prototype.slice.call(document.querySelectorAll("section.pg")).forEach(function (pg) {
      if (!plain(pg)) return;
      var g = gap(pg); if (g <= 0.12) return;
      var svg = pg.querySelector(".bd .wide-art svg"); if (!svg) return;
      var r = svg.getBoundingClientRect(); if (!r.height) return;
      var px = (g - 0.05) * bdOf(pg).getBoundingClientRect().height;
      var h = Math.min(r.height * 1.8, r.height + px);
      svg.style.maxHeight = "none"; svg.style.height = h + "px"; svg.style.width = Math.min(r.width * h / r.height, svg.parentNode.getBoundingClientRect().width) + "px";
      if (!fits(pg)) { svg.style.height = ""; svg.style.width = ""; svg.style.maxHeight = ""; }
    });
    /* 조금 남은 자리(쪽 높이의 30% 까지)는 덩이 사이에 고르게 나눈다 */
    Array.prototype.slice.call(document.querySelectorAll("section.pg")).forEach(function (pg) {
      if (!plain(pg)) return;
      var g = gap(pg); if (g <= 0.02 || g > 0.4) return;
      var bd = bdOf(pg); var ss = segs(pg);
      /* 덩이 사이 하나에 본문 높이의 10% 를 넘게 벌리지 않는다 */
      if (ss.length > 1 && g / (ss.length - 1) <= 0.14) { bd.style.justifyContent = "space-between"; return; }
      var host = ss[ss.length - 1]; if (!host || g / Math.max(1, host.children.length - 1) > 0.14) return;
      host.style.flex = "1"; host.style.justifyContent = "space-between";
    });
    var all = Array.prototype.slice.call(document.querySelectorAll("section.pg"));
    all.forEach(function (pg, k) { var n = pg.querySelector(".rf-no"); if (n) n.textContent = (k + 1) + " / " + all.length; });
    document.querySelectorAll("[data-toc-part]").forEach(function (el) {
      var name = el.getAttribute("data-toc-part");
      for (var k = 0; k < all.length; k++) if (all[k].getAttribute("data-part") === name) { el.textContent = String(k + 1); break; }
    });
    document.documentElement.setAttribute("data-packed", String(all.length));
  }
  function go() { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { requestAnimationFrame(run); }); }
  if (document.readyState === "complete") go(); else window.addEventListener("load", go);
})();`;

/**
 * 지금 언어의 쪽 모으기 스크립트. 한국어는 `PACK_JS` 글자 그대로(한국어 책 HTML 이 바뀌지 않게),
 * 영어는 이어지는 쪽 머리의 ` (계속)` 만 ` (cont.)` 로 바꾼다
 */
export const packJs = (): string => (isEn() ? PACK_JS.replace(`" (계속)"`, `" (cont.)"`) : PACK_JS);

/**
 * 장 첫 쪽. `promise` 는 이 장을 왜 읽는지와 읽고 나서 무엇을 하면 되는지다.
 * `art` 가 내 결과를 그린 그래프(`role="img"`)면 `how` 에 읽는 법(`howto`)을 넘긴다. 그러면
 * 그림과 읽는 법이 나란히 선다. 뜻 없는 장식은 `aria-hidden` 으로 표시하고 `how` 를 비운다
 */
export function chapter(no: string, name: string, promise: string, inside: string[], art0: string, how = ""): Page {
  /* 읽는 법이 없는 그림은 장식이다. 화면 읽기 도구가 건너뛰게 표시한다 */
  const art = how || /role="img"/.test(art0) ? art0 : art0.replace(/<svg(?![^>]*aria-hidden)/, `<svg aria-hidden="true" focusable="false"`);
  return {
    part: no, partName: name, title: name, kind: "chapter",
    body: `<div class="ch-top"><span class="ch-k">PART</span><span class="ch-no">${no}</span></div>
      <h1 class="ch-t">${E(name)}</h1><p class="ch-p">${promise}</p>
      <div class="ch-art${how ? " ch-fig" : ""}">${how ? `<div class="ch-pic">${art}</div><div class="ch-how">${how}</div>` : art}</div>
      <div class="ch-in">${H(L("이 장에 담은 것", "In this chapter"))}${ul(inside.filter(Boolean).map(E), "ch-ls")}</div>`,
  };
}
