import type { Experience } from "@/lib/me-v3/platform";
import type { PostingItem } from "./posting";
import { composeSentences, composeSentencesEn } from "./sentence";

/**
 * 대학원생 · 박사후연구원을 위한 MAT 의 세 자리.
 *
 *   1. 연구 실적 요구 읽기: 공고의 `SCI 논문` · `특허` · `국책과제 수행` ·
 *      `학회 발표` · `연구계획서` · `박사 학위` 줄을 따로 모아, 적어 둔 기록에
 *      그것을 받쳐 줄 것이 있는지 나눠 적는다
 *   2. 연구 경험을 직무 말로: 연구·논문 경험마다 문장 뼈대와 학위 단계별로
 *      먼저 적어 둘 한 줄
 *   3. 연구직 면접 질문: 학위 단계마다 자주 받는 질문과 가져갈 연구 경험
 *
 * **학부생 화면은 그대로다.** 1번은 학위와 관계없이 연구직 공고면 서고,
 * 2·3번은 석사 이상에게만 선다.
 *
 * **학위로 사람을 올리지 않는다.** 박사라서 `준비됨` 이 되는 줄이 없다.
 * 판정은 적어 둔 기록에 그 결과물이 있는가 하나다. 포닥이 박사보다 저절로
 * 앞서는 줄도 없다(검사의 원칙과 같다).
 *
 * **지어내지 않는다.** 문장에 들어가는 말은 경험 칸에 적힌 글과 아래 틀뿐이다.
 * 게재지 · 저자 순서 · 인용 수 · 과제 금액을 짐작해 넣지 않는다. 그 칸은 학생이
 * 채운다.
 *
 * **합격 가능성을 말하지 않는다.** 실적이 공고 기준에 맞는지(`SCI 2편 이상`
 * 의 편수 같은 것)는 판단하지 않고, 기록에 있는지 없는지만 적는다.
 *
 * DB 를 읽지 않는 순수 함수다(`npm run mat:grad` 가 직접 부른다).
 */

export type GradStage = "bachelor" | "master" | "phd" | "postdoc";
export const isGrad = (s: GradStage | null | undefined): s is "master" | "phd" | "postdoc" =>
  s === "master" || s === "phd" || s === "postdoc";

/* ── 1. 연구 실적 요구 ─────────────────────────────────────────── */

export type ResearchKind = "paper" | "patent" | "project" | "talk" | "proposal" | "degree";

/**
 * 공고 줄에서 연구 실적을 찾는 말. **차례가 곧 우선순위다**: `SCI 논문 및 특허`
 * 처럼 한 줄에 둘이 있으면 앞엣것으로 읽는다(한 줄이 두 번 서지 않게).
 * 학위 줄(`박사 학위 소지자`)은 맨 뒤다: `박사 학위 논문` 은 논문 쪽이 아니라
 * 학위 조건이지만, `박사후연구원 SCI 논문` 은 논문 쪽이다.
 */
