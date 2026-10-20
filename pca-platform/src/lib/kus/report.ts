/**
 * KUS 학생 개인 리포트(A4). **Gold Master · 핵심 8장.**
 *
 * 값은 전부 `kusAnalysis()` 에서 온다. 이 파일은 차례와 모양만 정하고
 * 문장을 새로 짓지 않는다. 그래서 이름만 바꾼 종이가 나올 수 없다: 이름을
 * 바꾸면 결과 모델이 같아 같은 종이가 나오고, 결과 모델이 다르면 절마다
 * 다른 줄이 선다(`scripts/kus/verify.ts` 가 RICH · POOR · CONTRA 로 센다).
 *
 * **R1 에서 바꾼 것(kus-report.1 → .2).** R1 종이는 열 쪽이었지만 절마다
 * 센 수와 한 줄 요약이 반복되고 영역 하나를 깊게 읽는 자리가 없었다. .2 는
 *   - 1장에 **이 결과가 무엇에 기대고 있는가**(응답 · 근거 · 응답 품질)를 세우고
 *   - 2장에서 영역마다 축 여덟의 상태와 그 사람이 고른 항목을 그대로 돌려주고
 *   - 3장에서 한 일 → 직접 정한 것 → 남긴 것 → 견준 것 의 사슬로 근거를 읽고
 *   - 6장에서 탐방을 **본 것 · 직접 해 본 것 · 확인할 것** 으로 가르고
 *   - 7장에서 문장을 대신 써 주지 않고 **문장 구조와 받을 질문**을 주고
 *   - 8장의 할 일마다 **끝났다고 볼 기준**을 붙였다.
 * 채우려고 같은 말을 되풀이하지 않는다: 비는 자리는 비었다고 한 줄로 적는다.
 *
 * 쪽 차례: 표지 · 1(+2) · 3(+4) · 5(+6) · 7 · 8(+근거와 한계).
 * 짝수 장은 앞 장 뒤에 이어 붙인다. 장마다 새 쪽을 열면 쪽 아래가 반씩 비고,
 * 그 빈 면이 종이를 성기게 만든다. 영역 상자도 통째로 붙여 두지 않는다(줄 하나만 쪼개지지 않게 둔다).
 *
 * **공통 PDF 엔진을 고치지 않는다**(KUS-CR-05). 이 HTML 은 그 자체로 한 벌이고
 * 종이는 `report-pdf.ts` 가 브라우저에 얹어 뽑는다.
 */
import type { KusAnalysis, PlanItem } from "./analysis";
import { MODE_NOTE } from "./analysis";
import { COMPAT_KO } from "./program";

export const KUS_REPORT_VERSION = "kus-report.3";

const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const empty = (t: string) => `<p class="empty">${esc(t)}</p>`;
const list = (xs: string[], none = "—") => (xs.length ? esc(xs.join(" / ")) : `<span class="muted">${esc(none)}</span>`);

function table(head: string[], rows: string[][], cls = ""): string {
  if (!rows.length) return "";
  return `<table class="${cls}"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`
    + `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function chapter(no: number, title: string, lead: string, body: string, opts: { foot?: string; flow?: boolean } = {}): string {
  const n = String(no).padStart(2, "0");
  return `<section class="ch${opts.flow ? " flow" : ""}">`
    + `<header class="ch-h">${BAND_ART}<p class="kick">PART ${n}</p><h2>${esc(title)}</h2><b class="no" aria-hidden="true">${n}</b></header>`
    + `${lead ? `<p class="lead">${esc(lead)}</p>` : ""}${body}${opts.foot ? `<p class="foot">${esc(opts.foot)}</p>` : ""}</section>`;
}

/** 인포그래픽 표시. 선 아이콘 다섯이고 값을 그리지 않는다 */
const ICON: Record<string, string> = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.6L16.5 9"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  building: '<path d="M4 21V5l8-2v18M12 8h8v13M8 8h.01M8 12h.01M8 16h.01M16 12h.01M16 16h.01M3 21h18"/>',
};
const icon = (k: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k] ?? ""}</svg>`;

/**
 * 표지와 장 머리의 그림. 짙은 파란 바탕 위 둥근 면과 호(弧) 몇 줄이고 값을 담지 않는다.
 * 점수처럼 읽힐 눈금 · 축 · 숫자를 그리지 않는다.
 */
const COVER_ART = `<svg class="cv-art" viewBox="0 0 210 297" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
<radialGradient id="cvGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6cc3ff" stop-opacity=".75"/><stop offset="1" stop-color="#2a49d0" stop-opacity="0"/></radialGradient>
<linearGradient id="cvBall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd0ff"/><stop offset=".55" stop-color="#3c74ec"/><stop offset="1" stop-color="#2440c4"/></linearGradient>
<pattern id="cvDots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".55" fill="#fff" fill-opacity=".38"/></pattern>
</defs>
<circle cx="24" cy="282" r="46" fill="#2a45c2" opacity=".55"/>
<circle cx="158" cy="236" r="78" fill="url(#cvGlow)"/>
<circle cx="158" cy="236" r="31" fill="url(#cvBall)"/>
<path d="M104 236A54 54 0 0 1 158 182" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".7"/>
<path d="M158 290A54 54 0 0 1 112 264" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".7"/>
<path d="M190 194A50 50 0 0 1 207 228" fill="none" stroke="#f3c14b" stroke-width="1.8" stroke-linecap="round"/>
<path d="M14 64A34 34 0 0 1 40 36" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>
<rect x="150" y="22" width="44" height="26" fill="url(#cvDots)"/>
<rect x="16" y="226" width="30" height="16" fill="url(#cvDots)"/>
</svg>`;
const BAND_ART = `<svg class="band-art" viewBox="0 0 160 40" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
<defs><linearGradient id="bdBall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd0ff" stop-opacity=".95"/><stop offset="1" stop-color="#2f56dc" stop-opacity=".2"/></linearGradient></defs>
<circle cx="140" cy="40" r="26" fill="url(#bdBall)"/>
<path d="M104 40A36 36 0 0 1 140 4" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".6"/>
<path d="M150 9A32 32 0 0 1 160 16" fill="none" stroke="#f3c14b" stroke-width="1.3" stroke-linecap="round"/>
</svg>`;

const ZONE_CLASS: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "z1", Z2_EVIDENCE_INCOMPLETE: "z2",
  Z3_EVIDENCE_LOW_INTEREST: "z3", Z4_INSUFFICIENT_EVIDENCE: "z4",
};
const STATE_CLASS: Record<string, string> = { OWNED: "s3", CONFIRMED: "s2", PARTICIPATED: "s1", NOT_OBSERVED: "s0" };
const BASIS_CLASS: Record<string, string> = { SELF_REPORT_ONLY: "b0", PARTLY_BACKED: "b1", BACKED: "b2" };

