/**
 * 03 영역별 해설: 영역마다 한 쪽, 고른 항목 모음, 경험 기록, 검사와 기록의 교차, 경험 하나를 직무의 말로.
 *
 * 값이 없는 칸은 "없음" 으로 채우지 않고 뺀다. 쓰는 칸(빈 줄 · 빈 표)은 이 장에 한 곳만 둔다:
 * 경험 기록이 하나도 없을 때의 '지금 떠오르는 활동 셋' 표다.
 *
 * 영어 책: 학생에게 보이는 글자는 `L(ko, en)`(lang.ts 의 `T`)로 고른다. 한국어 쪽 인자는
 * 그대로라 한국어 책은 글자까지 같다. 경험 기록의 고른 칸(문제 · 정한 것 · 결과물 · 비교)은
 * 한국어 원고 글자일 수 있어 `localizer` 로 바꿔 읽고, 응시자가 직접 적은 제목은 그대로 두고
 * `data-own` 을 붙인다(영어 책에서만. 한국어 책의 HTML 은 그대로다).
 */
import type { Axis } from "../scoring/types";
import type { Action, ResultDomain } from "../result/model";
import { TRANS_STEP_KO } from "../result/text.ko";
import { TRANS_STEP_KO as TRANS_STEP_EN } from "../result/text.en";
import { localizer } from "../result/localize";
import { kindLabel, type Experience } from "../platform";
import type { DomainDef, Inputs } from "./types";
import { AXES, BAND_WORD, EXP_WORD, STEP_WORD, type X } from "./derive";
import { C, chain, timeline } from "./charts";
import { CYC, E, H, T, band, chips, howto, note, paginate, pip, rowsOf, tag, ul, zoneTag, type Page } from "./kit";
import { T as L, isEn } from "./lang";
import { actionLine, adnominal, andJoin, j, okOr, okText, q } from "./text";
import { AXIS_KO as AXIS_EN } from "../result/text.en";

export const PART3 = (x: Inputs) => L(`${x.domainWord}별 해설`, "Area by area");

/** 그래프와 읽는 법을 한 덩이로 묶는다. 쪽 모으기가 둘을 다른 쪽으로 갈라 놓지 않게 한다 */
const fig = (graph: string, how: string) => `<div style="display:flex;flex-direction:column;gap:2.4mm">${graph}${how}</div>`;

/** 칸 수에 맞는 격자. 하나면 격자 없이 그대로 둔다 */
const grid = (xs: string[]) => (xs.length >= 3 ? `<div class="g3">${xs.join("")}</div>` : xs.length === 2 ? `<div class="two">${xs.join("")}</div>` : xs.join(""));

/**
 * 사전의 `~한다` 문장에 섞인 설계 문서 동사를 학생에게 하는 말로 바꾼다.
 * 사전 쪽 문장(영역 · 직무가 하는 일)의 대부분이 `확정한다` 로 끝난다
 */
const plainVerb = (s: string) => s.replace(/확정한다/g, "정한다").replace(/세운다/g, "정한다").replace(/가른다/g, "나눈다").replace(/견준다/g, "비교한다");
/** 영역이나 직무가 하는 일 한 줄: `~정하는 일이에요` */
const doesLine = (s: string) => `${adnominal(plainVerb(s))} 일이에요.`;

/* ── 영어 도구 ─────────────────────────────────────────────── */
const andEn = (xs: string[]) => {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return ys.length === 2 ? `${ys[0]} and ${ys[1]}` : `${ys.slice(0, -1).join(", ")} and ${ys[ys.length - 1]}`;
};
const orEn = (xs: string[]) => {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return `${ys.slice(0, -1).join(", ")} or ${ys[ys.length - 1]}`;
};
const qe = (s: string) => `“${s.trim().replace(/[.]$/, "")}”`;
const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
/** 관사. 복수(…s)면 붙이지 않는다 */
const aN = (s0: string) => {
  const s = lc(s0);
  if (s.includes(",") || /[^s]s$/.test(s.split(/\s+/).pop() ?? "")) return s;
  if (/^[A-Z]{2,}/.test(s)) return `${/^[AEFHILMNORSX]/.test(s) ? "an" : "a"} ${s}`;
  return `${/^[aeiou]/i.test(s) ? "an" : "a"} ${s}`;
};
const nJ = (n: number) => (n === 1 ? "1 judgment" : `${n} judgments`);
const HANGUL = /[가-힣]/;
/** 응시자가 직접 적은 글. 영어 책에서는 한글 검사에서 빼도록 표시한다(한국어 책의 HTML 은 그대로) */
const own = (s: string, tagName = "span") => (isEn() ? `<${tagName} data-own="1">${E(s)}</${tagName}>` : E(s));
/**
 * 영역 · 직무가 하는 일 한 줄(영어 원고). 동사로 시작하면(`Finalizes …`) `Work in this area …`,
 * 의문사로 시작하면(`Where the heat goes …`) `This area asks …` 로 잇는다
 */
const doesLineEn = (s0: string) => {
  const s = s0.trim().replace(/[.]$/, "");
  return /^(Whether|Where|What|Which|How|When|Who|At|In)\b/.test(s) ? `This area asks ${lc(s)}.` : `Work in this area ${lc(s)}.`;
};
const STRENGTH_EN: Record<string, string> = { 중심: "core", 있음: "also used", 드묾: "rare" };
/* 관계표의 값(중심 · 있음 · 드묾)은 표 안의 말이라, 괄호 안에 그대로 두면 ‘(있음)’ 처럼 뜻이 안 읽힌다 */
const STRENGTH_KO: Record<string, string> = { 중심: "주로 씀", 있음: "함께 씀", 드묾: "드물게 씀" };
const strengthWord = (s: string) => (isEn() ? STRENGTH_EN[s] ?? s : STRENGTH_KO[s] ?? s);
const axName = (d: X) => (a: Axis) => (isEn() ? AXIS_EN[a] : d.axisName(a));
/** 축마다 할 일 문장에 넣는 이름씨 구(text.ts `AXIS_NEED` 의 영어) */
const AXIS_NEED_EN: Record<Axis, string> = {
  J1: "setting the scope of the problem", J2: "turning requirements into conditions", J3: "setting criteria and values yourself", J4: "choosing methods and tools",
  J5: "leaving a deliverable", J6: "checking results against a standard", J7: "finding what went wrong and fixing it", J8: "getting the result used in the next decision",
};

