/**
 * **BIZ 진로·직무 분석 결과지 4차 렌더러.** `edit()` 이 만든 쪽 모델을 A4 편집 쪽으로 그린다.
 * v9(`render6`)의 구조·색·문장을 쓰지 않는다. 쪽마다 물음 하나에 답한다.
 *
 * 체계(STYLE_GUIDE.md): 따뜻한 흰 종이 · 잉크 검정 · 남색 하나 · 강조색 하나(번트 오렌지).
 * 글꼴 하나(Pretendard, OFL). 본문 10.5pt. 글을 줄여 맞추지 않는다: 넘치면 쪽을 나눈다.
 * 근거의 층은 줄 오른쪽 작은 주석으로 적는다(배지로 쌓지 않는다).
 */
import { STEP, UNASKED, JUDGE } from "./words";
import { withJosa } from "../result/josa";
import type { Ed, Line, DnaDomain, RoleView, Chain, Tpl, Probe } from "./editorial";

export type Fonts7 = { href: string; family: string };
export type Page7 = { key: string; chapter: string; title: string; html: string };

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LV = (n: number | null) => (n === null ? UNASKED : STEP[n as 0 | 1 | 2 | 3].tag);

const CSS = (f: Fonts7) => `
@font-face{font-family:"${f.family}";src:url("${f.href}/Pretendard-Regular.otf");font-weight:400}
@font-face{font-family:"${f.family}";src:url("${f.href}/Pretendard-Medium.otf");font-weight:500}
@font-face{font-family:"${f.family}";src:url("${f.href}/Pretendard-SemiBold.otf");font-weight:600}
@font-face{font-family:"${f.family}";src:url("${f.href}/Pretendard-Bold.otf");font-weight:700}
:root{--paper:#fbf9f5;--ink:#1c1f24;--ink2:#3d4148;--mute:#70737a;--rule:#d9d3c8;--rule2:#ebe6dd;--navy:#22324f;--navy2:#e8ebf1;--acc:#b8501f;--acc2:#f5e9e1}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:var(--ink);font-family:"${f.family}",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{word-break:keep-all;overflow-wrap:break-word}
.pg{width:210mm;height:297mm;padding:14mm 16mm 12mm 18mm;background:var(--paper);display:flex;flex-direction:column;page-break-after:always;overflow:hidden;position:relative}
.rh{display:flex;justify-content:space-between;align-items:baseline;font-size:8.5pt;color:var(--mute);border-bottom:.5pt solid var(--rule);padding-bottom:2mm;margin-bottom:8mm}
.rh b{font-weight:600;color:var(--ink2)}
.bd{flex:1;min-height:0;position:relative}
.rf{display:flex;justify-content:space-between;font-size:8.5pt;color:var(--mute);padding-top:3mm}
p{margin:0 0 2.6mm;font-size:10.5pt;line-height:1.62}
.kick{font-size:9pt;font-weight:600;color:var(--acc);margin:0 0 3mm}
h1{font-size:24pt;line-height:1.3;font-weight:700;margin:0 0 5mm;color:var(--ink)}
h2{font-size:17pt;line-height:1.36;font-weight:700;margin:0 0 3.5mm}
h3{font-size:11.5pt;line-height:1.45;font-weight:700;margin:0 0 2mm}
.lead{font-size:11.5pt;line-height:1.65;color:var(--ink2);margin-bottom:6mm}
.note{font-size:8.5pt;line-height:1.5;color:var(--mute)}
.sm{font-size:9.5pt;line-height:1.55}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:9mm}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm}
.g73{display:grid;grid-template-columns:7fr 4fr;gap:9mm}
.lab{font-size:8.5pt;font-weight:600;color:var(--navy);margin:0 0 2mm;padding-bottom:1.6mm;border-bottom:1pt solid var(--navy)}
.ln{display:grid;grid-template-columns:1fr 21mm;gap:3mm;border-bottom:.5pt solid var(--rule2);padding:2.2mm 0;font-size:10pt;line-height:1.5}
.ln .s{font-size:8.5pt;color:var(--mute);text-align:right;padding-top:.4mm}
.blk{border-left:2.2pt solid var(--acc);background:var(--acc2);padding:5mm 6mm 4mm}
.blk.n{border-left-color:var(--navy);background:var(--navy2)}
.dl{display:grid;grid-template-columns:24mm 1fr;gap:1.6mm 4mm;font-size:10pt;line-height:1.5;margin:0}
.dl dt{font-size:8.5pt;color:var(--mute);padding-top:.5mm}
.dl dd{margin:0}
table{border-collapse:collapse;width:100%}
th,td{text-align:left;vertical-align:top;font-size:9.5pt;line-height:1.5;padding:2mm 2.2mm;border-bottom:.5pt solid var(--rule2)}
th{font-size:8.5pt;font-weight:600;color:var(--mute);border-bottom:.8pt solid var(--ink2)}
.cover{padding:0}
.cv{height:100%;display:grid;grid-template-rows:auto 1fr auto;padding:22mm 20mm 18mm 22mm}
.cv .t{font-size:34pt;font-weight:700;line-height:1.18;margin:0}
.cv .rule{width:22mm;height:2.2pt;background:var(--acc);margin:9mm 0 7mm}
.cv .vd{font-size:15pt;line-height:1.55;font-weight:500;color:var(--ink2);max-width:150mm}
.mx td{height:19mm;font-size:10pt}
.mx td.un{background:repeating-linear-gradient(135deg,transparent 0 3px,#efeae1 3px 4px);color:var(--mute)}
.mx .rowh{width:30mm;font-size:8.5pt;color:var(--ink2);font-weight:600}
.mx .tg{color:var(--acc);font-weight:600}
.bar{display:inline-flex;gap:1.2mm;vertical-align:middle}
.bar i{display:block;width:3.6mm;height:3.6mm;border:.6pt solid var(--navy)}
.bar i.on{background:var(--navy)}
.bar i.top{background:var(--acc);border-color:var(--acc)}
.dn th{font-size:8.5pt;line-height:1.35}
.dn td{text-align:center}
.dn td.nm{text-align:left;font-weight:600;font-size:9.5pt}
.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1pt solid var(--ink2)}
.flow div{padding:2.6mm 2.6mm 3mm 0;border-bottom:.5pt solid var(--rule2);font-size:9pt;line-height:1.45}
.flow b{display:block;font-size:9.5pt;margin-bottom:1mm}
.flow .c{font-size:8.5pt;font-weight:600}
.c.strong{color:var(--navy)} .c.partial{color:var(--ink2)} .c.none{color:var(--acc)}
.cyc{border-top:1pt solid var(--ink2)}
.cyc .row{display:grid;grid-template-columns:24mm 1fr 52mm;gap:5mm;padding:3.4mm 0;border-bottom:.5pt solid var(--rule2)}
.cyc .ph{font-weight:700;font-size:10pt}
.cyc .ph span{display:block;font-size:8.5pt;color:var(--mute);font-weight:400;margin-bottom:1mm}
.cyc .sc{font-size:10pt;line-height:1.58}
.cyc .io{font-size:9pt;line-height:1.5;color:var(--ink2)}
.cyc .io em{font-style:normal;color:var(--mute);font-size:8.5pt;display:block}
.sit{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;margin-bottom:7mm}
.sit div{border-top:1pt solid var(--ink2);padding-top:2.6mm}
.sit .w{font-size:9pt;color:var(--mute);margin-bottom:1.6mm}
.sit .d{font-size:10.5pt;line-height:1.55;font-weight:500}
.tags{display:flex;flex-wrap:wrap;gap:1.6mm 4mm;font-size:10pt}
.tags span::before{content:"— ";color:var(--rule)}
.cmp th{width:26mm}
.cmp tbody th{border-bottom:.5pt solid var(--rule2);font-weight:600;color:var(--ink2)}
.cmp td{font-size:9.5pt}
.cmp .tgt{color:var(--acc)}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1pt solid var(--ink2)}
.vs>div{padding:4mm 6mm 4mm 0}
.vs>div+div{padding-left:6mm;border-left:.5pt solid var(--rule)}
.vs .big{font-size:15pt;font-weight:700;margin:0 0 2mm}
.ch{border-top:1pt solid var(--ink2);margin-bottom:7mm}
.ch .hd{display:flex;justify-content:space-between;align-items:baseline;padding:3mm 0 2mm}
.ch .hd h3{margin:0}
.ch .row{display:grid;grid-template-columns:26mm 1fr;gap:4mm;padding:2mm 0;border-bottom:.5pt solid var(--rule2);font-size:10pt;line-height:1.5}
.ch .row .k{font-size:8.5pt;color:var(--mute);padding-top:.5mm}
.ch .row .e{color:var(--acc)}
.tpl{border-top:1pt solid var(--ink2);margin-bottom:8mm}
.tpl .hd{display:grid;grid-template-columns:1fr auto;align-items:baseline;padding:3mm 0 1mm}
.tpl .st{font-size:8.5pt;font-weight:600;color:var(--navy)}
.tpl .st.new{color:var(--acc)}
.tpl table td{height:9.5mm}
.tpl table td.f{width:38mm;font-size:9pt;color:var(--ink2)}
.tpl table td.b{border-bottom:.5pt dotted #b9b1a4}
.chk{margin:2.4mm 0 0;padding:0;list-style:none;font-size:9.5pt;line-height:1.55}
.chk li::before{content:"□ ";color:var(--mute)}
.pr td.q{width:58mm;font-weight:500}
.pr td.m{width:62mm}
.pr .gap{color:var(--acc)}
.board{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm}
.board .col{border-top:2.2pt solid var(--navy);padding-top:3mm}
.board .col.now{border-top-color:var(--acc)}
.board .wh{font-size:9pt;font-weight:700;margin-bottom:3mm}
.board .it{border-bottom:.5pt solid var(--rule2);padding:0 0 3.4mm;margin-bottom:3.4mm}
.board .it b{display:block;font-size:10.5pt;line-height:1.45;margin-bottom:1.6mm}
.board .it .o{font-size:9pt;line-height:1.5;color:var(--ink2);margin-top:1.6mm}
.board .it .o em{font-style:normal;color:var(--mute)}
.story .row{display:grid;grid-template-columns:34mm 1fr;gap:5mm;padding:3.6mm 0;border-bottom:.5pt solid var(--rule2)}
.story .k{font-size:9pt;font-weight:600;color:var(--navy)}
.story .v{font-size:10.5pt;line-height:1.6}
.story .v.blank{border-bottom:.5pt dotted #b9b1a4;min-height:12mm;color:var(--mute);font-size:9pt}
`;

