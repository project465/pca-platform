/**
 * MAT 수익화 화면 문구(검사 없이 시작한 홈 · 결제 입구 · 요금 · 결제 동의 · 해지). 2026-11-03 시안(NoTest ·
 * Paywall · Pricing · Consent) 기준. 화면 TSX 에 한국어를 박지 않고 여기서 읽는다(CLAUDE.md 화면 문구 규칙 8).
 * 번역이 붙는 자리가 이 파일이다(`en` · `ja` 자리는 아직 비어 있다).
 *
 * **근거 없는 숫자를 쓰지 않는다**(표시광고법). 검사 전 · 후는 무엇이 달라지는지만 적는다.
 * 높임은 MAT 화면과 같은 `-요` 꼴 하나다.
 */
import { copyOf, type CopySet, type MatUiLang, type Widen } from "./copy";

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
  /* 정기결제를 열기 전(`SUBSCRIPTIONS_LIVE` 없음)의 판매 화면 글(2026-11-06 PG 심사 대비, 대표 지시: 1회 결제로만 적는다) */
  oneTime: "30일 이용권 · 1회 결제 / 90일 이용권 · 1회 결제",
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
  sdkFail: "결제 모듈을 불러오지 못했어요. 새로고침한 뒤 다시 눌러 주세요",
  liveSub: "이미 쓰는 정기결제가 있어요",
  closed: "지금은 결제할 수 없어요",
  failed: "결제가 되지 않았어요",
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

export const JOBS_TEXT = {
  research: "연구소 · 박사급 공고",
  count: (n: number) => `${n}개`,
} as const;

export const PASS_TEXT = {
  subLink: "정기결제(기본 · 연구자) 요금 보기",
  msg: {
    ok: "결제됐어요. 지금부터 쓸 수 있어요.",
    fail: "결제가 되지 않았어요. 카드를 확인하고 다시 해 주세요.",
    pending: "결제를 확인하고 있어요. 잠시 뒤 새로고침해 주세요.",
    canceled: "해지했어요. 남은 기간은 끝까지 쓸 수 있어요.",
    reconsent: "바뀐 금액에 동의했어요.",
    resumed: "카드를 바꿔 다시 이어졌어요.",
  } as Record<string, string>,
} as const;

export const JI_TEXT = {
  kicker: "잡인더스트리에서 온 공고",
  title: "이 공고, 내 경험과 맞춰 볼까요?",
  lead: "공고의 요건과 내 경험을 줄마다 맞춰 봐요. 검사를 하지 않아도 돼요.",
  goFree: "이 공고, 내 경험과 맞춰 보기 · 무료 1회",
  go: "이 공고, 내 경험과 맞춰 보기",
  goPay: "이 공고 분석하기 · MAT 이용권",
  source: "잡인더스트리 공고 원문",
  none: "들고 온 공고가 없어요.",
  jobs: "공고 보기",
  pickCore: "어느 전공으로 맞춰 볼까요?",
} as const;

/* ── 영어(2026-11-03 영어 화면). 열쇠는 위 한국어 벌과 같다. 일본어 벌은 번역이 들어오는 날 `ja` 에 ── */

const NOTEST_EN: Widen<typeof NOTEST> = {
  kicker: "MAT",
  hello: "Welcome",
  lead: "Start with a job posting you like.",
  analyzeFree: "Analyze a posting · 1 free",
  analyzeUsed: "You used your 1 free analysis",
  pickCore: "Which major's postings do you want to see?",
  pickCoreNote: "Pick one major. MAT uses its postings and its requirement list. A test result changes it later.",
  pickCoreGo: "Start with this major",
  testTitle: "The test makes the analysis fit you",
  before: "Before the test",
  beforeBody: "Compares the posting with the experience you wrote",
  after: "After the test",
  afterBody: "Also uses your major strengths and gaps as evidence",
  afterMore: ["Matching postings are sorted by your strengths", "Your application draft uses sentences from your experience"],
  oneMore: "Finish the test to get 1 more free analysis",
  testGo: "Start the test",
  testFree: "Free",
  testResume: "You can close it and continue later",
  jobsTitle: "Postings for your major",
  jobsCount: (n: number) => `${n}`,
  weekTitle: "This week's task",
  weekLocked: (n: number) => `${n} more ${n === 1 ? "task" : "tasks"}. A MAT pass shows all of them.`,
  passLink: "MAT pass",
  all: "All",
};

