import Link from "next/link";
import { requireRole } from "@/lib/session";
import { orgBilling } from "@/lib/billing";
import { namesOf } from "@/lib/i18n";
import AdminShell from "@/components/admin-shell";

export const metadata = { title: "기관 청구 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/**
 * 기관이 부담한 멘토링을 월별로 모은다.
 *
 * 멘토에게는 이미 나간 돈이다. 이 화면이 없으면 그 돈을 어느 기관에 청구해야
 * 하는지 아무도 모르고, 결국 운영사가 전부 떠안는다.
 */
export default async function OrgBillingPage() {
  const user = await requireRole(["superadmin"]);
  const rows = await orgBilling();
  const names = await namesOf("organizations", [...new Set(rows.map((r) => r.org_id))], user.locale);

  const total = rows.reduce((a, r) => a + r.billed, 0);
  const upcoming = rows.reduce((a, r) => a + r.upcoming_n, 0);

  return (
    <AdminShell user={user} current="/admin/org-billing">
      <div className="page-head">
        <h1>기관 청구</h1>
        <span className="count">{rows.length}건</span>
      </div>

      <dl className="stat-row">
        <div>
          <dt>청구 확정 합계</dt>
          <dd>{won(total)}</dd>
        </div>
        <div>
          <dt>아직 끝나지 않은 세션</dt>
          <dd className={upcoming > 0 ? "warn" : ""}>{upcoming}건</dd>
        </div>
      </dl>

      <p className="lede">
        학과 계약으로 들어온 학생의 세션입니다. 학생에게는 청구하지 않지만 멘토에게는
        같은 금액이 지급되므로, 그 돈은 기관에 청구해야 합니다. 금액은 정산이 잡힌 건만
        셉니다 — <Link href="/admin/payouts">멘토 정산</Link>에 잡힌 것과 같은 건들입니다.
      </p>

      {rows.length === 0 ? (
        <div className="empty">
          <b>기관이 부담한 세션이 아직 없습니다</b>
          소속이 있는 계정으로 신청이 들어오면 여기에 쌓입니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>월</th>
                <th>기관</th>
                <th className="num">청구 확정</th>
                <th className="num">금액</th>
                <th className="num">진행 중</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.org_id}-${r.month}`}>
                  <td className="mono">{r.month}</td>
                  <td>{names.get(r.org_id) ?? `#${r.org_id}`}</td>
                  <td className="num">{r.billed_n}건</td>
                  <td className="num">
                    <b>{won(r.billed)}</b>
                  </td>
                  <td className="num muted">{r.upcoming_n > 0 ? `${r.upcoming_n}건` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="foot-note">
        진행 중인 건은 아직 청구 대상이 아닙니다. 세션이 끝나고 노쇼 신고 기간이 지나
        정산이 잡히면 청구 확정으로 넘어옵니다. 신청자가 늦게 취소해 일부만 환불된 건은
        남은 금액만 청구됩니다 — 멘토가 그만큼 받기 때문입니다.
      </p>
    </AdminShell>
  );
}