export type KusReportMeta = {
  attemptId: string; resultAt: string | null; generatedAt: string;
  /** 테스트 학생 · 테스트 탐방이면 쪽마다 띠가 선다 */
  test: boolean;
  modules: Record<string, string | undefined>;
};

export function kusReportHtml(a: KusAnalysis, meta: KusReportMeta): string {
  const s = a.student;
  const c = a.status.counts;
  const note = MODE_NOTE[s.mode];
  const r = a.reliability;

  const year = (meta.resultAt ?? meta.generatedAt).slice(0, 4);
  const cover = `<section class="cover">${COVER_ART}
  <div class="cv-top"><p class="brand">CareerMatri</p><p class="school">${esc(s.university)}</p></div>
  <div class="cv-main">
    <p class="cv-year">${esc(year)}</p>
    <h1><span class="thin">진로 분석</span><span class="bold">리포트</span></h1>
    <hr />
    <p class="cv-who"><b>${esc(s.name)}</b><br />${esc(s.college)} · ${esc(s.department)}<br />${esc(s.coreName)} 검사 · 결과 확정 ${esc(meta.resultAt ?? "—")}</p>
    <div class="cv-state"><span class="badge">${esc(a.status.badge)}</span><p>${esc(a.status.title)}</p></div>
  </div>
  <p class="cv-foot">리포트 생성 ${esc(meta.generatedAt)} · 응시 번호 ${esc(meta.attemptId)}</p>
</section>`;

  /* 1 */
  const a0 = a.actions[0];
  const stat = (ic: string, n: number | string, k: string) => `<div class="stat"><span class="si">${icon(ic)}</span><b>${esc(n)}</b><span>${esc(k)}</span></div>`;
  const rows = a.major.rows;
  const zoneCount = (z: string) => rows.filter((x) => x.zone === z).length;
  const zones = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST", "Z4_INSUFFICIENT_EVIDENCE"]
    .map((z) => ({ z, n: zoneCount(z), ko: rows.find((x) => x.zone === z)?.zoneKo ?? "" })).filter((x) => x.n);
  const bars = rows.length ? `<div class="bars">${rows.map((x) => `<div class="bar"><span class="bn">${esc(x.name)}</span>`
    + `<span class="bt"><i class="${ZONE_CLASS[x.zone] ?? ""}" style="width:${Math.round((Math.min(x.axes, 8) / 8) * 100)}%"></i></span><span class="bv">${x.axes}/8</span></div>`).join("")}</div>` : "";
  const mix = zones.length ? `<div class="mix">${zones.map((x) => `<i class="${ZONE_CLASS[x.z] ?? ""}" style="flex:${x.n}"></i>`).join("")}</div>`
    + `<ul class="legend">${zones.map((x) => `<li><i class="${ZONE_CLASS[x.z] ?? ""}"></i>${esc(x.ko)} <b>${x.n}</b></li>`).join("")}</ul>` : "";
  const ch1 = chapter(1, "개인 현황", "", `
<div class="hero ${BASIS_CLASS[r.basis]}"><p class="hb">${esc(a.status.badge)}</p><p class="ht">${esc(a.status.title)}</p><p class="hl">${esc(a.status.lead)}</p></div>
<div class="stats">${stat("grid", c.opened, "이번에 본 영역")}${stat("check", c.confirmed, "해 봤다고 답한 판단")}${stat("pen", c.owned, "직접 정했고 근거도 있는 판단")}${stat("doc", c.evidence, "고른 근거")}${stat("building", a.visits.length, "기업탐방 기록")}</div>
<p class="note">숫자는 점수가 아니라 개수입니다. 백분위, 적합도, 합격 가능성은 계산하지 않습니다.</p>
<div class="two"><div class="panel"><h3>영역별 확인된 판단</h3><p class="sub">영역마다 여덟 가지 판단 가운데 응답으로 확인된 개수</p>${bars || empty("이번 검사에서 본 영역이 없습니다.")}</div>
<div class="panel"><h3>영역 상태 분포</h3><p class="sub">${esc(r.label)}</p>${mix}
${table(["", ""], r.lines.map((l) => [esc(l.k), `<b>${esc(l.v)}</b>`]), "kv")}</div></div>
${r.caution ? `<p class="caution">${esc(r.caution)}</p>` : ""}
${note ? `<p class="warn">${esc(note)}</p>` : ""}
<div class="nextbox"><p class="nk">먼저 할 한 가지${a0?.domain ? ` · ${esc(a0.domain)}` : ""}</p><p class="nd">${a0 ? esc(a0.do) : "정해진 할 일이 없습니다. 기업탐방 기록부터 남겨 보세요."}</p></div>`);

  /* 2 */
  /* 영역마다 같은 까닭이면 한 번만 적는다. 고른 항목이 없는 판단은 줄을 세우지 않고 한 줄로 센다:
     `—` 만 든 줄 여덟을 늘어놓으면 종이가 차 보일 뿐 읽을 것이 늘지 않는다 */
  const whys = a.deep.map((d) => d.why.join(" "));
  const sameWhy = whys.length > 1 && whys.every((w) => w && w === whys[0]) ? whys[0] : null;
  const deepBlock = (d: KusAnalysis["deep"][number]) => {
    const shown = d.axes.filter((x) => x.picks.length || (x.required && x.state === "NOT_OBSERVED"));
    const rest = d.axes.filter((x) => !shown.includes(x));
    const tally = Object.entries(rest.reduce<Record<string, number>>((m, x) => ({ ...m, [x.stateKo]: (m[x.stateKo] ?? 0) + 1 }), {}))
      .map(([k, n]) => `${k} ${n}`).join(" · ");
    return `<div class="dom">
 <p class="dh"><b>${esc(d.name)}</b><span class="zone ${ZONE_CLASS[d.zone] ?? ""}">${esc(d.zoneKo)}</span>${d.interest ? `<small>${esc(d.interest)}</small>` : ""}${d.experience ? `<small>${esc(d.experience)}</small>` : ""}</p>
 ${table(["판단", "묻는 것", "응답 상태", "고른 항목"], shown.map((x) => [
    `<b>${esc(x.name)}</b>${x.required ? `<span class="req">꼭 봄</span>` : ""}`, esc(x.what),
    `<span class="st ${STATE_CLASS[x.state] ?? ""}">${esc(x.stateKo)}</span>`, list(x.picks)]), "axes")}
 ${rest.length ? `<p class="rest">${shown.length ? "나머지 " : ""}${rest.length}개 판단은 고른 항목 없이 응답만 있습니다: ${esc(tally)} (${esc(rest.map((x) => x.name).join(" · "))})</p>` : ""}
 ${d.why.length && !sameWhy ? `<p class="why">${esc(d.why.join(" "))}</p>` : ""}
 <p class="dict"><span>이 영역이 다루는 것(사전)</span>${esc([...d.dict.tools, ...d.dict.artifacts].join(" · ") || "사전에 적힌 것이 없음")}${d.roles.length ? ` <span>이 영역이 중심인 직무</span>${esc(d.roles.join(" · "))}` : ""}</p>
</div>`;
  };
  const ch2 = chapter(2, "전공 역량 분석", `${s.coreName} 검사에서 본 영역 ${c.opened}개를 하나씩 봅니다.`,
    (sameWhy ? `<p class="why">연 영역 모두: ${esc(sameWhy)}</p>` : "")
    + (a.deep.length ? a.deep.map(deepBlock).join("") : empty("이번 검사에서 연 영역이 없습니다."))
    + (a.major.notAsked.length ? `<p class="muted">이번 검사에서 묻지 않은 영역: ${esc(a.major.notAsked.join(" · "))}</p>` : ""),
    { flow: true, foot: "응답 상태: 아직 없음 · 받아서 수행 · 직접 수행 · 직접 결정. ‘직접 결정’은 근거 두 개가 있을 때만 표시합니다. 도구와 결과물은 그 영역에서 흔히 다루는 것이고, 학생이 다뤘다는 뜻은 아닙니다." });

  /* 3 (+4) */
  const chainRows = a.deep.filter((d) => d.chain.did.length || d.chain.decided.length || d.chain.artifacts.length || d.chain.verifications.length);
  const ch3 = chapter(3, "경험과 근거", a.evidence.ready.length
      ? `지원서와 면접에서 설명할 근거가 있는 영역: ${a.evidence.ready.length}개`
      : "근거가 충분한 영역은 아직 없습니다.",
    `<div class="flowline"><span>한 일</span><span>직접 정한 것</span><span>남긴 것</span><span>견줘 본 것</span></div>
${chainRows.length ? table(["영역", "한 일", "직접 정한 것", "남긴 것", "무엇과 견줬나"], chainRows.map((d) => [
      `<b>${esc(d.name)}</b>`, list(d.chain.did, "고른 항목 없음"), list(d.chain.decided, "고른 항목 없음"),
      list(d.chain.artifacts, "고른 항목 없음"), list(d.chain.verifications, "고른 항목 없음")]), "chain")
      : empty("응답에서 고른 근거 항목이 없습니다. 해 본 과제 하나를 골라 무엇을 정했고 무엇이 남았는지 근거로 고르면 이 표가 섭니다.")}
<p class="muted">칸의 글은 검사에서 고른 문장 그대로입니다.</p>
<ul class="facts">
 <li>공통 경험 입력: ${a.evidence.experiences.length ? esc(a.evidence.experiences.map((e) => e.title).join(" / ")) : "아직 없음"}</li>
 <li>기업탐방 기록 ${a.evidence.visitsObserved}건 · 직접 해 본 활동이 있는 기록 ${a.evidence.visitsDid}건 · 경험으로 옮긴 기록 ${a.evidence.visitsLinked}건 (탐방 기록은 결과에 바로 들어가지 않습니다)</li>
</ul>`);

  const ch4 = chapter(4, "관심 산업·직무", "진한 칸은 직접 고른 것, 옅은 칸은 확인된 영역에서 이어진 것입니다.",
    `<div class="two"><div><h3>산업</h3>${a.interests.industries.length ? `<ul class="tags">${a.interests.industries.map((i) =>
      `<li class="${i.from === "PICKED" ? "pick" : "der"}">${esc(i.name)}<small>${i.from === "PICKED" ? "고름" : "확인된 영역에서 이어짐"}</small></li>`).join("")}</ul>` : empty("고른 산업도 이어진 산업도 없습니다.")}</div>
<div><h3>직무</h3>${a.interests.roles.length ? `<ul class="tags">${a.interests.roles.map((x) =>
      `<li class="${x.from === "PICKED" ? "pick" : "der"}">${esc(x.name)}<small>${x.from === "PICKED" ? "고름" : "확인된 영역에서 이어짐"}</small></li>`).join("")}</ul>` : empty("고른 직무도 이어진 직무도 없습니다.")}</div></div>
${a.interests.orgs.length ? `<p>관심 조직 유형: ${esc(a.interests.orgs.join(" · "))}</p>` : ""}`,
    { flow: true, foot: "‘이어짐’은 확인된 영역이 그 직무·산업의 중심 영역이라는 뜻입니다. 적합도나 합격 가능성이 아니며, 특정 기업을 추천하지 않습니다." });

  /* 5 */
  const ch5 = chapter(5, "직무 요구와 부족한 점", a.link.role
      ? `${a.link.role} 직무가 중요하게 보는 영역과 지금 상태입니다.`
      : "맞춰 볼 직무가 아직 없습니다.",
    (a.link.rows.length ? table(["중심 영역", "그 직무가 보는 판단", "지금 상태", "확인/전체", "다음 할 일"],
      a.link.rows.map((x) => [`<b>${esc(x.domain)}</b>`, esc(x.needs), esc(x.state), x.all ? `<b>${x.hit}</b>/${x.all}` : "—", esc(x.next)]), "wide") : "")
    + `<h3>더 준비할 것</h3>${a.gaps.length ? `<ul class="gaps">${a.gaps.map((g) => `<li><b>${esc(g.domains)}</b>${esc(g.title)}<small>${esc(g.why)}</small></li>`).join("")}</ul>` : empty("크게 비어 있는 곳은 없습니다.")}`,
    { foot: "직무별 중심 영역은 검사 기준표에서 온 것이고, 기업 채용 자료가 아닙니다." });

  /* 6 */
  const visitBlock = (v: KusAnalysis["visits"][number]) => `<div class="visit">
 <p class="vh"><b>${esc(v.company)}</b>${v.test ? `<span class="tag t">테스트</span>` : ""}${v.confirmed ? "" : `<span class="tag u">기업 확인 전</span>`}<span class="tag ${v.did.length ? "d" : "o"}">${v.did.length ? "직접 해 봄" : "관찰만"}</span>${v.linked ? `<span class="tag l">경험으로 옮김</span>` : ""}<small>${esc(v.on ?? "날짜 미기록")} · 관찰한 직무 ${esc(v.roles.join(", ") || "—")}</small></p>
 <div class="ovd">
  <div><p class="ovh">본 것</p><p>${esc(v.observed.join(" / ") || "—")}</p><p class="muted">이해한 것: ${esc(v.understood ?? "적지 않음")}</p></div>
  <div><p class="ovh">직접 해 본 것</p><p>${esc(v.did.join(" / ") || "없음(보기만 함)")}</p><p class="muted">새로 안 것: ${esc(v.learned ?? "적지 않음")}</p></div>
  <div><p class="ovh">확인할 것</p>${v.verify.length ? `<ul>${v.verify.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">이어 둔 전공 영역이 없습니다.</p>`}</div>
 </div>
</div>`;
  const ch6 = chapter(6, "기업탐방과 직무", a.visits.length
      ? `기업탐방 기록 ${a.visits.length}건`
      : "아직 남긴 탐방 기록이 없습니다.",
    a.visits.length ? a.visits.map(visitBlock).join("") : empty("탐방을 다녀오면 ‘탐방 기록’에서 남길 수 있습니다."),
    { flow: true, foot: "다녀온 것만으로 역량을 판단하지 않습니다. 직접 해 본 활동은 경험으로 옮기면 다음 분석에 들어갑니다." });

  /* 7 */
  const st = a.application.story;
  const lead = a.deep.find((d) => d.chain.decided.length || d.chain.did.length) ?? null;
  const structure = lead ? [
    ["① 상황", `${esc(lead.name)} 영역의 과제 하나 <span class="slot">과제 이름 · 기간 · 맡은 범위를 직접 적기</span>`],
    ["② 내가 정한 것", lead.chain.decided.length ? esc(lead.chain.decided[0]) : `<span class="slot">직접 정한 조건·기준이 아직 고른 항목에 없음</span>`],
    ["③ 한 일 · 남긴 것", `${esc(lead.chain.did[0] ?? "")}${lead.chain.artifacts.length ? ` → ${esc(lead.chain.artifacts[0])}` : ` <span class="slot">남은 결과물을 적기</span>`}`],
    ["④ 결과 · 견준 것", `${lead.chain.verifications.length ? esc(lead.chain.verifications[0]) : `<span class="slot">무엇과 견줘 확인했는지 적기</span>`} <span class="slot">수치 · 달라진 점을 직접 적기</span>`],
  ] : [];
  const qs = lead ? [
    st?.interview ?? null,
    lead.chain.decided.length ? "그 기준은 무엇을 보고 그렇게 정했나요? 다른 안은 무엇이었나요?" : "그 과제에서 본인이 직접 정한 것은 무엇이었나요?",
    lead.chain.verifications.length ? "결과가 맞다는 것을 무엇으로 확인했나요?" : "결과를 무엇과 견줘 봤나요? (아직 고른 항목이 없어 준비가 필요한 질문)",
    lead.missingRequired.length ? `${lead.missingRequired[0]}에 대해 물으면 어떤 경험으로 답하겠나요? (응답에서 비어 있는 판단)` : null,
  ].filter((q): q is string => Boolean(q)) : [];
  const vd = a.visits[0]?.draft;
  const ch7 = chapter(7, "자기소개서·면접 활용", "검사에서 고른 항목으로 문단의 뼈대를 잡았습니다. 회색 칸은 직접 채울 자리입니다.",
    `<h3>자기소개서 한 문단의 구조</h3>${structure.length ? table(["칸", "응답에서 온 것 · 채울 것"], structure, "kv2") : empty("검사에서 꺼낼 경험이 아직 확인되지 않았습니다.")}
${st ? `<p class="muted">공통 결과지의 활용 문장: ${esc(st.application)}</p>` : ""}
<h3>면접에서 받을 질문</h3>${qs.length ? `<ol class="qs">${qs.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>` : empty("꺼낼 경험이 생기면 질문이 섭니다.")}
${a.application.frame.length ? `<h3>경험 번역 단계에서 고른 답</h3>${table(["칸", "고른 답"], a.application.frame.map((f) => [esc(f.label), esc(f.items.join(" / "))]))}` : ""}
<h3>탐방 기록에서 꺼낼 초안</h3>${vd ? `<p class="draft">${esc(vd.letter)}</p>
${table(["면접 질문", "답의 뼈대"], vd.interview.map((q) => [esc(q.q), esc(q.frame)]))}
<p class="muted">${esc(vd.cautions.join(" "))}</p>` : empty("탐방 기록이 생기면 이 자리에 초안이 섭니다.")}`,
    { foot: "숫자, 기간, 결과는 직접 채워 주세요." });

  /* 8 */
  const col = (t: string, xs: PlanItem[]) => `<div class="pcol"><p class="ph"><span class="dot"></span>${t}</p>${xs.length
    ? `<ol>${xs.map((x) => `<li><span class="src">${esc(x.from)}</span>${esc(x.do)}<small><b>다 했다고 볼 기준</b> ${esc(x.done)}</small></li>`).join("")}</ol>`
    : `<p class="empty">이 시기에 따로 할 일은 없습니다. 앞의 일을 마무리하는 시간입니다.</p>`}</div>`;
  const ch8 = chapter(8, "30·60·90일 실행 계획", "검사 결과와 탐방 기록에서 나온 할 일과, 다 했다고 볼 기준입니다.",
    `<div class="plan">${col("30일", a.plan.d30)}${col("60일", a.plan.d60)}${col("90일", a.plan.d90)}</div>
${a.actions.some((x) => x.note) ? `<p class="muted">${esc([...new Set(a.actions.map((x) => x.note).filter(Boolean))].slice(0, 3).join(" "))}</p>` : ""}`);

  const limits = `<section class="ch lim flow"><header class="ch-h is-sub"><p class="kick">APPENDIX</p><h2>근거와 한계</h2></header>
${table(["무엇", "출처 · 상태"], [
    ["검사", `${esc(s.coreName)} 검사(판본 ${esc(s.core)}) · 문항 ${esc(meta.modules.item_bank_version ?? "?")} · 채점 ${esc(meta.modules.scoring_version ?? "?")} · 결과 모델 ${esc(meta.modules.result_model_version ?? "?")}. 규준과 인지면접 전이라 <b>검증된 검사가 아닙니다</b>.`],
    ["판정", "공통 엔진이 응답에서 냈습니다. KUS 리포트는 판정을 바꾸지 않고, 근거가 받치는 정도를 함께 적습니다(1장)."],
    ["학과와 Core", `${esc(s.department)} · ${esc(s.compat ? COMPAT_KO[s.compat] ?? s.compat : "호환 등급 없음")}. 등급은 학과 교육과정(공식 쪽 검색 발췌)과 Core 영역을 대조한 것이며, 원문 대조와 전공자 검수 전입니다.`],
    ["학교 진입", "학교 진입 응시는 등급을 고르지 않고 PRO 로 엽니다(공통 규칙). 문항과 채점 기준을 바꾸지 않았습니다."],
    ["산업 · 직무", "그 Core 의 관계표에서 왔습니다. 채용 공고 · 기업별 요구 · 취업률 자료를 쓰지 않았습니다."],
    ["기업탐방", "담당자가 등록한 탐방만 확인된 기업으로 적습니다. 기업을 추천하지 않고, 탐방 기록은 판정에 들어가지 않습니다."],
    ["응답 품질", esc(a.status.quality.text)],
    ["표기", "학교 로고를 쓰지 않았습니다. 공식 도입 계약과 이름 · 로고 사용 범위는 확인 전입니다."],
    ["판본", `리포트 ${KUS_REPORT_VERSION} · 분석 ${esc(a.version)}`],
  ], "kv2")}
</section>`;

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(s.university)} · ${esc(s.name)} · CareerMatri 진로 분석 리포트</title><style>${CSS}</style></head><body>
${meta.test ? `<div class="testbar">테스트 데이터 · 실제 학생이 아닙니다</div>` : ""}
${cover}${ch1}${ch2}${ch3}${ch4}${ch5}${ch6}${ch7}${ch8}${limits}
</body></html>`;
}

const CSS = `
@page{size:A4;margin:13mm 13mm 15mm}
@page:first{margin:0}
:root{--navy:#1b2c8f;--deep:#13206b;--blue:#2f5fe0;--sky:#8fc0f6;--pale:#eaf0fd;--teal:#1fa99e;--yellow:#f3c14b;--ink:#1b2430;--ink2:#4a5566;--mute:#7a8696;--line:#e1e6f0;--soft:#f5f7fb;--green:#118a6a;--amber:#a86200;--red:#c4323a}
*{box-sizing:border-box}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:var(--ink);font-family:"Pretendard","Noto Sans KR","Noto Sans CJK KR","WenQuanYi Zen Hei",system-ui,sans-serif;font-size:9.6pt;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}
.testbar{background:#fff5e1;color:#8a5300;font-size:8pt;text-align:center;padding:2px}
@media print{.testbar{display:none}}
/* 표지: 짙은 파란 면 한 장 · 둥근 면과 호 · 노란 선 하나 */
.cover{position:relative;height:297mm;padding:0;display:flex;flex-direction:column;break-after:page;overflow:hidden;background:linear-gradient(160deg,#2238b4 0%,#1b2c8f 55%,#13206b 100%);color:#fff}
.cv-art{position:absolute;inset:0;width:100%;height:100%}
.cv-top{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-start;padding:18mm 18mm 0}
.cv-top .brand{margin:0;font-weight:700;letter-spacing:.14em;font-size:10pt;text-transform:uppercase}
.cv-top .school{margin:0;color:#cfdafc;font-size:10pt;font-weight:600;text-align:right}
.cv-main{position:relative;z-index:1;margin-top:62mm;padding:0 18mm}
.cv-year{margin:0;font-size:44pt;font-weight:800;color:#8fc0f6;line-height:1;letter-spacing:-.01em}
.cover h1{margin:3mm 0 0;line-height:1.08}.cover h1 .thin{display:block;font-size:32pt;font-weight:300;letter-spacing:-.01em}
.cover h1 .bold{display:block;font-size:40pt;font-weight:800;letter-spacing:.02em}
.cover hr{width:44mm;border:0;border-top:2.5px solid var(--yellow);margin:7mm 0 6mm}
.cv-who{margin:0;color:#d4defc;font-size:10.5pt;line-height:1.75}.cv-who b{color:#fff;font-size:13.5pt}
.cv-state{margin-top:9mm;max-width:96mm;border-left:3px solid var(--yellow);padding:2mm 0 2mm 5mm}
.cv-state .badge{display:inline-block;font-size:8.5pt;font-weight:700;color:var(--deep);background:var(--yellow);border-radius:4px;padding:1px 7px;margin-bottom:4px}
.cv-state p{margin:0;font-size:11pt;font-weight:600;color:#fff;line-height:1.5}
.cv-foot{position:relative;z-index:1;margin:auto 0 0;padding:0 18mm 16mm;color:#a9b8ef;font-size:7.8pt}
/* 장 머리: 파란 띠 · PART 번호 · 큰 번호 · 둥근 면 */
/* 장마다 새 쪽을 열지 않는다: 열면 앞 장의 꼬리 몇 줄만 든 빈 쪽이 생긴다. 띠만 쪽 경계에서 쪼개지지 않게 둔다 */
.ch{break-before:auto;margin-top:9mm}.cover+.ch,.testbar+.cover+.ch{margin-top:0}
.ch-h{position:relative;overflow:hidden;break-inside:avoid;break-after:avoid;margin:0 0 5mm;padding:5mm 6mm 5mm;border-radius:3mm;background:linear-gradient(120deg,#1b2c8f,#2541c4);color:#fff;min-height:24mm}
.ch-h .band-art{position:absolute;right:0;top:0;height:100%;width:62%}
.ch-h .kick{position:relative;margin:0 0 1.5mm;font-size:8pt;letter-spacing:.18em;color:#b9cdfb;font-weight:700}
.ch-h .kick:after{content:"";display:inline-block;width:8mm;height:1.6px;background:var(--yellow);vertical-align:middle;margin-left:3mm}
.ch-h h2{position:relative;margin:0;font-size:17pt;letter-spacing:-.02em;color:#fff;font-weight:800;max-width:70%}
.ch-h .no{position:absolute;right:7mm;top:50%;transform:translateY(-50%);font-size:34pt;font-weight:800;color:#fff;opacity:.9;line-height:1}
.ch-h.is-sub{background:none;color:var(--navy);padding:0 0 2mm;min-height:0;border-radius:0;border-bottom:2px solid var(--navy)}
.ch-h.is-sub .kick{color:var(--blue)}.ch-h.is-sub h2{color:var(--navy);font-size:14pt}
.lead{font-size:10.5pt;margin:0 0 4mm;color:var(--ink2)}
h3{display:flex;align-items:center;gap:2.5mm;font-size:10.5pt;margin:5mm 0 2.5mm;color:var(--navy);font-weight:700}h3:before{content:"";flex:none;width:2.4mm;height:2.4mm;border-radius:.6mm;background:var(--blue)}h3:after{content:"";flex:1;height:1px;background:#cdd8f4}
p{margin:0 0 7px}
/* 인포그래픽 */
.hero{background:var(--pale);border-radius:10px;padding:5mm 6mm;margin-bottom:5mm}.hero.b0{background:#fff1f1}
.hero .hb{display:inline-block;margin:0 0 2mm;font-size:8.5pt;font-weight:700;color:#fff;background:var(--blue);border-radius:4px;padding:1px 8px}.hero.b0 .hb{background:var(--red)}
.hero .ht{margin:0;font-size:13pt;font-weight:700;color:var(--navy);line-height:1.45}.hero .hl{margin:2mm 0 0;color:var(--ink2)}
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:3mm;margin:0 0 2mm}
.stat{border:1px solid var(--line);border-radius:10px;padding:4mm 3mm;text-align:center}
.stat .si{display:inline-grid;place-items:center;width:11mm;height:11mm;border-radius:50%;background:var(--pale);margin-bottom:2mm}
.stat svg{width:6mm;height:6mm;fill:none;stroke:var(--blue);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.stat b{display:block;font-size:20pt;font-weight:800;color:var(--navy);line-height:1.1}.stat span{display:block;font-size:7.8pt;color:var(--mute);margin-top:1mm;line-height:1.4}
.note{font-size:8pt;color:var(--mute);margin:0 0 4mm}
.panel{border:1px solid var(--line);border-radius:10px;padding:4mm 5mm}.panel h3{margin:0 0 1mm}.panel .sub{font-size:8.2pt;color:var(--mute);margin:0 0 3mm}
.bars{display:grid;gap:2.2mm}.bar{display:grid;grid-template-columns:30mm 1fr 10mm;gap:2mm;align-items:center;font-size:8.6pt}
.bn{color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bt{height:3.2mm;background:var(--soft);border-radius:2mm;overflow:hidden}.bt i{display:block;height:100%;border-radius:2mm;background:var(--sky)}
.bv{text-align:right;font-weight:700;color:var(--navy);font-variant-numeric:tabular-nums}
.bt i.z1,.mix i.z1,.legend i.z1{background:var(--teal)}.bt i.z2,.mix i.z2,.legend i.z2{background:var(--blue)}.bt i.z3,.mix i.z3,.legend i.z3{background:var(--sky)}.bt i.z4,.mix i.z4,.legend i.z4{background:var(--yellow)}
.mix{display:flex;height:5mm;border-radius:3mm;overflow:hidden;gap:2px;margin-bottom:2mm}.mix i{display:block}
.legend{list-style:none;margin:0 0 3mm;padding:0;display:flex;flex-wrap:wrap;gap:1mm 4mm;font-size:8.4pt;color:var(--ink2)}.legend i{display:inline-block;width:2.6mm;height:2.6mm;border-radius:1mm;margin-right:1.5mm;vertical-align:-1px}
.panel table.kv{margin:0}.panel table.kv thead{display:none}.panel table.kv td{padding:2px 0;border-bottom:1px dotted var(--line);font-size:8.5pt}.panel table.kv td:first-child{color:var(--ink2)}.panel table.kv td:last-child{text-align:right}
.nextbox{margin-top:5mm;border-radius:10px;background:var(--navy);color:#fff;padding:5mm 6mm}.nextbox .nk{margin:0 0 1.5mm;font-size:8.5pt;color:#b9d3f5;font-weight:600}.nextbox .nd{margin:0;font-size:11pt;font-weight:600;line-height:1.55}
.flowline{display:flex;margin:0 0 3mm}.flowline span{flex:1;position:relative;background:var(--pale);color:var(--navy);font-weight:700;font-size:8.6pt;text-align:center;padding:2mm 3mm 2mm 5mm;clip-path:polygon(0 0,calc(100% - 3mm) 0,100% 50%,calc(100% - 3mm) 100%,0 100%,3mm 50%)}
.flowline span:first-child{clip-path:polygon(0 0,calc(100% - 3mm) 0,100% 50%,calc(100% - 3mm) 100%,0 100%);padding-left:3mm}
.flowline span:nth-child(2){background:#d6e8fc}.flowline span:nth-child(3){background:#c2dcfa}.flowline span:nth-child(4){background:#d5f1ee}
/* 본문 공통 */
.caution{margin:4mm 0 0;padding:3mm 4mm;border-radius:8px;background:#fff1f1;color:#8e2228;font-size:9pt}
.warn{background:#fff5e1;border-radius:8px;padding:3mm 4mm;color:#7a4700;font-size:9pt;margin-top:3mm}
table{width:100%;border-collapse:collapse;margin:4px 0 7px;font-size:8.8pt}th{text-align:left;color:#fff;background:var(--navy);font-weight:700;padding:5px 6px}th:first-child{border-radius:2mm 0 0 0}th:last-child{border-radius:0 2mm 0 0}
td{border-bottom:1px solid var(--line);padding:5px 6px;vertical-align:top}tr{break-inside:avoid}
.zone{display:inline-block;padding:1px 7px;border-radius:4px;font-size:8pt;font-weight:700;white-space:nowrap;background:var(--soft);color:var(--ink2)}
.zone.z1{background:#ddf4f1;color:#0f7d73}.zone.z2{background:var(--pale);color:var(--blue)}.zone.z3{background:#eef2f7;color:var(--ink2)}.zone.z4{background:#fff1d6;color:var(--amber)}
.dom{border:1px solid var(--line);border-radius:10px;padding:3.5mm 4.5mm 2mm;margin:0 0 4mm}.dh,.ch-h,.lead,h3{break-after:avoid}
.dh{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 2mm}.dh b{font-size:11pt;color:var(--navy)}.dh small{color:var(--mute);font-size:8.2pt}
table.axes td:first-child{width:27mm;white-space:nowrap}table.axes td:nth-child(3){width:21mm}
.req{margin-left:4px;font-size:7pt;color:var(--amber);border:1px solid #f0d49c;border-radius:4px;padding:0 3px}
.st{font-size:8pt;font-weight:700;white-space:nowrap}.st.s3{color:var(--green)}.st.s2{color:var(--blue)}.st.s1{color:var(--ink2)}.st.s0{color:#a3adba}
.why{font-size:8.6pt;color:var(--amber);margin:0 0 4px}.rest{font-size:8.5pt;color:var(--ink2);margin:0 0 4px}
.dict{font-size:8.3pt;color:var(--ink2);margin:0 0 5px}.dict span{display:inline-block;color:var(--mute);margin-right:5px;font-weight:600}
table.chain td:first-child{width:24mm}
.muted{color:var(--mute);font-size:8.4pt}.empty{color:var(--mute);background:var(--soft);border-radius:8px;padding:3mm 4mm;font-size:9pt}
.foot{margin-top:5mm;padding-top:2mm;border-top:1px solid var(--line);color:var(--mute);font-size:8pt}
.facts{margin:0;padding-left:18px}.facts li{margin:3px 0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.tags{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}.tags li{border-radius:6px;padding:4px 9px;font-weight:600;background:var(--soft);color:var(--ink2)}
.tags li small{display:block;font-weight:500;color:var(--mute);font-size:7.8pt}.tags li.pick{background:var(--blue);color:#fff}.tags li.pick small{color:#dbe9fd}
.gaps{list-style:none;padding:0;margin:0;display:grid;gap:2.5mm}.gaps li{background:#fff8eb;border-radius:8px;padding:3mm 4mm;break-inside:avoid}
.gaps b{display:block;color:var(--amber);font-size:8.5pt}.gaps small{display:block;color:var(--ink2);font-size:8.5pt;margin-top:2px}
.visit{border:1px solid var(--line);border-radius:10px;padding:3.5mm 4.5mm;margin:0 0 4mm;break-inside:avoid}
.vh{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px}.vh b{font-size:11pt;color:var(--navy)}.vh small{margin-left:auto;color:var(--mute)}
.ovd{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:10px}.ovd>div{border-top:3px solid var(--sky);padding-top:4px}.ovd>div:nth-child(2){border-color:var(--teal)}.ovd>div:nth-child(3){border-color:var(--yellow)}
.ovh{margin:0 0 3px;font-weight:700;font-size:8.6pt;color:var(--navy)}.ovd ul{margin:0;padding-left:15px}.ovd li{margin:0 0 3px;font-size:8.6pt}
.tag{font-size:7.6pt;padding:1px 7px;border-radius:4px;font-weight:700}.tag.o{background:var(--soft);color:var(--ink2)}.tag.d{background:#ddf4f1;color:#0f7d73}.tag.l{background:var(--pale);color:var(--blue)}.tag.u{background:#fff1d6;color:var(--amber)}.tag.t{background:#ffe8e8;color:var(--red)}
table.kv2 td:first-child{width:32mm;color:var(--ink2);font-weight:600}
.slot{display:inline-block;color:#7a8698;background:#eef1f5;border-radius:4px;padding:0 5px;font-size:8.2pt}
.qs{margin:0;padding-left:18px}.qs li{margin:0 0 4px}
.draft{background:var(--soft);border-radius:8px;padding:3.5mm 4.5mm;line-height:1.75}
/* 계획: 점과 선으로 잇는 세 칸 */
.plan{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;position:relative;padding-top:2mm}
.plan:before{content:"";position:absolute;left:4mm;right:4mm;top:6.2mm;height:2px;background:linear-gradient(90deg,var(--blue),var(--teal),var(--yellow))}
.pcol{break-inside:avoid}.pcol .ph{position:relative;margin:0 0 3mm;font-size:13pt;font-weight:800;color:var(--navy);padding-top:7mm}
.pcol .ph .dot{position:absolute;top:0;left:0;width:5mm;height:5mm;border-radius:50%;background:#fff;border:3px solid var(--blue)}
.pcol:nth-child(2) .ph .dot{border-color:var(--teal)}.pcol:nth-child(3) .ph .dot{border-color:var(--yellow)}
.pcol ol{margin:0;padding-left:16px}.pcol li{margin:0 0 3mm;font-size:8.9pt}
.pcol li small{display:block;color:var(--ink2);font-size:8pt;margin-top:2px}.pcol li small b{color:var(--green)}
.src{display:inline-block;font-size:7pt;color:var(--mute);border:1px solid var(--line);border-radius:4px;padding:0 3px;margin-right:4px}
@media screen{body{background:#eef1f5;padding:24px 12px}.cover,.ch{max-width:820px;margin:0 auto 18px;background:#fff;border-radius:12px;padding:26px 28px}.cover{padding:0;height:auto;min-height:1080px;background:linear-gradient(160deg,#2238b4 0%,#1b2c8f 55%,#13206b 100%)}.ch.flow{margin-top:0}.testbar{position:sticky;top:0;z-index:9}}
@media screen and (max-width:640px){body{padding:12px 0}.cover,.ch{border-radius:0;padding:20px 16px}.cover{padding:0;min-height:900px}.cv-main{margin-top:150px}.ch-h .no{font-size:24pt}.stats{grid-template-columns:repeat(2,1fr)}.two,.plan,.ovd{grid-template-columns:1fr}.plan:before{display:none}table{display:block;overflow-x:auto}}
`;
