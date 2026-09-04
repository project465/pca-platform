import type { SiteContent } from "@/content";

export default function SiteHeader({ site }: { site: SiteContent }) {
  return (
    <header className="site-header">
      <div className="wrap bar">
        <a className="brand" href="#top">
          {site.brand}
          <span>{site.domain}</span>
        </a>
        <nav>
          {site.nav.items.map((i) => (
            <a key={i.href} href={i.href}>
              {i.label}
            </a>
          ))}
        </nav>
        <div className="right">
          <a className="btn ghost" href={site.platformUrl}>
            {site.nav.login}
          </a>
          <a className="btn solid" href="#contact">
            {site.nav.contact}
          </a>
        </div>
      </div>
    </header>
  );
}
