/**
 * 결과 모델을 영어로 옮긴다. **`text.ko.ts` 와 내보내는 이름과 모양이 같다.**
 *
 * 이름 끝의 `Ko` 를 그대로 둔 까닭: 부르는 자리(`textFor(lang)`)가 두 벌을 같은
 * 이름으로 읽어야 한쪽만 고쳐지는 날이 오지 않는다. 이 파일의 `actionKo()` 는
 * 영어를 돌려준다.
 *
 * 한국어 벌과 같은 선을 지킨다.
 *
 *   1. 관찰한 것만 적는다. 적합 · 합격 · 순위 · 점수를 말하지 않는다.
 *   2. 빈자리를 `부족하다` 로 끝내지 않는다. 무엇이 비었고 왜 필요하고 다음에
 *      무엇을 하면 되는지가 한 묶음이다.
 *   3. 막연한 할 일을 쓰지 않는다. 재료는 그 영역 사전(영어 원고)에서 온다.
 *
 * 한국어의 조사 · 어미 장치(`josa.ts` · `say.ts`)는 쓰지 않는다. 영어에는 받침이
 * 없고, 고른 항목은 원고의 영어 문장을 그대로 쓴다. 들어오는 원고 글자는 이미
 * 영어다(`result/localize.ts` 가 모델을 그 언어로 읽어 넘긴다).
 */
import type { Axis, AxisState, Stage, Zone } from "../scoring/types";
import { chainFor } from "./chains";
import { REASON_EN } from "./reason.en";
import { COMMON_ME_EN, commonItemEn } from "./common.en";
import { isClause } from "./localize";
import type {
  Action, ActionCode, CommonView, FirstMove, Gap, GapWhy, HeadlineCode, PackView,
  ResultModel,
} from "./model";

/* ── 영어 문장 도구 ─────────────────────────────────────────────── */

/** `A and B` · `A, B and C` */
function andList(xs: string[]): string {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return `${ys.slice(0, -1).join(", ")} and ${ys[ys.length - 1]}`;
}
/** `A or B` · `A, B or C` */
function orList(xs: string[]): string {
  const ys = xs.filter(Boolean);
  if (ys.length <= 1) return ys[0] ?? "";
  return `${ys.slice(0, -1).join(", ")} or ${ys[ys.length - 1]}`;
}
/** 문장 끝 점을 뗀다 */
function bare(s: string): string {
  return s.trim().replace(/[.。]+$/, "");
}
/** 첫 글자를 크게 */
function cap(s: string): string {
  const t = bare(s);
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}
/**
 * 문장 가운데에 넣을 때 첫 글자를 작게. **약어와 `I` 는 그대로 둔다**
 * (`FEA report` · `PCB layout` · `I set …`).
 */
function lc(s: string): string {
  const t = bare(s);
  if (!t) return t;
  const first = t.split(/\s+/)[0];
  if (first === "I" || /^[A-Z0-9]{2,}/.test(first) || /^[A-Z][a-z]*[A-Z]/.test(first)) return t;
  return t[0].toLowerCase() + t.slice(1);
}
/** 문장으로 닫는다 */
function sentence(s: string): string {
  const t = cap(s);
  return t ? `${t}.` : "";
}
/** `your drawing` */
function yours(x: string): string {
  return `your ${lc(x)}`;
}

/* ── 축 ───────────────────────────────────────────────────────── */

/* **화면의 축 이름과 같은 말이다**(`copy.en.ts` 의 `axisLabel`, 분류 파일). 한
   쪽에 `Own decisions`, 다른 쪽에 `Technical decisions` 를 두면 같은 쪽에서 한
   판단이 두 이름으로 불린다(작업공간 영어화에서 걸렸다) */
export const AXIS_KO: Record<Axis, string> = {
  J1: "Problem definition", J2: "Requirements interpretation", J3: "Technical decisions",
  J4: "Methods and tools", J5: "Deliverables", J6: "Comparison and verification",
  J7: "Failure and correction", J8: "Organizational use",
};

export const AXIS_WHAT_KO: Record<Axis, string> = {
  J1: "What you took on as the problem",
  J2: "How you read the requirements",
  J3: "Which conditions and criteria you set yourself",
  J4: "Which methods and tools you used",
  J5: "What you produced",
  J6: "What you compared your results with",
  J7: "What you fixed when it didn't work",
  J8: "Where the result was used",
};

export const AXIS_DID_KO: Record<Axis, string> = {
  J1: "Decided what to solve",
  J2: "Turned requirements into conditions",
  J3: "Set criteria yourself",
  J4: "Chose a method and saw it through",
  J5: "Made something that lasted",
  J6: "Compared options and picked one",
  J7: "Found what was broken and fixed it",
  J8: "Saw your result put to use",
};

export const AXIS_STATE_SHORT_KO = {
  NOT_OBSERVED: "Not yet",
  PARTICIPATED: "Followed a plan",
  CONFIRMED: "Did it myself",
  OWNED: "Made the call",
} as const;

