import Link from "next/link";
import { requireSejong } from "@/sejong/lib/session";
import { loadReport } from "@/sejong/lib/report";
import { logAccess } from "@/sejong/lib/store";
import { ReportDoc } from "@/sejong/ui/report-doc";

export const dynamic = "force-dynamic";

export default async function ReportPreview({ searchParams }: { searchParams: Promise<{ print?: string }> }) {
  const a = await requireSejong("participant");
  const p = await loadReport(a.userId);
  const sp = await searchParams;
  if (!p) {
    return (
      <div className="sj-card">
        <h1>결과지</h1>
        <p>진단을 제출하면 결과지를 만들 수 있습니다.</p>
        <Link className="sj-btn" href="/sejong/diagnosis">진단 시작</Link>
      </div>
    );
  }
  /* PDF 를 그리는 브라우저가 연 것은 PDF 기록으로 따로 남기므로 여기서 세지 않는다 */
  if (!sp.print) {
    await logAccess({ actorId: a.userId, actorKind: "self", targetUser: a.userId, attemptId: p.attemptId, what: "report_web" });
  }
  return (
    <>
      <div className="sj-noprint sj-actions" style={{ marginBottom: 16 }}>
        <a className="sj-btn" href="/sejong/report/pdf">PDF 내려받기</a>
        <Link className="sj-btn ghost" href="/sejong/plan">실행 계획으로</Link>
      </div>
      <ReportDoc {...p} />
    </>
  );
}
