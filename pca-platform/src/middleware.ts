import { NextResponse, type NextRequest } from "next/server";
import { isLang, LANG_COOKIE } from "@/lib/locale";
import { isMarket, MARKET_COOKIE } from "@/lib/market-def";
import { isStaging } from "@/lib/env";

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
/**
 * 공개 전 자물쇠.
 *
 * **밖에서 열리지만 아직 손님에게 열지 않은 자리**에 건다. 주소를 아는
 * 사람만 막는 것은 자물쇠가 아니다: 검색엔진이 먼저 찾아내고, 찾아낸
 * 자리에 가짜 결제가 열려 있다.
 *
 * 비밀번호를 **코드에 적지 않는다**. `STAGING_BASIC_AUTH` 가 비어 있으면
 * 자물쇠가 아예 없는 것이고, 그 사실은 `staging:check` 가 센다.
 *
 * `/api/health` 는 뺀다: 앞단이 살아 있는지 물어보는 자리라 열쇠를
 * 들고 다니지 않는다.
 */
function gateFails(req: NextRequest): NextResponse | null {
  /* **`APP_ENV` 를 여기서 직접 읽지 않는다**(설계 원칙 10). 전에는 이
     줄이 `"staging"` 과 글자로 비교했는데, `appEnv()` 는 `stage` 도
     staging 으로 읽는다. 그 한 글자 차이로 **배너는 뜨고 가짜 결제도
     열리는데 자물쇠와 noindex 만 빠지는** 상태가 만들어진다. 검색엔진이
     먼저 찾아내고, 찾아낸 자리에 가짜 결제가 열려 있다. */
  if (!isStaging()) return null;
  const raw = (process.env.STAGING_BASIC_AUTH ?? "").trim();
  if (!raw.includes(":")) return null;
  if (req.nextUrl.pathname === "/api/health") return null;

  const sent = req.headers.get("authorization") ?? "";
  if (sent.startsWith("Basic ")) {
    let decoded = "";
    try { decoded = atob(sent.slice(6)); } catch { decoded = ""; }
    if (decoded === raw) return null;
  }
  return new NextResponse("공개 전입니다.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CareerMatri staging", charset="UTF-8"',
      /* **검색엔진에 올리지 않는다.** 자물쇠를 풀어 준 뒤에도 마찬가지라
         아래 응답 헤더에도 같은 것을 붙인다 */
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function middleware(req: NextRequest) {
  const blocked = gateFails(req);
  if (blocked) return blocked;

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
  const staging = isStaging();
  if (!needLang && !needMarket && !needAnon && !staging) return NextResponse.next();

  const res = NextResponse.next();
  /* 공개 전 배포본은 색인하지 않는다 */
  if (staging) res.headers.set("X-Robots-Tag", "noindex, nofollow");
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
