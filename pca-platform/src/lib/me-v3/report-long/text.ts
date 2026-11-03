/**
 * 문장을 만드는 작은 도구와 코드 → 말 표.
 *
 * 문장의 주어는 학생이거나 학생이 한 일이다. 측정 쪽 이름은 이름표로만 쓴다.
 * 사실은 `~입니다` · `~합니다`, 까닭은 `~이에요` · `~해요`, 할 일은 `~해 보세요` 로 맺어
 * 한 문단이 `…니다.` 로만 이어지지 않게 한다(docs/metri/report-writing-rules.md 3절).
 * 조사는 앞말의 받침을 보고 고른다.
 */
import type { Axis } from "../scoring/types";
import type { Action, Gap } from "../result/model";
import { withJosa } from "../result/josa";
import type { DomainDef } from "./types";
import { STEP_WORD, ZONE_WORD } from "./derive";
import { byLang, isEn } from "./lang";

/* ── 영어 문장 도구 ───────────────────────────────────────────────
   영어 책의 문장은 이것으로 잇는다. 한국어 도구(`j` · `andJoin` · `polite` …)는 영어에서
   부르면 영어 도구로 넘기거나 글자를 그대로 돌려준다. 한국어 책의 동작은 그대로다. */

/** 문장 끝 점을 뗀다 */
const bareEn = (s: string) => s.trim().replace(/[.。]+$/, "");
/** 첫 글자를 크게 */
export function capEn(s: string): string {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}
/** 문장 가운데에 넣을 때 첫 글자를 작게. 약어(`FEA` · `PCB`)와 `I` · 낱말 안에 큰 글자가 있는 이름(`CareerMatri`)은 그대로 */
export function lcEn(s: string): string {
  const t = s.trim();
  if (!t) return t;
  const first = t.split(/\s+/)[0];
  if (first === "I" || /^[A-Z0-9]{2,}/.test(first) || /^[A-Z][a-z]*[A-Z]/.test(first)) return t;
  return t[0].toLowerCase() + t.slice(1);
}
/** 문장으로 닫는다: 첫 글자를 크게, 끝에 점 하나 */
export function sentenceEn(s: string): string {
  const t = capEn(s.trim());
  if (!t) return t;
  return /[.!?…:]$/.test(t) ? t : `${t}.`;
}
/** `A and B` · `A, B and C` */
export function andJoinEn(xs: string[]): string {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return `${ys.slice(0, -1).join(", ")} and ${ys[ys.length - 1]}`;
}
/** `A or B` · `A, B or C` */
export function orJoinEn(xs: string[]): string {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return `${ys.slice(0, -1).join(", ")} or ${ys[ys.length - 1]}`;
}
/** 셋까지는 인용하고 나머지는 수로: `‘A’, ‘B’, ‘C’ and 2 more` */
export function listEn(xs: string[]): string {
  if (!xs.length) return "";
  const qs = xs.slice(0, 3).map((x) => `‘${x.replace(/^‘|’$/g, "")}’`);
  return xs.length <= 3 ? andJoinEn(qs) : `${qs.join(", ")} and ${xs.length - 3} more`;
}
/** 수와 이름씨: `1 area` · `3 areas`. 여럿 꼴을 따로 주지 않으면 `s` 를 붙인다 */
export const nEn = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** `your drawing` */
export const yoursEn = (x: string) => `your ${lcEn(bareEn(x))}`;

export const j = (word: string, pair: Parameters<typeof withJosa>[1]): string => (isEn() ? word : withJosa(word, pair));

