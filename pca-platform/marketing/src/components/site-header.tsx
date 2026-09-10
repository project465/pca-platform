import { RegionPicker } from "@/components/sections";
import { loginUrl } from "@/lib/platform";
import type { SiteContent } from "@/content";

export default function SiteHeader({ site }: { site: SiteContent }) {
  return (
    <header className="site-header">
      <div className="wrap bar">
        {/* 로고 시안이 오기 전까지는 글자 로고다.
            ACADEMIX 의 A 글리프는 뺐다 — 다른 브랜드 자산이다.
            머리에 서는 이름은 제품(METRI)이고, 만든 곳은 그 아래에 작게 둔다 */}
        <a className="brandmark" href="#top">
          <span>
            <b>{site.brand}</b>
            <span>{site.nav.byLine}</span>
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
          {/* 학생과 담당자가 들어가는 곳. 나라가 달라도 플랫폼은 한 군데다 */}
          <a className="btn" href={loginUrl(site)}>
            {site.nav.login}
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
            <a href={loginUrl(site)}>{site.nav.login}</a>
          </nav>
        </details>
      </div>
    </header>
  );
}
