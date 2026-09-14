import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * 살아 있는가.
 *
 * 컨테이너와 로드밸런서가 물어본다. **DB 까지 물어본다** — 프로세스만
 * 떠 있고 DB 가 끊긴 상태로 트래픽을 받으면, 사는 사람이 결제 직전에
 * 오류를 만난다. 그건 살아 있는 것이 아니다.
 *
 * 안을 보여주지 않는다. 버전도 테이블 수도 적지 않는다 — 로그인 없이
 * 열리는 주소라 밖에 알려 줄 이유가 없다.
 */
export async function GET() {
  try {
    await queryOne<{ ok: number }>(`SELECT 1 AS ok`);
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
