import { requireRole } from "@/lib/session";
import { namesOf } from "@/lib/i18n";
import { invoiceLines, money, periodOf } from "@/lib/billing";
import AdminShell from "@/components/admin-shell";

export const metadata = { title: "정산 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/**
 * 건당 계약의 정산 화면.
 *
 * 달마다 기관별로 몇 건이 나갔고 얼마인지를 본다. 여기 숫자가 그대로
 * 세금계산서 금액이 되므로, 나중에 세는 값이 아니라 발생 시점에 남은
 * 값(billing_events)만 보여준다. 응시 표를 다시 세지 않는다 — 단가가
 * 바뀌면 지난 달 금액이 따라 바뀌어 버리기 때문이다.
 *
 * 청구서 발행과 입금 확인은 아직 없다. 지금은 '얼마를 청구해야 하는가'
 * 까지만 답한다.
 */
export default async function BillingPage() {
  const user = await requireRole(["superadmin"]);
  const lines = await invoiceLines();
  const names = await namesOf("organizations", [...new Set(lines.map((l) => l.orgId))], "ko");
  const thisPeriod = periodOf();

  const monthTotal = lines
    .filter((l) => l.period === thisPeriod)
    .reduce((a, l) => a + l.amount, 0);

  return (
    <AdminShell user={user} current="/admin/billing">
      <div className="page-head">
        <h1>정산</h1>
        <span className="count">
          {thisPeriod} 합계 {money(monthTotal)}
        </span>
      </div>
      <p className="help" style={{ maxWidth: 680, marginTop: -8, marginBottom: 20 }}>
        건당 계약에서 제출을 마친 응시 한 건마다 한 줄이 쌓입니다. 금액은 그 건이
        생긴 시점의 단가로 계산되어 있어, 단가를 나중에 고쳐도 지난 달 금액은
        바뀌지 않습니다. 선불 계약은 여기에 나오지 않습니다.
      </p>

      {lines.length === 0 ? (
        <div className="empty">
          <b>아직 정산할 건이 없습니다</b>
          건당 계약에서 응시가 제출되면 여기에 쌓입니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>정산 월</th>
                <th>기관</th>
                <th>계약</th>
                <th className="num">건수</th>
                <th className="num">금액</th>
                <th>청구</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={`${l.contractId}-${l.period}`}>
                  <td className="mono">{l.period}</td>
                  <td>{names.get(l.orgId) ?? `기관 ${l.orgId}`}</td>
                  <td>{l.contractTitle}</td>
                  <td className="num">{l.count.toLocaleString("ko-KR")}건</td>
                  <td className="num">{money(l.amount, l.currency)}</td>
                  <td>
                    {l.invoiced === 0 ? (
                      <span className="tag">미청구</span>
                    ) : l.invoiced === l.count ? (
                      <span className="tag active">청구함</span>
                    ) : (
                      <span className="tag suspended">
                        일부 {l.invoiced}/{l.count}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="empty" style={{ marginTop: 24 }}>
        <b>아직 없는 것</b>
        청구서 발행과 입금 확인은 없습니다. 지금은 얼마를 청구해야 하는지까지만 답합니다.
      </div>
    </AdminShell>
  );
}
