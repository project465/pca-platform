import type { SiteContent } from "@/content";

export default function SiteHeader({ site }: { site: SiteContent }) {
  return (
    <header className="site-header">
      <div className="wrap bar">
        <a className="brand" href="#top">
          {site.brand}
          <span>{site.domain}</span>
        </a>

        <nav className="wide">
          {site.nav.items.map((i) => (
            <a key={i.href} href={i.href}>
              {i.label}
            </a>
          ))}
        </nav>

        <div className="right">
          <a className="btn ghost signin" href={site.platformUrl}>
            {site.nav.login}
          </a>
          <a className="btn solid" href="#contact">
            {site.nav.contact}
          </a>
        </div>

        {/* 좁은 화면용. <details> 라 자바스크립트 없이 열린다 */}
        <details className="mnav">
          <summary>{site.nav.menu}</summary>
          <nav>
            {site.nav.items.map((i) => (
              <a key={i.href} href={i.href}>
                {i.label}
              </a>
            ))}
            <a className="alt" href={site.platformUrl}>
              {site.nav.login}
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}