/** 할 일 한 문장(text.ts `actionLine` 의 영어). 재료는 그 영역의 자료에서 온다 */
function actionLineEn(a: Action, dn: string, def: DomainDef | undefined): string {
  const mt = a.material;
  const art = (mt.artifacts.length ? mt.artifacts : mt.workflow?.output ? [mt.workflow.output] : def?.artifacts ?? []).slice(0, 2);
  const vt = (mt.verify_targets.length ? mt.verify_targets : def?.verify_targets ?? []).slice(0, 2);
  const l2 = a.axis ? def?.axes?.[a.axis]?.l2 : "";
  switch (a.code) {
    case "BUILD_OUTPUT":
      return art.length
        ? `Take your next ${dn} project all the way through, keep ${orEn(art.map(aN))}, and add one line on why you made the choices you did.`
        : `On your next ${dn} project, put what you decided on one page.`;
    case "ADD_VERIFICATION":
      return vt.length
        ? `Put your ${dn} results side by side with ${orEn(vt.map(aN))}, and note the differences and their causes in one table.`
        : `Make one table that puts your ${dn} results next to reference values.`;
    case "FILL_AXIS":
      return l2
        ? `On your next ${dn} project, take on something like ${qe(l2)} yourself, and write one line on why you chose it.`
        : `On your next ${dn} project, take on ${a.axis ? AXIS_NEED_EN[a.axis] : "one judgment"} yourself.`;
    case "DEEPEN_OWNERSHIP":
      return l2
        ? `Think of one ${dn} project you have already done where you did something like ${qe(l2)}, and write three lines on what you decided yourself.`
        : `Think of one ${dn} project you have already done, and write three lines on what you decided yourself.`;
    case "TRY_SHORT_EXPERIENCE":
      return `Do one short project or study group on ${dn}, then write five lines on what you did and what you decided yourself.`;
    case "STUDY_NEXT":
      return `Take one class or course on ${dn}, use what you learned once in a small project, and write down what stuck.`;
    case "RECHECK_DIRECTION":
      return `Decide whether to keep ${dn} as a career direction, and write one line on why.`;
    case "EXPLORE_BROADLY":
      return "Pick one area where your interest came out high, try it briefly in a class or campus project, and write five lines on what you did and what you decided.";
    case "WRITE_UP": {
      const ch = mt.chain ?? [];
      return ch.length
        ? `Pick one ${dn} experience and write it up on one page in this order: ${ch.map(lc).join(", ")}.`
        : `Pick one ${dn} experience and write one page on what you decided and where the result was used.`;
    }
  }
}

function domainHead(x: Inputs, d: X, z: ResultDomain): string {
  const nm = d.name(z.code);
  const ev = d.evidenceOf(z);
  if (isEn()) {
    switch (z.zone) {
      case "Z1_EVIDENCE_ESTABLISHED":
        /* 고른 항목은 아래 표에 있어 여기서 다시 인용하지 않는다(영어 문장이 길어 쪽이 넘친다) */
        return "You made decisions here yourself and left deliverables, so this is ready to use in an application.";
      case "Z2_EVIDENCE_INCOMPLETE": {
        const miss = [!ev.artifacts.length && "a deliverable you left", !ev.comparisons.length && "something you compared against", !z.owned.length && "a time you set the criteria yourself"].filter(Boolean) as string[];
        return miss.length
          ? `You have taken on work yourself in ${nm}. Add ${andEn(miss)}, and it becomes an experience you can put straight into an application.`
          : `You have taken on work yourself in ${nm}. Write it up once as an experience record, and you can put it straight into an application.`;
      }
      case "Z3_EVIDENCE_LOW_INTEREST":
        return `You have done work in ${nm}, but you said your interest is low for now. It still shows your fundamentals when you apply for other roles, so keep the record at least.`;
      case "Z4_INSUFFICIENT_EVIDENCE":
        return `Your interest in ${nm} is high, but you have not done much of it yourself yet. Take it on once in a class or a short project, and you will soon know whether it suits you.`;
      default: {
        if (z.experience === "NONE") {
          return `You said you have not done ${nm} yet. ${z.interest === "HIGH" ? "Your interest is high, so try it first with one short project." : "For now, build up other areas first. You can widen out later when you need to."}`;
        }
        const times = EXP_WORD[z.experience ?? ""];
        return `This time we only asked about your interest in ${nm} and how often you had done it. ${times ? `You said you had done it ${lc(times)}` : "You said you had done it before"}, so write down what you took on in an experience record. That gives you one more experience for your applications.`;
      }
    }
  }
  switch (z.zone) {
    case "Z1_EVIDENCE_ESTABLISHED":
      return ev.decisions[0]
        ? `${nm}에서는 ${j(q(ev.decisions[0]), "과와")} 같이 직접 정한 일이 있고 그때 남긴 결과물도 있어서, 지원서에 바로 쓸 수 있어요.`
        : `${nm}에서는 직접 맡아 한 일과 그때 남긴 결과물이 함께 나와서, 지원서에 바로 쓸 수 있어요.`;
    case "Z2_EVIDENCE_INCOMPLETE": {
      const miss = [!ev.artifacts.length && "남긴 결과물", !ev.comparisons.length && "비교한 대상", !z.owned.length && "기준을 직접 정한 일"].filter(Boolean) as string[];
      return miss.length
        ? `${nm}에서는 직접 맡아 본 일이 있어요. 여기에 ${andJoin(miss)}까지 더하면 서류에 그대로 옮길 수 있는 경험이 됩니다.`
        : `${nm}에서는 직접 맡아 본 일이 있어요. 그 일을 경험 기록으로 한 번 정리해 두면 서류에 그대로 옮길 수 있습니다.`;
    }
    case "Z3_EVIDENCE_LOW_INTEREST":
      return `${nm}에서는 해 본 일이 있는데 지금 관심은 낮다고 답했어요. 다른 직무에 지원할 때도 기본기를 보여 주는 경험이 되니, 기록만큼은 정리해 두세요.`;
    case "Z4_INSUFFICIENT_EVIDENCE":
      return `${nm}에는 관심이 높은데 직접 해 본 일은 아직 적어요. 수업 과제나 짧은 프로젝트에서 한 번 맡아 보면 나에게 맞는 일인지 금방 알 수 있습니다.`;
    default: {
      /* 판단까지 묻지 않은 영역은 한 책에 아홉 곳까지 나온다. 같은 두 문장이 아홉 번 서지 않게 영역 차례에 따라 말을 바꾼다 */
      const v = Math.max(0, x.m.domains.findIndex((w) => w.code === z.code)) % 3;
      if (z.experience === "NONE") {
        const high = z.interest === "HIGH";
        return [
          `${j(nm, "은는")} 아직 해 본 적이 없다고 답한 영역이에요. ${high ? "관심은 높게 답했으니 짧은 과제 하나로 먼저 겪어 보세요." : "지금은 다른 영역을 먼저 다지고, 필요해질 때 넓혀도 늦지 않습니다."}`,
          `${j(nm, "은는")} 아직 해 보지 않았다고 답했어요. ${high ? "관심이 높은 만큼 수업 과제나 동아리에서 작은 몫부터 맡아 보세요." : "급한 영역은 아니니 다른 영역을 먼저 챙겨도 괜찮아요."}`,
          `${j(nm, "은는")} 아직 경험이 없는 영역입니다. ${high ? "관심이 높다고 답했으니 4주 정도의 짧은 과제로 먼저 해 보면 나에게 맞는지 알 수 있어요." : "관심도 높지 않다고 답해서, 지금은 뒤로 미뤄 둬도 됩니다."}`,
        ][v];
      }
      const times = EXP_WORD[z.experience ?? ""];
      const did = times ? `${times} 해 봤다고` : "해 본 적이 있다고";
      return [
        `이번 검사에서 ${j(nm, "은는")} 관심과 해 본 횟수까지만 물었어요. ${did} 답했으니, 그때 맡은 일을 경험 기록에 적어 두면 지원서에 쓸 경험이 하나 늘어납니다.`,
        `${j(nm, "은는")} ${did} 답했는데, 이번에는 그때 어떤 판단까지 했는지 묻지 않았어요. 무엇을 맡았는지 경험 기록에 적어 두면 내 CareerMatri의 현재 상태에 반영됩니다.`,
        `${nm}에서 ${did} 답했어요. 판단 단계는 이번 검사에서 묻지 않았으니, 맡았던 몫을 경험 기록으로 남겨 두면 서류에 꺼내 쓸 수 있습니다.`,
      ][v];
    }
  }
}