/** 근거 주석이 붙은 줄 */
const lines = (xs: Line[]) => xs.map((x) => `<div class="ln"><div>${h(x.text)}</div><div class="s">${h(x.src)}</div></div>`).join("");

function page(key: string, chapter: string, title: string, body: string, who: Ed["who"]): Page7 {
  return { key, chapter, title, html: `<div class="rh"><span><b>${h(chapter)}</b> · ${h(title)}</span><span>${h(who.school)} ${h(who.department)}</span></div><div class="bd">${body}</div><div class="rf"><span>CareerMatri 진로·직무 분석</span><span class="pn"></span></div>` };
}

function cover(e: Ed): string {
  return `<div class="cv"><div class="note">${h(e.who.school)} · ${h(e.who.department)} · ${h(e.who.specialization)}<br>${h(e.who.answeredOn)} 응답</div>
<div style="align-self:center"><p class="kick">진로·직무 분석 결과지</p><p class="t">지금 가진 경험과<br>다음 90일</p><div class="rule"></div><p class="vd">${h(e.verdict.head)}</p></div>
<div class="note" style="max-width:150mm">학생이 고른 응답과 직접 적은 경험 기록으로 만들었습니다. 점수와 순위는 만들지 않았고 채용 결과를 예측하지 않았습니다. 판단을 묻지 않은 영역은 ‘${UNASKED}’으로 적었습니다.</div></div>`;
}

