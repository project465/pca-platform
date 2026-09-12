import { getSite } from "@/content";
import Shell from "@/components/shell";
import { Policy, type Clause } from "@/components/policy";

export const metadata = { title: "이용약관 · Terms" };

export default function TermsPage() {
  const site = getSite();
  const p = site.chrome.policy;

  const ko: Clause[] = [
    {
      title: "무엇을 제공하는가",
      body: [
        "METRI 는 공학 전공자의 직무 적합도를 진단해 결과지를 제공하는 서비스입니다. 검사 문항은 ACADEMIX 가 개발한 PCA 진단 엔진을 씁니다.",
        "결과지는 참고 자료입니다. 합격이나 채용을 보장하지 않으며, 진로 결정의 근거 가운데 하나로 쓰시는 것을 전제로 합니다.",
      ],
    },
    {
      title: "하지 않는 일",
      body: [
        "저희는 직업정보제공사업자입니다(신고번호는 아래 사업자 정보 참조). 정보를 제공할 뿐 취업을 알선하지 않습니다.",
        "직업안정법 시행령 제28조에 따라 구직자의 이력서를 대신 보내지 않고, 취업추천서를 발급하지 않으며, 채용 성공 수수료를 받지 않습니다.",
        "그래서 결과지에도 ‘추천 기업’ 이라는 말을 쓰지 않고 ‘적합도가 높은 기업’ 으로 적습니다.",
      ],
    },
    {
      title: "계정",
      body: [
        "개인 회원은 직접 가입하고, 학교를 통한 응시자는 학과가 발급한 계정을 씁니다.",
        "계정을 다른 사람과 나눠 쓰지 마십시오. 한 사람의 응답으로 만든 결과지를 다른 사람에게 적용할 수 없습니다.",
        "만 14세 미만은 가입할 수 없습니다.",
      ],
    },
    {
      title: "응시권",
      body: [
        "결제하면 응시권 1개가 발급됩니다. 응시권 1개로 검사 1회를 볼 수 있습니다.",
        "응시를 시작하면 응시권이 소진됩니다. 환불 기준은 환불 정책 화면에 따로 적어 두었습니다.",
      ],
    },
    {
      title: "결과지와 저작권",
      body: [
        "검사 문항과 결과지 양식의 저작권은 ACADEMIX 에 있습니다(한국저작권위원회 C-2025-058658 외 2건).",
        "본인의 결과지는 자유롭게 쓰실 수 있습니다. 다만 문항을 복제·배포하거나 검사 내용을 공개하지 말아 주십시오. 공개되면 그 문항으로 만든 모든 결과가 신뢰를 잃습니다.",
      ],
    },
    {
      title: "학과를 통한 응시",
      body: [
        "학과가 연 회차로 응시하시면, 학과 담당자는 익명 집계와 본인의 진행 상황을 봅니다.",
        "결과지는 담당자가 공개를 승인한 뒤에 열립니다. 이는 학과가 전체를 먼저 확인하도록 한 절차입니다.",
        "5명 미만인 집계 칸은 담당자에게도 보이지 않습니다.",
      ],
    },
    {
      title: "책임의 한계",
      body: [
        "서비스 점검이나 통신 장애로 일시적으로 이용이 어려울 수 있습니다. 예정된 점검은 미리 알려 드립니다.",
        "결과지를 근거로 한 진학·취업 결정의 결과에 대해서는 책임지지 않습니다.",
      ],
    },
    {
      title: "약관이 바뀔 때",
      body: [
        "바뀌는 내용이 있으면 시행 7일 전에 알려 드리고, 이용자에게 불리한 변경이면 30일 전에 알려 드립니다.",
        "바뀐 약관에 동의하지 않으시면 탈퇴하실 수 있습니다.",
      ],
    },
  ];

  const en: Clause[] = [
    {
      title: "What this is",
      body: [
        "METRI assesses engineering students' fit to job clusters and produces a report, using the PCA instrument developed by ACADEMIX.",
        "The report is a reference. It does not guarantee admission or employment.",
      ],
    },
    {
      title: "What we do not do",
      body: [
        "We are a registered career-information provider, not a placement agency. We publish information; we do not broker employment.",
        "We do not send out your CV on your behalf, do not issue letters of recommendation for hiring, and take no placement fee.",
      ],
    },
    {
      title: "Accounts",
      body: [
        "Individuals register themselves; students enrolled by a school use the account their department issued.",
        "Do not share an account. Under-14s may not register.",
      ],
    },
    {
      title: "Assessment credits",
      body: [
        "Payment issues one credit, good for one sitting. Starting the assessment consumes it. See the refund policy.",
      ],
    },
    {
      title: "Copyright",
      body: [
        "The items and the report format belong to ACADEMIX. Your own report is yours to use; please do not copy or publish the items — once published, every result built on them loses its meaning.",
      ],
    },
    {
      title: "Through a school",
      body: [
        "Your coordinator sees anonymous aggregates and your progress; the report opens once they release the round. Cells with fewer than five people are hidden from them too.",
      ],
    },
    {
      title: "Limits",
      body: [
        "Service may be interrupted for maintenance; we announce planned work in advance. We are not responsible for decisions made on the basis of the report.",
      ],
    },
    {
      title: "Changes",
      body: ["We announce changes seven days ahead, or thirty days ahead if they disadvantage you."],
    },
  ];

  return (
    <Shell>
      <Policy
        site={site}
        label={p.termsLabel}
        title={p.termsTitle}
        lead={p.termsLead}
        updated={p.updated}
        reviewNote={[p.reviewNote, p.clausesPending].filter(Boolean).join(" ")}
        clauses={site.key === "kr" ? ko : en}
      />
    </Shell>
  );
}
