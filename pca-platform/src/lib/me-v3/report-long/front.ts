/**
 * 들어가며: 겉표지 · 표지 · 이 리포트에 대해 · 읽는 법 · 상담과 함께 읽을 때.
 */
import type { Inputs } from "./types";
import { STEP_WORD, ZONE_WORD, ZONES, type X } from "./derive";
import { C, radar } from "./charts";
import { E, H, LVC, MARK, PAL, T, ZC, band, lineArt, tag, ul, type Page } from "./kit";
import { andJoin, j, q } from "./text";

const SERIES = [PAL.blue, PAL.coral, PAL.teal, PAL.violet];

export function leadOf(x: Inputs, d: X): string {
  const m = x.m;
  const names = (z: string) => m.domains.filter((v) => v.zone === z).map((v) => d.name(v.code));
  const z1 = names("Z1_EVIDENCE_ESTABLISHED"), z2 = names("Z2_EVIDENCE_INCOMPLETE"), z3 = names("Z3_EVIDENCE_LOW_INTEREST");
  const high = m.domains.filter((v) => v.interest === "HIGH").map((v) => d.name(v.code));
  switch (m.overview.headline) {
    case "EVIDENCE_READY":
      return `${andJoin(z1)}에서 스스로 정한 판단과 남긴 결과물이 함께 확인됩니다. 이 리포트는 그 근거를 지원 서류의 문장으로 옮기고, 아직 비어 있는 판단을 채우는 차례를 적었습니다.`;
    case "EVIDENCE_PARTIAL":
      return `${andJoin(z2)}에서 해 본 일이 확인됩니다. 결과물이나 비교 기록은 아직 적어서, 이 리포트는 같은 일을 한 번 더 할 때 무엇을 남기면 되는지부터 적었습니다.`;
    case "EVIDENCE_LOW_INTEREST":
      return `${andJoin(z3)}에서 해 본 일이 확인되고, 지금 관심은 다른 쪽에 있습니다. 이 리포트는 그 경험을 어디에 쓸지와 관심 쪽에서 무엇을 먼저 해 볼지를 함께 적었습니다.`;
    case "EXPLORING":
      return `${high.length ? `${andJoin(high.slice(0, 3))}에 관심이 높다고 답했고, ` : ""}직접 해 본 일은 아직 적습니다. 이 리포트는 짧은 과제로 먼저 겪어 볼 자리와 그때 남길 것을 적었습니다.`;
    default:
      return "아직 판단할 근거가 많지 않습니다. 이 리포트는 어느 영역부터 경험을 쌓을지 정하고, 그 경험을 어떻게 기록할지를 적었습니다.";
  }
}

export function outer(x: Inputs, d: X): Page {
  const lv = d.best.map((b) => b.level);
  const dept = x.department ? ` · ${x.department}` : "";
  return {
    part: "", partName: "", title: "겉표지", kind: "outer",
    body: `<div class="oc-grid"></div>
      <div class="oc-top"><span class="oc-mark">${MARK}</span><span class="oc-brand">CareerMatri</span><span class="oc-tier">${E(x.tier)}</span></div>
      <div class="oc-art bleed">${lineArt(lv)}</div>
      <div class="oc-mid">
        <p class="oc-k">${E(x.issuer === "CareerMatri" ? "CAREER ANALYSIS REPORT" : x.issuer)}</p>
        <h1 class="oc-t">진로 분석<br>리포트</h1>
        <p class="oc-s">${E(x.major)}${E(dept)}</p>
      </div>
      <div class="oc-who">
        <div><span>참여자</span><b>${E(x.person)}</b></div>
        <div><span>응답일</span><b>${E(x.answeredOn)}</b></div>
        <div><span>발행</span><b>${E(x.issuer)}</b></div>
      </div>
      <div class="oc-foot">${x.issuer !== "CareerMatri" ? `<b>${E(x.issuer)}</b><span>×</span>` : ""}<b>CareerMatri</b><em>이 리포트는 참여자 본인과, 본인이 동의한 경우의 상담 담당자만 열람합니다.</em></div>`,
  };
}