function verdict(e: Ed): string {
  return `<p class="kick">한 문장으로</p><h1>${h(e.verdict.head)}</h1><p class="lead">${h(e.verdict.sub)}</p>
<div class="g2"><div><p class="lab">응답과 기록으로 확인된 것</p>${lines(e.verdict.have)}</div><div><p class="lab">아직 모르는 것</p>${lines(e.verdict.unknown)}</div></div>
${strip(e)}
<div style="margin-top:9mm" class="note">줄 오른쪽의 작은 글씨는 그 문장이 어디서 왔는지입니다. <b>응답 확인</b>: 검사에서 고른 답 · <b>학생 자기기록</b>: 직접 적은 경험 기록(확인하지 않음) · <b>일반 직무 안내</b>: 특정 기업이 아닌 직무 일반 · <b>분석 제안</b>: 응답을 읽고 이 결과지가 권하는 것.</div>`;
}

function strip(e: Ed): string {
  const f = e.first; const nx = e.plan.flatMap((c) => c.items).slice(1, 3);
  return `<div class="g3" style="margin-top:12mm;border-top:1pt solid var(--ink2);padding-top:4mm">
<div><p class="note">목표 직무</p><p style="font-size:15pt;font-weight:700;margin:1mm 0 1mm">${h(e.goal.role)}</p><p class="note">응답 확인</p></div>
<div><p class="note">첫 행동 · ${h(f.when)}</p><p class="sm" style="font-weight:600;margin:1mm 0">${h(f.title)}</p><p class="sm">남길 것: ${h(f.output)}</p><p class="note">분석 제안</p></div>
<div><p class="note">그다음 결과물</p>${nx.length ? nx.map((x) => `<p class="sm" style="margin:1mm 0">${h(x.when)} · ${h(x.output)}</p>`).join("") : `<p class="sm">첫 결과물을 다듬습니다.</p>`}<p class="note">분석 제안 · 8장 90일 계획</p></div></div>`;
}

function mapPage(e: Ed): string {
  const tgtTd = e.roles.find((r) => r.target)?.tdName;
  const rows: [string, (d: number | null) => boolean][] = [
    ["기준까지 직접 결정", (d) => d === 3], ["직접 수행", (d) => d === 2], ["지시받아 수행", (d) => d === 1], ["해 본 적 없음", (d) => d === 0], [UNASKED, (d) => d === null],
  ];
  const cols: ["LOW" | "MID" | "HIGH", string][] = [["LOW", "관심 낮음"], ["MID", "관심 중간"], ["HIGH", "관심 높음"]];
  const cell = (pred: (d: number | null) => boolean, c: string, un: boolean) => {
    const xs = e.map.rows.filter((m) => m.interest === c && pred(m.depth));
    return `<td${un ? ' class="un"' : ""}>${xs.map((m) => `<div${m.name === tgtTd ? ' class="tg"' : ""}>${h(m.name)}${m.name === tgtTd ? " ◆" : ""}</div>`).join("")}</td>`;
  };
  return `<p class="kick">열두 영역</p><h2>관심과 해 본 깊이를 한 장에 놓으면</h2>
<p class="sm" style="max-width:140mm">가로는 관심, 세로는 그 영역의 판단을 어디까지 해 봤는지입니다. 맨 아래 빗금 칸은 ‘없음’이 아니라 이번 검사에서 판단을 묻지 않은 영역입니다.${tgtTd ? ` ◆는 목표 직무의 중심 영역입니다.` : ""}</p>
<table class="mx" style="margin:5mm 0 7mm"><thead><tr><th></th>${cols.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead><tbody>
${rows.map(([l, pred], i) => `<tr${i === 4 ? ' style="border-top:1pt dashed var(--rule)"' : ""}><td class="rowh">${l}</td>${cols.map(([c]) => cell(pred, c, i === 4)).join("")}</tr>`).join("")}
</tbody></table>
<p class="lab">이 지도에서 읽히는 것</p>${lines(e.map.notes)}`;
}

