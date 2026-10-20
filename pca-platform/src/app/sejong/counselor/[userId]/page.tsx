import Link from "next/link";
import { queryOne } from "@/lib/db";
import { requireSejong } from "@/sejong/lib/session";
import { counselorMayRead } from "@/sejong/lib/access";
import { loadReport } from "@/sejong/lib/report";
import { logAccess } from "@/sejong/lib/store";
import { ReportDoc } from "@/sejong/ui/report-doc";

export const dynamic = "force-dynamic";

/**
 * 상담사의 결과 열람. **판단은 `counselorMayRead` 한 곳에서만 한다.**
 * 열면 열었다고, 막히면 막혔다고 적는다.
 */
export default async function CounselorView({ params }: { params: Promise<{ userId: string }> }) {
  const a = await requireSejong("counselor");
  const { userId } = await params;
  const pid = /^\d+$/.test(userId) ? Number(userId) : 0;
  const who = await queryOne<{ participant_no: string; display_name: string }>(
    `SELECT p.participant_no, u.display_name FROM sj_participants p JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1 AND p.org_id = $2`, [pid, a.orgId]);
  const d = await counselorMayRead({ counselorId: a.userId, orgId: a.orgId, participantId: pid });

  if (!d.ok) {
    await logAccess({ actorId: a.userId, actorKind: "counselor", targetUser: pid || a.userId, attemptId: null, what: "denied", reason: d.reason });
    return (
      <div className="sj-card" style={{ maxWidth: 640 }}>
        <h1>결과를 열 수 없습니다</h1>
        <p>{who ? `${who.participant_no} · ${who.display_name}` : "참여자"}</p>
        <p className="sj-note warn">{d.reason}</p>
        <p className="small muted">이 시도도 기록에 남았습니다. 동의는 참여자 본인만 할 수 있습니다.</p>
        <Link className="sj-btn ghost" href="/sejong/counselor">담당 목록</Link>
      </div>
    );
  }

  const p = await loadReport(pid);
  if (!p) {
    return (
      <div className="sj-card">
        <h1>{who?.display_name}</h1>
        <p>아직 제출한 진단이 없습니다.</p>
        <Link className="sj-btn ghost" href="/sejong/counselor">담당 목록</Link>
      </div>
    );
  }
  await logAccess({ actorId: a.userId, actorKind: "counselor", targetUser: pid, attemptId: p.attemptId, what: "report_web" });
  return (
    <>
      <div className="sj-noprint sj-note" style={{ marginBottom: 16 }}>
        상담사 열람 · 본인 동의 확인됨 · 이 열람은 기록됩니다. 경험 메모 원문은 상담 범위에 따라 본인과 함께 확인하세요.
        {" "}<Link href="/sejong/counselor">담당 목록</Link>
      </div>
      <ReportDoc {...p} />
    </>
  );
}
