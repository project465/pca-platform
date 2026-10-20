import { currentUser } from "@/lib/session";
import { kusStudentOf } from "@/lib/kus/access";
import { kusReportFor } from "@/lib/kus/report-pdf";

/**
 * KUS 리포트(웹). **본인의 KUS 응시만** 열린다: 남의 번호 · 다른 학교 응시 ·
 * 채점 전 응시는 전부 404 이고, 까닭을 밖에 적지 않는다(있는지 없는지를
 * 알려 주지 않는다).
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const user = await currentUser();
  if (!user || !(await kusStudentOf(user.id))) return new Response("not found", { status: 404 });
  const r = await kusReportFor(attemptId, user.id);
  if (!r.ok) return new Response("not found", { status: 404 });
  return new Response(r.html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex" },
  });
}
