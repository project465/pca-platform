/**
 * **PDF GOLD MASTER 2차 · 출력 템플릿.** 웹 결과지 컴포넌트를 쓰지 않는다.
 *
 * - **글꼴은 Pretendard 하나**(SIL Open Font License 1.1: 글꼴 단독 판매를 빼고 상업적
 *   사용·수정·재배포·문서 내장이 된다). 400 · 500 · 600 · 700 네 굵기만 쓴다.
 * - **활자 크기는 여섯 단**: 표지 29pt · 장 제목 18pt · 소제목 12.5pt · 본문 10.2pt ·
 *   부가 9pt · 출처·각주 8.2pt. 한 쪽에 세 단을 넘기지 않는다.
 * - **색은 넷**: 먹 #1b2230 · 남색 #16284a · 회색 #5b6474 · 강조 #1c5fb0(CareerMatri
 *   강조색, 핵심 한 자리에만). 확인 상태는 색이 아니라 **글자 표시**로 가른다.
 * - **표는 비교할 때만** 쓴다(직무 탐색 비교 · 기업 목록 · 검증표 · 실행 계획). 해석은
 *   문단으로 쓴다. 카드는 기업 심층 한 곳 · 워크시트에만 둔다.
 * - 쪽 머리말과 쪽마다의 섹션명·쪽 번호는 뽑는 쪽이 따로 얹는다(`overlayHtml`).
 */
import type { Report2 } from "./report2";
import type { Explore, Region } from "./companies";
import { JOB_STATUS_KO, REGION_KO, SOURCE_KO, VERIFY_KO } from "./companies";
import { CROSS_KO, LEVEL_WORD, type Level, type MapCell } from "./profile";

const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const SECTIONS = [
  ["01", "종합 분석 의견"],
  ["02", "개인별 역량 프로파일"],
  ["03", "검사 응답과 경험 기록의 교차 분석"],
  ["04", "강점 활용 전략"],
  ["05", "역량 개발 우선순위"],
  ["06", "진로 탐색 방향"],
  ["07", "지역 산업과 기업·직무 탐색 분석"],
  ["08", "진로 탐색 기업 심층 분석"],
  ["09", "자기소개서·포트폴리오·면접 준비"],
  ["10", "단계별 실행 계획"],
  ["11", "최종 행동 계획"],
  ["12", "경험·성과 정리 워크시트"],
  ["13", "분석 근거·출처·한계"],
] as const;

