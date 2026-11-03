import { headers } from "next/headers";
import { getSite } from "@/content";
import { Shell } from "@/components/chrome";
import { Button } from "@/components/blocks";
import { DEFAULT_LANG, isLang } from "@/lib/i18n";

/**
 * 없는 주소. Next 의 기본 404 는 흰 바탕에 영문 한 줄이라 고장 난 사이트로
 * 보인다. 옛 주소(`/adopt` · `/terms` …)는 `next.config.ts` 가 먼저 새
 * 자리로 넘기므로 여기까지 오는 것은 정말 없는 주소뿐이다.
 *
 * **404 는 주소의 언어를 받지 못한다**(Next 가 not-found 에 params 를 넘기지
 * 않는다). 그래서 미들웨어가 요청 머리에 적어 둔 언어(`x-site-lang`)를
 * 읽는다. 정적 내보내기에는 미들웨어가 없어 기본 언어로 그린다.
 */
export default async function NotFound() {
  let lang: string = DEFAULT_LANG;
  if (process.env.STATIC !== "1") {
    const v = (await headers()).get("x-site-lang") ?? undefined;
    if (isLang(v)) lang = v;
  }
  const site = getSite(lang);
  const n = site.notFound;
  return (
    <Shell site={site} path="/">
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