function first(e: Ed): string {
  const t = e.roles.find((r) => r.target);
  const f = e.first;
  return `<p class="kick">목표 직무와 첫 행동</p><h2>${h(e.goal.role)}: ${h(t?.guide.line ?? "")}</h2>
<div class="g73" style="margin-top:5mm"><div>
${lines([...(e.goal.pick ? [e.goal.pick] : []), ...(e.goal.context ? [{ text: `고른 산업·조직 유형: ${e.goal.context}`, src: "응답 확인" as const }] : []), { text: `준비 상태: ${t?.readiness ?? "—"}`, src: "응답 확인" as const }, { text: f.why, src: "응답 확인" as const }])}
</div><div><p class="lab">이 직무의 중심 영역</p><p class="sm"><b>${h(t?.tdName ?? "")}</b><br>${h(LV(t?.tdDepth ?? null))}</p>
${t?.need.length ? `<p class="lab" style="margin-top:5mm">더 필요한 것</p><p class="sm">${t.need.map(h).join("<br>")}</p>` : ""}</div></div>
<div class="blk" style="margin-top:9mm"><p class="kick" style="margin-bottom:2mm">${h(f.when)} · 첫 행동</p><h3 style="font-size:14pt">${h(f.title)}</h3>
<dl class="dl" style="margin-top:3mm"><dt>어디서</dt><dd>${h(f.where)}</dd><dt>무엇을</dt><dd>${h(f.task)}</dd><dt>남길 것</dt><dd>${h(f.output)}</dd><dt>됐는지 보는 법</dt><dd>${h(f.check)}</dd></dl>
<p class="note" style="margin:3mm 0 0;text-align:right">분석 제안</p></div>
<div class="g2" style="margin-top:8mm"><div><p class="lab">왜 이것부터인가</p><p class="sm">${h(f.why)} 이 판단은 ${h(e.goal.role)}의 업무에서 먼저 쓰입니다.</p><p class="note">응답 확인 · 분석 제안</p></div>
<div><p class="lab">그다음 두 행동</p>${e.plan.flatMap((c) => c.items).slice(1, 3).map((x) => `<p class="sm" style="margin:0 0 2mm"><b>${h(x.when)}</b> ${h(x.title)} → ${h(x.output)}</p>`).join("") || `<p class="sm">첫 결과물을 다듬습니다.</p>`}<p class="note">분석 제안</p></div></div>`;
}

function dna(e: Ed): string {
  const ax = Object.keys(JUDGE) as (keyof typeof JUDGE)[];
  const bar = (l: number | null) => (l === null ? `<span class="note">묻지 않음</span>` : `<span class="bar">${[1, 2, 3].map((i) => `<i class="${i <= l ? (l === 3 ? "top" : "on") : ""}"></i>`).join("")}</span>`);
  return `<p class="kick">일하는 방식</p><h2>여덟 가지 판단을 어디까지 해 봤나</h2><p class="lead" style="margin-bottom:5mm">${h(e.dna.lead)}</p>
<table class="dn"><thead><tr><th style="width:30mm">영역</th>${ax.map((a) => `<th>${h(JUDGE[a].name)}</th>`).join("")}</tr></thead><tbody>
${e.dna.domains.map((d) => `<tr><td class="nm">${h(d.name)}<div class="note">${h(d.tag)}</div></td>${ax.map((a) => `<td>${bar(d.levels.find((l) => l.axis === a)?.level ?? null)}</td>`).join("")}</tr>`).join("")}
</tbody></table>
<div class="note" style="margin:3mm 0 8mm;display:flex;gap:6mm;flex-wrap:wrap"><span><span class="bar"><i></i><i></i><i></i></span>&nbsp; 해 본 적 없음</span><span><span class="bar"><i class="on"></i><i></i><i></i></span>&nbsp; 지시받아 수행</span><span><span class="bar"><i class="on"></i><i class="on"></i><i></i></span>&nbsp; 직접 수행</span><span><span class="bar"><i class="top"></i><i class="top"></i><i class="top"></i></span>&nbsp; 기준까지 직접 결정</span><span>모두 응답 확인</span></div>
<div class="g2"><div><p class="lab">판단의 뜻</p>${ax.map((a) => `<p class="sm" style="margin:0 0 1.6mm"><b>${h(JUDGE[a].name)}</b> — ${h(JUDGE[a].plain)}</p>`).join("")}</div>
<div><p class="lab">묻지 않은 영역</p><p class="sm">${e.dna.unasked.length ? `${e.dna.unasked.map(h).join(", ")}은 관심이 높게 나왔지만 이번 검사에서 판단을 묻지 않았습니다. 해 본 적이 없다는 뜻이 아닙니다.` : "관심이 높은 영역은 모두 판단을 물었습니다."}</p></div></div>`;
}

function dnaDomain(d: DnaDomain, firstOne: boolean): string {
  const COVER: Record<string, string> = { strong: "해 봄", partial: "일부", none: "아직" };
  const col = (t: string, xs: string[], empty: string) => `<div><p class="lab">${t}</p>${xs.length ? xs.map((x) => `<p class="sm" style="margin:0 0 2mm">${h(x)}</p>`).join("") : `<p class="sm" style="color:var(--mute)">${empty}</p>`}</div>`;
  return `<p class="kick">일하는 방식 · ${h(d.name)}</p><h2>${h(d.name)}의 일 여덟 단계에서 내가 맡은 곳</h2>
<div class="flow" style="margin:4mm 0 8mm">${d.flow.map((f) => `<div><span class="c ${h(f.cover)}">${COVER[f.cover] ?? ""}</span><b>${f.step}. ${h(f.name)}</b>${h(f.detail)}</div>`).join("")}</div>
<div class="g3">${col("직접 정했다고 고른 것", d.decided, "고른 문장이 없습니다.")}${col("해 봤다고 고른 것", d.did, "고른 문장이 없습니다.")}${col("남긴 결과물", d.left, "고른 결과물이 없습니다.")}</div>
<div class="g2" style="margin-top:7mm"><div><p class="lab">견준 대상</p><p class="sm">${d.compared.length ? d.compared.map(h).join(", ") : "고르지 않았습니다. 성과를 말하려면 비교 대상이 하나는 있어야 합니다."}</p></div>
<div><p class="lab">아직 지시받은 범위까지인 판단</p><p class="sm">${d.open.length ? d.open.map(h).join(", ") : "없습니다."}</p></div></div>
<p class="note" style="margin-top:6mm">${firstOne ? "위 문장은 모두 학생이 검사에서 고른 체크리스트 항목입니다. 단계 표시(해 봄·일부·아직)는 그 단계의 판단에 대한 응답에서 왔습니다." : ""} 응답 확인.</p>`;
}

