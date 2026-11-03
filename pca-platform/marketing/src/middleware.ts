import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang } from "@/lib/i18n";
import { HOME_APEX, HOME_DOMAIN } from "@/lib/domains";

/**
 * 주소의 언어를 쪽에 넘긴다(`lib/i18n.ts`).
 *
 *   /universities      → 안에서 /ko/universities 로 그린다 (주소는 그대로)
 *   /en/universities   → 그대로
 *   /ko/universities   → /universities 로 넘긴다 (한 쪽에 주소가 둘이면
 *                        검색엔진이 한 벌을 베낀 것으로 본다)
 *
 * **언어를 짐작해 넘기지 않는다.** 브라우저 언어를 보고 `/` 를 `/en` 으로
 * 보내면 한국어로 공유한 주소가 받는 사람에게 다른 말로 열리고, 검색엔진도
 * 한국어 쪽을 못 본다. 고르는 것은 머리띠의 언어 단추다.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* www 를 뗀 주소로 들어오면 정규 주소(www.careermatri.com)로 넘긴다. 같은 쪽이 주소 둘에 서면 검색엔진이
     한 벌을 베낀 것으로 보고, 공유된 주소도 두 갈래로 흩어진다. 호스트는
     앞단(Railway)이 넘겨준 값을 본다: 서버 안의 주소는 0.0.0.0:PORT 다 */
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0];
  if (HOME_APEX !== HOME_DOMAIN && host === HOME_APEX) {
    return NextResponse.redirect(`https://${HOME_DOMAIN}${pathname}${req.nextUrl.search}`, 308);
  }

  const seg = pathname.split("/")[1];

  if (seg === DEFAULT_LANG) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LANG.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  const lang = isLang(seg) ? seg : DEFAULT_LANG;
  /* 404 쪽은 params 를 받지 못해서 이 머리로 언어를 안다 */
  const h = new Headers(req.headers);
  h.set("x-site-lang", lang);

  if (isLang(seg)) return NextResponse.next({ request: { headers: h } });
  const url = req.nextUrl.clone();
  url.pathname = `/${DEFAULT_LANG}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: h } });
}

export const config = {
  /* 파일과 Next 안쪽 길은 건드리지 않는다. 점이 든 주소는 파일로 본다 */
  matcher: ["/((?!_next/|fonts/|brand/|api/|.*\\.[A-Za-z0-9]+$).*)"],
};
