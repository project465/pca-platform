/**
 * 들어가며: 겉표지 · 표지 · 이 리포트에 대해 · 읽는 법 · 차례.
 */
import type { Inputs } from "./types";
import { AXES, STEP_WORD, ZONE_WORD, ZONES, type X, NOT_ASKED } from "./derive";
import { C, LEVEL_KO, radar } from "./charts";
import { E, H, LVC, MARK, PAL, T, ZC, band, howto, lineArt, tag, ul, type Page } from "./kit";
import { actionLine, andJoin, j } from "./text";

const SERIES = [PAL.blue, PAL.coral, PAL.teal, PAL.violet];
/** 겉표지 선 그림의 선 색(kit.ts lineArt 와 같은 값) */
const GOLD = "#d9b54a";

export function leadOf(x: Inputs, d: X): string {
  const m = x.m;
  const names = (z: string) => m.domains.filter((v) => v.zone === z).map((v) => d.name(v.code));
  const z1 = names("Z1_EVIDENCE_ESTABLISHED"), z2 = names("Z2_EVIDENCE_INCOMPLETE"), z3 = names("Z3_EVIDENCE_LOW_INTEREST");
  const high = m.domains.filter((v) => v.interest === "HIGH").map((v) => d.name(v.code));
  switch (m.overview.headline) {
    case "EVIDENCE_READY":
      return `${andJoin(z1)}에서는 직접 판단하고 결과물까지 남긴 경험이 있습니다. 지원서에 바로 꺼내 쓸 수 있는 경험이니, 다음 과제에서는 아직 덜 해 본 판단 하나를 골라 채워 보세요.`;
    case "EVIDENCE_PARTIAL":
      return `${andJoin(z2)}에서 직접 해 본 일이 여럿 보여요. 그 일을 보여 줄 결과물이나 비교한 기록은 아직 적으니, 같은 종류의 과제를 한 번 더 할 때 남길 것부터 챙겨 보세요.`;
    case "EVIDENCE_LOW_INTEREST":
      return `${andJoin(z3)}에서 해 본 일이 있는데, 지금 마음은 다른 쪽에 가 있어요. 해 둔 경험은 어디에 쓸지 정해 두고, 관심 있는 쪽은 짧은 과제로 먼저 겪어 보세요.`;
    case "EXPLORING":
      return `${high.length ? `${andJoin(high.slice(0, 3))}에 관심이 높다고 답했어요. ` : ""}직접 해 본 일은 아직 많지 않으니, 수업이나 동아리에서 4주 안에 끝나는 과제 하나로 먼저 겪어 보세요.`;
    default:
      return "아직 직접 해 본 일이 많지 않아요. 관심 가는 영역 하나를 골라 작은 과제부터 해 보고, 그때 무엇을 정했는지 적어 두세요.";
  }
}

export function outer(x: Inputs, d: X): Page {
  const lv = d.best.map((b) => b.level);
  const dept = x.department ? ` · ${x.department}` : "";
  /* 겉표지 그림도 내 응답을 그린 것이라 읽는 법을 단다. 어두운 바탕에 맞춰 색만 바꾼다 */
  const how = `<style>.oc-how{position:absolute;left:18mm;bottom:64mm;width:74mm}.oc-how .howto{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.22);color:#c4d2ee}.oc-how .howto b{color:#e6c766}.oc-how .howto li em{color:#fff}.oc-how .howto ul{flex-direction:column}</style>` +
    `<div class="oc-how">${howto([
      [GOLD, "내가 가장 깊이 해 본 단계를 이은 선"],
      ["꼭짓점", `일할 때 내리는 판단 ${AXES.length}가지(02장의 방사형 그래프와 같은 차례)`],
      ["가운데 → 바깥", `${E(LEVEL_KO[0])} → ${E(LEVEL_KO[3])}`],
    ])}</div>`;
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
      ${how}
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
  const holes = series.some((s) => s.levels.some((v) => v == null));
  /* 그림을 조금 줄여 읽는 법이 들어갈 자리를 만든다(아래 칸이 쪽 끝에 붙은 '먼저 할 일' 띠와 겹치지 않게) */
  const art = series.length ? radar(d.best.map((b) => d.axisName(b.axis)), series, { size: 420, ring: false }).replace("<svg ", `<svg style="width:112mm" `) : "";
  return {
    part: "", partName: "", title: "표지", kind: "cover",
    body: `<div class="cv-top"><span class="cv-org">${E(x.issuer)}</span><span class="cv-s">CareerMatri 진로 분석 리포트 · ${E(x.tier)}</span></div>
      <div class="cv-mid">
        <p class="cv-k">진로 분석 결과</p>
        <h1 class="cv-t">${E(x.person)} 님의<br>${E(x.department ?? x.major)} 진로 분석</h1>
        <p class="cv-d">${E(leadOf(x, d))}</p>
        ${series.length ? `<div class="cv-art">${art}</div>` + howto([
          ...series.map((s) => [s.color, E(s.name)] as [string, string]),
          ["꼭짓점", `일할 때 내리는 판단 ${AXES.length}가지`],
          ["가운데 → 바깥 고리", `${E(LEVEL_KO[0])} → ${E(LEVEL_KO[3])}`],
          ...(holes ? [["점 없는 꼭짓점", "그 영역에서 이번 검사가 묻지 않은 판단"] as [string, string]] : []),
        ], "선 하나가 업무 영역 하나예요. 바깥으로 넓게 퍼질수록 그 영역에서 깊이 해 본 판단이 많다는 뜻입니다.") : ""}
      </div>
      <div class="cv-meta">
        <div><span>응답일</span><b>${E(x.answeredOn)}</b></div>
        <div><span>참여자 · 전공</span><b>${E(x.person)} · ${E(x.department ?? x.major)}</b></div>
        ${goal ? `<div><span>목표 직무 · 산업</span><b>${E(goal)}</b></div>` : near ? `<div><span>근거가 가장 많이 겹치는 직무</span><b>${E(near)}</b></div>` : ""}
        <div><span>이 리포트가 읽은 것</span><b>${E(got)}</b></div>
      </div>
      <div class="cv-foot"><b>먼저 할 일</b>${E(first)}</div>`,
  };
}