type Said = "OWNED" | "CONFIRMED" | "PARTICIPATED";
const AXIS_SENT: Record<Axis, Record<Said, string>> = {
  J1: {
    OWNED: "Decided what problem to take on",
    CONFIRMED: "Defined the problem yourself within a given scope",
    PARTICIPATED: "Helped define the problem",
  },
  J2: {
    OWNED: "Decided how to turn the requirements into conditions",
    CONFIRMED: "Turned requirements into conditions yourself",
    PARTICIPATED: "Used conditions someone else had worked out",
  },
  J3: {
    OWNED: "Set the conditions and criteria yourself",
    CONFIRMED: "Worked hands-on with the conditions and criteria",
    PARTICIPATED: "Used conditions and criteria you were given",
  },
  J4: {
    OWNED: "Chose the methods and tools yourself",
    CONFIRMED: "Used the methods and tools hands-on",
    PARTICIPATED: "Used methods and tools chosen for you",
  },
  J5: {
    OWNED: "Decided what the output would be",
    CONFIRMED: "Produced the output yourself",
    PARTICIPATED: "Helped produce the output",
  },
  J6: {
    OWNED: "Decided what to check your results against",
    CONFIRMED: "Compared your results with something else yourself",
    PARTICIPATED: "Read comparisons someone else made",
  },
  J7: {
    OWNED: "Decided what to fix when it didn't work",
    CONFIRMED: "Fixed what wasn't working yourself",
    PARTICIPATED: "Helped with the fixes",
  },
  J8: {
    OWNED: "Decided where the result would be used",
    CONFIRMED: "Followed the result through to where it was used",
    PARTICIPATED: "Heard where the result was used",
  },
};

export function axisStateKo(axis: Axis, state: AxisState): string {
  if (state === "NOT_OBSERVED") return "Not in these answers";
  return AXIS_SENT[axis][state];
}

/* ── 묶음 ─────────────────────────────────────────────────────── */

export const ZONE_TITLE_KO = {
  Z1_EVIDENCE_ESTABLISHED: "Experience you can use in applications",
  Z2_EVIDENCE_INCOMPLETE: "Work you've done that needs writing up",
  Z3_EVIDENCE_LOW_INTEREST: "Work you've done but aren't drawn to now",
  Z4_INSUFFICIENT_EVIDENCE: "Areas where you haven't done much yet",
  NOT_EXPLORED: "Areas this assessment didn't cover in depth",
} as const;

export const ZONE_LEAD_KO = {
  Z1_EVIDENCE_ESTABLISHED: "What you decided and what came out of it are both on record.",
  Z2_EVIDENCE_INCOMPLETE: "You've done the work, but there's little to show for it yet.",
  Z3_EVIDENCE_LOW_INTEREST: "You've done the work, but your interest is elsewhere right now.",
  Z4_INSUFFICIENT_EVIDENCE: "There isn't enough here to talk about yet.",
  NOT_EXPLORED: "This assessment didn't go into this area in depth.",
} as const;

/* ── 머리글 ───────────────────────────────────────────────────── */

const HEADLINE: Record<HeadlineCode, { title: string; lead: string }> = {
  EVIDENCE_READY: {
    title: "You've set the direction on real projects",
    lead: "You already have things to say in your applications.",
  },
  EVIDENCE_PARTIAL: {
    title: "You've done the work. It just needs writing up",
    lead: "Add what you decided, and you're there.",
  },
  EVIDENCE_LOW_INTEREST: {
    title: "You've built real experience, but your interest is elsewhere",
    lead: "Start by deciding whether to keep going this way.",
  },
  EXPLORING: {
    title: "You haven't done much hands-on project work yet",
    lead: "Try one short project, and you'll have something to talk about.",
  },
  NO_EVIDENCE: {
    title: "No single direction stands out yet",
    lead: "Start with the areas you said you've worked in.",
  },
};

const HEADLINE_ZONE: Partial<Record<HeadlineCode, Zone>> = {
  EVIDENCE_READY: "Z1_EVIDENCE_ESTABLISHED",
  EVIDENCE_PARTIAL: "Z2_EVIDENCE_INCOMPLETE",
  EVIDENCE_LOW_INTEREST: "Z3_EVIDENCE_LOW_INTEREST",
};

const HEADLINE_SAID: Partial<Record<HeadlineCode | "EVIDENCE_READY_OUTPUT", (where: string) => string>> = {
  EVIDENCE_READY: (w) => `You've set the direction yourself on ${w} projects`,
  /* 직접 정한 것이 확인되지 않은 사람에게 `set the direction` 을 쓰지 않는다
     (한국어 벌과 같은 까닭) */
  EVIDENCE_READY_OUTPUT: (w) => `You've seen ${w} projects through and have work to show`,
  EVIDENCE_PARTIAL: (w) => `You've done ${w} projects. They just need writing up`,
  EVIDENCE_LOW_INTEREST: (w) => `You've done ${w} projects, but your interest is elsewhere`,
};

const HEADLINE_BADGE: Record<HeadlineCode, string> = {
  EVIDENCE_READY: "Experience for your applications",
  EVIDENCE_PARTIAL: "Just needs writing up",
  EVIDENCE_LOW_INTEREST: "Real experience built",
  EXPLORING: "A good time to start",
  NO_EVIDENCE: "No clear lean yet",
};

export function headlineBadgeKo(m: ResultModel): string {
  return HEADLINE_BADGE[m.overview.headline];
}

