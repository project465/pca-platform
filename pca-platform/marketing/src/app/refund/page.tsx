import { notFound } from "next/navigation";
import { getSite } from "@/content";
import LegalDocPage from "@/components/legal-doc";

export function generateMetadata() {
  return { title: getSite().refund?.heading ?? "" };
}

/**
 * 환불·취소 정책.
 *
 * 디지털 콘텐츠라 "응시 전 100% · 응시 후 제한" 이 기준이고, 그 사실을
 * **결제 전에** 알리고 동의를 받는다. 결제 화면(플랫폼)의 문구와 이 장이
 * 어긋나면 그것이 분쟁의 자리다 — 한쪽을 고치면 다른 쪽도 고친다.
 */
export default function RefundPage() {
  const doc = getSite().refund;
  if (!doc) notFound();
  return <LegalDocPage doc={doc} />;
}