export function cover(x: Inputs, d: X): Page {
  const series = d.radarDoms.map((v, i) => ({ name: d.name(v.code), levels: d.levels(v.code), color: SERIES[i] }));
  const goal = [d.goalRole?.name_ko, d.goalInd?.name_ko].filter(Boolean).join(" · ") || "적어 두지 않음";
  return {
    part: "", partName: "", title: "표지", kind: "cover",
    body: `<div class="cv-top"><span class="cv-org">${E(x.issuer)}</span><span class="cv-s">CareerMatri 진로 분석 리포트 · ${E(x.tier)}</span></div>
      <div class="cv-mid">
        <p class="cv-k">진로 분석 결과</p>
        <h1 class="cv-t">${E(x.person)} 님의<br>${E(x.major)} 진로 분석</h1>
        <p class="cv-d">${E(leadOf(x, d))}</p>
        ${series.length ? `<div class="cv-art">${radar(d.best.map((b) => d.axisName(b.axis)), series, { size: 420, ring: false })}</div>
        <div class="cv-legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${E(s.name)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="cv-meta">
        <div><span>응답일</span><b>${E(x.answeredOn)}</b></div>
        <div><span>참여자 · 전공</span><b>${E(x.person)} · ${E(x.department ?? x.major)}</b></div>
        <div><span>목표 직무 · 산업</span><b>${E(goal)}</b></div>
        <div><span>확인한 근거</span><b>고른 항목 ${d.counts.items}개 · 결과물 ${d.counts.artifacts}개 · 경험 기록 ${d.counts.records}건</b></div>
      </div>
      <div class="cv-foot"><b>열람 안내</b>이 리포트는 참여자 본인과, 본인이 동의한 경우 ${E(x.issuer)} 상담 담당자만 열람합니다. 점수·순위·합격 가능성은 계산하지 않았습니다.</div>`,
  };
}

export function about(x: Inputs, d: X): Page {
  const n = d.counts.domains;
  return {
    part: "", partName: "들어가며", title: "이 리포트에 대해",
    body: T("해 본 일과 다음에 할 일을 적은 책입니다", "점수나 등수를 내지 않습니다. 참여자가 고른 장면과 결과물을 근거로 지금 설명할 수 있는 일과 비어 있는 일을 나누고, 그 빈자리를 채울 할 일을 적었습니다.") +
      `<div class="g3">
        <div class="card"><p class="k">재는 것</p><h4>여덟 가지 판단</h4><p>문제를 정하는 일부터 결과가 다음 결정에 쓰이는 일까지, ${E(x.major)} 일에서 되풀이되는 판단 여덟 가지를 ${n}가지 ${E(x.domainWord)}마다 읽었습니다.</p></div>
        <div class="card"><p class="k">근거</p><h4>고른 장면과 결과물</h4><p>응답만으로 정하지 않습니다. 체크리스트에서 해 본 장면과 남긴 결과물을 함께 골라야 ‘기준까지 직접 결정’ 단계로 올라갑니다.</p></div>
        <div class="card"><p class="k">내놓는 것</p><h4>할 일과 결과물 이름</h4><p>비어 있는 판단마다 어디서, 무엇을, 무엇으로 남길지 적었습니다. 90일 계획과 지원 서류 재료로 이어집니다.</p></div>
      </div>` +
      H("먼저 알아 둘 것") +
      `<div class="two"><div>${ul([
        "그래프는 모두 <b>단계 이름</b>이나 <b>센 개수</b>를 그린 것입니다. 백분율과 적합도는 계산하지 않습니다.",
        `‘이번에 깊게 묻지 않음’은 관심과 경험만 묻고 판단 여덟 가지는 묻지 않은 ${E(x.domainWord)}입니다. 경험이 없다는 뜻이 아닙니다.`,
        "결과는 응답한 날의 기록으로 고정됩니다. 경험을 더하면 내 CareerMatri의 현재 상태가 따로 바뀝니다.",
      ])}</div><div>${ul([
        "기업 정보는 공시(OpenDART)와 공개 명단으로 확인한 범위만 실었습니다. 채용 여부는 확인하지 않았습니다.",
        "이 리포트는 직업정보 제공이며 취업 알선이 아닙니다. 지원은 참여자가 직접 합니다.",
        "쓰는 칸은 비워 두었습니다. 참여자가 상담이나 혼자 정리하는 자리에서 채웁니다.",
      ])}</div></div>` +
      H("참여자 정보") +
      `<table class="tb"><tbody>
        <tr><th>이름</th><td>${E(x.person)}</td><th>응답일</th><td>${E(x.answeredOn)}</td></tr>
        <tr><th>전공</th><td>${E(x.major)}${x.department ? ` · ${E(x.department)}` : ""}</td><th>검사 등급</th><td>${E(x.tier)}</td></tr>
        <tr><th>목표</th><td colspan="3">${E([d.goalRole?.name_ko, d.goalInd?.name_ko, d.orgName(x.m.targets.goal.org)].filter(Boolean).join(" · ") || "목표 직무와 산업을 적어 두지 않았습니다")}</td></tr>
        <tr><th>경험 기록</th><td colspan="3">${x.exps.length ? x.exps.slice(0, 4).map((e) => E(e.title)).join("<br>") : "아직 적어 둔 경험 기록이 없습니다"}</td></tr>
      </tbody></table>` +
      band("열람 범위", "이 결과지는 참여자 본인과, 본인이 동의한 경우에만 기관 담당자가 봅니다. 기관에는 다섯 명 미만이면 수를 내지 않는 집계만 제공됩니다."),
  };
}

export function howToRead(x: Inputs): Page {
  return {
    part: "", partName: "들어가며", title: "읽는 법",
    body: T("그래프와 표는 네 단계와 다섯 묶음으로 읽습니다", "모든 그래프가 같은 말을 씁니다. 한 번 익혀 두면 어느 쪽에서나 같은 뜻으로 읽힙니다.") +
      H("판단 단계 넷", "방사형 그래프와 단계 칸에서 씁니다") +
      `<div class="steps4">${([0, 1, 2, 3] as const).map((k) => `<div class="st4"><div class="st4-b">${[1, 2, 3].map((jj) => `<i style="background:${k >= jj ? LVC[Math.max(1, k)] : C.l0}"></i>`).join("")}</div><b>${E(STEP_WORD[k].tag)}</b><p>${E(STEP_WORD[k].said)}</p></div>`).join("")}</div>` +
      H(`${E(x.domainWord)} 묶음 다섯`, "지도와 고리 그래프에서 씁니다") +
      `<div class="zones5">${ZONES.map((z) => `<div class="zn"><span class="zsw" style="background:${ZC[z]}"></span><div><b>${E(ZONE_WORD[z].tag)}</b><p>${E(ZONE_WORD[z].said)}</p></div></div>`).join("")}</div>` +
      H("근거의 층", "문장마다 어디서 온 말인지 나눕니다") +
      `<table class="tb"><thead><tr><th>표시</th><th>뜻</th><th>예</th></tr></thead><tbody>
        <tr><td>${tag("응답", C.navy)}</td><td>검사 문항에 답한 단계</td><td>‘직접 맡아 해 봤다’고 답함</td></tr>
        <tr><td>${tag("고른 근거", C.blue)}</td><td>체크리스트에서 직접 고른 장면과 결과물</td><td>참여자가 고른 문장 그대로</td></tr>
        <tr><td>${tag("경험 기록", C.teal)}</td><td>참여자가 플랫폼에 적어 둔 활동</td><td>수업 과제 · 캡스톤 · 실습</td></tr>
        <tr><td>${tag("전공 사전", C.amber)}</td><td>${E(x.major)} 일에 대한 일반 안내(개인 판정이 아님)</td><td>영역의 일 흐름 · 직무가 맡는 일</td></tr>
        <tr><td>${tag("공시", "#6b7486")}</td><td>OpenDART 기업개황과 사업보고서</td><td>본점 주소 · 매출액 · 직원 수</td></tr>
      </tbody></table>` +
      `<div class="two">
        <div class="note"><b>방사형 그래프</b><p>가운데가 ‘해 본 적 없음’, 바깥 고리가 ‘기준까지 직접 결정’입니다. 넓게 퍼진 쪽이 지금 설명할 수 있는 판단입니다. 면적을 점수로 바꾸지 않습니다.</p></div>
        <div class="note"><b>비어 있는 칸</b><p>이번에 묻지 않은 칸은 0으로 그리지 않고 비워 둡니다. ‘해 본 적 없음’은 물었고 없다고 답한 칸이고, ‘이번에 묻지 않음’은 묻지 않은 칸입니다.</p></div>
      </div>`,
  };
}

export function counselor(x: Inputs, d: X): Page {
  const s0 = d.strengths[0];
  const ev0 = s0 ? d.evidenceOf(s0) : null;
  const pick = ev0?.decisions[0] ?? ev0?.acts[0];
  const g0 = d.gaps[0];
  const qs = [
    pick && s0 ? `${d.name(s0.code)}에서 ${j(q(pick), "을를")} 골랐습니다. 그때 무엇을 기준으로 정했고, 다른 안은 왜 고르지 않았나요?` : null,
    g0 ? `${d.name(g0.domain)}에서 ${q(d.axisName(g0.axis ?? "J5"))} 칸이 아직 비어 있습니다. 이번 학기에 그 일을 맡아 볼 수 있는 과제가 있나요?` : null,
    d.goalRole ? `목표로 적은 ${d.goalRole.name_ko} 직무가 정하는 것(${d.goalRole.decides.slice(0, 2).join(", ")}) 가운데 이미 정해 본 것이 있나요?` : null,
    x.exps[0] ? `경험 기록 ${q(x.exps[0].title)}에서 맡은 범위는 어디까지였나요?` : null,
    "지금 가장 시간을 많이 쓰는 수업이나 활동은 무엇이고, 거기서 직접 정하는 것은 무엇인가요?",
  ].filter((v): v is string => !!v).slice(0, 4);
  return {
    part: "", partName: "들어가며", title: "상담과 함께 읽을 때",
    body: T("상담 40분이라면 이 순서로 보면 됩니다", "참여자가 결과지를 먼저 읽고 오지 않아도 진행할 수 있게 짰습니다. 단계마다 펼칠 장을 함께 적었습니다.") +
      `<div class="flow5">${[
        ["5분", "지금 상태 확인", "01 한눈에 보기의 세 가지를 함께 읽고, 참여자가 동의하는지 묻습니다."],
        ["10분", "강점 하나 깊게", "가장 분명한 강점 한 영역을 골라 그때 무엇을 기준으로 정했는지 말하게 합니다."],
        ["10분", "빈자리 하나 고르기", "07 실행 로드맵의 먼저 채울 판단 가운데 이번 학기에 할 수 있는 것 하나를 고릅니다."],
        ["10분", "할 일 정하기", "30일 할 일을 어디서, 무엇을, 무엇으로 남길지 세 칸으로 적습니다."],
        ["5분", "다음 만남 약속", "결과물이 생기면 경험 기록에 더하고 다시 보기로 합니다."],
      ].map(([t, h, b]) => `<div class="f5"><span class="f5-t">${t}</span><b>${h}</b><p>${b}</p></div>`).join("")}</div>` +
      H("이 참여자에게 먼저 물어볼 것", "결과에서 나온 질문") +
      `<ol class="qs">${qs.map((t) => `<li>${E(t)}</li>`).join("")}</ol>` +
      `<div class="two">
        <div class="note warm"><b>이렇게 말하지 않습니다</b>${ul(["“이 직무에 맞는 사람입니다”", "“점수가 높게 나왔습니다”", "“이 회사에 지원하세요”"])}</div>
        <div class="note"><b>이렇게 말합니다</b>${ul([`“기준을 직접 정해 본 일이 ${d.counts.z1 ? `${d.counts.z1}개 영역에` : "아직 적게"} 있습니다”`, "“결과가 다음 결정에 쓰인 장면은 아직 적혀 있지 않습니다”", "“이 회사의 사업보고서에서 사업 구조를 먼저 보세요”"])}</div>
      </div>` +
      band("상담 기록", "07장 끝의 상담 기록지를 출력해 쓰면 다음 만남에서 무엇이 달라졌는지 바로 비교할 수 있습니다."),
  };
}

export function toc(pages: Page[]): Page {
  const starts: { no: string; name: string; at: number; titles: string[] }[] = [];
  pages.forEach((p, i) => {
    if (p.kind === "cover" || p.kind === "outer" || p.partName === "들어가며") return;
    const last = starts[starts.length - 1];
    /* 차례 쪽이 앞(셋째 자리)에 끼므로 그 뒤 쪽 번호는 하나씩 밀린다 */
    const at = i + 2;
    if (!last || last.name !== p.partName) starts.push({ no: p.part, name: p.partName, at, titles: p.kind === "chapter" ? [] : [p.title] });
    else if (p.kind !== "chapter" && last.titles.length < 5 && !last.titles.includes(p.title.replace(/ \(\d+\)$/, ""))) last.titles.push(p.title.replace(/ \(\d+\)$/, ""));
  });
  return {
    part: "", partName: "들어가며", title: "차례",
    body: T("차례") + `<div class="toc">${starts.map((s) => `<div class="toc-r"><span class="toc-n">${s.no || "··"}</span><div class="toc-b"><b>${E(s.name)}</b><span>${s.titles.map(E).join(" · ")}</span></div><span class="toc-p">${s.at}</span></div>`).join("")}</div>`,
  };
}
