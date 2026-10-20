/**
 * **PDF GOLD MASTER 4차 · 대표 5쪽 편집 시안.** 50쪽 전체를 다시 뽑기 전에, 쪽의 목적마다 편집형
 * 그래픽과 활자 위계를 먼저 사람에게 보인다(Human Review 지시 3·4). 운영 PDF 경로와 3차 템플릿
 * (`render3.ts`)은 그대로 두고, 같은 `Report3` 를 읽어 다섯 쪽만 그린다.
 *
 *   ① 표지 · ② 개인 역량 분석과 방사형 그래프 · ③ Evidence 심층 분석 · ④ 실제 기업·직무 심층 분석 · ⑤ 개인별 취업 실행 로드맵
 *
 * 편집 원칙(쪽마다 `DESIGN_NOTES.md` 에 적용 자리를 적는다):
 * - **한 쪽은 한 장이다.** 쪽마다 A4 한 장 안에서 끝나게 짜고, 넘치면 뽑는 쪽이 멈춘다(넘친 글을 숨기지 않는다).
 * - **그래픽은 그 쪽의 질문에 답한다.** 표지는 열두 영역의 관심과 깊이, 역량 쪽은 영역 × 판단, Evidence 쪽은
 *   일의 흐름과 고른 근거, 기업 쪽은 직무의 일과 학생 근거의 맞물림, 로드맵은 목표 → 과제 → 시기.
 * - **그림의 값은 전부 결과 모델과 경험 기록과 안내 자료에서 온다.** 근거 없는 지표·점수·비율을 만들지 않는다.
 * - 본문 10pt · 줄 1.62 이상, 캡션 8pt 이상. 표는 줄 사이를 넓히고 칸을 줄인다. 색은 남색 하나와 강조색 하나.
 */
import type { Report3, CompanyDeep } from "./report3";
import type { DomainRead } from "./analysis3";
import { chaptersOf } from "./render3";
import { JUDGE, STEP, VERIFY5 } from "./words";
import type { Level } from "./profile";
import { REGION_KO } from "./companies";

/* 글에 섞인 ASCII 따옴표 쌍은 ‘ ’ 로 바꿔 쓴다(자료 원문은 그대로 두고 그리는 자리에서만) */
export const esc = (s: unknown) => String(s ?? "").replace(/'([^'\n]{1,60})'/g, "‘$1’").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const N = 5;

export type Fonts = { href: string; family: "Pretendard" | "NanumGothic" };
export const SAMPLE4_PAGES = [
  { no: 1, key: "cover", title: "표지" },
  { no: 2, key: "profile", title: "개인 역량 분석과 방사형 그래프" },
  { no: 3, key: "evidence", title: "Evidence 심층 분석" },
  { no: 4, key: "company", title: "실제 기업·직무 심층 분석" },
  { no: 5, key: "roadmap", title: "개인별 취업 실행 로드맵" },
] as const;

function frame(r: Report3, i: number, section: string, body: string): string {
  const head = [r.meta.school, r.meta.department].filter(Boolean).join(" · ");
  return `<section class="pg" data-page="${i}">
  <header class="rh"><span>${esc(head)}</span><span>CareerMatri PRO 진로·취업 분석 리포트</span></header>
  <div class="bd">${body}</div>
  <footer class="rf"><b>${esc(section)}</b><span class="rv">검토용 미리보기 · 배포 전</span><span>v4 대표 쪽 ${i} / ${N}</span></footer>
</section>`;
}
export const opener = (no: string, kicker: string, title: string, dek: string) => `<div class="op">
  <div class="kick"><span class="no">${esc(no)}</span><span>${esc(kicker)}</span></div>
  <h1>${esc(title)}</h1>${dek ? `<p class="dek">${esc(dek)}</p>` : ""}</div>`;

/* ── ① 표지 ────────────────────────────────────────────────────── */

/** 열두 영역의 관심(선의 길이)과 해 본 깊이(점의 채움). 학생의 응답으로 그린다 */
export function signature(r: Report3): string {
  const S = 250, c = S / 2, R = 92;
  const n = r.map.length;
  const len = (b: string | null) => (b === "HIGH" ? 1 : b === "MID" ? 0.66 : b === "LOW" ? 0.36 : 0.2);
  const fill = (d: Level | null) => (d === null ? 0 : [0.18, 0.42, 0.72, 1][d]);
  const short = (s: string) => s.split("·")[0].replace(/\s.*$/, "");
  const parts = r.map.map((m, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const L = R * len(m.interest);
    const x = c + L * Math.cos(a), y = c + L * Math.sin(a);
    const lx = c + (R + 17) * Math.cos(a), ly = c + (R + 17) * Math.sin(a);
    const anchor = Math.abs(lx - c) < 6 ? "middle" : lx > c ? "start" : "end";
    const dot = m.depth === null
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.1"/>`
      : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4.2 + (m.depth ?? 0) * 1.2).toFixed(1)}" fill="#E7B66B" fill-opacity="${fill(m.depth)}" stroke="#E7B66B" stroke-width="1"/>`;
    return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#fff" stroke-opacity="${m.depth === null ? 0.35 : 0.85}" stroke-width="${m.depth === null ? 0.8 : 1.4}"/>${dot}
      <text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}" class="sg-l${m.depth === null ? " off" : ""}">${esc(short(m.name))}</text>`;
  }).join("");
  const rings = [0.36, 0.66, 1].map((k) => `<circle cx="${c}" cy="${c}" r="${(R * k).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity=".14" stroke-dasharray="${k === 1 ? "0" : "2 3"}"/>`).join("");
  return `<svg class="sig" viewBox="0 0 ${S} ${S}" role="img" aria-label="열두 영역의 관심과 깊이">${rings}${parts}</svg>`;
}

