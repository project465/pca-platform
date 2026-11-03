/**
 * MAT 수익화 화면 문구(검사 없이 시작한 홈 · 결제 입구 · 요금 · 결제 동의 · 해지). 2026-11-03 시안(NoTest ·
 * Paywall · Pricing · Consent) 기준. 화면 TSX 에 한국어를 박지 않고 여기서 읽는다(CLAUDE.md 화면 문구 규칙 8).
 * 번역이 붙는 자리가 이 파일이다(`en` · `ja` 자리는 아직 비어 있다).
 *
 * **근거 없는 숫자를 쓰지 않는다**(표시광고법). 검사 전 · 후는 무엇이 달라지는지만 적는다.
 * 높임은 MAT 화면과 같은 `-요` 꼴 하나다.
 */
export const NOTEST = {
  kicker: "MAT",
  hello: "반갑습니다",
  lead: "관심 있는 공고부터 분석해 볼까요?",
  analyzeFree: "공고 분석하기 · 무료 1회",
  analyzeUsed: "무료 분석 1회를 썼어요",
  pickCore: "어느 전공 공고를 볼까요?",
  pickCoreNote: "전공 하나를 고르면 그 전공 공고와 요건 사전으로 분석해요. 나중에 검사를 하면 바뀌어요.",
  pickCoreGo: "이 전공으로 시작",
  testTitle: "검사하면 분석이 나에게 맞춰져요",
  before: "검사 전",
  beforeBody: "공고와 내가 적은 경험만 비교",
  after: "검사 후",
  afterBody: "내 전공 강점과 채울 것까지 근거로 비교",
  afterMore: ["맞는 공고 순서가 내 강점 기준으로", "지원서 초안에 내 경험 문장이 들어가요"],
  oneMore: "검사를 끝내면 무료 분석 1회 더",
  testGo: "검사 시작하기",
  testFree: "무료",
  testResume: "중간에 닫아도 이어서 할 수 있어요",
  jobsTitle: "내 전공에 맞는 공고",
  jobsCount: (n: number) => `${n}개`,
  weekTitle: "이번 주 할 일",
  weekLocked: (n: number) => `할 일 ${n}개가 더 있어요. MAT 이용권으로 모두 볼 수 있어요.`,
  passLink: "MAT 이용권",
  all: "전체",
} as const;

export const PAYWALL = {
  more: (n: number) => `맞는 공고 ${n}개가 더 있어요`,
  moreNone: "다른 공고도 분석할 수 있어요",
  body: "다른 공고도 이렇게 분석하고, 지원서 초안과 면접 연습까지 이어서 할 수 있어요.",
  analyzeRest: (n: number) => `나머지 ${n}개 공고도 분석`,
  start: (price: string) => `MAT 시작하기 · 30일 ${price}`,
  cancelAny: "언제든 해지할 수 있어요",
  usedFree: "무료 분석 1회를 썼어요",
  usedAll: "무료 분석을 모두 썼어요",
  testForMore: "검사를 끝내면 무료 분석 1회 더",
  resultBox: (n: number) => `내 결과에 맞는 공고 ${n}개`,
  resultBoxGo: "MAT에서 공고 분석하기",
  schoolEnds: (date: string) => `학교 · 기관 MAT 이용권이 ${date}에 끝나요`,
  schoolEndsBody: "끝난 뒤에도 개인 이용권으로 이어 쓸 수 있어요. 자료는 그대로 남아요.",
  schoolEndsGo: "개인 이용권 보기",
} as const;

export const PRICING = {
  title: "MAT 이용권",
  t30: "30일",
  t90: "90일",
  t90note: "할인",
  basic: "기본",
  basicFor: "취업 준비",
  research: "연구자",
  researchFor: "석사 · 박사 · 포닥",
  per: (days: number) => `/ ${days}일`,
  startBasic: "기본으로 시작",
  startResearch: "연구자로 시작",
  researchAll: "기본 기능 전부",
  researchPdf: "논문 · 긴 PDF 반영 (페이지 기준)",
  researchDocs: "연구계획서 · 연구 경력서 · 영문 CV",
  researchJobs: "연구소 · 박사급 공고 모아 보기",
  notOnSale: "이 기간은 아직 팔지 않아요",
  auto: (days: number) => `${days}일마다 자동 결제 · 결제 전에 알려 드려요`,
  keep: "해지해도 남은 기간은 그대로 써요",
  oneTime: "자동 결제 없음 · 기간이 끝나면 닫혀요",
  addon: "추가 이용권",
  addonNote: "1회 결제 · 쓰는 중인 기간에 횟수를 더해요",
  legal: "정기결제 운영규정",
  refund: "환불정책",
  payNotReady: "결제 준비 중",
  countUnit: { posting: "공고 분석", sentence: "지원서 문장", interview: "면접 연습", upload: "파일 반영" },
  interviewTurns: (turns: number) => `번마다 ${turns}턴`,
  perMonth: (n: number, unit: string) => `${unit} ${n}회`,
  pages: (n: number) => `파일 반영 ${n}쪽까지`,
  usd: "해외 카드 결제 금액",
} as const;

export const CHECKOUT_SUB = {
  title: "결제 전에 확인해 주세요",
  plan: "이용권",
  today: "오늘 결제",
  next: "다음 자동 결제",
  nextLine: (date: string, price: string) => `${date} · ${price}`,
  consent: "위 내용(자동 결제 · 결제 7일 전 안내 · 해지 방법)을 확인했고 정기결제에 동의해요",
  consentNeed: "동의 칸을 체크해야 결제할 수 있어요",
  pay: "동의하고 결제",
  testMode: "시험 결제예요. 카드에서 돈이 나가지 않아요.",
  routeKr: "국내 카드 · NHN KCP · 원화",
  routeGlobal: "해외 카드 · Paddle · 달러",
  cancelHow: "해지는 [내 정보 › 이용권]에서 버튼 하나로 해요",
} as const;

export const SUB_STATE = {
  title: "정기결제",
  active: (date: string, price: string) => `다음 결제 ${date} · ${price}`,
  canceled: (date: string) => `해지했어요. ${date}까지 그대로 써요`,
  pastDue: "결제가 안 됐어요. 하루에 한 번 다시 결제해요",
  paused: "결제가 안 되어 이용권을 멈췄어요. 카드를 바꾸면 바로 이어져요",
  cancel: "정기결제 해지",
  cancelConfirm: "해지해도 남은 기간은 끝까지 쓸 수 있어요. 다음 결제부터 멈춰요.",
  resume: "카드 바꾸고 이어 쓰기",
  reconsent: (price: string, date: string) => `${date}부터 금액이 ${price}으로 바뀌어요. 동의해야 자동 결제가 이어져요`,
  reconsentGo: "바뀐 금액에 동의",
  none: "정기결제가 없어요",
} as const;