function headlineDomains(m: ResultModel): string[] {
  const want = HEADLINE_ZONE[m.overview.headline];
  if (!want) return [];
  const inZone = new Set(m.domains.filter((d) => d.zone === want).map((d) => d.code));
  const order = m.overview.headline === "EVIDENCE_LOW_INTEREST"
    ? m.overview.low_interest : m.overview.focus;
  const picked = order.filter((c) => inZone.has(c));
  return (picked.length ? picked : [...inZone]).slice(0, 2);
}

/* ── 빈자리 ───────────────────────────────────────────────────── */

const WHY: Record<GapWhy, string> = {
  REQUIRED_FOR_DOMAIN: "Without this, your experience in this area is hard to explain",
  BLOCKS_EVIDENCE: "Without this, there's no way to show others what you did",
  NEEDED_BY_INDUSTRY: "The industry you picked asks about this a lot",
  NEEDED_BY_ROLE: "The role you picked asks about this a lot",
};

const AXIS_GAP: Record<Axis, string> = {
  J1: "It's not clear yet what you took on as the problem",
  J2: "We can't see yet how you turned requirements into conditions",
  J3: "Criteria you set yourself don't show up yet",
  J4: "Your methods and tools aren't described yet",
  J5: "Nothing concrete has come out of your projects yet",
  J6: "There's no record yet of what you compared your results with",
  J7: "Nothing yet on what you fixed when things didn't work",
  J8: "Where your results were used is still missing",
};

const AXIS_NEED: Record<Axis, string> = {
  J1: "the problem you were solving",
  J2: "how you turned requirements into conditions",
  J3: "the criteria you set yourself",
  J4: "the method you used",
  J5: "what you produced",
  J6: "what you compared it with",
  J7: "what you fixed when it didn't work",
  J8: "where the result was used",
};

export function needKo(axis: Axis): string {
  return cap(AXIS_NEED[axis]);
}

/** `You haven't noted A and B yet` */
export function needSentenceKo(axes: Axis[]): string {
  const xs = [...new Set(axes)].map((a) => AXIS_NEED[a]);
  if (!xs.length) return "";
  return `You haven't noted ${andList(xs)} yet`;
}

const GAP_TITLE: Record<Gap["kind"], (ax: string, a?: Axis | null) => string> = {
  REQUIRED_AXIS: (ax, a) => (a ? AXIS_GAP[a] : `${ax}: nothing here yet`),
  OUTPUT: () => "Nothing concrete has come out of your projects yet",
  OUTPUT_EVIDENCE: () => "You haven't picked what you produced yet",
  VERIFICATION: () => "There's no record yet of what you compared your results with",
  AXIS: (ax, a) => (a ? AXIS_GAP[a] : `${ax}: nothing here yet`),
  PARTIAL_EVIDENCE: () =>
    "Your own decisions show, but not yet what you based them on or how far your role went",
};

const GAP_SHORT: Record<Gap["kind"], (ax: string) => string> = {
  REQUIRED_AXIS: (ax) => ax,
  OUTPUT: () => "a finished output",
  OUTPUT_EVIDENCE: () => "which output you made",
  VERIFICATION: () => "what you compared against",
  AXIS: (ax) => ax,
  PARTIAL_EVIDENCE: () => "the basis and scope of your decisions",
};

export function gapShortKo(g: Gap, domainName: string): string {
  return `${domainName} · ${GAP_SHORT[g.kind](g.axis ? AXIS_NEED[g.axis] : "")}`;
}

export function gapCellKo(g: Gap): string {
  return cap(GAP_SHORT[g.kind](g.axis ? AXIS_NEED[g.axis] : ""));
}

const PARTIAL_WHY = "Your own decisions show. Applications and interviews will also ask"
  + " what you based them on and how far your role went.";

/* ── 학위마다 할 일의 깊이 (Core 판정은 그대로) ────────────────────── */

const DEPTH: Record<Stage, string> = {
  bachelor: "A class project, capstone or short study group is enough.",
  master: "Note the part of your thesis project you owned, and how you validated the results.",
  phd: "Note how you framed the problem, why you chose your method, and what uncertainty remains.",
  postdoc: "Note what you judged on your own and your share of the project."
    + " Add one sentence that puts the result in industry or institutional terms.",
};

const TRY: Record<Stage, string> = {
  bachelor: "A class project or campus assignment is plenty.",
  master: "Taking on a small piece of a lab project works.",
  phd: "A small validation study alongside your main research is the quickest route.",
  postdoc: "Take on a short collaboration or outside request, and keep a record of it.",
};

function chainOf(a: Action): string[] {
  return a.material.chain ?? [];
}

export function domainChainKo(core: string, domain: string): string[] {
  return chainFor(core, domain, "en");
}

/** 고른 항목 한 줄을 문장으로 닫는다. 낱말을 더하지 않는다 */
export function saidKo(clause: string): string {
  return sentence(clause);
}

export function keptNoteKo(hasArtifacts: boolean): string {
  return hasArtifacts
    ? "Things you made along the way."
    : "Here's what you chose and decided.";
}

/* ── 경험 하나를 한 이야기로 ───────────────────────────────────── */

export type UseSlot = "lead" | "second";

export type UseEv = {
  did?: string | null;
  decided?: string | null;
  decisions?: string[]; artifacts?: string[]; verifications?: string[];
};

