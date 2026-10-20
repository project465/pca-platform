/**
 * **BIZ 진로·직무 전략 리포트 4차 2판 렌더러.** 매거진형 쪽 문법: 큰 장 번호 · 명조 제목 · 넓은 여백 ·
 * 비대칭 격자 · 한 쪽 한 메시지. 박스를 늘어놓지 않고 큰 덩어리 하나와 선으로 나눈다.
 *
 * 글꼴 둘: 제목은 Noto Serif KR(OFL), 본문은 Pretendard(OFL). 둘 다 `var/pdf-gm/fonts` 에 묶는다.
 * 줄여 맞추지 않는다(넘치면 검사가 실패한다). 8.5pt 아래 글자를 쓰지 않는다.
 */
import { withJosa } from "../result/josa";
import { STEP, UNASKED, JUDGE } from "./words";
import type { Ed8 } from "./editorial8";
import type { DnaDomain, Line } from "./editorial";

export type Fonts8 = { sans: string; serif: string };
export type Page8 = { key: string; sec: string; secName: string; title: string; html: string };

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LV = (n: number | null) => (n === null ? UNASKED : STEP[n as 0 | 1 | 2 | 3].tag);

const CSS = (f: Fonts8) => `
@font-face{font-family:P;src:url("${f.sans}/Pretendard-Regular.otf");font-weight:400}
@font-face{font-family:P;src:url("${f.sans}/Pretendard-Medium.otf");font-weight:500}
@font-face{font-family:P;src:url("${f.sans}/Pretendard-SemiBold.otf");font-weight:600}
@font-face{font-family:P;src:url("${f.sans}/Pretendard-Bold.otf");font-weight:700}
@font-face{font-family:S;src:url("${f.serif}/NotoSerifKR-Medium.otf");font-weight:500}
@font-face{font-family:S;src:url("${f.serif}/NotoSerifKR-SemiBold.otf");font-weight:600}
@font-face{font-family:S;src:url("${f.serif}/NotoSerifKR-Bold.otf");font-weight:700}
:root{--paper:#faf8f3;--ink:#17191d;--ink2:#3a3d44;--mute:#73767e;--rule:#d6cfc2;--rule2:#e7e1d6;--navy:#1d2b48;--navyt:#e8ebf1;--acc:#a8471b;--sand:#f0eadf}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:var(--ink);font-family:P,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{word-break:keep-all;overflow-wrap:break-word}
.pg{width:210mm;height:297mm;padding:14mm 16mm 12mm 18mm;background:var(--paper);display:flex;flex-direction:column;page-break-after:always;overflow:hidden;position:relative}
.top{display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:4mm;border-bottom:.5pt solid var(--rule);padding-bottom:2.6mm;margin-bottom:10mm}
.top .no{font-family:S;font-weight:700;font-size:30pt;line-height:.82;color:var(--navy)}
.top .ch{font-size:9pt;font-weight:600;color:var(--ink2);padding-bottom:.6mm}
.top .run{font-size:8.5pt;color:var(--mute);padding-bottom:.6mm}
.bd{flex:1;min-height:0;position:relative;display:flex;flex-direction:column}
.foot{display:flex;justify-content:space-between;font-size:8.5pt;color:var(--mute);padding-top:3mm}
p{margin:0 0 2.4mm;font-size:10.5pt;line-height:1.62}
.hl{font-family:S;font-weight:700;font-size:25pt;line-height:1.32;margin:0 0 4.5mm;max-width:158mm;color:var(--ink)}
.hl.xl{font-size:30pt}
.dk{font-size:12pt;line-height:1.62;font-weight:500;color:var(--ink2);margin:0 0 9mm;max-width:146mm}
.lab{font-size:9pt;font-weight:600;color:var(--navy);margin:0 0 2.6mm;padding-bottom:1.8mm;border-bottom:1pt solid var(--navy)}
.cap{font-size:9pt;line-height:1.55;color:var(--mute)}
.src{font-size:8.5pt;color:var(--mute)}
.sm{font-size:9.8pt;line-height:1.58}
.ag{display:grid;grid-template-columns:50mm 1fr;gap:10mm}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10mm}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8mm}
.pq{font-family:S;font-weight:600;font-size:16pt;line-height:1.55;border-left:2.2pt solid var(--acc);padding:1mm 0 1mm 6mm;margin:0;color:var(--ink)}
.band{background:var(--sand);padding:7mm 8mm 6mm;margin-left:-18mm;margin-right:-16mm;padding-left:18mm;padding-right:16mm}
.band.n{background:var(--navy);color:#f3f1ec}
.band.n .src,.band.n .cap{color:#b9bfcc}
.num{font-family:S;font-weight:700;color:var(--acc);line-height:1}
.ln{display:grid;grid-template-columns:1fr 22mm;gap:3mm;border-bottom:.5pt solid var(--rule2);padding:2.4mm 0;font-size:10pt;line-height:1.52}
.ln .s{font-size:8.5pt;color:var(--mute);text-align:right;padding-top:.4mm}
.sp{flex:1 0 7mm}
.wl{border-bottom:.5pt dotted #a99f8f;height:8.5mm}
.ws .row{display:grid;grid-template-columns:12mm 40mm 1fr;gap:5mm;border-bottom:.5pt solid var(--rule2);padding:2.6mm 0 1mm;align-items:start}
.ws .row .n{font-family:S;font-weight:700;color:var(--acc);font-size:14pt}
.ws .row .f{font-size:10pt;font-weight:600;padding-top:1mm}
.hl{text-wrap:balance}
.board.dense .it b{font-size:11pt}
.board.dense .it{padding:2.4mm 0 2.6mm}
.board.dense .num{font-size:30pt}
/* 표지 */
.cv{height:100%;display:flex;flex-direction:column;padding:16mm 16mm 0 18mm}
.cv .meta{font-size:9pt;color:var(--mute);display:flex;justify-content:space-between;border-bottom:.5pt solid var(--rule);padding-bottom:3mm}
.cv .kick{font-size:9.5pt;font-weight:600;color:var(--acc);margin:26mm 0 5mm}
.cv .t{font-family:S;font-weight:700;font-size:34pt;line-height:1.3;margin:0 0 8mm;max-width:165mm}
.cv .sub{font-size:13pt;line-height:1.65;color:var(--ink2);max-width:150mm;font-weight:500}
.cv .bandc{margin-top:auto;margin-left:-18mm;margin-right:-16mm;background:var(--navy);color:#f3f1ec;padding:11mm 16mm 12mm 18mm}
.cv .bandc .lab{color:#f3f1ec;border-color:#5b6680}
.cv .bandc .k{font-size:9pt;color:#b9bfcc;margin-bottom:2mm}
.cv .bandc .v{font-family:S;font-weight:600;font-size:14pt;line-height:1.45}
.cv .bandc .num{color:#e3a27f;font-size:22pt;margin-bottom:3mm}
.cv .bot{display:flex;justify-content:space-between;font-size:8.5pt;color:#b9bfcc;margin-top:9mm;border-top:.5pt solid #3f4a64;padding-top:3mm}
/* 차례 */
.toc{display:grid;grid-template-columns:52mm 1fr;gap:10mm;flex:1}
.toc .big{font-family:S;font-weight:700;font-size:44pt;line-height:1;color:var(--navy)}
.toc .row{display:grid;grid-template-columns:16mm 1fr 10mm;gap:4mm;align-items:baseline;border-bottom:.5pt solid var(--rule2);padding:3.4mm 0}
.toc .row .n{font-family:S;font-weight:700;font-size:17pt;color:var(--acc)}
.toc .row b{font-size:12pt;display:block;margin-bottom:.8mm}
.toc .row .pg2{font-size:10pt;color:var(--mute);text-align:right}
/* 세 칸 큰 항목 */
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9mm;border-top:1pt solid var(--ink);padding-top:5mm}
.three .num{font-size:36pt;margin-bottom:3mm}
.three .k{font-size:9pt;color:var(--mute);margin-bottom:1.6mm}
.three .v{font-family:S;font-weight:600;font-size:14.5pt;line-height:1.45}
/* 강점 */
.st{display:grid;grid-template-columns:24mm 1fr 52mm;gap:7mm;border-top:1pt solid var(--ink);padding:6mm 0 7mm}
.st .num{font-size:44pt}
.st .t{font-family:S;font-weight:700;font-size:17pt;line-height:1.4;margin:0 0 2.4mm}
/* 일하는 방식 */
.sty .row{display:grid;grid-template-columns:44mm 1fr 46mm;gap:6mm;align-items:center;border-bottom:.5pt solid var(--rule2);padding:2.7mm 0}
.sty .nm{font-size:10.5pt;font-weight:600}
.sty .bar{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4mm;height:5.5mm}
.sty .bar i{display:block;background:var(--rule2)}
.sty .bar i.on{background:var(--navy)}
.sty .bar i.top{background:var(--acc)}
.sty .un{font-size:9pt;color:var(--mute);font-style:normal}
.scale{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4mm;font-size:8.5pt;color:var(--mute);margin-left:50mm;margin-right:52mm}
/* 두 직무 */
.vs{display:grid;grid-template-columns:1fr 1fr;border-top:1pt solid var(--ink)}
.vs>div{padding:5mm 7mm 3mm 0}
.vs>div+div{padding-left:7mm;border-left:.5pt solid var(--rule)}
.vs .nm{font-family:S;font-weight:700;font-size:24pt;line-height:1.2;margin:0 0 1mm}
.vs .tag{font-size:9pt;font-weight:600;color:var(--acc);margin-bottom:3mm}
.vs dl{margin:0;display:grid;grid-template-columns:20mm 1fr;gap:2.2mm 4mm;font-size:9.8pt;line-height:1.55}
.vs dt{font-size:8.5pt;color:var(--mute);padding-top:.5mm}
.vs dd{margin:0}
/* 장면 */
.sc .row{display:grid;grid-template-columns:16mm 1fr 52mm;gap:6mm;border-top:.5pt solid var(--rule);padding:4.2mm 0}
.sc .row:first-child{border-top:1pt solid var(--ink)}
.sc .num{font-size:22pt}
.sc .ph{font-weight:700;font-size:11pt;margin-bottom:1.4mm}
.sc .scene{font-family:S;font-weight:500;font-size:11.2pt;line-height:1.65}
.sit{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8mm;border-top:1pt solid var(--ink);padding-top:4mm}
.sit .w{font-size:9pt;color:var(--mute);margin-bottom:2mm}
.sit .d{font-family:S;font-weight:600;font-size:12.5pt;line-height:1.55}
.org{display:grid;grid-template-columns:1fr 1fr;gap:4mm 10mm}
.org div{border-top:.5pt solid var(--rule);padding-top:2.4mm}
.org b{font-size:10pt;display:block;margin-bottom:1mm}
/* 프로젝트 */
.steps{counter-reset:s;margin:0;padding:0;list-style:none;border-top:1pt solid var(--ink)}
.steps li{counter-increment:s;display:grid;grid-template-columns:14mm 1fr;gap:5mm;border-bottom:.5pt solid var(--rule2);padding:3.4mm 0;font-size:11pt;line-height:1.55}
.steps li::before{content:counter(s,decimal-leading-zero);font-family:S;font-weight:700;color:var(--acc);font-size:15pt;line-height:1.1}
.chk{margin:0;padding:0;list-style:none;font-size:10pt;line-height:1.6}
.chk li{padding:1.6mm 0;border-bottom:.5pt solid var(--rule2)}
.chk li::before{content:"□  ";color:var(--mute)}
.wk{display:grid;grid-template-columns:repeat(4,1fr);gap:6mm;border-top:1pt solid var(--ink);padding-top:4mm}
.wk .num{font-size:24pt;margin-bottom:2mm}
/* 포트폴리오 */
.pf{display:grid;grid-template-columns:18mm 1fr 58mm;gap:6mm;border-top:1pt solid var(--ink);padding:5mm 0 6mm}
.pf .num{font-size:30pt}
.pf .t{font-family:S;font-weight:700;font-size:16pt;margin:0 0 1.4mm}
.pf .stt{font-size:9pt;font-weight:600;color:var(--navy)}
.pf .stt.new{color:var(--acc)}
/* 자기소개서 */
.draft{font-family:S;font-weight:500;font-size:15pt;line-height:2.05;margin:0}
.draft .b{background:var(--navyt);color:var(--navy);padding:.4mm 1.6mm;font-family:P;font-weight:600;font-size:11.5pt;border-bottom:1.2pt solid var(--navy)}
/* 면접 */
.iv .row{display:grid;grid-template-columns:1fr 1fr;gap:2mm 9mm;border-top:.5pt solid var(--rule);padding:3.4mm 0}
.iv .row:first-child{border-top:1pt solid var(--ink)}
.iv .q{font-family:S;font-weight:600;font-size:12.5pt;line-height:1.5;grid-column:1/-1;margin-bottom:1mm}
.iv .gap{color:var(--acc);font-weight:600}
/* 90일 */
.board{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8mm}
.board .col{border-top:1pt solid var(--ink);padding-top:3mm}
.board .col .num{font-size:40pt;color:var(--navy)}
.board .col.now .num{color:var(--acc)}
.board .wh{font-size:9pt;color:var(--mute);margin:1mm 0 4mm}
.board .it{border-top:.5pt solid var(--rule2);padding:3mm 0 3.6mm}
.board .it b{display:block;font-family:S;font-weight:700;font-size:12pt;line-height:1.45;margin-bottom:1.6mm}
/* 지도 */
.mx{width:100%;border-collapse:collapse}
.mx th,.mx td{text-align:left;vertical-align:top;font-size:9pt;line-height:1.45;padding:1.8mm 2mm;border-bottom:.5pt solid var(--rule2)}
.mx th{font-size:8.5pt;color:var(--mute);font-weight:600;border-bottom:.8pt solid var(--ink2)}
.mx td{height:10.5mm}
.mx td.rh{width:30mm;font-size:8.5pt;font-weight:600;color:var(--ink2)}
.mx td.un{background:repeating-linear-gradient(135deg,transparent 0 3px,#ebe5da 3px 4px);color:var(--mute)}
.mx .tg{color:var(--acc);font-weight:700}
.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:0 6mm;border-top:1pt solid var(--ink)}
.flow div{padding:3.2mm 0 4mm;border-bottom:.5pt solid var(--rule2);font-size:9.5pt;line-height:1.5}
.flow .n{font-family:S;font-weight:700;font-size:16pt;color:var(--navy)}
.flow b{display:block;font-size:10pt;margin:1mm 0}
.flow .c{font-size:8.5pt;font-weight:700}
.c.strong{color:var(--navy)} .c.partial{color:var(--ink2)} .c.none{color:var(--acc)}
`;

