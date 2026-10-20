/**
 * KUS 학생 화면의 껍데기.
 *
 * R3 에서 공통 작업공간 껍데기(`cm-*`)를 쓰지 않고 KUS 전용 마크업으로 바꿨다. 남색 띠와
 * 큰 활자가 공통 작업공간 쪽 결정이라 KUS 쪽에서 덮어쓰면 공통 파일을 건드리게 되고, 덮어쓰지
 * 않으면 학교 시연 화면이 생성기로 만든 대시보드처럼 읽혔다. 이 파일과 `kus.css` 만 바꾸므로
 * 공통 화면은 한 글자도 움직이지 않는다.
 *
 * 생김새는 국내 금융·포털 앱의 결을 따른다: 흰 띠 · 회색 바탕 위 흰 카드 · 한 열 · 짧은 해요체.
 *
 * **학교 로고를 그려 넣지 않는다.** 정식 asset 과 사용 권한이 없다. 학교 이름은 글자로만 선다.
 * **권한 판단이 한 줄도 없다.** 막는 것은 각 쪽의 `requireKusStudent()` 다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/sf/icon";
import { BrandMark } from "@/components/sf/brand-mark";
import { kusLogout } from "./actions";

type NavItem = { href: string; label: string; icon: IconName; tab?: string };

export const KUS_NAV: { title: string; items: NavItem[] }[] = [
  { title: "나의 진로", items: [
    { href: "/kus", label: "홈", icon: "home" },
    { href: "/kus/assessment", label: "검사", icon: "clipboard" },
    { href: "/kus/result", label: "분석 결과", icon: "chart", tab: "결과" },
  ] },
  { title: "기업탐방", items: [
    { href: "/kus/visits", label: "탐방 기록", icon: "building", tab: "탐방" },
    { href: "/kus/plan", label: "실행 계획", icon: "target" },
    { href: "/kus/report", label: "보고서", icon: "doc" },
  ] },
  { title: "내 기록", items: [
    { href: "/me/experience", label: "경험 기록", icon: "layers" },
    { href: "/me/state", label: "전체 현황", icon: "compass" },
  ] },
];

const TABS = ["/kus", "/kus/result", "/kus/visits"];

const on = (href: string, active: string) =>
  href === "/kus" ? active === "/kus" : active === href || active.startsWith(`${href}/`);

function Row({ it, active }: { it: NavItem; active: string }) {
  const cur = on(it.href, active);
  return (
    <Link href={it.href} className={`kus-nav${cur ? " is-on" : ""}`} aria-current={cur ? "page" : undefined}>
      <Icon name={it.icon} />
      <span>{it.label}</span>
    </Link>
  );
}

const SCHOOL = "고려대학교 세종캠퍼스";

export function KusShell({
  active, who, dept, test, children,
}: {
  active: string;
  /** 로그인한 본인 이름 */
  who: string;
  /** 단과대학 · 학과 */
  dept: string;
  /** 테스트 학생이면 띠가 선다 */
  test?: boolean;
  children: ReactNode;
}) {
  const items = KUS_NAV.flatMap((g) => g.items);
  const name = who.replace(/^\[[^\]]*\]\s*/, "").trim();
  return (
    <div className="kus-app">
      {test ? <div className="kus-testbar" role="note">테스트 데이터예요 · 실제 학생이 아니에요</div> : null}
      <header className="kus-top">
        <Link className="kus-brand" href="/kus"><BrandMark size={24} />CareerMatri</Link>
        <span className="kus-top-school">{SCHOOL}</span>
      </header>

      <div className="kus-frame">
        <nav className="kus-side" aria-label="KUS 메뉴">
          <Link className="kus-brand" href="/kus"><BrandMark size={26} />CareerMatri</Link>
          <p className="kus-side-school">{SCHOOL}<br /><span>{dept}</span></p>
          <div className="kus-side-scroll">
            {KUS_NAV.map((g) => (
              <section className="kus-nav-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <Row key={it.href} it={it} active={active} />)}
              </section>
            ))}
          </div>
          <div className="kus-side-foot">
            <span className="kus-av" aria-hidden>{name.slice(0, 1) || "나"}</span>
            <span className="kus-side-who"><b>{who}</b>
              <form action={kusLogout}><button type="submit" className="kus-linkbtn">로그아웃</button></form></span>
          </div>
        </nav>

        <main className="kus-main">{children}</main>
      </div>

      <nav className="kus-tabs" aria-label="아래 메뉴">
        {items.filter((it) => TABS.includes(it.href)).map((it) => (
          <Link key={it.href} href={it.href} className={on(it.href, active) ? "is-on" : ""}
            aria-current={on(it.href, active) ? "page" : undefined}>
            <Icon name={it.icon} />
            <span>{it.tab ?? it.label}</span>
          </Link>
        ))}
        <details className="kus-more">
          <summary aria-label="메뉴 전체 보기"><Icon name="grid" /><span>전체</span></summary>
          <div className="kus-sheet">
            <p className="kus-sheet-head">{SCHOOL} · {dept}</p>
            {KUS_NAV.map((g) => (
              <section className="kus-nav-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <Row key={it.href} it={it} active={active} />)}
              </section>
            ))}
            <form action={kusLogout}><button type="submit" className="kus-nav kus-navbtn"><Icon name="lock" /><span>로그아웃</span></button></form>
          </div>
        </details>
      </nav>
    </div>
  );
}

/** 쪽 머리. 작은 줄 · 큰 제목 · 한두 줄 설명 */
export function KusHead({ kicker, title, lead, actions, badge }: {
  kicker?: string; title: string; lead?: string; actions?: ReactNode; badge?: ReactNode;
}) {
  return (
    <header className="kus-head">
      {kicker ? <p className="kus-kicker">{kicker}</p> : null}
      {badge ? <p className="kus-head-badge">{badge}</p> : null}
      <h1 className="kus-h1">{title}</h1>
      {lead ? <p className="kus-lead">{lead}</p> : null}
      {actions ? <div className="kus-actions kus-head-acts">{actions}</div> : null}
    </header>
  );
}

/** 흰 카드 한 장. 제목은 있어도 되고 없어도 된다 */
export function KusCard({ title, more, sub, children, id, tone }: {
  title?: string; more?: { href: string; label: string }; sub?: string; children: ReactNode; id?: string;
  tone?: "plain" | "soft";
}) {
  return (
    <section className={`kus-card${tone === "soft" ? " is-soft" : ""}`} id={id}>
      {title ? (
        <div className="kus-card-h">
          <h2>{title}</h2>
          {more ? <Link className="kus-more-link" href={more.href}>{more.label}</Link> : null}
        </div>
      ) : null}
      {sub ? <p className="kus-card-sub">{sub}</p> : null}
      {children}
    </section>
  );
}

/** 시연 · 준비 중 · 저장됨 같은 짧은 알림 */
export function KusNote({ tone = "warn", children }: { tone?: "warn" | "info"; children: ReactNode }) {
  return <p className={`kus-note is-${tone}`} role="note">{children}</p>;
}
