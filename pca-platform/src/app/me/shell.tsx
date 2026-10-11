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

/**
 * 작업공간의 **띠**(규격 §1·§15).
 *
 * 쪽 안쪽 꼭대기에 붙어 있는 줄이다. 들고 있는 것은 셋이다: 지금 어느
 * 줄에 있는가 · 어느 전공인가 · 이 쪽에서 할 수 있는 한 가지.
 *
 * **이 띠가 작업공간과 문서를 가른다.** 전에는 쪽마다 큰 제목이 꼭대기에
 * 혼자 섰고, 담긴 글이 짧은 쪽은 **빈 바탕 위에 뜬 안내창**으로 읽혔다.
 * 띠가 있으면 짧은 쪽도 *같은 제품의 한 화면*으로 선다.
 *
 * **제목을 두 번 적지 않는다.** 띠가 드는 것은 왼쪽 띠에 적힌 그 줄의
 * 이름이고, 본문의 큰 제목은 그 쪽이 지금 무슨 상태인지를 말한다.
 */
function CmBar(
  { active, actions }: { active: string; actions?: ReactNode },
) {
  const here = CM_NAV.find((n) => navOn(n.href, active));
  return (
    <div className="cm-bar">
      <div className="cm-bar-in">
        <p className="cm-bar-where">
          {here ? <Icon name={here.icon} /> : null}
          <b>{here?.label ?? "CareerMatri"}</b>
          <span>{MAJOR}</span>
        </p>
        {actions ? <div className="cm-bar-acts">{actions}</div> : null}
      </div>
    </div>
  );
}

export function CmShell({
  active, title, form, read, hold, bar, children,
}: {
  active: string; title?: string;
  /** 띠 오른쪽에 서는 **한 가지**. 둘을 세우면 띠가 도구막대가 된다 */
  bar?: ReactNode;
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
      {/* 손전화 위 띠. 넓은 화면에서는 왼쪽 띠가 그 일을 한다.
          **이름을 쪽마다 따로 적지 않는다**: 아래 띠와 왼쪽 띠가 쓰는
          그 줄의 이름을 그대로 쓴다. 따로 적어 두면 `탐색` 과
          `산업·직무` 처럼 같은 자리가 화면마다 다른 이름으로 불린다 */}
      <div className="cm-topbar">
        <Link href="/me">CareerMatri</Link>
        <span>{CM_NAV.find((n) => navOn(n.href, active))?.label ?? title ?? ""}</span>
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
          <CmBar active={active} actions={bar} />
          <div className="cm-canvas">
            <div className={`cm-in${form ? " is-form" : ""}${read ? " is-read" : ""}${hold ? " is-hold" : ""}`}>
              {children}
            </div>
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
  kicker, title, lead, actions, narrowActions,
}: {
  kicker?: string; title: string; lead?: string; actions?: ReactNode;
  /** 띠가 같은 단추를 들고 있을 때. 손전화에서만 선다 */
  narrowActions?: boolean;
}) {
  return (
    <header className="cm-head">
      {kicker ? <p className="cm-kicker">{kicker}</p> : null}
      <h1 className="cm-h1">{title}</h1>
      {lead ? <p className="cm-lead">{lead}</p> : null}
      {actions ? (
        <div className={`cm-acts${narrowActions ? " is-narrow" : ""}`}
          style={{ marginTop: 14 }}>{actions}</div>
      ) : null}
    </header>
  );
}