const lines = (xs: Line[]) => xs.map((x) => `<div class="ln"><div>${h(x.text)}</div><div class="s">${h(x.src)}</div></div>`).join("");

function frame(sec: string, name: string, run: string, body: string): string {
  /* 아래로 붙일 덩어리 앞에 늘어나는 빈칸 하나(최소 7mm). 인라인 margin-top 은 지운다 */
  body = body.replace(/<(div|p) class="([^"]*)\bpush\b([^"]*)"( style="[^"]*")?/g, (_m, tag, a, b, st) => `<div class="sp"></div><${tag} class="${a}${b}"${st ? st.replace(/margin-top:[^;"]*;?/, "") : ""}`);
  return `<div class="top"><span class="no">${sec}</span><span class="ch">${h(name)}</span><span class="run">${h(run)}</span></div><div class="bd">${body}</div><div class="foot"><span>CareerMatri 진로·직무 전략 리포트</span><span class="pn"></span></div>`;
}

function cover(e: Ed8): string {
  return `<div class="cv"><div class="meta"><span>${h(e.who.school)} · ${h(e.who.department)} · ${h(e.who.specialization)}</span><span>${h(e.who.answeredOn)} 응답</span></div>
<p class="kick">진로·직무 전략 리포트</p><h1 class="t">${h(e.verdict.head)}</h1><p class="sub">${h(e.close)}</p>
<div class="bandc"><p class="lab">이 리포트에서 가져갈 세 가지</p><div class="g3">${e.takeaways.map((t, i) => `<div><div class="num">${i + 1}</div><div class="k">${h(t.k)}</div><div class="v">${h(t.v)}</div></div>`).join("")}</div>
<div class="bot"><span>학생이 고른 응답과 직접 적은 경험 기록으로 만들었습니다. 점수와 순위는 만들지 않았습니다.</span><span>CareerMatri</span></div></div></div>`;
}

type Toc = { no: string; name: string; promise: string; page: number }[];
function contents(toc: Toc): string {
  return `<div class="toc"><div><div class="big">차례</div><p class="cap" style="margin-top:6mm">한 쪽에 한 가지만 다룹니다. 먼저 01과 02를 읽고, 바로 쓸 것은 07~09에 있습니다.</p></div>
