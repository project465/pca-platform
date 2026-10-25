/**
 * 들어가며: 겉표지 · 표지 · 이 리포트에 대해 · 읽는 법 · 차례.
 *
 * 영어 책은 같은 쪽을 같은 차례로 세운다. 한국어 글자는 `L(ko, en)` 의 첫 인자에
 * 그대로 있고, 영어 쪽 문장은 영어 도구(`andJoinEn` · `nEn` …)로만 잇는다.
 */
import type { Inputs } from "./types";
import { AXES, STEP_WORD, ZONE_WORD, ZONES, type X, notAsked } from "./derive";
import { C, LEVEL_KO, radar } from "./charts";
import { E, H, LVC, MARK, PAL, T, ZC, band, howto, lineArt, tag, ul, type Page } from "./kit";
import { actionLine, andJoin, andJoinEn, j, nEn } from "./text";
import { isEn, T as L } from "./lang";
import { partNames } from "./fill";

const SERIES = [PAL.blue, PAL.coral, PAL.teal, PAL.violet];
/** 겉표지 선 그림의 선 색(kit.ts lineArt 와 같은 값) */
const GOLD = "#d9b54a";

/** 들어가며의 장 이름(fill.ts partNames 한 곳에서 정한다). 차례가 이 이름으로 들어가며 쪽을 건너뛴다 */
const PART0 = () => partNames().intro;
/** 응시자가 적은 글(이름 · 경험 제목)은 영어 책 검사가 세지 않게 표시한다. 한국어 책에는 붙이지 않는다 */
const OWN = () => (isEn() ? " data-own" : "");
/** `2026-10-24` → `24 Oct 2026` */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function dateEn(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  return m ? `${Number(m[3])} ${MON[Number(m[2]) - 1]} ${m[1]}` : s;
}
const day = (s: string) => (isEn() ? dateEn(s) : s);
/**
 * 영역 이름을 영어 문장 안에서 잇는다. 이름 안에 이미 `and` 가 있으면(`Communications and Networking`)
 * `A and B and C` 로 경계가 안 보이므로 `as well as` 로 잇는다(한국어 andJoin 이 `와/과` 가 든 항목을 쉼표로 잇는 것과 같은 까닭)
 */
export function andNamesEn(xs: string[]): string {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1 || !ys.some((y) => / and /.test(y))) return andJoinEn(ys);
  return `${ys.slice(0, -1).join(", ")} as well as ${ys[ys.length - 1]}`;
}