/**
 * 일 흐름 여덟 칸의 이름. 영역 사전(잠긴 문항 은행)의 이름이 ‘문제가 들어오는 모양’ · ‘받는 입력’ 처럼
 * 설계 문서 말이라, 책에 그릴 때만 학생이 읽는 말로 바꾼다. 사전 파일은 건드리지 않는다
 */
const WF_KO: Record<string, string> = {
  "문제가 들어오는 모양": "일이 시작되는 계기", "받는 입력": "필요한 자료", "내놓는 산출물": "남기는 결과물",
  "무엇과 비교하는가": "무엇과 비교하나", "틀렸을 때": "결과가 어긋날 때",
};
const wfName = (n: string) => (isEn() ? n : WF_KO[n] ?? n);

export function domainPage(x: Inputs, d: X, z: ResultDomain, no: number): Page {
  const en = isEn();
  const an = axName(d);
  const def = d.def(z.code), tx = d.tax(z.code);
  const nm = d.name(z.code);
  const asked = d.asked(z);
  const lv = d.levels(z.code);
  const roles = d.rolesOf(z.code).slice(0, en ? 3 : 4);
  const inds = d.indsOf(z.code).slice(0, en ? 3 : 4);
  const arts = (def?.artifacts ?? []).slice(0, 4);
  const gapA = x.m.gaps.filter((g) => g.domain === z.code).map((g) => d.actionOf(g)).find(Boolean);
  const rowsHtml = AXES.map((a, k) => {
    const pk = d.picks(z.code, a);
    /* 영어 문장은 길어 한 줄만 싣는다. 고른 항목 전부는 ‘체크리스트에서 고른 항목’ 쪽에 있다 */
    const show = en ? 1 : 2;
    const what = pk.length ? pk.slice(0, show).map(E).join(" · ") + (pk.length > show ? ` <span class="mut">${L(`외 ${pk.length - 2}개`, `+${pk.length - show} more`)}</span>` : "") : `<span class="mut">${E(okOr(def?.axes?.[a]?.l2))}</span>`;
    return `<tr><td class="w22"><b>${E(an(a))}</b>${(def?.required_axes ?? []).includes(a) ? ` <span class="mut sm">${L("필수", "Required")}</span>` : ""}</td><td class="w22">${pip(lv[k])}</td><td>${what}</td></tr>`;
  }).join("");
  const scene = def?.axes?.J3?.l2 ?? def?.workflow?.[2]?.detail;
  const art0 = def?.artifacts?.[0] ?? L("결과 문서", "result document");
  const nextLine = en
    ? (gapA
      ? actionLineEn(gapA, nm, def)
      : asked
        ? `Your answers for ${nm} are already enough for one paragraph in an application. Just fill in the result figures and how long it took.`
        : z.experience && z.experience !== "NONE"
          ? `Think back to whether any of that work came close to ${scene ? qe(scene) : "setting one criterion yourself"}, and write it down in an experience record. If you still have ${aN(art0)}, add it to the record.`
          : `In a class project or club activity, take on one piece of work like ${scene ? qe(scene) : "setting one criterion yourself"}, and keep ${aN(art0)} when you finish.`)
    : gapA
      ? actionLine(gapA, nm, def)
      : asked
        ? `${nm}에서는 지금 응답만으로 지원서 한 문단을 쓸 수 있어요. 결과 수치와 걸린 기간만 직접 채워 넣으면 됩니다.`
        : z.experience && z.experience !== "NONE"
          ? [
            `해 본 일 가운데 ${scene ? `${q(scene)}에 가까운 경우` : "기준 하나를 직접 정한 경우"}가 있었는지 떠올려 경험 기록에 적어 보세요. ${j(art0, "이가")} 남아 있다면 함께 올려 두세요.`,
            `${scene ? `${j(q(scene), "과와")} 비슷한 일을` : "기준 하나를 직접 정한 일을"} 해 본 적이 있다면 언제, 어떤 과제였는지 경험 기록에 한 줄 적어 두세요. ${j(art0, "을를")} 남겼다면 같이 올리면 됩니다.`,
            `경험 기록에는 무엇을 맡았고 무엇을 정했는지 두 줄이면 충분해요. ${scene ? `${q(scene)} 같은 일이 있었는지 떠올려 보세요.` : "그때 직접 정한 기준 하나를 떠올려 보세요."}`,
          ][no % 3]
          : [
            `수업 과제나 동아리 활동에서 ${scene ? q(scene) : "기준 하나를 직접 정하는 일"} 정도의 몫을 한 번 맡아 보고, 끝나면 ${j(art0, "을를")} 남겨 두세요.`,
            `처음이라면 ${scene ? q(scene) : "기준 하나를 직접 정하는 일"} 정도의 작은 몫부터 맡아 보세요. 끝난 뒤 ${j(art0, "을를")} 하나 남겨 두면 다음 검사에서 ‘해 본 적 있다’로 답할 수 있습니다.`,
            `팀 과제에서 이 영역의 일을 나눌 때 ${scene ? `${q(scene)} 같은 몫을` : "기준을 정하는 몫을"} 먼저 맡겠다고 해 보세요. ${j(art0, "이가")} 남으면 그대로 경험 기록에 올릴 수 있어요.`,
          ][no % 3];
  const meta = [
    z.interest ? L(`관심 ${BAND_WORD[z.interest]}`, `Interest: ${lc(BAND_WORD[z.interest])}`) : "",
    z.experience ? (z.experience === "NONE" ? L("아직 해 보기 전", "Not tried yet") : L(`해 본 횟수 ${EXP_WORD[z.experience]}`, `Done: ${lc(EXP_WORD[z.experience])}`)) : "",
    !asked && z.learning ? L(`배울 뜻 ${BAND_WORD[z.learning]}`, `Wish to learn: ${lc(BAND_WORD[z.learning])}`) : "",
  ].filter(Boolean).join(" · ");
  const notes = [
    roles.length ? note(L("이 영역을 쓰는 직무", "Roles that use this area"), roles.map((r) => `${E(d.roleName(r.role))} <span class="mut">(${E(strengthWord(r.strength))})</span>`).join(" · ")) : "",
    inds.length ? note(L("이 영역을 쓰는 산업", "Industries that use this area"), inds.map((r) => `${E(d.indName(r.industry))} <span class="mut">(${E(strengthWord(r.strength))})</span>`).join(" · ")) : "",
    arts.length ? note(L("이 일에서 남기는 결과물", "Deliverables from this work"), E(arts.join(" · "))) : "",
  ].filter(Boolean);
  const wf = def?.workflow ?? [];
  /* 영어 책에서 판단 표가 서는 영역은 한 쪽을 넘기 쉽다. 하는 일 한 줄과 세부 영역 칩은 아래 ‘일하는 순서’ 와 겹쳐 뺀다 */
  const brief = en && asked;
  const nn = String(no).padStart(2, "0");
  return {
    part: "03", partName: PART3(x), title: L(`영역 ${nn} · ${nm}`, `Area ${nn} · ${nm}`),
    body: `<div style="display:flex;flex-direction:column;gap:4.2mm"><div class="dh"><span class="dh-n">${String(no).padStart(2, "0")}</span><div><p class="k">${L(E(x.domainWord), "Area")}</p><h1>${E(nm)}</h1></div><div class="dh-t">${zoneTag(z.zone)}${meta ? `<span class="mut">${meta}</span>` : ""}</div></div>
      <p class="dek">${E(domainHead(x, d, z))}${okText(tx?.owns) && !brief ? ` <span class="mut">${L(`이 영역은 ${E(doesLine(tx!.owns))}`, E(doesLineEn(tx!.owns)))}</span>` : ""}</p>
      ${tx?.subareas?.length && !brief ? chips(tx.subareas) : ""}</div>
      ${wf.length ? `${H(L("현장에서 이 일은 이런 순서로 진행됩니다", "How this work runs on the job"), L("전공 사전", "General guide"))}<div class="wf2${asked && !en ? "" : " wf2s"}">${wf.map((w) => `<div class="wf2-i"><span>${w.step}</span><p><b>${E(wfName(w.name))}</b>${E(okOr(w.detail))}</p></div>`).join("")}</div>` : ""}
      ${asked ? `${H(L("판단마다 어디까지 해 봤는지", "Your level on each judgment"), L("내 응답과 고른 항목 · ‘필수’는 이 영역 일에서 꼭 하게 되는 판단", "From your answers · “Required”: this work always needs it"))}<table class="tb tb-xs"><tbody>${rowsHtml}</tbody></table>` : ""}
      ${grid(notes)}` + band(gapA ? L("다음 할 일", "Next step") : asked ? L("지원서로 옮기기", "Into your application") : z.experience && z.experience !== "NONE" ? L("기록으로 남기기", "Put it on record") : L("처음 해 보기", "Try it for the first time"), E(nextLine)),
  };
}

