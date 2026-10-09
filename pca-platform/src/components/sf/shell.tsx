/**
 * 세 제품 화면의 껍데기.
 *
 * 왼쪽 띠 하나 · 위쪽 띠 하나 · 가운데 본문. 세 화면이 이 한 벌을 같이
 * 쓰고 **메뉴 목록과 브랜드 꼬리말만 갈린다.**
 *
 * 메뉴를 숨기는 것은 안내이고 막는 것은 서버다. 여기서 안 그린 주소도
 * 손으로 치면 열리므로, 막는 일은 `requireRole()` 이 한다(설계 원칙 그대로).
 * 그래서 이 파일에는 권한 판단이 한 줄도 없다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import LogoutButton from "@/components/logout-button";
import { type Lang2, txer, type TxKey } from "@/lib/surface-text";
import BrandHome from "./brand-home";
import { Icon, type IconName } from "./icon";

export type NavItem = {
  href: string;
  /** 문구는 사전 키로만 받는다. **재사용 컴포넌트에 한국어를 박지 않는다** */
  label: TxKey;
  icon: IconName;
  /** 아직 자료가 없어 열지 않은 자리. 흐리게 그리고 점을 붙인다 */
  soon?: boolean;
  group?: TxKey;
};

export type Surface = "individual" | "campus" | "admin";

const SUB: Record<Surface, string | null> = {
  individual: null,
  campus: "Campus",
  admin: "Admin",
};

/** 면마다의 첫 화면. 로고를 누르면 가는 곳이고 **면을 넘지 않는다** */
const HOME: Record<Surface, string> = {
  individual: "/me",
  campus: "/org",
  admin: "/admin",
};

function initials(name: string): string {
  const t = name.trim();
  if (!t) return "·";
  /* 한글은 첫 글자 하나, 라틴은 두 단어의 머리글자 */
  if (/[가-힣]/.test(t)) return t.slice(0, 1);
  return t.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function Shell({
  surface, lang, nav, active, who, topTitle, topRight, children,
}: {
  surface: Surface;
  lang: Lang2;
  nav: NavItem[];
  /** 지금 쪽의 주소. 정확히 같거나 그 아래 경로면 켠다 */
  active: string;
  who: { name: string; role: string; href?: string };
  topTitle?: string;
  topRight?: ReactNode;
  children: ReactNode;
}) {
  const T = txer(lang);
  const sub = SUB[surface];
  /**
   * 어느 줄을 켤 것인가. **가장 길게 맞는 줄 하나만 켠다.**
   *
   * 앞자리만 보고 켜면 `/org/participants` 에서 `/org` 도 같이 켜진다.
   * 두 줄이 켜져 있으면 지금 어디인지가 읽히지 않는다.
   */
  const best = nav.reduce<string | null>((win, it) => {
    const hit = active === it.href || (it.href !== "/" && active.startsWith(it.href + "/"));
    if (!hit) return win;
    return win === null || it.href.length > win.length ? it.href : win;
  }, null);
  const on = (href: string) => href === best;

  let lastGroup: TxKey | undefined;
  return (
    <div className="sf">
      <aside className="sf-side">
        {/* 로고와 브랜드 글자가 **한 덩어리로** 이 면의 첫 화면으로 간다.
            면을 섞지 않는다: 개인은 `/my`, Campus 는 `/org`, Admin 은
            `/admin` 이고 그 표가 `HOME` 한 곳에 있다 */}
        <BrandHome href={HOME[surface]} sub={sub} />

        <nav className="sf-nav">
          {nav.map((it) => {
            const head = it.group && it.group !== lastGroup ? it.group : null;
            lastGroup = it.group ?? lastGroup;
            return (
              <span key={it.href} style={{ display: "contents" }}>
                {head ? <span className="sf-nav-group">{T(head)}</span> : null}
                <Link
                  href={it.href}
                  aria-current={on(it.href) ? "page" : undefined}
                  className={it.soon ? "is-soon" : undefined}
                >
                  <Icon name={it.icon} className="sf-ic" />
                  {T(it.label)}
                </Link>
              </span>
            );
          })}
        </nav>

        <div className="sf-side-foot">
          <div className="sf-who">
            <span className="sf-who-av" aria-hidden="true">{initials(who.name)}</span>
            <span className="sf-who-t">
              <span className="sf-who-n">{who.name}</span>
              <span className="sf-who-r">{who.role}</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="sf-main">
        <header className="sf-top">
          {topTitle ? <span className="sf-top-t">{topTitle}</span> : null}
          <div className="sf-top-r">
            {topRight}
            {who.href ? (
              <Link href={who.href} className="sf-btn ghost sm">{T("account")}</Link>
            ) : null}
            <LogoutButton className="sf-btn ghost sm" label={T("signOut")} />
          </div>
        </header>
        <main className="sf-wrap">{children}</main>
      </div>
    </div>
  );
}

/* ── 쪽 머리 ───────────────────────────────────────────────────────── */
export function PageHead({
  eyebrow, title, sub, actions,
}: { eyebrow?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="sf-head">
      <div className="sf-head-t">
        {eyebrow ? <div className="sf-eyebrow">{eyebrow}</div> : null}
        <h1 className="sf-h1">{title}</h1>
        {sub ? <p className="sf-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="sf-head-a">{actions}</div> : null}
    </div>
  );
}

export function Section({
  title, note, actions, children,
}: { title?: string; note?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="sf-section">
      {title || note || actions ? (
        <div className="sf-section-h">
          {title ? <h2 className="sf-h2">{title}</h2> : null}
          {actions}
          {note ? <span className="sf-meta">{note}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
