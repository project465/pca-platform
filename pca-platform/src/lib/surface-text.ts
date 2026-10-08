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
    "해보고 싶은 일, 해본 일, 직접 정해 본 일, 일하는 방식, 더 배우고 싶은 것을 따로 읽습니다. 합쳐서 하나의 점수로 만들지 않습니다.",
    "Interest, exposure, decision ownership, work mode and learning intent stay separate. They are never collapsed into one score.",
  ),
  myTiers: p("등급", "Tiers"),
  myTiersBody: p(
    "BASIC 은 먼저 볼 직무와 다음 할 일까지, STANDARD 는 조직 비교와 공백까지, PRO 는 직무별 자료까지 받습니다.",
    "BASIC covers where to look and what to do next, STANDARD adds organization comparison and gaps, PRO adds per-role dossiers.",
  ),
  myEvidenceIntro: p("경험과 증거", "Evidence profile"),
  myEvidenceIntroBody: p(
    "적어 주신 프로젝트와 도구가 어디까지 설명할 수 있는 근거가 되는지 봅니다. 해봤다에서 그치는지, 결과와 그 쓰임까지 남았는지를 가릅니다.",
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

  /* ── 응시 ─────────────────────────────────────────────────────── */
  asSaving: p("저장 중", "Saving…"),
  asSaved: p("저장됨", "Saved"),
  asRetry: p("다시 보내는 중", "Retrying…"),
  asPrev: p("이전", "Back"),
  asNext: p("다음", "Next"),
  asSubmit: p("제출하기", "Submit"),
  asNotAll: p("남은 문항이 있습니다", "Some questions are unanswered"),
  /* **어디에 몇 개가 남았는지 적는다.** '남은 문항이 있습니다' 만 적으면
     누른 사람은 어느 묶음으로 돌아가야 하는지 모른 채 처음부터 다시 훑는다 */
  asMissingHead: p("아직 못 고르신 문항이 있습니다. 눌러서 그 자리로 갑니다.",
                   "Some questions are still unanswered. Tap one to jump there."),
  asMissingLeft: p("남음", "left"),
  asGone: p("이 응시를 찾을 수 없습니다.", "This attempt could not be found."),
  asResume: p("이어서 응시하기", "Continue"),
  asSectionOf: p("단계", "Step"),
  asDoneTitle: p("응시가 끝났습니다.", "Assessment complete."),
  asDoneBody: p(
    "이어서 경험을 적으시면 결과지가 훨씬 구체적으로 바뀝니다. 지금 바로 결과를 보셔도 됩니다.",
    "Adding your experience next makes the report far more specific. You can also see the result right away.",
  ),
  asAddEvidence: p("경험 적기", "Add experience"),
  asSeeResult: p("결과 보기", "See result"),
  asStageTitle: p("학위 단계를 골라 주십시오.", "Which stage are you at?"),
  asStageBody: p(
    "묻는 장면이 단계마다 달라집니다. 점수가 달라지지는 않습니다.",
    "The wording of some questions changes by stage. Your scores do not.",
  ),
  asStageBachelor: p("학부", "Bachelor"),
  asStageMaster: p("석사", "Master"),
  asStagePhd: p("박사", "PhD"),
  asStagePostdoc: p("박사후연구원", "Postdoc"),
  asStart: p("검사 시작", "Start"),
  asTargetTitle: p("어느 나라를 목표로 보십니까?", "Which country are you targeting?"),
  asTargetBody: p(
    "사이트나 접속 위치로 짐작하지 않습니다. 확인된 자료가 없는 나라는 기준 자료로 보여 드립니다.",
    "We never infer this from your site or location. Where we have no verified data we fall back to the global reference set.",
  ),
  asTargetSkip: p("아직 정하지 않았습니다", "Not decided yet"),

  /* 응시 단계 이름. **`43/92` 만 보여주지 않는다**(규격 §43) */
  secInterest: p("해보고 싶은 일", "Career interest"),
  secExposure: p("해본 경험", "Experience"),
  secOwnership: p("직접 정한 것", "Decision ownership"),
  secWorkMode: p("업무 방식", "Work style"),
  secLearning: p("배울 뜻", "Learning intent"),
  secContext: p("진로 맥락", "Career context"),

  /* ── 상품 ─────────────────────────────────────────────────────── */
  pxTitle: p("기계공학 진로 진단", "Mechanical Engineering career diagnostic"),
  pxBody: p(
    "전공과 경험을 실제 직무 선택으로 잇습니다. 먼저 볼 직무와 지금 비어 있는 증거, 다음에 만들 경험 하나를 정리해 드립니다.",
    "We connect your major and experience to an actual role decision: which roles to look at first, which evidence is missing, and the one experience to build next.",
  ),
  pxBasic: p("먼저 볼 직무와 다음 할 일", "Where to look first, and what to do next"),
  pxStandard: p("직무 견주기와 비어 있는 증거, 조직 비교", "Role comparison, evidence gaps, organization comparison"),
  pxPro: p(
    "직무 셋을 하나씩 파고들어, 내 경험이 그 직무에서 어떻게 읽히는지와 다음에 무엇을 만들지까지 적습니다",
    "Evidence architecture, research ownership, organization value, next evidence project, 30/90/365 plan",
  ),
  pxBuy: p("시작하기", "Get started"),

  /* ── 동의 ───────────────────────────────────────────────────────
     **`locale.ts` 에 넣지 않는다.** 저쪽은 세 언어를 한 줄에 쓰게 묶여
     있어서, 새 문구를 더하려면 승인되지 않은 튀르키예어까지 지어내야
     한다. 여기는 두 언어다 */
  cnTitle: p("약관에 동의해 주십시오", "Please agree to the terms"),
  cnRequired: p("필수", "Required"),
  cnOptional: p("선택", "Optional"),
  cnView: p("전문 보기", "Read in full"),
  cnAgreeAll: p("모두 동의합니다", "I agree to all of these"),
  cnMissing: p(
    "필수 항목에 동의하셔야 가입할 수 있습니다.",
    "You can only sign up once you have agreed to the required items.",
  ),
  /* **번역이 없는 것을 없다고 적는다.** 구속력 있는 문서를 기계로 옮겨
     올리면 그걸 읽고 동의한 사람이 생긴다 */
  cnPending: p(
    "영문 번역을 준비하고 있습니다. 지금은 한국어 본문이 기준입니다.",
    "An English translation is in preparation. The Korean text governs for now.",
  ),
  cnPendingShort: p("한국어 본문", "Korean text"),
  cnWithdraw: p("수신 철회", "Withdraw"),
  cnAgreedAt: p("동의한 때", "Agreed on"),
  cnWithdrawnAt: p("철회한 때", "Withdrawn on"),
  cnNotAgreed: p("동의하지 않음", "Not agreed"),
  cnMine: p("내가 동의한 것", "What I have agreed to"),
  cnVersion: p("판", "Version"),
  /* **세 상태를 한 문구로 적지 않는다.** 승인된 0원(무료 구간)과 값을
     아직 못 정한 것은 다른 말이어야 한다. 전에는 둘 다 이 한 줄을
     받았는데, 무료 구간에 "값이 아직 정해지지 않았습니다" 가 뜨면 공짜로
     풀 수 있다는 것을 아무도 모른다 */
  pxPriceNotApproved: p(
    "값이 아직 승인되지 않았습니다",
    "Price not approved yet",
  ),
  pxPriceNotApprovedWhy: p(
    "정해지면 이 자리에 적습니다. 지어낸 값을 띄우지 않습니다.",
    "It will appear here once it is set. We do not display an invented figure.",
  ),
  pxFreeTier: p("무료", "Free"),
  pxStartFree: p("무료로 시작하기", "Start for free"),
  pxFreeTierWhy: p(
    "결제 없이 풀어 보실 수 있습니다.",
    "You can take it without paying.",
  ),
  pxQuestions: p("문항", "questions"),
  pxPaySuccess: p("결제가 완료되었습니다.", "Payment complete."),
  pxSignIn: p("로그인", "Sign in"),
  pxMarketKR: p("한국", "Korea"),
  pxMarketGlobal: p("글로벌", "Global"),
  pxWhatYouGet: p("무엇이 들어 있는가", "What you get"),
  pxOnceVat: p("한 번 결제 · 부가세 포함", "One-time payment, tax included"),
  pxOnce: p("한 번 결제", "One-time payment"),
  pxNote1: p(
    "결제가 끝나면 바로 검사를 시작할 수 있습니다. 담당자가 열어 줄 때까지 기다리지 않습니다.",
    "You can start the assessment the moment payment goes through. Nobody has to unlock it for you.",
  ),
  pxNote2: p(
    "첫 문항에 답하기 전에는 기간 제한 없이 환불됩니다. 응시가 시작된 뒤에는 환불되지 않습니다.",
    "Full refund any time before you answer the first question. Once the assessment has started it is not refundable.",
  ),
  pxNote3: p(
    "아직 인지 면접과 파일럿을 거치지 않았으므로 검증된 검사로 팔지 않습니다. 순위나 상위 몇 %도 적지 않습니다.",
    "Cognitive interviews and the pilot are still ahead, so we do not sell this as a validated instrument. We also publish no rankings or percentiles.",
  ),
  pxEmpty: p(
    "이 시장에서 지금 파는 등급이 없습니다.",
    "No tier is on sale in this market right now.",
  ),
  pxEmptyBody: p(
    "가격이 정해지면 여기 세 등급이 열립니다. 값을 지어내 미리 띄우지 않습니다.",
    "The three tiers appear here once prices are set. We do not post a made-up price in the meantime.",
  ),
  pxHaveGrant: p("이미 사신 검사가 있습니다", "You already have an assessment"),
  pxGoAssessment: p("검사로 가기", "Go to the assessment"),

  /* 가격표를 다시 짜면서 더한 것. **값보다 받는 것이 먼저 읽히게** 한다 */
  pxLead: p(
    "전공과 경험을 직무 선택으로 옮깁니다",
    "Turn your major and experience into a role decision",
  ),
  /* 머리글 아래에 **같은 말을 다시 적지 않는다.** 머리글이 무엇을 하는지
     말했으면 여기서는 무엇을 받는지 적는다 */
  pxLeadSub: p(
    "먼저 볼 직무 묶음과 그 근거, 지금 비어 있는 증거, 다음 30일 안에 만들 경험 하나를 한 장에 정리해 드립니다.",
    "One document: the role group to look at first and why, the evidence you are missing, and the one experience to build in the next 30 days.",
  ),
  pxTrust1: p("결제하면 바로 시작합니다", "Start the moment you pay"),
  pxTrust2: p("첫 문항 전에는 전액 환불", "Full refund before the first question"),
  pxTrust3: p("웹 결과지와 A4 PDF", "Web report and an A4 PDF"),
  pxFor: p("이런 분께", "Who it is for"),
  pxIncluded: p("포함되는 것", "What is included"),
  pxCommon: p("세 등급에 모두 들어 있는 것", "In all three tiers"),
  pxCommon1: p("웹 결과지와 A4 PDF", "Web report and an A4 PDF"),
  pxCommon1b: p(
    "결과지는 로그인하시면 언제든 다시 열립니다.",
    "The report reopens any time you sign in.",
  ),
  pxCommon2: p("한국어와 영어", "Korean and English"),
  pxCommon2b: p(
    "같은 엔진이 두 언어로 같은 판정을 냅니다.",
    "One engine, the same verdicts in both languages.",
  ),
  pxCommon3: p("담당자 승인이 필요 없습니다", "No approval step"),
  pxCommon3b: p(
    "결제가 끝나면 그 자리에서 응시가 열립니다.",
    "The assessment opens as soon as payment goes through.",
  ),
  pxCommon4: p("20분에서 40분", "20 to 40 minutes"),
  pxCommon4b: p(
    "중간에 닫으셔도 답한 곳에서 이어집니다.",
    "Close it midway and you resume where you stopped.",
  ),
  pxAsk: p("사기 전에 묻는 것", "Before you buy"),
  pxAsk1: p("언제부터 응시할 수 있나요", "When can I start?"),
  pxAsk2: p("마음에 안 들면 환불되나요", "Can I get a refund?"),
  pxAsk3: p("검증된 검사인가요", "Is this a validated instrument?"),
  pxMore: p("상품 설명 보기", "Read the full description"),

  /* ── 제품의 사고 순서 ─────────────────────────────────────────
     CareerMatri 가 무엇을 하는 물건인지 **한 줄로 보여 주는 자리**다.
     가격표와 상품 쪽과 개인 첫 화면이 같은 다섯 걸음을 쓴다: 쪽마다 다른
     그림을 그리면 읽는 사람이 매번 새로 배운다 */
  flowTitle: p("CareerMatri 가 읽는 순서", "How CareerMatri reads it"),
  flow1: p("전공·학업", "Academic background"),
  flow1b: p("무엇을 배우셨는가", "What you studied"),
  flow2: p("경험", "Experience"),
  flow2b: p("무엇을 해보셨는가", "What you have done"),
  flow3: p("직무 후보", "Career paths"),
  flow3b: p("어디로 갈 수 있는가", "Where it can take you"),
  flow4: p("아직 비어 있는 근거", "Evidence gap"),
  flow4b: p("무엇이 비어 있는가", "What is still missing"),
  flow5: p("다음 행동", "Next action"),
  flow5b: p("지금 무엇을 하는가", "What to do next"),

  /* ── 경험 ─────────────────────────────────────────────────────── */
  evTitle: p("겪으신 것을 적어 주십시오.", "Tell us what you have done."),
  evBody: p(
    "적지 않으셔도 결과지는 나갑니다. 다만 어디까지 설명할 수 있는 근거가 되는지와 " +
    "직무마다 무엇이 비어 있는지가 빈 채로 나가고, 결과지가 그 사실을 적습니다. " +
    "점수는 경험으로 바뀌지 않습니다.",
    "The report comes out either way. Without this, the evidence ladder and role coverage " +
    "stay empty and the report says so. Your scores do not change with experience.",
  ),
  evHave: p("적어 주신 줄", "Recorded"),
  evNone: p("아직 적어 주신 것이 없습니다", "Nothing recorded yet"),
  evLater: p("나중에 적기", "Later"),

  /* ── 결제가 끝난 뒤 ───────────────────────────────────────────── */
  okOrderNo: p("주문 번호", "Order number"),
  okTier: p("산 등급", "Tier"),
  okNext: p("다음", "Next"),
  okStart: p("검사 시작하기", "Start the assessment"),
  okBody: p(
    "이용권이 발급되었습니다. 답은 넘어갈 때마다 서버에 저장되니 창을 닫으셔도 이어서 하실 수 있습니다.",
    "Your entitlement is issued. You will see the questions for your tier, and your answers are stored on the server as you go. You can close the window and pick up where you left off.",
  ),

  /* ── 결과지 ───────────────────────────────────────────────────── */
  rpTitle: p("진로 결정 자료", "Career decision brief"),
  rpMadeAt: p("만든 때", "Generated"),
  navSupport: p("문의", "Support"),
  navLaunch: p("런칭 준비", "Launch readiness"),
  navIncidents: p("사고", "Incidents"),
  navRefunds: p("환불 요청", "Refund requests"),
  navFunnel: p("퍼널", "Funnel"),
  navV3Pilot: p("V3 파일럿", "V3 pilot"),
  navBusiness: p("사업자 표시", "Business details"),
  rpPdf: p("PDF 받기", "Download PDF"),
  /* PDF 만들기가 깨진 자리. **웹 결과지는 그대로 열려 있다**(규격 §16):
     PDF 하나 때문에 산 사람이 자기 결과지를 못 보면 안 된다 */
  rpPdfMissing: p(
    "PDF 는 아직 없습니다. 웹 결과지는 그대로 보실 수 있고, 다시 만들면 PDF 도 함께 나옵니다.",
    "The PDF is not there yet. The web report is open as it is, and generating " +
      "again produces the PDF with it.",
  ),
  rpMake: p("결과지 만들기", "Generate the report"),
  rpMaking: p("만들고 있습니다", "Generating…"),
  rpRetry: p("다시 만들기", "Try again"),
  rpAgain: p("다시 만들기", "Regenerate"),
  rpAgainWhy: p(
    "경험을 더 적으셨으면 다시 만드십시오. 앞서 만든 판본은 그대로 남습니다.",
    "Added more experience? Regenerate. The earlier version stays as it was.",
  ),
  rpFailed: p(
    "결과지를 만들지 못했습니다. 운영 쪽에 기록이 남았습니다.",
    "We could not generate the report. Operations has a record of it.",
  ),
  rpNoneTitle: p("아직 만들어 둔 결과지가 없습니다.", "No report has been generated yet."),
  rpNoneBody: p(
    "응시는 끝났습니다. 결과지는 지금 만드실 수 있고, 경험을 먼저 적으시면 " +
    "직무마다 무엇이 확인되고 무엇이 비어 있는지까지 채워진 채로 나옵니다.",
    "Your assessment is complete. You can generate the report now; adding your " +
    "experience first fills in the evidence ladder and role coverage.",
  ),
  rpBareTitle: p(
    "경험을 적지 않으셔서 비어 있는 자리가 있습니다.",
    "Some sections are empty because no experience was recorded.",
  ),
  rpBareBody: p(
    "직무마다 무엇이 확인되는지를 적는 자리가 빈 양식으로 나갑니다. 못 한다는 뜻이 " +
    "아니라 지금 적어 주신 것으로는 확인되지 않는다는 뜻입니다.",
    "The evidence ladder and role coverage come out as blank forms. That does not " +
    "mean you cannot do these things; it means nothing you recorded confirms them yet.",
  ),

  /* ── 개인 첫 화면의 ME_V2 상태 ───────────────────────────────── */
  v2BoughtTitle: p("검사를 시작하실 수 있습니다.", "Your assessment is ready."),
  v2BoughtBody: p(
    "학위 단계를 고르시면 바로 시작합니다. 답은 넘어갈 때마다 서버에 저장되고, " +
    "창을 닫으셔도 이어서 하실 수 있습니다.",
    "Pick your stage and you start right away. Answers are stored on the server as " +
    "you go, so you can close the window and pick up where you left off.",
  ),
  v2Grants: p("쓸 수 있는 이용권", "Available entitlements"),
  v2ResumeTitle: p("이어서 하시면 됩니다.", "Pick up where you left off."),
  v2ResumeBody: p(
    "안 찬 묶음으로 바로 갑니다. 처음부터 다시 풀지 않습니다.",
    "You go straight back to the section you had not finished. You never start over.",
  ),
  v2EvidenceTitle: p("응시가 끝났습니다.", "Your assessment is complete."),
  v2EvidenceBody: p(
    "경험을 적으시면 어디까지 설명할 수 있는 근거가 되는지, 직무마다 무엇이 비어 있는지가 채워집니다. 점수는 바뀌지 않습니다.",
    "Adding your experience fills in the evidence ladder and role coverage. Your scores do not change.",
  ),
  v2StuckTitle: p("결과지를 만들다 막혔습니다.", "Report generation got stuck."),
  v2StuckBody: p(
    "운영 쪽에 기록이 남았습니다. 다시 눌러 보실 수 있고, 같은 자리에서 또 막히면 " +
    "저희가 고치는 동안 기다리지 않으셔도 됩니다.",
    "Operations has a record of it. You can try again; if it stops at the same place, " +
    "you do not have to wait around while we fix it.",
  ),
  v2StuckAt: p("막힌 때", "Last failure"),
  v2DoneBody: p(
    "먼저 볼 직무와 지금 비어 있는 증거, 다음에 만들 경험 하나가 들어 있습니다. " +
    "합격 가능성이나 실력을 잰 값은 아닙니다.",
    "It names the roles to look at first, the evidence that is missing, and the one " +
    "experience to build next. It does not measure your ability or your odds.",
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
  navReadiness: p("상용화 준비", "Commercial readiness"),
  navLocalization: p("지역화 덮임", "Localization coverage"),
  navInstruments: p("검사 문항", "Instruments"),
  navMappings: p("매핑 데이터", "Mapping data"),
  navAttempts: p("응시 현황", "Attempts"),
  navOps: p("운영 당번", "Daily ops"),

  /* 메뉴 묶음 머리말. 운영 메뉴가 스물에 가까워서, 묶지 않으면 찾는 데
     스크롤이 필요하다. **묶음 이름은 누가 그 줄을 보는가로 가른다** */
  navGroupToday: p("오늘", "Today"),
  navGroupLaunch: p("켜기 전에", "Before launch"),
  navGroupCustomers: p("손님과 돈", "Customers and money"),
  navGroupCatalog: p("검사와 자료", "Instruments and data"),
  navGroupSystem: p("시스템", "System"),

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
  /* **'실패' 가 아니다.** 깨진 것은 `adminBlocked` 가 받고, 이 숫자는
     제출은 됐는데 아직 아무도 안 누른 것이다 */
  adminReportErrors: p("결과지 미생성", "Reports not generated yet"),
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
  adminBlocked: p("사람이 손봐야 하는 것", "Needs a person"),
  adminBlockedKind: p("갈래", "Kind"),
  adminBlockedWhen: p("때", "When"),
  adminBlockedWhat: p("무엇이", "What"),
  adminBlockedTrace: p("되짚을 번호", "Trace"),
  adminBlockedRecent: p("최근에 막힌 것", "Recent failures"),
  adminBlockedNoneTitle: p("지금 막힌 것이 없습니다.", "Nothing is stuck right now."),
  adminBlockedNoneBody: p(
    "결과지 생성 · PDF · 결제 · 알림에서 사람이 봐야 하는 실패가 쌓이면 여기 섭니다. " +
    "비어 있는 것과 검사하지 않는 것은 다릅니다: 이 줄은 표를 실제로 세고 있습니다.",
    "Failures in report generation, PDF, payment and email that need a person show up here. " +
    "Empty is not the same as unchecked: this really counts the table.",
  ),

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