export function ledgerPages(x: Inputs, d: X): Page[] {
  const an = axName(d);
  const asked = x.m.domains.filter((z) => d.asked(z) && AXES.some((a) => d.picks(z.code, a).length));
  type Row = { z: ResultDomain; a: Axis; picks: string[] } | { z: ResultDomain; head: true };
  const rows: Row[] = asked.flatMap((z) => [{ z, head: true as const }, ...AXES.filter((a) => d.picks(z.code, a).length).map((a) => ({ z, a, picks: d.picks(z.code, a) }))]);
  const w = (r: Row) => ("head" in r ? 2.2 : Math.max(1, rowsOf(r.picks.join(" · "), 62)));
  const headRow = (z: ResultDomain) => `<tr><td colspan="2" style="background:#f2f5fb"><b>${E(d.name(z.code))}</b> ${zoneTag(z.zone)}</td></tr>`;
  if (!rows.length) {
    /* 체크리스트에서 고른 것이 없으면, 직접 해 봤다고 답한 판단과 그 판단이 현장에서 어떤 일인지를 대신 싣는다 */
    type Hint = { z: ResultDomain; a: Axis; lv: number; l2: string } | { z: ResultDomain; head: true };
    const hints: Hint[] = x.m.domains.filter((z) => d.asked(z)).flatMap((z) => {
      const own0 = AXES.map((a, k) => ({ a, lv: d.levels(z.code)[k], l2: okOr(d.def(z.code)?.axes?.[a]?.l2) }))
        .filter((v) => v.lv !== null && v.lv >= 2 && v.l2).map((v) => ({ z, a: v.a, lv: v.lv as number, l2: v.l2 }));
      return own0.length ? [{ z, head: true as const }, ...own0] : [];
    });
    const n = hints.filter((h) => !("head" in h)).length;
    if (!n) return [];
    return paginate(hints, (h) => ("head" in h ? 2.2 : Math.max(1, rowsOf(h.l2, 62))), 38, 31).map((chunk, k) => ({
      part: "03", partName: PART3(x), title: L(`지원서 재료 찾기${k ? ` (${k + 1})` : ""}`, `Finding material for applications${k ? ` (${k + 1})` : ""}`),
      body: (k === 0 ? T(L(`직접 해 봤다고 답한 판단이 ${n}가지 있습니다`, `You said you did ${nJ(n)} yourself`), L("다만 체크리스트에서는 그 일을 아직 고르지 않으셨어요. 오른쪽 문장에 맞는 과제가 있었다면 경험 기록에 그 과제를 적고 같은 문장을 골라 주세요. 그러면 이 표가 자기소개서에 쓸 재료 목록이 됩니다.", "But you have not picked those scenes in the checklist yet. If a sentence on the right matches a project you did, add that project to your experience records and pick the same sentence. This table then becomes a list of material for your applications.")) : `<p class="k">${L("지원서 재료 찾기 (계속)", "Finding material for applications (continued)")}</p>`) +
        `<table class="tb tb-xs"><tbody>${chunk.map((h) => "head" in h
          ? headRow(h.z)
          : `<tr><td class="w22">${E(an(h.a))} <span class="mut sm">${E(STEP_WORD[h.lv as 0 | 1 | 2 | 3].tag)}</span></td><td>${E(h.l2)}</td></tr>`).join("")}</tbody></table>` +
        band(L("쓰는 법", "How to use this"), L("자기소개서 한 문단에는 직접 정한 것 하나와 그 결과물 하나를 담으면 충분합니다.", "One paragraph in a cover letter needs only one decision you made and one deliverable that came from it.")),
    }));
  }
  const total = rows.filter((r) => !("head" in r)).reduce((a, r) => a + (r as { picks: string[] }).picks.length, 0);
  return paginate(rows, w, 38, 31).map((chunk, k) => ({
    part: "03", partName: PART3(x), title: L(`체크리스트에서 고른 항목${k ? ` (${k + 1})` : ""}`, `Items you picked in the checklist${k ? ` (${k + 1})` : ""}`),
    body: (k === 0 ? T(L(`체크리스트에서 고른 ${total}개 항목을 영역과 판단별로 모았습니다`, `Your ${total} checklist items, grouped by area and judgment`), L("직접 고르신 문장을 그대로 옮겼어요. 자기소개서와 면접 답변을 준비할 때 여기서 하나씩 꺼내 쓰세요.", "These are the sentences you picked, exactly as you picked them. Use them one at a time when you prepare cover letters and interview answers.")) : `<p class="k">${L("체크리스트에서 고른 항목 (계속)", "Items you picked in the checklist (continued)")}</p>`) +
      `<table class="tb tb-xs"><tbody>${chunk.map((r) => "head" in r
        ? headRow(r.z)
        : `<tr><td class="w22">${E(an(r.a))}</td><td>${r.picks.map((p) => (r.z.artifacts.includes(p) ? `<b>${E(p)}</b>` : E(p))).join(" · ")}</td></tr>`).join("")}</tbody></table>` +
      band(L("쓰는 법", "How to use this"), L("굵은 글씨는 결과물입니다. 한 문단에는 직접 정한 것 하나와 결과물 하나를 담으면 충분합니다.", "Bold items are deliverables. One paragraph needs only one decision you made and one deliverable.")),
  }));
}

