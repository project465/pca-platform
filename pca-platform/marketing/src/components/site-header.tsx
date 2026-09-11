import { RegionPicker } from "@/components/sections";
import { platformStart } from "@/lib/platform";
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
          {/* 소개만 읽고 나갈 수는 없어야 한다. 플랫폼으로 가는 문을 헤더에 둔다 */}
          <a className="btn" href={platformStart(site)}>
            {site.nav.start}
          </a>
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
            <a href={platformStart(site)}>{site.nav.start}</a>
            <a href="/contact">{site.nav.contact}</a>
          </nav>
        </details>
      </div>
    </header>
  );
}