/** ‘A와 B’ · ‘A, B와 C’ 를 받침 보고 잇는다 */
export function andJoin(xs: string[]): string {
  if (isEn()) return andJoinEn(xs);
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  /* 항목 안에 이미 ‘과/와’가 있으면(목표와 지표 표) 또 ‘와’로 이으면 경계가 안 보인다 */
  if (ys.some((y) => /[과와] /.test(y))) return ys.join(", ");
  if (ys.length === 2) return `${j(ys[0], "과와")} ${ys[1]}`;
  return `${ys.slice(0, -2).join(", ")}, ${j(ys[ys.length - 2], "과와")} ${ys[ys.length - 1]}`;
}
export function orJoin(xs: string[]): string {
  if (isEn()) return orJoinEn(xs);
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return `${ys.slice(0, -1).map((y) => j(y, "이나")).join(" ")} ${ys[ys.length - 1]}`;
}
export const dot = (xs: string[]) => xs.filter(Boolean).join(" · ");
export const q = (s: string) => `‘${s.replace(/^‘|’$/g, "")}’`;
/** 따옴표로 감싸고 조사를 붙인다: ‘강점 영역’이 */
const quoteJ = (s: string, pair: Parameters<typeof withJosa>[1]) => `‘${s}’${withJosa(s, pair).slice(s.length)}`;
/** 셋까지는 인용하고 나머지는 수로 */
export function list3(xs: string[]): string {
  if (isEn()) return listEn(xs);
  if (!xs.length) return "";
  if (xs.length <= 3) return xs.map(q).join(", ");
  return `${xs.slice(0, 3).map(q).join(", ")} 외 ${xs.length - 3}개`;
}

/** 축마다 할 일 문장에 넣는 이름씨 구 */
/**
 * 영어 쪽은 문장 가운데에 넣는 동명사 구다(소문자로 시작): `when setting the scope of the problem` ·
 * `who decided on …`. 머리말로 쓸 때는 `capEn()` 을 씌운다
 */
export const AXIS_NEED: Record<Axis, string> = byLang<Record<Axis, string>>({
  J1: "풀 문제의 범위 정하기", J2: "받은 요구를 조건으로 옮기기", J3: "기준과 값 직접 정하기", J4: "방법과 도구 고르기",
  J5: "결과물 남기기", J6: "결과를 기준과 비교하기", J7: "어긋난 까닭 찾고 고치기", J8: "결과가 다음 결정에 쓰이게 하기",
}, {
  J1: "setting the scope of the problem", J2: "turning requirements into conditions", J3: "setting criteria and values yourself",
  J4: "choosing the method and tools", J5: "producing a deliverable", J6: "comparing results with a reference",
  J7: "finding and fixing what went wrong", J8: "getting your result used in the next decision",
});
/** 영어 할 일 머리에 쓰는 명령형(`Set the scope of the problem in …`) */
const AXIS_DO_EN: Record<Axis, string> = {
  J1: "Set the scope of the problem", J2: "Turn requirements into conditions", J3: "Set criteria and values yourself",
  J4: "Choose the method and tools", J5: "Produce a deliverable", J6: "Compare results with a reference",
  J7: "Find and fix what went wrong", J8: "Get your result used in a decision",
};