const KIND: Record<string, string> = {
  course: "수업", assignment: "수업 과제", capstone: "캡스톤 디자인", research: "연구", paper: "논문",
  internship: "현장실습·인턴", project: "교내외 활동", work: "근무", credential: "자격 준비",
};
const kindOf = (e: Experience) => (isEn() ? kindLabel(e.kind, "en") ?? "Activity" : KIND[e.kind] ?? "활동");
const period = (e: Experience) => [e.started_on?.slice(0, 7), e.ended_on?.slice(0, 7) ?? (e.started_on ? L("진행 중", "ongoing") : null)].filter(Boolean).join(" ~ ");

/** 경험 기록의 고른 칸을 그 책의 언어로. 제목(응시자가 적은 글)은 바꾸지 않는다 */
function readExp(x: Inputs, e: Experience): Experience {
  if (!isEn()) return e;
  const tr = localizer(x.coreCode, "en");
  const m = (xs?: string[]) => (xs ? xs.map(tr) : xs);
  return { ...e, problems: m(e.problems), decisions: m(e.decisions) ?? [], artifacts: m(e.artifacts) ?? [], verifications: m(e.verifications) ?? [], used_where: m(e.used_where) };
}

export function recordPages(x: Inputs, d: X): Page[] {
  const exps = x.exps.map((e) => readExp(x, e));
  const en = isEn();
  if (!exps.length) {
    /* 이 장의 쓰는 칸은 여기 한 곳이다. 해 본 적이 있다고 답한 영역을 둘째 칸에 미리 적어 둔다 */
    const tried = x.m.domains.filter((z) => z.experience && z.experience !== "NONE")
      .sort((a, b) => (b.experience === "SEVERAL" ? 1 : 0) - (a.experience === "SEVERAL" ? 1 : 0)).slice(0, 3).map((z) => d.name(z.code));
    const rows = [0, 1, 2].map((i) => `<tr><td></td><td>${tried[i] ? E(tried[i]) : ""}</td><td></td><td></td></tr>`).join("");
    return [{
      keep: true,
      part: "03", partName: PART3(x), title: L("경험 기록", "Experience records"),
      body: T(L("경험 기록을 하나 적어 두면 이 장이 훨씬 구체적이 됩니다", "Add one experience record and this chapter gets much more specific"), L(`이 리포트에는 결과를 만든 ${E(x.builtOn)}까지 저장된 경험 기록만 들어가고, 그 뒤에 적은 기록은 내 CareerMatri에서 바로 볼 수 있어요. 수업 과제나 캡스톤, 현장실습, 동아리 활동 하나만 적어도 검사에서 나온 영역과 실제 활동이 같은 방향인지 맞춰 볼 수 있습니다.`, `This report only includes experience records saved by ${E(x.builtOn)}, the day your result was made. Anything you add later shows up right away in My CareerMatri. Even one class project, capstone, internship or club activity lets you check whether the areas from the assessment and what you actually did point the same way.`)) +
        `<div class="two">${note(L("이렇게 적으면 됩니다", "What to write"), ul(en ? ["The activity's name and dates", "Which area the work belonged to", "One or two things you decided yourself", "What you left behind, and what you compared it with"] : ["활동 이름과 기간", "어느 영역의 일이었는지", "내가 직접 정한 것 한두 가지", "남은 결과물, 그리고 무엇과 비교했는지"]))}${note(L("적고 나면", "After you add it"), ul(en ? ["In My CareerMatri, the activity is attached to that area as experience", "Your next assessment report will include notes on the activity and material for applications", "This report stays exactly as it is"] : ["내 CareerMatri에서 그 활동이 해당 영역의 경험으로 붙습니다", "다음 검사 리포트에 그 활동의 해설과 자기소개서 재료가 실립니다", "지금 받은 이 리포트의 내용은 그대로 보존됩니다"]), true)}</div>` +
        H(L("지금 떠오르는 활동 셋", "Three activities that come to mind now"), tried.length ? L("해 본 적이 있다고 답한 영역을 미리 적어 두었습니다", "We filled in the areas you said you had done") : L("직접 채워 보세요", "Fill these in yourself")) +
        `<table class="tb ws rec"><thead><tr><th style="width:24%">${L("활동 이름 · 기간", "Activity · dates")}</th><th style="width:20%">${L(`어느 ${E(x.domainWord)}`, "Which area")}</th><th>${L("직접 정한 것", "What you decided")}</th><th style="width:22%">${L("남은 결과물 · 비교한 것", "Deliverable · compared with")}</th></tr></thead><tbody>${rows}</tbody></table>` +
        band(L("어디서", "Where"), L("내 CareerMatri의 ‘경험 추가’ 화면에 위 표 그대로 옮겨 적으면 됩니다.", "Copy the table above into the “Add an experience” screen in My CareerMatri.")),
    }];
  }
  const out: Page[] = [];
  const dated = exps.filter((e) => e.started_on);
  if (dated.length) {
    const items = dated.map((e, i) => ({ label: e.title, from: e.started_on!.slice(0, 7), to: (e.ended_on ?? e.started_on)!.slice(0, 7), color: CYC[i % CYC.length] }));
    /* 시간축의 막대 이름은 응시자가 적은 제목이다. 영어 책에서만 그 글자에 `data-own` 을 붙인다(막대 이름만 굵게 그린다) */
    const tl = timeline(items, { width: 700 });
    const tlOut = en ? tl.replace(/<text([^>]*font-weight="600"[^>]*)>/g, `<text data-own="1"$1>`) : tl;
    out.push({
      part: "03", partName: PART3(x), title: L("경험 기록 시간축", "Experience timeline"),
      body: T(L(`경험 기록 ${exps.length}건을 시간 순서로 놓았습니다`, exps.length === 1 ? "Your experience record on a timeline" : `Your ${exps.length} experience records in time order`), L("직접 적어 두신 활동이에요. 검사 응답과는 따로 받은 자료라서, 뒤쪽에서 두 자료가 같은 영역을 가리키는지 맞춰 봤습니다.", "These are the activities you wrote down yourself. They are separate from your assessment answers, so the following pages check whether the two point to the same areas.")) +
        fig(`<div class="wide-art">${tlOut}</div>`, howto([[L("가로축", "Horizontal axis"), L("달(위에 적힌 연도와 월)", "Months (year and month along the top)")], [L("막대", "Bar"), L("활동 하나가 시작한 달부터 끝난 달까지(끝난 달을 적지 않았으면 시작한 달만)", "One activity, from its start month to its end month (just the start month if you left the end blank)")], [L("막대 색", "Bar color"), L("아래 기록 카드 왼쪽 띠와 같은 색이 같은 활동", "Matches the stripe on the left of the record card below")]])) +
        exps.slice(0, 4).map((e, i) => {
          const cols = [
            (e.problems ?? []).length ? `<div><p class="k">${L("다룬 문제", "Problem")}</p>${ul((e.problems ?? []).slice(0, 3).map(E))}</div>` : "",
            e.decisions.length ? `<div><p class="k">${L("직접 정한 것", "What you decided")}</p>${ul(e.decisions.slice(0, 3).map(E))}</div>` : "",
            e.artifacts.length || (e.used_where ?? []).length ? `<div><p class="k">${L("남긴 것 · 쓰인 곳", "Left behind · used in")}</p>${ul([...e.artifacts.slice(0, 2).map((a) => `<b>${E(a)}</b>`), ...(e.used_where ?? []).slice(0, 2).map(E)])}</div>` : "",
          ].filter(Boolean);
          const meta = [kindOf(e), period(e), e.td_codes.map(d.name).join(", ")].filter(Boolean).map(E).join(" · ");
          return `<div class="rec" style="--c:${CYC[i % CYC.length]}"><div class="rec-h">${en ? own(e.title, "b") : `<b>${E(e.title)}</b>`}<span>${meta}</span></div>${cols.length ? `<div class="${cols.length >= 3 ? "g3" : cols.length === 2 ? "two" : ""} sm">${cols.join("")}</div>` : ""}</div>`;
        }).join(""),
    });
  }
  exps.slice(0, 3).forEach((e, ei) => {
    const says = e.td_codes.map((td) => {
      const z = d.dom(td);
      if (!z || !d.asked(z)) return { n: d.name(td), t: z?.experience === "NONE" ? L("영역별 질문에서는 이 영역을 해 본 적이 없다고 답했어요. 이 활동을 다른 이름의 일로 생각했을 수 있으니, 다음 검사에서 ‘해 봤다’로 답해도 되는지 한 번 따져 보세요.", "In the area questions, you said you had never done this area. You may have thought of this activity as a different kind of work, so think about whether you could answer “done it” next time.") : L("이번 검사에서는 이 영역의 판단까지는 묻지 않아서, 지금은 이 기록이 이 영역의 경험을 보여 주는 자료예요.", "This time we did not ask about judgments in this area, so for now this record is what shows your experience here.") };
      if (z.confirmed.length) return { n: d.name(td), t: L(`검사에서도 이 영역의 판단 ${z.confirmed.length}가지를 직접 해 봤다고 답해서, 기록과 응답이 같은 쪽을 가리켜요.`, `In the assessment you also said you did ${nJ(z.confirmed.length)} in this area yourself, so your record and your answers point the same way.`) };
      return { n: d.name(td), t: L("검사에서는 이 영역의 판단을 직접 해 봤다고 답하지 않았어요. 이 활동에서 맡은 몫이 어디까지였는지 먼저 정리해 보세요.", "In the assessment you did not say you did any judgment in this area yourself. First work out how far your part in this activity went.") };
    });
    const jobs = x.roles.filter((r) => r.core_ref.td.some((t) => e.td_codes.includes(t))).slice(0, 3);
    const steps = [
      { head: L("다룬 문제", "Problem"), body: (e.problems ?? [])[0], color: C.navy }, { head: L("직접 정한 것", "Decided"), body: e.decisions[0], color: C.blue },
      { head: L("남긴 것", "Left behind"), body: e.artifacts[0], color: C.teal }, { head: L("비교한 것", "Compared with"), body: e.verifications[0], color: C.amber },
    ].filter((s): s is { head: string; body: string; color: string } => !!s.body);
    const cards = [
      `<div class="card">${H(L("검사도 같은 쪽을 가리키나", "Does the assessment point the same way?"))}${ul(says.map((s) => `<b>${E(s.n)}</b> ${E(s.t)}`))}</div>`,
      jobs.length ? `<div class="card">${H(L("이 기록이 이어지는 직무", "Roles this record leads to"), L("직무 안내", "Role guide"))}${ul(jobs.map((r) => `<b>${E(r.name_ko)}</b> ${en ? E(`${r.owns.trim().replace(/[.]$/, "")}.`) : E(doesLine(r.owns))}`))}</div>` : "",
    ].filter(Boolean);
    /* 빈 줄 대신 이 기록에서 뽑은 질문을 미리 적는다 */
    const asks = en ? [
      `In ${own(e.title)}, what was your role, and how far did your part reach?`,
      e.decisions[0] ? `When you decided ${E(qe(e.decisions[0]))}, what were the other options, and why did you drop them?` : "What values or criteria did you set yourself in this activity?",
      e.verifications[0] ? `When you compared with ${E(qe(e.verifications[0]))}, how big was the difference, and how did you read it?` : "What did you compare the result with? If you haven't yet, what could you compare it with now?",
      e.artifacts[0] ? `What result figures and time frame does ${E(qe(e.artifacts[0]))} show?` : "If you had to state the result as one number, what would it be?",
    ] : [
      `${E(e.title)}에서 맡은 역할과 범위는 어디까지였나요?`,
      e.decisions[0] ? `${E(j(q(e.decisions[0]), "을를"))} 정할 때 다른 선택지는 무엇이었고, 왜 그쪽을 버렸나요?` : "이 활동에서 내가 직접 정한 값이나 기준은 무엇이었나요?",
      e.verifications[0] ? `${E(j(q(e.verifications[0]), "과와"))} 비교했을 때 차이는 얼마였고, 그 차이를 어떻게 해석했나요?` : "결과를 무엇과 비교했나요? 아직 비교하지 않았다면 지금 무엇과 비교할 수 있을까요?",
      e.artifacts[0] ? `${E(q(e.artifacts[0]))}에 담긴 결과 수치와 걸린 기간은 얼마였나요?` : "결과를 숫자 하나로 말한다면 무엇이 되나요?",
    ];
    /* 쪽 이름(차례에 서는 글자)에는 응시자가 적은 제목을 그대로 둔다. 영어 책에서 그 제목에 한글이 있으면 번호로 부른다 */
    const pageTitle = en ? (HANGUL.test(e.title) ? `Experience record ${ei + 1}` : `Experience record · ${e.title.slice(0, 24)}`) : `경험 기록 · ${e.title.slice(0, 24)}`;
    out.push({
      part: "03", partName: PART3(x), title: pageTitle,
      body: T(en ? own(e.title) : E(e.title), en
        ? `${E(kindOf(e))}${period(e) ? ` · ${E(period(e))}` : ""} · You recorded this as work in ${E(andEn(e.td_codes.map(d.name)))}.`
        : `${E(KIND[e.kind] ?? "활동")}${period(e) ? ` · ${E(period(e))}` : ""} · ${E(andJoin(e.td_codes.map(d.name)))} 영역의 일로 적으셨습니다.`) +
        (steps.length >= 2 ? fig(chain(steps, { width: 700, height: 104 }), howto([...steps.map((s) => [s.color, s.head] as [string, string]), [L("화살표", "Arrows"), L("일이 흘러간 차례", "The order the work went in")]], L("이 기록에 적어 두신 내용을 일의 차례로 놓았어요. 적지 않은 칸은 그리지 않았습니다.", "What you wrote in this record, laid out in the order the work happened. Boxes you left empty are not drawn."))) : "") +
        grid(cards) +
        H(L("면접 전에 답을 준비해 둘 질문", "Questions to prepare before an interview"), L("이 기록에서 뽑았습니다", "Drawn from this record")) + ul(asks) +
        band(L("쓰는 법", "How to use this"), e.decisions.length
          ? L(`${j(q(e.decisions[0]), "을를")} 문단 첫머리에 두고, 그 판단으로 나온 결과물을 바로 이어 쓰면 자기소개서 한 문단이 됩니다.`, `Open a paragraph with ${qe(e.decisions[0])}, and follow it right away with the deliverable that came from that decision. That is one cover-letter paragraph.`)
          : L("맡았던 부분 가운데 직접 정한 것 하나를 기록에 더해 두면, 이 활동이 서류에 쓸 수 있는 경험이 됩니다.", "Add one thing you decided yourself in your part of the work to this record, and the activity becomes an experience you can use in an application.")),
    });
  });
  return out;
}

