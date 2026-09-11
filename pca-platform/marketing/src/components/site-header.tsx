import { RegionPicker } from "@/components/sections";
import type { SiteContent } from "@/content";

export default function SiteHeader({ site }: { site: SiteContent }) {
  return (
    <header className="site-header">
      <div className="wrap bar">
        <a className="brandmark" href="#top">
          <span className="glyph" aria-hidden="true">
            M
          </span>
          <span>
            <b>{site.brand}</b>
            <span>by {site.org}</span>
          </span>
        </a>

        <nav className="wide">
          {site.nav.items.map((i) => (
            <a key={i.href} href={i.href}>
              {i.label}
            </a>
          ))}
        </nav>

        <div className="right">
          <RegionPicker site={site} />
          <a className="btn solid" href="/contact">
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
          </nav>
        </details>
      </div>
    </header>
  );
}
