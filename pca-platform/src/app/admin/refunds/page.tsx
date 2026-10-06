import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { listRequests, REASON_LABEL } from "@/lib/refund-requests";
import { Pill } from "@/components/sf/parts";
import { decideAction } from "./actions";

export const metadata = { title: "환불 요청 · CareerMatri" };
export const dynamic = "force-dynamic";

/**
 * 환불 요청 화면.
 *
 * **승인이 곧 송금이 아니다.** 돈을 돌려보내는 것은 대행사 쪽 일이고
 * 가맹점 심사 전까지 열려 있지 않다. 그래서 `approved`(돌려주기로 정했다)
 * 와 `refunded`(실제로 나갔다)가 다른 상태다.
 *
 * **그때의 판정을 같이 보여 준다.** 요청한 다음 날 응시를 시작했다고 해서
 * 어제의 권리가 사라지면 안 되고, 운영자는 그 둘을 나란히 보고 정한다.
 */
const DENY: Record<string, string> = {
  not_found: "주문을 찾을 수 없음",
  not_paid: "결제가 확정되지 않음",
  already: "이미 환불됨",
  started: "응시를 시작함",
  viewed: "넓어진 결과지를 열어 봄",
  expired_window: "기간이 지남",
};

export default async function RefundsPage() {
  const user = await requireRole(["superadmin"]);
  const all = await listRequests({ limit: 100 });
  const open = all.filter((r) => r.status === "requested");

  return (
    <AdminShell user={user} current="/admin/refunds">
      <h1>환불 요청</h1>
      <p className="sub">
        처리를 기다리는 요청 {open.length}건. 판정은 요청이 들어온 그때의
        것이고, 승인하면 지금 규칙으로 한 번 더 봅니다.
      </p>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>기다리는 요청</h2>
        {open.length === 0 ? (
          <p className="sub">없습니다.</p>
        ) : (
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>주문</th><th>사유</th><th>그때 상태</th><th>판정</th>
                  <th className="num">금액</th><th>요청</th><th />
                </tr>
              </thead>
              <tbody>
                {open.map((r) => (
                  <tr key={r.id}>
                    <td className="sf-strong">{r.orderNo}</td>
                    <td>{REASON_LABEL[r.reason].ko}</td>
                    <td>
                      {r.attemptState ?? "-"}
                      {r.reportState && r.reportState !== "none" ? ` · ${r.reportState}` : ""}
                    </td>
                    <td>
                      {r.verdictOk
                        ? <Pill tone="ok">돌려줄 수 있음</Pill>
                        : <Pill tone="warn">{DENY[r.verdictCode] ?? r.verdictCode}</Pill>}
                    </td>
                    <td className="num">{r.verdictAmount.toLocaleString()}</td>
                    <td>{r.requestedAt}</td>
                    <td>
                      <form action={decideAction} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="id" value={r.id} />
                        <button name="action" value="approve" className="sf-btn ghost sm">
                          승인
                        </button>
                        <button name="action" value="deny" className="sf-btn ghost sm">
                          거절
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>지난 요청</h2>
        {all.length === open.length ? (
          <p className="sub">없습니다.</p>
        ) : (
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr><th>주문</th><th>사유</th><th>상태</th><th>결정</th></tr>
              </thead>
              <tbody>
                {all.filter((r) => r.status !== "requested").map((r) => (
                  <tr key={r.id}>
                    <td className="sf-strong">{r.orderNo}</td>
                    <td>{REASON_LABEL[r.reason].ko}</td>
                    <td>
                      <Pill tone={r.status === "refunded" || r.status === "approved"
                        ? "ok" : "not"}>
                        {r.status}
                      </Pill>
                    </td>
                    <td>{r.decidedAt ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
