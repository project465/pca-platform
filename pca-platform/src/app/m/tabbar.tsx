"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/sf/icon";
import { MAT_PUBLIC } from "@/lib/mat-switch";
import { M_TAB_TEXT as T } from "./m-text";

/**
 * 아래 띠 다섯 칸. **MAT 이 첫 칸이고 가장 눈에 띈다**(2026-11-03 메뉴 시안): MAT → 홈 → 할 일 →
 * 경험 → 내 정보. 이용권은 내 정보 안에 있다. 글자는 `m-text.ts` 에서 읽는다.
 *
 * 첫 화면과 사진으로 옮기기에는 띠를 세우지 않는다. 앞은 아직 로그인 전이고,
 * 뒤는 카메라를 쓰는 동안 띠를 잘못 눌러 나가면 찍은 것을 잃는다.
 */
const TABS: { href: string; label: string; icon: IconName; big?: boolean }[] = [
  /* MAT 을 가려 둔 동안 띠에서 뺀다(`lib/mat-switch.ts`) */
  ...(MAT_PUBLIC ? [{ href: "/m/mat", label: T.mat.ko, icon: "spark" as IconName, big: true }] : []),
  { href: "/m", label: T.home.ko, icon: "home" },
  { href: "/m/todo", label: T.todo.ko, icon: "check" },
  { href: "/m/experience", label: T.experience.ko, icon: "layers" },
  { href: "/m/profile", label: T.me.ko, icon: "user" },
];

const HIDE = ["/m/welcome", "/m/capture"];

export function TabBar() {
  const path = usePathname() ?? "/m";
  if (HIDE.some((h) => path.startsWith(h))) return null;
  const on = (href: string) =>
    href === "/m" ? path === "/m" || path === "/m/alerts" : path.startsWith(href);
  return (
    <nav className="ma-tabs" aria-label={T.menu.ko}>
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`ma-tab${on(t.href) ? " is-on" : ""}${t.big ? " is-big" : ""}`}
          aria-current={on(t.href) ? "page" : undefined}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
