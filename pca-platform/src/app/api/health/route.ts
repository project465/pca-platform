import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * 살아 있는지 묻는 자리.
 *
 * 프로세스가 떠 있는 것만으로는 살아 있다고 할 수 없다 — 데이터베이스에
 * 닿지 못하면 학생은 로그인조차 못 한다. 그래서 실제로 한 번 물어본다.
 *
 * 여기에 버전이나 접속 문자열 같은 것을 담지 않는다. 인증 없이 열려 있는
 * 자리이므로, 밖에서 알아도 되는 것만 둔다.
 */
export async function GET() {
  try {
    const row = await queryOne<{ ok: number }>("SELECT 1 AS ok");
    if (!row) throw new Error("빈 응답");
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "db_unreachable" }, { status: 503 });
  }
}