export function about(x: Inputs, d: X): Page {
  const n = d.counts.domains;
  const goal = [d.goalRole?.name_ko, d.goalInd?.name_ko, d.orgName(x.m.targets.goal.org)].filter(Boolean).join(" · ");
  return {
    part: "", partName: "들어가며", title: "이 리포트에 대해",
    body: T(`${E(x.person)} 님이 검사에서 고른 답으로 만든 리포트입니다`, "직접 해 봤다고 답한 일, 체크리스트에서 고른 항목, 남긴 결과물을 모아 읽었어요. 앞쪽은 지금 내세울 수 있는 경험을, 뒤쪽은 다음 학기에 해 볼 과제를 다룹니다.") +
      `<div class="g3">
        <div class="card"><p class="k">무엇을 살폈나</p><h4>일할 때 내리는 판단</h4><p>풀 문제를 정하는 일부터 결과가 다음 결정에 쓰이게 하는 일까지, ${E(x.major)} 일에서 되풀이되는 판단 ${AXES.length}가지를 ${E(x.domainWord)} ${n}곳마다 살폈어요.</p></div>
        <div class="card"><p class="k">무엇을 읽었나</p><h4>답과 고른 항목</h4><p>검사 응답, 체크리스트에서 고른 항목, 플랫폼에 적어 둔 경험 기록을 읽었어요. 고른 문장은 고치지 않고 그대로 옮겼습니다.</p></div>
        <div class="card"><p class="k">무엇이 남나</p><h4>할 일과 남길 결과물</h4><p>아직 덜 해 본 판단마다 어느 과제에서 무엇을 하고 무엇을 남길지 적었어요. 07장의 90일 계획과 06장의 지원서 재료로 이어집니다.</p></div>
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
  const dw = x.domainWord;
  const n = x.m.domains.length;
  const ne = x.m.domains.filter((z) => z.zone === "NOT_EXPLORED").length;
  const NE = ZONE_WORD.NOT_EXPLORED.tag;
  const scope = ne
    ? `이번 검사는 ${E(dw)} ${n}곳 가운데 ${n - ne}곳만 판단 단계까지 자세히 물었고, 나머지 ${ne}곳은 관심과 해 본 횟수만 물었어요. 그 ${ne}곳은 ${E(j(`‘${NE}’`, "으로"))} 표시되고 판단 단계 칸은 흐리게 비어 있습니다. 그 영역에서 해 본 일이 있다면 경험 기록에 더해 두세요.`
    : `이번 검사는 ${E(dw)} ${n}곳 모두 판단 단계까지 물었어요.`;
  return {
    part: "", partName: "들어가며", title: "읽는 법",
    body: T("네 단계와 다섯 가지 영역 이름만 알면 뒤쪽 그래프를 읽을 수 있어요", "그래프의 색은 대부분 아래 두 가지 가운데 하나예요. 색 견본을 먼저 보고 넘어가면 어느 쪽에서든 바로 읽힙니다.") +
      H("판단을 어디까지 해 봤나 · 네 단계", "막대 그래프, 방사형 그래프, 단계 칸에서 씁니다") +
      `<div class="steps4">${([0, 1, 2, 3] as const).map((k) => `<div class="st4"><div class="st4-b">${[1, 2, 3].map((jj) => `<i style="background:${k >= jj ? LVC[Math.max(1, k)] : C.l0}"></i>`).join("")}</div><b>${E(STEP_WORD[k].tag)}</b><p>${E(STEP_WORD[k].said)}</p></div>`).join("")}</div>` +
      `<p class="mut sm" style="margin-top:2mm">칸 세 개 가운데 몇 칸이 찼는지가 곧 단계예요. 색은 단계마다 달라서 칸 수를 세지 않아도 구분됩니다.</p>` +
      H(`${E(j(dw, "이가"))} 놓이는 자리 · 다섯 가지`, "영역 지도, 도넛 그래프, 표의 이름표에서 씁니다") +
      `<div class="zones5">${ZONES.map((z) => `<div class="zn"><span class="zsw" style="background:${ZC[z]}"></span><div><b>${E(ZONE_WORD[z].tag)}</b><p>${E(ZONE_WORD[z].said)}</p></div></div>`).join("")}</div>` +
      `<p class="mut sm" style="margin-top:2mm">${scope}</p>` +
      `<div class="two">
        <div class="note"><b>방사형 그래프</b><p>가운데가 ‘${E(LEVEL_KO[0])}’, 바깥 고리가 ‘${E(LEVEL_KO[3])}’이에요. 꼭짓점 하나가 판단 하나이고, 바깥으로 넓게 퍼진 판단일수록 면접에서 내 말로 풀어 설명하기 쉽습니다.</p></div>
        <div class="note"><b>‘${E(NOT_ASKED)}’</b><p>‘${E(LEVEL_KO[0])}’은 물어봤는데 아직 없다고 답한 자리예요. ‘${E(NOT_ASKED)}’은 이번 검사가 그 판단까지는 묻지 않은 자리라서, 0으로 그리지 않고 흐리게 비워 뒀어요.</p></div>
      </div>` +
      H("문장 앞의 표시", "그 문장이 어디서 온 말인지 알려 줍니다") +
      `<table class="tb"><thead><tr><th>표시</th><th>뜻</th><th>예</th></tr></thead><tbody>
        <tr><td>${tag("응답", C.navy)}</td><td>검사 문항에 답한 단계</td><td>‘직접 맡아 해 봤다’고 답함</td></tr>
        <tr><td>${tag("고른 근거", C.blue)}</td><td>체크리스트에서 직접 고른 항목(해 본 일, 남긴 결과물)</td><td>고른 문장을 그대로 옮김</td></tr>
        <tr><td>${tag("경험 기록", C.teal)}</td><td>내가 플랫폼에 적어 둔 활동</td><td>수업 과제 · 캡스톤 · 실습</td></tr>
        <tr><td>${tag("전공 사전", C.amber)}</td><td>${E(x.major)} 일에 대한 일반 안내(내 결과가 아님)</td><td>영역의 일 흐름 · 직무가 맡는 일</td></tr>
        <tr><td>${tag("공시", "#6b7486")}</td><td>OpenDART 기업개황과 사업보고서</td><td>본점 주소 · 매출액 · 직원 수</td></tr>
      </tbody></table>` +
      H("먼저 알아 두실 것") +
      `<div class="two"><div>${ul([
        "그래프는 단계 이름이나 센 개수를 그린 것이에요. 점수, 백분율, 순위, 합격 가능성은 계산하지 않았습니다.",
        "결과는 응답한 날을 기준으로 고정돼요. 나중에 경험을 더하면 내 CareerMatri의 현재 상태에만 반영됩니다.",
        "결과물의 완성도, 실제 성과 수치, 성격이나 적성 유형은 이 검사가 재는 것이 아니에요. 다른 참여자와 비교한 순위도 비교할 집단이 아직 없어 내지 않았습니다.",
      ])}</div><div>${ul([
        "기업 정보는 공시(OpenDART)와 공개 명단에서 확인한 것만 실었고, 채용 계획은 확인하지 않았습니다.",
        "이 리포트는 본인만 봐요. 본인이 동의하면 학교 진로·취업 상담 선생님과 함께 볼 수 있고, 기관에는 다섯 명 미만이면 수를 내지 않는 집계만 갑니다.",
      ])}</div></div>` +
      band("직업정보 제공", "CareerMatri는 취업 알선을 하지 않습니다. 이 리포트는 직업정보를 드리는 자료이고, 지원은 본인이 직접 하시면 됩니다."),
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
    body: T("차례", "장마다 처음 나오는 쪽 이름을 몇 개씩 적었어요. 오른쪽 숫자는 그 장이 시작하는 쪽입니다. 처음이라면 01장 한눈에 보기부터 읽어 보세요.") +
      `<div class="toc">${starts.map((s) => `<div class="toc-r"><span class="toc-n">${s.no || "··"}</span><div class="toc-b"><b>${E(s.name)}</b><span>${s.titles.map(E).join(" · ")}</span></div><span class="toc-p" data-toc-part="${E(s.name)}">${s.at}</span></div>`).join("")}</div>`,
  };
}
