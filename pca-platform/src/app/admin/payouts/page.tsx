import Link from "next/link";
import { requireRole } from "@/lib/session";
import { payoutList, payoutSummary } from "@/lib/payout";
import { payoutSettings } from "@/lib/refund";
import { accountsFor } from "@/lib/payout-account";
import AdminShell from "@/components/admin-shell";
import { BuildButton, PayButton } from "./payout-actions";

export const metadata = { title: "멘토 정산 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default async function PayoutsPage() {
  const user = await requireRole(["superadmin"]);
  const [rows, summary, settings] = await Promise.all([
    payoutList(),
    payoutSummary(),
    payoutSettings(),
  ]);

  const feeSet = Number(settings.fee_percent) > 0;
  // 보낼 곳이 있는지. 계좌가 없으면 정산이 잡혀도 이체할 수 없다
  const accounts = await accountsFor([...new Set(rows.map((r) => r.mentor_id))]);
  const noAccount = rows.filter((r) => r.status === "pending" && !accounts.has(r.mentor_id)).length;

  return (
    <AdminShell user={user} current="/admin/payouts">
      <div className="page-head">
        <h1>멘토 정산</h1>
        <span className="count">
          지급 대기 {summary.pending}건 · {won(summary.pending_net)}
        </span>
      </div>

      {noAccount > 0 ? (
        <div className="notice error" style={{ marginBottom: 18 }}>
          지급 대기 {noAccount}건이 계좌 없이 잡혀 있습니다. 금액은 계산됐지만 보낼 곳이
          없습니다. 해당 멘토에게 콘솔에서 계좌를 등록하도록 알려주세요.
        </div>
      ) : null}

      {!feeSet ? (
        <div className="notice error" style={{ marginBottom: 18 }}>
          수수료율이 설정되지 않아 정산 건이 만들어지지 않습니다.{" "}
          <Link href="/admin/prices">가격·정책</Link>에서 먼저 정하세요.
        </div>
      ) : (
        <div className="panel" style={{ marginBottom: 18 }}>
          <BuildButton />
          <p className="help" style={{ marginTop: 8 }}>
            수수료 {settings.fee_percent}% · 원천징수 {settings.withholding_percent}%.
            끝난 세션 중 아직 정산이 잡히지 않은 것을 찾아 만듭니다.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty">
          <b>정산 건이 없습니다</b>
          세션이 끝나고 위 버튼을 누르면 잡힙니다. 무료(학과 계약) 세션은 정산 대상이 아닙니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>세션</th>
                <th>멘토</th>
                <th style={{ textAlign: "right" }}>받은 돈</th>
                <th style={{ textAlign: "right" }}>수수료</th>
                <th style={{ textAlign: "right" }}>원천징수</th>
                <th style={{ textAlign: "right" }}>지급액</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">
                    {r.starts_at}
                    {r.req_status === "cancelled" ? (
                      <span className="sub">늦게 취소돼 남은 돈</span>
                    ) : null}
                  </td>
                  <td>
                    {r.alias}
                    <span className="sub">
                      {r.real_name} · <span className="mono">{r.handle}</span>
                    </span>
                    {accounts.get(r.mentor_id) ? (
                      <span className="sub mono">
                        {accounts.get(r.mentor_id)!.bank} {accounts.get(r.mentor_id)!.account_no}{" "}
                        {accounts.get(r.mentor_id)!.holder}
                        {accounts.get(r.mentor_id)!.has_rrn ? "" : " · 주민번호 없음"}
                      </span>
                    ) : (
                      <span className="sub" style={{ color: "var(--gap)" }}>
                        지급 계좌 없음 — 멘토가 콘솔에서 등록해야 합니다
                      </span>
                    )}
                  </td>
                  <td className="num">{won(r.gross)}</td>
                  <td className="num">{won(r.fee)}</td>
                  <td className="num">{won(r.withholding)}</td>
                  <td className="num">
                    <b>{won(r.net)}</b>
                  </td>
                  <td>
                    {r.status === "paid" ? (
                      <>
                        <span className="tag active">지급함</span>
                        <span className="sub mono">{r.paid_at}</span>
                      </>
                    ) : (
                      <PayButton payoutId={r.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="foot-note">
        이 화면에서만 멘토 실명이 보입니다. 돈을 보내려면 누구인지 알아야 하기 때문입니다.
      </p>
    </AdminShell>
  );
}