export type EvidenceStory = {
  domain: string;
  action: string;
  decision?: string;
  outputs: string[];
  application: string;
  interview: string;
};

/** 남은 것의 이름. **이름을 바꾸지 않는다** */
export function keepKo(label: string): string {
  return label.trim();
}

function keepsOf(ev: UseEv): string[] {
  return (ev.artifacts ?? []).map(keepKo)
    .filter((t) => t.length >= 2 && t.length <= 48).slice(0, 2);
}

function askOf(ev: UseEv): string {
  const vs = (ev.verifications ?? []).filter((t) => t.length >= 2 && t.length <= 48);
  if (vs.length) return `How did you check your results against ${lc(vs[0])}?`;
  return "What did you base that decision on?";
}

function leadUse(core: string, domain: string): string {
  const step = chainFor(core, domain, "en")[1] ?? "";
  if (step && step.length <= 48) {
    return `Start with how you approached ${lc(step)}`;
  }
  return "Start with what you decided first";
}

function alsoUse(ev: UseEv): string {
  const keep = keepsOf(ev);
  if (keep.length) return `Add why you made ${yours(keep[0])} the way you did`;
  return "Add what you chose yourself along the way";
}

export function evidenceStoryKo(
  core: string, domain: string, ev: UseEv,
  slot: UseSlot = "lead", name = "",
): EvidenceStory {
  const did = ev.did ? cap(ev.did) : "";
  const decided = ev.decided ? cap(ev.decided) : "";
  const action = slot === "lead" ? (decided || did) : (did || decided);
  const own = slot === "second"
    ? (ev.decisions?.[0] ? cap(ev.decisions[0]) : decided)
    : did;
  return {
    domain: name,
    action,
    decision: own && own !== action ? own : undefined,
    outputs: keepsOf(ev),
    application: slot === "lead" ? leadUse(core, domain) : alsoUse(ev),
    /* 여는 경험과 같은 꼴로 묻지 않는다 */
    interview: slot === "lead" ? askOf(ev) : "Why did you decide it that way?",
  };
}

export function evidenceUsePartsKo(
  core: string, domain: string, ev: UseEv, slot: UseSlot = "lead",
): { resume: string; interview: string } {
  const s = evidenceStoryKo(core, domain, ev, slot);
  return { resume: s.application, interview: s.interview };
}

export function evidenceUseKo(core: string, domain: string, left: string | null): string {
  const s = evidenceStoryKo(core, domain, { artifacts: left ? [left] : [] });
  return `Application: ${s.application} · Interview: ${s.interview}`;
}

export function moreReadyKo(names: string[]): string {
  return names.join(" / ");
}

/* ── 할 일 ─────────────────────────────────────────────────────── */

type Mat = Action["material"];

const bring = (d: string): string => `Pick a recent ${d} project.`;
const nextIn = (d: string): string => `In your next ${d} project,`;

/** 그 영역 사전의 결과물 이름. 없으면 지어내지 않고 `alt` */
const keep = (m: Mat, i: number, alt: string): string => {
  const xs = m.artifacts;
  return xs.length ? yours(xs[i % xs.length]) : alt;
};

function fewer(list: string): string {
  const xs = list.split(/\s*[,·]\s*/).filter(Boolean);
  return orList(xs.slice(0, 2).map(lc));
}

const OWN: Record<Axis, (d: string, m: Mat) => string> = {
  J1: (d, m) => `${bring(d)} Write three lines on what you treated as the problem,`
    + ` and put them at the top of ${keep(m, 0, "your write-up")}.`,
  J2: (d, m) => `${bring(d)} Note which conditions the requirements turned into,`
    + ` and copy them into ${keep(m, 1, "your write-up")}.`,
  J3: (d, m) => `${bring(d)} ${m.workflow.decide
    ? `For each call you made, such as ${fewer(m.workflow.decide)}, add one line`
    : "For each call you made, add one line"}`
    + ` to ${keep(m, 2, "your write-up")} saying why.`,
  J4: (d, m) => `${bring(d)} Next to the other options you had, note why you chose`
    + ` ${m.workflow.method ? fewer(m.workflow.method) : "your method"}.`
    + ` Keep it in ${keep(m, 3, "your write-up")}.`,
  J5: (d, m) => `${bring(d)} Add one line each on assumptions and limits to`
    + ` ${m.artifacts.length ? `the ${orList(m.artifacts.map(lc))} you made` : "what you made"}.`,
  J6: (d, m) => `${bring(d)} Note ${m.verify_targets.length
    ? `which of ${orList(m.verify_targets.map(lc))} you compared it with`
    : "what you compared the result with"},`
    + ` and record the difference in ${keep(m, 1, "your write-up")}.`,
  J7: (d, m) => `${bring(d)} Add, step by step, what you changed when it didn't work`
    + ` to ${keep(m, 4, "your write-up")}.`,
  J8: (d, m) => `${bring(d)} Write a short paragraph on where the result was used,`
    + ` and add it to the end of ${keep(m, 5, "your write-up")}.`,
};

