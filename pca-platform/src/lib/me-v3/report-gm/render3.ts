/**
 * **PDF GOLD MASTER 3차 · 출력 템플릿.** 분석 리포트형 편집 구조다.
 *
 * - **쪽의 종류가 넷이다**(규격 추가 지시 §1): A 분석 · B 실행 계획 · C 기업·직무
 *   심층 · D 정리. 장마다 종류가 정해져 있고 같은 모양을 되풀이하지 않는다.
 * - **장 머리**: 장 번호와 제목, 그 장의 핵심 메시지(학생 응답에서 만든 한두 문장),
 *   그 장이 다루는 경영 일의 장면 그림. 장은 새 쪽에서 시작한다.
 * - **본문 활자**: 본문 10.4pt · 줄 1.7. 가장 작은 글자(출처)는 8.4pt. 핵심 문장은 13pt.
 * - **확인 상태는 글자로 적는다**: 확인된 사실 · 분석적 해석 · 추가 확인 필요 · 기업
 *   자료의 검증 다섯 단계. 색은 거드는 자리다.
 * - 쪽 머리말·꼬리말·쪽 번호는 뽑는 쪽이 따로 얹는다(`overlay3`).
 */
import type { Report3, CompanyDeep, Story } from "./report3";
import type { DomainRead, Direction3, Growth } from "./analysis3";
import { CROSS_TAG } from "./analysis3";
import { REGION_KO, JOB_STATUS_KO } from "./companies";
import { JUDGE, STEP, VERIFY5, ZONE_SAID } from "./words";
import { bandArt, coverArt, interestPlot, regionBars, timelineSvg } from "./visuals";
import type { Level } from "./profile";
import { roleGuide } from "./guide";
import { withJosa } from "../result/josa";

const hostOf = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u.slice(0, 40); } };
const COVER_KO: Record<string, string> = { strong: "스스로 해 봄", partial: "지시받아 해 봄", none: "해 본 적 없음", unasked: "이번에 묻지 않음" };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const p = (t: string, cls = "") => t ? `<p${cls ? ` class="${cls}"` : ""}>${esc(t)}</p>` : "";
const ul = (xs: string[], cls = "ul") => xs.filter(Boolean).length ? `<ul class="${cls}">${xs.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
const tag = (t: string, k: "fact" | "read" | "need" | "lv") => `<span class="tg tg-${k}">${esc(t)}</span>`;
const lvTag = (lv: keyof typeof VERIFY5) => `<span class="vt vt-${lv}">${esc(VERIFY5[lv].tag)}</span>`;

export type Chapter = { no: string; title: string; type: "A" | "B" | "C" | "D"; band: Parameters<typeof bandArt>[0] };
export function chaptersOf(r: Report3): Chapter[] {
  const L: Omit<Chapter, "no">[] = [
    { title: "종합 분석 의견", type: "A", band: "summary" },
    { title: "개인별 역량 프로파일", type: "A", band: "profile" },
    { title: "영역별 심층 해설", type: "A", band: "domain" },
    { title: r.verify ? "검사 응답과 경험 기록의 대조" : "경험 기록과 검사 응답의 교차 분석", type: "A", band: r.verify ? "verify" : "record" },
    r.strengths.length ? { title: "강점 활용 전략", type: "B", band: "apply" } : { title: "성장 설계 — 첫 경험에서 첫 포트폴리오까지", type: "B", band: "growth" },
    { title: "역량 개발 우선순위", type: "B", band: "growth" },
    { title: "직무별 실제 업무와 요구 역량", type: "C", band: "job" },
    { title: "대전·세종·충청권 산업 환경과 직무 연관 기업", type: "A", band: "region" },
    { title: "진로 탐색 기업 심층 분석", type: "C", band: "company" },
    { title: "자기소개서·포트폴리오·면접 전략", type: "B", band: "apply" },
    { title: "단계별 실행 계획", type: "B", band: "plan" },
    { title: "정리 워크시트", type: "D", band: "sheet" },
    { title: "분석 근거·출처·한계", type: "D", band: "source" },
  ];
  if (r.strengths.length && r.growth && r.kind !== "EVIDENCE") L.splice(5, 0, { title: "성장 설계 — 첫 경험에서 첫 포트폴리오까지", type: "B", band: "growth" });
  return L.map((c, i) => ({ ...c, no: String(i + 1).padStart(2, "0") }));
}

function chapter(c: Chapter, key: string, body: string): string {
  return `<section class="ch t${c.type}" data-ch="${c.no}">
  <header class="ch-h">
    <div class="ch-t"><span class="ch-no">${c.no}</span><h1>${esc(c.title)}</h1>${key ? `<p class="ch-key">${esc(key)}</p>` : ""}</div>
    <div class="ch-art">${bandArt(c.band)}</div>
  </header>
  ${body}
</section>`;
}

/* ── 표지 · 읽는 법 ───────────────────────────────────────────── */

function cover(r: Report3, chs: Chapter[], pages: Record<string, number>): string {
  const m = r.meta;
  return `<section class="cover">
  <div class="cv-top"><span class="cv-brand">CareerMatri</span><span class="cv-kind">PRO 진로·취업 분석 리포트</span></div>
  <div class="cv-art">${coverArt()}</div>
  <p class="cv-school">${esc(m.school ?? "")}</p>
  <h1 class="cv-title">${esc(m.department ?? m.major ?? "")}</h1>
  <p class="cv-sub">${esc(r.majorName)} 전공 기준 · 응답일 ${esc(m.answeredOn ?? "—")}</p>
  <p class="cv-lead">${esc(r.summary.lead)}</p>
  <p class="cv-review">검토용 미리보기 · 기업 자료(KODATA 포함)의 외부 배포 범위가 확정되기 전에는 학생에게 배포하지 않습니다</p>
</section>
<section class="toc-pg">
  <h2 class="toc-h">차례</h2>
  <ol class="toc">${chs.map((c) => `<li><span class="t-no">${c.no}</span><span class="t-t">${esc(c.title)}</span><span class="t-k">${{ A: "분석", B: "실행", C: "직무·기업", D: "정리" }[c.type]}</span><span class="t-p">${pages[c.no] ?? ""}</span></li>`).join("")}</ol>
  <h2 class="toc-h">이 보고서를 읽는 법</h2>
  <div class="howto">
    <div><h4>무엇으로 만들었나</h4><p>CareerMatri 검사에서 답한 내용, 체크리스트에서 직접 고른 근거 항목, 내 CareerMatri에 적어 둔 경험 기록을 정해 둔 규칙으로 읽었습니다. 상담자가 직접 만나 확인한 내용은 없습니다.</p></div>
    <div><h4>무엇을 하지 않나</h4><p>점수·순위·직무 적합도·합격 가능성을 계산하지 않습니다. 성과 수치와 기간은 만들지 않고, 학생이 직접 적는 칸으로 남깁니다. 기업 정보는 직업정보 제공이며 취업 알선이 아닙니다.</p></div>
    <div><h4>글자 표시</h4><p>${tag("확인된 사실", "fact")} 응답·기록·출처에 있는 내용 ${tag("분석적 해석", "read")} 이 보고서가 덧붙인 해석 ${tag("추가 확인 필요", "need")} 아직 확인하지 않은 내용</p></div>
  </div>
</section>
<section class="gl-pg">
  <h2 class="toc-h">이 보고서에서 쓰는 말</h2>
  <p class="gl-lead">CareerMatri는 경영 일을 여덟 가지 판단으로 나눠 묻습니다. 아래 이름이 보고서 전체에서 같은 뜻으로 쓰입니다.</p>
  <table class="tb gl"><thead><tr><th>판단</th><th>뜻</th><th>경영 일에서 보이는 모습</th></tr></thead><tbody>
  ${(Object.keys(JUDGE) as (keyof typeof JUDGE)[]).map((a) => `<tr><td><b>${esc(JUDGE[a].name)}</b></td><td>${esc(JUDGE[a].plain)}</td><td>${esc(JUDGE[a].scene)}</td></tr>`).join("")}
  </tbody></table>
  <div class="gl2">
    <div><h4>판단마다 네 단계</h4><ol class="steps">${([0, 1, 2, 3] as Level[]).map((l) => `<li><b>${esc(STEP[l].tag)}</b> — ${esc(STEP[l].said)}</li>`).join("")}</ol>
    <p class="small">‘기준까지 직접 결정’은 응답만으로 서지 않습니다. 그 판단을 받치는 체크리스트 근거 항목을 둘 이상 골랐을 때만 그 단계로 적습니다.</p></div>
    <div><h4>영역의 상태</h4><ul class="ul tight">${Object.values(ZONE_SAID).map((z) => `<li><b>${esc(z.tag)}</b> — ${esc(z.said)}</li>`).join("")}</ul></div>
  </div>