export function crossPage(x: Inputs, d: X): Page | null {
  if (!x.exps.length) return null;
  const en = isEn();
  const rows = x.m.domains.map((z) => {
    const rec = x.exps.filter((e) => e.td_codes.includes(z.code));
    const test = !d.asked(z) ? L("관심·경험까지만 물음", "Interest and exposure only") : z.confirmed.length ? L(`판단 ${z.confirmed.length}가지 직접 해 봄`, `Did ${nJ(z.confirmed.length)} myself`) : L("직접 해 본 판단은 아직", "No judgments done myself yet");
    const kind = rec.length && z.confirmed.length ? "검사·기록 모두" : rec.length ? "기록에만" : z.confirmed.length ? "검사에만" : null;
    return { z, rec, test, kind };
  }).filter((r) => r.kind);
  const color: Record<string, string> = { "검사·기록 모두": C.navy, "기록에만": C.teal, "검사에만": C.blue };
  const KIND_EN: Record<string, string> = { "검사·기록 모두": "Both", "기록에만": "Record only", "검사에만": "Assessment only" };
  return {
    part: "03", partName: PART3(x), title: L("검사와 기록의 교차 확인", "Assessment and records side by side"),
    body: T(L("검사 응답과 경험 기록이 같은 영역을 가리키는지 맞춰 봤습니다", "We checked whether your answers and your records point to the same areas"), L("두 자료가 같은 영역을 가리키면 면접에서 ‘언제, 어떤 과제에서 해 봤나요?’라는 질문에 바로 답할 수 있습니다. 한쪽에만 있는 영역은 나머지 한쪽을 채우면 됩니다.", "Where both point to the same area, you can answer “When, and on what project, did you do this?” in an interview right away. For areas that show up on only one side, fill in the other.")) +
      `<table class="tb tb-s"><thead><tr><th>${L("영역", "Area")}</th><th>${L("근거", "Evidence")}</th><th>${L("검사", "Assessment")}</th><th>${L("경험 기록", "Experience records")}</th></tr></thead><tbody>${rows.map((r) => `<tr><th>${E(d.name(r.z.code))}</th><td>${tag(en ? KIND_EN[r.kind!] : r.kind!, color[r.kind!])}</td><td>${E(r.test)}</td><td>${r.rec.length ? (en ? own(r.rec.map((e) => e.title).join(" / ")) : E(r.rec.map((e) => e.title).join(" / "))) : `<span class="mut">${L("‘경험 추가’에 적을 차례", "Next: add it under “Add an experience”")}</span>`}</td></tr>`).join("")}</tbody></table>` +
      `<div class="two">
        ${note(L("검사·기록 모두", "In both"), L("그 기록을 면접 첫 답변의 사례로 쓰세요. 기록에 적은 결과물과 체크리스트에서 고른 항목이 같은 일을 말하는지 한 번만 맞춰 보면 돼요.", "Use that record as the scene for your first interview answer. Just check once that the deliverable in the record and the items you picked in the checklist describe the same work."))}
        ${note(L("한쪽에만 있는 영역", "Areas on one side only"), L("검사에만 있다면 그 과제를 경험 기록으로 남기고, 기록에만 있다면 다음 검사에서 그 영역을 ‘해 봤다’로 답할 수 있는지 따져 보세요.", "If it is only in the assessment, write that project up as an experience record. If it is only in your records, think about whether you can answer “done it” for that area next time."), true)}
      </div>`,
  };
}

