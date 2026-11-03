/**
 * **기관 참여자에게 학교 말을 쓰지 않는다**(2026-11-03 진흥원 참여자 실화면: 경험 추가에 `학번 · 수업 · 캡스톤`).
 *
 * 경험 화면의 문장은 학교용 한 벌로 적혀 있다. 기관(`org_kind: "agency"`) 참여자에게는 이 함수가 그 가운데
 * 학교에만 있는 낱말만 바꾼다. **저장되는 값(`kind` 코드)은 그대로다**: 바뀌는 것은 화면 글자뿐이다.
 * 파일을 읽지 않는 순수 함수라 브라우저 쪽 화면(`steps.tsx` · `upload.tsx`)에서도 쓴다. 한국어에만 건다.
 */
const RULES: [RegExp, string][] = [
  [/캡스톤·설계 과제/g, "설계·실습 프로젝트"],
  [/(?<![가-힣])캡스톤/g, "프로젝트"],
  [/(?<![가-힣])학번/g, "참여 번호"],
  [/(?<![가-힣])수업이나 과제/g, "교육 과정이나 과제"],
  [/(?<![가-힣])수업·과제/g, "교육·과제"],
  [/(?<![가-힣])수업 과제/g, "교육 과제"],
  [/^수업$/g, "교육 과정"],
  [/(?<![가-힣])한 학기 이상/g, "한 과정 이상"],
];

export function agencyWord(s: string): string {
  return RULES.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

/** `wsSay` 결과에 얹는다. 기관이 아니거나 한국어가 아니면 그대로 돌려준다 */
export function agencySay<F extends (ko: string, vars?: Record<string, string | number>) => string>(
  t: F, agency: boolean, lang?: string | null,
): F {
  if (!agency || (lang && lang !== "ko")) return t;
  return ((ko: string, vars?: Record<string, string | number>) => agencyWord(t(ko, vars))) as F;
}