const FILL: Record<Axis, (d: string, m: Mat) => string> = {
  J1: (d, m) => `${nextIn(d)} decide what the problem is yourself, and write the scope`
    + ` in one line at the top of ${keep(m, 0, "your write-up")}.`,
  J2: (d, m) => `${nextIn(d)} take on turning the requirements into numbers, and record`
    + ` those conditions in ${keep(m, 1, "your write-up")}.`,
  J3: (d, m) => `${nextIn(d)} set a key target value yourself, and note in`
    + ` ${keep(m, 2, "your write-up")} why you chose it.`,
  J4: (d, m) => `${nextIn(d)} choose the method yourself, and add one line on why to`
    + ` ${keep(m, 3, "your write-up")}.`,
  J5: (d, m) => `${nextIn(d)} see it through and come away with`
    + ` ${m.artifacts.length ? `a finished ${lc(m.artifacts[0])}` : "something finished you can show"}.`,
  J6: (d, m) => `${nextIn(d)} check your result a second way, and put both values side by side`
    + ` in ${keep(m, 4, "your write-up")}.`,
  J7: (d, m) => `${nextIn(d)} narrow down why something failed, fix it, and log what you did`
    + ` in ${keep(m, 5, "your write-up")}.`,
  J8: (d, m) => `${nextIn(d)} follow where your result ends up being used, and note it`
    + ` at the end of ${keep(m, 2, "your write-up")}.`,
};

const ACTION_HEAD: Record<ActionCode, string> = {
  WRITE_UP: "Write up one experience on a single page",
  DEEPEN_OWNERSHIP: "Write down what you decided",
  BUILD_OUTPUT: "Come away with one concrete output",
  ADD_VERIFICATION: "Compare one of your results",
  FILL_AXIS: "Make one call yourself in your next project",
  TRY_SHORT_EXPERIENCE: "Try one thing briefly",
  EXPLORE_BROADLY: "Pick one thing and try it briefly",
  STUDY_NEXT: "Use what you learn in a small project",
  RECHECK_DIRECTION: "Decide whether to keep going",
};

const HEAD_NEED: Record<Axis, string> = {
  J1: "the problem you took on",
  J2: "the conditions behind the requirements",
  J3: "the criteria you set",
  J4: "the method you used",
  J5: "what you produced",
  J6: "what you compared against",
  J7: "what you fixed",
  J8: "where results were used",
};

/** 다음 과제에서 직접 정할 것. `직접 정한` 을 겹쳐 쓰지 않는다 */
const FILL_NEED: Record<Axis, string> = {
  J1: "the problem",
  J2: "the conditions",
  J3: "the criteria",
  J4: "the method",
  J5: "the output",
  J6: "what to compare against",
  J7: "the fix",
  J8: "where the result goes",
};

export function actionHeadKo(a: Action, domainName?: string): string {
  const d = (domainName ?? "").trim();
  if (!d) return ACTION_HEAD[a.code];
  const need = a.axis ? HEAD_NEED[a.axis] : null;
  switch (a.code) {
    case "WRITE_UP": return `Write up one ${d} experience on a single page`;
    case "DEEPEN_OWNERSHIP":
      return need ? `Write down ${need} in your ${d} work`
        : `Write down what you decided in your ${d} work`;
    case "BUILD_OUTPUT": return `Come away with one concrete output from a ${d} project`;
    case "ADD_VERIFICATION": return `Compare one of your ${d} results`;
    case "FILL_AXIS":
      return a.axis ? `Decide ${FILL_NEED[a.axis]} yourself in your next ${d} project`
        : `Make one call yourself in your next ${d} project`;
    case "TRY_SHORT_EXPERIENCE": return `Try a short piece of ${d} work`;
    case "STUDY_NEXT": return `Use what you learn in ${d} in a small project`;
    case "RECHECK_DIRECTION": return `Decide whether to keep going with ${d}`;
    case "EXPLORE_BROADLY": return ACTION_HEAD[a.code];
  }
}

export function actionBriefKo(
  a: Action, domainName: string, where?: string[],
): string {
  const d = domainName || "the area you're looking at";
  const need = a.axis ? AXIS_NEED[a.axis] : null;
  switch (a.code) {
    case "WRITE_UP":
      return `Use a recent ${d} project. One page is enough.`;
    case "DEEPEN_OWNERSHIP":
      return need
        ? `Use one ${d} project. Three lines on ${need} is enough.`
        : `Use one ${d} project. Three lines on what you decided is enough.`;
    case "BUILD_OUTPUT":
      return `In your next ${d} project, aim to finish with one document you can show.`;
    case "ADD_VERIFICATION":
      return `Take one result from your ${d} work and set it beside a reference value in one table.`;
    case "FILL_AXIS":
      return a.axis
        ? `In your next ${d} project, set ${FILL_NEED[a.axis]} yourself and write one line on why.`
        : `In your next ${d} project, make one call yourself and write one line on why.`;
    case "TRY_SHORT_EXPERIENCE":
      return `Try ${d} once in a class project, then write five lines on what you did.`;
    case "EXPLORE_BROADLY": {
      const list = (where ?? []).slice(0, 2);
      return list.length
        ? `Try ${orList(list)} briefly, then write five lines on what you did.`
        : "Try one class project briefly, then write five lines on what you did.";
    }
    case "STUDY_NEXT":
      return `Take one ${d} course, use what you learn in a small project, and keep a record.`;
    case "RECHECK_DIRECTION":
      return `Decide whether to keep going with ${d}, and write one line on why.`;
  }
}

