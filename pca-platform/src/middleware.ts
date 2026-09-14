import { NextResponse, type NextRequest } from "next/server";

/**
 * 도메인을 하나로 모은다.
 *
 * 도메인을 여럿 사두고 전부 같은 서버를 가리키게 해두면, 사람마다 다른 주소로
 * 들어와서 다음이 갈린다.
 *
 *   - 세션 쿠키는 도메인마다 따로다. .com 으로 로그인하고 .kr 로 가면 로그아웃이다
 *   - 소셜 로그인 콜백은 개발자 콘솔에 등록한 **주소 하나**에만 맞는다. 다른
 *     도메인에서 누르면 로그인이 통째로 깨진다
 *   - 결제 성공·실패 주소는 지금 브라우저 주소(window.location.origin)를 쓴다.
 *     별칭으로 들어오면 결제 뒤 돌아오는 곳도 별칭이 된다
 *
 * 그래서 AUTH_URL 의 호스트가 아니면 그쪽으로 보낸다. 308 은 메서드를 바꾸지
 * 않는 영구 이동이라 POST 도 살아서 넘어간다.
 *
 * 리버스 프록시에서 막는 편이 더 앞단이지만, 프록시 설정은 빠뜨리기 쉽고
 * 빠뜨려도 화면이 멀쩡해 보인다. 여기서도 한 번 막는다.
 */
export function middleware(req: NextRequest) {
  const want = process.env.AUTH_URL;
  if (!want) return NextResponse.next();

  let canonical: URL;
  try {
    canonical = new URL(want);
  } catch {
    return NextResponse.next();
  }

  // Host 헤더를 본다. nextUrl 은 배포 환경에 따라 내부 주소로 채워지는 경우가 있어
  // 별칭으로 들어온 것을 놓친다
  const rawHost = req.headers.get("host") ?? req.nextUrl.host;
  const host = rawHost.split(":")[0].toLowerCase();
  // 개발과 컨테이너 상태 확인은 IP·localhost 로 들어온다. 그걸 밖으로 보내면 안 된다
  const isLocal = host === "localhost" || host === "127.0.0.1" || /^[\d.]+$/.test(host);
  if (isLocal || host === canonical.hostname) return NextResponse.next();

  const to = new URL(req.nextUrl.pathname + req.nextUrl.search, canonical.origin);
  return NextResponse.redirect(to, 308);
}

export const config = {
  // 상태 확인은 별칭으로 불러도 200 이어야 한다. 정적 파일도 돌릴 이유가 없다
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