export function leadOf(x: Inputs, d: X): string {
  const m = x.m;
  const names = (z: string) => m.domains.filter((v) => v.zone === z).map((v) => d.name(v.code));
  const z1 = names("Z1_EVIDENCE_ESTABLISHED"), z2 = names("Z2_EVIDENCE_INCOMPLETE"), z3 = names("Z3_EVIDENCE_LOW_INTEREST");
  const high = m.domains.filter((v) => v.interest === "HIGH").map((v) => d.name(v.code));
  if (isEn()) {
    switch (m.overview.headline) {
      case "EVIDENCE_READY":
        return `In ${andNamesEn(z1)}, you made decisions yourself and kept something to show for them. You can use that in applications right away. In your next project, pick one decision you have done less of and take it on.`;
      case "EVIDENCE_PARTIAL":
        return `You have done a fair amount of hands-on work in ${andNamesEn(z2)}. There is little to show for it yet, such as a deliverable or a comparison, so the next time you do a similar project, plan what you will keep.`;
      case "EVIDENCE_LOW_INTEREST":
        return `You have done work in ${andNamesEn(z3)}, but your interest lies elsewhere for now. Decide where that experience will be useful, and try the areas you are drawn to with a short project first.`;
      case "EXPLORING":
        return `${high.length ? `You said your interest is high in ${andNamesEn(high.slice(0, 3))}. ` : ""}You have not done much hands-on work yet, so start with one class or club project you can finish within four weeks.`;
      default:
        return "You have not done much hands-on work yet. Pick one area that interests you, start with a small project, and write down what you decided along the way.";
    }
  }
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
      [GOLD, L("내가 가장 깊이 해 본 단계를 이은 선", "The line joins the deepest step you reached on each decision")],
      [L("꼭짓점", "Points"), L(`일할 때 내리는 판단 ${AXES.length}가지(02장의 방사형 그래프와 같은 차례)`, `The ${AXES.length} decisions you make at work, in the same order as the radar chart in Chapter 02`)],
      [L("가운데 → 바깥", "Center → edge"), `${E(LEVEL_KO[0])} → ${E(LEVEL_KO[3])}`],
    ])}</div>`;
  return {
    part: "", partName: "", title: L("겉표지", "Front cover"), kind: "outer",
    body: `<div class="oc-grid"></div>
      <div class="oc-top"><span class="oc-mark">${MARK}</span><span class="oc-brand">CareerMatri</span><span class="oc-tier">${E(x.tier)}</span></div>
      <div class="oc-art bleed">${lineArt(lv)}</div>
      <div class="oc-mid">
        <p class="oc-k">${E(x.issuer === "CareerMatri" ? "CAREER ANALYSIS REPORT" : x.issuer)}</p>
        <h1 class="oc-t">${L("진로 분석<br>리포트", "Your career<br>analysis")}</h1>
        <p class="oc-s">${E(x.major)}${E(dept)}</p>
      </div>
      ${how}
      <div class="oc-who">
        <div><span>${L("참여자", "Prepared for")}</span><b${OWN()}>${E(x.person)}</b></div>
        <div><span>${L("응답일", "Answered on")}</span><b>${E(day(x.answeredOn))}</b></div>
        <div><span>${L("발행", "Issued by")}</span><b>${E(x.issuer)}</b></div>
      </div>
      <div class="oc-foot">${x.issuer !== "CareerMatri" ? `<b>${E(x.issuer)}</b><span>×</span>` : ""}<b>CareerMatri</b><em>${L("본인 열람용", "Personal copy, for your eyes only")}</em></div>`,
  };
}

export function cover(x: Inputs, d: X): Page {
  const en = isEn();
  const series = d.radarDoms.map((v, i) => ({ name: d.name(v.code), levels: d.levels(v.code), color: SERIES[i] }));
  const goal = [d.goalRole?.name_ko, d.goalInd?.name_ko].filter(Boolean).join(" · ");
  const near = d.roleOrder[0]?.name_ko ?? "";
  const k = d.counts;
  const got = (en
    ? [k.confirmed && nEn(k.confirmed, "decision you handled yourself", "decisions you handled yourself"), k.items && nEn(k.items, "item you picked", "items you picked"), k.artifacts && nEn(k.artifacts, "deliverable"), k.records && nEn(k.records, "experience record")]
    : [k.confirmed && `직접 해 본 판단 ${k.confirmed}개`, k.items && `고른 항목 ${k.items}개`, k.artifacts && `결과물 ${k.artifacts}개`, k.records && `경험 기록 ${k.records}건`]).filter(Boolean).join(" · ")
    || L(`${k.domains}개 ${x.domainWord}의 관심과 해 본 횟수`, `Your interest and experience in ${nEn(k.domains, x.domainWord)}`);
  const g0 = d.gaps[0], a0 = g0 ? d.actionOf(g0) : undefined;
  const first = a0 && g0 ? actionLine(a0, d.name(g0.domain), d.def(g0.domain)) : L("관심 가는 영역 하나를 골라 4주짜리 과제로 먼저 겪어 보세요.", "Pick one area that interests you and try it first as a four-week project.");
  const holes = series.some((s) => s.levels.some((v) => v == null));
  /* 그림을 조금 줄여 읽는 법이 들어갈 자리를 만든다(아래 칸이 쪽 끝에 붙은 '먼저 할 일' 띠와 겹치지 않게) */
  const art = series.length ? radar(d.best.map((b) => d.axisName(b.axis)), series, { size: 420, ring: false }).replace("<svg ", `<svg style="width:112mm" `) : "";
  const major = x.department ?? x.major;
  return {
    part: "", partName: "", title: L("표지", "Title page"), kind: "cover",
    body: `<div class="cv-top"><span class="cv-org">${E(x.issuer)}</span><span class="cv-s">${L(`CareerMatri 진로 분석 리포트 · ${E(x.tier)}`, `CareerMatri Career Analysis Report · ${E(x.tier)}`)}</span></div>
      <div class="cv-mid">
        ${en
          ? `<p class="cv-k">Prepared for <span data-own>${E(x.person)}</span> · ${E(day(x.answeredOn))}</p>
        <h1 class="cv-t">Your career analysis</h1>`
          : `<p class="cv-k">진로 분석 결과</p>
        <h1 class="cv-t">${E(x.person)} 님의<br>${E(major)} 진로 분석</h1>`}
        <p class="cv-d">${E(leadOf(x, d))}</p>
        ${series.length ? `<div class="cv-art">${art}</div>` + howto([
          ...series.map((s) => [s.color, E(s.name)] as [string, string]),
          [L("꼭짓점", "Points"), L(`일할 때 내리는 판단 ${AXES.length}가지`, `The ${AXES.length} decisions you make at work`)],
          [L("가운데 → 바깥 고리", "Center → outer ring"), `${E(LEVEL_KO[0])} → ${E(LEVEL_KO[3])}`],
          ...(holes ? [[L("점 없는 꼭짓점", "Point with no dot"), L("그 영역에서 이번 검사가 묻지 않은 판단", "A decision this assessment did not ask about in that area")] as [string, string]] : []),
        ], L("선 하나가 업무 영역 하나예요. 바깥으로 넓게 퍼질수록 그 영역에서 깊이 해 본 판단이 많다는 뜻입니다.", "Each line is one work area. The wider a line spreads, the more decisions you have taken further in that area.")) : ""}
      </div>
      <div class="cv-meta">
        <div><span>${L("응답일", "Answered on")}</span><b>${E(day(x.answeredOn))}</b></div>
        ${en
          ? `<div><span>Major</span><b>${E(major)}</b></div>`
          : `<div><span>참여자 · 전공</span><b>${E(x.person)} · ${E(major)}</b></div>`}
        ${goal ? `<div><span>${L("목표 직무 · 산업", "Target role · Industry")}</span><b>${E(goal)}</b></div>` : near ? `<div><span>${L("근거가 가장 많이 겹치는 직무", "Role your evidence overlaps with most")}</span><b>${E(near)}</b></div>` : ""}
        <div><span>${L("이 리포트가 읽은 것", "What this report read")}</span><b>${E(got)}</b></div>
      </div>
      <div class="cv-foot"><b>${L("먼저 할 일", "Start here")}</b>${E(first)}</div>`,
  };
}

export function about(x: Inputs, d: X): Page {
  const n = d.counts.domains;
  const goal = [d.goalRole?.name_ko, d.goalInd?.name_ko, d.orgName(x.m.targets.goal.org)].filter(Boolean).join(" · ");
  if (isEn()) {
    return {
      part: "", partName: PART0(), title: "About this report",
      body: T("This report is built from your own answers", "We read the work you said you did yourself, the checklist items you picked and the deliverables you named. The first half covers what you can point to now. The second half covers projects to try next term.") +
        `<div class="g3">
          <div class="card"><p class="k">What we looked at</p><h4>Decisions you make at work</h4><p>From choosing which problem to solve to making sure the result feeds the next decision, we looked at the ${AXES.length} decisions that come up again and again in ${E(x.major)} work, in each of your ${nEn(n, E(x.domainWord))}.</p></div>
          <div class="card"><p class="k">What we read</p><h4>Your answers and picks</h4><p>Your assessment answers, the checklist items you picked and the experience records you saved on the platform. Anything you picked is quoted word for word.</p></div>
          <div class="card"><p class="k">What you get</p><h4>Next steps and things to keep</h4><p>For each decision you have done less of, we note which project to try it in and what to keep from it. These carry through to the 90-day plan and the application drafts later in the book.</p></div>
        </div>` +
        H("Your details") +
        `<table class="tb"><tbody>
          <tr><th>Name</th><td data-own>${E(x.person)}</td><th>Answered on</th><td>${E(dateEn(x.answeredOn))}</td></tr>
          <tr><th>Major</th><td>${E(x.major)}${x.department ? ` · ${E(x.department)}` : ""}</td><th>Tier</th><td>${E(x.tier)}</td></tr>
          ${goal ? `<tr><th>Goal</th><td colspan="3">${E(goal)}</td></tr>` : ""}
          ${x.exps.length ? `<tr><th>Experience records</th><td colspan="3">${x.exps.slice(0, 4).map((e) => `<span data-own>${E(e.title)}</span>`).join("<br>")}</td></tr>` : ""}
        </tbody></table>`,
    };
  }
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
  if (isEn()) return howToReadEn(x, n, ne, NE);
  const scope = ne
    ? `이번 검사는 ${E(dw)} ${n}곳 가운데 ${n - ne}곳만 판단 단계까지 자세히 물었고, 나머지 ${ne}곳은 관심과 해 본 횟수만 물었어요. 그 ${ne}곳은 ${E(j(`‘${NE}’`, "으로"))} 표시되고 판단 단계 칸은 흐리게 비어 있습니다. 그 영역에서 해 본 일이 있다면 경험 기록에 더해 두세요.`
    : `이번 검사는 ${E(dw)} ${n}곳 모두 판단 단계까지 물었어요.`;
  return {
    part: "", partName: "들어가며", title: "읽는 법",
    body: T("네 단계와 다섯 가지 영역 이름만 알면 뒤쪽 그래프를 읽을 수 있어요", "그래프의 색은 대부분 아래 두 가지 가운데 하나예요. 색 견본을 먼저 보고 넘어가면 어느 쪽에서든 바로 읽힙니다.") +
      H("판단을 어디까지 해 봤나 · 네 단계", "막대 그래프, 방사형 그래프, 단계 칸에서 씁니다") +
      steps4() +
      `<p class="mut sm" style="margin-top:2mm">칸 세 개 가운데 몇 칸이 찼는지가 곧 단계예요. 색은 단계마다 달라서 칸 수를 세지 않아도 구분됩니다.</p>` +
      H(`${E(j(dw, "이가"))} 놓이는 자리 · 다섯 가지`, "영역 지도, 도넛 그래프, 표의 이름표에서 씁니다") +
      zones5() +
      `<p class="mut sm" style="margin-top:2mm">${scope}</p>` +
      `<div class="two">
        <div class="note"><b>방사형 그래프</b><p>가운데가 ‘${E(LEVEL_KO[0])}’, 바깥 고리가 ‘${E(LEVEL_KO[3])}’이에요. 꼭짓점 하나가 판단 하나이고, 바깥으로 넓게 퍼진 판단일수록 면접에서 내 말로 풀어 설명하기 쉽습니다.</p></div>
        <div class="note"><b>‘${E(notAsked())}’</b><p>‘${E(LEVEL_KO[0])}’은 물어봤는데 아직 없다고 답한 자리예요. ‘${E(notAsked())}’은 이번 검사가 그 판단까지는 묻지 않은 자리라서, 0으로 그리지 않고 흐리게 비워 뒀어요.</p></div>
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

