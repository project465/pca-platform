/**
 * 07 실행 로드맵 · 부록.
 */
import type { Inputs } from "./types";
import { AXES, type X } from "./derive";
import { C, chain, gantt } from "./charts";
import { E, H, PAL, T, band, card, chips, lines, note, paginate, rowsOf, ul, type Page } from "./kit";
import { GAP_KIND, GAP_WHY, HORIZON_DAYS, actionHead, actionLine, actionOutput, andJoin, j } from "./text";

const P = (title: string, body: string): Page => ({ part: "07", partName: "실행 로드맵", title, body });
const A = (title: string, body: string): Page => ({ part: "", partName: "부록", title, body });

export function prioPages(x: Inputs, d: X): Page[] {
  const gs = d.gaps.slice(0, 6);
  if (!gs.length) {
    const acts = x.m.actions.slice(0, 3);
    return [P("먼저 할 일",
      T("비어 있는 판단으로 잡힌 자리는 없습니다", "결과 모델이 빈자리를 잡지 않았습니다. 남은 일은 확인된 근거를 설명할 문장으로 옮기는 것입니다.") +
      (acts.length ? acts.map((a) => card(`<p class="k">${E(HORIZON_DAYS[a.horizon])}</p><h4>${E(actionHead(a, a.domain ? d.name(a.domain) : "관심 영역"))}</h4><p>${E(actionLine(a, a.domain ? d.name(a.domain) : "관심 영역", a.domain ? d.def(a.domain) : undefined))}</p>`)).join("") : lines(6, "이번 학기에 정리할 경험 하나")))];
  }
  const goal = d.goalRole ? `${d.goalRole.name_ko} 직무` : d.goalInd ? `${d.goalInd.name_ko} 산업` : `${x.major} 전공의 다음 경험`;
  return paginate(gs, () => 1, 3).map((chunk, k) => P(`먼저 채울 판단${k ? ` (${k + 1})` : ""}`,
    (k ? `<p class="k">먼저 채울 판단 · 이어서</p>` : T(`먼저 채울 판단 ${gs.length}가지를 급한 차례로 놓았습니다`, `차례는 결과 모델이 정한 빈자리의 차례입니다. 줄마다 목표, 지금 결과, 할 일, 남길 것으로 이어집니다. 목표는 ${E(goal)}입니다.`)) +
    chunk.map((g, i) => {
      const a = d.actionOf(g);
      const dn = d.name(g.domain), def = d.def(g.domain);
      return `<div class="prio"><div class="prio-h"><span>${k * 3 + i + 1}</span><b>${E(dn)}${g.axis ? ` · ${E(d.axisName(g.axis))}` : ""}</b><span class="mut">${a ? `${E(HORIZON_DAYS[a.horizon])} 안에` : ""}</span></div>
        ${chain([
          { head: "목표", body: goal, color: C.navy },
          { head: "지금 결과", body: GAP_KIND[g.kind], color: C.blue },
          { head: "할 일", body: a ? actionHead(a, dn) : "할 일 정하기", color: C.teal },
          { head: "남길 것", body: a ? actionOutput(a, def) : (def?.artifacts[0] ?? "결과 문서"), color: C.amber },
        ], { width: 700, height: 100 })}
        <p class="sm">${E(GAP_WHY[g.why])}. ${a ? E(actionLine(a, dn, def)) : ""}</p></div>`;
    }).join("")));
}

