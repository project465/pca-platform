import Link from "next/link";

/**
 * 기관 담당자 화면의 길잡이.
 *
 * **자료가 없는 칸은 띄우지 않는다.** 빈 화면을 열어 두면 "여기는 아직 안
 * 만들었습니다" 를 사람이 읽게 되고, 그게 반복되면 메뉴를 안 믿는다.
 */
const TABS = [
  { href: "/org", label: "한눈에" },
  { href: "/org/participants", label: "참여자" },
  { href: "/org/cohorts", label: "기수" },
  { href: "/org/licenses", label: "좌석" },
  { href: "/org/insights", label: "집계" },
] as const;

export default function OrgNav({ current }: { current: string }) {
  return (
    <nav className="orgnav">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={t.href === current ? "on" : ""}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
