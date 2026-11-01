"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 아래 띠 다섯 칸(예상 화면 공통: 홈 / 공고 / 지원서 / 상담 / 이용권). 아이콘 없이 글자만 둔다:
 * 다섯 낱말이 짧아 글자가 더 빨리 읽히고, 장식 아이콘이 화면을 앱 틀처럼 보이게 하지 않게.
 */
const TABS = [
  { href: "/mat", label: "홈" },
  { href: "/mat/jobs", label: "공고" },
  { href: "/mat/draft", label: "지원서" },
  { href: "/mat/consult", label: "상담" },
  { href: "/mat/pass", label: "이용권" },
];

export function MatTabs() {
  const path = usePathname() ?? "/mat";
  const on = (href: string) => (href === "/mat" ? path === "/mat" : path.startsWith(href));
  return (
    <nav className="mt-tabs" aria-label="MAT 메뉴">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={on(t.href) ? "is-on" : undefined}
          aria-current={on(t.href) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