const ACTION_WHY: Record<ActionCode, string> = {
  WRITE_UP: "A one-page summary makes it much easier to explain in an interview.",
  DEEPEN_OWNERSHIP: "Three lines is enough to show, in an application, how you made your calls.",
  BUILD_OUTPUT: "With something to show, you can point to real work.",
  ADD_VERIFICATION: "A comparison table lets you explain how you checked your numbers.",
  FILL_AXIS: "One line on why lets you explain what you decided in that project.",
  TRY_SHORT_EXPERIENCE: "Even a short try gives you something real to write about next time.",
  EXPLORE_BROADLY: "Trying one thing gives you a yardstick for comparing the rest.",
  STUDY_NEXT: "Putting a course to use in a real project leaves you with something to show.",
  RECHECK_DIRECTION: "Deciding now makes it clearer what to build next.",
};

export function actionWhyKo(a: Action): string {
  if (a.code === "DEEPEN_OWNERSHIP" && a.axis && a.axis !== "J3") {
    return `Three lines is enough to describe ${AXIS_NEED[a.axis]} in an application.`;
  }
  return ACTION_WHY[a.code];
}

/**
 * 고르신 항목 둘을 한 문장으로. **낱말을 더하지 않는다**: 문장이면 그대로 잇고,
 * 이름표(원본이 `~다` 가 아닌 것)면 `You've worked with …` 한 마디만 붙인다.
 */
export function pickSentenceKo(picks: string[]): string {
  const x = picks.filter(Boolean).slice(0, 2);
  if (!x.length) return "";
  if (!x.every((t) => isClause(t, "en"))) {
    return `You've worked with ${andList(x.map(lc))}.`;
  }
  if (x.length === 1) return sentence(x[0]);
  return `${cap(x[0])}, and ${lc(x[1])}.`;
}

export function gapNeedShortKo(g: Gap): string {
  if (g.axis) return needSentenceKo([g.axis]);
  return `You haven't noted ${GAP_SHORT[g.kind]("")} yet`;
}

export function gapNeedKo(g: Gap, domainName: string): string {
  return `${domainName}: ${gapNeedShortKo(g)}`;
}

export function actionKo(
  a: Action, domainName: string, stage?: Stage, where?: string[],
): { do: string; note?: string; guide?: string } {
  const w = a.material.workflow;
  const arts = a.material.artifacts.length ? a.material.artifacts
    : (w?.output ? [w.output] : []);
  const art = orList(arts.map(lc));
  const vts = a.material.verify_targets;
  const vt = orList((vts.join("").length > 60 ? vts.slice(0, 1) : vts.slice(0, 2)).map(lc));
  const depth = stage ? DEPTH[stage] : undefined;

  if (a.code === "WRITE_UP") {
    const chain = chainOf(a).join(" → ");
    return {
      do: chain
        ? `${bring(domainName)} On one page, write down what you decided and what came out of it.`
        : `${bring(domainName)} Write a paragraph on what you decided and where the result was used.`,
      note: depth,
      guide: chain ? `Write it in this order: ${chain}.` : undefined,
    };
  }
  if (a.code === "DEEPEN_OWNERSHIP" && a.axis) {
    return { do: OWN[a.axis](domainName, a.material), note: depth };
  }
  if (a.code === "EXPLORE_BROADLY") {
    const list = (where ?? []).slice(0, 2);
    return {
      do: list.length
        ? `Pick ${orList(list)} and try it briefly as a class or campus project.`
          + " Write five lines on what you did and what you decided."
        : "Pick a class or campus project and try it briefly."
          + " Write five lines on what you did and what you decided.",
    };
  }
  if (a.code === "BUILD_OUTPUT") {
    const chain = chainOf(a).slice(0, 3).join(" → ");
    return {
      do: art
        ? `${nextIn(domainName)} see it through and come away with a finished ${art}.`
        : `${nextIn(domainName)} put what you decided into one document.`,
      note: chain ? undefined : depth,
      guide: chain ? `If you have notes on ${chain}, that's material you can explain.` : undefined,
    };
  }
  if (a.code === "ADD_VERIFICATION") {
    const target = vt || "a reference value";
    return {
      do: `${nextIn(domainName)} compare your result with ${target}, and record the difference`
        + " and the reason in a single table.",
      note: w?.on_fail ? `If they don't match: ${lc(w.on_fail)}.` : undefined,
    };
  }
  if (a.code === "FILL_AXIS" && a.axis) {
    return { do: FILL[a.axis](domainName, a.material), note: depth };
  }
  if (a.code === "TRY_SHORT_EXPERIENCE") {
    return {
      do: `Pick a short project or study group that covers ${domainName}.`
        + " Write five lines on what you did and what you decided.",
      note: stage ? TRY[stage] : undefined,
    };
  }
  if (a.code === "STUDY_NEXT") {
    return {
      do: `Take one ${domainName} course or training. Use what you learn once in a small`
        + " project, and note what came out of it.",
      note: "What you keep from that project becomes evidence you can explain later.",
    };
  }
  return {
    do: `${bring(domainName)} Write up what you did on one page,`
      + " then decide whether it's experience you want to keep building on.",
  };
}

