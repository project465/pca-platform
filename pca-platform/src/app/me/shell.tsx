/**
 * CareerMatri Workspace 의 껍데기. **사용자 화면의 껍데기는 이 하나다.**
 *
 * **들어오면 하나의 앱 안이라는 느낌이 나야 한다.** 넓은 화면은 왼쪽에
 * 늘 보이는 띠, 손전화는 아래 띠와 서랍이다. 쪽을 옮겨도 띠가 그대로
 * 있어서 `지금 어디인지` 가 끊기지 않는다.
 *
 * 계정 쪽(`/my/*`)도 이 껍데기를 쓴다. 전에는 저쪽이 `components/sf/shell`
 * 의 껍데기를 써서, 로그인 방법을 보러 들어간 사람이 **머리띠와 왼쪽 띠와
 * 브랜드 글자가 전부 다른 화면**을 받았다. 한 제품 안에서 껍데기가 둘이면
 * 쪽을 이어서 누를 때만 그 어긋남이 보인다.
 *
 * `components/sf/shell` 은 Campus 와 Admin 이 계속 쓴다. 저쪽은 파는
 * 제품의 화면이 아니라 **일하는 화면**이고, 메뉴가 열다섯 줄이라 같은
 * 띠에 담기지 않는다.
 *
 * **권한 판단이 한 줄도 없다.** 메뉴를 숨기는 것은 안내이고 막는 것은
 * 각 쪽의 `requireUser()` 다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/sf/icon";
import { CM_GROUPS, CM_TABS, CM_NAV, navOn } from "./nav";

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
  active, title, form, read, hold, children,
}: {
  active: string; title?: string;
  /**
   * 적는 자리인가(규격 §17).
   *
   * 작업공간의 기본 폭은 1100 이고 그것은 **견주고 훑는 자리**의 폭이다.
   * 칸에 적는 자리는 840 으로 좁힌다: 1100 에서 폼을 그리면 이름표와
   * 입력칸이 한 화면 너비로 벌어져 눈이 왼쪽 끝과 오른쪽 끝을 오간다.
   */
  form?: boolean;
  /**
   * 읽고 한 가지를 누르는 자리인가(규격 §30).
   *
   * 1100 은 견주는 폭이다. 담긴 글이 몇 줄뿐인 쪽을 그 폭에 세우면 오른쪽
   * 절반이 비고, 그 빈 면이 덜 만들어진 화면으로 읽힌다.
   */
  read?: boolean;
  /**
   * 아직 켜지지 않은 자리인가(규격 §18).
   *
   * 담긴 글이 몇 줄뿐인데 넓은 화면을 꼭대기부터 쓰면 **아래 절반이
   * 통째로 비어** 자료를 못 받아 온 화면처럼 읽힌다. 빈 카드를 만들어
   * 채우지 않고, 있는 글을 읽는 폭으로 모아 가운데에 세운다.
   */
  hold?: boolean;
  children: ReactNode;
}) {
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
        </nav>

        <main className="cm-main">
          <div className={`cm-in${form ? " is-form" : ""}${read ? " is-read" : ""}${hold ? " is-hold" : ""}`}>
            {children}
          </div>
        </main>
      </div>

      {/*
        손전화 아래 띠. **셋을 세우고 넷째가 서랍이다**(규격 §13).
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
            <span>더보기</span>
          </summary>
          <div className="cm-sheet">
            <p className="cm-sheet-head">CareerMatri · {MAJOR}</p>
            {CM_GROUPS.map((g) => (
              <section className="cm-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <NavRow key={it.href} it={it} active={active} />)}
              </section>
            ))}
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
