/**
 * 상품 쪽 원고.
 *
 * **방법보다 받는 것을 앞세운다**(규격 §5 마지막 줄). 처음 온 사람이
 * 알고 싶은 것은 92문항의 구조가 아니고, 이 검사를 보면 무엇을 들고
 * 나가는지다. 산식과 축 이름은 아래로 내렸다.
 *
 * **검증 전에 할 수 없는 말을 적지 않는다**(규격 §18). 인지 면접과
 * 파일럿을 돌리지 않았으므로 "검증된 심리검사" · "과학적으로 증명된
 * 직무 적합" · "합격 가능성" 을 쓰지 않는다. 쓰는 말은 진로 결정 지원 ·
 * 구조적 진로 탐색 · 증거 기반 준비다.
 *
 * **알선하지 않는다.** 보유한 것이 직업정보제공사업 신고 하나라서
 * 취업 추천과 이력서 발송 대행을 적을 수 없고, 기업을 가리킬 때도
 * "추천 기업" 대신 "적합도가 높은" 으로 쓴다(CLAUDE.md 법적 범위).
 *
 * 원고를 `surface-text.ts` 에 섞지 않은 까닭은 저기가 **세 언어를 한 줄에
 * 묶어 둔 사전**이라, 한 줄을 더하려면 승인되지 않은 튀르키예어까지
 * 지어내야 하기 때문이다.
 */
type Pair = { ko: string; en: string };
const p = (ko: string, en: string): Pair => ({ ko, en });

export type Faq = { q: Pair; a: Pair };

