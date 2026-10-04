/**
 * 결과지가 읽는 자료.
 *
 * **그때 굳힌 것을 내준다.** 지금 다시 채점해 내주면 엔진을 고친 다음 날
 * 같은 결과지가 다른 글을 보여 주고, 그 사실을 아무도 모른다. 내주는 것은
 * `report_snapshots.payload` 에 들어 있는 그 객체다.
 *
 * **주인 확인을 여기서 한다.** 창이 보낸 응시 번호를 믿지 않는다. 기관은
 * 개인 결과지를 기본으로 못 보고(`org.participant.report.read` 가 어느
 * 역할에도 없다), 이 주소도 같은 규칙이다: 본인만이다.
 */
import { requireUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v2/attempt";
import { latestSnapshot } from "@/lib/me-v2/render";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();
  const a = await attemptOf(attemptId, user.id);
  if (!a) return new Response("not found", { status: 404 });

  const snap = await latestSnapshot(attemptId);
  if (!snap?.payload) return new Response("not found", { status: 404 });

  const pay = snap.payload as {
    result?: unknown; summary?: unknown; input_warnings?: unknown;
  };
  return Response.json(
    {
      snapshot_id: snap.id,
      generated_at: snap.generated_at,
      result: pay.result ?? null,
      summary: pay.summary ?? null,
      /* 뜻 없는 입력 경고는 안쪽 자료다. 본문에 글자로 내보내지 않는다 */
      warnings: pay.input_warnings ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