<div>${toc.map((t) => `<div class="row"><span class="n">${t.no}</span><span><b>${h(t.name)}</b><span class="sm" style="color:var(--ink2)">${h(t.promise)}</span></span><span class="pg2">${t.page}</span></div>`).join("")}</div></div>`;
}

function glance(e: Ed8): string {
  return `<h2 class="hl">이 리포트에서 바로 가져가야 할 것은 세 가지입니다.</h2><p class="dk">${h(e.verdict.sub)}</p>
<div class="three">${e.takeaways.map((t, i) => `<div><div class="num">${i + 1}</div><div class="k">${h(t.k)}</div><div class="v">${h(t.v)}</div><div class="src" style="margin-top:2mm">${h(t.src)}</div></div>`).join("")}</div>
<div class="g2 push" style="margin-top:12mm"><div><p class="lab">응답과 기록으로 확인된 것</p>${lines(e.verdict.have)}</div><div><p class="lab">아직 모르는 것</p>${lines(e.verdict.unknown)}</div></div>`;
}

function job(e: Ed8): string {
  const t = e.versus.a; const f = e.first;
  return `<p class="cap" style="margin-bottom:2mm">먼저 볼 직무</p><h2 class="hl xl" style="font-size:40pt;margin-bottom:3mm">${h(t.name)}</h2><p class="dk">${h(t.guide.line)}</p>
