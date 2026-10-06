/**
 * 공개 홈(`/start`) 원고.
 *
 * **옛 판은 문패가 다섯이었다**: 개인 · 학교에서 받은 계정 · 학과 교수 ·
 * 인재개발원·대학일자리플러스 · 해외 대학 담당자. 그때는 파는 것이 학과
 * 계약 하나였고 개인은 그 계약의 곁다리였다. 지금은 반대다: 개인이 값을
 * 내고 바로 사는 쪽이고, 대학·기관은 `CareerMatri Campus` 라는 자기
 * 화면으로 갈라져 나갔다. **문패가 다섯이면 처음 온 사람이 자기 자리를
 * 고르는 데 다섯 번 재는데**, 실제로 갈리는 길은 둘이다.
 *
 * 함께 지운 것들: `253문항을 무료로`(옛 검사의 문항 수이고 지금 파는
 * 것은 세 등급이다) · `영어·튀르키예어`(내놓는 언어는 한국어와 영어
 * 둘이다) · `학과 교수`·`대학일자리플러스센터`·`해외 대학 담당자`(전부
 * Campus 한 문으로 들어온다).
 *
 * **등급을 문항 수로 팔지 않는다.** 48·68·92 를 문 앞에 적으면 비싼
 * 등급이 '문항이 더 많은 것' 으로 읽히고, 그러면 같은 값을 더 낼 이유가
 * 문 앞에 없다. 받는 것은 가격표가 적는다(`tiers.ts`).
 *
 * 원고를 `surface-text.ts` 나 `locale.ts` 에 섞지 않은 까닭은 저 둘이
 * **세 언어를 한 줄에 묶어 둔 사전**이라, 한 줄을 더하려면 승인되지 않은
 * 튀르키예어까지 지어내야 하기 때문이다(`product-copy.ts` 와 같다).
 */
type Pair = { ko: string; en: string };
const p = (ko: string, en: string): Pair => ({ ko, en });

export const START = {
  title: p(
    "CareerMatri 를 어떻게 쓰실 건가요?",
    "How will you be using CareerMatri?",
  ),
  sub: p(
    "개인은 계정 없이 바로 시작하실 수 있고, 대학·기관은 계약한 곳에 계정을 발급합니다.",
    "You can start on your own without an account. Universities and institutions receive accounts under contract.",
  ),
  individual: p("개인으로 시작하기", "Start as an individual"),
  individualNote: p(
    "세 등급 가운데 고르시면 바로 응시로 들어갑니다. 학교나 회사에 소속되지 않아도 됩니다.",
    "Pick one of the three plans and go straight into the assessment. You do not need to belong to a school or a company.",
  ),
  campus: p("대학 · 기관 (CareerMatri Campus)", "Universities and institutions (CareerMatri Campus)"),
  campusNote: p(
    "받으신 아이디로 들어오시면 좌석과 응시 현황, 단체 리포트가 열립니다.",
    "Sign in with the ID you were given to see seats, progress, and the cohort report.",
  ),
  hasAccount: p("이미 계정이 있으신가요?", "Already have an account?"),
  signIn: p("로그인", "Sign in"),
  about: p("상품 소개", "What this is"),
} as const;
