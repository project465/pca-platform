import type { SiteContent } from "@/content/model";
import { BrandMark, Icon } from "./icons";
import MobileMenu from "./mobile-menu";

/**
 * 머리띠와 꼬리말. 모든 쪽이 같은 한 벌을 쓴다.
 *
 * **단추 셋의 무게가 다르다.** `검사 시작하기` 만 채운 파란 단추이고,
 * `로그인` 은 테두리만, `학교 담당자 로그인` 은 글줄이다. 같은 무게로 세
 * 개를 세우면 처음 온 사람이 어느 것을 누를지 한 번 더 고른다.
 *
 * **같은 탭에서 간다.** 앱으로 가는 단추에 `target="_blank"` 를 쓰지
 * 않는다: 새 탭이면 뒤로 가기가 끊긴다.
 */
export function SiteHeader({ site }: { site: SiteContent }) {
  const { nav } = site;
  return (
    <header className="site-header">
      <div className="wrap header-bar">
        <a className="brand" href="/">
          <BrandMark size={30} />
          <span className="brand-name">{site.brand}</span>
        </a>

        <nav className="header-nav" aria-label="Main">
          {nav.items.map((i) => (
            <a key={i.href + i.label} href={i.href}>
              {i.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <a className="header-staff" href={nav.staffLogin.href}>
            {nav.staffLogin.label}
          </a>
          <a className="btn btn-ghost btn-sm" href={nav.login.href}>
            {nav.login.label}
          </a>
          <a className="btn btn-primary btn-sm" href={nav.start.href}>
            {nav.start.label}
          </a>
        </div>

        {/* 좁은 화면에서도 주된 단추 하나는 메뉴를 열지 않고 닿게 둔다 */}
        <a className="btn btn-primary header-mstart" href={nav.start.href}>
          {nav.startShort}
        </a>

        <MobileMenu
          items={nav.items}
          staffLogin={nav.staffLogin}
          login={nav.login}
          start={nav.start}
          openLabel={site.ui.menu}
          closeLabel={site.ui.close}
        />
      </div>
    </header>
  );
}

export function SiteFooter({ site }: { site: SiteContent }) {
  const L = site.legal;
  const unset = (v: string) => v || L.labels.unset;
  const rows: [string, string, boolean][] = [
    [L.labels.company, L.company, false],
    [L.labels.ceo, L.ceo, false],
    [L.labels.address, L.address, false],
    [L.labels.tel, L.tel, false],
    [L.labels.email, L.email, false],
    [L.labels.bizNo, L.bizNo, false],
    [L.labels.mailOrderNo, unset(L.mailOrderNo), !L.mailOrderNo],
    [L.labels.jobInfoNo, L.jobInfoNo, false],
    [L.labels.privacyOfficer, L.privacyOfficer, false],
  ];
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <a className="brand brand-invert" href="/">
              <BrandMark size={30} />
              <span className="brand-name">{site.brand}</span>
            </a>
            <p>{site.footer.tagline}</p>
            <a className="footer-mail" href={`mailto:${L.email}`}>
              <Icon name="mail" size={16} />
              {L.email}
            </a>
          </div>
          {site.footer.columns.map((c) => (
            <div className="footer-col" key={c.title}>
              <h2>{c.title}</h2>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-legal">
          <h2>{L.labels.heading}</h2>
          <dl>
            {rows.map(([k, v, pending]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className={pending ? "is-pending" : undefined}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="footer-copy">{site.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}

/** 모든 쪽이 같은 머리·꼬리를 쓴다 */
export function Shell({ site, children }: { site: SiteContent; children: React.ReactNode }) {
  return (
    <>
      <a className="skip" href="#main">
        {site.ui.skip}
      </a>
      <SiteHeader site={site} />
      <main id="main">{children}</main>
      <SiteFooter site={site} />
    </>
  );
}
