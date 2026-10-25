/**
 * 들어가며: 겉표지 · 표지 · 이 리포트에 대해 · 읽는 법 · 상담과 함께 읽을 때.
 */
import type { Inputs } from "./types";
import { STEP_WORD, ZONE_WORD, ZONES, type X } from "./derive";
import { C, radar } from "./charts";
import { E, H, LVC, MARK, PAL, T, ZC, band, lineArt, tag, ul, type Page } from "./kit";
import { HORIZON_DAYS, actionHead, actionLine, actionOutput, andJoin, j, q } from "./text";

const SERIES = [PAL.blue, PAL.coral, PAL.teal, PAL.violet];

export function leadOf(x: Inputs, d: X): string {
  const m = x.m;
  const names = (z: string) => m.domains.filter((v) => v.zone === z).map((v) => d.name(v.code));
  const z1 = names("Z1_EVIDENCE_ESTABLISHED"), z2 = names("Z2_EVIDENCE_INCOMPLETE"), z3 = names("Z3_EVIDENCE_LOW_INTEREST");
  const high = m.domains.filter((v) => v.interest === "HIGH").map((v) => d.name(v.code));
  switch (m.overview.headline) {
    case "EVIDENCE_READY":
      return `${andJoin(z1)}에서는 직접 판단하고 결과물까지 남긴 경험이 있습니다. 지원서에 바로 꺼내 쓸 수 있는 경험이니, 다음 과제에서는 아직 덜 해 본 판단 하나를 골라 채워 보세요.`;
    case "EVIDENCE_PARTIAL":
      return `${andJoin(z2)}에서 직접 해 본 일이 여럿 보입니다. 그 일을 보여 줄 결과물이나 비교한 기록은 아직 적으니, 같은 종류의 과제를 한 번 더 할 때 남길 것부터 챙기면 됩니다.`;
    case "EVIDENCE_LOW_INTEREST":
      return `${andJoin(z3)}에서 해 본 일이 있는데, 지금 마음은 다른 쪽에 가 있습니다. 해 둔 경험은 어디에 쓸지 정해 두고, 관심 있는 쪽은 짧은 과제로 먼저 겪어 보세요.`;
    case "EXPLORING":
      return `${high.length ? `${andJoin(high.slice(0, 3))}에 관심이 높다고 답했습니다. ` : ""}직접 해 본 일은 아직 많지 않으니, 수업이나 동아리에서 4주 안에 끝나는 과제 하나로 먼저 겪어 보세요.`;
    default:
      return "아직 직접 해 본 일이 많지 않습니다. 관심 가는 영역 하나를 골라 작은 과제부터 해 보고, 그때 무엇을 정했는지 적어 두세요.";
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
      <div class="oc-foot">${x.issuer !== "CareerMatri" ? `<b>${E(x.issuer)}</b><span>×</span>` : ""}<b>CareerMatri</b><em>본인 열람용</em></div>`,
  };
}

export function cover(x: Inputs, d: X): Page {
  const series = d.radarDoms.map((v, i) => ({ name: d.name(v.code), levels: d.levels(v.code), color: SERIES[i] }));
  const goal = [d.goalRole?.name_ko, d.goalInd?.name_ko].filter(Boolean).join(" · ");
  const near = d.roleOrder[0]?.name_ko ?? "";
  const k = d.counts;
  const got = [k.confirmed && `직접 해 본 판단 ${k.confirmed}개`, k.items && `고른 항목 ${k.items}개`, k.artifacts && `결과물 ${k.artifacts}개`, k.records && `경험 기록 ${k.records}건`].filter(Boolean).join(" · ")
    || `${k.domains}개 ${x.domainWord}의 관심과 해 본 횟수`;
  const g0 = d.gaps[0], a0 = g0 ? d.actionOf(g0) : undefined;
  const first = a0 && g0 ? actionLine(a0, d.name(g0.domain), d.def(g0.domain)) : "관심 가는 영역 하나를 골라 4주짜리 과제로 먼저 겪어 보세요.";
  return {
    part: "", partName: "", title: "표지", kind: "cover",
    body: `<div class="cv-top"><span class="cv-org">${E(x.issuer)}</span><span class="cv-s">CareerMatri 진로 분석 리포트 · ${E(x.tier)}</span></div>
      <div class="cv-mid">
        <p class="cv-k">진로 분석 결과</p>
        <h1 class="cv-t">${E(x.person)} 님의<br>${E(x.department ?? x.major)} 진로 분석</h1>
        <p class="cv-d">${E(leadOf(x, d))}</p>
        ${series.length ? `<div class="cv-art">${radar(d.best.map((b) => d.axisName(b.axis)), series, { size: 420, ring: false })}</div>
        <div class="cv-legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${E(s.name)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="cv-meta">
        <div><span>응답일</span><b>${E(x.answeredOn)}</b></div>
        <div><span>참여자 · 전공</span><b>${E(x.person)} · ${E(x.department ?? x.major)}</b></div>
        ${goal ? `<div><span>목표 직무 · 산업</span><b>${E(goal)}</b></div>` : near ? `<div><span>근거가 가장 많이 겹치는 직무</span><b>${E(near)}</b></div>` : ""}
        <div><span>확인한 근거</span><b>${E(got)}</b></div>
      </div>
      <div class="cv-foot"><b>먼저 할 일</b>${E(first)}</div>`,
  };
}

export function about(x: Inputs, d: X): Page {
  const n = d.counts.domains;
  const goal = [d.goalRole?.name_ko, d.goalInd?.name_ko, d.orgName(x.m.targets.goal.org)].filter(Boolean).join(" · ");
  return {
    part: "", partName: "들어가며", title: "이 리포트에 대해",
    body: T(`${E(x.person)} 님이 고른 답에서 출발했습니다`, "검사에서 직접 해 봤다고 답한 일과 체크리스트에서 고른 항목, 남긴 결과물을 모아 읽었습니다. 앞쪽은 지금 내세울 수 있는 경험을, 뒤쪽은 다음 학기에 해 볼 과제를 다룹니다.") +
      `<div class="g3">
        <div class="card"><p class="k">살펴본 것</p><h4>일할 때 내리는 판단</h4><p>풀 문제를 잡는 일부터 결과를 다음 결정에 넘기는 일까지, ${E(x.major)} 일에서 자주 되풀이되는 판단을 ${n}개 ${E(x.domainWord)}마다 살폈습니다.</p></div>
        <div class="card"><p class="k">쓴 자료</p><h4>답과 고른 항목</h4><p>검사 응답, 체크리스트에서 고른 항목, 플랫폼에 적어 둔 경험 기록을 썼습니다. 고른 문장은 고치지 않고 그대로 옮겼습니다.</p></div>
        <div class="card"><p class="k">남는 것</p><h4>할 일과 남길 결과물</h4><p>덜 해 본 판단마다 어느 과제에서 무엇을 하고 무엇을 남길지 적었습니다. 07장의 90일 계획과 06장의 지원서 재료로 이어집니다.</p></div>
      </div>` +
      H("참여자 정보") +
      `<table class="tb"><tbody>
        <tr><th>이름</th><td>${E(x.person)}</td><th>응답일</th><td>${E(x.answeredOn)}</td></tr>
        <tr><th>전공</th><td>${E(x.major)}${x.department ? ` · ${E(x.department)}` : ""}</td><th>검사 등급</th><td>${E(x.tier)}</td></tr>
        ${goal ? `<tr><th>목표</th><td colspan="3">${E(goal)}</td></tr>` : ""}
        ${x.exps.length ? `<tr><th>경험 기록</th><td colspan="3">${x.exps.slice(0, 4).map((e) => E(e.title)).join("<br>")}</td></tr>` : ""}
      </tbody></table>`,
  };
}

export function howToRead(x: Inputs): Page {
  return {
    part: "", partName: "들어가며", title: "읽는 법",
    body: T("단계 넷과 묶음 다섯만 알면 뒤쪽 그래프가 다 읽힙니다") +
      H("판단 단계 넷", "방사형 그래프와 단계 칸에서 씁니다") +
      `<div class="steps4">${([0, 1, 2, 3] as const).map((k) => `<div class="st4"><div class="st4-b">${[1, 2, 3].map((jj) => `<i style="background:${k >= jj ? LVC[Math.max(1, k)] : C.l0}"></i>`).join("")}</div><b>${E(STEP_WORD[k].tag)}</b><p>${E(STEP_WORD[k].said)}</p></div>`).join("")}</div>` +
      H(`${E(x.domainWord)} 묶음 다섯`, "지도와 고리 그래프에서 씁니다") +
      `<div class="zones5">${ZONES.map((z) => `<div class="zn"><span class="zsw" style="background:${ZC[z]}"></span><div><b>${E(ZONE_WORD[z].tag)}</b><p>${E(ZONE_WORD[z].said)}</p></div></div>`).join("")}</div>` +
      H("근거의 층", "문장마다 어디서 온 말인지 나눕니다") +
      `<table class="tb"><thead><tr><th>표시</th><th>뜻</th><th>예</th></tr></thead><tbody>
        <tr><td>${tag("응답", C.navy)}</td><td>검사 문항에 답한 단계</td><td>‘직접 맡아 해 봤다’고 답함</td></tr>
        <tr><td>${tag("고른 근거", C.blue)}</td><td>체크리스트에서 직접 고른 항목(해 본 일, 남긴 결과물)</td><td>고른 문장을 그대로 옮김</td></tr>
        <tr><td>${tag("경험 기록", C.teal)}</td><td>참여자가 플랫폼에 적어 둔 활동</td><td>수업 과제 · 캡스톤 · 실습</td></tr>
        <tr><td>${tag("전공 사전", C.amber)}</td><td>${E(x.major)} 일에 대한 일반 안내(개인 판정이 아님)</td><td>영역의 일 흐름 · 직무가 맡는 일</td></tr>
        <tr><td>${tag("공시", "#6b7486")}</td><td>OpenDART 기업개황과 사업보고서</td><td>본점 주소 · 매출액 · 직원 수</td></tr>
      </tbody></table>` +
      `<div class="two">
        <div class="note"><b>방사형 그래프</b><p>가운데가 ‘해 본 적 없음’, 바깥 고리가 ‘기준까지 직접 결정’입니다. 바깥으로 넓게 퍼진 판단일수록 면접에서 자기 말로 풀어 설명하기 쉽습니다.</p></div>
        <div class="note"><b>흐린 칸</b><p>‘해 본 적 없음’은 물어봤고 아직 없다고 답한 칸입니다. 이번에 묻지 않은 칸은 0으로 그리지 않고 흐리게 남겨 둡니다.</p></div>
      </div>` +
      H("먼저 알아 두실 것") +
      `<div class="two"><div>${ul([
        "그래프는 단계 이름이나 센 개수를 그린 것입니다. 점수, 백분율, 순위, 합격 가능성은 계산하지 않았습니다.",
        `‘이번에 깊게 묻지 않음’은 관심과 해 본 횟수만 묻고 판단 단계는 묻지 않은 ${E(x.domainWord)}입니다. 그 영역에서 해 본 일은 상담에서 따로 이야기해 보세요.`,
        "결과는 응답한 날을 기준으로 고정됩니다. 나중에 경험을 더하면 내 CareerMatri의 현재 상태에만 반영됩니다.",
        "결과물의 완성도, 실제 성과 수치, 성격이나 적성 유형은 이 검사가 재는 것이 아닙니다. 다른 참여자 사이의 순위도 비교할 집단이 아직 없어 내지 않았습니다.",
      ])}</div><div>${ul([
        "기업 정보는 공시(OpenDART)와 공개 명단에서 확인한 것만 실었고, 채용 계획은 확인하지 않았습니다.",
        "이 리포트는 본인과, 본인이 동의한 경우의 상담 담당자만 봅니다. 기관에는 다섯 명 미만이면 수를 내지 않는 집계만 갑니다.",
      ])}</div></div>` +
      band("직업정보 제공", "CareerMatri는 취업 알선을 하지 않습니다. 이 리포트는 직업정보를 드리는 자료이고, 지원은 본인이 직접 하시면 됩니다."),
  };
}

export function counselor(x: Inputs, d: X): Page {
  const s0 = d.strengths[0];
  const ev0 = s0 ? d.evidenceOf(s0) : null;
  const pick = ev0?.decisions[0] ?? ev0?.acts[0];
  const g0 = d.gaps[0];
  const qs = [
    pick && s0 ? `${d.name(s0.code)}에서 ${j(q(pick), "을를")} 고르셨는데, 그때 무엇을 기준으로 정했고 다른 방법은 왜 쓰지 않았나요?` : null,
    g0 ? `${d.name(g0.domain)}의 ${j(q(d.axisName(g0.axis ?? "J5")), "은는")} ${g0.kind === "PARTIAL_EVIDENCE" ? "해 본 일은 보이지만 기준까지 직접 정한 장면은 아직 나오지 않았습니다" : "해 본 장면이 아직 나오지 않았습니다"}. 이번 학기 수업 가운데 그 일을 맡아 볼 과제가 있나요?` : null,
    d.goalRole ? `목표로 적은 ${d.goalRole.name_ko} 직무가 정하는 것(${d.goalRole.decides.slice(0, 2).join(", ")}) 가운데 이미 정해 본 것이 있나요?` : null,
    x.exps[0] ? `경험 기록 ${q(x.exps[0].title)}에서 맡은 범위는 어디까지였나요?` : null,
    "지금 가장 시간을 많이 쓰는 수업이나 활동은 무엇이고, 거기서 직접 정하는 것은 무엇인가요?",
  ].filter((v): v is string => !!v).slice(0, 4);
  return {
    part: "", partName: "들어가며", title: "상담과 함께 읽을 때",
    body: T("상담 40분은 이렇게 나눠 보세요", "학생이 결과지를 미리 읽고 오지 않아도 됩니다. 칸마다 펼칠 장을 적어 두었습니다.") +
      `<div class="flow5">${[
        ["5분", "지금 상태 보기", "01장 첫 쪽을 함께 읽고, 학생 생각과 맞는지 묻습니다."],
        ["10분", "강점 하나 깊게", "가장 많이 해 본 영역 하나를 골라, 그때 무엇을 기준으로 정했는지 학생 말로 들어 봅니다."],
        ["10분", "채울 판단 고르기", "07장의 먼저 채울 판단 가운데 이번 학기에 할 수 있는 것 하나를 고릅니다."],
        ["10분", "할 일 정하기", "30일 안에 할 일을 어디서, 무엇을, 무엇으로 남길지 세 칸에 적습니다."],
        ["5분", "다음 만남 약속", "결과물이 생기면 경험 기록에 더하고 그때 다시 보기로 합니다."],
      ].map(([t, h, b]) => `<div class="f5"><span class="f5-t">${t}</span><b>${h}</b><p>${b}</p></div>`).join("")}</div>` +
      H("이 학생에게 먼저 물어볼 것", "결과에서 나온 질문") +
      `<ol class="qs">${qs.map((t) => `<li>${E(t)}</li>`).join("")}</ol>` +
      (() => {
        const acts = x.m.actions.slice(0, 3);
        if (!acts.length) return "";
        const dn = (a: (typeof acts)[number]) => (a.domain ? d.name(a.domain) : "관심 영역");
        return H("‘할 일 정하기’에서 고를 후보", "07장 실행 로드맵에서") +
          `<table class="tb tb-xs"><thead><tr><th>기간</th><th>할 일</th><th>남길 것</th></tr></thead><tbody>${acts.map((a) => `<tr><td class="w18">${E(HORIZON_DAYS[a.horizon])}</td><td><b>${E(actionHead(a, dn(a)))}</b></td><td class="w22">${E(actionOutput(a, a.domain ? d.def(a.domain) : undefined))}</td></tr>`).join("")}</tbody></table>`;
      })() +
      `<div class="two">
        <div class="note warm"><b>피할 말</b>${ul(["“이 직무에 맞는 사람입니다”", "“점수가 높게 나왔습니다”", "“이 회사에 지원하세요”"])}</div>
        <div class="note"><b>바꿔 쓸 말</b>${ul([d.counts.z1 ? `“${d.counts.z1}개 영역에서는 직접 판단하고 결과물까지 남긴 경험이 있네요”` : "“직접 해 본 일은 있고, 기준까지 정해 본 경험은 아직 적네요”", "“결과를 다음 결정에 넘겨 본 장면은 아직 안 나왔어요”", "“이 회사의 사업보고서에서 사업 구조를 먼저 보세요”"])}</div>
      </div>` +
      band("상담 기록", "오늘 정한 할 일을 07장 끝 상담 기록지에 적어 두면, 다음 만남에서 무엇이 달라졌는지 바로 볼 수 있습니다."),
  };
}

export function toc(pages: Page[]): Page {
  const starts: { no: string; name: string; at: number; titles: string[] }[] = [];
  pages.forEach((p, i) => {
    if (p.kind === "cover" || p.kind === "outer" || p.kind === "fill" || p.partName === "들어가며") return;
    const last = starts[starts.length - 1];
    /* 차례 쪽이 앞(셋째 자리)에 끼므로 그 뒤 쪽 번호는 하나씩 밀린다 */
    const at = i + 2;
    if (!last || last.name !== p.partName) starts.push({ no: p.part, name: p.partName, at, titles: p.kind === "chapter" ? [] : [p.title] });
    else if (p.kind !== "chapter" && last.titles.length < 5 && !last.titles.includes(p.title.replace(/ \(\d+\)$/, ""))) last.titles.push(p.title.replace(/ \(\d+\)$/, ""));
  });
  return {
    part: "", partName: "들어가며", title: "차례",
    body: T("차례") + `<div class="toc">${starts.map((s) => `<div class="toc-r"><span class="toc-n">${s.no || "··"}</span><div class="toc-b"><b>${E(s.name)}</b><span>${s.titles.map(E).join(" · ")}</span></div><span class="toc-p" data-toc-part="${E(s.name)}">${s.at}</span></div>`).join("")}</div>`,
  };
}
