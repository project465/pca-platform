import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { buildIcs, calendarRows } from "@/lib/assistant/calendar";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store, private" };

/**
 * 공고 마감일 달력 파일.
 *
 *   GET /me/track/calendar?id=123   그 공고 하나
 *   GET /me/track/calendar          보고 있는 공고 전부
 *
 * **로그인한 본인 것만 낸다.** 로그인하지 않았으면 401, 남의 번호이거나
 * 마감일이 없으면 404 다. 남의 번호와 없는 번호를 같은 답으로 돌려 있는지
 * 없는지도 알려 주지 않는다. 비밀번호를 바꿔야 하는 계정은 다른 화면처럼 막는다.
 *
 * 영어 작업공간에는 MAT 이 없으므로(`WS_KR_ONLY`) 이 자리도 없다.
 */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || u.mustResetPw) {
    return new NextResponse("로그인이 필요합니다.", { status: 401, headers: NO_STORE });
  }
  if ((await wsLang(u.id)) === "en") {
    return new NextResponse("Not found", { status: 404, headers: NO_STORE });
  }
  const id = new URL(req.url).searchParams.get("id") ?? undefined;
  const rows = await calendarRows(u.id, id);
  if (!rows.length) {
    return new NextResponse(id ? "마감일이 적힌 공고를 찾지 못했습니다." : "마감일이 남은 공고가 없습니다.",
      { status: 404, headers: NO_STORE });
  }
  const body = buildIcs(rows, { base: process.env.PLATFORM_URL });
  const name = id ? `mat-deadline-${rows[0].id}.ics` : "mat-deadlines.ics";
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...NO_STORE,
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
    },
  });
}