function roleCycle(r: RoleView): string {
  return `<p class="kick">직무 현장 · ${h(r.name)}</p><h2>${h(r.name)}의 한 주기</h2><p class="lead" style="margin-bottom:4mm">${h(r.guide.line)}</p>
<div class="cyc">${r.guide.cycle.map((c, i) => `<div class="row"><div class="ph"><span>${i + 1}</span>${h(c.phase)}</div><div class="sc">${h(c.scene)}</div><div class="io"><em>정하는 것</em>${h(c.decide)}<em style="margin-top:1.4mm">남기는 것</em>${h(c.output)}</div></div>`).join("")}</div>
<p class="note" style="margin-top:4mm">일반 직무 안내. 특정 기업의 실제 업무가 아니라, 이 직무에서 흔히 거치는 흐름을 장면으로 적었습니다. 함께 일하는 사람: ${h(uniqJoin(r.guide.cycle.map((c) => c.with)))}.</p>`;
}
const uniqJoin = (xs: string[]) => [...new Set(xs.flatMap((x) => x.split(/,\s*/)))].join(", ");

function roleScenes(r: RoleView): string {
  return `<p class="kick">직무 현장 · ${h(r.name)}</p><h2>이런 순간에 판단이 필요합니다</h2>
<div class="sit" style="margin-top:5mm">${r.guide.situations.map((s) => `<div><p class="w">${h(s.when)}</p><p class="d">${h(s.decide)}</p></div>`).join("")}</div>
<div class="g2"><div><p class="lab">헷갈리기 쉬운 경계</p><p class="sm">${h(r.guide.notThis)}</p></div><div><p class="lab">이 직무를 알아보는 질문</p>${r.guide.probes.map((p) => `<p class="sm" style="margin:0 0 2mm">${h(p)}</p>`).join("")}</div></div>
<p class="lab" style="margin-top:8mm">내 응답에서 이 직무로 이어지는 것</p>${r.have.length ? lines(r.have) : `<p class="sm">아직 이 직무 쪽으로 이어지는 응답이 없습니다. 이어지는 첫 장면은 90일 계획에서 만듭니다.</p>`}
<p class="note" style="margin-top:4mm">장면·경계·질문은 일반 직무 안내입니다.</p>`;
}

function rolesOther(rs: RoleView[]): string {
  return `<p class="kick">직무 현장 · 함께 볼 두 직무</p><h2>${rs.length === 2 ? `${h(withJosa(rs[0].name, "과와"))} ${h(rs[1].name)}` : h(rs[0].name)}의 하루</h2>
<div class="g2" style="margin-top:5mm">${rs.map((r) => `<div><p class="lab">${h(r.name)}</p><p class="sm" style="font-weight:500">${h(r.guide.line)}</p>
${r.guide.cycle.map((c, i) => `<div class="ln" style="grid-template-columns:1fr"><div><span class="note">${i + 1}. ${h(c.phase)}</span><br>${h(c.decide)} → <b>${h(c.output)}</b></div></div>`).join("")}
<p class="sm" style="margin-top:3mm"><span class="note">흔한 장면</span><br>${h(r.guide.situations[0]?.when ?? "")}: ${h(r.guide.situations[0]?.decide ?? "")}</p></div>`).join("")}</div>
<p class="note" style="margin-top:5mm">일반 직무 안내. 두 직무는 결과 모델이 응답을 보고 목표 직무와 함께 보라고 고른 것입니다.</p>`;
}

function rolesCompare(e: Ed): string {
  const rs = e.roles;
  const row = (k: string, f: (r: RoleView) => string) => `<tr><th>${k}</th>${rs.map((r) => `<td>${f(r)}</td>`).join("")}</tr>`;
  return `<p class="kick">직무 현장 · 세 직무 나란히</p><h2>정하는 것과 남기는 것이 다릅니다</h2>
<table class="cmp" style="margin-top:5mm"><thead><tr><th></th>${rs.map((r) => `<th class="${r.target ? "tgt" : ""}">${h(r.name)}${r.target ? " · 목표" : ""}</th>`).join("")}</tr></thead><tbody>
${row("한 줄", (r) => h(r.guide.line))}
${row("주로 정하는 것", (r) => r.guide.cycle.slice(0, 3).map((c) => h(c.decide)).join("<br>"))}
${row("남기는 결과물", (r) => r.guide.artifacts.map((a) => h(a.title)).join("<br>"))}
${row("공고에 쓰이는 말", (r) => r.guide.posting.slice(0, 3).map(h).join("<br>"))}
${row("중심 영역의 내 응답", (r) => `${h(r.tdName)}<br><span class="note">${h(LV(r.tdDepth))}</span>`)}
${row("준비 상태", (r) => h(r.readiness))}
</tbody></table>
<p class="note" style="margin-top:4mm">위 다섯 줄은 일반 직무 안내, ‘중심 영역의 내 응답’과 ‘준비 상태’는 응답 확인입니다.</p>`;
}