const KIND_RE: [ResearchKind, RegExp][] = [
  ["paper", /(논문(?!\s*지도)|SCIE?\b|SSCI|KCI|\bSCOPUS\b|저널|학술지|제?1\s*저자|주저자|교신\s*저자|first[- ]author|corresponding author|publication|peer[- ]reviewed|journal)/i],
  ["patent", /(특허|patent)/i],
  ["project", /(국책\s*과제|국가\s*(연구\s*)?과제|정부\s*과제|연구\s*과제|R&D\s*과제|과제\s*(수행|관리|책임|참여|기획)|연구\s*책임|\bPI\b|grant(?!\s*(writing|proposal))|funded (research )?project|research project)/i],
  ["talk", /(학회\s*발표|학술\s*(대회|발표)|포스터\s*발표|구두\s*발표|conference (talk|presentation|paper)|poster presentation)/i],
  ["proposal", /(연구\s*계획서|연구\s*제안|과제\s*제안|제안서\s*작성|research proposals?|grant proposals?|proposal writing|grant writing)/i],
  ["degree", /(박사\s*(학위|과정|졸업|이상)|석사\s*(학위|과정|졸업|이상)|박사후|포스트\s*닥|post[- ]?doc|Ph\.?\s*D|master'?s degree|doctoral|학위\s*논문|thesis|dissertation)/i],
];

export function researchKindOf(text: string): ResearchKind | null {
  /* `학위 논문` 은 학위 조건으로 읽는다(논문 실적과 다르다) */
  if (/학위\s*논문|thesis|dissertation/i.test(text) && !/SCIE?|KCI|저널|학술지|journal|저자|author/i.test(text)) {
    return "degree";
  }
  for (const [k, re] of KIND_RE) if (re.test(text)) return k;
  return null;
}

export type ResearchStatus = "ready" | "partial" | "empty" | "info";

export type ResearchAsk = {
  text: string;
  kind: "must" | "nice";
  research: ResearchKind;
  status: ResearchStatus;
  /** 받쳐 줄 수 있는 기록. 제목만 */
  evidence: { id: string; title: string }[];
  /** 다음에 할 한 줄 */
  next: string;
};

const blob = (e: Experience) =>
  [e.title, ...(e.artifacts ?? []), ...(e.problems ?? []), ...(e.used_where ?? []), e.note_text ?? ""].join(" ");
const RESEARCH_KINDS = new Set(["research", "paper"]);
const isResearch = (e: Experience) => RESEARCH_KINDS.has(e.kind);
const hasOut = (e: Experience) => (e.artifacts ?? []).some((x) => x.trim());

/** 실적 종류마다 받쳐 줄 기록을 고른다. `full` 은 결과물 칸까지 찬 것 */
function backing(kind: ResearchKind, exps: Experience[]): { full: Experience[]; part: Experience[] } {
  const pick = (f: (e: Experience) => boolean) => exps.filter(f);
  switch (kind) {
    case "paper": {
      const named = pick((e) => e.kind === "paper" || /논문|paper|journal|저널|학술지/i.test(blob(e)));
      return { full: named.filter(hasOut), part: named.filter((e) => !hasOut(e)).concat(pick((e) => e.kind === "research" && !named.includes(e))) };
    }
    case "patent": {
      const named = pick((e) => /특허|patent/i.test(blob(e)));
      return { full: named, part: [] };
    }
    case "project": {
      /* 과제 수행은 연구 기록(`research`)으로 받친다. 논문 하나를 과제 수행으로
         세면 과제를 맡아 본 적 없는 사람이 `있음` 을 받는다. 논문은 `덜 적힘` 까지다 */
      const r = pick((e) => e.kind === "research");
      const done = (e: Experience) => hasOut(e) && (e.decisions ?? []).length > 0;
      return { full: r.filter(done), part: r.filter((e) => !done(e)).concat(pick((e) => e.kind === "paper")) };
    }
    case "talk": {
      const named = pick((e) => /학회|발표|conference|poster|포스터|talk/i.test(blob(e)));
      return { full: named.filter(hasOut), part: named.filter((e) => !hasOut(e)).concat(pick((e) => e.kind === "paper" && !named.includes(e))) };
    }
    case "proposal": {
      const named = pick((e) => /계획서|제안서|proposal/i.test(blob(e)));
      return { full: named, part: pick((e) => e.kind === "research" && !named.includes(e)) };
    }
    case "degree":
      return { full: [], part: pick(isResearch) };
  }
}

const NEXT_KO: Record<ResearchKind, Record<"ready" | "partial" | "empty", string>> = {
  paper: {
    ready: "적어 둔 논문 기록에서 내가 직접 정한 것 한 줄을 지원서 첫 문장으로 옮겨 보세요.",
    partial: "논문 기록의 남긴 것 칸에 게재지와 저자 순서를 적어 두면 이 줄을 설명할 재료가 생겨요.",
    empty: "게재했거나 투고 중인 논문이 있다면 경험 추가에서 ‘논문·학회’ 종류로 하나 적어 두세요.",
  },
  patent: {
    ready: "특허 기록에서 내가 낸 아이디어와 맡은 청구항 범위를 나눠 한 줄씩 적어 두세요.",
    partial: "특허 기록의 남긴 것 칸에 출원인지 등록인지와 번호를 적어 두세요.",
    empty: "출원했거나 발명자로 이름이 오른 특허가 있다면 경험 추가에서 남긴 것 칸에 적어 두세요.",
  },
  project: {
    ready: "과제 기록에서 내가 맡은 범위(일정 · 사람 · 장비)를 한 줄로 더해 두면 면접에서 그대로 꺼낼 수 있어요.",
    partial: "연구 기록에 직접 정한 것과 남긴 것을 하나씩 골라 두면 과제 수행 경험으로 설명할 수 있어요.",
    empty: "참여한 연구 과제가 있다면 경험 추가에서 ‘연구·실험’ 종류로 과제 이름과 맡은 일을 적어 두세요.",
  },
  talk: {
    ready: "발표 기록에서 받은 질문 하나와 그 뒤에 바꾼 것을 한 줄로 적어 두세요.",
    partial: "발표 기록의 남긴 것 칸에 학회 이름과 발표 형식(구두 · 포스터)을 적어 두세요.",
    empty: "학회에서 발표한 적이 있다면 경험 추가에서 ‘논문·학회’ 종류로 적어 두세요.",
  },
  proposal: {
    ready: "계획서 기록에서 내가 쓴 부분(목표 · 방법 · 일정 가운데)을 나눠 적어 두세요.",
    partial: "연구 기록에 계획서나 제안서를 쓴 부분이 있다면 남긴 것 칸에 그 이름을 적어 두세요.",
    empty: "연구계획서나 과제 제안서를 쓴 적이 있다면 경험 추가에서 남긴 것 칸에 그 문서를 적어 두세요.",
  },
  degree: {
    ready: "",
    partial: "학위 조건은 기록으로 판단하지 않아요. 학위 연구 기록을 면접에서 설명할 재료로 가져가세요.",
    empty: "학위 조건은 기록으로 판단하지 않아요. 학위 연구를 경험 하나로 적어 두면 면접에서 설명할 재료가 생겨요.",
  },
};

const NEXT_EN: Record<ResearchKind, Record<"ready" | "partial" | "empty", string>> = {
  paper: {
    ready: "Take one thing you decided yourself from your paper record and use it as the first line of your application.",
    partial: "Add the venue and your author position to the paper record's output field so you can explain this line.",
    empty: "If you have a published or submitted paper, add it under Paper or conference in Add experience.",
  },
  patent: {
    ready: "Write one line each on the idea you contributed and the claims you were responsible for.",
    partial: "Add whether the patent is filed or granted, and its number, to the output field.",
    empty: "If you are named as an inventor on a patent, add it to the output field in Add experience.",
  },
  project: {
    ready: "Add one line on the scope you handled (schedule, people, equipment) so you can bring it up in interviews.",
    partial: "Pick one thing you decided and one thing you produced in your research record so it reads as project work.",
    empty: "If you worked on a funded research project, add it under Research or lab work with the project name and your part.",
  },
  talk: {
    ready: "Write down one question you were asked and what you changed afterwards.",
    partial: "Add the conference name and the format (talk or poster) to the output field.",
    empty: "If you have presented at a conference, add it under Paper or conference.",
  },
  proposal: {
    ready: "Split out the parts you wrote yourself (aims, methods, schedule) in your proposal record.",
    partial: "If you wrote part of a proposal in your research, add that document to the output field.",
    empty: "If you have written a research or grant proposal, add that document to the output field in Add experience.",
  },
  degree: {
    ready: "",
    partial: "Degree requirements are not judged from your record. Bring your degree research as material to explain in interviews.",
    empty: "Degree requirements are not judged from your record. Add your degree research as one experience so you have material for interviews.",
  },
};

/**
 * 공고의 요구 항목 가운데 연구 실적 줄만 모은다. 같은 문장은 한 번만 세운다.
 */
export function researchAsks(items: PostingItem[], exps: Experience[], lang: "ko" | "en" = "ko"): ResearchAsk[] {
  const seen = new Set<string>();
  const out: ResearchAsk[] = [];
  for (const it of items) {
    const kind = researchKindOf(it.text);
    if (!kind) continue;
    const key = it.text.replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const b = backing(kind, exps);
    const status: ResearchStatus = kind === "degree" ? "info"
      : b.full.length ? "ready" : b.part.length ? "partial" : "empty";
    const ev = (b.full.length ? b.full : b.part).slice(0, 3).map((e) => ({ id: e.id, title: e.title }));
    const nextKey = status === "info" ? (b.part.length ? "partial" : "empty") : status;
    out.push({
      text: it.text, kind: it.kind, research: kind, status, evidence: ev,
      next: (lang === "en" ? NEXT_EN : NEXT_KO)[kind][nextKey],
    });
  }
  /* 필수 먼저, 그 안에서 공고에 적힌 차례 */
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "must" ? -1 : 1));
}