export const PRODUCT = {
  /* 1. 히어로. 받은 규격 §6 의 문장 그대로다 */
  hero: {
    title: p(
      "전공은 있는데, 어떤 직무로 가야 할지 모르겠다면",
      "Turn your engineering background into a clearer career decision.",
    ),
    body: p(
      "커리어메트리는 전공·경험·Evidence를 실제 직무와 연결해 먼저 볼 경로, " +
        "부족한 증거, 다음 행동을 정리합니다.",
      "CareerMatri connects your academic background, experience, and evidence " +
        "to real engineering career paths and next actions.",
    ),
    cta: p("검사 시작하기", "Start the assessment"),
    sub: p("기계공학 · 학부에서 박사후연구원까지", "Mechanical engineering, from bachelor to postdoc"),
  },

  /* 2. 지금 겪고 있는 것 */
  problem: {
    title: p("이런 자리에 서 있다면", "If you are standing here"),
    items: [
      p(
        "전공 수업은 들었고 캡스톤도 했는데, 그것이 어느 직무의 무엇과 이어지는지 " +
          "설명할 말이 없습니다.",
        "You took the courses and ran a capstone, and you have no words for how " +
          "that connects to a particular role.",
      ),
      p(
        "채용공고를 열면 요구사항은 읽히는데, 내가 어디쯤인지는 읽히지 않습니다.",
        "You can read the requirements in a posting and cannot read where you " +
          "yourself stand.",
      ),
      p(
        "설계와 해석 가운데 어느 쪽이 나에게 맞는지 물어보면, 돌아오는 답이 " +
          "대체로 둘 다 해보라는 말입니다.",
        "When you ask whether design or simulation suits you better, the answer " +
          "is usually to try both.",
      ),
      p(
        "무엇을 더 준비해야 하는지는 알겠는데, 무엇부터 해야 하는지는 모릅니다.",
        "You know you need to prepare more and not what to do first.",
      ),
    ],
  },

  /* 3. 무엇을 하는가 */
  what: {
    title: p("커리어메트리가 하는 일", "What CareerMatri does"),
    body: p(
      "답하신 것과 적어 주신 경험을 직무 열여섯 갈래가 실제로 확인하는 영역에 " +
        "대 봅니다. 나오는 것은 점수 하나가 아니고, 어느 쪽을 먼저 볼지와 그 " +
        "직무가 아직 못 본 것이 무엇인지입니다.",
      "What you answered and the experience you entered are laid against the areas " +
        "that sixteen role groups actually look at. What comes out is not one score. " +
        "It is which direction to look at first, and what those roles have not yet seen.",
    ),
    items: [
      p("전공 지식을 실제 업무로 옮깁니다", "It translates academic knowledge into real work"),
      p("직무가 바라는 증거를 얼마나 덮었는지 셉니다", "It counts how much of the evidence a role wants you have covered"),
      p("비어 있는 증거를 이름으로 적습니다", "It names the evidence gaps"),
      p("조직 유형에 따라 성과 기준이 어떻게 달라지는지 적습니다", "It says how the performance bar shifts by organization type"),
      p("다음에 만들 경험 과제를 냅니다", "It gives you the next evidence project"),
      p("30일 · 90일 · 365일로 끊어 적습니다", "It breaks the plan into 30, 90 and 365 days"),
    ],
  },

  /* 4. 무엇을 받는가 */
  gets: {
    title: p("받으시는 것", "What you get"),
    items: [
      p("웹 결과지. 로그인하시면 언제든 다시 열립니다", "A web report you can reopen any time you sign in"),
      p("같은 내용의 A4 PDF", "The same report as an A4 PDF"),
      p("결정 표. 다섯 갈래 읽기가 한 화면에 섭니다", "A decision table with the five readings on one screen"),
      p("증거 지도. 확인된 것과 아직인 것", "An evidence map of what is confirmed and what is not"),
      p("다음 한 걸음", "One next step"),
    ],
  },

  /* 6. 견본 */
  sample: {
    title: p("견본 결과지", "Sample report"),
    body: p(
      "사기 전에 결과지가 어떻게 생겼는지 보실 수 있습니다. 담긴 값은 지어낸 " +
        "것이고, 실제 응시자의 자료는 쓰지 않습니다.",
      "You can see what the report looks like before you buy. The values in it are " +
        "fictional. No real respondent's data is used.",
    ),
    cta: p("견본 열어 보기", "Open the sample"),
  },

  /* 7. 어떻게 돌아가는가 */
  how: {
    title: p("어떻게 진행되는가", "How it works"),
    steps: [
      p("등급을 고르고 결제합니다", "Choose a plan and pay"),
      p("학위 단계를 고르고 문항에 답합니다. 중간에 닫으셔도 답한 곳에서 이어집니다",
        "Pick your degree stage and answer the items. You can close it and come back"),
      p("수업과 프로젝트와 그때 쓴 도구를 적습니다. 비우셔도 결과지는 그대로 나갑니다",
        "Enter courses, projects and tools. The report goes out even if you leave this empty"),
      p("결과지를 받고 PDF 로 내려받습니다", "Receive the report and download the PDF"),
    ],
    note: p(
      "문항은 등급에 따라 48 · 68 · 92개이고, 걸리는 시간은 20분에서 40분 " +
        "사이입니다.",
      "The item count is 48, 68 or 92 depending on the plan, and it takes between " +
        "20 and 40 minutes.",
    ),
  },

  /* 8. 누구에게 맞는가 */
  who: {
    title: p("누구를 위한 것인가", "Who it is for"),
    yes: [
      p("기계공학 학부생 · 석사 · 박사 · 박사후연구원", "Mechanical engineering bachelor, master, PhD and postdoc"),
      p("직무 후보가 둘셋 있고 그 가운데 고르셔야 하는 분", "People choosing between two or three candidate roles"),
      p("경험은 있는데 그것을 설명할 말이 아직 없는 분", "People with experience and no words for it yet"),
    ],
    no: [
      p("기계공학 밖의 전공. 문항이 아직 없습니다", "Majors outside mechanical engineering. The items do not exist yet"),
      p("중·고등학생. 그쪽은 다른 제품입니다", "Secondary school students. That is a different product"),
      p("합격 가능성을 알고 싶은 분. 이 검사가 재는 값이 아닙니다", "Anyone looking for odds of being hired. This is not what the assessment measures"),
    ],
  },

  /* 9. 말하지 않는 것 */
  notclaim: {
    title: p("말하지 않는 것", "What we do not claim"),
    items: [
      p(
        "이 검사를 검증된 심리검사라고 하지 않습니다. 인지 면접과 파일럿을 " +
          "아직 돌리지 않았습니다.",
        "We do not call this a validated psychometric test. The cognitive " +
          "interviews and the pilot have not been run.",
      ),
      p(
        "합격 가능성이나 취업 확률을 내지 않습니다. 문항과 경험만으로 그 말을 " +
          "할 수 없습니다.",
        "We do not produce odds of being hired. Items and experience cannot " +
          "support that claim.",
      ),
      p(
        "상위 몇 퍼센트에 든다고 적지 않습니다. 견줄 규준이 아직 만들어지지 않았습니다.",
        "We do not say you are in the top few percent. There is no norm group yet.",
      ),
      p(
        "기업을 추천하거나 이력서를 보내 드리지 않습니다. 보유한 신고는 " +
          "직업정보제공사업 하나입니다.",
        "We do not recommend employers or send your resume anywhere. Our filing " +
          "covers career information only.",
      ),
      p(
        "나라별 임금 · 비자 · 면허 자료를 내지 않습니다. 확인된 자료가 " +
          "없는 자리는 비워 둡니다.",
        "We do not give country salary, visa or licence figures. Where we have no " +
          "confirmed data we leave the space empty.",
      ),
    ],
  },

  /* 10. 자주 묻는 것 */
  faq: [
    {
      q: p("경험을 안 적으면 결과지가 안 나오나요?", "Does the report need my experience?"),
      a: p(
        "나갑니다. 다만 증거 쪽이 비어서 할 수 있는 말이 줄고, 무엇이 빠졌는지가 " +
          "결과지 맨 위에 적힙니다. 나중에 적으시고 다시 만드실 수 있습니다.",
        "It goes out either way. The evidence sections stay empty, which narrows what " +
          "the report can say, and the top of the report names what is missing. You can " +
          "fill it in later and generate again.",
      ),
    },
    {
      q: p("중간에 닫아도 되나요?", "Can I close it partway?"),
      a: p(
        "됩니다. 답은 서버에 저장되고, 다시 들어오시면 안 찬 묶음으로 갑니다.",
        "Yes. Your answers are saved on the server and you come back to the section " +
          "you had not finished.",
      ),
    },
    {
      q: p("결과지를 다시 만들 수 있나요?", "Can I regenerate the report?"),
      a: p(
        "됩니다. 앞의 것이 바뀌지 않고 판본이 쌓이므로, 어제 보신 결과지도 " +
          "그대로 남습니다.",
        "Yes. Earlier versions are not overwritten, so the one you read yesterday " +
          "stays as it was.",
      ),
    },
    {
      q: p("같은 문항을 또 풀 수 있나요?", "Can I retake the assessment?"),
      a: p(
        "재응시 정책이 아직 정해지지 않았습니다. 정해지면 이 자리에 적습니다.",
        "The retake policy has not been decided yet. It will be written here once it is.",
      ),
    },
    {
      q: p("문항이 많은 등급이 더 좋은 것인가요?", "Is the plan with more items the better one?"),
      a: p(
        "문항 수는 등급을 가르는 기준이 아닙니다. 등급마다 결과지에 붙는 절이 " +
          "다르고, 그 차이는 위의 비교 표에 적혀 있습니다.",
        "Item count is not what separates the plans. Each plan adds different sections " +
          "to the report, and the comparison above lists them.",
      ),
    },
    {
      q: p("영어로도 받을 수 있나요?", "Is it available in English?"),
      a: p(
        "됩니다. 문항과 결과지와 내려받는 PDF 가 모두 영어로 나갑니다. 다만 " +
          "나라별 임금과 비자 자료는 들어 있지 않습니다.",
        "Yes. The items, the report and the PDF come in English. Country salary and " +
          "visa data are not included.",
      ),
    },
  ] as Faq[],

  /* 12. 환불과 문의 */
  support: {
    title: p("환불과 문의", "Refunds and support"),
    body: p(
      "응시를 시작하기 전이면 전액 돌려드립니다. 시작한 뒤와 결과지를 받으신 " +
        "뒤의 기준은 환불 정책에 적혀 있습니다.",
      "Before you start the assessment we refund in full. The rules after you start " +
        "and after you receive the report are in the refund policy.",
    ),
    refundLink: p("환불 정책", "Refund policy"),
    supportLink: p("문의하기", "Contact support"),
  },

  nav: {
    pricing: p("가격", "Pricing"),
    /* 등급 칸과 맨 아래 단추. **둘 다 '가격' 이라고 적어 두었더니**
       무엇을 누르는 것인지가 안 읽혔다 */
    choose: p("이 등급으로 시작하기", "Start with this plan"),
    seePricing: p("가격표 보기", "See the pricing"),
    signin: p("로그인", "Sign in"),
    sample: p("견본", "Sample"),
  },
} as const;

