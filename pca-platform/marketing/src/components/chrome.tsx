import type { Lang, SiteContent } from "@/content/model";
import { HTML_LANG, LANGS, LANG_NAME, localePath } from "@/lib/i18n";
import { BrandMark, Icon } from "./icons";
import MobileMenu from "./mobile-menu";
import { liveMailOrderNo } from "@/lib/business";
import NoticeBand from "./notice-band";

/** 같은 쪽의 다른 언어 주소. 고르면 첫 화면이 아니라 보던 쪽으로 간다 */
function langLinks(path: string) {
  return LANGS.map((l) => ({ lang: l, label: LANG_NAME[l], href: localePath(l, path), htmlLang: HTML_LANG[l] }));
}

/**
 * 언어 고르기. **스크립트 없이 연다**(`details`): 머리띠는 쪽마다 서는데 이
 * 단추 하나 때문에 쪽마다 클라이언트 코드를 싣지 않는다. 언어 이름은 그 말로
 * 적는다: 고르는 사람이 읽을 줄을 찾는 자리라 지금 화면의 말로 적으면 못 찾는다.
 */
function LangSwitch({ site, path }: { site: SiteContent; path: string }) {
  if (LANGS.length < 2) return null;
  const cur = site.lang as Lang;
  return (
    <details className="lang">
      <summary aria-label={`${site.ui.langLabel}: ${LANG_NAME[cur]}`}>
        <Icon name="globe" size={17} />
        <span>{LANG_NAME[cur]}</span>
      </summary>
      <ul>
        {langLinks(path).map((l) => (
          <li key={l.lang}>
            <a href={l.href} hrefLang={l.htmlLang} lang={l.htmlLang} aria-current={l.lang === cur ? "true" : undefined}>
              {l.label}
              {l.lang === cur && <Icon name="check" size={15} stroke={2.2} />}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

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
export function SiteHeader({ site, path }: { site: SiteContent; path: string }) {
  const { nav } = site;
  const home = localePath(site.lang as Lang, "/");
  return (
    <header className="site-header">
      <div className="wrap header-bar">
        <a className="brand" href={home}>
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
          <LangSwitch site={site} path={path} />
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
          langLabel={site.ui.langLabel}
          langs={LANGS.length > 1 ? langLinks(path).map((l) => ({ ...l, current: l.lang === site.lang })) : []}
        />
      </div>
    </header>
  );
}

export async function SiteFooter({ site }: { site: SiteContent }) {
  const L = site.legal;
  /* 신고번호는 앱의 운영 화면이 정본이다(`src/lib/business.ts`) */
  const mailOrderNo = L.mailOrderNo || (await liveMailOrderNo());
  const unset = (v: string) => v || L.labels.unset;
  const rows: [string, string, boolean][] = [
    [L.labels.company, L.company, false],
    [L.labels.ceo, L.ceo, false],
    [L.labels.address, L.address, false],
    [L.labels.tel, L.tel, false],
    [L.labels.email, L.email, false],
    [L.labels.bizNo, L.bizNo, false],
    [L.labels.mailOrderNo, unset(mailOrderNo), !mailOrderNo],
    [L.labels.jobInfoNo, L.jobInfoNo, false],
    [L.labels.privacyOfficer, L.privacyOfficer, false],
  ];
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <a className="brand brand-invert" href={localePath(site.lang as Lang, "/")}>
              <BrandMark size={30} />
              <span className="brand-name">{site.brand}</span>
            </a>
            <p>{site.footer.tagline}</p>
            {site.ui.appLangNote && <p className="footer-applang">{site.ui.appLangNote}</p>}
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
export function Shell({ site, path, children }: { site: SiteContent; path: string; children: React.ReactNode }) {
  return (
    <>
      <a className="skip" href="#main">
        {site.ui.skip}
      </a>
      {/* 방침 개정 공지는 한국어판에만 선다. 해외판의 방침은 아직 이 개정과 무관하다 */}
      {site.key === "kr" && site.lang === "ko" ? <NoticeBand href="https://app.careermatri.com/legal/privacy" /> : null}
      <SiteHeader site={site} path={path} />
      <main id="main">{children}</main>
      <SiteFooter site={site} />
    </>
  );
}