</section>`;
}

/* ── 01 종합 ──────────────────────────────────────────────────── */

function c01(r: Report3, c: Chapter): string {
  const pts = r.summary.points.map((x, i) => `<article class="pt">
    <div class="pt-n">${i + 1}</div>
    <div><h3>${esc(x.label)}</h3>
      <dl class="fmla"><div><dt>${tag("확인된 사실", "fact")}</dt><dd>${esc(x.fact)}</dd></div>
      <div><dt>${tag("의미", "read")}</dt><dd>${esc(x.meaning)}</dd></div>
      <div><dt>${tag("해석의 한계", "need")}</dt><dd>${esc(x.limit)}</dd></div>
      <div class="act"><dt>할 일</dt><dd>${esc(x.action)}</dd></div></dl></div></article>`).join("");
  return chapter(c, r.summary.lead, `
  <div class="glance">${r.summary.glance.map((g) => `<div><span>${esc(g.label)}</span><b>${esc(g.value)}</b></div>`).join("")}</div>
  <h2>핵심 분석 ${r.summary.points.length}가지</h2>
  ${pts}
  <div class="two bridge">
    <div><h2>앞으로 12개월 한눈에</h2><ol class="mini">${r.plan.map((x) => `<li><b>${esc(x.period)}</b><span>${esc(x.what)}</span></li>`).join("")}</ol></div>
    <div><h2>깊게 본 진로 탐색 기업</h2><ul class="mini">${r.companies.map((x) => `<li><b>${esc(x.name)}</b><span>${esc(x.headline)} — ${esc(x.jobs.map((jb) => jb.name).join(" · "))}</span></li>`).join("")}</ul>${r.companies.length ? "" : p("이어지는 지역 기업이 없습니다.", "small")}</div>
  </div>
`);
}

/* ── 02 프로파일 ──────────────────────────────────────────────── */

function radarSvg(r: Report3): string {
  const W = 400, H = 330, cx = 200, cy = 166, R = 112;
  const n = r.radar.axes.length;
  const ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const rad = (lv: Level) => (lv === 0 ? 0.1 : lv / 3) * R;
  const pt = (i: number, rr: number) => [cx + rr * Math.cos(ang(i)), cy + rr * Math.sin(ang(i))];
  const rings = [1, 2, 3].map((lv) => `<polygon points="${r.radar.axes.map((_, i) => pt(i, rad(lv as Level)).map((v) => v.toFixed(1)).join(",")).join(" ")}" class="rg"/>`).join("");
  const spokes = r.radar.axes.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="sp"/>`; }).join("");
  const labels = r.radar.axes.map((a, i) => {
    const [x, y] = pt(i, R + 16);
    const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
    const t = JUDGE[a.axis].name;
    const words = t.split(" ");
    const lines = t.length > 7 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [t];
    const y0 = y + 3 - (lines.length - 1) * 5.5 + (Math.abs(x - cx) < 8 && y < cy ? -4 : 0);
    return `<text x="${x.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="${anchor}" class="al">${lines.map((l, k) => `<tspan x="${x.toFixed(1)}" dy="${k ? 11.5 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
  }).join("");
  const S = ["s0", "s1", "s2", "s3"];
  const series = r.radar.series.map((s, k) => {
    const full = s.levels.every((v) => v !== null);
    const pts = s.levels.map((v, i) => (v === null ? null : pt(i, rad(v))));
    return (full ? `<polygon points="${pts.map((q) => q!.map((v) => v.toFixed(1)).join(",")).join(" ")}" class="py ${S[k]}"/>` : "")
      + pts.map((q) => q ? `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.2" class="dt ${S[k]}"/>` : "").join("");
  }).join("");
  return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="판단 단계 그림">${rings}${spokes}${series}${labels}</svg>`;
}

function c02(r: Report3, c: Chapter): string {
  const S = ["s0", "s1", "s2", "s3"];
  const best = r.radar.best;
  const rows = best.map((b) => `<tr><td><b>${esc(JUDGE[b.axis].name)}</b></td><td>${b.level === null ? "이번에 묻지 않음" : esc(STEP[b.level as Level].tag)}</td><td>${esc(b.where.join(" · ") || "—")}</td><td class="small">${esc(JUDGE[b.axis].plain)}</td></tr>`).join("");
  return chapter(c, r.profile.lead, `
  <div class="fig2">
    <div class="fig2-g">${radarSvg(r)}
      <div class="lg">${r.radar.series.map((s, k) => `<span class="lg-i"><i class="sw ${S[k]}"></i>${esc(s.name)}${s.deep ? "" : " · 핵심 판단만 물음"}</span>`).join("")}</div>
      <p class="cap">바깥으로 갈수록 그 판단을 더 깊이 해 봤다고 답한 것입니다(지시받아 수행 → 직접 수행 → 기준까지 직접 결정). 점수가 아니며, 다른 학생과 비교한 값도 아닙니다.</p></div>
    <div class="fig2-t">${tag("분석적 해석", "read")}
      ${r.profile.paragraphs.map((t) => p(t)).join("")}
      ${p(r.profile.evidenceLine, "small muted")}</div>
  </div>
  ${r.profile.caution ? `<div class="box-need">${tag("응답을 읽을 때 주의할 점", "need")}${p(r.profile.caution)}</div>` : ""}
  <h2>관심과 해 본 경험 — 열두 영역</h2>
  ${interestPlot(r.map.map((x) => ({ name: x.name, interest: x.interest, depth: x.depth })))}
  <h2>여덟 가지 판단 한눈에 보기</h2>
  <table class="tb jt"><thead><tr><th>판단</th><th>가장 깊게 답한 단계</th><th>그 단계로 답한 영역</th><th>뜻</th></tr></thead><tbody>${rows}</tbody></table>`);
}

/* ── 03 영역 ──────────────────────────────────────────────────── */

function dm(d: DomainRead, first: boolean): string {
  const four = [
    ["직접 정한 것", d.decisions], ["해 본 일", d.acts], ["남긴 결과물", d.artifacts], ["결과를 비교한 대상", d.comparisons],
  ] as const;
  const hasPicks = four.some(([, xs]) => xs.length);
  return `<article class="dm${first ? " first" : ""}">
  <header class="dm-h"><h2>${esc(d.name)}</h2><span class="zt zt-${d.zone.slice(0, 2)}">${esc(d.zoneTag)}</span>
    <span class="dm-meta">관심 ${d.interest === "HIGH" ? "높음" : d.interest === "LOW" ? "낮음" : d.interest === "MID" ? "보통" : "—"} · 경험 ${d.experience === "SEVERAL" ? "여러 번" : d.experience === "ONCE_OR_TWICE" ? "한두 번" : d.experience === "NONE" ? "없음" : "—"} · ${d.askedHow === "DEEP" ? "여덟 판단 모두 질문" : d.askedHow === "PROBE" ? "핵심 판단 넷만 질문" : "판단 문항 묻지 않음"}</span></header>
  <p class="dm-key">${esc(d.headline)}</p>
  ${d.askedHow !== "NONE" ? `<h4 class="sub">이 영역의 일의 흐름과 응답 범위</h4>
  <table class="tb fl"><thead><tr><th>단계</th><th>이 영역에서 하는 일</th><th>응답</th></tr></thead><tbody>${d.flow.map((f) => `<tr><td><b>${f.step}</b> ${esc(f.name)}</td><td>${esc(f.detail)}</td><td class="fc fc-${f.cover}">${esc(COVER_KO[f.cover] ?? "")}</td></tr>`).join("")}</tbody></table>` : ""}
  ${hasPicks ? `<h4 class="sub">${tag("확인된 사실", "fact")} 체크리스트에서 직접 고른 항목</h4><div class="four">${four.map(([k, xs]) => `<div><h5>${k}</h5>${xs.length ? ul(xs as string[], "ul tight") : `<p class="muted small">고른 항목 없음</p>`}</div>`).join("")}</div>` : ""}
  <div class="two">
    <div>${tag("의미", "read")}${d.meaning.map((t) => p(t)).join("")}</div>
    <div>${tag("해석의 한계", "need")}${d.limits.map((t) => p(t, "small")).join("") || p("—", "small")}</div>
  </div>
  ${d.jobs.length ? `<h4 class="sub">이 영역과 이어지는 직무(직무 일반)</h4><ul class="ul tight">${d.jobs.map((jb) => `<li><b>${esc(jb.name)}</b> — ${esc(jb.work)}</li>`).join("")}</ul>` : ""}
  ${(() => { const g = d.jobs.map((x) => roleGuide(x.code)).find(Boolean); return g && d.askedHow !== "NONE" ? `<h4 class="sub">이 영역의 경험으로 받을 수 있는 면접 질문 ${tag("직무 일반", "read")}</h4><dl class="kv">${g.interview.slice(0, 2).map((x) => `<div><dt>“${esc(x.q)}”</dt><dd>${esc(x.why)}</dd></div>`).join("")}</dl>` : ""; })()}
  ${d.develop.length ? `<h4 class="sub">이 영역에서 다음에 할 일</h4><table class="tb dv"><thead><tr><th>채울 판단</th><th>방법</th><th>남길 것</th></tr></thead><tbody>${d.develop.map((x) => `<tr><td><b>${esc(x.what)}</b></td><td>${esc(x.how)}</td><td>${esc(x.output)}</td></tr>`).join("")}</tbody></table>` : ""}