/** 영어 쪽도 끝 점 없이 둔다. 부르는 자리가 `${GAP_KIND[k]} · ${gapWhy(g)}` 처럼 잇는다 */
export const GAP_KIND: Record<Gap["kind"], string> = byLang<Record<Gap["kind"], string>>({
  REQUIRED_AXIS: "꼭 필요한 판단인데 아직 직접 해 봤다는 답이 없습니다",
  OUTPUT: "해 본 일을 보여 줄 결과물을 아직 고르지 않았습니다",
  OUTPUT_EVIDENCE: "결과물을 남겼다고 답했고, 어떤 결과물인지는 아직 고르지 않았습니다",
  VERIFICATION: "결과를 무엇과 맞춰 봤는지가 아직 적혀 있지 않습니다",
  AXIS: "이 판단은 아직 직접 해 봤다는 답이 없습니다",
  PARTIAL_EVIDENCE: "해 본 일은 보이고, 직접 정했다고 말하려면 근거가 하나 더 필요합니다",
}, {
  REQUIRED_AXIS: "This decision is essential here, and your answers don't show you making it yet",
  OUTPUT: "You haven't picked a deliverable that shows this work yet",
  OUTPUT_EVIDENCE: "You said you left a deliverable but haven't picked which one yet",
  VERIFICATION: "There's no record yet of what you checked your results against",
  AXIS: "Your answers don't show you making this decision yourself yet",
  PARTIAL_EVIDENCE: "The work shows, but you need one more piece of evidence to say you made the call",
});
/** 왜 그 자리가 필요한지. 앞 문장(GAP_KIND)이 `…니다` 로 끝나므로 여기는 `…이에요` 로 맺는다 */
export const GAP_WHY: Record<Gap["why"], string> = byLang<Record<Gap["why"], string>>({
  REQUIRED_FOR_DOMAIN: "이 영역 일을 맡으면 거의 늘 하게 되는 판단이에요",
  BLOCKS_EVIDENCE: `여기까지 채우면 이 영역이 ${quoteJ(ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag, "이가")} 돼요`,
  NEEDED_BY_INDUSTRY: "고르신 산업에서 눈여겨보는 판단이에요",
  NEEDED_BY_ROLE: "고르신 직무에서 눈여겨보는 판단이에요",
}, {
  REQUIRED_FOR_DOMAIN: "You make this call almost every time you work in this area",
  /* derive 의 ZONE_WORD 영어 이름과 같은 말이다(모듈이 읽히는 때는 한국어라 글자로 적는다) */
  BLOCKS_EVIDENCE: "Fill this in and the area becomes a ‘Strength area’",
  NEEDED_BY_INDUSTRY: "The industry you picked pays close attention to this",
  NEEDED_BY_ROLE: "The role you picked pays close attention to this",
});
/** 반쯤 선 판단은 영역이 들어간 자리를 바꾸지 않는다. 채우면 단계가 올라간다 */
export const gapWhy = (g: Pick<Gap, "kind" | "why">) =>
  g.kind === "PARTIAL_EVIDENCE"
    ? (isEn() ? `One more piece of evidence moves this up to ‘${STEP_WORD[3].tag}’` : `근거를 하나 더 붙이면 ${quoteJ(STEP_WORD[3].tag, "으로")} 올라가요`)
    : GAP_WHY[g.why];
export const HORIZON_DAYS: Record<Action["horizon"], string> = byLang<Record<Action["horizon"], string>>(
  { NOW: "30일", NEXT: "60일", LATER: "90일" }, { NOW: "30 days", NEXT: "60 days", LATER: "90 days" });

/** 할 일의 짧은 이름(표와 간트 칸). 영어는 대문자로 시작하는 명령형 구다 */
export function actionHead(a: Action, dn: string): string {
  if (isEn()) return actionHeadEn(a, dn);
  const ax = a.axis ? AXIS_NEED[a.axis] : "";
  switch (a.code) {
    case "BUILD_OUTPUT": return `${dn} 결과물 한 벌 남기기`;
    case "ADD_VERIFICATION": return `${dn} 결과를 기준과 비교하기`;
    case "FILL_AXIS": return ax ? `${dn}에서 ${ax}` : `${dn}에서 한 가지 직접 정하기`;
    case "DEEPEN_OWNERSHIP": return `${dn}에서 직접 정한 것 적기`;
    case "TRY_SHORT_EXPERIENCE": return `${dn} 짧게 해 보기`;
    case "STUDY_NEXT": return `${dn} 수업 하나 듣고 써 보기`;
    case "RECHECK_DIRECTION": return `${j(dn, "을를")} 계속할지 정하기`;
    case "EXPLORE_BROADLY": return "관심 영역 하나 짧게 해 보기";
    case "WRITE_UP": return `${dn} 경험 한 쪽으로 정리하기`;
  }
}

