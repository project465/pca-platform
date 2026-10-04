/**
 * 세 제품 화면의 문구.
 *
 * **재사용하는 컴포넌트에 한국어를 박지 않는다.** 그래서 문구는 전부 여기
 * 모으고, 화면은 키로만 가져간다. `src/lib/locale.ts` 와 따로 두는 이유가
 * 둘 있다.
 *
 *   1. 저기는 세 언어(ko·en·tr)를 한 줄에 쓰게 묶어 둔 사전이다. 화면을
 *      새로 짜면서 수백 줄을 더하려면 승인되지 않은 튀르키예어까지 지어내야
 *      한다. **없는 번역을 지어내지 않는다.**
 *   2. 저기는 응시 화면과 공개 페이지가 쓴다. 건드리면 그쪽이 흔들린다.
 *
 * 여기는 처음부터 `ko` 와 `en` 둘이다. 셋째 언어는 실제 번역이 승인되는
 * 날 `Lang2` 에 더하면 되고, 그때 빠진 키는 타입이 알려 준다.
 */

export const SURFACE_LANGS = ["ko", "en"] as const;
export type Lang2 = (typeof SURFACE_LANGS)[number];

type P = Record<Lang2, string>;
const p = (ko: string, en: string): P => ({ ko, en });

/** 브랜드. **한 자리에서만 적는다**: 표기가 갈리는 사고가 여기서 끝난다. */
export const BRAND = {
  root: "CareerMatri",
  campus: "CareerMatri Campus",
  admin: "CareerMatri Admin",
} as const;

