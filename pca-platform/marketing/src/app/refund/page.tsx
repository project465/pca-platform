import { getSite } from "@/content";
import Shell from "@/components/shell";
import { Policy, type Clause } from "@/components/policy";

export const metadata = { title: "환불 정책 · Refunds" };

/**
 * 청약철회·환불 (전자상거래법 제17조).
 *
 * 여기 적은 기준은 코드가 실제로 하는 일과 같아야 한다 — 응시를 시작하면
 * 좌석이 소진되므로, 그 선이 곧 환불선이다.
 */
export default function RefundPage() {
  const site = getSite();
  const p = site.chrome.policy;

  const ko: Clause[] = [
    {
      title: "언제 전액 환불되는가",
      body: [
        "결제 후 응시를 시작하기 전이라면 언제든 전액 환불됩니다. 문항을 한 개도 고르지 않은 상태를 말합니다.",
        "전자상거래법 제17조는 7일 안의 청약철회를 보장하지만, 이 서비스는 그보다 넓게 잡습니다 — 응시를 시작하지 않았다면 기간과 관계없이 돌려드립니다.",
      ],
    },
    {
      title: "언제 환불되지 않는가",
      body: [
        "응시를 시작하면(첫 문항에 답하면) 환불되지 않습니다. 검사 문항 자체가 제공된 것이기 때문입니다.",
        "같은 법 제17조 제2항은 ‘디지털 콘텐츠의 제공이 개시된 경우’ 청약철회를 제한할 수 있도록 하고 있고, 결제 화면에서 이 점을 미리 알려 드립니다.",
      ],
    },
    {
      title: "결과가 마음에 들지 않는 경우",
      body: [
        "결과지의 내용이 기대와 다르다는 이유로는 환불되지 않습니다. 검사는 정답을 맞히는 시험이 아니라 응답을 정리해 돌려드리는 것이기 때문입니다.",
        "다만 채점이 잘못되었다고 보시면 응시 번호와 함께 알려 주십시오. 산식은 공개돼 있고 같은 응답이면 언제나 같은 점수가 나오므로, 다시 계산해 확인해 드립니다.",
      ],
    },
    {
      title: "성실도 문제로 결과를 쓸 수 없는 경우",
      body: [
        "성실도 확인 문항을 모두 놓치면 결과지에 ‘무효’ 로 표시됩니다. 이 경우 1회에 한해 재응시를 드립니다.",
      ],
    },
    {
      title: "학과 단체 계약",
      body: [
        "학과가 계약한 좌석은 개별 환불 대상이 아니며, 계약서에 적힌 조건을 따릅니다.",
        "쓰지 않은 좌석의 처리와 계약 기간은 계약 시 별도로 정합니다.",
      ],
    },
    {
      title: "어떻게 요청하는가",
      body: [
        "주문번호와 함께 아래 사업자 정보의 이메일로 알려 주십시오. 영업일 기준 3일 안에 답을 드리고, 승인되면 결제하신 수단으로 돌려드립니다.",
        "카드 결제는 카드사 처리 일정에 따라 며칠이 더 걸릴 수 있습니다.",
      ],
    },
  ];

  const en: Clause[] = [
    {
      title: "Full refund",
      body: [
        "Any time before you start the assessment — that is, before you answer a single item — you get a full refund, with no time limit.",
      ],
    },
    {
      title: "No refund",
      body: [
        "Once you answer the first item the assessment has been delivered, and the purchase is final. The checkout screen says so before you pay.",
      ],
    },
    {
      title: "If you dislike the result",
      body: [
        "A result you did not expect is not grounds for a refund; the assessment reports your answers rather than grading them.",
        "If you believe the scoring is wrong, send us the attempt number. The formula is published and the same answers always produce the same score, so we can recompute and show you.",
      ],
    },
    {
      title: "Invalid attempts",
      body: ["If every attention check was missed, the report is marked invalid and you get one free retake."],
    },
    {
      title: "Department contracts",
      body: ["Seats bought under a department contract follow that contract, not this page."],
    },
    {
      title: "How to ask",
      body: [
        "Email us with your order number, using the address in the business information below. We reply within three business days and refund to the original payment method.",
      ],
    },
  ];

  return (
    <Shell>
      <Policy
        site={site}
        label={p.refundLabel}
        title={p.refundTitle}
        lead={p.refundLead}
        updated={p.updated}
        reviewNote={[p.reviewNote, p.clausesPending].filter(Boolean).join(" ")}
        clauses={site.key === "kr" ? ko : en}
      />
    </Shell>
  );
}