/** 할 일 한 문장. 재료는 그 영역의 자료에서 온다 */
export function actionLine(a: Action, dn: string, def: DomainDef | undefined): string {
  if (isEn()) return actionLineEn(a, dn, def);
  const mt = a.material;
  const art = (mt.artifacts.length ? mt.artifacts : mt.workflow?.output ? [mt.workflow.output] : def?.artifacts ?? []).slice(0, 2);
  const vt = (mt.verify_targets.length ? mt.verify_targets : def?.verify_targets ?? []).slice(0, 2);
  const l2 = a.axis ? def?.axes?.[a.axis]?.l2 : "";
  switch (a.code) {
    case "BUILD_OUTPUT":
      return art.length
        ? `다음 ${dn} 과제는 끝까지 해서 ${j(orJoin(art), "을를")} 남기고, 왜 그렇게 정했는지 한 줄 붙여 보세요.`
        : `다음 ${dn} 과제에서 정한 내용을 문서 한 장으로 남겨 보세요.`;
    case "ADD_VERIFICATION":
      return vt.length
        ? `${dn}에서 낸 결과를 ${j(orJoin(vt), "과와")} 나란히 놓고, 차이와 그 까닭을 표 한 장에 적어 보세요.`
        : `${dn}에서 낸 결과를 기준값과 나란히 놓은 표 한 장을 만들어 보세요.`;
    case "FILL_AXIS":
      return l2
        ? `다음 ${dn} 과제에서 ${q(l2)} 같은 일을 직접 맡고, 고른 까닭을 한 줄 적어 보세요.`
        : `다음 ${dn} 과제에서 ${j(a.axis ? AXIS_NEED[a.axis] : "한 가지", "을를")} 직접 맡아 보세요.`;
    case "DEEPEN_OWNERSHIP":
      return l2
        ? `이미 해 본 ${dn} 과제에서 ${q(l2)}에 해당하는 일을 떠올려, 그때 직접 정한 것을 세 줄로 적어 보세요.`
        : `이미 해 본 ${dn} 과제에서 직접 정한 것을 세 줄로 적어 보세요.`;
    case "TRY_SHORT_EXPERIENCE":
      return `${j(dn, "을를")} 다루는 짧은 과제나 스터디 하나를 해 보고, 한 일과 직접 정한 것을 다섯 줄로 적어 보세요.`;
    case "STUDY_NEXT":
      return `${dn} 수업이나 교육을 하나 듣고, 배운 것을 작은 과제에 한 번 써 본 뒤 손에 남은 것을 적어 보세요.`;
    case "RECHECK_DIRECTION":
      return `${j(dn, "을를")} 앞으로도 진로로 둘지 정하고, 그 까닭을 한 줄 적어 보세요.`;
    case "EXPLORE_BROADLY":
      return "관심이 높게 나온 영역 하나를 골라 수업이나 교내 과제로 짧게 해 보고, 무엇을 했고 무엇을 정했는지 다섯 줄로 적어 보세요.";
    case "WRITE_UP": {
      const ch = mt.chain ?? [];
      return ch.length
        ? `${dn} 경험 하나를 골라 ${ch.join(", ")} 차례로 한 쪽에 정리해 보세요.`
        : `${dn} 경험 하나를 골라 무엇을 정했고 그 결과가 어디에 쓰였는지 한 쪽으로 정리해 보세요.`;
    }
  }
}

