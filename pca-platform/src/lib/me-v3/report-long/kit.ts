/**
 * 쪽 틀과 작은 그리기 도구. 쪽마다 A4 한 장이고, 넘치면 점검 스크립트가 잡는다.
 */
import { C } from "./charts";
import type { Level } from "./types";
import { STEP_WORD, ZONE_WORD, type ZoneKey } from "./derive";

export type Page = {
  part: string; partName: string; title: string; body: string;
  kind?: "outer" | "cover" | "chapter" | "plain";
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
  ? `<span class="pp na">이번에 묻지 않음</span>`
  : `<span class="pp"><i style="background:${lv >= 1 ? LVC[Math.max(1, lv)] : C.l0}"></i><i style="background:${lv >= 2 ? LVC[lv] : C.l0}"></i><i style="background:${lv >= 3 ? LVC[3] : C.l0}"></i><em>${E(STEP_WORD[lv].tag)}</em></span>`;
export const ul = (xs: string[], cls = "") => (xs.length ? `<ul class="ls ${cls}">${xs.map((x) => `<li>${x}</li>`).join("")}</ul>` : "");
/** 쓰는 칸: 줄만 긋는다. 학생이 채운다 */
export const lines = (n: number, label?: string) => `<div class="wl">${label ? `<p class="wl-l">${label}</p>` : ""}${"<i></i>".repeat(n)}</div>`;
/** 학생 자신의 기록에서 온 글을 담는 칸 */
export const mine = (label: string, text: string) => `<div class="fl">${label ? `<p class="wl-l">${label}</p>` : ""}<p class="fl-t">${text}</p></div>`;
export const card = (inner: string, cls = "") => `<div class="card ${cls}">${inner}</div>`;
export const note = (title: string, body: string, warm = false) => `<div class="note${warm ? " warm" : ""}"><b>${title}</b>${body.startsWith("<") ? body : `<p>${body}</p>`}</div>`;
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
@font-face{font-family:"Pretendard";src:url("${fontBase}PretendardVariable.woff2") format("woff2-variations"),url("${fontBase}PretendardVariable.woff2") format("woff2");font-weight:45 920;font-style:normal;font-display:block}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#e9ecf1}
body{font-family:Pretendard,"Noto Sans CJK KR","Noto Sans KR",sans-serif;color:${C.ink};font-size:9.6pt;line-height:1.58;word-break:keep-all;overflow-wrap:break-word;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;padding:13mm 15mm 11mm;background:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;page-break-after:always;break-after:page;margin:0 auto}
@media screen{.pg{margin:0 auto 6mm;box-shadow:0 1px 6px rgba(20,38,77,.12)}}
.rh{display:flex;align-items:baseline;gap:10px;border-bottom:1.5px solid ${C.navy};padding-bottom:2.2mm;margin-bottom:5mm;font-size:8.6pt;color:${C.ink3}}
.rh-n{font-weight:800;color:#a8871c;letter-spacing:.04em}.rh-t{font-weight:700;color:${C.navy}}.rh-r{margin-left:auto}
.rf{display:flex;gap:12px;border-top:1px solid ${C.line};padding-top:2mm;margin-top:3mm;font-size:8pt;color:${C.ink3}}.rf-no{margin-left:auto;font-weight:700;color:${C.navy}}
.bd{flex:1;display:flex;flex-direction:column;gap:4.2mm;min-height:0}
.ph h1{font-size:18.5pt;line-height:1.32;margin:0;color:${C.navy};font-weight:800;letter-spacing:-.015em;text-wrap:balance}
.dek{font-size:10.4pt;color:${C.ink2};margin:2mm 0 0;line-height:1.62;text-wrap:pretty}
.sh{font-size:11pt;color:${C.navy};margin:1mm 0 -1.5mm;font-weight:800;display:flex;align-items:baseline;gap:8px}.sh span{font-size:8.6pt;color:${C.ink3};font-weight:500}
h4{font-size:10.8pt;margin:0 0 1.5mm;color:${C.ink};font-weight:700;line-height:1.4;text-wrap:balance}
p{margin:0}p,li,td,dd{text-wrap:pretty}.nw{white-space:nowrap;font-style:normal}.k{font-size:8.4pt;color:${C.blue};font-weight:700;margin-bottom:1mm;letter-spacing:.01em}.mut{color:${C.ink3}}.sm{font-size:8.6pt}.big{font-size:10.8pt;line-height:1.65;color:${C.ink}}
.two{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.two.r64{grid-template-columns:1.25fr 1fr}.two.r46{grid-template-columns:.85fr 1.15fr;align-items:center}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.g2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.card{border:1px solid ${C.line};border-radius:6px;padding:4mm;background:#fff}.card.cen{display:flex;flex-direction:column;align-items:center;gap:2mm;text-align:center}.card.cen svg{max-width:100%}
.note{border-left:3px solid ${C.blue};background:#f5f8fe;padding:3mm 3.6mm;border-radius:0 5px 5px 0}.note b{display:block;color:${C.navy};margin-bottom:1mm;font-size:9.8pt}.note.warm{border-color:${C.amber};background:#fdf7ec}
.band{margin-top:auto;display:flex;gap:4mm;align-items:baseline;background:#eef3fc;border-radius:6px;padding:3.2mm 4mm;font-size:9.3pt}.band b{color:${C.navy};white-space:nowrap}
.ls{margin:0;padding-left:4.5mm}.ls li{margin:.6mm 0}
.tag{display:inline-block;color:#fff;background:${C.navy};border-radius:999px;padding:.3mm 2.4mm;font-size:8.2pt;font-weight:700;white-space:nowrap}
.ztag{display:inline-flex;align-items:center;gap:1.6mm;font-size:8.6pt;font-weight:700;color:${C.ink2};white-space:nowrap}.ztag::before{content:"";width:3mm;height:3mm;border-radius:2px;background:var(--z)}
.dot{display:inline-block;width:2.4mm;height:2.4mm;border-radius:50%;margin:0 1.4mm 0 1mm;vertical-align:middle}
.pp{display:inline-flex;align-items:center;gap:1px;white-space:nowrap}.pp i{width:3.2mm;height:3.2mm;border-radius:1.5px;display:inline-block}.pp em{font-style:normal;font-size:8.3pt;color:${C.ink2};margin-left:1.6mm}.pp.na{font-size:8.1pt;color:${C.ink3};border:1px dashed ${C.line};border-radius:3px;padding:0 1.6mm}
.tb{width:100%;border-collapse:collapse;font-size:9pt}.tb th,.tb td{border-bottom:1px solid ${C.line2};padding:1.6mm 2mm;text-align:left;vertical-align:top}.tb thead th{font-size:8.4pt;color:${C.ink3};font-weight:700;border-bottom:1.5px solid ${C.line}}
.tb tbody th{color:${C.navy};font-weight:700;width:1%;white-space:nowrap}.tb-s{font-size:8.7pt}.tb-xs{font-size:8.3pt}.tb-xs td,.tb-xs th{padding:1.1mm 1.6mm}.tb td.c{text-align:center}
.w34{width:34%}.w30{width:30%}.w24{width:24%}.w22{width:22%}.w18{width:18%}
.ws td{height:9.5mm;border:1px solid ${C.line};vertical-align:middle}.ws th{border:1px solid ${C.line};background:#f7f8fa;width:26%;white-space:normal}.ws.tall td{height:15mm}.ws.wk td{height:21mm}.ws.wk{table-layout:fixed}.ws.big td{height:13mm}
.wide-art{display:flex;justify-content:center}.wide-art svg{max-height:120mm}.ring-art svg{max-height:96mm}
.radar-big{display:flex;justify-content:center;margin:-2mm 0}.radar-big svg{width:168mm}
.lg{display:flex;flex-wrap:wrap;gap:2mm 5mm;justify-content:center;font-size:8.6pt;color:${C.ink2}}.lg i{display:inline-block;width:3.2mm;height:3.2mm;border-radius:2px;margin-right:1.4mm;vertical-align:-.4mm}.lg i.thin{height:1.4mm;vertical-align:.4mm}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm}
.kpi{border:1px solid ${C.line};border-radius:6px;padding:3.2mm 4mm;border-top:3px solid ${C.navy}}.kpi p{font-size:8.6pt;color:${C.ink3};font-weight:600}.kpi b{display:block;font-size:24pt;line-height:1.15;color:${C.navy};font-weight:800;margin:1mm 0}.kpi b small{font-size:10pt;margin-left:1mm;color:${C.ink3}}.kpi span{font-size:8.4pt;color:${C.ink2}}
.pts{display:flex;flex-direction:column;gap:3.4mm}.pt{display:flex;gap:4mm;border:1px solid ${C.line};border-radius:6px;padding:3.4mm 4mm}.pt-n{font-size:22pt;font-weight:800;color:#a8871c;line-height:1;min-width:8mm}
.pt h4{font-size:10.6pt}.pt-a{margin-top:1.4mm;font-size:9.1pt}.pt-a b{color:${C.teal}}.pt-l{font-size:8.4pt;color:${C.ink3};margin-top:.8mm}
.chips{display:flex;flex-wrap:wrap;gap:1.8mm}.chips span{border:1px solid ${C.line};border-radius:999px;padding:.8mm 3mm;font-size:8.7pt;background:#fafbfc}.chips.art span{border-color:${C.navy};color:${C.navy};font-weight:700;background:#eef2fa}
.steps4{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.st4{border:1px solid ${C.line};border-radius:6px;padding:3mm}.st4-b{display:flex;gap:1.2mm;margin-bottom:2mm}.st4-b i{flex:1;height:3.4mm;border-radius:2px}.st4 b{font-size:10pt;color:${C.navy}}.st4 p{font-size:8.6pt;color:${C.ink2};margin-top:1mm}
.zones5{display:grid;grid-template-columns:1fr 1fr;gap:2.6mm 5mm}.zn{display:flex;gap:3mm;align-items:flex-start}.zsw{width:5mm;height:5mm;border-radius:3px;flex:none;margin-top:.6mm}.zn p{font-size:8.6pt;color:${C.ink2}}
.flow5{display:grid;grid-template-columns:repeat(5,1fr);gap:2.6mm}.flow5.f4{grid-template-columns:repeat(4,1fr)}.f5{border:1px solid ${C.line};border-top:3px solid ${C.blue};border-radius:5px;padding:2.8mm}.f5-t{font-size:8.4pt;color:${C.blue};font-weight:800}.f5 b{display:block;color:${C.navy};margin:.6mm 0}.f5 p{font-size:8.6pt;color:${C.ink2}}
.qs{margin:0;padding-left:5mm;display:flex;flex-direction:column;gap:2mm}.qs li{font-size:10pt;line-height:1.55}
.toc{display:flex;flex-direction:column}.toc-r{display:flex;gap:6mm;align-items:baseline;border-bottom:1px solid ${C.line2};padding:3.1mm 0}.toc-n{font-size:21pt;font-weight:800;color:#a8871c;width:16mm}.toc-b{flex:1}.toc-b b{display:block;font-size:12.6pt;color:${C.navy}}.toc-b span{font-size:8.6pt;color:${C.ink3}}.toc-p{font-size:12.6pt;font-weight:800;color:${C.navy}}
.dh{display:flex;gap:5mm;align-items:center}.dh-n{font-size:30pt;font-weight:800;color:#a8871c;line-height:1}.dh h1{font-size:18pt;margin:0;color:${C.navy};font-weight:800;line-height:1.25}.dh-t{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:1mm;font-size:8.6pt;text-align:right}
.wf{margin:0;padding:0;list-style:none;counter-reset:w;display:grid;grid-template-columns:5mm 27mm 1fr;gap:1.3mm 2.6mm;font-size:8.7pt;align-items:baseline}.wf li{display:contents}.wf li::before{counter-increment:w;content:counter(w);font-weight:800;color:${C.blue}}.wf b{color:${C.navy}}.wf span{color:${C.ink2}}
.wf2{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,auto);grid-auto-flow:column;gap:1.5mm 6mm}.wf2-i{display:grid;grid-template-columns:4.5mm 1fr;gap:1.2mm;font-size:8.5pt;line-height:1.5}.wf2-i>span{font-weight:800;color:${C.blue}}.wf2-i b{color:${C.navy};margin-right:1.6mm}.wf2-i p{color:${C.ink2}}
.b4{border-top:3px solid var(--c);background:#f7f9fc;border-radius:0 0 5px 5px;padding:2.4mm 3mm}.b4 b{display:block;color:var(--c);font-size:9.6pt}.b4 p{font-size:8.6pt;color:${C.ink2};margin-top:.8mm}
.est3{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;width:100%;margin-top:1mm}.est3 div{background:#f2f5fb;border-radius:5px;padding:1.6mm 1mm;text-align:center}.est3 span{display:block;font-size:8pt;color:${C.ink3}}.est3 b{font-size:10pt;color:${C.navy}}
.na-box{border:1.5px dashed ${C.line};border-radius:8px;padding:6mm;text-align:center;color:${C.ink2};width:100%}.na-box b{display:block;color:${C.navy};margin-bottom:2mm}
.rec{border-left:4px solid var(--c);padding:2.4mm 3.6mm;background:#fafbfc;border-radius:0 6px 6px 0}.rec-h{display:flex;flex-direction:column;gap:.4mm;margin-bottom:1.6mm}.rec-h b{color:${C.navy};font-size:10.2pt}.rec-h span{font-size:8.4pt;color:${C.ink3}}
.wl{display:flex;flex-direction:column;gap:0}.wl i{display:block;height:7.6mm;border-bottom:1px dashed #c3c9d4}.wl-l{font-size:8.6pt;color:${C.ink3};font-weight:600}
.lo{margin:0;padding-left:5mm;display:flex;flex-direction:column;gap:1.6mm}.lo li b{display:block;color:${C.navy}}.lo li span{font-size:8.8pt;color:${C.ink2}}.lo.big li{font-size:10pt}.lo.big li span{font-size:9.3pt}
.prose{display:flex;flex-direction:column;gap:3mm}.pr{display:grid;grid-template-columns:24mm 1fr;gap:4mm;border-bottom:1px solid ${C.line2};padding-bottom:3mm}.pr-n{font-weight:800;color:${C.blue};font-size:9.6pt}.pr p{font-size:10pt;line-height:1.68}
.story{border:1px solid ${C.line};border-radius:6px;padding:3.4mm}.story-h{display:flex;justify-content:space-between;gap:4mm;margin-bottom:2mm}.story-h b{color:${C.navy}}.story-h span{font-size:8.4pt;color:${C.ink3};text-align:right}
.story-g{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}.sp{background:#f2f6fd;border-radius:5px;padding:2.4mm;font-size:8.7pt}.sp.empty{background:#fff;border:1.5px dashed ${C.line}}.sp.empty p:last-child{color:${C.ink3}}
.frame{border:1px solid ${C.line};border-radius:6px;padding:4mm 5mm;display:flex;flex-direction:column;gap:2.4mm;font-size:10.2pt;line-height:1.75}.frame u{text-decoration:none;border-bottom:1.5px solid ${C.amber};color:${C.ink}}.frame .blank{display:inline-block;min-width:38mm;border-bottom:1px dashed #9aa3b2}.fb{font-weight:800;color:${C.blue};margin-right:1mm}
.qa{border:1px solid ${C.line};border-radius:6px;padding:3mm 3.6mm}.qa-q{display:flex;gap:3mm;align-items:baseline;margin-bottom:1.6mm}.qa-q span{font-weight:800;color:${C.blue};white-space:nowrap;font-size:9pt}.qa-q b{font-size:10.2pt;color:${C.navy};line-height:1.45}.qa-b{font-size:8.7pt;gap:3mm}
.cb{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1.8mm}.cb li{display:flex;gap:2.4mm;align-items:flex-start}.cb i{width:3.8mm;height:3.8mm;border:1.4px solid ${C.ink3};border-radius:2px;flex:none;margin-top:.6mm}
.prio{border:1px solid ${C.line};border-radius:6px;padding:3mm 3.6mm;display:flex;flex-direction:column;gap:2mm}.prio-h{display:flex;gap:3mm;align-items:center}.prio-h>span:first-child{font-size:16pt;font-weight:800;color:#a8871c}.prio-h b{font-size:10.6pt;color:${C.navy}}.prio-h .mut{margin-left:auto;font-size:8.6pt;white-space:nowrap}
.quote{font-size:8.9pt;line-height:1.62;color:${C.ink2};border-left:2px solid ${C.line};padding-left:3mm}
.dl{display:grid;grid-template-columns:34mm 1fr;gap:3.6mm 6mm;margin:0;font-size:9.8pt;line-height:1.6}.dl dt{font-weight:800;color:${C.navy}}.dl dd{margin:0;color:${C.ink2}}
.close-box{background:${C.navy};color:#fff;border-radius:8px;padding:6mm}.close-box .k{color:#e6c766}.close-box h3{margin:1mm 0 2mm;font-size:15pt}.close-box p{color:#dbe4f5}
.fl{display:flex;flex-direction:column;gap:1mm}.fl-t{border-left:3px solid ${C.amber};background:#fdf7ec;border-radius:0 5px 5px 0;padding:2.4mm 3.4mm;font-size:9.4pt;line-height:1.65;color:${C.ink}}
.sj{font-size:7.9pt}.sj td,.sj th{padding:.85mm 1.6mm}.sj tr.sj-g td{background:#f2f5fb;border-top:1.5px solid ${C.line};padding:1.8mm 2mm}.sj-g b{display:block;color:${C.navy};font-size:9pt}.sj-g span{display:block;color:${C.ink2};margin-top:.4mm}.sj-g em{display:block;font-style:normal;color:${C.teal};font-weight:700;margin-top:.4mm}
.sj-l{display:inline-block;font-size:7pt;color:#fff;background:${C.blue};border-radius:999px;padding:0 1.6mm;margin-left:1mm;vertical-align:1px}
.sj-c{border-top:1px solid ${C.line};padding-top:2mm}.sj-ch b{color:${C.navy};margin-right:2mm}.sj-ch span{color:${C.ink2};font-size:8.6pt}.sj-cl{font-size:8pt;line-height:1.7;color:${C.ink};margin-top:1mm}
/* 장 표지 */
.pg.chap{background:${C.navy};color:#fff}.pg.chap .rf{color:#9fb0cf;border-color:#2c406b}.pg.chap .rf-no{color:#fff}
.ch-top{display:flex;align-items:baseline;gap:4mm;margin-top:12mm}.ch-k{font-size:11pt;letter-spacing:.32em;color:#e6c766;font-weight:700}.ch-no{font-size:96pt;font-weight:800;line-height:.9;color:#fff;letter-spacing:-.04em}
.ch-t{font-size:29pt;margin:5mm 0 3mm;font-weight:800;color:#fff;letter-spacing:-.015em}.ch-p{font-size:11.6pt;line-height:1.7;color:#d5def0;max-width:150mm}
.ch-art{margin:8mm 0 4mm;max-height:90mm;overflow:hidden;display:flex;justify-content:center;opacity:.95}.ch-art svg{width:104mm}
.pg.chap .ch-art svg text{fill:#fff!important}
.ch-in{margin-top:auto;border-top:1px solid #34497a;padding-top:5mm}.ch-in .sh{color:#e6c766}.ch-in .ls li{color:#d5def0;font-size:10.2pt}
/* 표지 */
.pg.cover{padding:16mm 17mm 14mm;background:#fff}
.cv-top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid ${C.navy};padding-bottom:3mm}.cv-org{font-size:15pt;font-weight:800;color:${C.navy}}.cv-s{font-size:9pt;color:${C.ink3}}
.cv-mid{margin-top:9mm}.cv-k{font-size:10pt;color:#a8871c;font-weight:800;letter-spacing:.06em}.cv-t{font-size:27pt;line-height:1.3;margin:3mm 0 4mm;color:${C.navy};font-weight:800}.cv-d{font-size:10.8pt;line-height:1.68;color:${C.ink2};max-width:164mm}
.cv-art{display:flex;justify-content:center;margin-top:3mm}.cv-art svg{width:140mm}.cv-legend{display:flex;flex-wrap:wrap;gap:3mm 6mm;justify-content:center;font-size:9pt;color:${C.ink2};margin-top:-2mm}.cv-legend i{display:inline-block;width:3.4mm;height:3.4mm;border-radius:2px;margin-right:1.6mm;vertical-align:-.5mm}
.cv-meta{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin:5mm -17mm 0;padding:5mm 17mm 4mm;background:#f2f5fb}.cv-meta div{border-top:1px solid ${C.line};padding-top:2mm}.cv-meta span{display:block;font-size:8.4pt;color:${C.ink3}}.cv-meta b{font-size:10.2pt;color:${C.ink}}
.cv-foot{position:absolute;left:17mm;right:17mm;bottom:12mm;font-size:8.6pt;color:${C.ink2};border:1px solid ${C.line};background:#fff;border-radius:6px;padding:3mm 4mm}.cv-foot b{color:${C.rose};margin-right:2mm}
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

/** 쪽 하나를 틀에 담는다 */
export function shell(p: Page, i: number, total: number, ctx: { issuer: string; major: string; tier: string; person: string; answeredOn: string }): string {
  if (p.kind === "outer") return `<section class="pg outer" data-title="${E(p.title)}">${p.body}</section>`;
  if (p.kind === "cover") return `<section class="pg cover" data-title="${E(p.title)}">${p.body}</section>`;
  const head = p.kind === "chapter" ? "" : `<header class="rh"><span class="rh-n">${p.part ? `PART ${p.part}` : ""}</span><span class="rh-t">${E(p.partName)}</span><span class="rh-r">${E(ctx.issuer)} · 진로 분석 리포트</span></header>`;
  const foot = `<footer class="rf"><span>CareerMatri · ${E(ctx.major)} · ${E(ctx.tier)}</span><span>${E(ctx.person)} 님 · ${E(ctx.answeredOn)} 응답</span><span class="rf-no">${i + 1} / ${total}</span></footer>`;
  return `<section class="pg ${p.kind === "chapter" ? "chap" : ""}" data-title="${E(p.title)}">${head}<div class="bd">${p.body}</div>${foot}</section>`;
}

export function chapter(no: string, name: string, promise: string, inside: string[], art: string): Page {
  return {
    part: no, partName: name, title: name, kind: "chapter",
    body: `<div class="ch-top"><span class="ch-k">PART</span><span class="ch-no">${no}</span></div>
      <h1 class="ch-t">${E(name)}</h1><p class="ch-p">${promise}</p>
      <div class="ch-art">${art}</div>
      <div class="ch-in">${H("이 장에 담은 것")}${ul(inside.map(E))}</div>`,
  };
}
