import { requireUser } from "@/lib/session";
import { jjuReportFor } from "@/lib/jju/report-pdf";

/**
 * 전주대 학생 리포트(웹). **본인의 전주대 응시만** 열린다. 남의 응시와 다른
 * 학교 응시는 있는지조차 말하지 않고 404 다(제품 결과 경로와 같은 규칙).
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();
  const r = await jjuReportFor(attemptId, user.id);
  if (!r.ok) return new Response("not found", { status: 404 });
  return new Response(r.html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
