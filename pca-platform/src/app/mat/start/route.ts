import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/session";
import { query } from "@/lib/db";
import { matVisible } from "@/lib/mat-public";
import { activeTrack } from "@/lib/track";

export const dynamic = "force-dynamic";

/**
 * **MAT 시작 단추가 가리키는 한 곳**(홈페이지 www · 앱 안 단추). 사람마다 갈 곳을 여기서 정한다
 * (캔버스 10번 "들어오는 곳은 넷, MAT 화면은 하나").
 *
 *   로그인 전              → 로그인(가입 단추 있음) → 다시 여기로
 *   MAT 을 볼 수 없음      → 앱 홈. 공개 전(MAT_PUBLIC=false)에는 시험 계정 · 운영자 · 이용권이 있는 사람만 본다
 *   이용권 · 학교 좌석 있음 → MAT 홈
 *   없음                   → 이용권(30일 · 90일)
 *
 * `?from=www` 로 오면 유입 경로를 홈페이지로 적는다(로그인을 거쳐도 하루 동안 기억한다).
 * 레이아웃 밖의 길(route)이라 `/mat` 의 404 문에 걸리지 않는다.
 */
const ENTRY_COOKIE = "cm_entry";
const go = (path: string) => new NextResponse(null, { status: 302, headers: { Location: path } });

export async function GET(req: Request) {
  const from = new URL(req.url).searchParams.get("from");
  const jar = await cookies();
  const viaWww = from === "www" || jar.get(ENTRY_COOKIE)?.value === "www";
  const user = await currentUser().catch(() => null);

  if (!user) {
    const res = go(`/login?next=${encodeURIComponent("/mat/start")}`);
    if (viaWww) {
      res.cookies.set(ENTRY_COOKIE, "www", {
        path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production",
      });
    }
    return res;
  }
  if (viaWww) {
    await query(
      `INSERT INTO brand_touches (user_id, brand) VALUES ($1, 'www')
       ON CONFLICT (user_id, brand) DO UPDATE SET last_seen_at = now()`, [user.id]).catch(() => null);
  }
  const visible = await matVisible(user.id);
  const on = visible ? (await activeTrack(user.id).catch(() => null))?.on : false;
  const res = go(!visible ? "/me" : on ? "/mat" : "/mat/pass");
  if (viaWww) res.cookies.delete(ENTRY_COOKIE);
  return res;
}
