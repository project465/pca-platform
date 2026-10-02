import { RegionPicker } from "@/components/sections";
import { loginUrl } from "@/lib/platform";
import type { SiteContent } from "@/content";

export default function SiteHeader({ site }: { site: SiteContent }) {
  return (
    <header className="site-header">
      <div className="wrap bar">
        {/* 머리에 서는 이름은 제품(CareerMatri)이고, 만든 곳은 그 아래에
            작게 둔다. ACADEMIX 의 A 글리프는 뺐다 — 다른 브랜드 자산이다.

            **세 판 모두 글자 로고다** (R059 · 2026-10-02). 가지고 있는
            워드마크 그림은 METRI 라고 적혀 있어 이제 쓸 수 없다. 새 워드마크가
            오면 여기 글자 자리에 그림을 넣는다 — `public/logo/` 의 옛 파일은
            지우지 않고 두었다(이름이 METRI 인 자산이라는 기록이 남아야 한다).

            그때도 어두운 판(카자흐)은 그림을 걸지 않는다 — 받은 워드마크는
            #3F56C9 라 어두운 바탕 위에서 글자로 읽히지 않는다 (2026-09-10
            총괄 확인). */}
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