<div class="ag"><div><p class="lab">이 직무가 정하는 것</p>${t.guide.cycle.map((c) => `<p class="sm" style="margin:0 0 2.2mm">${h(c.decide)}</p>`).join("")}<p class="src">일반 직무 안내</p>
<p class="lab" style="margin-top:6mm">공고에서 부르는 말</p><p class="sm">${t.guide.posting.map(h).join("<br>")}</p></div>
<div><p class="pq">${h(e.versus.call)}</p><div style="margin:6mm 0 0">${e.versus.why.map((w) => `<p>${h(w)}</p>`).join("")}<p class="src">응답 확인</p></div>
${e.goal.context ? `<p class="sm" style="margin-top:4mm">검사에서 고른 산업·조직 유형은 ‘${h(e.goal.context)}’입니다.</p>` : ""}</div></div>
<div class="band push" style="margin-top:9mm"><p class="lab" style="border-color:var(--acc);color:var(--acc)">첫 행동 · ${h(f.when)}</p><p style="font-family:S;font-weight:700;font-size:16pt;line-height:1.45;margin:0 0 2mm">${h(f.title)}</p>
<div class="g2"><p class="sm" style="margin:0">${h(f.where)} ${h(f.task)}</p><p class="sm" style="margin:0"><b>남길 것</b> ${h(f.output)}<br><b>다 됐는지</b> ${h(f.check)}</p></div><p class="src" style="margin:2mm 0 0">분석 제안</p></div>`;
}

function strengths(e: Ed8): string {
  return `<h2 class="hl">${h(e.label.strengths)}</h2><p class="dk">${h(e.label.deck)}</p>
${e.strengths.map((s) => `<div class="st"><div class="num">${s.no}</div><div><p class="t">${h(s.title)}</p><p>${h(s.proof)}</p><p class="src">${h(s.src)}</p></div><div><p class="cap" style="margin-top:1.4mm"><b style="color:var(--ink2)">쓰는 곳</b><br>${h(s.use)}</p></div></div>`).join("")}
<p class="cap push">여기 적은 것은 학생이 고른 응답과 기록입니다. 결과물의 완성도와 성과 수치는 확인하지 않았습니다.</p>`;
}

function style(e: Ed8): string {
  const bar = (b: number | null) => (b === null ? `<i class="un">${UNASKED}</i>` : `<div class="bar">${[1, 2, 3].map((i) => `<i class="${i <= b ? (b === 3 ? "top" : "on") : ""}"></i>`).join("")}</div>`);
  return `<h2 class="hl">${h(e.styleLine)}</h2><p class="dk">여덟 판단마다, 물어본 영역 가운데 가장 높이 답한 단계를 그렸습니다. 성격 유형이 아니라, 일에서 무엇을 직접 정해 봤는지입니다.</p>
<div class="sty">${e.style.map((s) => `<div class="row"><div class="nm">${h(s.name)}</div>${bar(s.best)}<div class="cap">${s.best === null ? "" : `${h(LV(s.best))}${s.where ? ` · ${h(s.where)}` : ""}`}</div></div>`).join("")}</div>
<div class="scale" style="margin-top:2mm"><span>지시받아 수행</span><span>직접 수행</span><span>기준까지 직접 결정</span></div>
<div class="g2 push" style="margin-top:10mm"><div><p class="lab">읽는 법</p><p class="sm">칸이 하나면 다른 사람이 정한 조건 안에서 해 본 것, 둘이면 스스로 맡아 해 본 것, 셋이면 기준까지 직접 정한 것입니다. 빈 줄은 해 본 적 없다고 답한 판단입니다.</p></div>
<div><p class="lab">면접에서는</p><p class="sm">칸이 셋인 판단은 “왜 그렇게 정했나요?”를, 칸이 비거나 하나인 판단은 “해 본 적 있나요?”를 받습니다. 07~08장에서 둘 다 준비합니다.</p><p class="src">응답 확인 · 분석 제안</p></div></div>`;
}

function versus(e: Ed8): string {
  const v = e.versus;
  const col = (r: typeof v.a, tag: string) => `<div><p class="tag">${h(tag)}</p><p class="nm">${h(r.name)}</p><p class="sm" style="margin:0 0 4mm">${h(r.guide.line)}</p>
<dl><dt>정하는 것</dt><dd>${r.guide.cycle.slice(0, 3).map((c) => h(c.decide)).join("<br>")}</dd><dt>남기는 것</dt><dd>${r.guide.artifacts.map((a) => h(a.title)).join("<br>")}</dd>
<dt>내 근거</dt><dd>${r.have.length ? r.have.map((x) => h(x.text)).join("<br>") : "아직 이 직무 쪽 응답이 없습니다"}</dd><dt>더 필요한 것</dt><dd>${r.need.length ? r.need.map(h).join(", ") : "—"}</dd><dt>중심 영역</dt><dd>${h(r.tdName)} · ${h(LV(r.tdDepth))}</dd></dl></div>`;
  return `<h2 class="hl">${h(v.call)}</h2><p class="dk">두 직무를 정하는 것, 남기는 것, 내 근거로 나란히 놓았습니다. 겹치는 칸이 많을수록 함께 준비하기 쉽습니다.</p>