function p1(r: Report3): string {
  const asked = r.domains.filter((d) => d.askedHow !== "NONE").length;
  const goal = r.priorities[0]?.chain.goal ?? r.strategy.roleName;
  const ready = r.directions.find((d) => d.goal)?.readiness ?? "";
  const chs = chaptersOf(r);
  const parts: [string, string][] = [["A", "분석"], ["C", "직무·기업"], ["B", "실행"], ["D", "정리"]];
  const figs = [
    { n: asked, u: "개 영역", l: "판단을 자세히 물은 영역", s: "열두 영역 가운데" },
    { n: r.profile.picks, u: "개", l: "체크리스트에서 고른 항목", s: `그중 결과물 ${r.profile.artifacts}개` },
    { n: r.records.length, u: "건", l: "함께 읽은 경험 기록", s: "내 CareerMatri에 적은 것" },
    { n: r.companies.length, u: "곳", l: "깊게 본 지역 기업", s: "대전·세종·충청권" },
  ];
  return `<section class="pg cover" data-page="1">
  <div class="cv-top">
    <div class="cv-brand"><b>CareerMatri</b><span>PRO 진로·취업 분석 리포트</span></div>
    <div class="cv-main">
      <div class="cv-id">
        <p class="cv-school">${esc(r.meta.school ?? "")}</p>
        <h1 class="cv-title">${esc(r.meta.department ?? r.meta.major ?? "")}</h1>
        <p class="cv-sub">${esc(r.majorName)} 전공 기준 · 응답일 ${esc(r.meta.answeredOn ?? "—")}</p>
        <dl class="cv-goal"><div><dt>목표</dt><dd>${esc(goal)}</dd></div>${ready ? `<div><dt>목표 직무 준비 상태</dt><dd>${esc(ready)}</dd></div>` : ""}</dl>
      </div>
      <figure class="cv-sig">${signature(r)}<figcaption>열두 영역 — 선의 길이는 관심, 점의 채움은 스스로 해 본 깊이입니다. 빈 점은 이번에 자세히 묻지 않은 영역입니다. 이 학생의 응답으로 그렸습니다.</figcaption></figure>
    </div>
  </div>
  <div class="cv-low">
    <p class="cv-lead">${esc(r.summary.lead)}</p>
    <div class="figs">${figs.map((f) => `<div><span class="fg-n">${f.n}<small>${esc(f.u)}</small></span><b>${esc(f.l)}</b><span class="fg-s">${esc(f.s)}</span></div>`).join("")}</div>
    <div class="cv-toc">${parts.map(([t, name]) => { const xs = chs.filter((c) => c.type === t); return xs.length ? `<div><h4>${esc(name)}</h4><ol>${xs.map((c) => `<li><span>${c.no}</span>${esc(c.title)}</li>`).join("")}</ol></div>` : ""; }).join("")}</div>
    <p class="cv-review">검토용 미리보기 · 기업 자료(KODATA 포함)의 외부 배포 범위가 확정되기 전에는 학생에게 배포하지 않습니다 · 점수·순위·합격 가능성을 계산하지 않습니다</p>
  </div>
</section>`;
}

/* ── ② 개인 역량 분석과 방사형 그래프 ─────────────────────────────── */