export const TX = {
  /* ── 공통 ─────────────────────────────────────────────────────── */
  signOut: p("로그아웃", "Sign out"),
  account: p("계정", "Account"),
  search: p("검색", "Search"),
  filterAll: p("전체", "All"),
  sortBy: p("정렬", "Sort"),
  page: p("쪽", "Page"),
  prev: p("이전", "Previous"),
  next: p("다음", "Next"),
  of: p("중", "of"),
  language: p("언어", "Language"),
  notOpenTitle: p("이 화면은 아직 열려 있지 않습니다", "This screen is not open yet"),
  notOpenBody: p(
    "자리는 잡아 두었습니다. 뒤에 붙을 자료가 실제로 쌓이면 이 화면이 열립니다. 없는 숫자를 미리 보여 드리지 않습니다.",
    "The space is reserved. This screen opens once the data behind it actually exists. We do not show numbers that are not there yet.",
  ),
  privacyHidden: p("표시하지 않음", "Withheld"),
  privacyHiddenWhy: p(
    "다섯 명 미만인 칸은 숫자를 내지 않습니다.",
    "Cells with fewer than five people are not reported.",
  ),
  readOnly: p("읽기 전용", "Read only"),

  /* ── 개인 ─────────────────────────────────────────────────────── */
  navHome: p("홈", "Home"),
  navAssessments: p("검사", "Assessments"),
  navResults: p("결과", "Results"),
  navEvidence: p("경험과 증거", "Evidence"),
  navApplications: p("지원 준비", "Applications"),
  navAccount: p("계정", "Account"),

  myHeroTitle: p(
    "전공과 경험을 실제 커리어 선택으로 연결하세요.",
    "Turn your major and experience into an actual career decision.",
  ),
  myHeroBody: p(
    "먼저 살펴볼 직무와 지금 비어 있는 증거, 그리고 다음에 만들 경험 하나를 정리해 드립니다.",
    "We set out which roles to look at first, which evidence is still missing, and the one experience to build next.",
  ),
  myStart: p("검사 시작", "Start the assessment"),
  myContinue: p("이어서 응시하기", "Continue"),
  myOpenReport: p("결과지 열기", "Open report"),
  myWhatWeRead: p("무엇을 읽는가", "What CareerMatri reads"),
  myWhatWeReadBody: p(
    "관심 · 해본 경험 · 결정 소유 · 업무 방식 · 학습 의향을 따로 둡니다. 합쳐서 하나의 점수로 만들지 않습니다.",
    "Interest, exposure, decision ownership, work mode and learning intent stay separate. They are never collapsed into one score.",
  ),
  myTiers: p("등급", "Tiers"),
  myTiersBody: p(
    "BASIC 은 먼저 볼 직무와 다음 할 일까지, STANDARD 는 조직 비교와 공백까지, PRO 는 직무별 자료까지 받습니다.",
    "BASIC covers where to look and what to do next, STANDARD adds organization comparison and gaps, PRO adds per-role dossiers.",
  ),
  myEvidenceIntro: p("경험과 증거", "Evidence profile"),
  myEvidenceIntroBody: p(
    "적어 주신 프로젝트와 도구가 어느 단계까지 증거로 확인되는지 봅니다. 활동에서 반복 가능성까지 여섯 칸입니다.",
    "We check how far your projects and tools are confirmed as evidence, across six rungs from activity to repeatability.",
  ),
  myInProgress: p("응시 중", "In progress"),
  myProgress: p("진행", "Progress"),
  myTier: p("등급", "Tier"),
  myStage: p("학위 단계", "Degree stage"),
  myTop3: p("먼저 살펴볼 직무 셋", "Three roles to look at first"),
  myKeyGap: p("지금 가장 큰 공백", "Biggest gap right now"),
  myNextAction: p("다음에 할 일", "What to do next"),
  myNoAssessTitle: p("아직 응시한 검사가 없습니다.", "You have not taken an assessment yet."),
  myNoAssessBody: p(
    "CareerMatri 가 전공 · 경험 · 증거를 기준으로 먼저 살펴볼 직무와 다음 행동을 정리합니다.",
    "CareerMatri sets out which roles to look at first and what to do next, based on your major, experience and evidence.",
  ),
  myNoEvidenceTitle: p("아직 적어 주신 경험이 없습니다.", "No experience recorded yet."),
  myNoEvidenceBody: p(
    "프로젝트 하나를 적으시면 그 경험이 어느 단계까지 증거가 되는지 바로 보입니다.",
    "Add one project and you will see how far it is confirmed as evidence.",
  ),
  myAddEvidence: p("경험 추가하기", "Add experience"),
  myApplicationsSoon: p(
    "결과지가 나오면 서류 · 면접 · 포트폴리오로 옮길 문장이 여기 모입니다.",
    "Once your report exists, the lines to carry into a resume, an interview and a portfolio collect here.",
  ),

  /* ── 기관 ─────────────────────────────────────────────────────── */
  navOverview: p("한눈에", "Overview"),
  navParticipants: p("참여자", "Participants"),
  navCohorts: p("회차", "Cohorts"),
  navLicenses: p("좌석", "Licenses"),
  navCareerInsights: p("직무 집계", "Career Insights"),
  navEvidenceInsights: p("증거 집계", "Evidence Insights"),
  navReports: p("보고", "Reports"),
  navContract: p("계약", "Contract"),
  navSettings: p("설정", "Settings"),

  campusSeats: p("계약 좌석", "Contracted seats"),
  campusUsed: p("쓴 좌석", "Used"),
  campusRemaining: p("남은 좌석", "Remaining"),
  campusInvited: p("초대", "Invited"),
  campusStarted: p("응시 중", "In progress"),
  campusCompleted: p("완료", "Completed"),
  campusFunnel: p("참여 흐름", "Participation funnel"),
  campusFunnelInvited: p("초대", "Invited"),
  campusFunnelRegistered: p("등록", "Registered"),
  campusFunnelStarted: p("시작", "Started"),
  campusFunnelCompleted: p("완료", "Completed"),
  campusCareer: p("먼저 살펴보는 직무", "Career exploration"),
  campusCareerNote: p(
    "지금 먼저 살펴보고 있는 직무입니다. 적합하다는 뜻이 아닙니다.",
    "These are the roles participants are currently exploring. It does not mean they are suited to them.",
  ),
  campusGaps: p("가장 자주 비어 있는 증거", "Most frequent evidence gaps"),
  campusCohorts: p("열려 있는 회차", "Active cohorts"),
  campusAction: p("손볼 일", "Action required"),
  campusNoContractTitle: p("현재 활성 계약이 없습니다.", "No active contract."),
  campusNoContractBody: p(
    "계약이 열리면 좌석을 발급하고 회차를 만들고 집계를 보실 수 있습니다. 지금은 기관 정보만 보입니다.",
    "Once a contract is active you can issue seats, open cohorts and read the aggregates. For now only the organization record is visible.",
  ),
  campusContractAsk: p("계약 문의", "Request a contract"),
  campusOrgStatus: p("기관 상태", "Organization status"),
  campusNoParticipantsTitle: p("아직 명단에 올라온 분이 없습니다.", "No participants on the roster yet."),
  campusNoParticipantsBody: p(
    "회차를 열고 명단을 올리면 여기에 진행 상태가 쌓입니다. 개인 결과지 내용은 담기지 않습니다.",
    "Open a cohort and upload a roster; progress collects here. Individual report contents are never included.",
  ),
  campusColParticipant: p("참여자", "Participant"),
  campusColCohort: p("회차", "Cohort"),
  campusColLicense: p("좌석", "License"),
  campusColAssessment: p("검사", "Assessment"),
  campusColEvidence: p("증거", "Evidence"),
  campusColReport: p("결과지", "Report"),
  campusColActivity: p("마지막 활동", "Last activity"),
  campusReportPrivate: p("열람 불가", "Not viewable"),
  campusReportPrivateWhy: p(
    "개인 결과지는 기관 담당자가 기본으로 열지 못합니다.",
    "Institution staff cannot open individual reports by default.",
  ),
  campusStage: p("학년", "Year of study"),
  campusCohortCompare: p("회차 비교", "Cohort comparison"),
  campusExplorationStatus: p("어디까지 왔는가", "Exploration status"),
  campusToolExposure: p("써 본 도구", "Tool exposure"),
  campusToolLinked: p("경험에 걸린 도구", "Project-linked tool usage"),
  campusNextActions: p("다음 행동 갈래", "Next action categories"),
  campusEvidenceStates: p("확인 · 일부 · 아직", "Confirmed · partial · not yet"),

  /* ── 운영 ─────────────────────────────────────────────────────── */
  navUsers: p("사용자", "Users"),
  navOrganizations: p("기관", "Organizations"),
  navContracts: p("계약", "Contracts"),
  navProducts: p("상품", "Products"),
  navOrders: p("주문", "Orders"),
  navCountries: p("국가", "Countries"),
  navSites: p("사이트", "Sites"),
  navAudit: p("감사 기록", "Audit logs"),

  adminB2C: p("개인", "B2C"),
  adminB2B: p("기관", "B2B"),
  adminProduct: p("제품", "Product"),
  adminMarket: p("시장", "Market"),
  adminSignups: p("가입", "Signups"),
  adminPurchases: p("결제", "Purchases"),
  adminStarted: p("응시 시작", "Assessments started"),
  adminCompleted: p("완료", "Completed"),
  adminRevenue: p("매출", "Revenue"),
  adminActiveOrgs: p("활성 기관", "Active organizations"),
  adminActiveContracts: p("활성 계약", "Active contracts"),
  adminSeats: p("계약 좌석", "Contracted seats"),
  adminUsedSeats: p("쓴 좌석", "Used seats"),
  adminCompletion: p("완료율", "Completion"),
  adminTierUse: p("등급별 발급", "Report tiers issued"),
  adminMajorUse: p("전공별 응시", "Assessments by major"),
  adminReportErrors: p("결과지 생성 실패", "Report generation errors"),
  adminPeriod: p("기간", "Period"),
  adminPeriod7: p("7일", "7 days"),
  adminPeriod30: p("30일", "30 days"),
  adminPeriod90: p("90일", "90 days"),
  adminPeriodAll: p("전체", "All time"),
  adminOrgsTotal: p("전체 기관", "Organizations"),
  adminOrgTypes: p("기관 유형", "Institution types"),
  adminCountries: p("국가", "Countries"),
  adminColOrg: p("기관", "Organization"),
  adminColType: p("유형", "Type"),
  adminColCountry: p("국가", "Country"),
  adminColContract: p("활성 계약", "Active contract"),
  adminColSeats: p("좌석", "Seats"),
  adminColUsers: p("사용자", "Users"),
  adminColStatus: p("상태", "Status"),
  adminColUpdated: p("갱신", "Updated"),
  adminSitesTitle: p("사이트", "Sites"),
  adminCountryPacks: p("국가 묶음", "Country packs"),
  adminColLocalization: p("현지화", "Localization"),
  adminColTaxonomy: p("직무 분류", "Job taxonomy"),
  adminColReportL10n: p("결과지 현지화", "Report localization"),
  adminColVerified: p("마지막 확인", "Last verified"),
  adminGlobalRef: p("Global Reference Mode", "Global Reference Mode"),
  adminGlobalRefWhy: p(
    "확인된 국가 자료가 없어서 기준 자료로 돌립니다. 나라 이름만 띄우지 않습니다.",
    "No verified country data, so this falls back to the global reference set. We do not show a country label with nothing behind it.",
  ),
  adminNoCountryPacks: p("아직 확인된 국가 묶음이 없습니다.", "No verified country packs yet."),
  adminActive: p("사용", "Active"),
  adminInactive: p("중지", "Inactive"),
} as const;

export type TxKey = keyof typeof TX;

/** 문구 하나. 키가 사전에 없으면 타입이 막는다. */
export function tx(key: TxKey, lang: Lang2): string {
  return TX[key][lang] ?? TX[key].ko;
}

/** 화면 한 벌에서 반복해 쓸 때. `const T = txer(lang)` */
export function txer(lang: Lang2) {
  return (key: TxKey) => tx(key, lang);
}

/** `locale.ts` 의 세 언어를 이 둘로 좁힌다. 승인 안 된 언어는 한국어로 본다. */
export function toLang2(v: string | undefined): Lang2 {
  return v === "en" ? "en" : "ko";
}