export function ganttPage(x: Inputs, d: X): Page {
  const acts = x.m.actions.slice(0, 8);
  const span: Record<string, [number, number]> = { NOW: [1, 30], NEXT: [31, 60], LATER: [61, 90] };
  const rows = acts.map((a, i) => ({ label: actionHead(a, a.domain ? d.name(a.domain) : "관심 영역"), from: span[a.horizon][0], to: span[a.horizon][1], color: [PAL.blue, PAL.coral, PAL.teal, PAL.violet][i % 4], note: actionOutput(a, a.domain ? d.def(a.domain) : undefined) }));
  return P("90일 실행 간트",
    T(acts.length ? `90일 동안 할 일 ${acts.length}가지와 남길 것을 놓았습니다` : "90일 계획은 직접 세웁니다", "할 일의 때는 결과 모델이 정한 그대로입니다(지금 · 다음 과제에서 · 한 번 더 볼 것). 막대 안의 글은 끝냈을 때 손에 남는 것입니다.") +
    (rows.length ? `<div class="wide-art">${gantt(rows, { width: 710, label: 250 })}</div>` : "") +
    `<table class="tb tb-xs"><thead><tr><th>기간</th><th>할 일</th><th>남길 것</th></tr></thead><tbody>${acts.map((a) => `<tr><td class="w18">${E(HORIZON_DAYS[a.horizon])}</td><td><b>${E(actionHead(a, a.domain ? d.name(a.domain) : "관심 영역"))}</b><br><span class="mut">${E(actionLine(a, a.domain ? d.name(a.domain) : "관심 영역", a.domain ? d.def(a.domain) : undefined))}</span></td><td class="w22">${E(actionOutput(a, a.domain ? d.def(a.domain) : undefined))}</td></tr>`).join("")}</tbody></table>` +
    band("한 기간에", "결과물 둘보다 많이 잡지 않습니다. 끝낸 할 일은 내 CareerMatri의 경험 기록에 더합니다."));
}

export function longPage(x: Inputs, d: X): Page {
  const s0 = d.strengths[0] ? d.name(d.strengths[0].code) : null;
  const next = x.m.domains.find((z) => z.interest === "HIGH" && !["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE"].includes(z.zone));
  const months = [
    { when: "4개월", what: `90일 동안 남긴 결과물을 경험 기록에 더하고 현재 상태를 다시 봅니다`, out: "갱신된 현재 상태" },
    { when: "6개월", what: `${s0 ? `${j(s0, "을를")} 중심으로 ` : ""}포트폴리오 첫 장을 정리합니다`, out: "포트폴리오 첫 장" },
    { when: "9개월", what: next ? `관심이 높은 ${d.name(next.code)}에서 두 번째 과제를 해 봅니다` : "두 번째 영역에서 과제 하나를 해 봅니다", out: "두 번째 영역의 결과물" },
    { when: "12개월", what: "같은 검사를 다시 보고 이번 결과와 영역·판단 단위로 비교합니다", out: "두 결과의 비교" },
  ];
  return P("6개월 · 12개월",
    T("6개월 뒤에는 포트폴리오 첫 장을, 12개월 뒤에는 다시 검사해 달라진 점을 봅니다", "90일 계획 뒤에 이어지는 길입니다. 분기마다 결과물 하나씩을 남기도록 적었습니다.") +
    chain(months.map((v, i) => ({ head: v.when, body: v.what, color: [PAL.blue, PAL.teal, PAL.amber, PAL.coral][i] })), { width: 700, height: 150 }) +
    `<table class="tb tb-s"><thead><tr><th>시점</th><th>남길 것</th><th>확인할 것</th></tr></thead><tbody>${months.map((v) => `<tr><td>${E(v.when)}</td><td>${E(v.out)}</td><td></td></tr>`).join("")}</tbody></table>` +
    band("다시 검사할 때", "지난 결과는 고쳐지지 않고 그대로 남습니다. 두 결과를 나란히 놓고 무엇이 달라졌는지 봅니다."));
}

