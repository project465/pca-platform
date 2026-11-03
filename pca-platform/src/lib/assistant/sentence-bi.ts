import type { Experience } from "@/lib/me-v3/platform";
import { AXES, catalog, hasLang } from "./catalog";
import type { PostingItem } from "./posting";
import { sentenceDrafts } from "./sentence";

/**
 * **한국어 자기소개서 + 영어 대조본**(2026-11-03 대표 결정: 영어 화면의 지원서 초안). 국내 유학생 · 외국인이
 * 한국 회사에 낼 한국어 문장과, 그 뜻을 확인할 영어 문장을 나란히 둔다.
 *
 * **지어 옮기지 않는다.** 두 문장 모두 `sentence.ts` 뼈대(경험 칸의 말 + 정해 둔 이음말 + 빈칸)다.
 * 한국어 쪽에 들어가는 경험 칸은 **검사 원고의 짝**으로만 바꾼다: 영어 보기 문장(체크리스트 · 결과물 ·
 * 비교 대상)은 같은 자리의 한국어 보기 문장으로 바꾸고, 사람이 직접 친 말(제목 · 보기 밖 문장)은
 * 친 그대로 둔다. 기계 번역을 부르지 않는다.
 */

const PAIRS = new Map<string, Map<string, string>>();

/** 그 전공의 영어 보기 → 한국어 보기. 두 원고의 같은 영역 · 같은 축 · 같은 자리 */
function pairsOf(core: string): Map<string, string> {
  const hit = PAIRS.get(core);
  if (hit) return hit;
  const m = new Map<string, string>();
  if (hasLang(core, "en")) {
    const ko = new Map(catalog(core, "ko").map((d) => [d.code, d]));
    for (const e of catalog(core, "en")) {
      const k = ko.get(e.code);
      if (!k) continue;
      const zip = (a: string[], b: string[]) => { if (a.length === b.length) a.forEach((x, i) => m.set(x.trim(), b[i])); };
      for (const ax of AXES) zip(e.checklist[ax] ?? [], k.checklist[ax] ?? []);
      zip(e.artifacts, k.artifacts);
      zip(e.verify, k.verify);
    }
  }
  PAIRS.set(core, m);
  return m;
}

/** 경험 칸을 한국어 보기로(짝이 있는 말만). 짝이 없는 말은 그대로 */
export function koExperience(core: string, e: Experience): Experience {
  const m = pairsOf(core);
  const to = (xs: string[] | undefined) => (xs ?? []).map((x) => m.get(x.trim()) ?? x);
  return {
    ...e,
    problems: to(e.problems), decisions: to(e.decisions),
    artifacts: to(e.artifacts), verifications: to(e.verifications),
  };
}

export type BiDraft = {
  text: string; domain: string;
  experience: { id: string; title: string };
  ko: string[]; en: string[];
};

/** 필수 요구마다 한국어 · 영어 뼈대 한 쌍. 고르는 경험은 두 언어가 같다(같은 규칙 · 같은 차례) */
export function bilingualDrafts(
  core: string, items: PostingItem[], exps: Experience[], max = 6,
): { drafts: BiDraft[]; missing: number } {
  const en = sentenceDrafts(items, exps, max, "en");
  const ko = sentenceDrafts(items, exps.map((e) => koExperience(core, e)), max, "ko");
  const byKey = new Map(ko.drafts.map((d) => [`${d.text}|${d.experience.id}`, d]));
  return {
    missing: en.missing,
    drafts: en.drafts.map((d) => ({
      text: d.text, domain: d.domain, experience: d.experience, en: d.sentences,
      ko: byKey.get(`${d.text}|${d.experience.id}`)?.sentences ?? [],
    })),
  };
}