/* ── 2. 연구 경험을 직무 말로 ─────────────────────────────────── */

/**
 * 학위 단계마다 먼저 적어 둘 한 줄. 검사의 학위 묶음이 묻는 것과 같은 결이다:
 * 석사는 옮겨 갈 방법, 박사는 내가 정한 것과 받은 것, 포닥은 맡아서 끌고 간 범위.
 */
const STAGE_FOCUS: Record<"master" | "phd" | "postdoc", { ko: string; en: string }> = {
  master: {
    ko: "학위 연구에서 쓴 방법 가운데 회사 일에 그대로 옮겨 갈 수 있는 것 하나를 골라 적어 보세요.",
    en: "Pick one method from your degree research that would carry straight over to work at a company.",
  },
  phd: {
    ko: "연구 질문 가운데 지도교수와 함께 정한 것과 내가 혼자 정한 것을 나눠 한 줄씩 적어 보세요.",
    en: "Split your research questions into what you set with your advisor and what you set on your own, one line each.",
  },
  postdoc: {
    ko: "맡아서 끌고 간 범위(과제 · 사람 · 장비 · 일정)를 한 줄로 적어 보세요.",
    en: "Write one line on the scope you led yourself (project, people, equipment, schedule).",
  },
};

export type ResearchCard = {
  experience: { id: string; title: string; kind: string };
  /** 문장 뼈대. 비어 있는 칸은 대괄호로 남는다 */
  sentences: string[];
  blanks: string[];
  focus: string;
};

