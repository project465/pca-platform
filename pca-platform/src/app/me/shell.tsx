/**
 * CareerMatri 플랫폼의 껍데기.
 *
 * 넓은 화면은 왼쪽 띠, 손전화는 **아래 띠**다. 운영 화면의 `Shell` 을
 * 그대로 쓰지 않은 까닭은 저쪽이 아래 띠가 없고, 세 면(개인 · Campus ·
 * Admin)이 같이 쓰는 파일이라 여기를 고치면 저 셋이 같이 바뀐다.
 *
 * **권한 판단이 한 줄도 없다.** 메뉴를 숨기는 것은 안내이고 막는 것은
 * 각 쪽의 `requireUser()` 다. 여기 없는 주소도 손으로 치면 열린다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/sf/icon";
import { CM_NAV, CM_TABS, navOn } from "./nav";

export function CmShell({
  active, title, children,
}: { active: string; title?: string; children: ReactNode }) {
  return (
    <div className="cm">
      <div className="cm-topbar">
        <Link href="/me">CareerMatri</Link>
        {title ? <span>{title}</span> : null}
      </div>
      <div className="cm-wrap">
        <nav className="cm-rail" aria-label="CareerMatri 메뉴">
          <Link className="cm-rail-brand" href="/me">
            CareerMatri
            <small>전공에서 산업과 직무로</small>
          </Link>
          {CM_NAV.map((it) => (
            <Link key={it.href} href={it.href}
              className={`cm-nav${navOn(it.href, active) ? " is-on" : ""}`}
              aria-current={navOn(it.href, active) ? "page" : undefined}>
              <Icon name={it.icon} />
              <span>{it.label}</span>
              {it.soon ? <span className="cm-nav-dot" aria-label="자료 준비 중" /> : null}
            </Link>
          ))}
          <p className="cm-rail-foot">
            검사는 끝이 아니라 시작입니다. 경험이 늘면 근거와 Gap을 다시 계산합니다.
          </p>
        </nav>

        <main className="cm-main">
          <div className="cm-in">{children}</div>
        </main>
      </div>

      <nav className="cm-tabs" aria-label="아래 메뉴">
        {CM_TABS.map((it) => (
          <Link key={it.href} href={it.href}
            className={navOn(it.href, active) ? "is-on" : ""}
            aria-current={navOn(it.href, active) ? "page" : undefined}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
          </Link>
        ))}
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