/** 네 단계 견본: 칸 세 개 가운데 찬 칸 수가 단계다 */
const steps4 = () => `<div class="steps4">${([0, 1, 2, 3] as const).map((k) => `<div class="st4"><div class="st4-b">${[1, 2, 3].map((jj) => `<i style="background:${k >= jj ? LVC[Math.max(1, k)] : C.l0}"></i>`).join("")}</div><b>${E(STEP_WORD[k].tag)}</b><p>${E(STEP_WORD[k].said)}</p></div>`).join("")}</div>`;
/** 다섯 가지 영역 이름 견본 */
const zones5 = () => `<div class="zones5">${ZONES.map((z) => `<div class="zn"><span class="zsw" style="background:${ZC[z]}"></span><div><b>${E(ZONE_WORD[z].tag)}</b><p>${E(ZONE_WORD[z].said)}</p></div></div>`).join("")}</div>`;

/**
 * 영어 책의 읽는 법. 지역 장과 공시 기업 자료가 영어 책에 서지 않으므로 `공시` 표시와
 * 기업 정보 안내 줄은 싣지 않는다(없는 쪽을 설명하지 않는다).
 */
function howToReadEn(x: Inputs, n: number, ne: number, NE: string): Page {
  const scope = ne
    ? `We asked about decision steps in ${n - ne} of your ${n} areas. The other ${ne} are marked ‘${E(NE)}’: there we only asked about interest and experience, so their step boxes stay empty. If you have done work there, add it to your experience records.`
    : `This assessment asked about decision steps in all ${n} areas.`;
  return {
    part: "", partName: PART0(), title: "How to read this report",
    body: T("Four steps and five labels explain every chart", "Most chart colors come from one of the two keys below. Check the swatches once and every chart will read easily.") +
      H("How far you took each decision · four steps", "Used in bar charts, radar charts and step boxes") +
      steps4() +
      `<p class="mut sm" style="margin-top:2mm">The number of filled boxes out of three is the step. Each step also has its own color, so you can tell them apart without counting.</p>` +
      H("Where each area sits · five labels", "Used in the area map, donut charts and table labels") +
      zones5() +
      `<p class="mut sm" style="margin-top:2mm">${scope}</p>` +
      `<div class="two">
        <div class="note"><b>Radar chart</b><p>The center is ‘${E(LEVEL_KO[0])}’ and the outer ring ‘${E(LEVEL_KO[3])}’. Each point is one decision. The further out, the easier it is to explain.</p></div>
        <div class="note"><b>‘${E(notAsked())}’</b><p>‘${E(LEVEL_KO[0])}’ means we asked and you had not done it yet. ‘${E(notAsked())}’ means we did not ask, so the spot stays empty instead of showing zero.</p></div>
      </div>` +
      H("Labels in front of a sentence", "They show where the sentence comes from") +
      `<table class="tb"><thead><tr><th>Label</th><th>Meaning</th><th>Example</th></tr></thead><tbody>
        <tr><td>${tag("Your answer", C.navy)}</td><td>The step you chose on a question</td><td>‘${E(STEP_WORD[2].tag)}’</td></tr>
        <tr><td>${tag("Your pick", C.blue)}</td><td>A checklist item you picked</td><td>Quoted as written</td></tr>
        <tr><td>${tag("Your record", C.teal)}</td><td>An activity you saved on the platform</td><td>Class project · capstone</td></tr>
        <tr><td>${tag("Major guide", C.amber)}</td><td>General guidance on the major, not your result</td><td>How work flows in an area</td></tr>
      </tbody></table>` +
      H("Before you start") +
      `<div class="two"><div>${ul([
        "Charts show step names and counts. There are no scores, percentages, rankings or hiring odds.",
        "Your result is fixed to the day you answered. Experience added later only updates My CareerMatri.",
      ])}</div><div>${ul([
        "Work quality, performance figures, personality and aptitude are not measured. With no comparison group yet, there is no ranking.",
        "This report is for you. With your consent, a school career adviser can go through it with you. Your institution sees only group totals, never for groups under five.",
      ])}</div></div>` +
      band("Career information", "CareerMatri does not place people in jobs. This report is career information, and you apply yourself."),
  };
}

