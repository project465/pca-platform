import { getSite } from "@/content";
import { Shell } from "@/components/chrome";
import { Button } from "@/components/blocks";

/**
 * 없는 주소. Next 의 기본 404 는 흰 바탕에 영문 한 줄이라 고장 난 사이트로
 * 보인다. 옛 주소(`/adopt` · `/terms` …)는 `next.config.ts` 가 먼저 새
 * 자리로 넘기므로 여기까지 오는 것은 정말 없는 주소뿐이다.
 */
export default function NotFound() {
  const site = getSite();
  const n = site.notFound;
  return (
    <Shell site={site}>
      <section className="page-head page-404">
        <div className="wrap">
          <span className="pill">404</span>
          <h1>{n.title}</h1>
          <p className="hero-lead">{n.body}</p>
          <div className="hero-acts">
            <Button link={n.home} kind="ghost" size="lg" />
            <Button link={n.start} size="lg" arrow />
          </div>
        </div>
      </section>
    </Shell>
  );
}
