/**
 * 작업공간(`/me`) 문구 파일(CLAUDE.md 화면 문구 규칙 8).
 *
 * 화면은 이 파일에서 글자를 읽는다. 번역은 같은 열쇠에 `en` · `ja` 를 붙여 넣는다.
 * 지금은 한국어만 적었다. 번역이 없는 칸은 한국어가 나간다.
 *
 * 높임은 화면마다 한 꼴이다. 묶음 머리에 적었다. 홈(`-요`)은 `home-text.ts` 에 따로 둔다:
 * 한 파일에 두 꼴이 섞이면 화면 문구 점검이 그 파일을 섞인 파일로 센다.
 */
export type Txt = { ko: string; en?: string; ja?: string };
export type TxtLang = "ko" | "en" | "ja";

/** 그 언어의 글자. 없으면 한국어 */
export function say(x: Txt, lang: TxtLang = "ko", vars?: Record<string, string | number>): string {
  const s = x[lang] ?? x.ko;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** 왼쪽 메뉴 · 아래 메뉴 */
export const NAV_TEXT = {
  mat: { ko: "MAT" },
  matTag: { ko: "AI 취업비서" },
  matHint: { ko: "공고 분석 · 지원서 · 면접" },
  home: { ko: "홈" },
  results: { ko: "검사 결과" },
  resultsTab: { ko: "결과" },
  me: { ko: "내 정보" },
  pass: { ko: "이용권" },
  /* 검사 결과 안의 작은 탭 */
  subResult: { ko: "결과지" },
  subState: { ko: "현재 상태" },
  subNext: { ko: "할 일" },
  subExperience: { ko: "경험" },
  subExplore: { ko: "산업·직무" },
  subRegion: { ko: "지역·기관" },
  subPrep: { ko: "지원서·면접 준비" },
  subNav: { ko: "검사 결과 메뉴" },
} satisfies Record<string, Txt>;


/** 할 일(`/me/next`). 높임은 `-습니다` 한 꼴 */
export const NEXT_TEXT = {
  whyWriteUp: { ko: "근거는 모였습니다. 남은 일은 지원서 문장을 만드는 것입니다." },
  whyOwnership: { ko: "해 본 일은 확인됐습니다. 남은 일은 직접 정한 부분을 적는 것입니다." },
  whyOutput: { ko: "결과물이 있어야 지원서에서 해 본 일을 설명할 수 있습니다." },
  whyVerify: { ko: "무엇과 비교해 확인했는지 적어야 그 값이 맞다고 말할 수 있습니다." },
  whyAxis: { ko: "이 영역에서 아직 확인되지 않은 판단입니다. 채우면 설명할 수 있는 범위가 넓어집니다." },
  whyTry: { ko: "관심은 있지만 해 본 적이 없는 영역입니다. 짧게 한 번 해 보면 판단할 재료가 생깁니다." },
  whyRecheck: { ko: "지금 응답으로는 다른 영역보다 앞서는 영역이 없습니다." },
  groupLead: { ko: "할 수 있는 때로 묶었습니다. 하나를 끝내면 다음 일이 나옵니다." },
  allDone: { ko: "할 일을 모두 끝냈습니다. 새 경험을 더하면 다음 할 일이 생깁니다." },
  takenDone: { ko: "담아 둔 일을 모두 끝냈습니다. 새 경험을 더하면 다음 할 일이 생깁니다." },
  howTo: { ko: "적는 방법" },
  restLead: { ko: "하나를 끝내면 다음 줄이 위로 올라옵니다. 지금은 첫 줄만 하면 됩니다." },
} satisfies Record<string, Txt>;

/** 산업·직무(`/me/explore`). 높임은 `-습니다` 한 꼴 */
export const EXPLORE_TEXT = {
  pickLead: { ko: "산업과 직무를 둘씩 고를 수 있습니다. 고른 쪽이 맨 위에 나옵니다. 검사 결과는 그대로입니다." },
  lockedLead: { ko: "관심 산업·직무를 바꾸는 비교는 MAT에서 합니다." },
  lockedNow: { ko: "지금은 검사에서 고른 산업과 직무 순서로 보입니다." },
  lockedGo: { ko: "MAT 열기" },
  saved: { ko: "고른 산업과 직무로 다시 정리했습니다." },
  industryLead: { ko: "검사에서 고른 산업이 먼저 나옵니다. 그다음은 확인된 영역과 겹치는 산업입니다." },
  roleLead: { ko: "검사에서 고른 직무가 먼저 나옵니다. 그다음은 확인된 영역을 많이 쓰는 직무입니다." },
} satisfies Record<string, Txt>;

/** 지원서·면접 준비(`/me/prep`). 높임은 `-습니다` 한 꼴 */
export const PREP_TEXT = {
  lead: { ko: "내 결과와 경험에서 고른 지원서 재료와 예상 면접 질문입니다. 글은 직접 씁니다. 저장하면 나중에 고칠 수 있습니다." },
  interviewSub: { ko: "내 결과에서 고른 예상 질문입니다. 소리 내어 답한 뒤 요점을 적어 두면 됩니다." },
  why: { ko: "질문이 나온 이유" },
  oldSub: { ko: "결과가 바뀌어 지금은 보이지 않는 질문의 답입니다. 지우지 않고 남겨 두었습니다." },
  realValues: { ko: "성과와 숫자는 직접 적습니다." },
  realValuesSub: { ko: "기간 · 인원 · 수치는 실제 값을 씁니다. 적은 답은 본인만 봅니다." },
} satisfies Record<string, Txt>;

/** 경험 추가 · 고치기(`/me/experience/new`). 높임은 `-습니다` 한 꼴 */
export const EXP_TEXT = {
  errFill: { ko: "저장하지 못했습니다. 경험 종류와 한 줄 설명이 있어야 저장됩니다." },
  errSave: { ko: "경험을 저장하지 못했습니다. 아래 저장 단추를 한 번 더 누르면 됩니다. 그래도 안 되면 고객지원에 알리면 됩니다." },
  fromFile: { ko: "올린 파일에서 읽은 내용을 보기로 옮겼습니다. 파일에 없던 칸은 비어 있습니다. 직접 정한 것과 남은 결과물을 고른 뒤 저장하면 됩니다." },
  fromMemo: { ko: "적은 메모를 보기로 옮겼습니다. 맞지 않는 칸은 끄고 저장하면 됩니다." },
  kind: { ko: "경험 종류" },
  usedWhere: { ko: "결과가 쓰인 곳" },
  usedNone: { ko: "쓰인 곳이 없으면 비워 두어도 괜찮습니다." },
  noteUse: { ko: "이 줄은 결과를 글로 풀어 적을 때만 읽습니다. 1년이 지나면 지웁니다." },
  saveFlow: { ko: "저장하면 달라지는 점을 먼저 보여 줍니다. 반영을 누르면 현재 상태에 들어갑니다. 검사 결과는 그대로 남습니다." },
  whatChanges: { ko: "이 경험을 적으면 달라지는 것" },
} satisfies Record<string, Txt>;

/** 현재 상태(`/me/state`). 높임은 `-습니다` 한 꼴 */
export const STATE_TEXT = {
  added: { ko: "새 경험을 더했습니다. 달라진 것은 아래 ‘최근 달라진 것’에 있습니다." },
  movedBelow: { ko: "변동 있음 · 설명 가능 기준 미달(아래 ‘최근 달라진 것’ 참고)" },
  moreGapsOne: { ko: "그 밖에 {n}곳이 더 있습니다. 위에는 급한 셋을 적었습니다.#one" },
  moreGaps: { ko: "그 밖에 {n}곳이 더 있습니다. 위에는 급한 셋을 적었습니다." },
  ownedZero: { ko: "직접 정한 판단 0 · 다음 과제: 기준 하나를 직접 정하기" },
  noneNext: { ko: "다음 할 일: 검사 영역 하나를 해 보고 경험으로 추가하기" },
  ownLead: { ko: "해 본 일은 확인됐습니다. 직접 정한 것까지 적으면 지원서에 쓸 수 있습니다." },
  regionNote: { ko: "고른 값입니다. 기술영역 결과에는 영향이 없습니다." },
} satisfies Record<string, Txt>;

/** 지역·기관(`/me/region`). 높임은 `-습니다` 한 꼴 */
export const REGION_TEXT = {
  pickMax: { ko: "3개까지 고를 수 있습니다" },
  orgsTitle: { ko: "이 지역에서 함께 볼 곳" },
  typesLead: { ko: "기관 유형마다 일하는 방식이 다릅니다. 볼 곳을 정할 때 참고합니다." },
} satisfies Record<string, Txt>;