/** 열 단계를 쓰는 사람이 막힐 때 볼 한 줄. 답이 없을 때 빈 칸 대신 싣는다 */
const TRANS_HINT: Record<string, string> = {
  TR_TAG_1: "그 과제가 주로 닿은 영역", TR_TAG_2: "함께 걸친 영역이 있다면 하나",
  TR_T1: "다룬 문제를 한 줄로", TR_T2: "그대로 두면 무엇이 곤란했는지", TR_T3: "조사, 분석, 실험, 제작 가운데 어떤 방법을 썼는지",
  TR_T4: "바꾼 조건이나 값", TR_T5: "같은 조건으로 몇 번 반복했는지", TR_T6: "기준값, 이전 결과, 다른 안 가운데 무엇과 비교했는지",
  TR_T7: "처음 결과가 틀렸을 때 고친 것", TR_T8: "결과를 보고 내가 정한 값이나 기준", TR_T9: "보고서, 표, 도면처럼 남은 것", TR_T10: "그 결과를 누가 어디에 썼는지",
};
const TRANS_HINT_EN: Record<string, string> = {
  TR_TAG_1: "The main area the project touched", TR_TAG_2: "One other area, if it touched one",
  TR_T1: "The problem in one line", TR_T2: "What would have gone wrong if you left it", TR_T3: "Which method you used: research, analysis, testing or building",
  TR_T4: "The condition or value you changed", TR_T5: "How many times you repeated it under the same conditions", TR_T6: "What you compared with: a reference value, an earlier result or another option",
  TR_T7: "What you fixed when the first result was wrong", TR_T8: "The value or criterion you set after seeing the result", TR_T9: "What was left, such as a report, table or drawing", TR_T10: "Who used the result, and where",
};