/** 연구·논문 경험마다 한 장. 칸이 많이 찬 것이 먼저다 */
export function researchCards(stage: GradStage, exps: Experience[], lang: "ko" | "en" = "ko", max = 4): ResearchCard[] {
  if (!isGrad(stage)) return [];
  const fill = (e: Experience) =>
    [e.problems, e.decisions, e.artifacts, e.verifications].filter((x) => (x ?? []).some((y) => y.trim())).length;
  return exps.filter(isResearch)
    .sort((a, b) => fill(b) - fill(a))
    .slice(0, max)
    .map((e) => {
      const s = lang === "en" ? composeSentencesEn(e) : composeSentences(e);
      return {
        experience: { id: e.id, title: e.title, kind: e.kind },
        sentences: s.sentences, blanks: s.blanks,
        focus: STAGE_FOCUS[stage][lang],
      };
    });
}

/* ── 3. 연구직 면접 질문 ─────────────────────────────────────── */

type Q = { ko: string; en: string; lead: "decisions" | "artifacts" | "verifications" | "problems" };

/**
 * 학위 단계마다 셋. 연구직 · 기술직 면접에서 학위 연구를 두고 자주 묻는 결이다.
 * **질문은 예시다**: 실제 면접에서 이대로 나온다는 뜻이 아니다(화면이 적는다).
 */
