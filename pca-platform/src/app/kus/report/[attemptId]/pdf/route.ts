import { currentUser } from "@/lib/session";
import { kusStudentOf } from "@/lib/kus/access";
import { kusReportFor, kusReportPdf } from "@/lib/kus/report-pdf";

/** KUS 리포트(PDF). 묻는 차례는 웹 쪽과 같다 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(_req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const user = await currentUser();
  if (!user || !(await kusStudentOf(user.id))) return new Response("not found", { status: 404 });
  const r = await kusReportFor(attemptId, user.id);
  if (!r.ok) return new Response("not found", { status: 404 });
  const t0 = Date.now();
  try {
    const pdf = await kusReportPdf(r.html);
    console.log(`[kus-pdf] done attempt=${attemptId} ${pdf.length}바이트 ${Date.now() - t0}ms`);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="careermatri-kus-${encodeURIComponent(attemptId)}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    /* 왜 못 뽑았는지를 버리지 않는다. 사용자에게는 웹 리포트로 가는 길을 준다 */
    console.error(`[kus-pdf] fail attempt=${attemptId} ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 300)}`);
    return new Response(
      `<!doctype html><meta charset="utf-8"><p>PDF를 만들지 못했습니다. <a href="/kus/report/${encodeURIComponent(attemptId)}">웹 리포트</a>는 그대로 열립니다.</p>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