export function gapKo(g: Gap, domainName: string): {
  title: string; why: string; detail: string;
} {
  const ax = g.axis ? AXIS_KO[g.axis] : "";
  return {
    title: `${domainName} · ${GAP_TITLE[g.kind](ax, g.axis ?? null)}`,
    why: g.kind === "PARTIAL_EVIDENCE" ? PARTIAL_WHY : WHY[g.why],
    detail: REASON_EN[g.reason],
  };
}

/** 산업과 직무와 근거와 빈자리를 한 이야기로. 세 토막 다 모델의 값에서만 온다 */
export function bridgeKo(
  pack: PackView, packName: string,
  domainName: (td: string) => string,
  action: Action | null, stage?: Stage,
): string[] {
  const out: string[] = [];
  const est = pack.established[0];
  if (est && est.axes.length) {
    const needs = andList(est.axes.slice(0, 2).map((a) => AXIS_NEED[a]));
    out.push(`In ${domainName(est.domain)}, you've already noted ${needs}.`);
  }
  const req = pack.requested[0];
  if (req) {
    out.push(`To aim for ${packName}, it would help to also note ${AXIS_NEED[req.axis]}`
      + ` in ${domainName(req.domain)}.`);
  }
  if (action) {
    const k = actionKo(action, action.domain ? domainName(action.domain) : packName, stage);
    out.push(k.do);
  }
  return out;
}

function headlineLead(m: ResultModel): string | null {
  const code = headlineDomains(m)[0];
  const d = code ? m.domains.find((x) => x.code === code) : undefined;
  if (!d) return null;
  if (!d.decided.length && !d.did.length) return null;
  if (m.overview.headline === "EVIDENCE_PARTIAL") return "Add what you decided, and you're there.";
  if (m.overview.headline === "EVIDENCE_READY") {
    return "Carry what's confirmed into your applications, and add the numbers and results yourself.";
  }
  if (m.overview.headline === "EVIDENCE_LOW_INTEREST") {
    return "All that's left is deciding whether to keep going this way.";
  }
  return null;
}

export function headlineKo(
  m: ResultModel, name?: (td: string) => string,
): { title: string; lead: string } {
  const base = HEADLINE[m.overview.headline];
  const lead = headlineLead(m) ?? base.lead;
  const doms = headlineDomains(m);
  const first = m.domains.find((d) => d.code === doms[0]);
  const j3 = first?.axes.find((a) => a.axis === "J3")?.state;
  const ownedWord = j3 === "CONFIRMED" || j3 === "OWNED";
  const said = m.overview.headline === "EVIDENCE_READY" && !ownedWord
    ? HEADLINE_SAID.EVIDENCE_READY_OUTPUT
    : HEADLINE_SAID[m.overview.headline];
  if (!name || !said) return { title: base.title, lead };
  const names = doms.map(name).filter(Boolean);
  if (!names.length) return { title: base.title, lead };
  const title = said(andList(names));
  /* 영어는 한국어보다 길다. 두 이름이 한 줄 반을 넘기면 첫 이름만 적는다 */
  return { title: title.length > 72 ? said(names[0]) : title, lead };
}

export const TIER_NOTE_KO = {
  BASIC: "These results help you decide where to look first."
    + " They don't include the in-depth experience questions yet.",
  STANDARD: "This covers the areas where your experience is confirmed, and what's still missing.",
  PRO: "We've put one research or project experience into job language."
    + " You'll also see how it reads in the industry and role you picked.",
} as const;

export const TRANS_STEP_KO: Record<string, string> = {
  TR_TAG_1: "Area this project touched",
  TR_TAG_2: "Other areas it touched",
  TR_T1: "What the problem was",
  TR_T2: "Why it was a problem",
  TR_T3: "How you approached it",
  TR_T4: "What you changed",
  TR_T5: "How many times you ran it",
  TR_T6: "What you compared against",
  TR_T7: "What you fixed when it didn't work",
  TR_T8: "What you decided yourself",
  TR_T9: "What came out of it",
  TR_T10: "Where the result was used",
};

export const FIRST_MOVE_KO: Record<FirstMove, string> = {
  FILL_GAP: "What to fill in first",
  WRITE_UP: "What to write up for applications and interviews",
  DECIDE_DIRECTION: "What to decide first",
  TRY: "What to try now",
  NONE: "What to try now",
};

export const BASIC_GROUP_KO = {
  do_now: {
    title: "Areas to try hands-on",
    lead: "You said you're interested and keen to learn. Start with the next steps below.",
  },
  scan: {
    title: "Areas to explore briefly",
    lead: "Either your interest or your wish to learn is high. Take a quick look, then decide.",
  },
  low: {
    title: "Lower priority for now",
    lead: "You said your interest here is low. You can come back to these later.",
  },
  unseen: {
    title: "Areas you didn't rate",
    lead: "You didn't rate your interest here. That doesn't mean you have no experience.",
  },
} as const;

export const HORIZON_KO = {
  NOW: "Now",
  NEXT: "In your next project",
  LATER: "Worth another look",
} as const;

export const QUALITY_KO = {
  OK: "",
  REVIEW: "Some answers didn't line up, so we only included what was confirmed more than once.",
  LOW_VARIANCE: "Your answers were very similar across areas, so we couldn't narrow down where"
    + " to look first. Next time, separate what draws you from what doesn't, and the picture"
    + " will get clearer.",
  INCONSISTENT: "Two questions about the same experience got different answers, so we went with the lower one.",
} as const;