const GRAD_Q: Record<"master" | "phd" | "postdoc", Q[]> = {
  master: [
    { ko: "학위 연구에서 쓴 방법 가운데 이 자리에서 바로 쓸 수 있는 것은 무엇인가요?", en: "Which method from your degree research could you use in this role right away?", lead: "decisions" },
    { ko: "연구 결과가 맞는지 무엇과 비교해 확인했나요?", en: "What did you compare your results against to check them?", lead: "verifications" },
    { ko: "연구에서 남긴 결과물을 회사 동료가 이어 쓴다면 무엇부터 설명하겠어요?", en: "If a colleague had to pick up what you produced, what would you explain first?", lead: "artifacts" },
  ],
  phd: [
    { ko: "학위 연구에서 지도교수가 정한 것과 본인이 정한 것을 나눠 설명해 주세요.", en: "In your PhD research, what did your advisor decide and what did you decide yourself?", lead: "decisions" },
    { ko: "연구 결과를 제품이나 공정에 옮긴다면 무엇부터 바꿔야 할까요?", en: "If your results were moved into a product or process, what would need to change first?", lead: "problems" },
    { ko: "연구에서 세운 가정 가운데 틀릴 수 있는 것 하나와, 그때 어떻게 확인할지 말해 주세요.", en: "Name one assumption in your research that could be wrong and how you would check it.", lead: "verifications" },
  ],
  postdoc: [
    { ko: "맡아서 끌고 간 과제의 범위(일정 · 사람 · 장비)를 설명해 주세요.", en: "Describe the scope of a project you led (schedule, people, equipment).", lead: "decisions" },
    { ko: "지금 연구 주제를 이 회사의 과제로 바꾼다면 첫해에 무엇을 내놓겠어요?", en: "If you turned your current research into a project here, what would you deliver in the first year?", lead: "artifacts" },
    { ko: "독립적으로 내린 판단 하나와, 그 판단이 틀렸을 때 무엇을 바꿨는지 말해 주세요.", en: "Tell us about one call you made on your own and what you changed when it turned out wrong.", lead: "verifications" },
  ],
};

export type GradQuestion = {
  question: string;
  experience: { id: string; title: string } | null;
  /** 가져갈 경험에서 꺼낸 재료 한 줄. 없으면 정직한 답의 실마리 */
  frame: string;
};

const LEAD_KO: Record<Q["lead"], string> = {
  decisions: "직접 정한 것", artifacts: "남긴 것", verifications: "비교한 것", problems: "풀려던 문제",
};
const LEAD_EN: Record<Q["lead"], string> = {
  decisions: "what you decided", artifacts: "what you produced", verifications: "what you compared against", problems: "the problem you tackled",
};

export function gradQuestions(stage: GradStage, exps: Experience[], lang: "ko" | "en" = "ko"): GradQuestion[] {
  if (!isGrad(stage)) return [];
  const pool = exps.filter(isResearch);
  const used = new Set<string>();
  return GRAD_Q[stage].map((q) => {
    const withLead = pool.filter((e) => (e[q.lead] ?? []).some((x) => x.trim()));
    const e = withLead.find((x) => !used.has(x.id)) ?? withLead[0] ?? pool.find((x) => !used.has(x.id)) ?? null;
    if (e) used.add(e.id);
    const v = e ? (e[q.lead] ?? []).find((x) => x.trim()) : undefined;
    const frame = lang === "en"
      ? e && v ? `Start from ${LEAD_EN[q.lead]} in “${e.title}”: “${v.trim()}”.`
        : e ? `“${e.title}” has nothing under ${LEAD_EN[q.lead]} yet. Fill that field and you will have the core of an answer.`
          : "There is no research experience in your record yet. Add your degree research as one experience first."
      : e && v ? `‘${e.title}’의 ${LEAD_KO[q.lead]}에서 시작하세요: ‘${v.trim()}’.`
        : e ? `‘${e.title}’에는 ${LEAD_KO[q.lead]}이 아직 적혀 있지 않아요. 그 칸을 채우면 답의 뼈대가 생겨요.`
          : "기록에 연구 경험이 아직 없어요. 학위 연구를 경험 하나로 먼저 적어 두세요.";
    return { question: lang === "en" ? q.en : q.ko, experience: e ? { id: e.id, title: e.title } : null, frame };
  });
}

/* ── 브리핑의 빈자리 ─────────────────────────────────────────── */

/**
 * 이번 주 할 일이 비어 있는 대학원생에게 서는 한 줄. **연구 기록이 하나도 없을
 * 때만** 선다: 기록이 있으면 할 일은 결과지와 공고에서 나온다.
 */
export function gradWeekTask(stage: GradStage, exps: Experience[], lang: "ko" | "en" = "ko"): string | null {
  if (!isGrad(stage) || exps.some(isResearch)) return null;
  return lang === "en"
    ? "Add your degree research (or the project you are on now) as one experience under Research or lab work."
    : "학위 연구(또는 지금 맡고 있는 과제) 하나를 ‘연구·실험’ 종류의 경험으로 적어 두세요.";
}
