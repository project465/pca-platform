import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * 살아 있는지 묻는 자리. 로드밸런서와 배포 스크립트가 본다.
 *
 * 프로세스가 떴다는 것만으로 "정상"이라고 답하지 않는다 — 데이터베이스가 끊기면
 * 어떤 화면도 열리지 않는데 헬스체크만 초록이면 아무도 모른다.
 */
export async function GET() {
  try {
    await queryOne<{ ok: number }>(`SELECT 1 AS ok`);
  } catch (e) {
    return Response.json(
      { ok: false, db: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 503 },
    );
  }
  return Response.json({ ok: true, db: true, at: new Date().toISOString() });
}