export function researchPage(x: Inputs, d: X): Page {
  const role = d.goalRole ?? d.roleOrder[0];
  const aliases = x.tax.job_aliases.filter((a) => a.td.some((t) => role.core_ref.td.includes(t))).slice(0, 6).map((a) => a.posting_name);
  return P("직무를 직접 알아보는 다섯 걸음",
    T("직무 이름보다 공고의 ‘담당 업무’ 문장을 모으는 것이 먼저입니다", `${E(role.name_ko)} 쪽을 알아볼 때의 순서입니다. 검색어는 이 전공 사전의 공고 이름에서 가져왔습니다.`) +
    `<ol class="lo big">
      <li><b>공고 다섯 건 모으기</b><span>${aliases.length ? `‘${E(aliases.join("’ · ‘"))}’ 같은 이름으로 찾습니다.` : "직무 이름으로 찾습니다."} 회사가 달라도 됩니다.</span></li>
      <li><b>담당 업무 문장 옮기기</b><span>다섯 건에서 두 번 이상 나온 업무 문장만 표에 옮깁니다.</span></li>
      <li><b>내 근거 붙이기</b><span>문장마다 이 리포트의 고른 근거나 경험 기록 하나를 붙입니다. 붙일 것이 없으면 비워 둡니다.</span></li>
      <li><b>빈칸 고르기</b><span>비어 있는 줄 가운데 하나를 07장의 할 일로 옮깁니다.</span></li>
      <li><b>현직자에게 묻기</b><span>학과 선배나 상담 담당자를 거쳐, 그 업무에서 신입이 맡는 범위를 물어봅니다.</span></li>
    </ol>` +
    H("공고 다섯 건 비교표", "참여자가 채웁니다") +
    `<table class="tb ws tall"><thead><tr><th>기관 · 회사</th><th>담당 업무(두 번 이상 나온 것)</th><th>필요 지식 · 기술</th><th>내 근거</th></tr></thead><tbody>${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(5)}</tbody></table>`);
}

