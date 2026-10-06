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

        {/* 좁아져도 접지 않는다. 줄이 모자라면 이 줄 안에서 옆으로 굴린다 —
            한 번 눌러야 보이는 메뉴는 안 보이는 메뉴가 되기 쉽다. */}
        <nav className="wide">
          {site.nav.items.map((i) => (
            <a key={i.href} href={i.href}>
              {i.label}
            </a>
          ))}
        </nav>

        <div className="right">
          <RegionPicker site={site} />
          {/* 이미 계정이 있는 사람은 설명을 읽을 일이 없다. 앱의 로그인으로
              곧장 보낸다 */}
          <a className="btn quiet" href={platformStart(site, "/login")}>
            {site.nav.signin}
          </a>
          {/* **가장 강한 단추는 가격표로 간다.** 문 고르는 쪽(`/start`)은
              개인과 기관을 가르는 보조 통로이고, 개인 고객이 사는 자리는
              가격표다. 한 걸음 줄이면 그만큼 덜 샌다 */}
          <a className="btn" href={platformStart(site, "/pricing")}>
            {site.nav.start}
          </a>
          <a className="btn solid" href="/contact">
            {site.nav.contact}
          </a>
        </div>
      </div>
    </header>
  );
}
