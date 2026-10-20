import type { Metadata } from "next";
import Link from "next/link";
import "./sejong.css";
import { sejongActor, type SejongKind } from "@/sejong/lib/session";
import { sejongContent } from "@/sejong/lib/content";

export const metadata: Metadata = {
  title: "세종 일자리 역량 진단 · 세종일자리경제진흥원 × CareerMatri (시연)",
  description: "세종 지역 구직자를 위한 직무·경험 중심 진단과 취업 실행 계획 (시연판)",
  robots: { index: false, follow: false },
};

function navFor(kinds: SejongKind[]): { href: string; label: string }[] {
  const out: { href: string; label: string }[] = [];
  if (kinds.includes("participant")) {
    out.push(
      { href: "/sejong/me", label: "내 대시보드" },
      { href: "/sejong/diagnosis", label: "진단" },
      { href: "/sejong/experience", label: "경험 기록" },
      { href: "/sejong/result", label: "결과" },
      { href: "/sejong/explore", label: "세종 기업 탐색" },
      { href: "/sejong/plan", label: "실행 계획" },
    );
  }
  if (kinds.includes("counselor")) out.push({ href: "/sejong/counselor", label: "상담사" });
  if (kinds.includes("admin")) {
    out.push(
      { href: "/sejong/admin", label: "관리자 대시보드" },
      { href: "/sejong/admin/participants", label: "참여자" },
      { href: "/sejong/admin/counselors", label: "상담사·동의" },
    );
  }
  return out;
}

export default async function SejongLayout({ children }: { children: React.ReactNode }) {
  const actor = await sejongActor().catch((e) => {
    /* DB 가 없으면 공개 쪽(홈)은 그대로 보여 주고 메뉴만 비운다 */
    console.error("sejong layout actor", (e as Error).message);
    return null;
  });
  const { instrument } = sejongContent();
  const nav = actor ? navFor(actor.kinds) : [{ href: "/sejong/explore", label: "세종 기업 탐색" }];
  return (
    <div className="sj">
      <div className="sj-demo-band">
        시연판입니다 · 진단 {instrument.instrument_version}(검증 전 DEMO) · 기업 자료는 원문 재확인 전 · 가상 참여자 포함
      </div>
      <header className="sj-head">
        <div className="sj-head-in">
          <Link href="/sejong" className="sj-brand">
            <b>세종 일자리 역량 진단</b>
            <small>세종일자리경제진흥원 × CareerMatri · 시연</small>
          </Link>
          <nav className="sj-nav" aria-label="세종 메뉴">
            {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
            {actor ? (
              <>
                <span className="sj-who">{actor.user.name}</span>
                <Link href="/sejong/logout">로그아웃</Link>
              </>
            ) : (
              <Link href="/sejong/login">로그인</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="sj-main">{children}</main>
      <footer className="sj-foot">
        <div className="sj-foot-in">
          <span>이 서비스는 직업정보 제공입니다. 취업 알선·추천이 아니며, 기업에 개인 정보를 보내지 않습니다.</span>
          <span>채용 여부는 확인하지 않습니다. 지원 전에 기업 누리집이나 고용24의 원 공고를 직접 확인하세요.</span>
          <span>진단 결과는 총점이나 순위를 만들지 않습니다. 선발·평가에 쓰지 않습니다.</span>
        </div>
      </footer>
    </div>
  );
}