function sec(no: string, body: string, opts: { lead?: string; page?: boolean } = {}): string {
  const t = SECTIONS.find((s) => s[0] === no)![1];
  return `<section class="sec${opts.page === false ? "" : " pg"}" data-sec="${no}">
  <header class="sec-h"><span class="sec-no">${no}</span><h1>${esc(t)}</h1></header>
  ${opts.lead ? `<p class="lead">${esc(opts.lead)}</p>` : ""}
  ${body}
</section>`;
}
const p = (t: string, cls = "") => t ? `<p${cls ? ` class="${cls}"` : ""}>${esc(t)}</p>` : "";
const ul = (xs: string[], cls = "ul") => xs.length ? `<ul class="${cls}">${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
const mark = (t: string, kind: "fact" | "read" | "need" | "note") => `<span class="mk mk-${kind}">${esc(t)}</span>`;

/* ── 방사형 그래프 ─────────────────────────────────────────────── */

function radarSvg(r: Report2): string {
  const W = 460, H = 340, cx = 230, cy = 172, R = 112;
  const n = r.radar.axes.length;
  const ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const rad = (lv: Level) => (lv === 0 ? 0.12 : lv / 3) * R;
  const pt = (i: number, rr: number) => [cx + rr * Math.cos(ang(i)), cy + rr * Math.sin(ang(i))];
  const rings = [1, 2, 3].map((lv) => {
    const pts = r.radar.axes.map((_, i) => pt(i, rad(lv as Level)).map((v) => v.toFixed(1)).join(",")).join(" ");
    return `<polygon points="${pts}" class="rg"/>`;
  }).join("");
  const spokes = r.radar.axes.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="sp"/>`; }).join("");
  const labels = r.radar.axes.map((a, i) => {
    const [x, y] = pt(i, R + 14);
    const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
    /* 긴 이름은 두 줄로: 그래프 밖으로 나가 잘리지 않게 */
    const words = a.label.split(" ");
    const lines = a.label.length > 8 && words.length > 1
      ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [a.label];
    const y0 = y + 3 - (lines.length - 1) * 5.5 + (Math.abs(x - cx) < 8 && y < cy ? -4 : 0);
    return `<text x="${x.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="${anchor}" class="al">${lines.map((l, k) => `<tspan x="${x.toFixed(1)}" dy="${k ? 11 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
  }).join("");
  const ringLabel = [1, 2, 3].map((lv) => `<text x="${cx + 4}" y="${(cy - rad(lv as Level) + 9).toFixed(1)}" class="rl">${lv}</text>`).join("");
  const STYLE = ["s0", "s1", "s2", "s3"];
  const series = r.radar.series.map((s, k) => {
    const full = s.levels.every((v) => v !== null);
    const pts = s.levels.map((v, i) => v === null ? null : pt(i, rad(v)));
    const poly = full ? `<polygon points="${pts.map((q) => q!.map((v) => v.toFixed(1)).join(",")).join(" ")}" class="py ${STYLE[k]}"/>` : "";
    const dots = pts.map((q) => q ? `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3" class="dt ${STYLE[k]}"/>` : "").join("");
    const hollow = s.levels.map((v, i) => v === null ? (() => { const [x, y] = pt(i, R * 0.06); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" class="na"/>`; })() : "").join("");
    return poly + dots + hollow;
  }).join("");
  return `<svg class="radar" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="판단 단계 방사형 그래프">
  ${rings}${spokes}${ringLabel}${series}${labels}</svg>`;
}

function radarLegend(r: Report2): string {
  const S = ["s0", "s1", "s2", "s3"];
  return `<div class="lg">${r.radar.series.map((s, k) => `<span class="lg-i"><i class="sw ${S[k]}"></i>${esc(s.name)}${s.deep ? "" : " (판단 넷만 물음)"}</span>`).join("")}</div>
  <p class="cap">반지름은 그 판단을 어디까지 했다고 답했는가입니다. 1 주어진 조건으로 해 봄 · 2 직접 해 봄 · 3 직접 기준을 정함(근거 둘 이상을 고른 경우). 중심 가까운 점은 ‘응답에서 확인되지 않음’, 빈 점은 그 영역에서 이번에 묻지 않은 판단입니다. 점수가 아니며 다른 학생과 비교한 값도 아닙니다.</p>`;
}

/* ── 관심 × 근거 지도 ─────────────────────────────────────────── */

function mapGrid(cells: MapCell[]): string {
  const cols: (MapCell["interest"])[] = ["LOW", "MID", "HIGH"];
  const colKo = { LOW: "관심 낮음", MID: "관심 보통", HIGH: "관심 높음" } as const;
  const rows: (Level | null)[] = [3, 2, 1, 0, null];
  const rowKo = (lv: Level | null) => lv === null ? "이번에 깊게 묻지 않음" : LEVEL_WORD[lv];
  const zone = (lv: Level | null, c: MapCell["interest"]) =>
    lv !== null && lv >= 2 ? (c === "HIGH" ? "z-use" : c === "LOW" ? "z-base" : "z-mid") : lv !== null && c === "HIGH" ? "z-try" : "";
  const body = rows.map((lv) => `<tr><th>${esc(rowKo(lv))}</th>${cols.map((c) => {
    const here = cells.filter((x) => x.depth === lv && x.interest === c);
    return `<td class="${zone(lv, c)}">${here.map((x) => `<span class="chip">${esc(x.name)}</span>`).join("")}</td>`;
  }).join("")}</tr>`).join("");
  return `<table class="map"><thead><tr><th></th>${cols.map((c) => `<th>${colKo[c!]}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
  <p class="cap"><b>꺼내 쓸 강점</b>(관심 높음 · 직접 해 봄 이상) · <b>기본기로 쓸 경험</b>(관심 낮음 · 직접 해 봄 이상) · <b>먼저 겪어 볼 영역</b>(관심 높음 · 아직 근거 적음). 칸의 바탕색이 이 셋을 구분하고, 같은 칸 안의 차례에는 뜻이 없습니다.</p>`;
}

/* ── 장마다 ──────────────────────────────────────────────────── */

function cover(r: Report2, pages: Record<string, number>): string {
  const m = r.meta;
  return `<section class="cover">
  <div class="cv-top"><span class="cv-brand">CareerMatri</span><span class="cv-kind">PRO 진로·취업 분석 리포트</span></div>
  <div class="cv-mid">
    <p class="cv-school">${esc(m.school ?? "")}</p>
    <h1 class="cv-title">${esc(m.department ?? m.major ?? "")}</h1>
    <p class="cv-sub">${esc(r.majorName)} 전공 기준${m.specialization ? ` · ${esc(m.specialization)}` : ""}</p>
  </div>
  <dl class="cv-dl">
    <div><dt>응답일</dt><dd>${esc(m.answeredOn ?? "—")}</dd></div>
    <div><dt>판본</dt><dd>${esc(m.tier)} · 기업 자료 확인일 ${esc(r.checkedOn)}</dd></div>
  </dl>
  <ol class="toc">${SECTIONS.map(([no, t]) => `<li><span class="t-no">${no}</span><span class="t-t">${esc(t)}</span><span class="t-p">${pages[no] ?? ""}</span></li>`).join("")}</ol>
  <p class="cv-foot">이 리포트는 검사 응답과 학생이 적어 둔 경험 기록을 정해 둔 규칙으로 읽은 분석입니다. 점수·순위·합격 가능성을 내지 않고, 기업 정보는 직업정보 제공이며 취업 알선이 아닙니다.</p>
</section>`;
}

function s01(r: Report2): string {
  const head = r.opinion[0];
  const rest = r.opinion.slice(1, -1);
  const tail = r.opinion[r.opinion.length - 1];
  return sec("01", `
  <p class="big">${esc(head)}</p>
  ${rest.map((t) => p(t)).join("")}
  <div class="three">
    <div><h3>지금 꺼내 쓸 것</h3>${p(r.strengths[0] ? `${r.strengths[0].name} — ${r.strengths[0].shown[0] ?? r.strengths[0].owned[0] ?? ""}` : "아직 강점으로 꺼낼 근거가 확인되지 않았습니다")}</div>
    <div><h3>먼저 채울 것</h3>${p(r.priorities[0] ? `${r.priorities[0].domain} — ${r.priorities[0].what}` : "응답에서 먼저 채울 빈칸이 잡히지 않았습니다")}</div>
    <div><h3>첫 30일에 할 일</h3>${p(r.plan.find((x) => x.period === "30일")?.what ?? "")}</div>
  </div>
  ${p(tail, "note")}
  <h2>이 리포트를 읽는 법</h2>
  <p>줄마다 근거의 층을 글자로 붙였습니다. ${mark("응답", "fact")}은 검사 문항에 답한 내용, ${mark("고른 근거", "fact")}는 체크리스트에서 직접 고른 항목, ${mark("경험 기록", "fact")}은 내 CareerMatri에 적어 둔 경험, ${mark("분석적 해석", "read")}은 이 리포트가 덧붙인 해석, ${mark("추가 확인 필요", "need")}는 아직 확인하지 않은 것입니다. 수치·기간·성과는 리포트가 만들지 않으며, 그 부분은 직접 적는 칸으로 남겼습니다.</p>`);
}

function s02(r: Report2): string {
  const rd = r.reading;
  const axisRows = r.radar.best.map((b) => `<tr><td>${esc(r.radar.axes.find((a) => a.axis === b.axis)!.label)}</td><td>${b.level === null ? "<span class=\"muted\">이번에 묻지 않음</span>" : esc(LEVEL_WORD[b.level])}</td><td>${esc(b.where.join(" · "))}</td></tr>`).join("");
  return sec("02", `
  <div class="fig">
    <div class="fig-l">${radarSvg(r)}</div>
    <div class="fig-r">${radarLegend(r)}
      <h3>그래프에서 보이는 것</h3>${p(rd.balance)}${p(rd.evidence)}</div>
  </div>
  ${rd.paragraphs.map((t) => p(t)).join("")}
  ${rd.caution ? `<p class="caution">${mark("응답 확인 필요", "need")} ${esc(rd.caution)}</p>` : ""}
  <h2>판단마다 가장 높게 확인된 단계</h2>
  <table class="tb"><colgroup><col style="width:34%"><col style="width:30%"><col></colgroup><thead><tr><th>판단</th><th>가장 높은 단계</th><th>그 단계가 나온 영역</th></tr></thead><tbody>${axisRows}</tbody></table>
  <h2>강점·역량 활용 지도 — 열두 영역의 관심과 근거</h2>
  ${mapGrid(r.map)}
  ${r.reading.mapLines.map((t) => p(t)).join("")}`, { lead: "물어본 영역마다 여덟 가지 판단을 어디까지 해 봤다고 답했는지를 한 그림에 겹쳤습니다." });
}

function s03(r: Report2): string {
  const c = r.cross;
  const rows = c.domains.map((d) => `<div class="xr"><div class="xr-h"><b>${esc(d.name)}</b>${mark(CROSS_KO[d.kind], d.kind === "BOTH" ? "fact" : "need")}</div>${p(d.note)}${p(`→ ${d.next}`, "next")}</div>`).join("");
  const recs = c.records.map((e) => `<div class="rec">
    <div class="rec-h"><b>${esc(e.title)} ${mark("경험 기록", "fact")}</b><span class="muted small">${esc(e.kind)} · ${esc(e.period)} · ${esc(e.domains.join(" · "))}</span></div>
    <dl class="dl2">
      <div><dt>확인 가능한 판단</dt><dd>${e.capable.length ? ul(e.capable, "ul tight") : "<span class=\"muted\">기록에 고른 판단이 없음</span>"}</dd></div>
      <div><dt>이 기록만으로 판단할 수 없는 것</dt><dd>${esc(e.unknown.join(" · ") || "—")}</dd></div>
      <div><dt>이어지는 직무</dt><dd>${esc(e.jobs.join(" · ") || "—")}</dd></div>
      <div><dt>채울 증빙</dt><dd>${esc(e.needs.join(" · "))}</dd></div>
      <div><dt>서류에서 쓰는 법</dt><dd>${esc(e.use)} ${mark("분석적 해석", "read")}</dd></div>
    </dl></div>`).join("");
  return sec("03", `
  ${c.domains.length ? `<h2>영역별로 본 일치와 어긋남</h2>${rows}` : p("검사에서 근거가 확인된 영역도, 적어 둔 경험 기록도 아직 없어 비교할 것이 없습니다.")}
  <h2>적어 둔 경험 기록 ${c.records.length}건</h2>
  ${recs || p("적어 둔 경험 기록이 없습니다. 내 CareerMatri의 ‘경험 추가’에서 최근 과제 하나를 남기면 다음 리포트부터 이 칸이 채워집니다.", "muted")}`, { page: false, lead: "검사 응답이 가리키는 영역과 학생이 직접 적어 둔 경험 기록이 같은 곳을 가리키는지 비교했습니다." });
}

function s04(r: Report2): string {
  if (!r.strengths.length) {
    const z4 = r.map.filter((x) => x.zone === "Z4_INSUFFICIENT_EVIDENCE").map((x) => x.name);
    return sec("04", `${p(`이번 응답에서는 ‘직접 해 봄’ 이상으로 확인된 영역이 없어, 강점으로 꺼낼 경험을 적지 않았습니다. 대신 관심이 높게 나온 ${z4.join(" · ") || "영역"}에서 첫 근거를 만드는 길을 05장과 10장에 적었습니다.`)}
    ${p("강점이 없다는 뜻이 아닙니다. 이 검사가 재는 것은 해 본 일과 그 안에서 정한 것이고, 그 기록이 아직 적다는 뜻입니다.", "note")}`, { page: false });
  }
  const blocks = r.strengths.map((s, i) => `<article class="st">
    <h2><span class="n">${i + 1}</span>${esc(s.name)}</h2>
    <dl class="dl2">
      <div><dt>확인된 것</dt><dd>${ul(s.shown, "ul tight")}${s.owned.length ? `<p class="small">직접 기준을 정했다고 확인된 판단: ${esc(s.owned.join(" · "))} ${mark("응답·고른 근거", "fact")}</p>` : ""}</dd></div>
      <div><dt>쓰이는 직무</dt><dd>${esc(s.jobs.join(" · ") || "—")}${s.industryLines.length ? `<p class="small">목표 산업이 보는 판단: ${esc(s.industryLines.join(" · "))}</p>` : ""}</dd></div>
      <div><dt>보여 주는 법</dt><dd>${esc(s.howShow)} ${mark("분석적 해석", "read")}</dd></div>
      <div><dt>더 증명할 것</dt><dd>${s.prove.length ? ul(s.prove, "ul tight") : "<span class=\"muted\">이 영역에서 비어 있는 판단이 잡히지 않았습니다</span>"}</dd></div>
      <div><dt>받을 수 있는 질문</dt><dd>${esc(s.question)}</dd></div>
    </dl></article>`).join("");
  return sec("04", blocks, { page: false, lead: "근거가 확인된 영역을 지원서와 면접에서 어디에 어떻게 쓰는지 적었습니다. 차례는 근거가 단단한 순서입니다." });
}

function s05(r: Report2): string {
  const items = r.priorities.map((x) => `<article class="pr">
    <h3><span class="n">${x.order}</span>${esc(x.domain)} — ${esc(x.what)}</h3>
    <p><b>이유</b> ${esc(x.why.join(" · "))}.</p>
    <p><b>방법</b> ${esc(x.method)}</p>
    <div class="pr-meta"><span><b>관련 직무</b> ${esc(x.jobs.join(" · ") || "—")}</span><span><b>학습 형태</b> ${esc(x.learn || "—")}</span><span><b>확인 방법</b> ${esc(x.check)}</span><span><b>시기</b> ${esc(x.when || "—")}</span></div>
  </article>`).join("");
  return sec("05", items || p("응답에서 먼저 채울 빈칸이 잡히지 않았습니다."), { page: false,
    lead: "목표 직무의 필수 판단 → 목표 산업이 보는 판단 → 영역의 필수 판단 → 결과 모델이 고른 빈칸 순서로 정리했습니다. 숫자 점수로 매긴 순위가 아닙니다.",
  });
}

function s06(r: Report2): string {
  const blocks = r.directions.map((d, i) => `<article class="dr">
    <h2><span class="n">${i + 1}</span>${esc(d.name)}${d.goal ? " <small>목표로 고른 직무</small>" : ""}</h2>
    <p><b>하는 일</b> ${esc(d.owns)}. 정하는 것: ${esc(d.decides.join(" · "))}.</p>
    ${d.environment ? p(d.environment) : ""}
    <p><b>분석 결과와의 연결 근거</b> ${esc(d.basis.join(" · ") || "이 직무와 이어지는 영역에서 확인된 판단이 아직 없음")}</p>
    <p><b>추가 확보가 필요한 역량</b> ${esc(d.need.join(" · ") || "필수 판단은 확인됨")}</p>
    <p><b>취업 준비 현황</b> ${esc(d.readiness)} — ${esc(d.prereq)}</p>
    ${d.differs.length ? `<p class="small">비슷한 직무와의 차이: ${esc(d.differs[0])}</p>` : ""}
  </article>`).join("");
  const cmp = `<table class="tb cmp"><thead><tr><th>직무</th><th>정하는 것</th><th>분석 결과와의 연결 근거</th><th>추가 확보가 필요한 역량</th><th>준비 현황</th><th>지원서 재료</th></tr></thead><tbody>
  ${r.directions.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td>${esc(d.decides.slice(0, 3).join(" · "))}</td><td>${esc(d.basis.join(" · ") || "—")}</td><td>${esc(d.need.join(" · ") || "—")}</td><td>${esc(d.readiness)}</td><td>${esc(d.material.slice(0, 2).join(" · "))}</td></tr>`).join("")}</tbody></table>`;
  return sec("06", `${blocks}<h2>직무 탐색 비교표</h2>${cmp}`, { page: false,
    lead: "확인된 영역과 목표로 고른 직무를 함께 보고 탐색할 방향을 셋 골랐습니다. 직무 적합도나 합격 가능성을 계산한 것이 아닙니다.",
  });
}

function companyRow(e: Explore): string {
  const o = e.org;
  return `<tr><td><b>${esc(o.name)}</b><div class="small muted">${esc(o.industry_line)}</div></td>
  <td>${esc(o.hq.text)}<div class="small muted">${esc(o.region_basis)}</div></td>
  <td>${e.jobs.map((j) => `${esc(j.name)}<div class="small muted">${esc(JOB_STATUS_KO[j.status])}</div>`).join("")}</td>
  <td>${esc(e.links.map((l) => l.text).join(" · "))}</td>
  <td class="small">${esc(VERIFY_KO[o.verify])}</td></tr>`;
}

function s07(r: Report2): string {
  const x = r.explore;
  const facts = r.regionFacts.slice(0, 5).map((f) => `<li>${esc(f.text)} <span class="src">${esc(f.source.title)}</span></li>`).join("");
  const groups = x.groups.map((g) => `<h3>${esc(REGION_KO[g.region as Region])} <span class="muted small">${g.items.length}곳</span></h3>
  <table class="tb co"><colgroup><col style="width:23%"><col style="width:21%"><col style="width:19%"><col><col style="width:13%"></colgroup>
  <thead><tr><th>진로 탐색 기업</th><th>위치(판단 기준)</th><th>탐색 가능한 직무군</th><th>분석 결과와의 연결 근거</th><th>자료 확인</th></tr></thead>
  <tbody>${g.items.map(companyRow).join("")}</tbody></table>`).join("");
  return sec("07", `
  <h2>대전·세종·충청권 산업 환경</h2>
  <ul class="ul facts">${facts}</ul>
  ${x.few ? p(x.few, "note") : ""}
  <h2>지역별 직무 연관 기업</h2>
  ${groups}
  <p class="note">${esc(x.note)} 지역은 본점이나 확인된 사업장 소재지로 갈랐습니다. ‘탐색 가능한 직무군(산업 일반 예시)’은 그 기업에서 직무를 확인하지 못했고 같은 산업에서 흔히 있는 경영 직무를 적은 것입니다.</p>`,
  { page: false, lead: "목표 산업 · 목표 직무 · 분석된 탐색 방향 · 확인된 경험 영역이 이어지는 기업만 골랐습니다. 무관한 기업은 싣지 않았습니다." });
}

function deepCard(r: Report2, e: Explore): string {
  const o = e.org; const q = e.q!;
  const srcList = o.sources.map((s, i) => `<li><b>[${i + 1}]</b> ${esc(SOURCE_KO[s.kind])} — ${esc(s.title)}${s.url ? ` <span class="url">${esc(decodeURI(s.url).slice(0, 90))}</span>` : ""} · 확인일 ${esc(s.checked_on)}</li>`).join("");
  const cite = (src: number[]) => src.length ? `<sup>${src.map((i) => `[${i + 1}]`).join("")}</sup>` : "";
  return `<article class="deep">
  <header class="dp-h"><h2>${esc(o.name)}</h2><span class="dp-sub">${esc(o.industry_line)} · ${esc(REGION_KO[o.region])} · ${esc(VERIFY_KO[o.verify])}</span></header>
  <div class="dp-id small muted">사업자등록번호 ${esc(o.identifiers.bizno ?? "미확인")}${o.identifiers.listing ? ` · ${esc(o.identifiers.listing)}` : ""} · 본점 ${esc(o.hq.text)}${o.sites.length ? ` · 사업장 ${esc(o.sites.join(", "))}` : ""}</div>
  <h3>기업 이해 ${mark("확인된 사실", "fact")}</h3>
  <ul class="ul">${o.facts.map((f) => `<li>${esc(f.text)}${cite(f.src)}</li>`).join("")}</ul>
  <h3>직무 이해</h3>
  <ul class="ul">${e.jobs.map((j) => `<li><b>${esc(j.name)}</b> ${mark(JOB_STATUS_KO[j.status], j.status === "INDUSTRY_EXAMPLE" ? "need" : "fact")} — ${esc(j.tasks)}${j.evidence ? ` <span class="small muted">(${esc(j.evidence)}${cite(j.src ?? [])})</span>` : ""}</li>`).join("")}</ul>
  <h3>이 기업에서 보이는 것 ${mark("분석적 해석", "read")}</h3>
  ${o.interpretation.map((t) => p(t)).join("")}
  <div class="two">
    <div><h4>이 산업에서 공통으로 보는 것</h4>${ul(e.industryGeneral, "ul tight")}</div>
    <div><h4>이 기업에서 따로 볼 것</h4>${ul(o.to_check.length ? o.to_check : ["—"], "ul tight")} ${mark("추가 확인 필요", "need")}</div>
  </div>
  <h3>학생 연결 — 직무 요구역량 대비 보유 근거 분석</h3>
  <div class="two">
    <div><h4>지금 가진 근거</h4>${ul(e.have.length ? e.have : ["이 직무의 필수 판단이 아직 응답에서 확인되지 않음"], "ul tight")}</div>
    <div><h4>추가 확보가 필요한 역량</h4>${ul(e.lack.length ? e.lack : q.needs, "ul tight")}</div>
  </div>
  <h3>준비 질문 열 가지</h3>
  <ol class="qa">
    <li><b>무슨 사업을 하나</b> ${esc(q.business)}</li>
    <li><b>탐색 가능한 직무</b> ${esc(q.jobs)}</li>
    <li><b>실제 수행 업무</b> ${esc(q.tasks.join(" / "))}</li>
    <li><b>내 분석 결과와 이어지는 곳</b> ${esc(q.links.join(" · "))}</li>
    <li><b>지금 가진 근거</b> ${esc(q.current.join(" · "))}</li>
    <li><b>추가로 필요한 것</b> ${esc(q.needs.join(" · "))}</li>
    <li><b>교내에서 할 수 있는 활동</b> ${esc(q.campus.join(" · "))}</li>
    <li><b>만들어 둘 결과물</b> ${esc(q.projects.join(" · ") || "—")}</li>
    <li><b>서류·면접에서 증명할 것</b> ${esc(q.prove.doc)} / ${esc(q.prove.portfolio)} / ${esc(q.prove.interview)}</li>
    <li><b>공고가 나오면 먼저 볼 것</b> ${esc(q.firstCheck.join(" · "))}</li>
  </ol>
  <h3>이 기업을 기준으로 한 3~6개월 준비 로드맵</h3>
  <table class="tb rm"><thead><tr><th>시기</th><th>할 일</th><th>남길 것</th></tr></thead><tbody>${e.roadmap.map((x) => `<tr><td>${esc(x.when)}</td><td>${esc(x.what)}</td><td>${esc(x.keep)}</td></tr>`).join("")}</tbody></table>
  <p class="small muted">채용 여부 — ${esc(o.hiring.note)}</p>
  <ol class="srcs">${srcList}</ol>
</article>`;
}

function s08(r: Report2): string {
  const d = r.explore.deep;
  return sec("08", d.length ? d.map((e) => deepCard(r, e)).join("") : p("공식 자료와 대조한 지역 기업 가운데 이 학생의 분석 결과와 이어지는 곳이 없어 심층 분석을 적지 않았습니다."), {
    lead: "공식 홈페이지·공시 검색 결과와 대조한 지역 기업 가운데 연결 근거가 많은 곳을 깊게 봤습니다. KODATA는 제3자 기업정보이므로 공식 자료와 같은 층으로 적지 않았습니다.",
  });
}

function s09(r: Report2): string {
  const a = r.application;
  const frame = a.frame.map((f) => `<div class="fr"><h4>${esc(f.label)}</h4><p class="small muted">${esc(f.hint)}</p>${ul(f.items, "ul tight")}</div>`).join("");
  const stories = a.stories.map((s) => `<div class="story"><h3>${esc(s.domain)} 경험으로 쓰는 한 문단</h3>
    <table class="tb fill"><tbody>${s.lines.map((l) => `<tr><th>${esc(l.label)}</th><td class="${l.filled ? "" : "blank"}">${esc(l.filled ? l.text : "직접 기입")}</td></tr>`).join("")}</tbody></table></div>`).join("");
  const port = a.portfolio.length ? `<table class="tb"><thead><tr><th>결과물</th><th>영역</th><th>붙일 것</th></tr></thead><tbody>${a.portfolio.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.domain)}</td><td>${esc(x.note)}</td></tr>`).join("")}</tbody></table>`
    : p("고른 결과물이 없어 포트폴리오 목록을 만들지 않았습니다. 05장의 첫 할 일이 남길 결과물 하나를 정해 줍니다.", "muted");
  const iv = a.interview.map((x) => `<li><b>${esc(x.q)}</b><div class="small muted">${esc(x.from)} · 준비: ${esc(x.prepare)}</div></li>`).join("");
  return sec("09", `
  <h2>경험 번역 — 응답에서 고른 문장</h2><div class="frame">${frame}</div>
  ${stories || p("지원서 문단으로 옮길 만큼 근거가 선 경험이 아직 없습니다. 아래 워크시트(12장)의 빈 양식으로 첫 경험을 정리해 보세요.", "muted")}
  <p class="note">완성된 자기소개서를 대신 써 드리지 않습니다. 칸에 들어간 문장은 학생이 고른 보기이고, ‘직접 기입’ 칸의 수치·기간·결과는 학생만 알 수 있습니다.</p>
  <h2>포트폴리오에 넣을 결과물</h2>${port}
  <h2>미리 준비할 면접 질문</h2><ol class="ivq">${iv}</ol>`, { page: false });
}

function s10(r: Report2): string {
  const order = ["30일", "60일", "90일", "6개월", "12개월"];
  const rows = order.map((per) => {
    const xs = r.plan.filter((x) => x.period === per);
    if (!xs.length) return "";
    return xs.map((x, i) => `<tr>${i === 0 ? `<td rowspan="${xs.length}" class="per">${esc(per)}</td>` : ""}<td><b>${esc(x.what)}</b><div class="small muted">왜: ${esc(x.why)}</div></td><td>${esc(x.how)}</td><td>${esc(x.output)}</td><td class="small">${esc(x.link || "—")}</td></tr>`).join("");
  }).join("");
  return sec("10", `<table class="tb plan"><colgroup><col style="width:9%"><col style="width:39%"><col style="width:20%"><col style="width:17%"><col></colgroup>
  <thead><tr><th>기한</th><th>무엇을 · 왜</th><th>어떤 방식으로</th><th>산출물</th><th>이어지는 직무·기업</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="note">기한은 리포트를 받은 날부터 셉니다. 학년과 목표 지원 시기를 묻지 않았으므로 날짜 대신 기간으로 적었습니다.</p>`, { page: false });
}

function s11(r: Report2): string {
  return sec("11", `<ol class="final">${r.final.map((x) => `<li><span class="fn">${x.no}</span><div><p class="ft">${esc(x.text)}</p><p class="small muted">${esc(x.why)}</p></div></li>`).join("")}</ol>
  <p class="note">위 넷을 끝내면 내 CareerMatri에 경험을 더하고 다시 결과를 보세요. 같은 자로 무엇이 달라졌는지 확인할 수 있습니다.</p>`, { page: false });
}

function s12(r: Report2): string {
  const F = ["상황 — 어떤 수업·활동이었고 무엇이 문제였나", "내가 맡은 범위", "내가 직접 정한 기준이나 선택", "쓴 방법·도구", "남은 결과물", "결과를 무엇과 비교했나", "결과·수치·기간(직접 기입)", "다시 한다면 바꿀 것"];
  const key = ["", "", "decided", "", "artifact", "verify", "", ""];
  return sec("12", r.worksheet.map((w) => `<div class="ws"><h3>${esc(w.title)}</h3>
    <table class="tb ws-t"><tbody>${F.map((f, i) => `<tr><th>${esc(f)}</th><td>${w.prefill[key[i]] ? `<span class="pre">${esc(w.prefill[key[i]])}</span>` : ""}</td></tr>`).join("")}</tbody></table></div>`).join(""), {
    page: false, lead: "인쇄해서 직접 채우는 양식입니다. 연한 글씨는 검사에서 고르신 항목이고, 나머지 칸은 비워 두었습니다.",
  });
}

function s13(r: Report2): string {
  const vt = r.verifyTable.map((v) => `<tr><td>${esc(v.name)}</td><td>${esc(v.bizno)}</td><td>${esc(REGION_KO[v.region as Region])}</td><td>${v.origin === "KODATA_NEW" ? "KODATA 신규" : "기존 후보"}</td><td>${esc(VERIFY_KO[v.verify as keyof typeof VERIFY_KO])}</td><td>${esc(v.checked)}</td></tr>`).join("");
  const ver = Object.entries(r.versions).map(([k, v]) => `${k} ${v}`).join(" · ");
  return sec("13", `
  <h2>이 리포트가 재는 것과 재지 않는 것</h2>
  <div class="two"><div><h4>재는 것</h4>${ul(["열두 영역의 관심·해 본 정도·배울 뜻", "물어본 영역에서 여덟 가지 판단을 어디까지 했다고 답했는지", "체크리스트에서 고른 근거·결과물·비교 대상", "내 CareerMatri에 적어 둔 경험 기록"], "ul tight")}</div>
  <div><h4>재지 않는 것</h4>${ul(["성격·적성·지능", "실제 업무 성과와 수치", "다른 학생과의 순위나 백분위", "기업의 채용 여부·합격 가능성"], "ul tight")}</div></div>
  <h2>기업 검증표</h2>
  <table class="tb vt"><thead><tr><th>기업</th><th>사업자등록번호</th><th>지역</th><th>자료</th><th>확인 상태</th><th>확인일</th></tr></thead><tbody>${vt}</tbody></table>
  <p class="small muted">KODATA 기업종합보고서는 제3자 기업정보입니다. 이 리포트는 그 보고서의 재무표·신용등급·거래처 이름을 옮기지 않았고, 등록 사실(식별자·주소·업종·제품)과 고객 유형만 이 리포트의 말로 옮겼습니다. 공식 홈페이지·상장 정보·채용 공고는 검색 결과로 대조했고 원문을 직접 열람하지 못한 곳이 있습니다.</p>
  <h2>지역 자료 출처</h2>
  <ol class="srcs">${r.regionFacts.map((f) => `<li>${esc(f.source.title)} — ${esc(SOURCE_KO[f.source.kind])} · 확인일 ${esc(f.source.checked_on)}</li>`).join("")}</ol>
  <p class="small muted">판본: ${esc(ver)}</p>`, { page: false });
}

const CSS = (fonts: string) => `
@font-face{font-family:"Pretendard";font-weight:400;src:url(${fonts}/Pretendard-Regular.woff2) format("woff2")}
@font-face{font-family:"Pretendard";font-weight:500;src:url(${fonts}/Pretendard-Medium.woff2) format("woff2")}
@font-face{font-family:"Pretendard";font-weight:600;src:url(${fonts}/Pretendard-SemiBold.woff2) format("woff2")}
@font-face{font-family:"Pretendard";font-weight:700;src:url(${fonts}/Pretendard-Bold.woff2) format("woff2")}
@page{size:A4;margin:21mm 18mm 19mm 18mm}
:root{--ink:#1b2230;--navy:#16284a;--muted:#5b6474;--line:#e2e5eb;--soft:#f5f7fa;--blue:#1c5fb0;--blue-soft:#eaf1fb;--warn:#8a5a00}
*{box-sizing:border-box}
html,body{margin:0;background:#fff}
body{font-family:"Pretendard",sans-serif;color:var(--ink);font-size:10.2pt;line-height:1.72;font-weight:400;word-break:keep-all;overflow-wrap:break-word;-webkit-print-color-adjust:exact;print-color-adjust:exact}
p{margin:0 0 7pt;text-wrap:pretty}
b,strong{font-weight:600}
.small{font-size:9pt;line-height:1.6}.muted{color:var(--muted)}
h1,h2,h3,h4{color:var(--navy);margin:0;text-wrap:balance;break-after:avoid}
h2{font-size:12.5pt;font-weight:600;margin:16pt 0 6pt;padding-top:2pt}
h3{font-size:10.8pt;font-weight:600;margin:12pt 0 4pt}
h4{font-size:9.6pt;font-weight:600;margin:0 0 3pt}
.sec.pg{break-before:page}.sec:not(.pg){margin-top:26pt}
.sec-h{display:flex;align-items:baseline;gap:10pt;border-bottom:1.2pt solid var(--navy);padding-bottom:6pt;margin-bottom:10pt;break-after:avoid}
.sec-no{font-size:11pt;font-weight:600;color:var(--blue)}
.sec-h h1{font-size:18pt;font-weight:700;letter-spacing:-.01em}
.lead{color:var(--muted);font-size:9.6pt;margin-bottom:10pt}
.big{font-size:12.2pt;line-height:1.65;font-weight:500;color:var(--navy);margin-bottom:10pt}
.note{font-size:9pt;color:var(--muted);border-left:2pt solid var(--line);padding-left:8pt;margin:10pt 0}
.caution{background:#fbf6ec;border-left:2pt solid var(--warn);padding:7pt 9pt;font-size:9.4pt}
.next{color:var(--blue);font-size:9.4pt}
.ul{margin:0 0 7pt;padding-left:13pt}.ul li{margin:0 0 2.5pt}.ul.tight li{margin:0 0 1pt}
.mk{display:inline-block;font-size:7.6pt;font-weight:600;line-height:1;padding:2.4pt 4pt;border-radius:2pt;vertical-align:1pt;white-space:nowrap}
.mk-fact{color:#25425f;background:#edf1f6}.mk-read{color:#1c5fb0;background:var(--blue-soft)}.mk-need{color:var(--warn);background:#faf2e2}.mk-note{color:var(--muted);background:var(--soft)}
.cap{font-size:8.4pt;color:var(--muted);line-height:1.55;margin-top:4pt}
.src,.url{font-size:8.2pt;color:var(--muted)}
.n{display:inline-block;min-width:16pt;color:var(--blue);font-weight:700}
/* 표지 */
.cover{height:252mm;display:flex;flex-direction:column;break-after:page}
.cv-top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1pt solid var(--navy);padding-bottom:6pt}
.cv-brand{font-weight:700;font-size:13pt;color:var(--navy)}.cv-kind{font-size:9.5pt;color:var(--muted)}
.cv-mid{margin:44mm 0 16mm}.cv-school{font-size:12pt;color:var(--muted);margin:0 0 6pt}
.cv-title{font-size:29pt;font-weight:700;letter-spacing:-.02em;margin:0 0 6pt}
.cv-sub{font-size:11pt;color:var(--muted)}
.cv-dl{display:flex;gap:28pt;margin:0 0 14mm}.cv-dl div{display:flex;flex-direction:column}.cv-dl dt{font-size:8.4pt;color:var(--muted)}.cv-dl dd{margin:0;font-weight:500}
.toc{list-style:none;padding:0;margin:0;columns:2;column-gap:20pt}
.toc li{display:flex;gap:7pt;padding:3.2pt 0;border-bottom:.5pt solid var(--line);break-inside:avoid;font-size:9.6pt}
.t-no{color:var(--blue);font-weight:600;width:16pt}.t-t{flex:1}.t-p{color:var(--muted)}
.cv-foot{margin-top:auto;font-size:8.4pt;color:var(--muted);line-height:1.6}
/* 01 */
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10pt;margin:12pt 0;break-inside:avoid}
.three>div{border-top:2pt solid var(--navy);padding-top:6pt}
.three>div:nth-child(2){border-top-color:var(--blue)}
.three h3{margin:0 0 3pt;font-size:9.4pt}.three p{font-size:9.6pt;margin:0}
/* 02 */
.fig{display:grid;grid-template-columns:104mm 1fr;gap:12pt;align-items:start;break-inside:avoid}
.radar{width:104mm;height:auto}
.radar .rg{fill:none;stroke:#d9dde4;stroke-width:.7}.radar .sp{stroke:#e4e7ec;stroke-width:.6}
.radar .al{font-size:8.6px;fill:#2b3446;font-weight:500}.radar .rl{font-size:7px;fill:#9aa2ae}
.radar .py{fill-opacity:.12;stroke-width:1.5}.radar .dt{stroke:#fff;stroke-width:.8}.radar .na{fill:#fff;stroke:#9aa2ae;stroke-width:.8}
.s0{stroke:#16284a;fill:#16284a}.s1{stroke:#1c5fb0;fill:#1c5fb0}.s2{stroke:#7b8aa3;fill:#7b8aa3}.s3{stroke:#b08a3c;fill:#b08a3c}
.radar .py.s2{stroke-dasharray:3 2}
.lg{display:flex;flex-direction:column;gap:3pt;font-size:9pt;margin-bottom:4pt}
.lg-i{display:flex;align-items:center;gap:6pt}.sw{display:inline-block;width:14pt;height:3pt;border-radius:1pt}
.sw.s0{background:#16284a}.sw.s1{background:#1c5fb0}.sw.s2{background:#7b8aa3}.sw.s3{background:#b08a3c}
.map{width:100%;border-collapse:collapse;font-size:8.6pt;break-inside:avoid;table-layout:fixed}
.map th{font-weight:500;color:var(--muted);text-align:left;padding:3pt 5pt;font-size:8.4pt}
.map thead th{border-bottom:.8pt solid var(--line)}
.map tbody th{width:27%;border-bottom:.5pt solid var(--line)}
.map td{border:.5pt solid var(--line);padding:4pt;vertical-align:top;height:24pt}
.map td.z-use{background:#e9f0fa}.map td.z-base{background:#f2f4f7}.map td.z-mid{background:#eef2f7}.map td.z-try{background:#fbf6ec}
.chip{display:inline-block;margin:1pt 2pt 1pt 0;padding:1.5pt 5pt;border:.5pt solid #c9d2df;border-radius:8pt;background:#fff;font-size:8.2pt;white-space:nowrap}
/* 표 */
.tb{width:100%;border-collapse:collapse;font-size:9pt;line-height:1.55;margin:4pt 0 8pt}
.tb th{text-align:left;font-weight:600;color:var(--navy);border-bottom:1pt solid var(--navy);padding:4pt 5pt;font-size:8.6pt;vertical-align:bottom}
.tb td{border-bottom:.5pt solid var(--line);padding:5pt;vertical-align:top}
.tb tr{break-inside:avoid}.tb thead{display:table-header-group}
.tb.fill th{width:26%;border-bottom:.5pt solid var(--line);font-weight:500;color:var(--muted);vertical-align:top}
.tb.fill td.blank{color:#a3aab5}
.tb.plan .per{font-weight:700;color:var(--blue);white-space:nowrap}
/* 03 */
.xr{border-left:2pt solid var(--line);padding:2pt 0 2pt 9pt;margin:0 0 8pt;break-inside:avoid}
.xr-h{display:flex;gap:7pt;align-items:center;margin-bottom:2pt}
.rec{border-top:.8pt solid var(--line);padding-top:7pt;margin-top:8pt;break-inside:avoid}
.rec-h{display:flex;flex-direction:column;margin-bottom:4pt}
.dl2{margin:0}.dl2>div{display:grid;grid-template-columns:36mm 1fr;gap:8pt;padding:3pt 0;border-bottom:.5pt solid var(--soft)}
.dl2 dt{color:var(--muted);font-size:8.8pt;font-weight:500}.dl2 dd{margin:0}.dl2 dd .ul{margin:0}
/* 04-06 */
.st,.dr{margin:0 0 10pt;break-inside:avoid}
.st h2,.dr h2{margin-top:10pt}.dr h2 small{font-size:8.4pt;color:var(--blue);font-weight:500;margin-left:6pt}
.pr{border-top:.8pt solid var(--line);padding:7pt 0 3pt;break-inside:avoid}
.pr h3{margin:0 0 4pt}
.pr-meta{display:grid;grid-template-columns:1fr 1fr;gap:3pt 12pt;font-size:8.8pt;color:var(--muted)}
.pr-meta b{color:var(--ink);font-weight:500}
.cmp td,.cmp th{font-size:8.4pt}
/* 07-08 */
.facts li{margin-bottom:3pt}
.co td{font-size:8.6pt}
.deep{break-before:page}.sec .deep:first-of-type{break-before:auto}
.dp-h{display:flex;flex-direction:column;border-bottom:.8pt solid var(--line);padding-bottom:4pt;margin-bottom:4pt}
.dp-h h2{margin:0;font-size:14pt}.dp-sub{font-size:9pt;color:var(--blue);font-weight:500}
.dp-id{margin-bottom:6pt}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12pt;margin:6pt 0;break-inside:avoid}
.two>div{background:var(--soft);padding:7pt 9pt;border-radius:3pt}
.qa{padding-left:15pt;margin:0}.qa li{margin-bottom:3pt;font-size:9.4pt}.qa b{color:var(--navy);margin-right:4pt}
.srcs{font-size:8.2pt;color:var(--muted);padding-left:0;list-style:none;margin:6pt 0 0}.srcs b{font-weight:600;color:var(--ink)}.srcs li{margin-bottom:1pt}
.rm td{font-size:8.8pt}
/* 09 */
.frame{display:grid;grid-template-columns:1fr 1fr;gap:6pt 14pt}
.fr{break-inside:avoid}.fr h4{margin-bottom:0}
.story{break-inside:avoid;margin-top:8pt}
.ivq{padding-left:15pt}.ivq li{margin-bottom:5pt;break-inside:avoid}
/* 11 */
.final{list-style:none;padding:0;margin:4pt 0}
.final li{display:flex;gap:10pt;padding:8pt 0;border-bottom:.5pt solid var(--line);break-inside:avoid}
.fn{flex:0 0 22pt;height:22pt;border-radius:11pt;background:var(--navy);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:10pt}
.ft{font-weight:500;margin:0 0 2pt}
/* 12 */
.ws{break-inside:avoid;margin-bottom:10pt}
.ws-t th{width:38%;font-weight:500;color:var(--ink);border-bottom:.5pt solid var(--line);font-size:9pt}
.ws-t td{height:30pt;border-bottom:.5pt solid #c9ced8}
.pre{color:#8d96a3;font-size:8.8pt}
.vt td{font-size:8.6pt}
`;

export function render2(r: Report2, opts: { fontsHref: string; pages?: Record<string, number> }): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri PRO 진로·취업 분석 리포트</title>
<style>${CSS(opts.fontsHref)}</style></head><body>
${cover(r, opts.pages ?? {})}
${s01(r)}${s02(r)}${s03(r)}${s04(r)}${s05(r)}${s06(r)}${s07(r)}${s08(r)}${s09(r)}${s10(r)}${s11(r)}${s12(r)}${s13(r)}
</body></html>`;
}

/**
 * 쪽마다 머리말 · 섹션명 · 쪽 번호를 그린 덧판. 본문 PDF 와 같은 A4 로 뽑아
 * 한 쪽씩 겹친다. 표지(1쪽)에는 아무것도 얹지 않는다.
 */
export function overlayHtml(r: Report2, pageSections: string[], fontsHref: string): string {
  const n = pageSections.length;
  const head = `${r.meta.school ?? ""} · ${r.meta.department ?? ""}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@font-face{font-family:"Pretendard";font-weight:400;src:url(${fontsHref}/Pretendard-Regular.woff2) format("woff2")}
@font-face{font-family:"Pretendard";font-weight:600;src:url(${fontsHref}/Pretendard-SemiBold.woff2) format("woff2")}
@page{size:A4;margin:0}html,body{margin:0}
.pg{width:210mm;height:297mm;position:relative;break-after:page;font-family:"Pretendard";color:#5b6474;font-size:7.8pt}
.hd{position:absolute;top:9mm;left:18mm;right:18mm;display:flex;justify-content:space-between;border-bottom:.4pt solid #e2e5eb;padding-bottom:2mm}
.ft{position:absolute;bottom:9mm;left:18mm;right:18mm;display:flex;justify-content:space-between}
.ft b{color:#16284a;font-weight:600}
</style></head><body>${pageSections.map((s, i) => i === 0 ? `<div class="pg"></div>` : `<div class="pg"><div class="hd"><span>${esc(head)}</span><span>CareerMatri PRO 진로·취업 분석 리포트</span></div><div class="ft"><span><b>${esc(s)}</b></span><span>${i + 1} / ${n}</span></div></div>`).join("")}</body></html>`;
}