/** 번역 열 단계를 한 문단으로. 고르신 보기만 잇고 성과를 보태지 않는다 */
export function draftKo(
  steps: { item_id: string; choice: string | null }[],
): string[] {
  const by = new Map(steps.filter((x) => x.choice).map((x) => [x.item_id, x.choice as string]));
  const out: string[] = [];
  for (const id of ["TR_T1", "TR_T2", "TR_T4", "TR_T8", "TR_T3",
                    "TR_T9", "TR_T6", "TR_T7"]) {
    const v = by.get(id);
    if (!v) continue;
    /* 문제 두 칸은 이름 구(`Finding out why …`)라서 문장 틀에 넣는다 */
    if (id === "TR_T1") out.push(`The problem: ${lc(v)}.`);
    else out.push(sentence(v));
  }
  const used = by.get("TR_T10");
  if (used) out.push(`The result was used ${lc(used)}.`);
  return out;
}

/** 고른 보기와 덧붙인 한 줄을 한 칸으로. 한 줄만 있으면 그 말만 따옴표로 */
export function withNote(choice: string | null, note?: string | null): string | null {
  const n = (note ?? "").trim();
  if (choice && n) return `${choice} (“${n}”)`;
  return choice ?? (n ? `“${n}”` : null);
}

export type DraftFrame = { label: string; hint: string; items: string[] }[];
export function draftFrameKo(
  steps: { item_id: string; choice: string | null; note?: string | null }[],
): DraftFrame {
  /* The line the student added stands in the same slot, quoted */
  const by = new Map(steps
    .map((x) => [x.item_id, withNote(x.choice, x.note)] as const)
    .filter((x): x is readonly [string, string] => !!x[1]));
  const pick = (ids: string[]) => ids.map((id) => by.get(id)).filter((v): v is string => !!v);
  return [
    { label: "Role and situation", hint: "What the problem was in your role, and why it mattered",
      items: pick(["TR_T1", "TR_T2"]) },
    { label: "Action", hint: "What you changed, how, and how many times you ran it",
      items: pick(["TR_T4", "TR_T3", "TR_T5"]) },
    { label: "Judgment", hint: "What you decided, what you compared against, and what you fixed",
      items: pick(["TR_T8", "TR_T6", "TR_T7"]) },
    { label: "Result", hint: "What came out of it and where it was used. Add numbers and timelines yourself",
      items: pick(["TR_T9", "TR_T10"]) },
  ].filter((f) => f.items.length);
}

export const TRANS_ORDER = [
  "TR_T1", "TR_T2", "TR_T4", "TR_T8", "TR_T3",
  "TR_T5", "TR_T9", "TR_T6", "TR_T7", "TR_T10",
] as const;

export function xfieldKo(id: string, major: string): string | null {
  switch (id) {
    case "XF_FIELD": return "Your graduate field";
    case "XF_BRIDGE": return `Methods you can use on ${major} problems`;
    case "XF_ME_RECENT": return `When you last did ${major} work`;
    case "XF_ME_DEPTH": return "Your deepest undergraduate project";
    default: return null;
  }
}

export const XFIELD_ORDER = [
  "XF_ME_DEPTH", "XF_ME_RECENT", "XF_FIELD", "XF_BRIDGE",
] as const;

export const COMMON_ITEM_KO: Record<string, string> = COMMON_ME_EN;

export function commonKo(v: CommonView, core: string): {
  owned: string[]; confirmed: string[];
  didOwn: string[]; didConfirm: string[];
} {
  const owned = v.axes.filter((a) => a.owned).map((a) => AXIS_KO[a.axis]);
  const confirmed = v.axes
    .filter((a) => a.confirmed && !a.owned).map((a) => AXIS_KO[a.axis]);
  const name = (id: string) => commonItemEn(core, id) ?? undefined;
  const items = v.items ?? [];
  const didOwn = items.filter((i) => i.owned).map((i) => name(i.item_id))
    .filter((x): x is string => !!x);
  const didConfirm = items.filter((i) => i.confirmed && !i.owned)
    .map((i) => name(i.item_id)).filter((x): x is string => !!x);
  return { owned, confirmed, didOwn, didConfirm };
}

/* ── 영어 벌에만 있는 것 ─────────────────────────────────────────── */

/**
 * 첫 화면 `현재 상태` 의 머리 한 줄(`student/state.ts` 의 `leadKo` 와 같은 자리).
 * 그 함수는 결과 화면과 작업공간이 같이 쓰는 한국어라 여기에 영어 벌을 둔다.
 */
export function stateLeadEn(c: { established: number; incomplete: number; interest: number }): string {
  const n = (k: number) => (k === 1 ? "1 area" : `${k} areas`);
  const { established: a, incomplete: b, interest: i } = c;
  if (a && !b) return `${n(a)} you can explain now`;
  if (b && !a) return `${n(b)} you've worked in that need writing up`;
  if (a && b) return `${n(a)} you can explain · ${n(b)} that need writing up`;
  if (i) return `${n(i)} to look at first, based on your interest`;
  return "";
}
