import { requireUser } from "@/lib/session";
import { jjuReportFor, jjuReportPdf } from "@/lib/jju/report-pdf";

/** 전주대 학생 리포트(PDF). 묻는 차례는 웹 쪽과 같다 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(_req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();
  const r = await jjuReportFor(attemptId, user.id);
  if (!r.ok) return new Response("not found", { status: 404 });
  try {
    const pdf = await jjuReportPdf(r.html);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="careermatri-jju-${encodeURIComponent(attemptId)}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.log(`[jju-pdf] fail attempt=${attemptId} ${(e as Error).message.split("\n")[0]}`);
    return new Response("PDF를 만들지 못했습니다. 웹 리포트는 그대로 열립니다.", { status: 503 });
  }
}