export function toc(pages: Page[]): Page {
  const starts: { no: string; name: string; at: number; titles: string[] }[] = [];
  /* 첫 장 앞의 쪽은 모두 들어가며다. 채움 쪽의 장 이름이 언어마다 달라도 차례에 따로 서지 않게 자리로도 거른다 */
  const first = pages.findIndex((p) => p.kind === "chapter");
  pages.forEach((p, i) => {
    if (p.kind === "cover" || p.kind === "outer" || p.kind === "fill" || p.partName === "들어가며" || p.partName === PART0() || i < first) return;
    const last = starts[starts.length - 1];
    /* 차례 쪽이 앞(셋째 자리)에 끼므로 그 뒤 쪽 번호는 하나씩 밀린다 */
    const at = i + 2;
    if (!last || last.name !== p.partName) starts.push({ no: p.part, name: p.partName, at, titles: p.kind === "chapter" ? [] : [p.title] });
    else if (p.kind !== "chapter" && last.titles.length < 5 && !last.titles.includes(p.title.replace(/ \(\d+\)$/, ""))) last.titles.push(p.title.replace(/ \(\d+\)$/, ""));
  });
  return {
    part: "", partName: PART0(), title: L("차례", "Contents"),
    body: T(L("차례", "Contents"), L("장마다 처음 나오는 쪽 이름을 몇 개씩 적었어요. 오른쪽 숫자는 그 장이 시작하는 쪽입니다. 처음이라면 01장 한눈에 보기부터 읽어 보세요.", "For each chapter, we list the first few page titles. The number on the right is the page where the chapter starts. If this is your first time, begin with Chapter 01, At a glance.")) +
      `<div class="toc">${starts.map((s) => `<div class="toc-r"><span class="toc-n">${s.no || "··"}</span><div class="toc-b"><b>${E(s.name)}</b><span>${s.titles.map(E).join(" · ")}</span></div><span class="toc-p" data-toc-part="${E(s.name)}">${s.at}</span></div>`).join("")}</div>`,
  };
}
