/**
 * 공고 한 줄의 **제목**과 **신입 공고인가**를 정한다(2026-11-02 운영 시험).
 *
 * 공고 표에는 제목 칸이 없다(모을 때 본문 줄만 `raw_requirements` 로 둔다). 그래서 첫 줄을 제목으로
 * 썼더니 `고용 형태: 정규직(6급 신입).` 처럼 **항목 이름이 붙은 줄**이 제목 자리에 섰다.
 * 그런 줄은 건너뛰고, 쓸 줄이 없으면 모을 때 단 직무 이름을, 그것도 없으면 그렇다고 적는다.
 */
const META = /^\s*[-·•*]?\s*(지원\s?자격|자격\s?요건|초빙\s?분야|우대\s?사항|담당\s?업무|고용\s?형태|근무\s?(지|지역|장소|형태|시간|요일|조건)|급여|연봉|보수|모집\s?(인원|기간|분야)|접수\s?(기간|방법)|마감(일)?|전형\s?(절차|방법)|제출\s?서류|복리\s?후생|문의(처)?|채용\s?(형태|기간)|직급|근무\s?기간)\s*[:：]/;

/**
 * 잡인더스트리 본문 첫 줄은 `○○ 채용 정보입니다.` 꼴이라 제목마다 꼬리가 붙고, 제목에 `채용` 이 있으면
 * `채용 채용 정보입니다` 로 겹쳤다(2026-11-02 운영 시험). 꼬리를 떼고 겹친 낱말을 하나로 줄인다
 */
export function cleanTitle(s: string): string {
  return s.trim()
    .replace(/\s*(의\s*)?(채용\s*)?(공고\s*)?정보\s*입니다\.?$/, "")
    .replace(/(채용|모집)(\s+\1)+/g, "$1")
    .trim();
}

export function jobTitle(lines: string[], role?: string | null): { title: string | null; fallback: boolean } {
  const line = lines.map(cleanTitle).find((l) => l.length >= 4 && !META.test(l));
  if (line) return { title: line, fallback: false };
  if (role) return { title: `${role} 공고`, fallback: true };
  return { title: null, fallback: true };
}

/**
 * **신입 · 인턴 공고인가.** 본문 어디에 `신입` 이 있으면 신입으로 달았더니 `경력직` 공고에도 붙었다
 * (`(주)… 임상개발담당 경력직`). 경력을 요구하는 말이 있으면 신입과 함께 뽑는다고 적힌 때만 신입으로 본다.
 */
const ENTRY = /신입|인턴|채용\s?연계|졸업\s?예정|경력\s?무관|학사\s?(이상|졸업)/;
const SENIOR = /경력\s?직|경력\s?\d+\s?년\s?(이상|↑|차)?|경력자|경력\s?사원|시니어|senior/i;
const BOTH = /신입\s?[\/·,]\s?경력|경력\s?[\/·,]\s?신입|신입\s?(및|또는)\s?경력|경력\s?(및|또는)\s?신입|경력\s?무관/;

/** 경력자를 뽑는 공고인가(신입과 함께 뽑는다고 적힌 것은 아니다). 학부생 화면에 "경력 채용" 표를 단다 */
export function isSeniorJob(text: string): boolean {
  return SENIOR.test(text) && !BOTH.test(text);
}

export function isEntryJob(text: string): boolean {
  if (!ENTRY.test(text)) return false;
  return !SENIOR.test(text) || BOTH.test(text);
}