export function weeklyPage(): Page {
  return P("주간 점검표",
    T("한 주에 한 번, 다섯 칸만 적습니다", "30일 할 일을 주 단위로 나눠 점검하는 표입니다. 네 주가 지나면 첫 결과물이 나와 있어야 합니다.") +
    `<table class="tb ws wk"><thead><tr><th style="width:7%">주</th><th>이번 주 한 일</th><th>직접 정한 것</th><th>남긴 것</th><th>막힌 것</th><th>다음 주</th></tr></thead><tbody>${[1, 2, 3, 4].map((w) => `<tr><td style="text-align:center">${w}주</td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}</tbody></table>` +
    `<div class="two">${note("막혔을 때", ul(["결과물 이름부터 정하고 칸을 먼저 만듭니다", "기준을 정하기 어려우면 버릴 안부터 적습니다", "상담 때 이 표를 그대로 가져옵니다"]))}${note("끝났을 때", ul(["결과물을 경험 기록에 더합니다", "정한 것 한 줄과 비교 대상 한 줄을 붙입니다", "현재 상태가 어떻게 바뀌었는지 확인합니다"]), true)}</div>`);
}

export function logPage(x: Inputs): Page {
  return P("상담 기록지",
    T("상담 기록지", `${E(x.issuer === "CareerMatri" ? "상담 담당자" : `${x.issuer} 상담 담당자`)}와 참여자가 함께 씁니다. 다음 만남에서 무엇이 달라졌는지 이 장으로 바로 비교합니다.`) +
    `<table class="tb ws big"><tbody>
      <tr><th>상담일</th><td></td><th>상담자</th><td></td></tr>
      ${["오늘 함께 본 장", "참여자가 동의한 강점", "이번에 고른 빈자리", "30일 할 일 (어디서 · 무엇을 · 무엇으로 남길지)", "연계할 지원 사업이나 프로그램", "다음 만남 · 가져올 것"].map((h) => `<tr><th>${h}</th><td colspan="3"></td></tr>`).join("")}
    </tbody></table>` + band("개인정보", "기록지에는 참여자의 연락처를 적지 않습니다. 기관의 상담 기록 규정을 따릅니다."));
}

/* ── 부록 ── */

export function answersPage(x: Inputs, d: X): Page {
  const W = ["없음", "지시", "직접", "기준"];
  return A("응답 요약",
    T("응답 요약", "영역과 판단마다 결과 모델이 정한 단계입니다. 빈 칸은 이번에 묻지 않은 칸입니다.") +
    `<table class="tb tb-xs"><thead><tr><th>영역</th>${AXES.map((a) => `<th style="font-size:7.2pt">${E(d.axisName(a))}</th>`).join("")}<th>묶음</th></tr></thead><tbody>${x.m.domains.map((z) => `<tr><td><b>${E(d.name(z.code))}</b></td>${d.levels(z.code).map((v) => `<td class="c${v == null ? " mut" : ""}">${v == null ? "" : W[v]}</td>`).join("")}<td class="sm">${E(({ Z1_EVIDENCE_ESTABLISHED: "근거 갖춤", Z2_EVIDENCE_INCOMPLETE: "근거 일부", Z3_EVIDENCE_LOW_INTEREST: "관심 낮음", Z4_INSUFFICIENT_EVIDENCE: "경험 적음", NOT_EXPLORED: "깊게 묻지 않음" } as Record<string, string>)[z.zone] ?? "")}</td></tr>`).join("")}</tbody></table>` +
    H("영역을 가리지 않는 판단", "공통 판단 문항") +
    `<table class="tb tb-xs"><thead><tr><th>판단</th><th>해 봤다고 답함</th><th>직접 정하고 결과가 쓰임</th></tr></thead><tbody>${x.m.common.axes.map((c) => `<tr><td>${E(d.axisName(c.axis))}</td><td>${c.confirmed ? "예" : "아직"}</td><td>${c.owned ? "예" : "아직"}</td></tr>`).join("")}</tbody></table>`);
}

export function tracePages(x: Inputs, d: X): Page[] {
  type Row = { sec: string; claim: string; ev: string };
  const rows: Row[] = [];
  for (const z of x.m.domains.filter((v) => v.zone !== "NOT_EXPLORED")) {
    const ev = d.evidenceOf(z);
    rows.push({ sec: "03 영역별 해설", claim: `${d.name(z.code)}: ${({ Z1_EVIDENCE_ESTABLISHED: "근거 갖춤", Z2_EVIDENCE_INCOMPLETE: "근거 일부", Z3_EVIDENCE_LOW_INTEREST: "경험은 있고 관심 낮음", Z4_INSUFFICIENT_EVIDENCE: "관심 높음 · 경험 적음" } as Record<string, string>)[z.zone]}`, ev: [...ev.decisions, ...ev.artifacts, ...ev.comparisons].slice(0, 4).join(" · ") || `확인된 판단 ${z.confirmed.length}가지 (응답)` });
  }
  for (const g of d.gaps.slice(0, 6)) rows.push({ sec: "07 실행 로드맵", claim: `${d.name(g.domain)}${g.axis ? ` · ${d.axisName(g.axis)}` : ""}: 먼저 채울 판단`, ev: `${GAP_KIND[g.kind]} · ${GAP_WHY[g.why]}` });
  if (d.goalRole) rows.push({ sec: "04 직무 탐색", claim: `목표 직무: ${d.goalRole.name_ko}`, ev: "응답에서 적어 둔 목표" });
  if (d.goalInd) rows.push({ sec: "04 직무 탐색", claim: `목표 산업: ${d.goalInd.name_ko}`, ev: "응답에서 적어 둔 목표" });
  for (const e of x.exps.slice(0, 3)) rows.push({ sec: "03 경험 기록", claim: e.title, ev: [...e.decisions, ...e.artifacts].slice(0, 3).join(" · ") || "경험 기록" });
  return paginate(rows, (r) => Math.max(rowsOf(r.ev, 40), rowsOf(r.claim, 22)), 34, 29).map((chunk, k) => A(`결론과 근거 추적${k ? ` (${k + 1})` : ""}`,
    (k ? `<p class="k">결론과 근거 추적 · 이어서</p>` : T("이 리포트의 결론은 근거를 되짚을 수 있습니다", "주요 결론마다 어느 응답과 근거에서 나왔는지 적었습니다.")) +
    `<table class="tb tb-xs"><thead><tr><th class="w18">장</th><th class="w34">결론</th><th>근거</th></tr></thead><tbody>${chunk.map((r) => `<tr><td>${E(r.sec)}</td><td><b>${E(r.claim)}</b></td><td class="mut">${E(r.ev)}</td></tr>`).join("")}</tbody></table>`));
}

export function sourcesPage(x: Inputs, d: X, regionSources: string[]): Page {
  const gs = x.guide.status === "OK" ? "직무 여덟의 일반 안내" : x.guide.status === "PARTIAL" ? `직무 ${Object.keys(x.guide.roles).length}개의 일반 안내(나머지는 직무팩 자료만 실음)` : "안내 준비 중(직무팩 자료만 실음)";
  return A("출처와 확인 범위",
    T("출처와 확인 범위") +
    `<table class="tb tb-s"><thead><tr><th>자료</th><th>무엇에 썼나</th><th>기준</th></tr></thead><tbody>
      <tr><td><b>CareerMatri 검사 응답 · 결과 모델</b></td><td>판단 단계, 영역 묶음, 빈자리, 할 일</td><td>${E(x.answeredOn)} 응답, 고정된 결과</td></tr>
      <tr><td><b>참여자 경험 기록</b></td><td>시간축, 교차 확인, 자기소개서 재료</td><td>결과를 굳힌 ${E(x.builtOn)}까지 저장된 기록 ${x.exps.length}건</td></tr>
      <tr><td><b>${E(x.major)} 전공 사전</b></td><td>영역의 일 흐름, 결과물, 공고 이름, 경계, 조직 유형</td><td>${E(x.m.provenance.module_versions.core_version ? "결과에 적힌 판본" : "")}</td></tr>
      <tr><td><b>${E(x.major)} 직무팩 · 산업팩 · 관계표</b></td><td>직무와 산업이 쓰는 영역, 묻는 판단</td><td>결과에 적힌 판본</td></tr>
      <tr><td><b>직무 일반 안내</b></td><td>${E(gs)}</td><td>측정과 채점에 쓰이지 않음</td></tr>
      ${regionSources.map((s) => `<tr><td><b>지역 자료</b></td><td>${E(s)}</td><td>공개 자료</td></tr>`).join("")}
    </tbody></table>` +
    H("싣지 않은 것") + `<div class="two"><div>${ul(["제3자 기업정보 서비스의 신용·재무 자료", "채용 계획, 채용 인원, 근무지", "보도로만 확인한 사업장"])}</div><div>${ul(["참여자의 학번과 연락처", "다른 참여자와 견준 순위", "임금과 연봉 정보"])}</div></div>` +
    band("판본", "검사지와 판단 규칙과 결과 모델의 판본은 이 결과와 함께 저장되어 있어, 같은 응답으로 같은 결과를 다시 만들 수 있습니다."));
}

export function methodPage(x: Inputs, d: X): Page {
  return A("방법과 한계",
    T("이 검사가 하는 일과 하지 않는 일") +
    `<div class="two">
      ${card(`${H("하는 일")}${ul([`${d.counts.domains}가지 ${E(x.domainWord)}마다 관심과 경험과 배울 뜻을 묻고, 고른 영역에서 판단 여덟 가지를 깊게 묻습니다.`, "응답과 체크리스트 근거가 함께 있어야 ‘기준까지 직접 결정’으로 올립니다.", "결과 모델이 정한 빈자리만 할 일로 만듭니다.", "같은 응답이면 언제나 같은 결과가 나옵니다. 문장은 정해진 규칙으로 만듭니다."])}`)}
      ${card(`${H("하지 않는 일")}${ul(["직무 적합도와 연봉, 합격 가능성은 계산하지 않습니다.", "다른 참여자와 견준 순위를 내지 않습니다(규준이 아직 없습니다).", "성격이나 적성 유형을 진단하지 않습니다.", "취업 알선을 하지 않고, 회사를 골라 보내지 않습니다."])}`)}
    </div>` +
    H("결과가 만들어지는 길") + chain([
      { head: "응답", body: "영역마다 관심과 경험, 판단 여덟 가지의 단계", color: C.navy }, { head: "근거", body: "체크리스트에서 고른 장면과 결과물", color: C.blue },
      { head: "단계", body: "응답과 근거가 함께 있을 때만 올린다", color: C.teal }, { head: "묶음", body: "필수 판단과 결과물로 영역을 나눈다", color: C.amber },
      { head: "할 일", body: "비어 있는 판단에서 고른다", color: C.rose },
    ], { width: 700, height: 118 }) +
    H("검증 상태") + `<p>이 검사는 문항 설계와 판정 규칙의 내부 점검을 마쳤고, 전공자 검토와 실제 참여자 파일럿을 진행하는 단계입니다. 그래서 ‘검증된 검사’로 소개하지 않습니다. 파일럿 결과가 쌓이면 판본 정보와 함께 공개합니다.</p>`);
}

export function wordsPage(x: Inputs, d: X): Page {
  const ws: [string, string][] = [
    [x.domainWord, `${x.major} 일을 ${d.counts.domains}가지로 나눈 것. ${x.m.domains.map((z) => d.name(z.code)).join(", ")}`],
    ["판단", `일 안에서 되풀이되는 결정 여덟 가지. ${AXES.map((a) => d.axisName(a)).join(", ")}`],
    ["단계", "한 판단을 얼마나 깊이 해 봤는지. 해 본 적 없음, 지시받아 수행, 직접 수행, 기준까지 직접 결정"],
    ["근거 갖춤", "직접 판단한 일과 남긴 결과물이 함께 확인되는 영역"],
    ["근거 일부", "해 본 일은 확인되지만 결과물이나 비교 기록이 아직 적은 영역"],
    ["빈자리", "결과 모델이 먼저 채울 것으로 고른 판단 칸"],
    ["결과물", "판단을 다른 사람이 읽고 쓸 수 있게 남긴 표나 문서"],
    ["경험 기록", "참여자가 플랫폼에 직접 적어 둔 활동. 검사 응답과 따로 받는다"],
    ["직무 안내", "직무가 일반적으로 하는 일에 대한 설명. 개인 판정이 아니다"],
    ["OpenDART", "금융감독원 전자공시시스템의 공개 자료. 기업개황과 사업보고서를 볼 수 있다"],
    ["사업보고서", "상장사가 해마다 공시하는 보고서. ‘사업의 내용’에 사업부문과 매출 구조가 적혀 있다"],
    ["매출액 · 영업이익", "매출액은 판 금액의 합, 영업이익은 본업에서 남긴 돈. 공시 숫자는 억 원 단위로 반올림했다"],
    ["다시 검사", "같은 검사를 다시 보아 지난 결과와 영역과 판단 단위로 비교하는 일. 지난 결과는 고쳐지지 않는다"],
  ];
  return A("용어 풀이", T("용어 풀이") + `<dl class="dl">${ws.map(([a, b]) => `<dt>${E(a)}</dt><dd>${E(b)}</dd>`).join("")}</dl>`);
}

export function closePage(x: Inputs, d: X): Page {
  const acts = x.m.actions.slice(0, 3);
  return A("맺으며",
    T("다음 단계는 이 결과를 문서와 과제로 바꾸는 일입니다", "이 리포트는 시작점입니다. 할 일 하나를 끝낼 때마다 경험 기록에 더하면 내 CareerMatri의 현재 상태가 그만큼 달라집니다.") +
    `<div class="g3">${acts.map((a, i) => card(`<p class="k">${E(HORIZON_DAYS[a.horizon])}</p><h4>${i + 1}. ${E(actionHead(a, a.domain ? d.name(a.domain) : "관심 영역"))}</h4><p class="mut">${E(actionOutput(a, a.domain ? d.def(a.domain) : undefined))}</p>`)).join("")}</div>` +
    `<div class="close-box"><p class="k">${E(x.issuer === "CareerMatri" ? "CareerMatri" : `${x.issuer} × CareerMatri`)}</p><h3>경험을 근거로, 근거를 다음 할 일로</h3><p>참여자 본인이 결과를 먼저 받고, 기관에는 동의한 경우의 개인 결과와 다섯 명 미만이면 수를 내지 않는 집계만 제공됩니다.</p></div>` +
    `<div class="two">${note("다음 상담 때 가져올 것", ul(["30일 할 일의 결과물", "주간 점검표 네 줄", "새로 적은 경험 기록 한 건"]))}${note("플랫폼에서 이어 하기", ul(["경험 기록에 결과물 더하기", "현재 상태에서 달라진 판단 확인", "12개월 뒤 다시 검사해 비교"]), true)}</div>` +
    `<p class="mut sm">CareerMatri는 직업정보제공사업 신고 사업자가 운영하며, 취업 알선을 하지 않습니다. 기업 정보는 공시와 공개 명단으로 확인한 범위만 실었습니다.</p>` +
    chips([]));
}

export const ch7 = { prioPages, ganttPage, longPage, researchPage, weeklyPage, logPage };
export const appendix = { answersPage, tracePages, sourcesPage, methodPage, wordsPage, closePage };