</article>`;
}
function c03(r: Report3, c: Chapter): string {
  const asked = r.domains.filter((d) => d.askedHow !== "NONE");
  const later = r.domains.filter((d) => d.askedHow === "NONE");
  const key = asked.length ? `이번 검사에서 판단 문항을 물은 영역은 ${asked.map((d) => d.name).join(", ")}입니다. 영역마다 무엇을 골랐고, 그것이 무슨 뜻이며, 어디까지 말할 수 있는지를 적었습니다.` : "이번 검사에서는 판단 문항을 물은 영역이 없습니다.";
  return chapter(c, key, asked.map((d, i) => dm(d, i === 0)).join("")
    + (later.length ? `<div class="later"><h2>관심은 높게 답했지만 이번에 자세히 묻지 않은 영역</h2>${later.map((d) => `<div class="lt"><b>${esc(d.name)}</b><p>${esc(d.meaning[0] ?? "")}</p>${d.records.length ? `<p class="small">경험 기록: ${esc(d.records.join(" · "))}</p>` : ""}</div>`).join("")}</div>` : ""));
}

/* ── 04 경험·교차 ─────────────────────────────────────────────── */

function c04(r: Report3, c: Chapter): string {
  const recs = r.records.map((x) => `<article class="rc">
    <header><h2>${esc(x.title)}</h2><span class="dm-meta">${esc(x.kind)} · ${esc(x.period)} · ${esc(x.domains.join(" · "))}</span></header>
    <div class="rc-g">
      <div class="rc-l">
        <h4 class="sub">활동 목적과 역할</h4>${p(x.purpose)}${p(x.role)}
        <h4 class="sub">${tag("확인된 사실", "fact")} 기록에 적힌 내용</h4>
        <dl class="kv"><div><dt>처음 좁힌 범위</dt><dd>${esc(x.problems.join(" · ") || "적지 않음")}</dd></div>
        <div><dt>직접 정한 것</dt><dd>${esc(x.decisions.join(" · ") || "적지 않음")}</dd></div>
        <div><dt>남은 결과물</dt><dd>${esc(x.artifacts.join(" · ") || "적지 않음")}</dd></div>
        <div><dt>비교한 대상</dt><dd>${esc(x.comparisons.join(" · ") || "적지 않음")}</dd></div>
        <div><dt>쓰인 곳</dt><dd>${esc(x.usedWhere.join(" · ") || "적지 않음")}</dd></div></dl>
      </div>
      <div class="rc-r">
        <h4 class="sub">${tag("분석적 해석", "read")} 검사 응답과 견주면</h4>${x.testSays.map((t) => `<p><b>${esc(t.domain)}</b> — ${esc(t.text)}</p>`).join("")}
        <h4 class="sub">이어지는 직무</h4>${ul(x.jobs.map((jb) => jb.why), "ul tight")}
        <h4 class="sub">취업 서류에서 쓰는 법</h4>${p(x.application)}
        <h4 class="sub">${tag("추가 확인 필요", "need")} 채워 둘 것</h4>${ul(x.check, "ul tight")}
      </div></div></article>`).join("");
  const tb = r.cross.length ? `<h2>영역별로 본 검사 응답과 경험 기록</h2>
  <table class="tb cx"><thead><tr><th>영역</th><th>관계</th><th>검사 응답</th><th>경험 기록</th><th>읽는 법과 확인 방법</th></tr></thead><tbody>
  ${r.cross.map((x) => `<tr><td><b>${esc(x.name)}</b></td><td><span class="ck ck-${x.kind}">${esc(CROSS_TAG[x.kind])}</span></td><td class="small">${esc(x.test)}</td><td class="small">${esc(x.record)}</td><td>${esc(x.reading)}<br><span class="how">확인 방법 — ${esc(x.verify)}</span></td></tr>`).join("")}
  </tbody></table>` : "";
  const vt = r.verify ? `<div class="vt-box"><h2>응답과 근거를 스스로 확인하는 과제</h2>${p(r.verify.lead)}
    <table class="tb"><thead><tr><th>영역</th><th>응답</th><th>근거</th><th>확인 과제</th></tr></thead><tbody>${r.verify.items.map((x) => `<tr><td><b>${esc(x.domain)}</b></td><td class="small">${esc(x.said)}</td><td class="small">${esc(x.picked)}</td><td>${esc(x.task)}</td></tr>`).join("")}</tbody></table>
    <h4 class="sub">확인 순서</h4><ol class="steps">${r.verify.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></div>` : "";
  const key = r.verify
    ? "판단 문항의 응답과 체크리스트 근거가 서로 다른 방향을 가리키는 영역이 있습니다. 이 장은 어느 쪽이 틀렸다고 정하지 않고, 학생 스스로 확인하는 방법을 적었습니다."
    : r.records.length ? `적어 둔 경험 기록 ${r.records.length}건을 하나씩 나눠 읽고, 검사 응답과 같은 쪽을 가리키는지 견줬습니다.` : "적어 둔 경험 기록이 없어, 검사 응답만으로 영역을 읽었습니다.";
  return chapter(c, key, (r.verify ? vt : "") + (recs || `<div class="box-need">${p("경험 기록이 없습니다. 내 CareerMatri의 ‘경험 추가’에서 최근 과제 하나를 남기면 다음 보고서부터 이 장에 경험별 해설이 들어갑니다.")}</div>`) + tb);
}

/* ── 05 강점 / 성장 ───────────────────────────────────────────── */

function c05s(r: Report3, c: Chapter): string {
  return chapter(c, `지원서에서 중심으로 쓸 수 있는 영역은 ${r.strengths.map((s) => s.name).join(", ")}입니다. 영역마다 무엇을 보여 주고, 무엇을 더 준비하고, 어떤 질문에 대비할지 적었습니다.`,
    r.strengths.map((s, i) => `<article class="st">
    <h2><span class="st-n">${i + 1}</span>${esc(s.name)}<span class="zt zt-${s.zone.slice(0, 2)}">${esc(ZONE_SAID[s.zone]?.tag ?? "")}</span></h2>
    <div class="st-g">
      <div>${tag("확인된 사실", "fact")}${p(s.story)}
        ${s.industryLines.length ? `<p class="small">목표 산업이 이 영역에서 묻는 것: ${esc(s.industryLines.join(" · "))}</p>` : ""}
        ${s.jobs.length ? `<p class="small">이어지는 직무: ${esc(s.jobs.join(" · "))}</p>` : ""}</div>
      <div class="st-act"><h4>보여 주는 법</h4>${p(s.show)}<h4>한 단계 더</h4>${p(s.next)}<h4>대비할 질문</h4>${p(s.question, "q")}</div>
    </div></article>`).join(""));
}
function c05g(g: Growth, c: Chapter): string {
  return chapter(c, g.start, `
  <h2>1. 처음 해 볼 수 있는 활동</h2>${ul(g.entry)}
  <h2>2. 권장 학습 순서</h2>
  <ol class="ladder">${g.learn.map((x, i) => `<li><span class="ld-n">${i + 1}</span><div><b>${esc(x.step)}</b><p class="small">${esc(x.why)}</p></div></li>`).join("")}</ol>
  <h2>3. 첫 실무형 프로젝트</h2>
  <div class="proj"><h3>${esc(g.project.title)}</h3><p><b>목표</b> ${esc(g.project.goal)}</p>
    <ol class="steps">${g.project.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    <div class="two"><div><h5>남길 결과물</h5>${p(g.project.output)}</div><div><h5>끝났는지 확인하는 질문</h5>${p(g.project.check)}</div></div></div>
  <h2>4. 처음 준비할 포트폴리오</h2>${ul(g.portfolio)}
  <h2>5. 관련 기업과 직무를 조사하는 방법</h2>
  <table class="tb"><thead><tr><th>단계</th><th>방법</th></tr></thead><tbody>${g.research.map((x) => `<tr><td><b>${esc(x.step)}</b></td><td>${esc(x.how)}</td></tr>`).join("")}</tbody></table>
  <h2>6. 3~6개월 준비 과정</h2>
  <table class="tb"><thead><tr><th>시기</th><th>할 일</th><th>남길 것</th></tr></thead><tbody>${g.months.map((x) => `<tr><td><b>${esc(x.when)}</b></td><td>${esc(x.what)}</td><td>${esc(x.output)}</td></tr>`).join("")}</tbody></table>
  <p class="note">${esc(g.guide.watch)}</p>`);
}

/* ── 06 우선순위 ─────────────────────────────────────────────── */

function c06(r: Report3, c: Chapter): string {
  return chapter(c, r.priorities[0] ? `가장 먼저 채울 판단은 ${r.priorities[0].domain}의 ‘${r.priorities[0].what}’입니다. 차례는 목표 직무 · 목표 산업 · 영역에서 빠질 수 없는 판단 순서로 세웠습니다.` : "지금 응답에서 먼저 채울 판단이 잡히지 않았습니다.",
    r.priorities.map((x) => `<article class="pr">
    <div class="pr-n">${x.order}</div>
    <div class="pr-b"><h3>${esc(x.domain)} · ${esc(x.what)}</h3><p class="small muted">${esc(x.plain)}</p>
      <div class="pr-g"><div><h5>왜 먼저인가</h5>${ul(x.why, "ul tight")}</div>
      <div><h5>어떻게</h5>${p(x.how)}<h5>남길 것</h5>${p(x.output)}</div>
      <div><h5>언제</h5>${p(x.when)}<h5>확인</h5>${p(x.check, "small")}${x.jobs.length ? `<h5>이어지는 직무</h5>${p(x.jobs.join(" · "), "small")}` : ""}</div></div></div></article>`).join(""));
}

/* ── 07 직무 ─────────────────────────────────────────────────── */

function jb(d: Direction3, first: boolean): string {
  const g = d.guide;
  return `<article class="jb${first ? " first" : ""}">
  <header class="jb-h"><h2>${esc(d.name)}${d.goal ? `<span class="goal">목표로 고른 직무</span>` : ""}</h2><span class="rd rd-${d.readiness === "준비 근거 있음" ? "ok" : d.readiness === "일부 있음" ? "mid" : "low"}">${esc(d.readiness)}</span></header>
  ${g ? `<p class="jb-key">${esc(g.summary)}</p>` : ""}
  ${g ? `<h4 class="sub">실제 업무 흐름 ${tag("직무 일반", "read")}</h4><ol class="proc">${g.process.map((x, i) => `<li><span>${i + 1}</span><b>${esc(x.step)}</b><p>${esc(x.what)}</p></li>`).join("")}</ol>` : ""}
  <div class="three">
    <div><h5>주요 책임</h5>${ul(g?.responsibilities ?? [d.owns], "ul tight")}</div>
    <div><h5>필요한 지식</h5>${ul(g?.knowledge ?? [], "ul tight")}<h5>쓰는 도구</h5>${ul(g?.tools ?? [], "ul tight")}</div>
    <div><h5>신입 서류에서 보는 경험</h5>${ul(g?.experiences ?? [], "ul tight")}</div>
  </div>
  <div class="two hv">
    <div><h5>${tag("확인된 사실", "fact")} 지금 갖춘 관련 근거</h5>${d.have.length ? ul(d.have.map((h) => `${h.domain} — ${h.text}`), "ul tight") : p("이 직무와 이어지는 영역에서 아직 확인된 판단이 없습니다.", "small")}</div>
    <div><h5>${tag("추가 확인 필요", "need")} 아직 확인되지 않은 요구</h5>${d.need.length ? ul(d.need.map((x) => `${x.name} — ${x.why}`), "ul tight") : p("이 직무가 반드시 보는 판단은 모두 응답에서 확인됐습니다.", "small")}</div>
  </div>
  <p>${esc(d.summary)}${d.environment ? ` ${esc(d.environment)}` : ""}</p>
  ${g ? `<div class="two jb-more">
    <div><h5>입문 학습 순서 ${tag("직무 일반", "read")}</h5><ol class="steps sm">${g.learnOrder.map((x) => `<li><b>${esc(x.step)}</b> — ${esc(x.why)}</li>`).join("")}</ol></div>
    <div><h5>면접에서 이 직무가 묻는 것</h5><dl class="kv">${g.interview.slice(0, 2).map((x) => `<div><dt>“${esc(x.q)}”</dt><dd>${esc(x.why)}</dd></div>`).join("")}</dl>
      <h5>공고에서 확인할 것</h5>${ul(g.postingCheck, "ul tight")}</div>
  </div>` : ""}
  ${d.differs.length ? `<p class="small muted">비슷한 직무와의 차이: ${esc(d.differs.join(" / "))}</p>` : ""}
  ${g ? `<p class="note">${esc(g.watch)}</p>` : ""}
</article>`;
}
function c07(r: Report3, c: Chapter): string {
  const cmp = `<h2>세 직무를 나란히 보면</h2><table class="tb"><thead><tr><th>직무</th><th>이 직무가 정하는 것</th><th>반드시 보는 판단</th><th>지금 상태</th><th>대표 결과물</th></tr></thead><tbody>
  ${r.directions.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td class="small">${esc(d.decides.join(" · "))}</td><td class="small">${esc(d.need.length ? d.need.map((x) => x.name).join(" · ") + " 미확인" : "모두 확인")}</td><td>${esc(d.readiness)}</td><td class="small">${esc(d.material.slice(0, 2).join(" · "))}</td></tr>`).join("")}
  </tbody></table>`;
  return chapter(c, `탐색할 직무 셋을 ${r.directions.map((d) => d.name).join(", ")}로 골랐습니다. 목표로 고른 직무와, 확인된 경험이 가장 많이 이어지는 직무를 함께 봤습니다. 직무 적합도나 합격 가능성을 계산한 것은 아닙니다.`,
    r.directions.map((d, i) => jb(d, i === 0)).join("") + cmp);
}

/* ── 08 지역 ─────────────────────────────────────────────────── */

function c08(r: Report3, c: Chapter): string {
  const deepIds = new Set(r.companies.map((x) => x.id));
  const bars = r.region.groups.map((g) => ({ region: g.region, label: REGION_KO[g.region], n: g.items.length, deep: g.items.filter((e) => deepIds.has(e.org.id)).length }));
  const facts = r.region.facts.slice(0, 8).map((f) => `<li>${esc(f.text)} <span class="src">${esc(f.source.title)} · ${esc(f.source.checked_on)}</span></li>`).join("");
  const rows = r.region.groups.map((g) => `<tr class="grp"><td colspan="4">${esc(REGION_KO[g.region])}</td></tr>${g.items.map((e) => `<tr><td><b>${esc(e.org.name)}</b>${deepIds.has(e.org.id) ? ` <span class="deep-mk">심층</span>` : ""}<br><span class="small muted">${esc(e.org.industry_line)}</span></td><td class="small">${esc(e.jobs.map((x) => `${x.name}${x.status === "INDUSTRY_EXAMPLE" ? "(산업 일반 예시)" : ""}`).join(" · "))}</td><td class="small">${esc(e.links.map((l) => l.text).join(" · "))}</td><td class="small">${esc(VERIFY5[e.org.verify === "CONFLICTING" ? "CONFLICTING" : e.org.sources.some((s) => s.kind === "KODATA") ? "THIRD_PARTY" : "SEARCH_ONLY"].tag)}</td></tr>`).join("")}`).join("");
  return chapter(c, `대전·세종·충청권에서 이 학생의 목표 산업·직무·확인된 경험과 이어지는 기업을 골랐습니다. 무관한 기업은 싣지 않았고, 어느 기업도 지금 채용 중이라고 확인하지 않았습니다.`, `
  <div class="two rg2"><div><h2>권역 산업 환경</h2><ul class="ul facts">${facts}</ul>${r.region.few ? p(r.region.few, "note") : ""}</div>
  <div><h2>지역별 진로 탐색 기업</h2>${regionBars(bars)}<p class="cap">지역은 본점이나 확인된 사업장 소재지로 갈랐습니다. 지도처럼 위치를 정확히 그리지 않았습니다.</p></div></div>
  <h2>직무 연관 기업 목록</h2>
  <table class="tb co-l"><thead><tr><th>기업</th><th>탐색할 직무</th><th>분석 결과와의 연결 근거</th><th>자료 검증</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="note">${esc(r.region.note)} ‘산업 일반 예시’는 그 기업에서 직무를 확인하지 못했고 같은 산업에서 흔히 있는 경영 직무를 적은 것입니다.</p>`);
}

/* ── 09 기업 심층 ─────────────────────────────────────────────── */

function co(x: CompanyDeep, first: boolean): string {
  const job = x.jobs.map((jb) => `<section class="cj">
    <header class="cj-h"><h3>${esc(jb.name)}</h3>${jb.extra ? `<span class="js js-x">함께 볼 직무</span>` : ""}<span class="js">${esc(jb.status)}</span>${jb.posted ? `<span class="small muted">${esc(jb.posted)}</span>` : ""}</header>
    <p><b>이 회사에서 하는 일</b> — ${esc(jb.tasks)}</p>
    <div class="cj-g">
      <div><h5>업무 수행 과정 ${tag("분석적 해석", "read")}</h5><ol class="steps sm">${jb.flow.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        <h5>필요한 지식·도구</h5>${ul([...jb.knowledge, ...jb.tools.slice(0, 2)], "ul tight")}</div>
      <div><h5>${tag("확인된 사실", "fact")} 학생이 갖춘 관련 근거</h5>${jb.have.length ? ul(jb.have, "ul tight") : p("이 직무와 이어지는 영역에서 아직 확인된 판단이 없습니다.", "small")}
        <h5>${tag("추가 확인 필요", "need")} 아직 확인되지 않은 요구</h5>${jb.need.length ? ul(jb.need, "ul tight") : p("이 직무의 핵심 판단은 응답에서 모두 확인됐습니다. 실제 채용 요건은 공고가 나오면 아래 조건으로 확인하세요.", "small")}</div>
    </div>
    <div class="strat">
      <h4>이 회사·이 직무를 겨냥한 준비 전략</h4>
      <div class="strat-g">
        <div><h5>지금부터 학습할 내용</h5>${ul(jb.learn, "ul tight")}</div>
        <div><h5>실무형 프로젝트</h5><p><b>${esc(jb.project.title)}</b></p><ol class="steps sm">${jb.project.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><p class="small">남길 것: ${esc(jb.project.output)}</p></div>
      </div>
      <dl class="kv kv2"><div><dt>포트폴리오 주제</dt><dd>${esc(jb.portfolio)}</dd></div>
      <div><dt>기존 경험 발전시키기</dt><dd>${esc(jb.develop)}</dd></div>
      <div><dt>자기소개서 근거</dt><dd>${esc(jb.selfIntro)}</dd></div>
      <div><dt>면접 준비 질문</dt><dd>${jb.interview.map((q) => `“${esc(q)}”`).join("<br>")}</dd></div>
      <div><dt>공고가 나오면 확인할 조건</dt><dd>${esc(jb.posting.join(" · "))}</dd></div></dl>
    </div></section>`).join("");
  return `<article class="co${first ? " first" : ""}">
  <header class="co-h"><div><h2>${esc(x.name)}</h2><p class="co-hl">${esc(x.headline)}</p></div><div class="co-v">${lvTag(x.verify)}<span class="small">${esc(REGION_KO[x.region])} · ${esc(x.regionBasis)}</span></div></header>
  <div class="co-id small muted">사업자등록번호 ${esc(x.bizno ?? "미확인")}${x.listing ? ` · ${esc(x.listing)}` : ""} · 본점 ${esc(x.hq)}${x.sites.length ? ` · 사업장 ${esc(x.sites.join(", "))}` : ""}</div>
  <div class="co-g">
    <div><h4 class="sub">기업 및 산업 분석</h4>
      <ul class="ul fx">${x.facts.map((f) => `<li>${esc(f.text)} ${lvTag(f.level)}</li>`).join("")}</ul>
      <dl class="kv"><div><dt>시장에서의 역할</dt><dd>${esc(x.market)} ${tag("분석적 해석", "read")}</dd></div>
      <div><dt>주요 제품·서비스</dt><dd>${esc(x.products.join(" · "))}</dd></div></dl></div>
    <div class="co-side"><h4 class="sub">사업 구조와 경영 직무 ${tag("분석적 해석", "read")}</h4>${x.interpret.map((t) => p(t)).join("")}
      <h4 class="sub">이 학생이 이 기업을 탐색할 이유</h4>${p(x.why)}<p class="small">연결 근거: ${esc(x.links.join(" · "))}</p></div>
  </div>
  ${job}
  <div class="co-f"><p class="small">${tag("추가 확인 필요", "need")} ${esc(x.toCheck.join(" · "))} · 채용 여부 — ${esc(x.hiring)}</p>
<p class="small muted">출처 ${x.sources.length}건 — 자료 이름과 확인일은 마지막 장 ‘기업별 출처’에 모았습니다.</p></div>
</article>`;
}
function c09(r: Report3, c: Chapter): string {
  return chapter(c, r.companies.length ? `${withJosa(r.companies.map((x) => x.name).join(", "), "을를")} 깊게 봤습니다. 기업마다 사업 구조가 경영 직무를 어떻게 바꾸는지, 이 학생의 근거가 어디에 닿는지, 무엇을 준비하면 되는지를 적었습니다.` : "심층 분석할 지역 기업이 없습니다.",
    r.companies.map((x, i) => co(x, i === 0)).join(""));
}

/* ── 10 서류·면접 ─────────────────────────────────────────────── */

function story(s: Story): string {
  return `<article class="sy"><h3>${esc(s.from)}</h3>${s.fits.length ? `<p class="small muted">이 문단이 맞는 직무: ${esc(s.fits.join(" · "))}</p>` : ""}
  <div class="sy-g">${s.parts.map((x, i) => `<div class="sy-p${x.filled ? "" : " empty"}"><span>${i + 1}. ${esc(x.label)}</span><p>${esc(x.text)}</p></div>`).join("")}</div>
  <p class="small">${esc(s.add)}</p></article>`;
}
function c10(r: Report3, c: Chapter): string {
  const a = r.application;
  return chapter(c, "자기소개서 문단은 ‘상황과 역할 → 내가 정한 것 → 남긴 것 → 비교와 결과’ 네 칸으로 짓습니다. 채워진 칸은 학생이 고른 응답이고, 비어 있는 칸은 학생만 아는 내용이라 직접 적습니다.", `
  <h2>자기소개서 문단 설계</h2>${a.stories.map(story).join("") || p("문단의 재료가 될 경험이 아직 없습니다. 05장의 첫 프로젝트가 첫 재료가 됩니다.")}
  <h2>포트폴리오 구성</h2>
  <table class="tb"><thead><tr><th>결과물</th><th>함께 담을 것</th><th>출처</th><th>상태</th></tr></thead><tbody>${a.portfolio.map((x) => `<tr><td><b>${esc(x.title)}</b></td><td class="small">${esc(x.include)}</td><td class="small">${esc(x.from)}</td><td><span class="ps ps-${x.status === "보유" ? "have" : "new"}">${esc(x.status)}</span></td></tr>`).join("")}</tbody></table>
  <h2>면접 준비 질문</h2>
  <table class="tb iv"><thead><tr><th>질문</th><th>왜 묻는가</th><th>답할 재료</th></tr></thead><tbody>${a.interview.map((x) => `<tr><td><b>${esc(x.q)}</b></td><td class="small">${esc(x.why)}</td><td class="small">${esc(x.material)}</td></tr>`).join("")}</tbody></table>`);
}

/* ── 11 계획 ─────────────────────────────────────────────────── */

function c11(r: Report3, c: Chapter): string {
  return chapter(c, "30일 · 60일 · 90일 · 6개월 · 12개월로 나눴습니다. 학년과 지원 시기를 묻지 않았기 때문에 날짜 대신 보고서를 받은 날부터의 기간으로 적었습니다.", `
  ${timelineSvg(r.plan)}
  <table class="tb plan"><thead><tr><th>시기</th><th>무엇을</th><th>왜</th><th>어떻게</th><th>산출물</th><th>확인</th></tr></thead><tbody>
  ${r.plan.map((x) => `<tr><td><b>${esc(x.period)}</b></td><td>${esc(x.what)}</td><td class="small">${esc(x.why)}</td><td class="small">${esc(x.how)}</td><td class="small">${esc(x.output)}</td><td class="small">${esc(x.check)}</td></tr>`).join("")}
  </tbody></table>
  <h2>지금 바로 할 행동</h2>
  <ol class="final">${r.final.map((x, i) => `<li><span class="fn">${i + 1}</span><div><p class="ft">${esc(x.text)}</p><p class="small muted">${esc(x.why)} · ${esc(x.when)}</p></div></li>`).join("")}</ol>`);
}

/* ── 12 워크시트 ─────────────────────────────────────────────── */

function c12(r: Report3, c: Chapter): string {
  const F = ["상황 — 어떤 수업·활동이었고 무엇이 문제였나", "내가 맡은 범위", "내가 직접 정한 기준이나 선택", "쓴 방법·도구", "남은 결과물", "결과를 무엇과 비교했나", "결과·수치·기간", "다시 한다면 바꿀 것"];
  const key = ["", "", "decided", "", "artifact", "verify", "", ""];
  const ws = r.worksheet.map((w) => `<div class="ws"><h3>${esc(w.title)}</h3><table class="tb ws-t"><tbody>${F.map((f, i) => `<tr><th>${esc(f)}</th><td>${w.prefill[key[i]] ? `<span class="pre">${esc(w.prefill[key[i]])}</span>` : ""}</td></tr>`).join("")}</tbody></table></div>`).join("");
  const memo = `<div class="ws"><h3>기업 확인 메모</h3><table class="tb ws-t"><tbody>${["기업 이름", "공식 홈페이지에서 확인한 사업", "공시(DART)에서 확인한 내용", "채용 페이지에서 본 직무와 근무지", "이 보고서와 다른 점", "확인한 날"].map((f) => `<tr><th>${esc(f)}</th><td></td></tr>`).join("")}</tbody></table></div>`;
  return chapter(c, "인쇄해서 직접 채우는 양식입니다. 연한 글씨는 검사에서 고른 항목이고, 나머지 칸은 비워 두었습니다.", ws + memo);
}

/* ── 13 근거 ─────────────────────────────────────────────────── */

function c13(r: Report3, c: Chapter): string {
  const ver = Object.entries(r.versions).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k} ${v}`).join(" · ");
  return chapter(c, "이 보고서가 무엇을 근거로 했고, 무엇을 확인하지 못했는지 적었습니다.", `
  <div class="two"><div><h2>이 보고서가 근거로 쓴 것</h2>${ul(["검사 문항에 답한 내용(관심·경험·여덟 가지 판단의 단계)", "체크리스트에서 직접 고른 근거 항목(한 일·정한 것·결과물·비교 대상)", "내 CareerMatri에 적어 둔 경험 기록", "경영 직무 일반 안내(CareerMatri가 정리한 자료)", "기업 자료 — 제3자 기업정보(KODATA)와 검색 결과"])}</div>
  <div><h2>확인하지 않은 것</h2>${ul(["결과물의 완성도와 실제 성과 수치", "기업의 채용 여부·채용 인원·근무 조건", "기업 공식 홈페이지·공시·채용 공고의 원문(직접 열람하지 못함)", "직무 적합도·합격 가능성(계산하지 않음)"])}</div></div>
  <h2>기업 자료 검증 상태</h2>
  <table class="tb vtb"><thead><tr><th>기업</th><th>사업자등록번호</th><th>지역</th><th>검증 상태</th><th>쓰인 곳</th><th>확인일</th></tr></thead><tbody>
  ${r.verifyTable.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.bizno)}</td><td>${esc(REGION_KO[x.region as keyof typeof REGION_KO])}</td><td>${lvTag(x.level)}</td><td>${esc(x.used)}</td><td>${esc(x.checked)}</td></tr>`).join("")}
  </tbody></table>
  <h2>기업별 출처</h2>
  ${r.companies.map((x) => `<div class="srcb"><h4>${esc(x.name)}</h4><ol class="srcs">${x.sources.map((s, i) => `<li><b>[${i + 1}]</b> ${esc(s.title)}${s.url ? ` · <span class="url">${esc(hostOf(s.url))}</span>` : ""} · ${esc(s.checked_on)}</li>`).join("")}</ol></div>`).join("")}
  <div class="v5">${(Object.keys(VERIFY5) as (keyof typeof VERIFY5)[]).map((k) => `<div>${lvTag(k)}<p class="small">${esc(VERIFY5[k].said)}</p></div>`).join("")}</div>
  <p class="note">KODATA는 제3자 기업정보이며 공식 홈페이지·공시와 같은 수준으로 보지 않았습니다. 재무표·신용등급·주주·거래처 이름은 옮기지 않았습니다. 이 자료의 학생 배포 범위가 확정되기 전까지 이 보고서는 검토용입니다.</p>
  <p class="small muted">판본: ${esc(ver)}</p>`);
}