/** 할 일을 끝냈을 때 손에 남는 것 */
export function actionOutput(a: Action, def: DomainDef | undefined): string {
  if (isEn()) return actionOutputEn(a, def);
  const mt = a.material;
  const art = mt.artifacts[0] ?? mt.workflow?.output ?? def?.artifacts[0] ?? "결과 문서";
  switch (a.code) {
    case "BUILD_OUTPUT": return art;
    case "ADD_VERIFICATION": return "비교표 한 장";
    case "FILL_AXIS": return `${j(art, "과와")} 고른 까닭 한 줄`;
    case "DEEPEN_OWNERSHIP": return "직접 정한 것 세 줄";
    case "TRY_SHORT_EXPERIENCE": return "한 일 다섯 줄 기록";
    case "STUDY_NEXT": return "과제 하나와 배운 것 기록";
    case "RECHECK_DIRECTION": return "계속할지 정한 까닭 한 줄";
    case "EXPLORE_BROADLY": return "한 일 다섯 줄 기록";
    case "WRITE_UP": return "경험 정리 한 쪽";
  }
}

/* ── 할 일의 영어 문장 ─────────────────────────────────────────────
   재료는 한국어와 같다(그 영역 사전의 결과물 · 비교 대상 · 판단의 l2 행동). 사전의 l2 는
   과거형 행동(`Wrote the design scope from a given specification`)이라 ‘I …’ 로 인용한다 */
function actionHeadEn(a: Action, dn: string): string {
  switch (a.code) {
    case "BUILD_OUTPUT": return `Finish one ${dn} deliverable`;
    case "ADD_VERIFICATION": return `Compare one ${dn} result with a reference`;
    case "FILL_AXIS": return a.axis ? `${AXIS_DO_EN[a.axis]} in ${dn}` : `Make one call yourself in ${dn}`;
    case "DEEPEN_OWNERSHIP": return `Write down what you decided in ${dn}`;
    case "TRY_SHORT_EXPERIENCE": return `Try ${dn} in a short project`;
    case "STUDY_NEXT": return `Take one ${dn} course and use it once`;
    case "RECHECK_DIRECTION": return `Decide whether to keep going with ${dn}`;
    case "EXPLORE_BROADLY": return "Try one area you're curious about";
    case "WRITE_UP": return `Write up one ${dn} experience on a page`;
  }
}
const iDid = (l2: string) => `“I ${lcEn(bareEn(l2))}”`;
function actionLineEn(a: Action, dn: string, def: DomainDef | undefined): string {
  const mt = a.material;
  const art = (mt.artifacts.length ? mt.artifacts : mt.workflow?.output ? [mt.workflow.output] : def?.artifacts ?? []).slice(0, 2).map((t) => lcEn(bareEn(t)));
  const vt = (mt.verify_targets.length ? mt.verify_targets : def?.verify_targets ?? []).slice(0, 2).map((t) => lcEn(bareEn(t)));
  const l2 = a.axis ? def?.axes?.[a.axis]?.l2 : "";
  switch (a.code) {
    case "BUILD_OUTPUT":
      return art.length
        ? `See your next ${dn} project through to the end, keep the ${orJoinEn(art)}, and add one line on why you made it that way.`
        : `In your next ${dn} project, put what you decided into a one-page document.`;
    case "ADD_VERIFICATION":
      return vt.length
        ? `Take one ${dn} result, set it next to ${orJoinEn(vt)}, and write the difference and its cause in one table.`
        : `Take one ${dn} result and set it next to a reference value in one table.`;
    case "FILL_AXIS":
      return l2
        ? `In your next ${dn} project, take on a step that lets you say ${iDid(l2)}, and write one line on why you chose what you did.`
        : `In your next ${dn} project, take on ${a.axis ? AXIS_NEED[a.axis] : "one decision"} yourself.`;
    case "DEEPEN_OWNERSHIP":
      return l2
        ? `Think back to one ${dn} project you've done where you could say ${iDid(l2)}, and write three lines on what you decided yourself.`
        : `Think back to one ${dn} project you've done, and write three lines on what you decided yourself.`;
    case "TRY_SHORT_EXPERIENCE":
      return `Do one short project or study group on ${dn}, then write five lines on what you did and what you decided.`;
    case "STUDY_NEXT":
      return `Take one ${dn} course or training, use it once in a small project, and write down what you came away with.`;
    case "RECHECK_DIRECTION":
      return `Decide whether ${dn} stays on your list of career options, and write one line on why.`;
    case "EXPLORE_BROADLY":
      return "Pick one area where your interest came out high, try it briefly in a class or campus project, and write five lines on what you did and what you decided.";
    case "WRITE_UP": {
      const ch = (mt.chain ?? []).map((t) => lcEn(bareEn(t)));
      return ch.length
        ? `Pick one ${dn} experience and write it up on one page in this order: ${ch.join(", ")}.`
        : `Pick one ${dn} experience and write one page on what you decided and where the result was used.`;
    }
  }
}
function actionOutputEn(a: Action, def: DomainDef | undefined): string {
  const mt = a.material;
  const art = capEn(bareEn(mt.artifacts[0] ?? mt.workflow?.output ?? def?.artifacts[0] ?? "A write-up"));
  switch (a.code) {
    case "BUILD_OUTPUT": return art;
    case "ADD_VERIFICATION": return "One comparison table";
    case "FILL_AXIS": return `${art}, with one line on why`;
    case "DEEPEN_OWNERSHIP": return "Three lines on what you decided";
    case "TRY_SHORT_EXPERIENCE": return "Five lines on what you did";
    case "STUDY_NEXT": return "One small project and notes on what you learned";
    case "RECHECK_DIRECTION": return "One line on whether to continue, and why";
    case "EXPLORE_BROADLY": return "Five lines on what you did";
    case "WRITE_UP": return "A one-page write-up";
  }
}

