import { requireUser } from "@/lib/session";
import { jjuReportFor } from "@/lib/jju/report-pdf";

/**
 * 전주대 학생 리포트(웹). **본인의 전주대 응시만** 열린다. 남의 응시와 다른
 * 학교 응시는 있는지조차 말하지 않고 404 다(제품 결과 경로와 같은 규칙).
 */
export const dynamic = "force-dynamic";

/** 열 수 없을 때도 사람의 말로 선다. 왜 못 여는지(남의 것인지 · 없는 것인지)는 적지 않는다 */
const NOT_OPEN = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>리포트를 열 수 없습니다 · CareerMatri</title>
<style>body{margin:0;background:#f4f6fa;color:#0f1e36;font:16px/1.6 system-ui,sans-serif}
main{max-width:560px;margin:12vh auto;padding:32px 24px;background:#fff;border:1px solid #e3e8f0;border-radius:12px}
h1{font-size:22px;margin:0 0 8px}p{margin:0 0 20px;color:#4a5a73}
a{display:inline-block;padding:10px 16px;border-radius:8px;background:#1557c0;color:#fff;text-decoration:none}</style></head>
<body><main><h1>이 리포트를 열 수 없습니다</h1>
<p>본인이 응시한 전주대 리포트만 열립니다. 주소를 다시 확인해 주세요.</p>
<a href="/me">내 CareerMatri로</a></main></body></html>`;

export async function GET(_req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();
  const r = await jjuReportFor(attemptId, user.id);
  if (!r.ok) {
    return new Response(NOT_OPEN, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
    });
  }
  return new Response(r.html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