/* ── 조립 ────────────────────────────────────────────────────── */

export function render3(r: Report3, o: { fontsHref: string; pages?: Record<string, number> }): string {
  const chs = chaptersOf(r);
  const by = (t: string) => chs.find((c) => c.title.startsWith(t))!;
  const body = [
    cover(r, chs, o.pages ?? {}),
    c01(r, by("종합")), c02(r, by("개인별")), c03(r, by("영역별")), c04(r, chs[3]),
    r.strengths.length ? c05s(r, by("강점")) : "",
    r.growth && chs.find((c) => c.title.startsWith("성장")) ? c05g(r.growth, by("성장")) : "",
    c06(r, by("역량 개발")), c07(r, by("직무별")), c08(r, by("대전")), c09(r, by("진로 탐색 기업")),
    c10(r, by("자기소개서")), c11(r, by("단계별")), c12(r, by("정리")), c13(r, by("분석 근거")),
  ].join("\n");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri PRO 진로·취업 분석 리포트</title>
<style>${fontFaces(o.fontsHref)}${CSS}</style></head><body>${body}</body></html>`;
}

function fontFaces(href: string): string {
  return [[400, "Regular"], [500, "Medium"], [600, "SemiBold"], [700, "Bold"]].map(([w, n]) =>
    `@font-face{font-family:"Pretendard";font-weight:${w};src:url("${href}/Pretendard-${n}.woff2") format("woff2"),url("${href}/Pretendard-${n}.otf") format("opentype")}`).join("");
}

const CSS = `
:root{--ink:#1b2230;--navy:#16284a;--muted:#5b6474;--line:#d6dde8;--blue:#1c5fb0;--sky:#dbe7f6;--pale:#f3f6fb;--amber:#c98a2b;--amber-p:#fbf1e2}
@page{size:A4;margin:22mm 18mm 20mm 18mm}
*{box-sizing:border-box}
body{font-family:"Pretendard",sans-serif;color:var(--ink);font-size:10.4pt;line-height:1.7;font-weight:400;word-break:keep-all;overflow-wrap:break-word;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0}
h1,h2,h3,h4,h5{color:var(--navy);margin:0;break-after:avoid;text-wrap:balance}
h2{font-size:13.5pt;font-weight:700;margin:18pt 0 8pt}
h3{font-size:11.6pt;font-weight:700;margin:0 0 5pt}
h4{font-size:10.6pt;font-weight:700;margin:10pt 0 4pt}
h5{font-size:9.8pt;font-weight:700;margin:7pt 0 3pt;color:var(--navy)}
p{margin:0 0 6pt}
.small{font-size:9.1pt;line-height:1.6}.muted{color:var(--muted)}
.ul{margin:2pt 0 6pt;padding-left:13pt}.ul li{margin-bottom:2.5pt}.ul.tight li{margin-bottom:1pt}
.steps{margin:2pt 0 6pt;padding-left:16pt}.steps li{margin-bottom:2.5pt}.steps.sm{font-size:9.4pt}
.note{font-size:9.1pt;color:var(--muted);border-left:2pt solid var(--line);padding:2pt 0 2pt 8pt;margin-top:10pt}
.cap{font-size:8.8pt;color:var(--muted);line-height:1.55;margin-top:4pt}
.tg{display:inline-block;font-size:8.4pt;font-weight:600;padding:0.5pt 5pt;border-radius:3pt;margin-right:4pt;vertical-align:1pt;line-height:1.5}
.tg-fact{background:#e5eefb;color:#163e7a}.tg-read{background:#eef0f4;color:#3d4757}.tg-need{background:var(--amber-p);color:#7a5418}.tg-lv{background:#eef0f4}
.vt{display:inline-block;font-size:8.2pt;font-weight:600;padding:0.5pt 5pt;border-radius:3pt;line-height:1.5;white-space:nowrap}
.vt-OFFICIAL_DIRECT{background:#dff2e6;color:#1d6b3b}.vt-THIRD_PARTY{background:#e5eefb;color:#163e7a}.vt-SEARCH_ONLY{background:#eef0f4;color:#3d4757}.vt-CONFLICTING{background:#fde6e1;color:#8a2f1d}.vt-UNVERIFIED{background:#f3f3f3;color:#666}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14pt;margin:6pt 0}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12pt;margin:6pt 0}
.tb{width:100%;border-collapse:collapse;font-size:9.4pt;line-height:1.55;margin:4pt 0 8pt}
.tb th{text-align:left;font-weight:700;color:var(--navy);border-bottom:1.2pt solid var(--navy);padding:4pt 6pt;vertical-align:bottom}
.tb td{border-bottom:.6pt solid var(--line);padding:5pt 6pt;vertical-align:top}
.tb tr{break-inside:avoid}.tb thead{display:table-header-group}
/* 표지 */
.cover{height:253mm;display:flex;flex-direction:column;break-after:page}
.cv-top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.2pt solid var(--navy);padding-bottom:6pt}
.cv-brand{font-weight:700;color:var(--navy);font-size:13pt;letter-spacing:.2pt}.cv-kind{font-size:10pt;color:var(--muted)}
.cv-art{margin:14mm 0 10mm}.cv-art .art{width:100%;height:auto;display:block}
.cv-school{font-size:12pt;color:var(--muted);margin:0}.cv-title{font-size:30pt;font-weight:700;margin:2pt 0 4pt}
.cv-sub{font-size:11pt;color:var(--muted)}.cv-lead{font-size:12.5pt;color:var(--navy);line-height:1.6;margin-top:10mm;border-left:3pt solid var(--blue);padding-left:10pt;font-weight:500}
.cv-review{margin-top:auto;font-size:8.8pt;color:#7a5418;background:var(--amber-p);padding:5pt 8pt;border-radius:3pt}
.toc-pg,.gl-pg{break-after:page}
.toc-h{font-size:16pt;margin:0 0 10pt;padding-bottom:5pt;border-bottom:1.2pt solid var(--navy)}
.toc{list-style:none;padding:0;margin:0 0 18pt}.toc li{display:grid;grid-template-columns:24pt 1fr 52pt 24pt;gap:8pt;padding:5.5pt 0;border-bottom:.6pt solid var(--line);font-size:10.6pt}
.t-no{color:var(--blue);font-weight:700}.t-k{font-size:8.6pt;color:var(--muted);align-self:center}.t-p{text-align:right;color:var(--muted)}
.howto{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12pt}.howto p{font-size:9.4pt}
.gl-lead{font-size:10.6pt;color:var(--muted)}.gl td{font-size:9.4pt}.gl td:first-child{width:24%}
.gl2{display:grid;grid-template-columns:1fr 1fr;gap:16pt;margin-top:10pt}
/* 장 머리 */
.ch{break-before:page}
.ch-h{display:grid;grid-template-columns:1fr 50mm;gap:12pt;align-items:end;border-bottom:1.4pt solid var(--navy);padding-bottom:8pt;margin-bottom:12pt}
.ch-no{font-size:11pt;font-weight:700;color:var(--blue);letter-spacing:.5pt}
.ch-h h1{font-size:20pt;font-weight:700;line-height:1.3;margin:2pt 0 6pt}
.ch-key{font-size:12pt;line-height:1.62;color:var(--navy);font-weight:500;margin:0}
.ch-art .band-art{width:50mm;height:auto;display:block}
/* 01 */
.glance{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border:1pt solid var(--line);border-radius:4pt;overflow:hidden;margin:4pt 0 6pt}
.glance div{padding:8pt 10pt;border-right:.6pt solid var(--line);border-bottom:.6pt solid var(--line)}.glance div:nth-child(3n){border-right:0}
.glance span{display:block;font-size:8.6pt;color:var(--muted)}.glance b{display:block;font-size:10.4pt;color:var(--navy);line-height:1.45;margin-top:2pt}
.pt{display:grid;grid-template-columns:22pt 1fr;gap:10pt;padding:10pt 0;border-bottom:.6pt solid var(--line);break-inside:avoid}
.pt-n{width:20pt;height:20pt;border-radius:50%;background:var(--navy);color:#fff;font-weight:700;text-align:center;line-height:20pt;font-size:10pt}
.fmla{margin:0}.fmla div{display:grid;grid-template-columns:76pt 1fr;gap:8pt;margin-bottom:3pt}.fmla dt{margin:0}.fmla dd{margin:0}
.fmla .act{background:var(--pale);border-left:3pt solid var(--blue);padding:4pt 6pt;margin-top:4pt}.fmla .act dt{font-weight:700;color:var(--blue);font-size:9.6pt}
/* 02 */
.fig2{display:grid;grid-template-columns:92mm 1fr;gap:14pt;align-items:start;break-inside:avoid}
.radar{width:92mm;height:auto}.rg{fill:none;stroke:#d6dde8;stroke-width:1}.sp{stroke:#e3e8f0;stroke-width:1}
.al{font-size:10px;fill:var(--navy);font-weight:600}
.py{fill-opacity:.12;stroke-width:1.6}.dt{stroke:#fff;stroke-width:1}
.s0{fill:#1c5fb0;stroke:#1c5fb0}.s1{fill:#c98a2b;stroke:#c98a2b}.s2{fill:#2f8a7d;stroke:#2f8a7d}.s3{fill:#7a4fa0;stroke:#7a4fa0}
.sw.s0{background:#1c5fb0}.sw.s1{background:#c98a2b}.sw.s2{background:#2f8a7d}.sw.s3{background:#7a4fa0}
.lg{display:flex;flex-wrap:wrap;gap:4pt 10pt;font-size:9pt}.lg-i{display:inline-flex;align-items:center;gap:4pt}.sw{width:9pt;height:9pt;border-radius:2pt;display:inline-block}
.box-need{background:var(--amber-p);border-radius:4pt;padding:8pt 10pt;margin:8pt 0;break-inside:avoid}
.plot,.flow,.tl,.rb{width:100%;height:auto;display:block;margin:4pt 0}
.jt td:nth-child(4){width:40%}
/* 03 */
.dm{padding-top:4pt}.dm:not(.first){break-before:page}
.dm-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:8pt;margin-bottom:4pt}.dm-h h2{margin:0;font-size:15pt}
.dm-meta{font-size:9pt;color:var(--muted)}
.zt{font-size:8.6pt;font-weight:700;padding:1pt 6pt;border-radius:10pt;background:#eef0f4;color:var(--navy)}
.zt-Z1{background:var(--blue);color:#fff}.zt-Z2{background:var(--sky)}.zt-Z3{background:#e7eef0}.zt-Z4{background:var(--amber-p);color:#7a5418}
.dm-key{font-size:12pt;color:var(--navy);font-weight:500;line-height:1.6;border-left:3pt solid var(--blue);padding-left:9pt;margin:6pt 0 4pt}
.sub{margin:12pt 0 4pt}
.four{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8pt;background:var(--pale);border-radius:4pt;padding:8pt 10pt;break-inside:avoid}.four h5{margin-top:0}.four .ul{font-size:9.2pt}
.dv td:first-child{width:22%}.dv td:last-child{width:24%}
.later{margin-top:16pt;break-inside:avoid}.lt{padding:6pt 0;border-bottom:.6pt solid var(--line)}
/* 04 */
.rc{break-inside:avoid;margin-bottom:12pt}.rc+.rc{break-before:page}.rc header{border-bottom:.8pt solid var(--line);padding-bottom:4pt;margin-bottom:6pt}.rc h2{margin:0 0 2pt;font-size:14pt}
.rc-g{display:grid;grid-template-columns:1fr 1fr;gap:16pt}
.kv{margin:0}.kv div{display:grid;grid-template-columns:72pt 1fr;gap:6pt;padding:3pt 0;border-bottom:.5pt dotted var(--line)}.kv dt{font-weight:600;color:var(--navy);font-size:9.4pt}.kv dd{margin:0}
.cx td:nth-child(5){width:44%}.how{display:block;font-size:8.9pt;color:#7a5418;margin-top:3pt}
.ck{font-size:8.4pt;font-weight:700;padding:1pt 5pt;border-radius:3pt;background:#eef0f4;white-space:nowrap}
.ck-BOTH{background:#e5eefb;color:#163e7a}.ck-DIFFERENT,.ck-UNBACKED{background:var(--amber-p);color:#7a5418}
.vt-box{background:var(--pale);border-radius:5pt;padding:4pt 12pt 8pt;margin-bottom:12pt}
/* 05 */
.st{padding:10pt 0;border-bottom:.6pt solid var(--line);break-inside:avoid}.st h2{margin:0 0 6pt;display:flex;align-items:center;gap:8pt}
.st-n{width:22pt;height:22pt;border-radius:50%;background:var(--blue);color:#fff;font-size:11pt;text-align:center;line-height:22pt}
.st-g{display:grid;grid-template-columns:1fr 1fr;gap:16pt}.st-act{background:var(--pale);border-radius:4pt;padding:4pt 10pt 6pt}.st-act h4:first-child{margin-top:4pt}
.q{font-weight:600;color:var(--navy)}
.ladder{list-style:none;padding:0;margin:4pt 0}.ladder li{display:grid;grid-template-columns:26pt 1fr;gap:8pt;padding:5pt 0;border-bottom:.5pt solid var(--line);break-inside:avoid}
.ld-n{width:22pt;height:22pt;border-radius:4pt;background:var(--sky);color:var(--navy);font-weight:700;text-align:center;line-height:22pt}
.proj{border:1pt solid var(--line);border-left:4pt solid var(--amber);border-radius:4pt;padding:8pt 12pt;break-inside:avoid}
/* 06 */
.pr{display:grid;grid-template-columns:30pt 1fr;gap:10pt;padding:10pt 0;border-bottom:.6pt solid var(--line);break-inside:avoid}
.pr-n{font-size:20pt;font-weight:700;color:var(--blue);line-height:1}
.pr-g{display:grid;grid-template-columns:1.1fr 1.2fr 1fr;gap:12pt}
/* 07 */
.jb{padding-top:2pt}.jb:not(.first){break-before:page}
.jb-h{display:flex;justify-content:space-between;align-items:baseline}.jb-h h2{margin:0;font-size:15pt}
.goal{font-size:8.6pt;font-weight:700;color:#fff;background:var(--navy);border-radius:10pt;padding:1pt 7pt;margin-left:8pt;vertical-align:2pt}
.rd{font-size:9pt;font-weight:700;padding:2pt 8pt;border-radius:10pt}.rd-ok{background:var(--blue);color:#fff}.rd-mid{background:var(--sky);color:var(--navy)}.rd-low{background:var(--amber-p);color:#7a5418}
.jb-key{font-size:11.6pt;color:var(--navy);font-weight:500;margin:6pt 0}
.proc{list-style:none;padding:0;margin:4pt 0 8pt;display:grid;grid-template-columns:repeat(6,1fr);gap:6pt}
.proc li{background:var(--pale);border-radius:4pt;padding:6pt 7pt;font-size:8.9pt;line-height:1.5;border-top:3pt solid var(--blue)}
.proc li span{font-weight:700;color:var(--blue);font-size:9pt}.proc li b{display:block;color:var(--navy);font-size:9.4pt;margin:1pt 0}.proc li p{margin:0}
.hv>div{background:#fafbfd;border:.6pt solid var(--line);border-radius:4pt;padding:4pt 9pt}
/* 08 */
.rg2{grid-template-columns:1fr 1fr}.facts{font-size:9.3pt}.src{display:block;font-size:8.4pt;color:var(--muted)}
.co-l td:first-child{width:28%}.co-l td:nth-child(4){width:14%}.grp td{background:var(--pale);font-weight:700;color:var(--navy)}
.deep-mk{font-size:8pt;font-weight:700;background:var(--blue);color:#fff;border-radius:3pt;padding:0 4pt}
/* 09 */
.co{padding-top:2pt}.co:not(.first){break-before:page}
.co-h{display:flex;justify-content:space-between;gap:12pt;align-items:flex-end;border-bottom:.8pt solid var(--line);padding-bottom:5pt}
.co-h h2{margin:0;font-size:16pt}.co-hl{margin:2pt 0 0;color:var(--muted);font-size:10pt}
.co-v{display:flex;flex-direction:column;align-items:flex-end;gap:3pt}
.co-id{margin:4pt 0 6pt}
.co-g{display:grid;grid-template-columns:1.05fr 1fr;gap:16pt}
.fx{font-size:9.6pt}.fx li{margin-bottom:4pt}
.co-side{background:var(--pale);border-radius:4pt;padding:2pt 10pt 6pt}
.cj{margin-top:12pt;border-top:2pt solid var(--navy);padding-top:6pt}
.cj-h{display:flex;align-items:baseline;gap:8pt;flex-wrap:wrap}.cj-h h3{margin:0;font-size:12.6pt}
.js{font-size:8.6pt;font-weight:700;background:var(--sky);color:var(--navy);padding:1pt 6pt;border-radius:3pt}
.cj-g{display:grid;grid-template-columns:1fr 1fr;gap:14pt}
.strat{background:#fafbfd;border:1pt solid var(--line);border-left:4pt solid var(--amber);border-radius:4pt;padding:4pt 12pt 8pt;margin-top:8pt;break-inside:avoid}
.strat h4{margin-top:4pt}
.strat-g{display:grid;grid-template-columns:1fr 1.3fr;gap:12pt}
.kv2 div{grid-template-columns:92pt 1fr}
.co-f{margin-top:8pt}.srcb{break-inside:avoid;margin-bottom:6pt}.srcb h4{font-size:9.6pt;margin:4pt 0 2pt}.srcs{font-size:8.2pt;color:var(--muted);list-style:none;padding:0;margin:4pt 0 0;columns:2;column-gap:14pt}.srcs li{margin-bottom:1pt}.url{color:#8890a0}
/* 10 */
.sy{border:1pt solid var(--line);border-radius:4pt;padding:8pt 12pt;margin-bottom:10pt;break-inside:avoid}
.sy-g{display:grid;grid-template-columns:1fr 1fr;gap:8pt;margin:6pt 0}
.sy-p{background:var(--pale);border-radius:3pt;padding:5pt 8pt}.sy-p span{font-size:8.8pt;font-weight:700;color:var(--blue)}.sy-p p{margin:2pt 0 0}
.sy-p.empty{background:#fff;border:1pt dashed #b8c3d4}.sy-p.empty p{color:var(--muted);font-size:9.2pt}
.ps{font-size:8.4pt;font-weight:700;padding:1pt 5pt;border-radius:3pt}.ps-have{background:var(--blue);color:#fff}.ps-new{background:var(--amber-p);color:#7a5418}
.iv td:first-child{width:38%}
/* 11 */
.plan td:first-child{width:8%}.plan td:nth-child(2){width:26%}
.final{list-style:none;padding:0;margin:0}.final li{display:flex;gap:10pt;padding:8pt 0;border-bottom:.6pt solid var(--line);break-inside:avoid}
.fn{flex:0 0 22pt;height:22pt;border-radius:50%;background:var(--amber);color:#fff;font-weight:700;text-align:center;line-height:22pt}.ft{font-weight:600;margin:0 0 2pt;color:var(--navy)}
/* 12 */
.ws{break-inside:avoid;margin-bottom:12pt}.ws-t th{width:36%;font-weight:600;color:var(--navy);border-bottom:.6pt solid var(--line);font-size:9.4pt;vertical-align:top}.ws-t td{height:13mm}
.pre{color:#8a93a3}
.bridge{margin-top:14pt;break-inside:avoid}.bridge h2{font-size:12pt;margin-bottom:6pt}
.mini{list-style:none;padding:0;margin:0}.mini li{display:grid;grid-template-columns:52pt 1fr;gap:8pt;padding:4pt 0;border-bottom:.5pt solid var(--line);font-size:9.4pt;line-height:1.55}
ul.mini li{grid-template-columns:1fr}.mini b{color:var(--navy)}
.tb.fl td{font-size:9.2pt;padding:3.5pt 6pt}.tb.fl td:first-child{width:30%;white-space:nowrap}.tb.fl td:last-child{width:17%}
.fc{font-weight:600}.fc-strong{color:#1b5fb4}.fc-partial{color:#5d86c4}.fc-none{color:#8a93a3}.fc-unasked{color:#b0b7c3;font-weight:400}
.jb-more{margin-top:8pt;break-inside:avoid}.js-x{background:#fdf2e2;color:#8a5a12}
/* 13 */
.vtb td{font-size:9pt}.v5{display:grid;grid-template-columns:repeat(5,1fr);gap:8pt;margin:8pt 0}
`;

export function overlay3(r: Report3, pageCh: string[], fonts: string): string {
  const n = pageCh.length;
  const head = [r.meta.school, r.meta.department].filter(Boolean).join(" · ");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${fontFaces(fonts)}
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:"Pretendard"}
.pg{width:210mm;height:297mm;position:relative;break-after:page;color:#5b6474;font-size:7.9pt}
.hd{position:absolute;top:9mm;left:18mm;right:18mm;display:flex;justify-content:space-between;border-bottom:.5pt solid #d6dde8;padding-bottom:2.2mm}
.ft{position:absolute;bottom:9mm;left:18mm;right:18mm;display:flex;justify-content:space-between;align-items:center}
.ft b{color:#16284a;font-weight:600}.rv{color:#a06a1a}
</style></head><body>${pageCh.map((s, i) => i === 0 ? `<div class="pg"></div>` : `<div class="pg"><div class="hd"><span>${head}</span><span>CareerMatri PRO 진로·취업 분석 리포트</span></div><div class="ft"><span><b>${s}</b></span><span class="rv">검토용 · 배포 전</span><span>${i + 1} / ${n}</span></div></div>`).join("")}</body></html>`;
}

export { ZONE_SAID, JOB_STATUS_KO };