const PAYWALL_EN: Widen<typeof PAYWALL> = {
  more: (n: number) => `${n} more matching ${n === 1 ? "posting" : "postings"}`,
  moreNone: "You can analyze other postings too",
  body: "Analyze other postings the same way. Then write an application draft and practice interviews.",
  analyzeRest: (n: number) => `Analyze the other ${n} ${n === 1 ? "posting" : "postings"}`,
  start: (price: string) => `Start MAT · 30 days ${price}`,
  cancelAny: "Cancel at any time",
  usedFree: "You used your 1 free analysis",
  usedAll: "You used all free analyses",
  testForMore: "Finish the test to get 1 more free analysis",
  resultBox: (n: number) => `${n} ${n === 1 ? "posting matches" : "postings match"} your result`,
  resultBoxGo: "Analyze postings in MAT",
  schoolEnds: (date: string) => `Your school or institution MAT pass ends on ${date}`,
  schoolEndsBody: "After that, you can continue with a personal pass. Your records stay.",
  schoolEndsGo: "See personal passes",
};

const PRICING_EN: Widen<typeof PRICING> = {
  title: "MAT pass",
  t30: "30 days",
  t90: "90 days",
  t90note: "Discount",
  basic: "Basic",
  basicFor: "Job search",
  research: "Researcher",
  researchFor: "Master's · PhD · Postdoc",
  per: (days: number) => `/ ${days} days`,
  startBasic: "Start Basic",
  startResearch: "Start Researcher",
  researchAll: "Everything in Basic",
  researchPdf: "Papers and long PDFs (by page)",
  researchDocs: "Research proposal · research career statement · English CV",
  researchJobs: "Research institute and PhD-level postings in one list",
  notOnSale: "This period is not on sale yet",
  auto: (days: number) => `Renews every ${days} days · We tell you before each payment`,
  keep: "If you cancel, you keep the rest of the period",
  oneTime: "30-day pass · one-time payment / 90-day pass · one-time payment",
  addon: "Extra pass",
  addonNote: "One-time payment · Adds uses to your current period",
  legal: "Subscription policy",
  refund: "Refund policy",
  payNotReady: "Payment not open yet",
  countUnit: { posting: "Posting analyses", sentence: "Application sentences", interview: "Interview practice", upload: "File reads" },
  interviewTurns: (turns: number) => `${turns} turns each`,
  perMonth: (n: number, unit: string) => `${unit}: ${n}`,
  pages: (n: number) => `File reads up to ${n} pages`,
  usd: "Price for overseas cards (USD)",
};

const CHECKOUT_SUB_EN: Widen<typeof CHECKOUT_SUB> = {
  title: "Check before you pay",
  plan: "Pass",
  today: "Paid today",
  next: "Next automatic payment",
  nextLine: (date: string, price: string) => `${date} · ${price}`,
  consent: "I checked the terms above (automatic payment, notice 7 days before payment, how to cancel). I agree to the subscription.",
  consentNeed: "Tick the consent box to pay",
  pay: "Agree and pay",
  testMode: "This is a test payment. No money leaves your card.",
  routeKr: "Korean card · NHN KCP · KRW",
  routeGlobal: "Overseas card · Paddle · USD",
  cancelHow: "To cancel, use the one button in [My info › Pass]",
  sdkFail: "The payment window did not load. Refresh the page and try again",
  liveSub: "You already have an active subscription",
  closed: "Payment is not available now",
  failed: "The payment did not go through",
};