/* ── 사전의 `~한다` 문장을 책의 말투로 ─────────────────────────────── */
const H0 = 0xac00;
const isSyl = (c: string) => { const k = c.charCodeAt(0); return k >= H0 && k <= 0xd7a3; };
const jong = (c: string) => (c.charCodeAt(0) - H0) % 28;
const setJong = (c: string, jg: number) => String.fromCharCode(c.charCodeAt(0) - jong(c) + jg);

/** `확정한다` → `정합니다` · `있다` → `있습니다` · `경로이다` → `경로입니다` */
export function polite(s0: string): string {
  /* 영어 사전 글은 이미 문장이다. 첫 글자와 끝 점만 맞춘다 */
  if (isEn()) return sentenceEn(s0);
  return plainVerb(politeRaw(s0));
}
function politeRaw(s0: string): string {
  const s = s0.trim().replace(/[.。]$/, "");
  if (!s.endsWith("다") || s.length < 2) return s ? `${s}.` : s;
  if (/아니다$/.test(s)) return `${s.slice(0, -3)}아닙니다.`;
  if (/(니다|습니다)$/.test(s)) return `${s}.`;
  if (s.endsWith("이다") && s.length > 2) return `${s.slice(0, -2)}입니다.`;
  if (s.endsWith("는다")) return `${s.slice(0, -2)}습니다.`;
  const prev = s[s.length - 2];
  /* 따옴표나 괄호 뒤의 `다` 는 이름씨에서 `이` 가 빠진 꼴이다(‘어느 계정인가’다) */
  if (/[’'"”)\]」』]/.test(prev)) return `${s.slice(0, -1)}입니다.`;
  if (!isSyl(prev)) return `${s}.`;
  const jg = jong(prev);
  if (jg === 4) return `${s.slice(0, -2)}${setJong(prev, 17)}니다.`;
  /* ㄹ 받침 줄기는 ㄹ 이 빠진다(드물다 → 드뭅니다) */
  if (jg === 8) return `${s.slice(0, -2)}${setJong(prev, 17)}니다.`;
  if (jg === 0) {
    /* 받침 없는 글자 + `다` 는 형용사 줄기(다르다 · 크다)이거나 이름씨에서 `이` 가
       빠진 꼴(자리다 · 근거다)이다. 한다체에서 움직씨는 늘 `~ㄴ다` 로 오므로
       나머지는 이름씨로 읽는다. 이름씨에 `ㅂ니다` 를 붙이면 `자립니다` 가 된다 */
    const stem = s.slice(0, -1);
    if (ADJ_LAST.has(prev) || ADJ_STEM.some((a) => stem.endsWith(a))) return `${s.slice(0, -2)}${setJong(prev, 17)}니다.`;
    return `${stem}입니다.`;
  }
  return `${s.slice(0, -1)}습니다.`;
}
/**
 * 사전 문장에 섞인 설계 문서 동사를 학생에게 하는 말로 바꾼다
 * (확정합니다 · 세웁니다 · 가릅니다 · 견줍니다 · 섭니다, docs/metri/report-writing-rules.md 3절).
 * 사전은 고치지 않고 책에 옮길 때만 바꾼다
 */
const plainVerb = (s: string) => s
  .replace(/확정합니다/g, "정합니다")
  .replace(/(^|\s)세웁니다/g, "$1정합니다")
  .replace(/(지|자기가|직접|스스로) 가릅니다/g, "$1 정합니다")
  .replace(/(^|\s)가릅니다/g, "$1가려냅니다")
  .replace(/견줍니다/g, "비교합니다")
  .replace(/(^|\s)안 섭니다/g, "$1서지 않습니다")
  .replace(/(^|\s)섭니다/g, "$1서 있습니다")
  .replace(/(^|\s)끊습니다/g, "$1멈춥니다");
/** 받침 없이 끝나는 형용사 줄기의 끝 글자 · 낱말 */
const ADJ_LAST = new Set([..."하르크쁘프싸짜쓰되"]);
const ADJ_STEM = ["느리", "흐리", "더디", "어리", "여리", "나쁘", "기쁘", "바쁘", "예쁘", "아프"];

/** 여러 문장짜리 `~다.` 문단을 문장마다 높임으로 나눈다. 목록(`ul`)에 한 줄씩 넣을 때 쓴다 */
export const politeList = (s0: string) => s0.trim().split(isEn() ? /(?<=[.!?])\s+(?=[A-Z0-9“‘"(])/ : /(?<=다\.)\s+/).filter(Boolean).map(polite);

/**
 * 여러 문장짜리 `~다.` 문단을 문장마다 높임으로. `…니다.` 가 세 번 이어지는 자리는
 * 셋째 문장을 `…요.` 로 바꿔 끊는다(바꿀 꼴을 모르면 그대로 둔다)
 */
export const politePara = (s0: string) => {
  if (isEn()) return politeList(s0).join(" ");
  let run = 0;
  return politeList(s0).map((t) => {
    if (!/니다\.$/.test(t)) { run = 0; return t; }
    if (++run < 3) return t;
    const y = yo(t);
    if (y) run = 0;
    return y ?? t;
  }).join(" ");
};

/** `…니다.` 한 문장을 `…요.` 로. 확실한 꼴만 바꾸고 나머지는 null */
export function yo(t: string): string | null {
  const m = /^([\s\S]*?)(입니다|합니다|됩니다|있습니다|없습니다|않습니다|갑니다|봅니다|줍니다|납니다|옵니다)\.$/.exec(t.trim());
  if (!m) return null;
  const [, head, end] = m;
  if (end === "입니다") {
    const last = head[head.length - 1];
    if (!last || !isSyl(last)) return null;
    return `${head}${jong(last) ? "이에요" : "예요"}.`;
  }
  const to: Record<string, string> = { 합니다: "해요", 됩니다: "돼요", 있습니다: "있어요", 없습니다: "없어요", 않습니다: "않아요", 갑니다: "가요", 봅니다: "봐요", 줍니다: "줘요", 납니다: "나요", 옵니다: "와요" };
  return `${head}${to[end]}.`;
}

/** `확정한다` → `확정하는` (뒤에 `일` 을 붙여 쓴다) */
export function adnominal(s0: string): string {
  if (isEn()) return lcEn(bareEn(s0));
  const s = s0.trim().replace(/[.。]$/, "");
  if (!s.endsWith("다") || s.length < 2) return s;
  if (s.endsWith("이다")) return `${s.slice(0, -2)}인`;
  if (s.endsWith("는다")) return `${s.slice(0, -2)}는`;
  const prev = s[s.length - 2];
  if (isSyl(prev) && jong(prev) === 4) return `${s.slice(0, -2)}${setJong(prev, 0)}는`;
  return `${s.slice(0, -1)}는`;
}

/** 산업팩의 판단 이름(`~는가`)을 문장 안에 넣는 꼴(`~는지`)로 */
export const askNoun = (x: string) => isEn() ? lcEn(x.trim().replace(/\?$/, "")) : x.trim().replace(/는가$/, "는지").replace(/인가$/, "인지").replace(/한가$/, "한지").replace(/ㄴ가$/, "ㄴ지");

/** 이름씨로 끝나면 `~입니다`, `~다` 로 끝나면 책의 말투로 */
export function asSentence(s0: string): string {
  if (isEn()) return sentenceEn(s0);
  const s = s0.trim().replace(/[.。]$/, "");
  if (/다$/.test(s)) return polite(s);
  return `${s}입니다.`;
}

/**
 * 사전과 공개 자료에서 옮긴 문장 가운데 책에 싣지 않을 꼴. 직무 안내 검사의 쓰지 않는 말과
 * `A가 아니라 B` 대구다. 걸리는 문장은 고쳐 쓰지 않고 그 자리를 비우거나 다른 줄을 쓴다.
 * `최적화` 는 기술 용어(구조 최적화)라 막지 않고 `최적화된` 만 막는다.
 */
const CONTENT_BAD = [/아니라/, /다양한/, /효과적으로/, /역량을 강화/, /핵심은/, /중요합니다/, /[을를] 통해/, /결국/, /혁신[적]/, /획기[적]/,
  /견줍니다/, /섭니다/, /세웠습니다/, /가지고 있/, /되어진/, /시너지/, /인사이트/, /차별화된/, /최적화된/, /이유(?:다|입니다)/];
/** 영어 사전 글에서 싣지 않을 꼴. 과장 낱말과 `not just X but Y` 대구 */
const CONTENT_BAD_EN = [/\bnot (?:just|only)\b[^.]*\bbut\b/i, /\bunlock/i, /\bempower/i, /\bjourney\b/i, /\bleverag/i, /\bholistic/i,
  /\brobust\b/i, /\bseamless/i, /\bdelve/i, /\bsynerg/i, /\bgame[- ]chang/i, /\bcutting[- ]edge/i, /\bkey to success/i];
const badRules = () => (isEn() ? CONTENT_BAD_EN : CONTENT_BAD);
export const okText = (s: string | null | undefined): s is string => !!s && !badRules().some((r) => r.test(s));
export const okOr = (s: string | null | undefined, alt = "") => (okText(s) ? s : alt);

/** 원문 인용을 앞에서부터 자른다. 싣지 않을 꼴이 나오기 전 문장에서 끊고, 남는 것이 짧으면 싣지 않는다 */
export function cutQuote(s: string, max: number): string | null {
  let end = s.length;
  for (const r of badRules()) { const m = r.exec(s); if (m && m.index < end) end = m.index; }
  let t = s.slice(0, Math.min(end, max));
  if (end < s.length || t.length < s.length) {
    const stop = isEn() ? t.lastIndexOf(". ") - 1 : Math.max(t.lastIndexOf("다. "), t.lastIndexOf("다."), t.lastIndexOf("니다"));
    if (stop > 60) t = t.slice(0, stop + 2);
    else if (end < max) return null;
    else t = `${t.trimEnd()}…`;
  }
  return t.length >= 60 ? t : null;
}
