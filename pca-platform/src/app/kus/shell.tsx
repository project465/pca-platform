/**
 * KUS 학생 화면의 껍데기.
 *
 * **새 디자인 체계를 만들지 않는다.** 공통 작업공간(`/me`)의 껍데기와 같은
 * 마크업과 클래스(`cm-*`)를 쓰고 같은 토큰(`workspace.tokens.css`)을
 * 읽는다: 네이비 왼쪽 띠 · 밝은 본문 · 손전화 아래 띠와 서랍. 바뀌는 것은
 * 메뉴 한 벌이다. KUS 학생에게는 검사 · 결과 · 기업탐방 · 실행 계획 ·
 * 보고서가 한 줄에 서야 하고, 공통 작업공간의 메뉴(공고 · 지원 기록 등)는
 * 이 프로그램의 일이 아니다.
 *
 * **학교 로고를 그려 넣지 않는다.** 정식 asset 과 사용 권한이 없다. 띠의
 * 머리에는 CareerMatri 상표와 학교 이름 **글자**만 선다.
 *
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
    { href: "/kus/result", label: "나의 분석 결과", icon: "chart", tab: "결과" },
  ] },
  { title: "기업탐방 프로그램", items: [
    { href: "/kus/visits", label: "기업탐방 기록", icon: "building", tab: "탐방" },
    { href: "/kus/plan", label: "실행 계획", icon: "target" },
    { href: "/kus/report", label: "보고서 다운로드", icon: "doc" },
  ] },
  { title: "공통 작업공간", items: [
    { href: "/me/experience", label: "경험 기록", icon: "layers" },
    { href: "/me/state", label: "현재 상태(전체)", icon: "compass" },
  ] },
];

const TABS = ["/kus", "/kus/result", "/kus/visits"];

const on = (href: string, active: string) =>
  href === "/kus" ? active === "/kus" : active === href || active.startsWith(`${href}/`);

function Row({ it, active }: { it: NavItem; active: string }) {
  const cur = on(it.href, active);
  return (
    <Link href={it.href} className={`cm-nav${cur ? " is-on" : ""}`} aria-current={cur ? "page" : undefined}>
      <Icon name={it.icon} />
      <span>{it.label}</span>
    </Link>
  );
}

export function KusShell({
  active, who, dept, test, children,
}: {
  active: string;
  /** 로그인한 본인 이름 */
  who: string;
  /** 학과 이름. 띠 머리의 둘째 줄 */
  dept: string;
  /** 테스트 학생이면 띠가 선다 */
  test?: boolean;
  children: ReactNode;
}) {
  const items = KUS_NAV.flatMap((g) => g.items);
  return (
    <div className="cm kus">
      {test ? <div className="kus-testbar" role="note">테스트 데이터 · 실제 학생이 아닙니다</div> : null}
      <div className="cm-topbar">
        <Link className="cm-topbar-brand" href="/kus"><BrandMark size={28} />CareerMatri</Link>
        <span className="kus-topbar-school">고려대학교 세종캠퍼스</span>
      </div>

      <div className="cm-wrap">
        <nav className="cm-rail" aria-label="KUS 메뉴">
          <Link className="cm-rail-brand" href="/kus">
            <BrandMark size={39} className="cm-rail-mark" />
            <span className="cm-rail-name">
              <b>CareerMatri</b>
              <small>고려대학교 세종캠퍼스</small>
            </span>
          </Link>
          <div className="cm-rail-scroll">
            <p className="kus-rail-dept">{dept}</p>
            {KUS_NAV.map((g) => (
              <section className="cm-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <Row key={it.href} it={it} active={active} />)}
              </section>
            ))}
          </div>
          <div className="kus-rail-foot">
            <span className="cm-util-av" aria-hidden>{who.replace(/^\[[^\]]*\]\s*/, "").trim().slice(0, 1) || "나"}</span>
            <span><b>{who}</b><form action={kusLogout}><button type="submit" className="kus-linkbtn">로그아웃</button></form></span>
          </div>
        </nav>

        <main className="cm-main">
          <div className="cm-canvas">
            <div className="cm-in">{children}</div>
          </div>
        </main>
      </div>

      <nav className="cm-tabs" aria-label="아래 메뉴">
        {items.filter((it) => TABS.includes(it.href)).map((it) => (
          <Link key={it.href} href={it.href} className={on(it.href, active) ? "is-on" : ""}
            aria-current={on(it.href, active) ? "page" : undefined}>
            <Icon name={it.icon} />
            <span>{it.tab ?? it.label}</span>
          </Link>
        ))}
        <details className="cm-more">
          <summary aria-label="메뉴 전체 보기"><Icon name="grid" /><span>더보기</span></summary>
          <div className="cm-sheet">
            <p className="cm-sheet-head">CareerMatri · 고려대학교 세종캠퍼스</p>
            {KUS_NAV.map((g) => (
              <section className="cm-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <Row key={it.href} it={it} active={active} />)}
              </section>
            ))}
            <section className="cm-group"><form action={kusLogout}><button type="submit" className="cm-nav kus-navbtn"><Icon name="lock" /><span>로그아웃</span></button></form></section>
          </div>
        </details>
      </nav>
    </div>
  );
}

/** 쪽 머리. 공통 작업공간과 같은 꼴이다 */
export function KusHead({ kicker, title, lead, actions }: {
  kicker?: string; title: string; lead?: string; actions?: ReactNode;
}) {
  return (
    <header className="cm-head">
      {kicker ? <p className="cm-kicker">{kicker}</p> : null}
      <h1 className="cm-h1">{title}</h1>
      {lead ? <p className="cm-lead">{lead}</p> : null}
      {actions ? <div className="cm-acts" style={{ marginTop: 14 }}>{actions}</div> : null}
    </header>
  );
}

/** 시연 · 테스트 · 준비 중을 알리는 한 줄 */
export function KusNote({ tone = "warn", children }: { tone?: "warn" | "info"; children: ReactNode }) {
  return <p className={`kus-note is-${tone}`} role="note">{children}</p>;
}
