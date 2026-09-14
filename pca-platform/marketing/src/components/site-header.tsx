import { RegionPicker } from "@/components/sections";
import { loginUrl } from "@/lib/platform";
import type { SiteContent } from "@/content";

export default function SiteHeader({ site }: { site: SiteContent }) {
  return (
    <header className="site-header">
      <div className="wrap bar">
        {/* 머리에 서는 이름은 제품(METRI)이고, 만든 곳은 그 아래에 작게 둔다.
            ACADEMIX 의 A 글리프는 뺐다 — 다른 브랜드 자산이다.

            **어두운 판에는 그림 로고를 걸지 않는다.** 받은 워드마크는
            #3F56C9 라 어두운 바탕 위에서 글자로 읽히지 않는다. 어두운 판용
            판(v2)이 오기 전까지 카자흐판은 글자 로고를 그대로 쓴다 —
            2026-09-10 총괄 확인 */}
        <a className="brandmark" href="#top">
          <span>
            {site.theme ? (
              <b>{site.brand}</b>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img className="wordmark" src="/logo/metri-wordmark.png" alt={site.brand} />
            )}
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
