import { NextResponse, type NextRequest } from "next/server";
import { isLang, LANG_COOKIE } from "@/lib/locale";

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
  if (!isLang(lang ?? undefined)) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(LANG_COOKIE, lang as string, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}

export const config = {
  // 정적 파일과 인증 콜백은 건드리지 않는다.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
