import { NextResponse, type NextRequest } from "next/server";
import { isLang, LANG_COOKIE } from "@/lib/locale";
import { isMarket, MARKET_COOKIE } from "@/lib/market-def";

/**
 * 로그인 전 방문을 세는 열쇠.
 *
 * **방문을 세지 않으면 전환율의 분모가 없다.** 가격표를 본 사람과 산
 * 사람만 알면 "몇 명이 와서 몇 명이 샀는가" 에 답할 수 없다.
 *
 * 서버 컴포넌트는 렌더 중에 쿠키를 심지 못하므로 여기서 심는다(언어
 * 쿠키와 같은 까닭이다). **임의 문자열 하나뿐이고 IP·User-Agent 를 함께
 * 적지 않는다** — 그 둘이 붙으면 이 값이 개인정보가 된다.
 */
export const ANON_COOKIE = "cm_a";

/**
 * ?lang= 을 쿠키로 굳힌다.
 *
 * 이게 없으면 언어 지정이 그 화면 한 장에만 먹는다. 해외 대학 담당자가
 * 학생들에게 ?lang=en 주소를 뿌려도, 학생이 "Start" 를 누르는 순간 다음
 * 화면이 한국어로 돌아가 버린다. 서버 컴포넌트는 렌더 중에 쿠키를 못 쓰므로
 * 여기서 처리한다.
 */
export function middleware(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang");
  const market = req.nextUrl.searchParams.get("market");
  const needLang = isLang(lang ?? undefined);
  /* **고른 시장을 굳힌다.** 가격표에서 한국을 골랐는데 결제 화면이 다시
     기본값으로 돌아가면 손님이 본 값과 주문서의 값이 갈린다. 언어 쿠키와
     같은 자리에서 심는 것은 서버 컴포넌트가 렌더 중에 쿠키를 못 쓰기
     때문이다 */
  const needMarket = isMarket(market ?? undefined)
    && req.cookies.get(MARKET_COOKIE)?.value !== market;
  const needAnon = !req.cookies.get(ANON_COOKIE);
  if (!needLang && !needMarket && !needAnon) return NextResponse.next();

  const res = NextResponse.next();
  if (needLang) {
    res.cookies.set(LANG_COOKIE, lang as string, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  if (needMarket) {
    res.cookies.set(MARKET_COOKIE, market as string, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  if (needAnon) {
    res.cookies.set(ANON_COOKIE, crypto.randomUUID(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      httpOnly: true,
    });
  }
  return res;
}

export const config = {
  // 정적 파일과 인증 콜백은 건드리지 않는다.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