export function translationPage(x: Inputs, d: X): Page | null {
  const en = isEn();
  const STEP = en ? TRANS_STEP_EN : TRANS_STEP_KO;
  const t = x.m.translation;
  if (!t || !t.steps.length || !x.m.limits.allows_translation) return null;
  const steps = t.steps.filter((s) => STEP[s.item_id]);
  if (!steps.length) return null;
  /* 보기를 안 고르고 한 줄만 적은 단계도 답한 것으로 센다(적어 주신 말을 싣는다) */
  const answered = steps.some((s) => s.choice || s.note);
  /* 답하지 않은 열 단계를 빈 표로 내지 않는다. 쓰는 칸만 남은 쪽은 빈칸으로 읽힌다 */
  if (!answered) return null;
  const ch = (id: string) => steps.find((s) => s.item_id === id)?.choice ?? null;
  /* 고른 보기로 문단 순서를 미리 짜 둔다(빈 줄을 두지 않는다) */
  const draft = (en ? [
    ch("TR_T1") && `In the first sentence, say what the problem was (${qe(ch("TR_T1")!)}).`,
    ch("TR_T8") && ch("TR_T9") ? `In the middle, write what you decided (${qe(ch("TR_T8")!)}) and what came out of it (${qe(ch("TR_T9")!)}).`
      : ch("TR_T8") ? `In the middle, write what you decided (${qe(ch("TR_T8")!)}).` : ch("TR_T9") ? `In the middle, write what came out of it (${qe(ch("TR_T9")!)}).` : "",
    ch("TR_T6") && (/didn't compare|did not compare|nothing|없/i.test(ch("TR_T6")!) ? `For what you compared with, you picked ${qe(ch("TR_T6")!)}. Next time you do the same work, compare it with one reference value or an earlier result, and the paragraph gets much stronger.` : `Put what you compared with (${qe(ch("TR_T6")!)}) right after the result, as your evidence.`),
    ch("TR_T10") && `End with where the result was used (${qe(ch("TR_T10")!)}).`,
  ] : [
    ch("TR_T1") && `첫 문장에서 어떤 문제였는지(${q(ch("TR_T1")!)}) 밝힙니다.`,
    ch("TR_T8") && ch("TR_T9") ? `가운데에는 직접 정한 것(${q(ch("TR_T8")!)})과 그 결과로 남은 것(${q(ch("TR_T9")!)})을 이어 씁니다.`
      : ch("TR_T8") ? `가운데에는 직접 정한 것(${q(ch("TR_T8")!)})을 씁니다.` : ch("TR_T9") ? `가운데에는 결과로 남은 것(${q(ch("TR_T9")!)})을 씁니다.` : "",
    ch("TR_T6") && (/없/.test(ch("TR_T6")!) ? `비교한 대상을 묻는 줄에는 ${j(q(ch("TR_T6")!), "을를")} 고르셨어요. 다음에 같은 일을 할 때 기준값이나 이전 결과 하나와 비교해 두면 문단에 설득력이 생깁니다.` : `비교한 대상(${q(ch("TR_T6")!)})은 결과 바로 뒤에 붙여 근거로 씁니다.`),
    ch("TR_T10") && `마지막 문장은 그 결과가 쓰인 곳(${q(ch("TR_T10")!)})으로 마무리합니다.`,
  ]).filter(Boolean) as string[];
  const HINT = en ? TRANS_HINT_EN : TRANS_HINT;
  return {
    part: "03", partName: PART3(x), title: L("경험 하나를 직무의 말로", "One experience in the language of the job"),
    keep: !answered,
    body: (answered
      ? T(L("검사에서 고른 경험 하나를 열 단계로 풀어 봤습니다", "One experience from your assessment, broken into ten steps"), L("검사 끝부분에서 경험 하나를 골라 문제부터 쓰임새까지 차례로 답하셨어요. 고르신 보기를 그대로 옮겼으니 지원서 문단의 뼈대로 쓰면 됩니다.", "At the end of the assessment you picked one experience and answered step by step, from the problem to where the result was used. Your choices are copied as they are, so use them as the frame for a paragraph in an application."))
      : T(L("경험 하나를 열 단계로 풀어 써 보세요", "Break one experience into ten steps"), L("검사에서 자세히 본 영역의 경험 하나를 떠올려 아래 질문에 한 줄씩 답해 보세요. 오른쪽에 무엇을 적으면 되는지 짧게 적어 두었으니, 답이 모이면 그대로 지원서 문단의 뼈대가 됩니다.", "Think of one experience from an area the assessment looked at closely, and answer each question below in one line. The right column says briefly what to write. Once the answers are in, they are the frame for a paragraph in an application."))) +
      `<table class="tb tb-s${answered ? "" : " trs"}"><tbody>${steps.map((s) => `<tr><th class="w30">${E(STEP[s.item_id])}</th><td>${s.choice ? E(s.choice) : s.note ? "" : `<span class="mut">${E(HINT[s.item_id] ?? "")}</span>`}${s.note ? (en ? `<span class="tr-note" data-own="1">“${E(s.note)}”</span>` : `<span class="tr-note">“${E(s.note)}”</span>`) : ""}</td></tr>`).join("")}</tbody></table>` +
      (t.domains.length ? `<p class="sm">${L("이 경험이 닿은 영역", "Areas this experience touched")}: ${E(t.domains.map(d.name).join(" · "))}</p>` : "") +
      (draft.length ? note(L("이 열 줄로 문단을 짜는 순서", "How to build a paragraph from these lines"), ul(draft.map(E))) : "") +
      band(L("쓰는 법", "How to use this"), L("‘무엇을 직접 정했나’에 대한 답은 면접에서 30초 안에 말할 수 있게 소리 내어 연습해 두세요.", `Practice your answer to “${TRANS_STEP_EN.TR_T8}” out loud, so you can say it in 30 seconds in an interview.`)),
  };
}

export function ch3Pages(x: Inputs, d: X): Page[] {
  const out: Page[] = [];
  x.m.domains.forEach((z, i) => out.push(domainPage(x, d, z, i + 1)));
  out.push(...ledgerPages(x, d), ...recordPages(x, d));
  const c = crossPage(x, d); if (c) out.push(c);
  const t = translationPage(x, d); if (t) out.push(t);
  return out;
}