const SER = ["#2A5CAA", "#B9822F", "#2F7F74", "#7A4FA0"];
function radar(r: Report3): string {
  const W = 360, H = 330, cx = 180, cy = 168, R = 112;
  const n = r.radar.axes.length;
  const ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const rad = (lv: Level) => (lv === 0 ? 0.08 : lv / 3) * R;
  const pt = (i: number, rr: number) => [cx + rr * Math.cos(ang(i)), cy + rr * Math.sin(ang(i))];
  const ring = (lv: Level) => r.radar.axes.map((_, i) => pt(i, rad(lv)).map((v) => v.toFixed(1)).join(",")).join(" ");
  const rings = ([1, 2, 3] as Level[]).map((lv) => `<polygon points="${ring(lv)}" fill="${lv === 3 ? "#F4F6FA" : "none"}" stroke="#D5DBE5" stroke-width="${lv === 3 ? 1 : 0.7}" ${lv < 3 ? 'stroke-dasharray="2 2.5"' : ""}/>`).join("");
  // 고리 이름을 그림 안에 두면 계열 선과 겹친다(v4 검토). 이름은 그림 아래 눈금 띠(`.rd-scale`)가 든다.
  const spokes = r.radar.axes.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E3E8F0"/>`; }).join("");
  const labels = r.radar.axes.map((a, i) => {
    const [x, y] = pt(i, R + 14);
    const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
    const t = JUDGE[a.axis].name, w = t.split(" ");
    const lines = t.length > 7 && w.length > 1 ? [w.slice(0, Math.ceil(w.length / 2)).join(" "), w.slice(Math.ceil(w.length / 2)).join(" ")] : [t];
    const y0 = y + 3.5 - (lines.length - 1) * 5.5 + (Math.abs(x - cx) < 8 && y < cy ? -5 : 0);
    return `<text x="${x.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="${anchor}" class="rd-l">${lines.map((l, k) => `<tspan x="${x.toFixed(1)}" dy="${k ? 11 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
  }).join("");
  const series = r.radar.series.map((s, k) => {
    const pts = s.levels.map((v, i) => (v === null ? null : pt(i, rad(v))));
    const full = pts.every(Boolean);
    return (full ? `<polygon points="${pts.map((q) => q!.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${SER[k]}" fill-opacity=".10" stroke="${SER[k]}" stroke-width="1.7" stroke-linejoin="round"/>` : "")
      + pts.map((q) => (q ? `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.1" fill="${SER[k]}" stroke="#fff" stroke-width="1"/>` : "")).join("");
  }).join("");
  return `<svg class="rd" viewBox="0 0 ${W} ${H}" role="img" aria-label="판단 단계 방사형 그래프">${rings}${spokes}${series}${labels}</svg>`;
}
/** 영역 × 판단: 칸마다 단계(눈금 셋). 묻지 않은 칸은 줄표 */
export function matrix(r: Report3): string {
  const pip = (lv: Level | null) => lv === null ? `<span class="mx-na">—</span>`
    : `<span class="pips l${lv}">${[1, 2, 3].map((k) => `<i class="${k <= lv ? "on" : ""}"></i>`).join("")}</span>`;
  return `<table class="mx"><thead><tr><th></th>${r.radar.axes.map((a) => `<th>${esc(JUDGE[a.axis].name)}</th>`).join("")}</tr></thead>
  <tbody>${r.radar.series.map((s, k) => `<tr><th><i class="sw" style="background:${SER[k]}"></i>${esc(s.name)}</th>${s.levels.map((v) => `<td>${pip(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
export function p2(r: Report3): string {
  const b = r.radar.best;
  const n3 = b.filter((x) => x.level === 3), n2 = b.filter((x) => x.level === 2), n1 = b.filter((x) => x.level !== null && x.level <= 1);
  const stat = (n: number, label: string, xs: typeof b) => `<div class="st"><span class="st-n">${n}</span><div><b>${esc(label)}</b><p>${esc(xs.map((x) => JUDGE[x.axis].name).join(" · ") || "—")}</p></div></div>`;
  return frame(r, 2, "02 개인별 역량 프로파일", `
  ${opener("02", "개인 역량 분석", "개인별 역량 프로파일", r.profile.lead)}
  <div class="p2-g">
    <figure class="p2-fig">${radar(r)}
      <ol class="rd-scale">${([1, 2, 3] as Level[]).map((lv) => `<li><i class="rs${lv}"></i>${lv === 1 ? "안쪽" : lv === 2 ? "가운데" : "바깥"} 고리 · ${esc(STEP[lv].tag)}</li>`).join("")}</ol>
      <div class="lg">${r.radar.series.map((s, k) => `<span><i class="sw" style="background:${SER[k]}"></i>${esc(s.name)}${s.deep ? "" : " · 핵심 판단만"}</span>`).join("")}</div>
      <figcaption>바깥 고리로 갈수록 그 판단을 더 깊이 해 봤다고 답한 것입니다. 점수가 아니며 다른 학생과 견준 값도 아닙니다.</figcaption></figure>
    <div class="p2-side">
      <h3 class="eyebrow">여덟 가지 판단, 가장 깊게 답한 단계</h3>
      ${stat(n3.length, "기준까지 직접 정한 판단", n3)}
      ${stat(n2.length, "스스로 맡아 해 본 판단", n2)}
      ${stat(n1.length, "아직 스스로 해 봤다고 답하지 않은 판단", n1)}
      <div class="read">${r.profile.paragraphs.slice(1, 3).map((t) => `<p>${esc(t)}</p>`).join("")}</div>
    </div>
  </div>
  <h3 class="eyebrow mx-h">영역마다 본 여덟 가지 판단 <span>눈금 하나 지시받아 수행 · 둘 직접 수행 · 셋 기준까지 직접 결정</span></h3>
  ${matrix(r)}
  <p class="src">${esc(r.profile.evidenceLine)} 단계 이름은 ‘이 보고서에서 쓰는 말’ 쪽에서 풀어 적었습니다.</p>`);
}

/* ── ③ Evidence 심층 분석 ────────────────────────────────────────── */

const COVER: Record<string, string> = { strong: "스스로 해 봄", partial: "지시받아 해 봄", none: "해 본 적 없음", unasked: "묻지 않음" };
export function p3(r: Report3, pick?: DomainRead): string {
  const d: DomainRead = pick ?? r.domains.find((x) => x.zone === "Z1_EVIDENCE_ESTABLISHED") ?? r.domains[0];
  const rec = r.records.find((x) => x.domains.includes(d.name));
  const cols: [string, string[], string][] = [
    ["직접 정한 것", d.decisions, "기준을 내가 정했다고 고른 장면"],
    ["해 본 일", d.acts, "맡아서 해 봤다고 고른 장면"],
    ["남긴 결과물", d.artifacts, "남겼다고 고른 문서·표"],
    ["비교한 대상", d.comparisons, "결과를 견준 기준"],
  ];
  const strong = d.flow.filter((f) => f.cover === "strong").length;
  return frame(r, 3, "03 영역별 심층 해설", `
  ${opener("03", "Evidence 심층 분석", d.name, d.headline)}
  <div class="p3-hd"><span class="zt">${esc(d.zoneTag)}</span><span class="meta">관심 ${d.interest === "HIGH" ? "높음" : d.interest === "MID" ? "보통" : d.interest === "LOW" ? "낮음" : "—"} · 경험 ${d.experience === "SEVERAL" ? "여러 번" : d.experience === "ONCE_OR_TWICE" ? "한두 번" : d.experience === "NONE" ? "없음" : "—"} · ${d.askedHow === "DEEP" ? "여덟 판단 모두 물음" : "핵심 판단 넷만 물음"}</span></div>
  <h3 class="eyebrow">이 영역의 일 여덟 단계 — 스스로 해 봤다고 답한 단계 ${strong} / ${d.flow.length}</h3>
  <ol class="flow">${d.flow.map((f) => `<li class="fc-${f.cover}"><em>${esc(COVER[f.cover])}</em><span class="fl-n">${f.step}</span><b>${esc(f.name)}</b><p>${esc(f.detail)}</p></li>`).join("")}</ol>
  <h3 class="eyebrow">체크리스트에서 직접 고른 근거 <span>학생이 고른 문장을 그대로 옮겼습니다</span></h3>
  <div class="ledger">${cols.map(([h, xs, s]) => `<div><span class="lg-n">${xs.length}</span><h4>${esc(h)}</h4><p class="lg-s">${esc(s)}</p>${xs.length ? `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="none">고른 항목 없음</p>`}</div>`).join("")}</div>
  <div class="p3-g">
    <div><h3 class="eyebrow">이것이 뜻하는 것</h3>${(d.meaning.length > 1 ? d.meaning.slice(1) : d.meaning).map((t) => `<p>${esc(t)}</p>`).join("")}</div>
    <div>${rec ? `<div class="rec"><h4>함께 읽은 경험 기록</h4><b>${esc(rec.title)}</b><span>${esc(rec.kind)} · ${esc(rec.period)}</span>
        <dl><div><dt>직접 정한 것</dt><dd>${esc(rec.decisions.join(" · ") || "적지 않음")}</dd></div><div><dt>남은 결과물</dt><dd>${esc(rec.artifacts.join(" · ") || "적지 않음")}</dd></div></dl></div>` : ""}
</div>
    <div><h3 class="eyebrow">여기까지 말할 수 있습니다</h3><ul class="lim">${d.limits.filter((t) => !t.startsWith("경험 기록")).slice(0, 2).map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
  </div>`);
}

/* ── ④ 실제 기업·직무 심층 분석 ──────────────────────────────────── */

function p4(r: Report3): string {
  const goal = r.strategy.roleCode;
  const c: CompanyDeep = r.companies.find((x) => x.jobs[0]?.role === goal) ?? r.companies[0];
  const jb = c.jobs[0];
  const other = c.jobs.slice(1).map((x) => x.name);
  const fit = [
    ...jb.have.map((h) => { const [n, ...rest] = h.split(" — "); return { n, s: "have", t: rest.join(" — ") }; }),
    ...jb.need.map((h) => { const [n, ...rest] = h.split(" — "); return { n, s: "need", t: rest.join(" — ") }; }),
  ];
  return frame(r, 4, "09 진로 탐색 기업 심층 분석", `
  ${opener("09", "실제 기업·직무 심층 분석", c.name, c.headline)}
  <div class="co-id"><span class="vt vt-${c.verify}">${esc(VERIFY5[c.verify].tag)}</span><span>${esc(REGION_KO[c.region])} · ${esc(c.regionBasis)}</span><span>사업자등록번호 ${esc(c.bizno ?? "미확인")}</span>${c.listing ? `<span>${esc(c.listing)}</span>` : ""}</div>
  <div class="p4-g">
    <div class="p4-l">
      <h3 class="eyebrow">사업 구조</h3>
      <ul class="facts">${c.facts.map((f) => `<li>${esc(f.text)} <span class="vt vt-${f.level}">${esc(VERIFY5[f.level].tag)}</span></li>`).join("")}</ul>
      <div class="prod"><span>주요 제품·서비스</span>${c.products.map((x) => `<b>${esc(x)}</b>`).join("")}</div>
      <p class="interp">${esc(c.interpret[0] ?? "")}</p>
    </div>
    <div class="p4-r">
      <div class="job-h"><span class="tagx">목표 직무</span><h2>${esc(jb.name)}</h2><span class="js">${esc(jb.status)}</span></div>
      <p class="small">${esc(jb.posted ?? "")}${jb.posted ? " · " : ""}이 회사에서 하는 일 — ${esc(jb.tasks)}</p>
      <ol class="jflow">${jb.flow.map((s, i) => `<li><span>${i + 1}</span>${esc(s)}</li>`).join("")}</ol>
      <h3 class="eyebrow">이 직무의 핵심 판단과 지금 응답</h3>
      <table class="fit"><tbody>${fit.map((f) => `<tr class="${f.s}"><th>${esc(f.n)}</th><td><em>${f.s === "have" ? "응답에서 확인" : "아직 확인 안 됨"}</em>${esc(f.t)}</td></tr>`).join("")}</tbody></table>
    </div>
  </div>
  <div class="strat">
    <div><h3 class="eyebrow">90일 실무형 프로젝트</h3><b class="pj">${esc(jb.project.title)}</b>
      <ol class="pj-s">${jb.project.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><p class="small">남길 것 — ${esc(jb.project.output)}</p></div>
    <div><h3 class="eyebrow">먼저 익힐 것</h3><ul>${jb.learn.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3 class="eyebrow">면접에서 받을 질문</h3><ul class="qs">${jb.interview.slice(0, 2).map((q) => `<li>“${esc(q)}”</li>`).join("")}</ul></div>
  </div>
  <p class="src">${other.length ? `같은 회사에서 함께 볼 직무(${esc(other.join(" · "))})는 본문에서 다룹니다. ` : ""}출처 ${c.sources.length}건 · 채용 여부는 확인하지 않았습니다 · 공식 원문은 직접 열람하지 못했습니다.</p>`);
}

/* ── ⑤ 개인별 취업 실행 로드맵 ──────────────────────────────────── */

export function p5(r: Report3): string {
  const role = r.strategy.roleName;
  const goalDir = r.directions.find((d) => d.goal);
  const todos = new Map(r.priorities.map((x) => [x.todo, x]));
  const periods = ["30일", "60일", "90일", "6개월", "12개월"];
  const lane = (w: string) => todos.has(w) || w.startsWith("실무형 프로젝트") ? 0 : /경험 기록|자기소개서|포트폴리오|검사를 다시/.test(w) ? 1 : 2;
  const lanes = ["직무 실행 과제", "기록과 서류", "기업·직무 확인"];
  /* 칸에는 짧은 이름(`label`)만 쓴다. 긴 설명은 본문 ‘단계별 실행 계획’ 표에 있다 */
  const card = (p: Report3["plan"][number]) => {
    const pr = todos.get(p.what);
    return `<div class="cd${pr ? " mine" : ""}">${pr ? `<span class="cd-n">${pr.order}</span>` : ""}<b>${esc(p.label)}</b><span>${esc(p.output)}</span></div>`;
  };
  return frame(r, 5, "11 단계별 실행 계획", `
  ${opener("11", "개인별 취업 실행 로드맵", `${role}을 향한 실행 로드맵`, `과제는 모두 ${role}의 업무 영역과 핵심 판단에서 골랐습니다. 첫 과제는 30일, 둘째는 60일에 놓이고 90일에는 ${role}의 일을 겨냥한 프로젝트를 끝냅니다.`)}
  <div class="chainv">
    <div class="goalc"><span>목표</span><b>${esc(r.priorities[0]?.chain.goal ?? role)}</b>${goalDir ? `<em>준비 상태 · ${esc(goalDir.readiness)}</em>` : ""}</div>
    <ol>${r.priorities.slice(0, 3).map((x) => `<li><span class="rel">${esc(x.relationTag)}</span><b>${x.order}. ${esc(x.title)}</b><p>${esc(x.link)}</p><em>${esc(x.when)} · 남길 것 ${esc(x.output)}</em></li>`).join("")}</ol>
  </div>
  <div class="tl">
    <div class="tl-h"><span></span>${periods.map((p) => `<b>${esc(p)}</b>`).join("")}</div>
    ${lanes.map((ln, li) => `<div class="tl-r"><span class="tl-l">${esc(ln)}</span>${periods.map((pd) => `<div class="tl-c">${r.plan.filter((p) => p.period === pd && lane(p.what) === li).map(card).join("")}</div>`).join("")}</div>`).join("")}
  </div>
  <h3 class="eyebrow">지금 바로 할 행동 <span>실행 전략의 첫 줄 · 경험 기록 · 기업 확인 · 프로젝트</span></h3>
  <ol class="now">${r.final.map((x, i) => `<li><span>${i + 1}</span><div><b>${esc(x.label)}</b><em>${esc(x.when)}</em></div></li>`).join("")}</ol>`);
}

/* ── 조립 ──────────────────────────────────────────────────────── */

export function sample4(r: Report3, f: Fonts): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri PRO 리포트 · v4 대표 5쪽</title>
<style>${faces(f)}${CSS.replace(/__FONT__/g, f.family)}</style></head><body>${[p1(r), p2(r), p3(r), p4(r), p5(r)].join("\n")}</body></html>`;
}
export function faces(f: Fonts): string {
  if (f.family === "Pretendard") return [[400, "Regular"], [500, "Medium"], [600, "SemiBold"], [700, "Bold"], [800, "ExtraBold"]].map(([w, n]) =>
    `@font-face{font-family:"Pretendard";font-weight:${w};src:url("${f.href}/Pretendard-${n}.woff2") format("woff2"),url("${f.href}/Pretendard-${n}.otf") format("opentype")}`).join("");
  return [[300, "Light"], [400, ""], [500, ""], [600, "Bold"], [700, "Bold"], [800, "ExtraBold"]].map(([w, n]) =>
    `@font-face{font-family:"NanumGothic";font-weight:${w};src:url("${f.href}/NanumGothic${n}.ttf") format("truetype")}`).join("");
}

export const CSS = `
:root{--navy:#13294B;--ink:#1E2430;--muted:#5E6675;--rule:#D5DBE5;--tint:#F4F6FA;--blue:#2A5CAA;--sky:#DCE6F5;--amber:#B9822F;--amber-t:#F7EEDF;--teal:#2F7F74}
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:"__FONT__",sans-serif;color:var(--ink);font-size:10pt;line-height:1.62;word-break:keep-all;overflow-wrap:break-word;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,h4{margin:0;color:var(--navy);font-weight:700}
p{margin:0 0 5pt}
ul,ol{margin:0;padding:0;list-style:none}
.pg{width:210mm;height:297mm;position:relative;break-after:page;overflow:hidden;padding:0 17mm}
.rh{position:absolute;top:9mm;left:17mm;right:17mm;display:flex;justify-content:space-between;font-size:7.8pt;color:var(--muted);border-bottom:.5pt solid var(--rule);padding-bottom:2mm}
.rf{position:absolute;bottom:9mm;left:17mm;right:17mm;display:flex;justify-content:space-between;font-size:7.8pt;color:var(--muted)}
.rf b{color:var(--navy);font-weight:700}.rv{color:#9A6A22}
.bd{position:absolute;top:19mm;bottom:17mm;left:17mm;right:17mm}
.op{border-bottom:1.6pt solid var(--navy);padding-bottom:4mm;margin-bottom:5mm}
.kick{display:flex;gap:8pt;align-items:baseline;font-size:8.4pt;letter-spacing:.6pt;color:var(--blue);font-weight:700}
.kick .no{color:var(--navy);border:1pt solid var(--navy);border-radius:2pt;padding:0 4pt;letter-spacing:0}
.op h1{font-size:23pt;line-height:1.25;margin:2.5mm 0 2mm;font-weight:800;letter-spacing:-.3pt}
.dek{font-size:12pt;line-height:1.6;color:var(--navy);max-width:172mm;margin:0}
.eyebrow{font-size:9pt;font-weight:700;color:var(--navy);letter-spacing:.2pt;margin:0 0 2.5mm;padding-top:1mm;border-top:.6pt solid var(--navy);display:flex;justify-content:space-between;gap:8pt}
.eyebrow span{font-weight:400;color:var(--muted);font-size:8pt;letter-spacing:0}
.src{font-size:8pt;color:var(--muted);line-height:1.5;margin-top:3mm}
.small{font-size:9pt;line-height:1.55;color:var(--muted)}
.sw{display:inline-block;width:8pt;height:8pt;border-radius:1.5pt;margin-right:4pt;vertical-align:-.5pt}
/* ① 표지 */
.cover{padding:0}
.cv-top{background:var(--navy);color:#fff;height:160mm;padding:14mm 17mm 0;position:relative}
.cv-brand{display:flex;justify-content:space-between;align-items:baseline;border-bottom:.6pt solid rgba(255,255,255,.35);padding-bottom:3mm;font-size:9pt;color:rgba(255,255,255,.75)}
.cv-brand b{font-size:13pt;color:#fff;letter-spacing:.3pt;font-weight:800}
.cv-main{display:grid;grid-template-columns:1fr 86mm;gap:6mm;margin-top:12mm}
.cv-school{font-size:11pt;color:#BFD0EA;margin:0}
.cv-title{font-size:38pt;line-height:1.15;color:#fff;font-weight:800;margin:2mm 0 2mm;letter-spacing:-.5pt}
.cv-sub{font-size:10pt;color:#BFD0EA}
.cv-goal{margin:10mm 0 0;border-top:.6pt solid rgba(255,255,255,.35)}
.cv-goal div{padding:2.6mm 0;border-bottom:.6pt solid rgba(255,255,255,.2)}
.cv-goal dt{font-size:8pt;color:#BFD0EA;letter-spacing:.4pt}.cv-goal dd{margin:0;font-size:12.5pt;font-weight:700;color:#fff}
.cv-sig{margin:0}.sig{width:86mm;height:auto;display:block}
.sg-l{font-size:8.2px;fill:#fff;fill-opacity:.85}.sg-l.off{fill-opacity:.45}
.cv-sig figcaption{font-size:7.8pt;color:#BFD0EA;line-height:1.5;margin-top:1mm}
.cv-low{padding:9mm 17mm 0}
.cv-lead{font-size:14pt;line-height:1.62;color:var(--navy);font-weight:400;border-left:3pt solid var(--amber);padding-left:5mm;margin:0 0 7mm}
.figs{display:grid;grid-template-columns:repeat(4,1fr);border-top:1.4pt solid var(--navy);border-bottom:.6pt solid var(--rule)}
.figs div{padding:3mm 3mm 3mm 0;border-right:.6pt solid var(--rule);margin-right:3mm}.figs div:last-child{border-right:0}
.fg-n{display:block;font-size:26pt;line-height:1.1;font-weight:800;color:var(--navy)}.fg-n small{font-size:10pt;font-weight:700;margin-left:2pt}
.figs b{display:block;font-size:9pt;color:var(--ink);margin-top:1mm}.fg-s{display:block;font-size:8pt;color:var(--muted)}
.cv-toc{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:5mm}
.cv-toc h4{font-size:8.6pt;color:var(--blue);letter-spacing:.4pt;margin-bottom:1.5mm}
.cv-toc li{font-size:8.2pt;line-height:1.45;color:var(--ink);display:grid;grid-template-columns:13pt 1fr;margin-bottom:1mm}.cv-toc li span{color:var(--muted)}
.cv-review{position:absolute;left:17mm;right:17mm;bottom:10mm;font-size:8pt;color:#7A5418;background:var(--amber-t);padding:2.2mm 3mm;border-radius:2pt;margin:0}
/* ② 역량 */
.p2-g{display:grid;grid-template-columns:100mm 1fr;gap:7mm}
.p2-fig{margin:0}.rd{width:100mm;height:auto;display:block}
.rd-l{font-size:9.6px;fill:var(--navy);font-weight:700}
.rd-scale{display:flex;gap:3mm;font-size:8pt;color:var(--muted);margin:1mm 0 1.5mm;flex-wrap:wrap}.rd-scale li{display:flex;align-items:center;gap:1.4mm}
.rd-scale i{width:5mm;height:0;border-top:1pt dashed #AEB7C6;display:inline-block}.rd-scale i.rs3{border-top:1.2pt solid #AEB7C6}
.lg{display:flex;flex-wrap:wrap;gap:3pt 10pt;font-size:8.6pt;margin-top:1mm}
.p2-fig figcaption{font-size:8pt;color:var(--muted);line-height:1.5;margin-top:1.5mm}
.st{display:grid;grid-template-columns:15mm 1fr;align-items:start;padding:2.4mm 0;border-bottom:.6pt solid var(--rule)}
.st-n{font-size:25pt;line-height:1;font-weight:800;color:var(--navy)}
.st b{font-size:9.6pt;display:block}.st p{font-size:9pt;color:var(--muted);margin:.5mm 0 0;line-height:1.5}
.read{margin-top:3mm}.read p{font-size:9.6pt;line-height:1.62}
.mx-h{margin-top:5mm}
.mx{width:100%;border-collapse:collapse;font-size:8.4pt}
.mx thead th{font-weight:700;color:var(--navy);text-align:center;padding:0 1mm 2mm;vertical-align:bottom;line-height:1.3;border-bottom:1pt solid var(--navy)}
.mx tbody th{text-align:left;font-weight:700;color:var(--navy);padding:2.6mm 0;white-space:nowrap;font-size:9pt}
.mx td{text-align:center;border-bottom:.6pt solid var(--rule)}.mx tbody tr:last-child td,.mx tbody tr:last-child th{border-bottom:1pt solid var(--navy)}
.mx tbody th{border-bottom:.6pt solid var(--rule)}
.pips{display:inline-flex;gap:2px}.pips i{width:9px;height:9px;border-radius:2px;background:#E6EAF1}.pips i.on{background:var(--blue)}.pips.l3 i.on{background:var(--navy)}
.mx-na{color:#B0B7C3}
/* ③ Evidence */
.p3-hd{display:flex;gap:8pt;align-items:center;margin:-2mm 0 2.4mm}
.zt{font-size:8.4pt;font-weight:700;background:var(--navy);color:#fff;border-radius:10pt;padding:.5pt 7pt}.meta{font-size:8.8pt;color:var(--muted)}
.pull{margin:0 0 5mm;font-size:13pt;line-height:1.6;color:var(--navy);font-weight:700;padding:0 0 0 5mm;border-left:3pt solid var(--amber)}
.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:1.6mm;margin-bottom:3.4mm}
.flow li{border-top:2.4pt solid var(--blue);background:var(--tint);padding:1.4mm 1.6mm 1.5mm;position:relative}
.flow li.fc-partial{border-top-color:#9DB5DC;background:#fff;border:.6pt solid var(--rule);border-top:2.4pt solid #9DB5DC}
.flow li.fc-none,.flow li.fc-unasked{border-top-color:#C9CFD9;background:#fff;border:.6pt dashed var(--rule);border-top:2.4pt solid #C9CFD9}
.fl-n{font-size:8pt;font-weight:800;color:var(--blue)}.flow b{display:block;font-size:8.8pt;line-height:1.35;color:var(--navy);margin:.4mm 0 .8mm}
.flow p{font-size:8.3pt;line-height:1.45;color:var(--ink);margin:0}.flow em{display:block;font-style:normal;font-size:7.6pt;font-weight:700;color:var(--blue);margin-bottom:.6mm;white-space:nowrap}
.flow li.fc-partial em{color:#5D86C4}
.ledger{display:grid;grid-template-columns:1.25fr 1.25fr .8fr .7fr;gap:0;border-top:1.4pt solid var(--navy);border-bottom:.6pt solid var(--rule);margin-bottom:3.4mm}
.ledger>div{padding:2.4mm 3mm 3mm 0;margin-right:3mm;border-right:.6pt solid var(--rule)}.ledger>div:last-child{border-right:0;margin-right:0}
.lg-n{font-size:22pt;font-weight:800;color:var(--navy);line-height:1.1}.ledger h4{font-size:9.6pt}.lg-s{font-size:7.8pt;color:var(--muted);margin:0 0 1.5mm}
.ledger li{font-size:8.8pt;line-height:1.46;padding:.9mm 0;border-top:.5pt dotted var(--rule)}.none{font-size:8.6pt;color:#9AA2B0}
.p3-g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm}.p3-g p{font-size:9.6pt}
.rec{background:var(--tint);border-radius:2pt;padding:2.4mm 3.2mm;margin-bottom:3mm}.rec h4{font-size:8pt;color:var(--blue);letter-spacing:.3pt}.rec b{display:block;font-size:9.6pt;color:var(--navy);line-height:1.4;margin-top:.6mm}
.rec>span{font-size:8pt;color:var(--muted)}.rec dl{margin:1.5mm 0 0}.rec dl div{display:grid;grid-template-columns:20mm 1fr;font-size:8.6pt;padding:.8mm 0;border-top:.5pt dotted #C9D2E0}.rec dt{color:var(--muted)}.rec dd{margin:0}
.lim li{font-size:8.8pt;line-height:1.5;color:var(--ink);padding:1.4mm 0 1.4mm 3.2mm;border-top:.5pt solid var(--rule);position:relative}.lim li:before{content:"";position:absolute;left:0;top:3.2mm;width:1.4mm;height:1.4mm;background:var(--amber);border-radius:50%}
/* ④ 기업 */
.co-id{display:flex;flex-wrap:wrap;gap:2pt 10pt;align-items:center;font-size:8.4pt;color:var(--muted);margin:-2mm 0 4mm}
.vt{display:inline-block;font-size:7.6pt;font-weight:700;padding:0 4pt;border-radius:2pt;line-height:1.6;white-space:nowrap;vertical-align:1pt}
.vt-OFFICIAL_DIRECT{background:#DFF2E6;color:#1D6B3B}.vt-THIRD_PARTY{background:#E3ECF8;color:#163E7A}.vt-SEARCH_ONLY{background:#EEF0F4;color:#3D4757}.vt-CONFLICTING{background:#FDE6E1;color:#8A2F1D}.vt-UNVERIFIED{background:#F3F3F3;color:#666}
.p4-g{display:grid;grid-template-columns:1fr 1.08fr;gap:7mm}
.facts li{font-size:9.2pt;line-height:1.55;padding:1.6mm 0;border-top:.5pt solid var(--rule)}
.prod{margin:2mm 0;display:flex;flex-wrap:wrap;gap:1.5mm;align-items:center}.prod span{font-size:8pt;color:var(--muted);width:100%}.prod b{font-size:8.6pt;background:var(--tint);border:.6pt solid var(--rule);border-radius:2pt;padding:.6mm 2mm;color:var(--navy)}
.interp{font-size:9.4pt;line-height:1.6;border-left:2.4pt solid var(--blue);padding-left:3mm;color:var(--navy)}
.job-h{display:flex;align-items:center;gap:6pt;flex-wrap:wrap}.job-h h2{font-size:15pt}.tagx{font-size:7.8pt;font-weight:700;background:var(--navy);color:#fff;border-radius:2pt;padding:0 4pt}.js{font-size:7.8pt;background:var(--sky);color:var(--navy);border-radius:2pt;padding:0 4pt;font-weight:700}
.jflow{counter-reset:none;margin:2mm 0 3.5mm;display:grid;grid-template-columns:1fr;gap:1mm}
.jflow li{display:grid;grid-template-columns:5mm 1fr;align-items:baseline;background:var(--tint);border-left:2.4pt solid var(--blue);padding:1.4mm 2.4mm;font-size:9pt;line-height:1.45}.jflow li span{font-weight:800;color:var(--blue);font-size:8.4pt}
.fit{width:100%;border-collapse:collapse}.fit th{text-align:left;font-size:9pt;color:var(--navy);width:30mm;padding:2mm 2mm 2mm 0;vertical-align:top;border-top:.6pt solid var(--rule)}
.fit td{font-size:8.8pt;line-height:1.5;padding:2mm 0;border-top:.6pt solid var(--rule)}.fit em{display:block;font-style:normal;font-weight:700;font-size:7.8pt;color:var(--blue)}.fit tr.need em{color:#9A6A22}
.strat{display:grid;grid-template-columns:1.25fr 1fr;gap:7mm;margin-top:5mm;padding-top:3mm;border-top:1.4pt solid var(--navy)}
.pj{display:block;font-size:10.4pt;color:var(--navy);line-height:1.45;margin-bottom:1.5mm}
.pj-s{counter-reset:s}.pj-s li{counter-increment:s;font-size:9pt;line-height:1.5;padding:.9mm 0 .9mm 6mm;position:relative}.pj-s li:before{content:counter(s);position:absolute;left:0;top:1.1mm;width:4mm;height:4mm;border-radius:50%;background:var(--navy);color:#fff;font-size:7pt;text-align:center;line-height:4mm;font-weight:700}
.strat ul li{font-size:9pt;line-height:1.5;padding:.8mm 0 .8mm 3mm;position:relative}.strat ul li:before{content:"";position:absolute;left:0;top:2.6mm;width:1.2mm;height:1.2mm;background:var(--blue);border-radius:50%}
.strat .eyebrow{border-top:0;padding-top:0}.strat ul+.eyebrow{margin-top:3mm}.qs li{color:var(--navy);font-weight:700}
/* ⑤ 로드맵 */
.chainv{display:grid;grid-template-columns:44mm 1fr;gap:0;margin-bottom:5mm;border-top:1.4pt solid var(--navy)}
.goalc{background:var(--navy);color:#fff;padding:3mm 3.5mm}.goalc span{font-size:8pt;color:#BFD0EA;letter-spacing:.4pt}.chainv .goalc b{display:block;font-size:12pt;line-height:1.4;margin:1mm 0;color:#fff}.goalc em{font-style:normal;font-size:8.4pt;color:#E7B66B}
.chainv ol{display:grid;grid-template-columns:repeat(3,1fr)}
.chainv li{padding:2.4mm 3mm;border-right:.6pt solid var(--rule);border-bottom:.6pt solid var(--rule);position:relative}.chainv li:last-child{border-right:0}
.chainv li:before{content:"";position:absolute;left:-1.6mm;top:5mm;border:1.6mm solid transparent;border-left-color:var(--navy);border-right:0}
.chainv .goalc em{color:#E7B66B}.chainv .rel{font-size:7.6pt;font-weight:700;color:var(--blue)}.chainv b{display:block;font-size:9.6pt;line-height:1.4;color:var(--navy);margin:.6mm 0}
.chainv p{font-size:8.4pt;line-height:1.45;color:var(--ink);margin:0 0 1mm}.chainv em{display:block;font-style:normal;font-size:7.8pt;line-height:1.45;color:var(--muted)}
.tl{border-top:1.4pt solid var(--navy);margin-bottom:5mm}
.tl-h,.tl-r{display:grid;grid-template-columns:22mm repeat(5,1fr);gap:1.6mm}
.tl-h b{font-size:9pt;color:var(--navy);padding:1.6mm 0;border-bottom:.6pt solid var(--rule)}
.tl-r{border-bottom:.6pt solid var(--rule);padding:1.6mm 0}.tl-l{font-size:8.4pt;font-weight:700;color:var(--blue);padding-top:1mm}
.tl-c{display:flex;flex-direction:column;gap:1.4mm}
.cd{background:var(--tint);border-radius:2pt;padding:1.6mm 2mm;position:relative}.cd b{display:block;font-size:8.4pt;line-height:1.42;color:var(--ink);font-weight:700}.cd span{display:block;font-size:7.8pt;color:var(--muted);line-height:1.4;margin-top:.6mm}
.cd.mine{background:#fff;border:.8pt solid var(--navy)}.cd-n{position:absolute;top:-1.6mm;right:-1mm;width:4.4mm;height:4.4mm;border-radius:50%;background:var(--amber);color:#fff;font-size:7.4pt;font-weight:800;text-align:center;line-height:4.4mm}
.cd.mine b{color:var(--navy)}
.now{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.now li{display:grid;grid-template-columns:7mm 1fr;gap:1.5mm;padding:1.6mm 0;border-top:.6pt solid var(--rule)}.now li>span{width:6mm;height:6mm;border-radius:50%;background:var(--amber);color:#fff;font-weight:800;text-align:center;line-height:6mm;font-size:8.6pt}
.now b{display:block;font-size:8.8pt;line-height:1.45;color:var(--navy)}.now em{font-style:normal;font-size:8.2pt;color:var(--muted)}
`;