<div class="vs">${col(v.a, "목표로 고른 직무")}${col(v.b, e.kind === "MIXED" ? "근거가 더 많은 직무" : "함께 볼 직무")}</div>
${e.confusion ? `<div class="push" style="margin-top:9mm"><p class="pq" style="font-size:14pt">${h(e.confusion.tell)}</p><p class="cap" style="margin:3mm 0 0 8mm">헷갈리기 쉬운 두 직무(${h(e.confusion.a)} · ${h(e.confusion.b)})를 가르는 한 줄 · 일반 직무 안내</p></div>` : ""}`;
}

function mismatch(e: Ed8): string {
  const m = e.mismatch!;
  return `<h2 class="hl">어긋나는 곳은 한 군데입니다. 해 본 일과 목표 직무의 중심이 다릅니다.</h2>
<p class="dk">경험이 없는 것이 아닙니다. 경험이 ${h(m.target)} 바깥에 있습니다. 그래서 할 일은 둘입니다. ${h(m.target)} 장면을 하나 만들고, 이미 한 일 가운데 옮겨 쓸 부분을 골라내는 것.</p>
<div class="g2" style="border-top:1pt solid var(--ink);padding-top:5mm"><div><p class="cap">해 본 일이 있는 영역</p><p style="font-family:S;font-weight:700;font-size:18pt;line-height:1.5">${m.did.map(h).join("<br>")}</p><p class="src">응답 확인</p></div>
<div><p class="cap">${h(m.target)}의 중심 영역</p><p style="font-family:S;font-weight:700;font-size:18pt;line-height:1.5;color:var(--acc)">${h(m.targetTd)}</p><p class="sm">${UNASKED}. 해 본 적이 없다는 뜻이 아니라, 이번 응답으로는 모른다는 뜻입니다.</p></div></div>
<div class="band" style="margin-top:9mm"><p class="lab">이미 있는 ${h(m.target)} 장면</p><p style="font-size:12pt;font-weight:600;margin:0">${m.overlap ? h(m.overlap) : "아직 기록에 없습니다."}</p>${m.overlap ? `<p class="src" style="margin:2mm 0 0">학생 자기기록 · 이 장면이 ${h(m.target)} 지원서의 첫 문단 재료입니다</p>` : ""}</div>
<div class="g2 push" style="margin-top:9mm"><div><p class="lab">더 자연스러운 쪽</p><p class="sm"><b>${h(m.closer)}</b> — ${h(m.closerWhy)}</p></div><div><p class="lab">그래도 ${h(m.target)}로 간다면</p><p class="sm">${h(e.first.when)} 안에 ${withJosa(h(e.first.output), "을를")} 만들어 ${h(m.target)} 장면을 하나 확보합니다. 그다음 두 직무를 다시 견줍니다.</p><p class="src">분석 제안</p></div></div>`;
}

function evidence(e: Ed8): string {
  const z = e.dna.domains.filter((d) => d.tag === "근거 갖춤").length;
  const headline = z ? `강한 근거는 ${z}개 영역에 모여 있습니다.` : e.kind === "EARLY" ? "아직 근거라 부를 것이 적습니다. 빈자리가 곧 할 일입니다." : "해 본 일은 넓게 있지만, 보여 줄 근거는 아직 얇습니다.";
  const tgt = e.versus.a.tdName;
  const rows: [string, (d: number | null) => boolean][] = [["기준까지 직접 결정", (d) => d === 3], ["직접 수행", (d) => d === 2], ["지시받아 수행", (d) => d === 1], ["해 본 적 없음", (d) => d === 0], [UNASKED, (d) => d === null]];
  const cols: ["LOW" | "MID" | "HIGH", string][] = [["LOW", "관심 낮음"], ["MID", "관심 중간"], ["HIGH", "관심 높음"]];
  const weak = e.dna.weak.length ? [{ text: `아직 비어 있는 판단: ${e.dna.weak.join(", ")}`, src: "응답 확인" as const }] : [];
  return `<h2 class="hl">${h(headline)}</h2>