function confusion(e: Ed): string {
  const c = e.confusion!;
  return `<p class="kick">직무 현장 · 헷갈리는 두 직무</p><h2>${h(withJosa(c.a, "과와"))} ${h(c.b)}, 무엇이 다른가</h2>
<p class="lead">${h(c.tell)}</p>
<div class="vs"><div><p class="big">${h(c.a)}</p><p class="sm"><b>다루는 것</b><br>${h(c.a_does)}</p><p class="sm"><b>남기는 것</b><br>${h(c.a_output)}</p><p class="note">중심 영역 ${h(c.aTd)} · 내 응답: ${h(LV(c.aDepth))}</p></div>
<div><p class="big">${h(c.b)}</p><p class="sm"><b>다루는 것</b><br>${h(c.b_does)}</p><p class="sm"><b>남기는 것</b><br>${h(c.b_output)}</p><p class="note">중심 영역 ${h(c.bTd)} · 내 응답: ${h(LV(c.bDepth))}</p></div></div>
<div class="blk n" style="margin-top:8mm"><p class="lab" style="border:0;margin:0 0 1.6mm;padding:0">닮은 점</p><p class="sm">${h(c.same)}</p><p class="lab" style="border:0;margin:3mm 0 1.6mm;padding:0">내 응답이 가리키는 쪽</p><p class="sm" style="margin:0">${h(c.leans)}</p></div>
<p class="note" style="margin-top:4mm">두 직무의 설명은 일반 직무 안내, ‘내 응답’은 응답 확인입니다.</p>`;
}

function chainBlock(c: Chain): string {
  return `<div class="ch"><div class="hd"><h3>${h(c.title)}</h3><span class="note">${h(c.kind)} · ${h(c.period)} · 학생 자기기록</span></div>
${c.claim ? `<p style="font-size:12pt;font-weight:600;margin:1mm 0 3mm">“${h(c.claim.text)}”</p>` : `<p class="sm" style="color:var(--acc)">아직 이 기록으로 말할 수 있는 한 줄이 없습니다. 맡았던 부분부터 적습니다.</p>`}
${c.rows.map((r) => `<div class="row"><div class="k">${h(r.label)}</div><div>${r.items.length ? r.items.map(h).join(" · ") : `<span class="e">비어 있음</span> — <span class="note">${h(r.empty)}</span>`}</div></div>`).join("")}
${c.tests.length ? `<div class="row"><div class="k">검사 응답과</div><div class="sm">${c.tests.map(h).join("<br>")}</div></div>` : ""}
<div class="row"><div class="k">면접 전에 채울 것</div><div class="sm">${c.check.map(h).join(" · ")}</div></div></div>`;
}

function evidence(e: Ed, cs: Chain[], withCross: boolean): string {
  return `<p class="kick">증거</p><h2>경험 기록을 주장·판단·결과물로 나누면</h2>
<p class="sm" style="max-width:150mm;margin-bottom:5mm">직접 적은 기록을 칸별로 나눴습니다. 빈 칸은 숨기지 않았습니다. 빈 칸이 면접에서 가장 먼저 물어볼 곳입니다.</p>
${cs.map(chainBlock).join("")}
${withCross ? crossTable(e) : ""}`;
}
function crossTable(e: Ed): string {
  if (!e.cross.length) return "";
  return `<p class="lab" style="margin-top:2mm">응답과 기록 맞춰 보기</p><table><thead><tr><th style="width:30mm">영역</th><th>검사 응답</th><th style="width:44mm">경험 기록</th><th style="width:56mm">읽는 법</th></tr></thead><tbody>
${e.cross.map((x) => `<tr><td><b>${h(x.name)}</b></td><td>${h(x.test)}</td><td>${h(x.record)}</td><td>${h(x.reading)}</td></tr>`).join("")}</tbody></table>`;
}

