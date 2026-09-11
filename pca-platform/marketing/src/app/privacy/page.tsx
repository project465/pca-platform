import { getSite } from "@/content";
import Shell from "@/components/shell";
import { Policy, type Clause } from "@/components/policy";

export const metadata = { title: "개인정보처리방침 · Privacy" };

/**
 * 개인정보처리방침 (개인정보보호법 제30조).
 *
 * 여기 적힌 보유기간과 파기 절차는 실제 코드와 같아야 한다 —
 * `src/lib/erasure.ts` 가 지우는 표 목록과 남기는 이유가 이 문서의 근거다.
 * 코드를 고치면 이 문서도 같이 고쳐야 한다.
 */
export default function PrivacyPage() {
  const site = getSite();
  const kr = site.key === "kr";

  const clausesKo: Clause[] = [
    {
      title: "무엇을 받는가",
      body: ["서비스를 쓰는 데 필요한 것만 받습니다. 주민등록번호는 받지 않습니다."],
      list: [
        "개인 회원 — 이름, 이메일, 비밀번호(복원 불가능한 해시로만 저장)",
        "학교를 통한 응시자 — 이름, 학교가 부여한 학번 또는 이메일",
        "검사 응답 — 문항별 선택과 소요 시간",
        "역량 증거 — 본인이 입력한 과목·자격증·프로젝트",
        "결제 — 주문번호와 승인 금액. 카드번호는 저희 서버에 저장하지 않습니다(결제대행사가 처리)",
      ],
    },
    {
      title: "무엇에 쓰는가",
      body: [
        "검사를 채점해 결과지를 만들고, 학과에는 5명 미만 칸을 가린 익명 집계만 제공합니다.",
        "학과 담당자는 개별 학생의 결과지를 지목해 열 수 없습니다. 결과 공개를 승인할 수 있을 뿐입니다.",
      ],
    },
    {
      title: "얼마나 가지고 있는가",
      body: ["법이 정한 보존 의무가 있는 것과 없는 것을 나눠 둡니다."],
      list: [
        "대금결제·재화공급 기록 — 5년 (전자상거래법 제6조·시행령 제6조)",
        "계약 또는 청약철회 기록 — 5년 (같은 법)",
        "소비자 불만·분쟁처리 기록 — 3년 (같은 법)",
        "접속 기록 — 3개월 (통신비밀보호법)",
        "그 밖의 회원 정보 — 탈퇴하거나 보유기간이 끝나면 지체 없이 파기",
      ],
    },
    {
      title: "어떻게 파기하는가",
      body: [
        "두 법이 반대 방향으로 당깁니다. 개인정보보호법은 지체 없이 파기하라고 하고, 전자상거래법은 결제 기록을 5년 보존하라고 합니다.",
        "그래서 계정을 통째로 지우지 않고 사람을 알아볼 수 있는 값만 지웁니다. 이름·이메일·아이디·비밀번호를 없애면 남은 기록에서 누구인지 알 수 없고, 보존 의무와도 부딪히지 않습니다.",
      ],
      list: [
        "지우는 것 — 이름·이메일·아이디·비밀번호, 역량 증거, 학교·학년·희망 지역, 소속, 지원 이력, 비밀번호 재설정 링크",
        "남는 것 — 주문과 결제 기록(법정 보존), 좌석(계약 자산), 검사 응답과 점수(사람과 이어지지 않는 통계)",
        "파기했다는 사실은 기록으로 남기되, 그 기록에 이름이나 이메일을 담지 않습니다",
        "탈퇴는 로그인 후 ‘계정’ 화면에서 직접 할 수 있고, 즉시 처리됩니다",
      ],
    },
    {
      title: "누구에게 넘기는가",
      body: ["팝니다·빌려줍니다 같은 일은 하지 않습니다. 아래 목적 외에는 제3자에게 제공하지 않습니다."],
      list: [
        "결제 처리 — 결제대행사(PG). 카드 정보는 PG가 직접 받고 저희는 승인 결과만 받습니다",
        "학교 계약으로 응시한 경우 — 해당 학과에 본인의 결과지와 익명 집계",
        "법령에 따른 요구가 있는 경우",
      ],
    },
    {
      title: "본인이 할 수 있는 것",
      body: [
        "언제든 열람·정정·삭제·처리정지를 요구할 수 있습니다. 로그인 후 직접 하실 수 있고, 아래 연락처로 요청하셔도 됩니다.",
        "만 14세 미만은 가입할 수 없습니다.",
      ],
    },
    {
      title: "안전하게 지키기 위해 하는 것",
      body: [
        "비밀번호는 복원할 수 없는 형태(bcrypt)로만 저장합니다. 담당자가 발급한 임시 비밀번호도 저장하지 않고 발급 순간에만 보여 줍니다.",
        "학과 담당자 화면의 집계는 5명 미만 칸을 가립니다. 익명 집계가 개인 식별이 되는 것을 막기 위한 것입니다.",
      ],
    },
    {
      title: "연락처",
      body: [
        "개인정보 보호책임자와 연락처는 이 페이지 아래 사업자 정보에 적혀 있습니다.",
        "개인정보 침해로 도움이 필요하시면 개인정보침해신고센터(privacy.kisa.or.kr, 국번없이 118)에 문의하실 수 있습니다.",
      ],
    },
  ];

  const clausesEn: Clause[] = [
    {
      title: "What we collect",
      body: ["Only what the service needs."],
      list: [
        "Individual members — name, email, password (stored only as an irreversible hash)",
        "Students enrolled by a school — name and the ID their school issued",
        "Assessment responses — the option chosen per item and how long it took",
        "Competency evidence — the courses, certificates and projects you enter",
        "Payments — order number and approved amount. Card numbers never reach our servers",
      ],
    },
    {
      title: "What we do with it",
      body: [
        "We score the assessment and produce your report. Departments receive only aggregates, with any cell under five people hidden.",
        "A coordinator cannot open an individual student's report at will; they can only release results for a round.",
      ],
    },
    {
      title: "How long we keep it",
      body: ["Korean law sets the retention periods for transaction records."],
      list: [
        "Payment and delivery records — 5 years",
        "Contract and withdrawal records — 5 years",
        "Complaint and dispute records — 3 years",
        "Access logs — 3 months",
        "Everything else — erased without delay when you close your account",
      ],
    },
    {
      title: "How we erase",
      body: [
        "Two duties pull in opposite directions: erase without delay, and keep payment records for five years.",
        "So we do not delete the account row. We remove the values that identify you — name, email, ID, password. What remains cannot be traced to a person, which satisfies both.",
      ],
      list: [
        "Erased — name, email, ID, password, competency evidence, school and region, membership, application history, password reset links",
        "Kept — orders and payments (legal retention), seats (a contract asset), responses and scores (statistics no longer tied to a person)",
        "We log that an erasure happened, without putting any personal data in that log",
        "You can close your account yourself from the Account screen; it takes effect immediately",
      ],
    },
    {
      title: "Who else sees it",
      body: ["We do not sell or rent personal data."],
      list: [
        "Payment processor — handles card details directly; we receive only the approval result",
        "If you were enrolled by a school — your report and the anonymous aggregate go to that department",
        "Where the law requires it",
      ],
    },
    {
      title: "Your rights",
      body: [
        "You may read, correct, delete or restrict processing at any time — directly in the product, or by contacting us.",
        "Under-14s may not register.",
      ],
    },
    {
      title: "How we protect it",
      body: [
        "Passwords are stored only as bcrypt hashes. Temporary passwords issued by a coordinator are never stored; they are shown once at issue.",
        "Cohort screens hide any cell with fewer than five people, so an anonymous aggregate cannot become an identification.",
      ],
    },
    {
      title: "Contact",
      body: ["The privacy officer and contact details are in the business information at the foot of this page."],
    },
  ];

  return (
    <Shell>
      <Policy
        site={site}
        label={kr ? "개인정보처리방침" : "PRIVACY POLICY"}
        title={kr ? "개인정보를 이렇게 다룹니다" : "How we handle personal data"}
        lead={
          kr
            ? "무엇을 받고, 얼마나 갖고 있고, 어떻게 없애는지 적었습니다. 여기 적힌 보유기간과 파기 절차는 실제로 코드가 하는 일과 같습니다."
            : "What we collect, how long we keep it, and how we erase it. The retention periods and the erasure procedure here are what the code actually does."
        }
        updated={kr ? "2026-09-11 개정" : "Updated 2026-09-11"}
        reviewNote={
          kr
            ? "이 방침은 법률 자문이 아닙니다. 게시 전에 개인정보 보호책임자를 지정하고, 아래 사업자 정보를 채우고, 변호사 또는 개인정보 전문가의 검토를 받으십시오."
            : "This policy is not legal advice. Before publishing, appoint a privacy officer, fill in the business information below, and have it reviewed by counsel."
        }
        clauses={kr ? clausesKo : clausesEn}
      />
    </Shell>
  );
}