<div class="g2"><div><p class="lab">지금 보여 줄 수 있는 근거</p>${lines(e.verdict.have)}</div><div><p class="lab">빈자리</p>${lines([...weak, ...e.verdict.unknown.slice(0, 3)])}</div></div>
<p class="lab push" style="margin-top:9mm">열두 영역 지도 — 관심과 해 본 깊이</p>
<table class="mx"><thead><tr><th></th>${cols.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead><tbody>${rows.map(([l, pr], i) => `<tr><td class="rh">${l}</td>${cols.map(([c]) => `<td${i === 4 ? ' class="un"' : ""}>${e.map.rows.filter((m) => m.interest === c && pr(m.depth)).map((m) => `<span${m.name === tgt ? ' class="tg"' : ""}>${h(m.name)}${m.name === tgt ? " ◆" : ""}</span>`).join("<br>")}</td>`).join("")}</tr>`).join("")}</tbody></table>
<p class="cap" style="margin-top:2mm">빗금 칸은 ‘없음’이 아니라 이번 검사에서 판단을 묻지 않은 영역입니다. ◆ 목표 직무의 중심 영역 · 응답 확인</p>`;
}

function deep(d: DnaDomain): string {
  const C: Record<string, string> = { strong: "해 봄", partial: "일부", none: "아직" };
  const col = (t: string, xs: string[]) => `<div><p class="lab">${t}</p>${xs.length ? xs.map((x) => `<p class="sm" style="margin:0 0 2mm">${h(x)}</p>`).join("") : `<p class="sm" style="color:var(--mute)">고른 문장이 없습니다.</p>`}</div>`;
  const opn = d.open.length ? `아직 지시받은 범위까지인 판단은 ${d.open.join(", ")}입니다.` : "여덟 판단 모두 스스로 맡아 해 봤다고 답했습니다.";
  return `<h2 class="hl">${h(d.name)}의 일 여덟 단계 가운데, 맡아 본 곳과 비어 있는 곳</h2><p class="dk">${h(opn)}${d.compared.length ? ` 결과는 ${d.compared.map(h).join(", ")}과 견줬다고 골랐습니다.` : " 결과를 견준 대상은 아직 고르지 않았습니다."}</p>
<div class="flow">${d.flow.map((f) => `<div><span class="n">${f.step}</span> <span class="c ${h(f.cover)}">${C[f.cover] ?? ""}</span><b>${h(f.name)}</b>${h(f.detail)}</div>`).join("")}</div>
<div class="g3 push" style="margin-top:9mm">${col("직접 정했다고 고른 것", d.decided)}${col("해 봤다고 고른 것", d.did)}${col("남긴 결과물", d.left)}</div>
<p class="src" style="margin-top:3mm">응답 확인 · 단계 표시는 그 단계 판단에 대한 응답에서 왔습니다</p>`;
}

function scene1(e: Ed8): string {
  const r = e.versus.a;
  return `<h2 class="hl">${h(r.name)}의 한 주기는 이렇게 돕니다.</h2><p class="dk">특정 회사가 아니라 이 직무에서 흔히 거치는 흐름입니다. 장면마다 정하는 것과 남기는 것을 보면, 지금 준비할 결과물이 보입니다.</p>
<div class="sc">${r.guide.cycle.map((c, i) => `<div class="row"><div class="num">${i + 1}</div><div><p class="ph">${h(c.phase)}</p><p class="scene">${h(c.scene)}</p></div><div class="cap"><b style="color:var(--ink2)">정하는 것</b><br>${h(c.decide)}<br><br><b style="color:var(--ink2)">남기는 것</b><br>${h(c.output)}</div></div>`).join("")}</div>
<p class="src push" style="margin-top:3mm">일반 직무 안내</p>`;
}

function scene2(e: Ed8): string {
  const r = e.versus.a;
  return `<h2 class="hl">판단이 필요한 순간은 세 가지입니다.</h2>
<div class="sit">${r.guide.situations.map((s) => `<div><p class="w">${h(s.when)}</p><p class="d">${h(s.decide)}</p></div>`).join("")}</div>
<p class="pq" style="margin:10mm 0 10mm;font-size:13.5pt">${h(r.guide.notThis)}</p>
<p class="lab">조직마다 같은 직무가 다르게 보입니다</p><div class="org">${e.org.map((o) => `<div><b>${h(o.type)}</b><span class="sm">${h(o.how)}</span></div>`).join("")}</div>
<p class="lab push" style="margin-top:8mm">연습 — 이 순간이라면 나는 무엇을 먼저 정할까</p>${r.guide.situations.map((x) => `<div style="display:grid;grid-template-columns:56mm 1fr;gap:6mm;margin-bottom:1mm"><p class="sm" style="margin:2.6mm 0 0">${h(x.when)}</p><div><div class="wl"></div><div class="wl"></div></div></div>`).join("")}
<p class="src" style="margin-top:3mm">일반 직무 안내 · 특정 기업 정보는 쓰지 않았습니다 · 면접의 상황 질문을 미리 써 보는 칸입니다</p>`;
}

function project(e: Ed8): string {
  const p = e.project;
  const fs = e.templates.find((t) => t.title === p.title.replace(/ 한 장 만들기$/, ""))?.fields ?? [];
  return `<p class="cap" style="margin-bottom:2mm">프로젝트 제안 · ${h(p.when)}</p><h2 class="hl">${h(p.title)}</h2><p class="dk">${h(p.where)} 한 번에 끝낼 수 있는 크기입니다. ${h(p.why)}</p>
<div class="ag"><div><p class="lab">다 됐는지 보는 법</p><ul class="chk">${p.done.map((d) => `<li>${h(d)}</li>`).join("")}</ul>
${p.feed.length ? `<p class="lab" style="margin-top:6mm">가져올 내 기록</p><p class="sm">${p.feed.map(h).join(", ")}</p><p class="src">응답 확인 · 그대로 옮기지 않고 칸에 맞는 것만</p>` : ""}</div>
<div><p class="lab">작업지 — 칸마다 내 과제로 채웁니다</p><div class="ws">${fs.length ? fs.map((f, i) => `<div class="row"><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="f">${h(f)}</span><span>${(fs.length <= 4 ? [1, 2, 3] : [1, 2]).map(() => `<div class="wl"></div>`).join("")}</span></div>`).join("") : `<ol class="steps">${p.steps.map((x) => `<li>${h(x)}</li>`).join("")}</ol>`}</div></div></div>
<div class="band n push" style="margin-top:9mm"><p class="cap" style="margin-bottom:2mm">이 결과물 하나로 답할 수 있는 면접 질문</p><p style="font-family:S;font-weight:600;font-size:15pt;line-height:1.5;margin:0">“${h(p.answers)}”</p><p class="src" style="margin:2mm 0 0">분석 제안</p></div>`;
}

function weeks(e: Ed8): string {
  const w = e.weeks!;
  return `<h2 class="hl">첫 결과물은 4주면 됩니다. 한 주에 한 걸음.</h2><p class="dk">설명은 줄이고 할 일만 적었습니다. 매주 끝에 남는 것이 있어야 다음 주로 넘어갑니다.</p>
<div class="wk">${w.map((x) => `<div><div class="num">${x.no}주</div><p style="font-size:11pt;line-height:1.6">${h(x.what)}</p><p class="cap"><b style="color:var(--ink2)">남는 것</b><br>${h(x.out)}</p></div>`).join("")}</div>
<div class="g2 push" style="margin-top:12mm"><div><p class="lab">막히면</p><p class="sm">과제가 없으면 수업 과제 하나를 이 양식으로 다시 정리합니다. 새 과제를 찾느라 첫 주를 쓰지 않습니다.</p></div><div><p class="lab">4주 뒤</p><p class="sm">완성본을 07장 포트폴리오 첫 칸에 넣고, 08장 면접표의 ‘아직 장면 없음’ 한 줄을 채웁니다.</p></div></div>
<p class="src" style="margin-top:4mm">분석 제안</p>`;
}

function portfolio(e: Ed8): string {
  return `<h2 class="hl">포트폴리오는 결과물 세 장이면 충분합니다.</h2><p class="dk">${h(e.versus.a.name)}에서 흔히 보는 결과물 셋입니다. 완성 예시는 넣지 않았습니다. 내 과제로 채웠을 때만 의미가 있습니다.</p>
${e.templates.map((t, i) => `<div class="pf"><div class="num">${i + 1}</div><div><p class="t">${h(t.title)}</p><p class="sm" style="margin:0 0 2mm">쓰는 때: ${h(t.use)}</p><p class="sm" style="margin:0"><b>한 장에 보일 칸</b> ${t.fields.map(h).join(" · ")}</p>${t.mine.length ? `<p class="cap" style="margin-top:2mm">비슷한 내 결과물: ${t.mine.map(h).join(", ")}</p>` : ""}</div>
<div><p class="stt${t.status === "새로 만들기" ? " new" : ""}">${h(t.status)}</p><ul class="chk" style="margin-top:2mm">${t.judge.map((j) => `<li>${h(j)}</li>`).join("")}</ul></div></div>`).join("")}
<p class="src push">일반 직무 안내 · 상태는 응답 확인</p>`;
}

function letter(e: Ed8): string {
  const d = e.draft;
  return `<h2 class="hl">자기소개서 한 문단은 이렇게 시작합니다.</h2><p class="dk">${d.from ? `‘${h(d.from)}’에서 고른 응답을 그대로 문장에 넣었습니다. ` : ""}파란 칸은 기록에서 직접 채울 자리입니다. 지어낸 내용은 없습니다.</p>
<p class="draft" style="border-top:1pt solid var(--ink);padding-top:6mm">${d.parts.map((p) => (p.blank ? `<span class="b">${h(p.text.trim())}</span> ` : h(p.text))).join("")}</p>
<p class="lab" style="margin-top:10mm">둘째 문단 연습 — 다른 경험 하나로 같은 순서를 써 봅니다</p><div class="ws">${["상황과 맡은 몫", "내가 정한 것과 기준", "남긴 결과물", "무엇과 견줘 무엇이 달라졌나"].map((f, i) => `<div class="row"><span class="n">${i + 1}</span><span class="f">${f}</span><span><div class="wl"></div></span></div>`).join("")}</div>
<div class="three push" style="margin-top:10mm">${d.tips.map((t, i) => `<div><div class="num" style="font-size:26pt">${i + 1}</div><p style="font-family:S;font-weight:600;font-size:12pt;line-height:1.55">${h(t)}</p></div>`).join("")}</div>
<p class="src" style="margin-top:3mm">응답 확인 · 학생 자기기록 · 분석 제안</p>`;
}

function interview(e: Ed8, rows = e.answers, part = 0): string {
  return `${part < 2 ? `<h2 class="hl">면접에서 받을 질문과 답의 방향</h2><p class="dk">질문은 판단 하나씩을 묻습니다. 재료가 있는 질문은 그대로 꺼내고, 없는 질문은 90일 안에 재료를 만듭니다.</p>` : `<h2 class="hl">재료가 아직 없는 질문</h2><p class="dk">아래 질문은 지금 답할 장면이 없습니다. 90일 계획의 결과물이 그 장면이 됩니다.</p>`}
<div class="iv">${rows.map((a) => `<div class="row"><p class="q">“${h(a.q)}”</p><div><p class="cap" style="margin-bottom:1mm">꺼낼 재료</p><p class="sm" style="margin:0">${a.have ? h(a.have) : `<span class="gap">아직 장면 없음</span> — ${h(a.prep ?? "")}`}</p></div><div><p class="cap" style="margin-bottom:1mm">답의 방향 · ${h(JUDGE[a.axis as keyof typeof JUDGE]?.name ?? "")}</p><p class="sm" style="margin:0">${h(a.dir)}</p></div><div style="grid-column:1/-1"><p class="cap" style="margin:1mm 0 0">내 답의 첫 문장</p><div class="wl"></div></div></div>`).join("")}</div>
${part === 2 ? `${rows.length <= 2 ? `<p class="lab" style="margin-top:9mm">${h(e.versus.a.name)} 면접에서 자주 나오는 질문</p>${e.versus.a.guide.probes.map((x) => `<p style="font-family:S;font-weight:600;font-size:12pt;margin:3mm 0 1mm">“${h(x)}”</p><div class="wl"></div>`).join("")}` : ""}
${rows.length >= 3 ? `<p class="sm" style="margin-top:4mm"><b>답하기 전 30초</b> 언제·어떤 과제였는지 → 내가 정한 것 하나 → 남은 것의 이름 → 무엇과 견줬는지.</p>` : `<div class="g2" style="margin-top:8mm"><div><p class="lab">답하기 전 30초</p><ul class="chk"><li>언제·어떤 과제였는지 한 줄</li><li>내가 정한 것 하나</li><li>그 결과 남은 것의 이름</li><li>무엇과 견줬는지</li></ul></div><div><p class="lab">말하지 않을 것</p><p class="sm">해 보지 않은 일, 기록에 없는 수치, 팀이 한 일을 내가 한 것처럼 말하기. 한 번 되물으면 무너집니다.</p></div></div>`}` : ""}
<p class="src push" style="margin-top:3mm">재료: 응답 확인 · 답의 방향과 자주 나오는 질문: 일반 직무 안내</p>`;
}

function plan(e: Ed8): string {
  const big = ["30", "60", "90"];
  const n = e.plan.flatMap((c) => c.items).length;
  return `<h2 class="hl">다음 90일, 기간마다 결과물 하나.</h2>${n > 3 ? "" : `<p class="dk">결과물이 남으면 지원서와 면접에서 꺼낼 장면이 하나 생깁니다.</p>`}
<div class="board${n > 3 ? " dense" : ""}">${e.plan.map((c, i) => `<div class="col${i === 0 ? " now" : ""}"><div class="num">${big[i]}</div><p class="wh">${h(c.when)}</p>${c.items.length ? c.items.map((it) => `<div class="it"><b>${h(it.title)}</b>${n > 3 ? "" : `<p class="sm" style="margin:0 0 1.6mm">${h(it.where)} ${h(it.task)}</p>`}<p class="cap"><b style="color:var(--ink2)">남길 것</b> ${h(it.output)}<br><b style="color:var(--ink2)">확인</b> ${h(it.check)}</p></div>`).join("") : `<p class="sm" style="color:var(--mute)">앞 기간의 결과물을 다듬어 포트폴리오에 넣습니다.</p>`}</div>`).join("")}</div>
${n <= 3 ? `<div class="band push" style="margin-top:9mm"><p class="lab">90일 뒤</p><p class="sm" style="margin:0">결과물을 07장의 □ 질문으로 다시 검토하고, 08장 면접표의 ‘아직 장면 없음’과 자기소개서의 파란 칸을 채웁니다. 같은 검사를 다시 보면 이번에 비어 있던 판단이 어디까지 왔는지 견줄 수 있습니다.</p></div>` : `<p class="sm push" style="margin-top:6mm"><b>90일 뒤</b> 결과물을 07장 □ 질문으로 검토하고, 면접표와 자기소개서의 빈칸을 채웁니다.</p>`}
<p class="src" style="margin-top:3mm">분석 제안 · 비어 있는 판단 가운데 목표 직무에 걸리는 것부터 차례를 정했습니다</p>`;
}

function close(e: Ed8): string {
  return `<h2 class="hl xl">${h(e.close)}</h2>
<div class="three" style="margin-top:6mm">${e.takeaways.map((t, i) => `<div><div class="num">${i + 1}</div><div class="k">${h(t.k)}</div><div class="v">${h(t.v)}</div></div>`).join("")}</div>
<div class="g2 push" style="margin-top:12mm"><div><p class="lab">이 리포트가 하지 않은 것</p>${e.limits.map((l) => `<p class="sm" style="margin:0 0 2mm">${h(l)}</p>`).join("")}</div>
<div><p class="lab">문장 옆 작은 글씨</p><p class="sm"><b>응답 확인</b> 검사에서 고른 답<br><b>학생 자기기록</b> 직접 적은 경험 기록(확인하지 않음)<br><b>일반 직무 안내</b> 특정 기업이 아닌 직무 일반<br><b>분석 제안</b> 응답을 읽고 이 리포트가 권하는 것</p></div></div>`;
}

export const PROTO8 = ["cover", "glance", "job", "strengths", "style", "versus", "evidence", "scene-1", "project", "letter", "interview", "plan"] as const;

export function pages8(e: Ed8): Page8[] {
  const run = `${e.who.school} ${e.who.department}`;
  const P: Page8[] = [];
  const add = (key: string, sec: string, secName: string, title: string, body: string) => P.push({ key, sec, secName, title, html: frame(sec, secName, run, body) });
  P.push({ key: "cover", sec: "", secName: "", title: "표지", html: cover(e) });
  P.push({ key: "contents", sec: "", secName: "차례", title: "차례", html: "" });
  add("glance", "01", "한눈에 보기", "가져갈 세 가지", glance(e));
  add("job", "02", "먼저 볼 직무", e.versus.a.name, job(e));
  add("strengths", "03", "강점과 일하는 방식", e.label.strengths, strengths(e));
  add("style", "03", "강점과 일하는 방식", "업무 스타일", style(e));
  add("versus", "04", "두 직무 비교", "두 직무", versus(e));
  if (e.mismatch) add("mismatch", "04", "두 직무 비교", "어긋나는 곳", mismatch(e));
  add("evidence", "05", "근거 지도", "강한 근거와 빈자리", evidence(e));
  if (e.kind === "EVIDENCE") e.dna.domains.filter((d) => d.tag === "근거 갖춤").slice(0, 2).forEach((d) => add(`deep-${d.code}`, "05", "근거 지도", d.name, deep(d)));
  add("scene-1", "06", "실제 업무 장면", "한 주기", scene1(e));
  add("scene-2", "06", "실제 업무 장면", "판단의 순간", scene2(e));
  add("project", "07", "프로젝트와 포트폴리오", "프로젝트", project(e));
  if (e.weeks) add("weeks", "07", "프로젝트와 포트폴리오", "첫 4주", weeks(e));
  add("portfolio", "07", "프로젝트와 포트폴리오", "포트폴리오", portfolio(e));
  add("letter", "08", "자기소개서와 면접", "자기소개서", letter(e));
  if (e.answers.length > 3) { add("interview", "08", "자기소개서와 면접", "면접", interview(e, e.answers.slice(0, 3), 1)); add("interview-2", "08", "자기소개서와 면접", "면접", interview(e, e.answers.slice(3), 2)); }
  else add("interview", "08", "자기소개서와 면접", "면접", interview(e));
  add("plan", "09", "30 · 60 · 90일", "실행 계획", plan(e));
  add("close", "10", "정리", "정리", close(e));
  /* 차례: 장마다 첫 쪽 번호 */
  const PROMISE: Record<string, string> = {
    "01": "결론과 가져갈 세 가지", "02": "지금 먼저 볼 직무와 첫 행동", "03": "강한 쪽과 일하는 방식", "04": "맞는 직무 둘을 나란히",
    "05": "보여 줄 수 있는 근거와 빈자리", "06": "이 직무가 실제로 하는 일", "07": "바로 만들 결과물", "08": "문장과 답의 재료", "09": "기간마다 결과물 하나", "10": "다시 한 번, 짧게",
  };
  const toc: Toc = [];
  P.forEach((p, i) => { if (p.sec && !toc.find((t) => t.no === p.sec)) toc.push({ no: p.sec, name: p.secName, promise: PROMISE[p.sec] ?? "", page: i + 1 }); });
  P[1].html = frame("", "차례", run, contents(toc)).replace('<span class="no"></span>', "");
  return P;
}

export function html8(e: Ed8, ps: Page8[], f: Fonts8): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri 진로·직무 전략 리포트</title><style>${CSS(f)}</style></head><body>
${ps.map((p, i) => `<section class="pg"${p.key === "cover" ? ' style="padding:0"' : ""} data-key="${p.key}">${p.html.replace('<span class="pn"></span>', `<span>${p.sec ? `${p.sec} ${h(p.secName)} · ` : ""}${i + 1}</span>`)}</section>`).join("\n")}
</body></html>`;
}
