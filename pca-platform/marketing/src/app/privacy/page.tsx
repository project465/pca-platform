import { notFound } from "next/navigation";
import { getSite } from "@/content";
import LegalDocPage from "@/components/legal-doc";

export function generateMetadata() {
  return { title: getSite().privacy?.heading ?? "" };
}

/**
 * 개인정보 처리방침.
 *
 * 나라마다 자기 사이트에 둔다(R022). 라이브 플랫폼에는 /privacy 가 없어
 * 그리로 걸면 404 가 된다 — 직접 확인했다.
 *
 * **사업자 정보는 2026-10-02 에 채워졌다.** haricareer.com 공개 꼬리를
 * 1차 출처로 읽어 그대로 옮겼다(상호·대표·사업자등록번호·통신판매업
 * 신고번호·주소·전화·이메일·개인정보보호책임자). 추정으로 채운 칸은
 * 없다. 화면에 초안 표시는 두지 않는다 — 틀린 값이 없어야 하는 자리라
 * 표시가 아니라 값이 신호다.
 *
 * 약관·환불 정책과 같은 틀을 쓴다 (components/legal-doc.tsx).
 */
export default function PrivacyPage() {
  const doc = getSite().privacy;
  if (!doc) notFound();
  return <LegalDocPage doc={doc} />;
}
