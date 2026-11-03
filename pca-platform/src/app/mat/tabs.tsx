"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 아래 띠 다섯 칸(예상 화면 공통: 홈 / 공고 / 지원서 / 상담 / 이용권). 아이콘 없이 글자만 둔다:
 * 다섯 낱말이 짧아 글자가 더 빨리 읽히고, 장식 아이콘이 화면을 앱 틀처럼 보이게 하지 않게.
 */
/* 글자는 레이아웃이 그 언어로 넘긴다(`mat-text.ts` SHELL_TEXT). 차례는 아래 주소와 같다 */
const TABS = ["/mat", "/mat/jobs", "/mat/draft", "/mat/consult", "/mat/pass", "/mat/settings"].map((href) => ({ href }));

export function MatTabs({ labels, aria }: { labels: string[]; aria: string }) {
  const path = usePathname() ?? "/mat";
  const on = (href: string) => (href === "/mat" ? path === "/mat" : path.startsWith(href));
  return (
    <nav className="mt-tabs" aria-label={aria}>
      {TABS.map((t, i) => (
        <Link key={t.href} href={t.href} className={on(t.href) ? "is-on" : undefined}
          aria-current={on(t.href) ? "page" : undefined}>
          {labels[i]}
        </Link>
      ))}
    </nav>
  );
}