function org(e: Ed): string {
  const t = e.roles.find((r) => r.target)!;
  const others = e.roles.filter((r) => !r.target).slice(0, 2);
  return `<p class="kick">산업과 조직</p><h2>같은 ${h(t.name)}도 조직 유형에 따라 일이 달라집니다</h2>
<p class="sm" style="max-width:150mm">특정 기업을 고르지 않았습니다. 기업 정보는 이 결과지가 확인할 수 없는 부분이 많아, 조직 유형별로 일이 어떻게 달라지는지만 적었습니다.${e.goal.context ? ` 검사에서 고른 산업·조직 유형은 ‘${h(e.goal.context)}’입니다(응답 확인).` : ""}</p>
<table style="margin:5mm 0 7mm"><thead><tr><th style="width:34mm">조직 유형</th><th>${h(t.name)}의 일이 달라지는 점</th></tr></thead><tbody>${e.org.map((o) => `<tr><td><b>${h(o.type)}</b></td><td>${h(o.how)}</td></tr>`).join("")}</tbody></table>
<div class="g2"><div><p class="lab">공고에서 이 직무를 부르는 말</p><div class="tags">${t.guide.posting.map((p) => `<span>${h(p)}</span>`).join("")}</div>
<p class="sm" style="margin-top:4mm">공고 문장을 읽을 때는 이 말 뒤에 붙은 ‘무엇을 정하는지’를 찾습니다. 위 직무 현장 쪽의 ‘정하는 것’과 맞춰 보면 됩니다.</p></div>
<div><p class="lab">기업을 직접 알아볼 때</p><p class="sm">공식 누리집의 사업 소개와 채용 공고 원문을 먼저 읽습니다. 맡을 일과 근무 조건은 공고 원문에서만 확인합니다. 검색 결과나 기사만으로 정리하지 않습니다.</p></div></div>
${others.length ? `<p class="lab" style="margin-top:8mm">함께 볼 두 직무는 이렇게 달라집니다</p><table><thead><tr><th style="width:34mm">조직 유형</th>${others.map((r) => `<th>${h(r.name)}</th>`).join("")}</tr></thead><tbody>${e.org.map((o, i) => `<tr><td><b>${h(o.type)}</b></td>${others.map((r) => `<td>${h(r.guide.org[i]?.how ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>` : ""}
<p class="note" style="margin-top:4mm">조직 유형 설명은 일반 직무 안내입니다.</p>`;
}

function tplBlock(t: Tpl): string {
  return `<div class="tpl"><div class="hd"><h3 style="font-size:13pt">${h(t.title)}</h3><span class="st${t.status === "새로 만들기" ? " new" : ""}">${h(t.status)}</span></div>
<p class="note">쓰는 때: ${h(t.use)}${t.mine.length ? ` · 비슷한 내 결과물: ${t.mine.map((m) => `‘${h(m)}’`).join(", ")}(응답 확인). 그대로 옮기지 말고 이 칸에 맞는 내용만 가져옵니다` : ""}</p>
<table><tbody>${t.fields.map((f) => `<tr><td class="f">${h(f)}</td><td class="b"></td></tr>`).join("")}</tbody></table>
<ul class="chk">${t.judge.map((j) => `<li>${h(j)}</li>`).join("")}</ul></div>`;
}

function portfolio(e: Ed, ts: Tpl[], n: number, of: number): string {
  return `<p class="kick">포트폴리오 실습${of > 1 ? ` · ${n}/${of}` : ""}</p><h2>${n === 1 ? `${h(e.goal.role)} 결과물을 양식부터 만들어 봅니다` : "양식을 채우고 이 질문으로 검토합니다"}</h2>
${n === 1 ? `<p class="sm" style="max-width:150mm;margin-bottom:5mm">완성된 예시를 넣지 않았습니다. 칸은 비워 두었고, 칸마다 내 과제의 내용을 직접 채웁니다. 아래 □ 항목은 다 채운 뒤 스스로 검토하는 질문입니다. 양식은 일반 직무 안내입니다.</p>` : ""}
${ts.map(tplBlock).join("")}`;
}

function story(e: Ed): string {
  const s = e.story;
  if (!s) return "";
  return `<p class="kick">지원서</p><h2>한 문단의 뼈대: ${h(s.from)}</h2>
<p class="sm" style="max-width:150mm;margin-bottom:5mm">채워진 칸은 검사 응답과 경험 기록에서 그대로 옮겼습니다. 빈 칸은 지어 넣지 않았습니다. 상황과 맡은 몫, 결과 수치는 직접 적습니다.</p>
<div class="story" style="border-top:1pt solid var(--ink2)">${s.parts.map((p) => `<div class="row"><div class="k">${h(p.label)}</div><div class="v${p.filled ? "" : " blank"}">${p.filled ? h(p.text) : "직접 적습니다"}</div></div>`).join("")}</div>
<div class="g2" style="margin-top:8mm"><div><p class="lab">쓰는 순서</p><p class="sm">1. 상황과 내 몫을 한 줄로<br>2. 내가 정한 것과 그 까닭<br>3. 남긴 결과물<br>4. 무엇과 견줬고 무엇이 달라졌는지(수치)</p></div>
<div><p class="lab">쓰지 않는 것</p><p class="sm">해 보지 않은 일, 기록에 없는 성과, 확인하지 않은 수치. 면접에서 한 번만 되물어도 무너집니다.</p></div></div>`;
}

function probes(e: Ed, ps: Probe[]): string {
  return `<p class="kick">면접</p><h2>예상 질문과 꺼낼 재료</h2>
<p class="sm" style="max-width:150mm;margin-bottom:4mm">질문은 판단 하나씩을 묻습니다. 같은 판단을 스스로 해 봤다고 고른 응답이 있으면 그것을 재료로, 없으면 그 판단을 채울 실행 과제를 적었습니다.</p>
<table class="pr"><thead><tr><th>질문</th><th>꺼낼 재료</th><th>면접관이 보는 것</th></tr></thead><tbody>
${ps.map((p) => `<tr><td class="q">${h(p.q)}<div class="note">${h(JUDGE[p.axis as keyof typeof JUDGE]?.name ?? "")}</div></td><td class="m">${p.have ? `${h(p.have.text)}<div class="note">${h(p.have.src)}</div>` : p.prep ? `<span class="gap">아직 장면 없음</span> — ${h(p.prep.text)}<div class="note">${h(p.prep.src)}</div>` : ""}</td><td class="sm">${h(p.why)}<div class="note">일반 직무 안내</div></td></tr>`).join("")}
</tbody></table>`;
}

function plan(e: Ed): string {
  return `<p class="kick">90일</p><h2>다음 90일, 결과물 하나씩</h2>
<p class="sm" style="max-width:150mm;margin-bottom:6mm">기간마다 남길 결과물과 다 됐는지 보는 기준을 적었습니다. 결과물이 남으면 지원서와 면접에서 꺼낼 장면이 하나 생깁니다.</p>
<div class="board">${e.plan.map((c, i) => `<div class="col${i === 0 ? " now" : ""}"><p class="wh">${h(c.when)}</p>${c.items.length ? c.items.map((it) => `<div class="it"><b>${h(it.title)}</b><p class="sm" style="margin:0">${h(it.where)} ${h(it.task)}</p><p class="o"><em>남길 것</em> ${h(it.output)}<br><em>확인</em> ${h(it.check)}</p></div>`).join("") : `<p class="sm" style="color:var(--mute)">앞 기간의 결과물을 다듬습니다.</p>`}</div>`).join("")}</div>
<p class="note" style="margin-top:5mm">분석 제안. 응답에서 비어 있는 판단 가운데 목표 직무에 걸리는 것부터 차례를 정했습니다.</p>
${e.plan.flatMap((c) => c.items).length > 3 ? `<p class="sm" style="margin-top:6mm"><b>90일 뒤</b> 결과물을 6장 양식의 □ 질문으로 검토하고, 7장 면접표의 ‘아직 장면 없음’ 칸과 지원서 빈 칸을 채웁니다.</p>` : `<div class="blk n" style="margin-top:9mm"><p class="lab" style="border:0;padding:0;margin:0 0 2mm">90일 뒤에 할 일</p><p class="sm">1. 만든 결과물을 6장 양식의 □ 질문으로 다시 검토합니다.<br>2. 7장 면접표에서 ‘아직 장면 없음’ 칸을 새 결과물로 채웁니다.<br>3. 지원서 한 문단의 빈 칸(상황·맡은 몫·결과 수치)을 채워 다시 씁니다.<br>4. 같은 검사를 다시 보면, 이번에 비어 있던 판단이 어디까지 왔는지 견줄 수 있습니다.</p></div>`}`;
}

function methods(e: Ed): string {
  return `<p class="kick">읽는 법과 한계</p><h2>이 결과지가 말하지 않는 것</h2>
${e.limits.map((l) => `<p>${h(l)}</p>`).join("")}
<div class="g2" style="margin-top:8mm"><div><p class="lab">근거의 층</p><p class="sm"><b>응답 확인</b> 검사에서 고른 답과 체크리스트 항목<br><b>학생 자기기록</b> 학생이 직접 적은 경험 기록. 확인하지 않음<br><b>일반 직무 안내</b> 특정 기업이 아닌 직무 일반 서술<br><b>분석 제안</b> 응답을 읽고 이 결과지가 권하는 것</p></div>
<div><p class="lab">판단 단계</p><p class="sm">${[0, 1, 2, 3].map((n) => `<b>${STEP[n as 0 | 1 | 2 | 3].tag}</b>`).join(" → ")}<br>${UNASKED}: 단계를 매기지 않음</p></div></div>
`;
}

export const PROTO_KEYS = ["cover", "verdict", "map", "first", "dna", "role-cycle", "roles-compare", "evidence-1", "org", "portfolio-1", "interview", "plan"] as const;

export function pages7(e: Ed): Page7[] {
  const w = e.who;
  const out: Page7[] = [];
  out.push({ key: "cover", chapter: "", title: "표지", html: cover(e) });
  out.push(page("verdict", "1 먼저 볼 것", "한 문장 진단", verdict(e), w));
  out.push(page("map", "1 먼저 볼 것", "열두 영역 지도", mapPage(e), w));
  out.push(page("first", "1 먼저 볼 것", "목표 직무와 첫 행동", first(e), w));
  out.push(page("dna", "2 일하는 방식", "여덟 판단", dna(e), w));
  e.dna.domains.filter((d) => d.decided.length + d.did.length + d.left.length > 0).slice(0, 3)
    .forEach((d, i) => out.push(page(`dna-${d.code}`, "2 일하는 방식", d.name, dnaDomain(d, i === 0), w)));
  const t = e.roles.find((r) => r.target);
  if (t) { out.push(page("role-cycle", "3 직무 현장", `${t.name}의 한 주기`, roleCycle(t), w)); out.push(page("role-scenes", "3 직무 현장", `${t.name}의 장면`, roleScenes(t), w)); }
  const others = e.roles.filter((r) => !r.target).slice(0, 2);
  if (others.length) out.push(page("roles-other", "3 직무 현장", "함께 볼 두 직무", rolesOther(others), w));
  out.push(page("roles-compare", "3 직무 현장", "세 직무 나란히", rolesCompare(e), w));
  if (e.confusion) out.push(page("confusion", "3 직무 현장", "헷갈리는 두 직무", confusion(e), w));
  /* 기록 한 건은 반 쪽 남짓이다. 두 건까지 한 쪽, 대조표는 기록이 한 건이면 같은 쪽에 */
  const cs = e.chains;
  if (cs.length) {
    for (let i = 0; i < cs.length; i += 2) out.push(page(`evidence-${i / 2 + 1}`, "4 증거", "경험 기록", evidence(e, cs.slice(i, i + 2), false), w));
    if (e.cross.length) out.push(page("cross", "4 증거", "응답과 기록", `<p class="kick">증거</p><h2>응답과 기록이 같은 쪽을 가리키는가</h2>${crossTable(e)}`, w));
  }
  out.push(page("org", "5 산업과 조직", "조직 유형", org(e), w));
  const ts = e.templates;
  for (let i = 0; i < ts.length; i += 2) out.push(page(`portfolio-${i / 2 + 1}`, "6 포트폴리오", "결과물 양식", portfolio(e, ts.slice(i, i + 2), i / 2 + 1, Math.ceil(ts.length / 2)), w));
  if (e.story) out.push(page("story", "7 지원서와 면접", "한 문단", story(e), w));
  out.push(page("interview", "7 지원서와 면접", "예상 질문", probes(e, e.probes), w));
  out.push(page("plan", "8 90일", "실행 계획", plan(e), w));
  out.push(page("methods", "9 읽는 법", "한계", methods(e), w));
  return out;
}

export function html7(e: Ed, ps: Page7[], f: Fonts7): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri 진로·직무 분석</title><style>${CSS(f)}</style></head><body>
${ps.map((p, i) => `<section class="pg${p.key === "cover" ? " cover" : ""}" data-key="${p.key}" data-n="${i + 1}">${p.html.replace('<span class="pn"></span>', `<span>${i + 1}</span>`)}</section>`).join("\n")}
</body></html>`;
}
