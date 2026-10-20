/**
 * **R5 긴 판의 겉모양(사용자 참고 이미지 반영 · 2026-10-20).** 짙은 로열 블루 한 계열 + 노란 가는 선 하나.
 * - 표지: 파란 전면 · 원과 호 · 점 무늬(라이브러리 보고서 표지)
 * - 장 표지: 파란 전면 · 큰 Chapter 번호 · 이 장이 답하는 물음 · 꼭지와 쪽 번호
 * - 한눈에 보기: 원페이저 대시보드(아이콘 칸 · 막대 · 도넛). **값은 이 학생의 응답에서 센 수뿐이다** — 점수 · 비율 · 순위를 만들지 않는다
 * 그래픽은 장식이 아니라 자리 표시다: 숫자를 품은 그래프는 모두 응답 개수이고, 원 · 호는 표지와 장 표지에만 쓴다.
 */
import type { Ed8 } from "./editorial8";
import type { Report3 } from "./report3";
import { STEP } from "./words";

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const BLUE = { deep: "#141f73", royal: "#2433b8", mid: "#3a5bdc", light: "#5f9bf5", sky: "#d9e4fb", ice: "#eef3fd", cyan: "#3fc3e6", line: "#f2c230" };

/* ── 아이콘(선 그림 · currentColor) ───────────────────────────── */
const I = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON: Record<string, string> = {
  grid: I('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  check: I('<path d="M4 12.5l5 5L20 6.5"/>'),
  doc: I('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>'),
  note: I('<path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
  target: I('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>'),
  user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  layers: I('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  brief: I('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/><path d="M3 13h18"/>'),
  chat: I('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>'),
  cal: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  book: I('<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>'),
};

export type ChapInfo = { no: string; title: string; ask: string; icon: string };
export const CHAP_INFO: Record<string, ChapInfo> = {
  "01": { no: "01", title: "요약", ask: "응답에서 무엇이 확인됐고, 지금 무엇부터 하면 되는가", icon: "target" },
  "02": { no: "02", title: "진단과 개인 역량", ask: "열두 영역 가운데 어디까지 해 봤다고 답했나 — 영역마다 여덟 판단으로", icon: "grid" },
  "03": { no: "03", title: "근거", ask: "고른 근거와 적은 기록이 어디를 가리키고, 어디가 비어 있나", icon: "layers" },
  "04": { no: "04", title: "직무", ask: "그 근거가 어느 직무의 어느 일에 닿고, 직무마다 무엇이 다른가", icon: "brief" },
  "05": { no: "05", title: "지원서 · 면접 · 포트폴리오", ask: "가진 재료로 무엇을 쓰고, 무엇을 받으면 어떻게 답하나", icon: "chat" },
  "06": { no: "06", title: "실행 계획", ask: "30 · 60 · 90일과 6 · 12개월에 무엇을 만들어 남기나", icon: "cal" },
  "07": { no: "07", title: "출처와 한계", ask: "이 리포트가 무엇을 근거로 썼고, 무엇은 하지 않았나", icon: "book" },
};

/* ── 표지 ─────────────────────────────────────────────────────── */
export function coverB(e: Ed8): string {
  const year = (e.who.answeredOn || "").slice(0, 4) || "2026";
  const dots = Array.from({ length: 6 }, (_, r) => Array.from({ length: 9 }, (_, c) => `<circle cx="${c * 9 + 4}" cy="${r * 9 + 4}" r="1.3"/>`).join("")).join("");
  return `<div class="cvb">
  <svg class="cvb-art" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">
    <defs><radialGradient id="g1" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="${BLUE.cyan}"/><stop offset=".55" stop-color="${BLUE.light}"/><stop offset="1" stop-color="${BLUE.mid}" stop-opacity="0"/></radialGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>
    <circle cx="168" cy="196" r="62" fill="url(#g1)"/>
    <circle cx="168" cy="196" r="86" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".5"/>
    <path d="M118 150 A70 70 0 0 1 222 120" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M128 262 A54 54 0 0 0 198 238" fill="none" stroke="${BLUE.line}" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="40" cy="250" r="34" fill="url(#g2)"/>
    <g fill="#fff" fill-opacity=".35" transform="translate(150 22)">${dots}</g>
  </svg>
  <div class="cvb-top"><span>CAREERMATRI</span><span>${h(e.who.school)}</span></div>
  <div class="cvb-title">
    <div class="y">${h(year)}</div>
    <div class="t1">진로 · 직무</div>
    <div class="t2">리포트</div>
    <i class="ln"></i>
    <div class="who">${h(e.who.department)}${e.who.specialization ? ` · ${h(e.who.specialization)}` : ""}</div>
    <p class="sum">학생이 고른 응답과 직접 적은 기록으로 만든 리포트입니다. 점수와 순위를 만들지 않았고, 채용 결과를 예측하지 않습니다.</p>
  </div>
  <div class="cvb-foot"><span>${h(e.who.answeredOn)} 응답</span><span>목표 직무 ${h(e.goal.role)}</span></div>
</div>`;
}

/* ── 장 표지 ──────────────────────────────────────────────────── */
export function divider(no: string, items: { i: number; title: string }[]): string {
  const c = CHAP_INFO[no];
  return `<div class="dvb">
  <svg class="dvb-art" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">
    <defs><radialGradient id="d${no}" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="${BLUE.cyan}"/><stop offset=".6" stop-color="${BLUE.light}" stop-opacity=".9"/><stop offset="1" stop-color="${BLUE.mid}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="176" cy="230" r="48" fill="url(#d${no})"/>
    <path d="M130 270 A58 58 0 0 1 200 176" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/>
  </svg>
  <div class="dvb-k">Chapter</div>
  <div class="dvb-n">${no}</div>
  <div class="dvb-ic">${ICON[c.icon]}</div>
  <h1 class="dvb-t">${h(c.title)}</h1>
  <i class="ln"></i>
  <p class="dvb-q">${h(c.ask)}</p>
  <ol class="dvb-l">${items.map((x) => `<li><span>${x.i}</span>${h(x.title)}</li>`).join("")}</ol>
</div>`;
}

/* ── 한눈에 보기 대시보드 ─────────────────────────────────────── */
const INT_KO = { HIGH: "관심 높음", MID: "관심 보통", LOW: "관심 낮음" } as const;
function donut(parts: { v: number; c: string }[], size = 34, w = 7, label = ""): string {
  const tot = parts.reduce((t, p) => t + p.v, 0) || 1;
  const r = (size - w) / 2, C = 2 * Math.PI * r;
  let off = 0;
  const segs = parts.filter((p) => p.v > 0).map((p) => { const len = (p.v / tot) * C; const s = `<circle r="${r}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="${p.c}" stroke-width="${w}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`; off += len; return s; }).join("");
  return `<svg viewBox="0 0 ${size} ${size}" class="dn"><circle r="${r}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="#e6ebf5" stroke-width="${w}"/>${segs}${label ? `<text x="${size / 2}" y="${size / 2 + 2.6}" text-anchor="middle" class="dn-l">${h(label)}</text>` : ""}</svg>`;
}
const LV_C = ["#c9d3e8", BLUE.light, BLUE.royal, BLUE.deep];

export function dashboard(e: Ed8, r: Report3, pn: number): string {
  const who = `${e.who.school} ${e.who.department}`;
  const asked = r.domains.filter((d) => d.askedHow !== "NONE");
  const rows = e.map.rows;
  const cells = asked.flatMap((d) => d.levels.map((l) => l.level)).filter((x): x is 0 | 1 | 2 | 3 => x !== null);
  const cnt = [0, 1, 2, 3].map((lv) => cells.filter((x) => x === lv).length);
  const kpi = [
    { ic: "target", n: cells.filter((x) => x >= 2).length, u: `/ ${cells.length}`, l: "직접 수행 이상으로 답한 판단" },
    { ic: "check", n: r.profile.picks, u: "개", l: "체크리스트에서 고른 근거" },
    { ic: "doc", n: r.profile.artifacts, u: "개", l: "고른 결과물" },
    { ic: "note", n: r.records.length, u: "건", l: "함께 읽은 경험 기록" },
  ];
  const bars = rows.map((x) => {
    const d = x.depth;
    const hpct = d === null ? 100 : Math.max(6, ((d + 1) / 4) * 100);
    return `<div class="br"><div class="bk"><i class="${d === null ? "un" : `l${d}`}" style="height:${hpct}%"></i></div><em class="it ${x.interest}">${x.interest === "HIGH" ? "●" : x.interest === "MID" ? "◐" : "○"}</em><span>${h(x.name)}</span></div>`;
  }).join("");
  const top = [...asked].map((d) => ({ d, n: d.levels.filter((l) => (l.level ?? -1) >= 2).length, k: d.levels.filter((l) => l.level !== null).length }))
    .sort((a, b) => b.n - a.n || b.k - a.k).slice(0, 3);
  const cards = top.map(({ d, n, k }) => `<div class="cd"><div class="cdh"><span class="ic">${ICON.target}</span><b>${h(d.name)}</b></div>
    <div class="cdb">${donut([{ v: n, c: BLUE.royal }, { v: k - n, c: "#c9d3e8" }], 30, 6, `${n}/${k}`)}<dl><div><dt>직접 수행 이상</dt><dd>${n}개 판단</dd></div><div><dt>물은 판단</dt><dd>${k}개</dd></div><div><dt>관심</dt><dd>${d.interest ? h(INT_KO[d.interest as keyof typeof INT_KO] ?? d.interest) : "—"}</dd></div></dl></div></div>`).join("");
  return `<div class="hd"><span><b>${h(who)}</b> · 진로·직무 리포트</span><span>대시보드 · ${pn}</span></div>
<div class="bd dsb">
  <div class="ey">01 요약 · 응답에서 센 수로만 그렸습니다</div>
  <div class="dband"><div><span>판단을 물은 영역</span><b>${asked.length}<small>/ ${rows.length}</small></b></div><p>${h(e.verdict.head.replace(/정해 본 경험이 있습니다\.$/, "정했다고 응답했습니다.").replace(/해 본 경험이 있습니다\.$/, "해 봤다고 응답했습니다."))}</p></div>
  <div class="kpi">${kpi.map((k) => `<div><span class="ic">${ICON[k.ic]}</span><b>${k.n}<small>${h(k.u)}</small></b><em>${h(k.l)}</em></div>`).join("")}</div>
  <div class="dg">
    <div class="pane"><h3>열두 영역 · 응답한 깊이</h3><div class="bars">${bars}</div>
      <p class="lg2"><i class="l1"></i>지시받아 수행 <i class="l2"></i>직접 수행 <i class="l3"></i>기준까지 직접 결정 <i class="un"></i>이번 검사에서 묻지 않음 · ● 관심 높음 ◐ 보통 ○ 낮음</p></div>
    <div class="pane"><h3>물은 판단 ${cells.length}칸 · 단계별</h3><div class="dw">${donut(cnt.map((v, i) => ({ v, c: LV_C[i] })), 40, 9, String(cells.length))}
      <ul>${cnt.map((v, i) => `<li><i style="background:${LV_C[i]}"></i>${h(STEP[i as 0 | 1 | 2 | 3].tag)}<b>${v}</b></li>`).join("")}</ul></div></div>
  </div>
  <h3 class="bh">판단이 가장 깊게 확인된 영역</h3>
  <div class="cds">${cards || `<p class="none">직접 수행 이상으로 답한 판단이 아직 없습니다. 첫 근거는 실행 계획 장의 첫 과제에서 만듭니다.</p>`}</div>
  <p class="fnb">막대 높이는 그 영역에서 가장 깊게 답한 판단의 단계(4단계)이고, 도넛은 물은 판단 칸의 개수입니다. 점수 · 백분율 · 다른 학생과의 비교가 아닙니다.</p>
</div>
<div class="ft"><span class="lg"><span>● 응답</span><span>○ 학생이 적은 기록</span><span>◇ 직무 일반 안내</span><span>→ 이 리포트의 제안</span></span><span>CareerMatri</span></div>`;
}

/* ── R5 문서 쪽에 입히는 층 ───────────────────────────────────── */
export const THEME_R5 = `
:root{--dark:${BLUE.deep};--dark2:#1d2a8f;--acc:${BLUE.royal};--accT:${BLUE.ice};--blue:${BLUE.royal};--blueT:${BLUE.ice};--onDark2:#b9c5f0}
.pg::before{content:"";position:absolute;left:0;right:0;top:0;height:2.2mm;background:linear-gradient(90deg,${BLUE.deep},${BLUE.royal} 55%,${BLUE.cyan})}
.pg .hd b{color:${BLUE.deep}}
.pg.full::before{display:none}
.pg.full{padding:0;background:${BLUE.royal}}
.cvb,.dvb{position:relative;width:210mm;height:297mm;overflow:hidden;color:#fff;background:linear-gradient(155deg,#2b3cc9 0%,${BLUE.royal} 45%,${BLUE.deep} 100%)}
.cvb-art,.dvb-art{position:absolute;inset:0;width:100%;height:100%}
.cvb-top{position:absolute;top:16mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:9pt;letter-spacing:.18em;font-weight:700;color:#dbe4ff}
.cvb-title{position:absolute;left:18mm;top:92mm;width:120mm}
.cvb-title .y{font-size:40pt;font-weight:800;color:${BLUE.cyan};line-height:1}
.cvb-title .t1{font-size:30pt;font-weight:400;line-height:1.15;margin-top:3mm}
.cvb-title .t2{font-size:34pt;font-weight:800;line-height:1.1;letter-spacing:.04em}
.cvb-title .ln,.dvb .ln{display:block;width:34mm;height:1.2mm;background:${BLUE.line};margin:6mm 0 5mm}
.cvb-title .who{font-size:12pt;font-weight:700}
.cvb-title .sum{font-size:9.2pt;line-height:1.65;color:#dbe4ff;margin:2mm 0 0}
.cvb-foot{position:absolute;left:18mm;right:18mm;bottom:16mm;display:flex;gap:8mm;font-size:9pt;font-weight:600;color:#dbe4ff}
.dvb-k{position:absolute;left:20mm;top:58mm;font-size:16pt;letter-spacing:.14em;color:#dbe4ff}
.dvb-n{position:absolute;left:18mm;top:66mm;font-size:96pt;font-weight:800;line-height:1;color:#fff}
.dvb-ic{position:absolute;left:20mm;top:112mm;width:15mm;height:15mm;color:${BLUE.cyan}}
.dvb-t{position:absolute;left:20mm;top:132mm;font-size:30pt;font-weight:800;margin:0;max-width:150mm;line-height:1.2}
.dvb .ln{position:absolute;left:20mm;top:152mm;margin:0}
.dvb-q{position:absolute;left:20mm;top:158mm;width:120mm;font-size:12pt;line-height:1.6;color:#dbe4ff;margin:0}
.dvb-l{position:absolute;left:20mm;top:186mm;width:110mm;list-style:none;margin:0;padding:0}
.dvb-l li{display:flex;gap:4mm;font-size:10pt;line-height:1.5;padding:1.3mm 0;border-bottom:.5pt solid rgba(255,255,255,.22)}
.dvb-l li span{width:8mm;color:${BLUE.cyan};font-weight:700}
.dsb .ey{font-size:var(--t-label);color:${BLUE.royal};font-weight:700;margin-bottom:2mm}
.dband{display:flex;gap:7mm;align-items:center;background:${BLUE.deep};color:#fff;padding:4mm 6mm;border-radius:1.5mm}
.dband span{display:block;font-size:8.6pt;color:#b9c5f0}.dband b{font-size:30pt;font-weight:800;line-height:1;color:${BLUE.cyan}}.dband small{font-size:12pt;color:#b9c5f0;margin-left:1mm}
.dband p{margin:0;font-size:11pt;line-height:1.55;font-weight:600}
.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:4mm 0}
.kpi>div{border:.6pt solid #d6def0;border-radius:1.5mm;padding:3mm;display:grid;grid-template-columns:11mm 1fr;grid-template-rows:auto auto;column-gap:2mm}
.kpi .ic{grid-row:span 2;width:11mm;height:11mm;border-radius:50%;background:${BLUE.ice};color:${BLUE.royal};padding:2.4mm}
.kpi b{font-size:19pt;font-weight:800;color:${BLUE.deep};line-height:1}.kpi small{font-size:9pt;color:var(--mute);margin-left:.8mm;font-weight:600}.kpi em{font-style:normal;font-size:8.6pt;color:var(--ink2)}
.dg{display:grid;grid-template-columns:1.55fr 1fr;gap:4mm}
.pane{border:.6pt solid #d6def0;border-radius:1.5mm;padding:3mm 3.4mm}
.pane h3,.bh{font-size:10.5pt;font-weight:800;color:${BLUE.deep};margin:0 0 2.4mm}
.bars{display:grid;grid-template-columns:repeat(12,1fr);gap:1mm;align-items:end;height:60mm}
.br{display:flex;flex-direction:column;align-items:center;height:100%}
.bk{flex:1;width:100%;display:flex;flex-direction:column;justify-content:flex-end;position:relative;background:#f4f6fb;border-radius:1mm}
.bk i{display:block;width:100%;border-radius:1mm 1mm 0 0}.bk b{position:absolute;left:0;right:0;top:1mm;text-align:center;font-size:8.5pt;color:#fff;font-weight:700;writing-mode:vertical-rl;margin:auto}
i.l0{background:#c9d3e8}i.l1{background:${BLUE.light}}i.l2{background:${BLUE.royal}}i.l3{background:${BLUE.deep}}
i.un{background:repeating-linear-gradient(135deg,#e4e9f4 0 1.2mm,#fff 1.2mm 2.4mm)}
.br .it{font-style:normal;font-size:8.6pt;color:${BLUE.royal};margin-top:1mm}.br span{font-size:8.5pt;line-height:1.2;text-align:center;height:14mm;letter-spacing:-.02em;margin-top:.6mm;color:var(--ink2);word-break:keep-all}
.lg2{font-size:8.5pt;color:var(--mute);margin:2.4mm 0 0;line-height:1.6}.lg2 i{display:inline-block;width:3mm;height:3mm;border-radius:.6mm;margin:0 1mm 0 2mm;vertical-align:-.4mm}
.dw{display:flex;flex-direction:column;align-items:center;gap:3mm}.dw .dn{width:40mm;height:40mm}
.dw ul{list-style:none;margin:0;padding:0;width:100%}.dw li{display:flex;align-items:center;gap:2mm;font-size:9pt;padding:1mm 0;border-bottom:.4pt solid #e6ebf5}.dw li i{width:3mm;height:3mm;border-radius:.6mm}.dw li b{margin-left:auto;color:${BLUE.deep}}
.dn-l{font-size:7px;font-weight:800;fill:${BLUE.deep};font-family:P,sans-serif}
.bh{margin-top:4mm}
.cds{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}
.cd{border:.6pt solid #d6def0;border-radius:1.5mm;overflow:hidden}
.cdh{display:flex;align-items:center;gap:2mm;background:${BLUE.deep};color:#fff;padding:2mm 3mm}.cdh .ic{width:5mm;height:5mm;color:${BLUE.cyan}}.cdh b{font-size:9.6pt}
.cdb{display:flex;gap:3mm;align-items:center;padding:2.6mm 3mm}.cdb .dn{width:22mm;height:22mm;flex:none}
.cdb dl{margin:0;flex:1}.cdb dl div{display:flex;justify-content:space-between;font-size:8.6pt;padding:.7mm 0;border-bottom:.4pt solid #e6ebf5}.cdb dt{color:var(--mute)}.cdb dd{margin:0;font-weight:700;color:${BLUE.deep}}
.fnb{margin-top:auto;font-size:8.6pt;color:var(--mute);line-height:1.55;border-top:.6pt solid var(--line);padding-top:2mm}
.ic svg{width:100%;height:100%}
`;

/* ── v9 문서 쪽에 입히는 층 ───────────────────────────────────── */
export const THEME_V9 = `
:root{--navy:${BLUE.deep};--blue:${BLUE.royal};--sky:${BLUE.sky};--amber:${BLUE.royal};--amber-t:${BLUE.ice};--teal:${BLUE.mid};--tint:#f4f6fb}
.pg::before{content:"";position:absolute;left:0;right:0;top:0;height:2.2mm;background:linear-gradient(90deg,${BLUE.deep},${BLUE.royal} 55%,${BLUE.cyan})}
.rh b{color:${BLUE.deep}}
.kick{color:${BLUE.royal}}
.op{border-bottom:.8pt solid ${BLUE.deep}}
.op h1{color:${BLUE.deep}}
.eyebrow{border-top-color:${BLUE.royal};color:${BLUE.deep}}
h1,h2,h3,h4{color:${BLUE.deep}}
.x-map td b.z-Z1{background:${BLUE.deep}}
.x-qa li>span{background:${BLUE.royal}}
.x-ul.x-need li:before{background:${BLUE.line}}
.x-miss{border-color:${BLUE.mid};background:${BLUE.ice}}.x-miss b,.x-miss li span{color:${BLUE.deep}}
.x-slot{border-bottom-color:${BLUE.mid};color:${BLUE.mid}}
.op2{border-top-color:${BLUE.deep}}
`;
