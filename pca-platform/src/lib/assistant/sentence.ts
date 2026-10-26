import { withJosa } from "@/lib/me-v3/result/josa";
import type { Experience } from "@/lib/me-v3/platform";
import type { PostingItem } from "./posting";

/**
 * 지원서 문장 뼈대. 공고의 필수 항목마다 **그 학생이 적어 둔 경험의 말만**
 * 이어 붙인 두세 문장이다.
 *
 * **지어내지 않는다.** 문장에 들어가는 말은 넷뿐이다: 경험 칸에 적힌 글
 * (제목 · 풀려던 문제 · 직접 정한 것 · 남긴 것 · 비교한 것), 아래 `JOINS` 의
 * 이음말, 받침에 맞춘 조사, 비어 있는 칸을 가리키는 대괄호(`BLANK`). 칸이
 * 비어 있으면 그럴듯한 말로 메우지 않고 대괄호를 그대로 남긴다. 그 칸을 채우는
 * 것은 학생이다. `npm run mat:brief` 가 문장에서 이 넷을 걷어 내고 남는 글자가
 * 없는지 센다.
 *
 * **숫자 · 기간 · 성과를 넣지 않는다.** 경험 칸에 그런 말이 없으므로 넣으면
 * 그것이 곧 지어낸 사실이다.
 *
 * **AI 를 부르지 않는다.** 같은 경험이면 늘 같은 문장이 나온다.
 *
 * DB 를 읽지 않는 순수 함수다.
 */

/** 비어 있는 칸. 화면은 이것을 눈에 띄게 칠하고, 학생이 직접 채운다 */
export const BLANK = {
  problem: "[풀려던 문제]",
  decision: "[직접 정한 것]",
  artifact: "[남긴 결과물]",
  verify: "[검증한 방법]",
} as const;

/** 문장에 들어가는 이음말 전부. 이 밖의 말은 경험 칸에서만 온다 */
export const JOINS = [
  "에서", "문제를 맡았다", "그 과정에서", "부분을 직접 정했다", "결과는", "남겼고", "남겼다",
  "맞는지는", "비교해 확인했다", "놓고 비교해 확인했다", "확인했다",
] as const;

/** 조사. 받침에 따라 고른 것이라 이음말과 따로 센다 */
export const JOSA = ["으로", "로", "과", "와", "을", "를"] as const;

/**
 * 영어 뼈대의 빈칸과 이음말. **원칙은 같다**: 문장에 들어가는 말은 경험 칸의
 * 글 · 아래 이음말 · 빈칸뿐이고, 숫자와 성과를 지어 넣지 않는다.
 */
export const BLANK_EN = {
  problem: "[the problem I set out to solve]",
  decision: "[what I decided myself]",
  artifact: "[what I produced]",
  verify: "[how I checked it]",
} as const;

export const JOINS_EN = [
  "In", "I worked on", "Along the way, I", "Along the way, I made the call on",
  "I left", "as the result, and checked it against", "as the result, and checked it by", "I",
] as const;

const bare = (s: string) => s.replace(/\s+/g, " ").trim().replace(/[.。]+$/, "");
const q = (s: string) => `‘${s}’`;
/** `…다` 로 끝나는 칸은 그대로 문장이 된다(보기의 말이 `…정했다` 꼴이다) */
const isClause = (s: string) => /다$/.test(s);

export type SentenceDraft = {
  /** 공고의 요구 문장 */
  text: string;
  domain: string;
  status: "ready" | "partial";
  experience: { id: string; title: string };
  sentences: string[];
  /** 채워야 할 칸. 비어 있으면 뼈대가 다 찼다 */
  blanks: string[];
  /**
   * 같은 초안으로 함께 설명할 수 있는 다른 필수 요구. 경험 칸에 보기가 하나씩만
   * 있으면 두 요구에 같은 문장이 나오는데, 그것을 두 번 세우면 같은 글을 두 번 읽는다
   */
  also: string[];
};

const has = (xs: string[] | undefined) => (xs ?? []).some((x) => bare(x));
const nth = (xs: string[] | undefined, i: number): string | null => {
  const ok = (xs ?? []).map(bare).filter(Boolean);
  return ok.length ? ok[i % ok.length] : null;
};
/** 칸이 많이 찬 경험이 먼저. 같은 공고에서 이미 쓴 경험은 뒤로 */
const fill = (e: Experience) =>
  [has(e.problems), has(e.decisions), has(e.artifacts), has(e.verifications)].filter(Boolean).length;

/** 경험 하나로 문장 셋을 짓는다. `u` 는 같은 경험을 몇 번째 쓰는가(다른 보기를 꺼낸다) */
export function composeSentences(e: Experience, u = 0): { sentences: string[]; blanks: string[] } {
  const blanks: string[] = [];
  const pick = (xs: string[] | undefined, blank: string) => {
    const v = nth(xs, u);
    if (!v) blanks.push(blank);
    return v;
  };
  const title = bare(e.title);
  const problem = pick(e.problems, BLANK.problem);
  const decision = pick(e.decisions, BLANK.decision);
  const artifact = pick(e.artifacts, BLANK.artifact);
  const verify = pick(e.verifications, BLANK.verify);

  const s1 = problem && !isClause(problem)
    ? `${q(title)}에서 ${q(problem)} 문제를 맡았다.`
    : `${q(title)}에서 ${problem ?? BLANK.problem}.`;
  const s2 = decision && !isClause(decision)
    ? `그 과정에서 ${q(decision)} 부분을 직접 정했다.`
    : `그 과정에서 ${decision ?? BLANK.decision}.`;
  const art = withJosa(artifact ?? BLANK.artifact, "으로");
  const ver = !verify ? `맞는지는 ${withJosa(BLANK.verify, "으로")} 확인했다.`
    : /[와과] /.test(verify) ? `맞는지는 ${withJosa(verify, "을를")} 놓고 비교해 확인했다.`
      : `맞는지는 ${withJosa(verify, "과와")} 비교해 확인했다.`;
  const s3 = `결과는 ${art} 남겼고, ${ver}`;
  return { sentences: [s1, s2, s3], blanks };
}