const SUB_STATE_EN: Widen<typeof SUB_STATE> = {
  title: "Subscription",
  active: (date: string, price: string) => `Next payment ${date} · ${price}`,
  canceled: (date: string) => `Canceled. You can use it until ${date}`,
  pastDue: "The payment failed. We try again once a day",
  paused: "The payment failed, so the pass is paused. Change the card to continue at once",
  cancel: "Cancel subscription",
  cancelConfirm: "You can use the rest of the period. Payments stop from the next one.",
  resume: "Change card and continue",
  reconsent: (price: string, date: string) => `From ${date}, the price changes to ${price}. Agree to keep automatic payment`,
  reconsentGo: "Agree to the new price",
  none: "No subscription",
};

const JOBS_TEXT_EN: Widen<typeof JOBS_TEXT> = {
  research: "Research institute and PhD-level postings",
  count: (n: number) => `${n}`,
};

const PASS_TEXT_EN: Widen<typeof PASS_TEXT> = {
  subLink: "See subscription prices (Basic · Researcher)",
  msg: {
    ok: "Payment done. You can use it now.",
    fail: "The payment did not go through. Check the card and try again.",
    pending: "We are checking the payment. Refresh in a moment.",
    canceled: "Canceled. You can use the rest of the period.",
    reconsent: "You agreed to the new price.",
    resumed: "The card was changed and the pass continues.",
  },
};

const JI_TEXT_EN: Widen<typeof JI_TEXT> = {
  kicker: "Posting from JobIndustry",
  title: "Compare this posting with your experience?",
  lead: "MAT compares each requirement of the posting with your experience. You do not need the test.",
  goFree: "Compare this posting with my experience · 1 free",
  go: "Compare this posting with my experience",
  goPay: "Analyze this posting · MAT pass",
  source: "Original posting on JobIndustry",
  none: "No posting came with you.",
  jobs: "See postings",
  pickCore: "Which major should we compare it with?",
};

const MONEY = {
  NOTEST: { ko: NOTEST, en: NOTEST_EN } as CopySet<typeof NOTEST>,
  PAYWALL: { ko: PAYWALL, en: PAYWALL_EN } as CopySet<typeof PAYWALL>,
  PRICING: { ko: PRICING, en: PRICING_EN } as CopySet<typeof PRICING>,
  CHECKOUT_SUB: { ko: CHECKOUT_SUB, en: CHECKOUT_SUB_EN } as CopySet<typeof CHECKOUT_SUB>,
  SUB_STATE: { ko: SUB_STATE, en: SUB_STATE_EN } as CopySet<typeof SUB_STATE>,
  JOBS_TEXT: { ko: JOBS_TEXT, en: JOBS_TEXT_EN } as CopySet<typeof JOBS_TEXT>,
  PASS_TEXT: { ko: PASS_TEXT, en: PASS_TEXT_EN } as CopySet<typeof PASS_TEXT>,
  JI_TEXT: { ko: JI_TEXT, en: JI_TEXT_EN } as CopySet<typeof JI_TEXT>,
};

/** 그 언어의 수익화 문구 한 묶음(`moneyText("en").PRICING`) */
export function moneyText(lang: MatUiLang) {
  return {
    NOTEST: copyOf(MONEY.NOTEST, lang), PAYWALL: copyOf(MONEY.PAYWALL, lang), PRICING: copyOf(MONEY.PRICING, lang),
    CHECKOUT_SUB: copyOf(MONEY.CHECKOUT_SUB, lang), SUB_STATE: copyOf(MONEY.SUB_STATE, lang),
    JOBS_TEXT: copyOf(MONEY.JOBS_TEXT, lang), PASS_TEXT: copyOf(MONEY.PASS_TEXT, lang), JI_TEXT: copyOf(MONEY.JI_TEXT, lang),
  };
}
