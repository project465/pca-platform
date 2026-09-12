import { requireRole } from "@/lib/session";
import { failedRefunds } from "@/lib/billing";
import AdminShell from "@/components/admin-shell";
import RetryButton from "./retry-button";

export const metadata = { title: "환불 실패 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/**
 * 환불이 실패한 건만 모은다.
 *
 * 취소 자체는 성립시키고 결제 취소만 따로 재시도하는 구조라(취소가 PG 사정으로
 * 막히면 안 된다), 실패한 건이 어디에도 안 보이면 신청자는 '취소됐습니다'를 보고
 * 돈은 돌아오지 않는 상태로 남는다. 이 화면이 그 구멍을 막는다.
 */
export default async function RefundsPage() {
  const user = await requireRole(["superadmin"]);
  const rows = await failedRefunds();

  return (
    <AdminShell user={user} current="/admin/refunds">
      <div className="page-head">
        <h1>환불 실패</h1>
        <span className="count">{rows.length}건</span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <b>실패한 환불이 없습니다</b>
          취소와 함께 결제 취소가 전부 정상 처리됐습니다.
        </div>
      ) : (
        <>
          <div className="notice error" style={{ marginBottom: 18 }}>
            아래 건은 신청자에게 <b>취소됐다고 안내됐지만 돈이 돌아가지 않았습니다.</b>{" "}
            다시 시도하거나, 계속 실패하면 토스페이먼츠 관리자에서 직접 취소해야 합니다.
          </div>

          <ul className="req-list">
            {rows.map((r) => (
              <li key={r.payment_id} className="req">
                <div className="req-head">
                  <b>{won(r.refund_due ?? r.amount)} 환불 실패</b>
                  <span className="state no">미처리</span>
                  <span className="mono muted">{r.order_id}</span>
                </div>
                <div className="req-meta">
                  {r.starts_at} 세션 · {r.alias} (<span className="mono">{r.handle}</span>) ·
                  결제 {won(r.amount)}
                  {r.cancel_reason ? ` · 사유 ${r.cancel_reason}` : ""}
                </div>
                <div className="req-meta">
                  신청자 {r.applicant_name}
                  {r.applicant_email ? ` · ${r.applicant_email}` : " · 이메일 없음"}
                </div>

                <p className="req-q">{r.fail_reason}</p>

                <div className="req-foot">
                  <RetryButton paymentId={r.payment_id} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminShell>
  );
}