/**
 * 지원 화면 원고.
 *
 * **창업자가 DB 를 열어 보는 것으로 지원을 대신하지 않는다**(규격 §15).
 * 그래서 이 화면은 본인이 직접 보는 것부터 적는다: 주문 번호 · 결제 상태 ·
 * 막힌 것의 참조 번호. 사람이 받는 것은 그 아래의 메일 한 줄이다.
 */
export const SUPPORT = {
  title: p("문의와 지원", "Support"),
  body: p(
    "주문 번호와 참조 번호가 아래에 있습니다. 문의하실 때 그 번호를 함께 " +
      "적어 주시면 바로 찾을 수 있습니다.",
    "Your order numbers and reference numbers are below. Including them in your " +
      "message lets us find the case straight away.",
  ),
  orders: p("내 주문", "Your orders"),
  noOrders: p("아직 주문이 없습니다.", "You have no orders yet."),
  refs: p("막혀 있는 것", "Things that stalled"),
  noRefs: p(
    "막혀 있는 것이 없습니다.",
    "Nothing is stalled.",
  ),
  refsBody: p(
    "결과지나 PDF 를 만들다 막힌 일이 있으면 그 번호가 여기 섭니다. 다시 " +
      "만들어 보시고, 또 막히면 번호와 함께 알려 주십시오.",
    "If generating a report or a PDF stalled, its reference shows up here. Try " +
      "again, and if it stalls once more, send us the reference.",
  ),
  mail: p("지원 메일", "Support email"),
  mailOff: p(
    "지원 메일 주소가 아직 설정되지 않았습니다.",
    "The support address is not configured yet.",
  ),
  /* **빈 자리에 엉뚱한 설명을 넣지 않는다.** 주문 번호 이야기를 여기
     붙여 두었더니 주소가 없는 것과 상관없는 글이 떴다 */
  mailOffBody: p(
    "주소를 지어내지 않았습니다. 정해지면 이 자리에 적습니다.",
    "We have not invented an address. It will appear here once it is set.",
  ),
  verify: p("메일 주소 확인", "Email address"),
  verifyDone: p("확인됐습니다.", "Confirmed."),
  verifyPending: p(
    "아직 확인되지 않았습니다. 확인하지 않으셔도 검사와 결과지는 그대로 " +
      "이용하실 수 있습니다.",
    "Not confirmed yet. You can use the assessment and your report without " +
      "confirming.",
  ),
  verifySend: p("확인 메일 다시 보내기", "Resend the confirmation"),
  verifyOk: p("확인이 끝났습니다.", "Your address is confirmed."),
  verifyExpired: p(
    "링크가 만료됐습니다. 다시 보내시면 됩니다.",
    "That link has expired. You can send a new one.",
  ),
  verifyMailOff: p(
    "메일 발송이 아직 붙어 있지 않아 보내지 못했습니다.",
    "Mail delivery is not configured, so nothing was sent.",
  ),
  pw: p("비밀번호", "Password"),
  pwBody: p(
    "비밀번호를 잊으셨으면 재설정 링크를 받으실 수 있습니다.",
    "If you have forgotten your password you can request a reset link.",
  ),
  pwLink: p("비밀번호 재설정", "Reset your password"),
  payTrouble: p("결제가 안 될 때", "If a payment will not go through"),
  payTroubleBody: p(
    "결제창이 닫히거나 결제가 끝났는데 검사가 열리지 않으면, 같은 등급을 " +
      "다시 결제하지 마시고 아래 주문 번호와 함께 알려 주십시오. 두 번 " +
      "결제되면 저희가 돌려드려야 합니다.",
    "If the payment window closed, or the payment went through and the assessment " +
      "did not open, do not pay for the same plan again. Send us the order number " +
      "below instead. A double charge is something we then have to refund.",
  ),
  refund: p("환불 요청", "Request a refund"),
  refundBody: p(
    "응시를 시작하기 전이면 전액 돌려드립니다. 시작한 뒤와 결과지를 받으신 " +
      "뒤의 기준은 환불 정책에 적혀 있습니다.",
    "Before you start the assessment we refund in full. The rules after you start " +
      "and after you receive the report are in the refund policy.",
  ),
  refundAsk: p("요청하기", "Send the request"),
  refundReason: p("사유", "Reason"),
  refundOpen: p("요청이 접수되어 있습니다.", "Your request is on file."),
  refundWithdraw: p("요청 거두기", "Withdraw the request"),
  refundSent: p(
    "접수됐습니다. 처리되면 메일로 알려 드립니다.",
    "We have it. We will email you once it is handled.",
  ),
  refundDenied: p(
    "지금 규칙으로는 돌려드릴 수 없는 주문입니다. 아래에 까닭이 적혀 " +
      "있습니다. 사정이 있으시면 지원 메일로 알려 주십시오.",
    "Under the current rules this order cannot be refunded, and the reason is " +
      "below. If there is more to it, write to support.",
  ),
  refundWhyStarted: p(
    "이미 응시를 시작하셨습니다.",
    "You have already started the assessment.",
  ),
  refundWhyViewed: p(
    "넓어진 결과지를 이미 열어 보셨습니다.",
    "You have already opened the expanded report.",
  ),
  refundWhyWindow: p("기간이 지났습니다.", "The window has passed."),
  refundWhyNotPaid: p(
    "결제가 아직 확정되지 않았습니다.",
    "The payment has not been confirmed yet.",
  ),
  refundWhyAlready: p("이미 환불된 주문입니다.", "This order has already been refunded."),
} as const;
