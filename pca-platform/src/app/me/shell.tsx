/**
 * CareerMatri Workspace 의 껍데기.
 *
 * **들어오면 하나의 앱 안이라는 느낌이 나야 한다.** 넓은 화면은 왼쪽에
 * 늘 보이는 띠, 손전화는 아래 띠와 서랍이다. 쪽을 옮겨도 띠가 그대로
 * 있어서 `지금 어디인지` 가 끊기지 않는다.
 *
 * 운영 화면의 `Shell` 을 쓰지 않은 까닭은 저쪽이 세 면(개인 · Campus ·
 * Admin)이 같이 쓰는 파일이라 여기를 고치면 저 셋이 같이 바뀌기 때문이다.
 *
 * **권한 판단이 한 줄도 없다.** 메뉴를 숨기는 것은 안내이고 막는 것은
 * 각 쪽의 `requireUser()` 다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/sf/icon";
import { CM_ACCOUNT, CM_GROUPS, CM_TABS, CM_NAV, navOn } from "./nav";

/** 지금 어느 전공인가. 전공이 늘면 이 자리가 고르는 자리가 된다 (§57) */
const MAJOR = "기계공학";

function NavRow({ it, active }: { it: typeof CM_NAV[number]; active: string }) {
  const on = navOn(it.href, active);
  return (
    <Link href={it.href}
      className={`cm-nav${on ? " is-on" : ""}`}
      aria-current={on ? "page" : undefined}>
      <Icon name={it.icon} />
      <span>{it.label}{it.hint ? <small>{it.hint}</small> : null}</span>
    </Link>
  );
}

export function CmShell({
  active, title, children,
}: { active: string; title?: string; children: ReactNode }) {
  return (
    <div className="cm">
      {/* 손전화 위 띠. 넓은 화면에서는 왼쪽 띠가 그 일을 한다 */}
      <div className="cm-topbar">
        <Link href="/me">CareerMatri</Link>
        {title ? <span>{title}</span> : null}
      </div>

      <div className="cm-wrap">
        <nav className="cm-rail" aria-label="CareerMatri 메뉴">
          <Link className="cm-rail-brand" href="/me">
            CareerMatri
            <small>{MAJOR}</small>
          </Link>

          <div className="cm-rail-scroll">
            {CM_GROUPS.map((g) => (
              <section className="cm-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <NavRow key={it.href} it={it} active={active} />)}
              </section>
            ))}
          </div>

          {/* 계정은 Workspace 와 섞지 않는다. 띠의 맨 아래다 (§30) */}
          <div className="cm-rail-foot">
            <NavRow it={CM_ACCOUNT} active={active} />
          </div>
        </nav>

        <main className="cm-main">
          <div className="cm-in">{children}</div>
        </main>
      </div>

      {/*
        손전화 아래 띠. 넷을 세우고 다섯째가 서랍이다.
        **`details` 하나로 연다**: 자바스크립트가 꺼져 있어도 열리고,
        닫는 상태를 브라우저가 들고 있어 쪽을 옮기면 저절로 닫힌다.
      */}
      <nav className="cm-tabs" aria-label="아래 메뉴">
        {CM_TABS.map((it) => (
          <Link key={it.href} href={it.href}
            className={navOn(it.href, active) ? "is-on" : ""}
            aria-label={it.label}
            aria-current={navOn(it.href, active) ? "page" : undefined}>
            <Icon name={it.icon} />
            <span>{it.tabLabel ?? it.label}</span>
          </Link>
        ))}
        <details className="cm-more">
          <summary aria-label="메뉴 전체 보기">
            <Icon name="grid" />
            <span>메뉴</span>
          </summary>
          <div className="cm-sheet">
            <p className="cm-sheet-head">CareerMatri · {MAJOR}</p>
            {CM_GROUPS.map((g) => (
              <section className="cm-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <NavRow key={it.href} it={it} active={active} />)}
              </section>
            ))}
            <section className="cm-group">
              <h2>계정</h2>
              <NavRow it={CM_ACCOUNT} active={active} />
            </section>
          </div>
        </details>
      </nav>
    </div>
  );
}

/** 쪽 머리. 모든 쪽이 같은 모양으로 선다 */
export function CmHead({
  kicker, title, lead, actions,
}: { kicker?: string; title: string; lead?: string; actions?: ReactNode }) {
  return (
    <header className="cm-head">
      {kicker ? <p className="cm-kicker">{kicker}</p> : null}
      <h1 className="cm-h1">{title}</h1>
      {lead ? <p className="cm-lead">{lead}</p> : null}
      {actions ? <div className="cm-acts" style={{ marginTop: 14 }}>{actions}</div> : null}
    </header>
  );
}
