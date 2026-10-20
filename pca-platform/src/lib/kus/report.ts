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

export const KUS_REPORT_VERSION = "kus-report.2";

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
  return `<section class="ch${opts.flow ? " flow" : ""}"><header class="ch-h"><span class="no">${String(no).padStart(2, "0")}</span>`
    + `<div><p class="kick">CHAPTER ${no}</p><h2>${esc(title)}</h2></div></header>`
    + `<p class="lead">${esc(lead)}</p>${body}${opts.foot ? `<p class="foot">${esc(opts.foot)}</p>` : ""}</section>`;
}

const ZONE_CLASS: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "z1", Z2_EVIDENCE_INCOMPLETE: "z2",
  Z3_EVIDENCE_LOW_INTEREST: "z3", Z4_INSUFFICIENT_EVIDENCE: "z4",
};
const STATE_CLASS: Record<string, string> = { OWNED: "s3", CONFIRMED: "s2", PARTICIPATED: "s1", NOT_OBSERVED: "s0" };
const BASIS_CLASS: Record<string, string> = { SELF_REPORT_ONLY: "b0", PARTLY_BACKED: "b1", BACKED: "b2" };
const COMPAT_KO: Record<string, string> = {
  A: "A · 교육과정 대조로 Core 를 바로 쓰는 학과",
  B: "B · Core 를 잇되 근거 보완이 남은 학과",
  C: "C · 전공 데이터가 더 필요한 학과",
  D: "D · 지금은 검사를 제공하지 않는 학과",
  R: "R · 전공을 고르는 모집단위",
};

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

  const cover = `<section class="cover">
  <p class="brand">CareerMatri · ${esc(s.university)}</p>
  <h1>${esc(s.name)}<small>개인 진로 분석 리포트</small></h1>
  <p class="who">${esc(s.college)} · ${esc(s.department)} · ${esc(s.coreName)} 검사(${esc(a.tier)})</p>
  <div class="headline"><p class="badge">${esc(a.status.badge)}</p><p class="t">${esc(a.status.title)}</p><p class="l">${esc(a.status.lead)}</p>
   <p class="basis ${BASIS_CLASS[r.basis]}">${esc(r.label)}</p></div>
  <div class="kpis">
    <div><b>${c.opened}</b><span>이번에 연 영역</span></div>
    <div><b>${c.confirmed}</b><span>응답으로 확인된 판단(칸)</span></div>
    <div><b>${c.owned}</b><span>근거가 받친 직접 판단(칸)</span></div>
    <div><b>${c.evidence}</b><span>고른 근거 항목</span></div>
    <div><b>${a.visits.length}</b><span>기업탐방 기록</span></div>
  </div>
  <p class="kpinote">점수가 아니라 센 수입니다. 백분위 · 적합도 · 합격 가능성을 만들지 않습니다.</p>
  <ol class="toc">${["개인 현황", "전공·역량 분석", "경험·Evidence", "관심 산업·직무", "직무 요구사항과 Gap",
    "탐방 경험과 직무 연결", "자기소개서·면접 활용", "30·60·90일 실행 계획"].map((t, i) => `<li><span>${i + 1}</span>${t}</li>`).join("")}</ol>
  <p class="meta">결과 확정 ${esc(meta.resultAt ?? "—")} · 리포트 생성 ${esc(meta.generatedAt)} · 응시 ${esc(meta.attemptId)}</p>
</section>`;

  /* 1 */
  const zoneList = a.deep.length
    ? `<ul class="zl">${a.deep.map((d) => `<li><span class="zone ${ZONE_CLASS[d.zone] ?? ""}">${esc(d.zoneKo)}</span><b>${esc(d.name)}</b>${d.missingRequired.length ? `<small>비어 있는 꼭 볼 판단: ${esc(d.missingRequired.join(" · "))}</small>` : `<small>${r.basis === "SELF_REPORT_ONLY" ? "꼭 볼 판단이 응답으로만 확인됨(근거 항목 없음)" : "꼭 볼 판단이 다 확인됨"}</small>`}</li>`).join("")}</ul>`
    : empty("이번 검사에서 연 영역이 없습니다.");
  const a0 = a.actions[0];
  const ch1 = chapter(1, "개인 현황", a.status.title, `
<div class="rel ${BASIS_CLASS[r.basis]}">
 <p class="rh">이 결과가 기대고 있는 것 · <b>${esc(r.label)}</b></p>
 ${table(["", ""], r.lines.map((l) => [esc(l.k), `<b>${esc(l.v)}</b>`]), "kv")}
 ${r.caution ? `<p class="caution">${esc(r.caution)}</p>` : ""}
</div>
${note ? `<p class="warn">${esc(note)}</p>` : ""}
<h3>영역마다 지금 상태</h3>${zoneList}
<h3>먼저 할 한 가지</h3>
${a0 ? `<p class="next">${a0.domain && !a0.do.startsWith(a0.domain) ? `<b>${esc(a0.domain)}</b> ` : ""}${esc(a0.do)}</p>` : empty("결과 모델이 낸 할 일이 없습니다.")}`,
  { foot: "판정은 공통 엔진이 응답에서 냈고, 이 장은 그 판정이 근거 항목으로 얼마나 받쳐지는지를 함께 적습니다. 검사가 묻지 않은 것은 적지 않습니다." });

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
  const ch2 = chapter(2, "전공·역량 분석", `${s.coreName} 검사가 연 ${c.opened}개 영역을 하나씩, 여덟 판단의 응답 상태와 고른 항목으로 읽습니다.`,
    (sameWhy ? `<p class="why">연 영역 모두: ${esc(sameWhy)}</p>` : "")
    + (a.deep.length ? a.deep.map(deepBlock).join("") : empty("이번 검사에서 연 영역이 없습니다."))
    + (a.major.notAsked.length ? `<p class="muted">이번 검사에서 묻지 않은 영역: ${esc(a.major.notAsked.join(" · "))}</p>` : ""),
    { flow: true, foot: "응답 상태는 넷입니다: 아직 없음 · 받아서 수행 · 직접 수행 · 직접 결정. ‘직접 결정’은 그 판단에 근거 항목 둘이 받칠 때만 섭니다. 사전의 도구·결과물은 그 영역이 다루는 것이고, 이 학생이 다룬다는 뜻이 아닙니다." });

  /* 3 (+4) */
  const chainRows = a.deep.filter((d) => d.chain.did.length || d.chain.decided.length || d.chain.artifacts.length || d.chain.verifications.length);
  const ch3 = chapter(3, "경험·Evidence", a.evidence.ready.length
      ? `지원서와 면접에서 설명할 근거가 ${a.evidence.ready.length}개 영역에 섰습니다. 근거는 한 일 → 직접 정한 것 → 남긴 것 → 견준 것 의 차례로 읽습니다.`
      : "근거가 선 영역은 아직 없습니다. 근거는 한 일 → 직접 정한 것 → 남긴 것 → 견준 것 의 차례로 섭니다.",
    `${chainRows.length ? table(["영역", "한 일", "직접 정한 것", "남긴 것", "무엇과 견줬나"], chainRows.map((d) => [
      `<b>${esc(d.name)}</b>`, list(d.chain.did, "고른 항목 없음"), list(d.chain.decided, "고른 항목 없음"),
      list(d.chain.artifacts, "고른 항목 없음"), list(d.chain.verifications, "고른 항목 없음")]), "chain")
      : empty("응답에서 고른 근거 항목이 없습니다. 해 본 과제 하나를 골라 무엇을 정했고 무엇이 남았는지 근거로 고르면 이 표가 섭니다.")}
<p class="muted">칸의 글은 응답에서 고른 체크리스트 문장 그대로입니다. 근거가 선다는 것은 그 영역에서 꼭 보는 판단이 확인되고 남은 결과물이 있을 때입니다.</p>
<ul class="facts">
 <li>공통 경험 입력: ${a.evidence.experiences.length ? esc(a.evidence.experiences.map((e) => e.title).join(" / ")) : "아직 없음"}</li>
 <li>기업탐방 기록 ${a.evidence.visitsObserved}건 · 직접 해 본 활동이 있는 기록 ${a.evidence.visitsDid}건 · 경험으로 옮긴 기록 ${a.evidence.visitsLinked}건 (탐방 기록은 판정에 들어가지 않습니다)</li>
</ul>`);

  const ch4 = chapter(4, "관심 산업·직무", "학생이 고른 것과, 응답으로 확인된 영역에서 이어진 것을 갈라 적습니다.",
    `<div class="two"><div><h3>산업</h3>${a.interests.industries.length ? `<ul class="tags">${a.interests.industries.map((i) =>
      `<li class="${i.from === "PICKED" ? "pick" : "der"}">${esc(i.name)}<small>${i.from === "PICKED" ? "고름" : "확인된 영역에서 이어짐"}</small></li>`).join("")}</ul>` : empty("고른 산업도 이어진 산업도 없습니다.")}</div>
<div><h3>직무</h3>${a.interests.roles.length ? `<ul class="tags">${a.interests.roles.map((x) =>
      `<li class="${x.from === "PICKED" ? "pick" : "der"}">${esc(x.name)}<small>${x.from === "PICKED" ? "고름" : "확인된 영역에서 이어짐"}</small></li>`).join("")}</ul>` : empty("고른 직무도 이어진 직무도 없습니다.")}</div></div>
${a.interests.orgs.length ? `<p>관심 조직 유형: ${esc(a.interests.orgs.join(" · "))}</p>` : ""}`,
    { flow: true, foot: "‘이어짐’은 그 Core 의 관계표에서 확인된 영역이 그 직무·산업의 중심 영역일 때입니다. 적합도나 합격 가능성이 아니고, 특정 기업을 추천하지 않습니다." });

  /* 5 */
  const ch5 = chapter(5, "직무 요구사항과 Gap", a.link.role
      ? `${a.link.role} 직무의 중심 영역마다, 그 자리가 보는 판단 가운데 응답으로 확인된 것과 비어 있는 것을 셉니다.`
      : "이어 볼 직무가 아직 없습니다. 직무를 고르거나 확인된 판단이 생기면 이 표가 섭니다.",
    (a.link.rows.length ? table(["중심 영역", "그 직무가 보는 판단", "지금 상태", "확인/전체", "다음 할 일"],
      a.link.rows.map((x) => [`<b>${esc(x.domain)}</b>`, esc(x.needs), esc(x.state), x.all ? `<b>${x.hit}</b>/${x.all}` : "—", esc(x.next)]), "wide") : "")
    + `<h3>준비가 필요한 영역</h3>${a.gaps.length ? `<ul class="gaps">${a.gaps.map((g) => `<li><b>${esc(g.domains)}</b>${esc(g.title)}<small>${esc(g.why)}</small></li>`).join("")}</ul>` : empty("결과 모델이 적은 빈자리가 없습니다.")}`,
    { foot: "중심 영역과 그 직무가 보는 판단은 그 Core 의 관계표에서 왔고 기업 채용 자료가 아닙니다. 채용 공고 · 기업 요구 수준은 확인하지 않았습니다." });

  /* 6 */
  const visitBlock = (v: KusAnalysis["visits"][number]) => `<div class="visit">
 <p class="vh"><b>${esc(v.company)}</b>${v.test ? `<span class="tag t">테스트</span>` : ""}${v.confirmed ? "" : `<span class="tag u">기업 확인 전</span>`}<span class="tag ${v.did.length ? "d" : "o"}">${v.did.length ? "직접 해 봄" : "관찰만"}</span>${v.linked ? `<span class="tag l">경험으로 옮김</span>` : ""}<small>${esc(v.on ?? "날짜 미기록")} · 관찰한 직무 ${esc(v.roles.join(", ") || "—")}</small></p>
 <div class="ovd">
  <div><p class="ovh">본 것</p><p>${esc(v.observed.join(" / ") || "—")}</p><p class="muted">이해한 것: ${esc(v.understood ?? "적지 않음")}</p></div>
  <div><p class="ovh">직접 해 본 것</p><p>${esc(v.did.join(" / ") || "없음 · 관찰만 했습니다")}</p><p class="muted">새로 안 것: ${esc(v.learned ?? "적지 않음")}</p></div>
  <div><p class="ovh">확인할 것</p>${v.verify.length ? `<ul>${v.verify.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">이은 전공 영역이 없어 검사 상태와 견줄 수 없습니다.</p>`}</div>
 </div>
</div>`;
  const ch6 = chapter(6, "탐방 경험과 직무 연결", a.visits.length
      ? `기업탐방 ${a.visits.length}건을 본 것 · 직접 해 본 것 · 확인할 것으로 가릅니다. 확인할 것은 학생이 이은 전공 영역의 검사 상태에서 나옵니다.`
      : "아직 남긴 탐방 기록이 없습니다.",
    a.visits.length ? a.visits.map(visitBlock).join("") : empty("탐방을 다녀오면 KUS 홈의 ‘기업탐방 기록’에서 남길 수 있습니다. 등록된 탐방 기업이 없으면 담당자가 등록한 뒤에 고를 수 있습니다."),
    { flow: true, foot: "방문했다는 사실만으로 직무 역량을 판정하지 않습니다. 검사 상태는 탐방 기록으로 바뀌지 않고, 직접 해 본 활동을 경험으로 옮겨야 판정에 들어갑니다." });

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
  const ch7 = chapter(7, "자기소개서·면접 활용", "문장을 대신 써 주지 않습니다. 응답에서 고른 항목으로 문단의 뼈대를 세우고, 비어 있는 칸은 직접 채울 자리로 남깁니다.",
    `<h3>자기소개서 한 문단의 구조</h3>${structure.length ? table(["칸", "응답에서 온 것 · 채울 것"], structure, "kv2") : empty("검사에서 꺼낼 경험이 아직 확인되지 않았습니다.")}
${st ? `<p class="muted">공통 결과지의 활용 문장: ${esc(st.application)}</p>` : ""}
<h3>면접에서 받을 질문</h3>${qs.length ? `<ol class="qs">${qs.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>` : empty("꺼낼 경험이 생기면 질문이 섭니다.")}
${a.application.frame.length ? `<h3>경험 번역 단계에서 고른 답</h3>${table(["칸", "고른 답"], a.application.frame.map((f) => [esc(f.label), esc(f.items.join(" / "))]))}` : ""}
<h3>탐방 기록에서 꺼낼 초안</h3>${vd ? `<p class="draft">${esc(vd.letter)}</p>
${table(["면접 질문", "답의 뼈대"], vd.interview.map((q) => [esc(q.q), esc(q.frame)]))}
<p class="muted">${esc(vd.cautions.join(" "))}</p>` : empty("탐방 기록이 생기면 이 자리에 초안이 섭니다.")}`,
    { foot: "수치 · 기간 · 결과는 학생이 직접 적습니다. ‘(적을 칸)’과 회색 칸은 응답에 없어서 비워 둔 자리입니다." });

  /* 8 */
  const col = (t: string, xs: PlanItem[]) => `<div class="pcol"><p class="ph">${t}</p>${xs.length
    ? `<ol>${xs.map((x) => `<li><span class="src">${esc(x.from)}</span>${esc(x.do)}<small><b>끝난 기준</b> ${esc(x.done)}</small></li>`).join("")}</ol>`
    : `<p class="empty">이 때에 낸 할 일이 없습니다.</p>`}</div>`;
  const ch8 = chapter(8, "30·60·90일 실행 계획", "결과 모델이 정한 때(지금 · 다음 · 나중)를 30·60·90일로 옮기고, 탐방 기록의 상태에서 나온 할 일을 더했습니다. 할 일마다 끝났다고 볼 기준을 붙였습니다.",
    `<div class="plan">${col("30일", a.plan.d30)}${col("60일", a.plan.d60)}${col("90일", a.plan.d90)}</div>
${a.actions.some((x) => x.note) ? `<p class="muted">${esc([...new Set(a.actions.map((x) => x.note).filter(Boolean))].slice(0, 3).join(" "))}</p>` : ""}`);

  const limits = `<section class="ch lim flow"><header class="ch-h"><span class="no">—</span><div><p class="kick">APPENDIX</p><h2>근거와 한계</h2></div></header>
${table(["무엇", "출처 · 상태"], [
    ["검사", `${esc(s.core)} · 문항 ${esc(meta.modules.item_bank_version ?? "?")} · 채점 ${esc(meta.modules.scoring_version ?? "?")} · 결과 모델 ${esc(meta.modules.result_model_version ?? "?")}. 규준과 인지면접 전이라 <b>검증된 검사가 아닙니다</b>.`],
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
<meta name="robots" content="noindex"><title>${esc(s.university)} · ${esc(s.name)} · CareerMatri 리포트</title><style>${CSS}</style></head><body>
${meta.test ? `<div class="testbar">테스트 데이터 · 실제 학생이 아닙니다</div>` : ""}
${cover}${ch1}${ch2}${ch3}${ch4}${ch5}${ch6}${ch7}${ch8}${limits}
</body></html>`;
}

const CSS = `
@page{size:A4;margin:13mm 13mm 15mm}
:root{--navy:#0d2240;--navy2:#16325c;--ink:#0f1b2d;--ink2:#41506a;--mute:#66748a;--line:#dfe5ee;--soft:#f4f7fb;--blue:#1c5fb0;--gold:#b88a2e;--green:#0f766e;--amber:#9a5b00;--red:#a12f2f}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--ink);font-family:"Pretendard","Noto Sans KR","Noto Sans CJK KR","WenQuanYi Zen Hei",system-ui,sans-serif;font-size:9.6pt;line-height:1.55;word-break:keep-all;overflow-wrap:anywhere}
.testbar{position:fixed;top:0;left:0;right:0;background:#fff3d6;color:#6b4300;font-size:8pt;text-align:center;padding:2px;z-index:9;border-bottom:1px solid #f1d9a0}
.cover{min-height:265mm;background:linear-gradient(160deg,var(--navy),var(--navy2));color:#fff;border-radius:10px;padding:20mm 16mm 13mm;display:flex;flex-direction:column;break-after:page}
.cover .brand{margin:0;font-size:9pt;letter-spacing:.08em;opacity:.8;text-transform:uppercase}
.cover h1{margin:14mm 0 4mm;font-size:30pt;letter-spacing:-.02em;line-height:1.15}
.cover h1 small{display:block;font-size:13pt;font-weight:500;opacity:.85;margin-top:6px;letter-spacing:0}
.cover .who{margin:0 0 9mm;opacity:.88}
.cover .headline{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:12px 14px}
.cover .badge{display:inline-block;margin:0 0 6px;padding:1px 10px;border-radius:999px;background:var(--gold);color:#1b1300;font-size:8.5pt;font-weight:700}
.cover .headline .t{margin:0;font-size:14pt;font-weight:700;line-height:1.4}.cover .headline .l{margin:6px 0 0;opacity:.85;font-size:9.5pt}
.cover .basis{display:inline-block;margin:8px 0 0;padding:1px 9px;border-radius:999px;font-size:8.2pt;font-weight:700;background:rgba(255,255,255,.14)}
.cover .basis.b0{background:#fde8e8;color:#7a1f1f}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:8mm 0 3mm}
.kpis div{background:rgba(255,255,255,.07);border-radius:8px;padding:8px 10px}.kpis b{display:block;font-size:20pt;line-height:1.1}.kpis span{font-size:7.8pt;opacity:.8}
.kpinote{margin:0;font-size:8pt;opacity:.7}
.toc{list-style:none;padding:0;margin:auto 0 8mm;columns:2;column-gap:12mm}.toc li{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.14);font-size:10pt;break-inside:avoid}
.toc span{display:inline-block;width:22px;color:var(--gold);font-weight:700}
.cover .meta{margin:0;font-size:7.6pt;opacity:.6}
.ch{break-before:page;padding-top:2mm}.ch.flow{break-before:auto;margin-top:9mm}
.ch-h{display:flex;gap:12px;align-items:center;border-bottom:2px solid var(--navy);padding-bottom:7px;margin-bottom:9px}
.ch-h .no{font-size:22pt;font-weight:800;color:var(--navy);line-height:1;min-width:40px}
.ch-h .kick{margin:0;font-size:7.5pt;letter-spacing:.14em;color:var(--gold);font-weight:700}
.ch-h h2{margin:0;font-size:16pt;letter-spacing:-.01em}
.lead{font-size:10.8pt;font-weight:600;margin:0 0 9px;color:var(--navy)}
h3{font-size:10.3pt;margin:12px 0 5px;color:var(--navy2)}
p{margin:0 0 7px}
.rel{border:1px solid var(--line);border-radius:9px;padding:10px 12px;margin:0 0 8px;background:var(--soft)}.rel.b0{border-color:#efc4c4;background:#fff6f6}
.rel .rh{margin:0 0 4px;font-size:9.4pt;color:var(--ink2)}.rel table.kv{margin:0}.rel table.kv td{padding:3px 6px;border-bottom:1px solid #e6ebf2}
.rel table.kv thead{display:none}.rel table.kv td:first-child{width:52mm;color:var(--ink2)}
.caution{margin:7px 0 0;padding:6px 9px;border-left:3px solid var(--red);background:#fff;color:#6e1e1e;font-size:9pt}
.warn{background:#fff7ea;border-left:3px solid #d99a2b;padding:6px 10px;color:#6b4300;font-size:9pt}
.next{background:#eef5ff;border-left:3px solid var(--blue);padding:8px 11px}
.zl{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:5px 12px}.zl li{border-bottom:1px solid #edf1f6;padding:4px 0}.zl b{margin:0 6px}.zl small{display:block;color:var(--mute);font-size:8.3pt}
table{width:100%;border-collapse:collapse;margin:4px 0 7px;font-size:8.8pt}th{text-align:left;color:var(--ink2);font-weight:600;border-bottom:1.5px solid var(--line);padding:4px 6px;background:var(--soft)}
td{border-bottom:1px solid #edf1f6;padding:4px 6px;vertical-align:top}tr{break-inside:avoid}
.zone{display:inline-block;padding:1px 8px;border-radius:999px;font-size:8pt;font-weight:700;white-space:nowrap;background:#eef1f5;color:var(--ink2)}
.zone.z1{background:#e3f4f1;color:var(--green)}.zone.z2{background:#eaf2fd;color:var(--blue)}.zone.z3{background:#f3efe6;color:#6a5a2f}.zone.z4{background:#fbeeee;color:var(--red)}
.dom{border:1px solid var(--line);border-radius:9px;padding:8px 11px 4px;margin:0 0 8px}.dh,.ch-h,.lead,h3{break-after:avoid}
.dh{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 3px}.dh b{font-size:10.6pt}.dh small{color:var(--mute);font-size:8.2pt}
table.axes td:first-child{width:27mm;white-space:nowrap}table.axes td:nth-child(3){width:21mm}
.req{margin-left:4px;font-size:7pt;color:var(--amber);border:1px solid #e8cf9f;border-radius:4px;padding:0 3px}
.st{font-size:8pt;font-weight:700;white-space:nowrap}.st.s3{color:var(--green)}.st.s2{color:var(--blue)}.st.s1{color:var(--ink2)}.st.s0{color:#9aa5b5}
.why{font-size:8.6pt;color:var(--amber);margin:0 0 4px}.rest{font-size:8.5pt;color:var(--ink2);margin:0 0 4px}
.dict{font-size:8.3pt;color:var(--ink2);margin:0 0 5px}.dict span{display:inline-block;color:var(--mute);margin-right:5px;font-weight:600}
table.chain td:first-child{width:24mm}
.muted{color:var(--mute);font-size:8.4pt}.empty{color:var(--mute);background:var(--soft);border:1px dashed var(--line);border-radius:8px;padding:7px 10px;font-size:9pt}
.foot{margin-top:10px;padding-top:6px;border-top:1px solid var(--line);color:var(--mute);font-size:8pt}
.facts{margin:0;padding-left:18px}.facts li{margin:3px 0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.tags{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}.tags li{border:1px solid var(--line);border-radius:8px;padding:4px 9px;font-weight:600}
.tags li small{display:block;font-weight:500;color:var(--mute);font-size:7.8pt}.tags li.pick{border-color:#bcd6f2;background:#f3f8ff}
.gaps{list-style:none;padding:0;margin:0}.gaps li{border:1px solid var(--line);border-left:3px solid var(--amber);border-radius:6px;padding:6px 10px;margin:0 0 5px;break-inside:avoid}
.gaps b{display:block;color:var(--amber);font-size:8.5pt}.gaps small{display:block;color:var(--ink2);font-size:8.5pt;margin-top:2px}
.visit{border:1px solid var(--line);border-radius:8px;padding:8px 11px;margin:0 0 8px;break-inside:avoid}
.vh{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px}.vh b{font-size:10.6pt}.vh small{margin-left:auto;color:var(--mute)}
.ovd{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:10px}.ovd>div{border-top:2px solid var(--line);padding-top:4px}.ovd>div:nth-child(2){border-color:#9fd3c9}.ovd>div:nth-child(3){border-color:#b9cff0}
.ovh{margin:0 0 3px;font-weight:700;font-size:8.6pt;color:var(--ink2)}.ovd ul{margin:0;padding-left:15px}.ovd li{margin:0 0 3px;font-size:8.6pt}
.tag{font-size:7.6pt;padding:1px 7px;border-radius:999px;font-weight:700}.tag.o{background:#eef1f5;color:var(--ink2)}.tag.d{background:#e3f4f1;color:var(--green)}.tag.l{background:#eaf2fd;color:var(--blue)}.tag.u{background:#fff3d6;color:#6b4300}.tag.t{background:#fde8e8;color:var(--red)}
table.kv2 td:first-child{width:32mm;color:var(--ink2);font-weight:600}
.slot{display:inline-block;color:#7a8698;background:#eef1f5;border-radius:4px;padding:0 5px;font-size:8.2pt}
.qs{margin:0;padding-left:18px}.qs li{margin:0 0 4px}
.draft{background:var(--soft);border-radius:8px;padding:9px 12px;line-height:1.7}
.plan{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.pcol{border:1px solid var(--line);border-radius:8px;padding:9px 11px;break-inside:avoid}
.pcol .ph{margin:0 0 6px;font-size:13pt;font-weight:800;color:var(--navy)}.pcol ol{margin:0;padding-left:16px}.pcol li{margin:0 0 8px;font-size:8.9pt}
.pcol li small{display:block;color:var(--ink2);font-size:8pt;margin-top:2px}.pcol li small b{color:var(--green)}
.src{display:inline-block;font-size:7pt;color:var(--mute);border:1px solid var(--line);border-radius:4px;padding:0 3px;margin-right:4px}
@media screen{body{background:#eef1f5;padding:24px 12px}.cover,.ch{max-width:820px;margin:0 auto 18px;background:#fff;border-radius:10px;padding:26px 28px}.cover{background:linear-gradient(160deg,var(--navy),var(--navy2));min-height:auto}.ch.flow{margin-top:0}.testbar{position:sticky}}
@media screen and (max-width:640px){body{padding:12px 0}.cover,.ch{border-radius:0;padding:20px 16px}.cover h1{font-size:24pt}.kpis{grid-template-columns:repeat(2,1fr)}.two,.plan,.ovd,.zl{grid-template-columns:1fr}table{display:block;overflow-x:auto}.toc{columns:1}}
`;
