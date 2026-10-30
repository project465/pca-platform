import { NextResponse } from "next/server";
import { BRAND_COOKIE, isPartner } from "@/lib/brand";

export const dynamic = "force-dynamic";

/**
 * 제휴 사이트의 단추가 부르는 자리(`/from/jobindustry`).
 *
 * 쿠키를 심고 제휴 소개 쪽으로 보낸다. **모르는 이름은 홈으로 보낸다**:
 * 아무 글자나 받아 쿠키로 굳히면 집계에 없는 입구가 생긴다.
 *
 * 쿠키는 90일이다. 잡인더스트리에서 넘어와 그날 가입하지 않고 며칠 뒤
 * 다시 오는 사람이 흔하고, 그 사람도 그 입구로 센다.
 */
/** **주소를 앞부분 없이 돌려준다.** 앞단(Railway)을 지나면 이 서버가 보는
    요청 주소가 안쪽 주소일 수 있고, 그 주소로 보내면 손님이 닿지 못한다 */
const go = (path: string) => new NextResponse(null, { status: 302, headers: { Location: path } });

export async function GET(_req: Request, { params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  if (!isPartner(brand)) return go("/");
  const res = go(`/partner/${brand}`);
  res.cookies.set(BRAND_COOKIE, brand, {
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
