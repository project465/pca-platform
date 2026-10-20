/**
 * 세종 결과지 PDF. **그리는 함수는 공통 엔진 것을 그대로 쓴다**
 * (`drawPagePdf` — 브라우저 찾기 · 로그인 쿠키 넘기기 · A4 인쇄). 고치지 않았다.
 *
 * 미리 만들어 두지 않는다. 부를 때마다 결과지 쪽(`/sejong/report?print=1`)을
 * 인쇄하고, 성공·실패를 `sj_report_renders` 에 한 줄 적는다. 관리자 화면의
 * 'PDF 생성' 칸은 이 줄만 센다.
 */
import { headers } from "next/headers";
import { drawPagePdf, PdfFailed } from "@/lib/me-v3/result/pdf";
import { sejongActor } from "@/sejong/lib/session";
import { latestScored, logAccess, logRender } from "@/sejong/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(): Promise<Response> {
  const a = await sejongActor();
  if (!a || !a.kinds.includes("participant")) {
    return new Response("로그인이 필요합니다.", { status: 401 });
  }
  const att = await latestScored(a.userId);
  if (!att) return new Response("제출한 진단이 없습니다.", { status: 404 });

  const h = await headers();
  const base = (process.env.PDF_BASE ?? "").trim()
    || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "127.0.0.1:3000"}`;
  try {
    const pdf = await drawPagePdf({
      path: "/sejong/report?print=1",
      baseUrl: base,
      cookie: h.get("cookie") ?? "",
      header: "세종일자리경제진흥원 × CareerMatri · 개인별 취업 전략 결과지 (시연)",
      waitFor: "#sj-report",
    });
    await logRender({ attemptId: att.id, by: a.userId, ok: true, bytes: pdf.length });
    await logAccess({ actorId: a.userId, actorKind: "self", targetUser: a.userId, attemptId: att.id, what: "report_pdf" });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="sejong-report-${att.id}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    const step = e instanceof PdfFailed ? e.step : "unknown";
    console.error(`[sejong-pdf] attempt=${att.id} step=${step} :: ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 300)}`);
    await logRender({ attemptId: att.id, by: a.userId, ok: false, step });
    return new Response(
      "PDF 를 만들지 못했습니다. 웹 결과지(/sejong/report)는 그대로 볼 수 있고 내용은 같습니다.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}
