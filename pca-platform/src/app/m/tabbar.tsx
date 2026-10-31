"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/sf/icon";
import { MAT_PUBLIC } from "@/lib/mat-switch";

/**
 * 아래 띠 다섯 칸. **차례가 하루의 차례다**: 오늘 볼 것 → 할 일 → 쌓아 둔
 * 경험 → MAT → 내 정보.
 *
 * 첫 화면과 사진으로 옮기기에는 띠를 세우지 않는다. 앞은 아직 로그인 전이고,
 * 뒤는 카메라를 쓰는 동안 띠를 잘못 눌러 나가면 찍은 것을 잃는다.
 */
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/m", label: "홈", icon: "home" },
  { href: "/m/todo", label: "할 일", icon: "check" },
  { href: "/m/experience", label: "경험", icon: "layers" },
  /* MAT 을 가려 둔 동안 띠에서 뺀다(`lib/mat-switch.ts`) */
  ...(MAT_PUBLIC ? [{ href: "/m/mat", label: "MAT", icon: "spark" as IconName }] : []),
  { href: "/m/profile", label: "내 정보", icon: "user" },
];

const HIDE = ["/m/welcome", "/m/capture"];

export function TabBar() {
  const path = usePathname() ?? "/m";
  if (HIDE.some((h) => path.startsWith(h))) return null;
  const on = (href: string) =>
    href === "/m" ? path === "/m" || path === "/m/alerts" : path.startsWith(href);
  return (
    <nav className="ma-tabs" aria-label="앱 메뉴">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`ma-tab${on(t.href) ? " is-on" : ""}`}
          aria-current={on(t.href) ? "page" : undefined}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
