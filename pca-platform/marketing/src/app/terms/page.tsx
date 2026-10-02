import { notFound } from "next/navigation";
import { getSite } from "@/content";
import LegalDocPage from "@/components/legal-doc";

export function generateMetadata() {
  return { title: getSite().terms?.heading ?? "" };
}

/**
 * 이용약관.
 *
 * **PG(KCP) 심사가 이 주소를 본다.** 상품·가격·약관·환불·개인정보·
 * 사업자정보가 한 주소 안에 있어야 신청이 통과한다 (2026-10-02 지시).
 *
 * 한국판에만 원고가 있다. 영어·카자흐어 약관은 번역이 아니라 그 나라
 * 법률의 문제라 지어내지 않는다 — 원고가 없으면 404 다.
 */
export default function TermsPage() {
  const doc = getSite().terms;
  if (!doc) notFound();
  return <LegalDocPage doc={doc} />;
}