/** 영어 보기 문장(`Set a thickness …` · `Chose the fits …`)은 과거형 동사로 시작하는 마디다 */
const isClauseEn = (s: string) =>
  /^(?:[A-Z][a-z]+ed|Set|Chose|Made|Wrote|Built|Ran|Took|Led|Drew|Found|Split|Kept|Put|Cut|Laid|Sent|Gave|Held|Brought|Got|Did|Saw|Thought|Chose)\b/.test(s);
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const qe = (s: string) => `“${s}”`;
/** 셀 수 있는 이름 앞에 a/an. 복수(`calculations`)와 대문자 약어 뒤 복수는 그대로 둔다 */
const withArticle = (s: string): string => {
  if (/^(a|an|the|my|our)\s/i.test(s) || /s$/i.test(s) && !/(ss|is|us)$/i.test(s)) return s;
  return /^[aeiou]/i.test(s) && !/^(u[bcfhjkqrstn][aeiou]|one)/i.test(s) ? `an ${s}` : `a ${s}`;
};

/** 영어 문장 셋. 한국어 `composeSentences` 와 같은 차례(문제 → 정한 것 → 남긴 것과 확인) */
export function composeSentencesEn(e: Experience, u = 0): { sentences: string[]; blanks: string[] } {
  const blanks: string[] = [];
  const pick = (xs: string[] | undefined, blank: string) => {
    const v = nth(xs, u);
    if (!v) blanks.push(blank);
    return v;
  };
  const title = bare(e.title);
  const problem = pick(e.problems, BLANK_EN.problem);
  const decision = pick(e.decisions, BLANK_EN.decision);
  const artifact = pick(e.artifacts, BLANK_EN.artifact);
  const verify = pick(e.verifications, BLANK_EN.verify);
  const s1 = !problem ? `In ${qe(title)}, I ${BLANK_EN.problem}.`
    : isClauseEn(problem) ? `In ${qe(title)}, I ${lowerFirst(problem)}.`
      : `In ${qe(title)}, I worked on ${lowerFirst(problem)}.`;
  const s2 = !decision ? `Along the way, I ${BLANK_EN.decision}.`
    : isClauseEn(decision) ? `Along the way, I ${lowerFirst(decision)}.`
      : `Along the way, I made the call on ${lowerFirst(decision)}.`;
  const s3 = verify
    ? `I left ${artifact ? withArticle(lowerFirst(artifact)) : BLANK_EN.artifact} as the result, and checked it against ${lowerFirst(verify)}.`
    : `I left ${artifact ? withArticle(lowerFirst(artifact)) : BLANK_EN.artifact} as the result, and checked it by ${BLANK_EN.verify}.`;
  return { sentences: [s1, s2, s3], blanks };
}

/**
 * 필수 항목 가운데 `설명할 경험 있음` · `정리가 덜 됨` 이고 그 영역에 적어 둔
 * 경험이 있는 줄마다 하나. 최대 여섯.
 *
 * 그 영역에 경험이 없는 줄은 만들지 않는다: 검사에서 해 봤다고 답했어도 적어 둔
 * 칸이 없으면 이을 말이 없다. 화면이 그 수(`missing`)를 따로 적는다.
 */
export function sentenceDrafts(
  items: PostingItem[], exps: Experience[], max = 6, lang: "ko" | "en" = "ko",
): { drafts: SentenceDraft[]; missing: number } {
  const used = new Map<string, number>();
  const drafts: SentenceDraft[] = [];
  let missing = 0;
  for (const it of items) {
    if (it.kind !== "must" || !it.domain) continue;
    if (it.status !== "ready" && it.status !== "partial") continue;
    const mine = exps.filter((e) => e.td_codes.includes(it.domain!));
    if (!mine.length) { missing += 1; continue; }
    if (drafts.length >= max) continue;
    let best = mine[0];
    let key = -1;
    for (const e of mine) {
      const k = fill(e) * 2 + (it.axis && e.axis_codes.includes(it.axis) ? 1 : 0)
        + (used.has(e.id) ? 0 : 20);
      if (k > key) { best = e; key = k; }
    }
    const u = used.get(best.id) ?? 0;
    used.set(best.id, u + 1);
    const { sentences, blanks } = lang === "en" ? composeSentencesEn(best, u) : composeSentences(best, u);
    const same = drafts.find((d) => d.sentences.join(" ") === sentences.join(" "));
    if (same) { same.also.push(it.text); continue; }
    drafts.push({
      text: it.text, domain: it.domain, status: it.status,
      experience: { id: best.id, title: best.title }, sentences, blanks, also: [],
    });
  }
  return { drafts, missing };
}

/** 그 경험 칸에 적힌 글 전부. 검사가 문장에서 걷어 낼 말이다 */
export function sourceWords(e: Experience): string[] {
  return [e.title, ...(e.problems ?? []), ...e.decisions, ...e.artifacts, ...e.verifications]
    .map(bare).filter(Boolean);
}
