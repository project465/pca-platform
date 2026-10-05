import Link from "next/link";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { incidents } from "@/lib/incidents";
import { Pill } from "@/components/sf/parts";
import { resolveAction } from "./actions";

export const metadata = { title: "사고 · 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/**
 * 사고 화면.
 *
 * **로그에만 두지 않는다**(규격 §26). 결제가 확정됐는데 이용권이 안 나간
 * 주문을 맨 위에 둔다: 산 사람은 결제 문자를 받고 들어와서 아무것도 못
 * 하고, 그 상태로는 화면에 아무 표시가 없었다.
 *
 * **개인 서술을 담지 않는다.** 무엇이 몇 번 깨졌는지와 되짚을 번호까지다.
 */
export default async function IncidentsPage() {
  const user = await requireRole(["superadmin"]);
  const r = await incidents();

  return (
    <AdminShell user={user} current="/admin/incidents">
      <h1>사고</h1>
      <p className="sub">
        막혀 있는 것 {r.total}가지. 되짚을 번호를 함께 적습니다.
      </p>

      {/* 1. 돈은 들어왔는데 문이 안 열린 주문. **가장 비싼 사고다** */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>결제됐는데 이용권이 없는 주문 {r.paidNoGrant.length}건</h2>
        {r.paidNoGrant.length === 0 ? (
          <p className="sub">없습니다.</p>
        ) : (
          <>
            <p className="sub">
              산 사람이 들어와서 아무것도 못 하는 상태입니다. 웹훅이 한 번
              빠졌거나 확정이 되돌아간 자리입니다.
            </p>
            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr><th>주문 번호</th><th>상품</th><th>결제 확정</th></tr>
                </thead>
                <tbody>
                  {r.paidNoGrant.map((o) => (
                    <tr key={o.orderNo}>
                      <td className="sf-strong">{o.orderNo}</td>
                      <td>{o.productCode}</td>
                      <td>{o.paidAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 2. 종류별로 센 것 */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>종류별</h2>
        {r.counts.length === 0 ? (
          <p className="sub">막혀 있는 것이 없습니다.</p>
        ) : (
          <div className="sf-tw">
            <table className="sf-table">
              <thead><tr><th>무엇</th><th className="num">몇 번</th></tr></thead>
              <tbody>
                {r.counts.map((c) => (
                  <tr key={c.kind}>
                    <td className="sf-strong">{c.label}</td>
                    <td className="num">{c.n}</td>
                  </tr>
                ))}
                <tr>
                  <td className="sf-strong">못 나간 메일</td>
                  <td className="num">{r.mailStuck}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. 최근 것. 처리했다고 적는 단추가 옆에 있다 */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>최근</h2>
        {r.recent.length === 0 ? (
          <p className="sub">없습니다.</p>
        ) : (
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>무엇</th><th>참조 번호</th><th>한 줄</th><th>언제</th><th />
                </tr>
              </thead>
              <tbody>
                {r.recent.map((x) => (
                  <tr key={x.id}>
                    <td><Pill tone="warn">{x.kind}</Pill></td>
                    <td className="sf-strong">{x.traceId ?? "-"}</td>
                    <td>{x.message}</td>
                    <td>{x.at}</td>
                    <td>
                      {/* **지우지 않고 봤다고 적는다.** 지우면 같은 사고가
                          다시 났을 때 앞의 것을 못 찾는다 */}
                      <form action={resolveAction}>
                        <input type="hidden" name="id" value={x.id} />
                        <button className="sf-btn ghost sm">봤다고 적기</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. 멈춘 응시. 사고는 아니고 사람이 한 번 봐야 하는 자리다 */}
      <section className="panel">
        <h2>이틀 넘게 멈춘 응시 {r.stuck.length}건</h2>
        {r.stuck.length === 0 ? (
          <p className="sub">없습니다.</p>
        ) : (
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>응시</th><th>등급</th><th className="num">답한 문항</th>
                  <th className="num">며칠</th>
                </tr>
              </thead>
              <tbody>
                {r.stuck.map((s) => (
                  <tr key={s.attemptId}>
                    <td className="sf-strong">{s.attemptId}</td>
                    <td>{s.tier}</td>
                    <td className="num">{s.answered}</td>
                    <td className="num">{s.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="sub" style={{ marginTop: 14 }}>
          <Link href="/admin/launch">런칭 준비</Link>
          {" · "}
          <Link href="/admin/ops">밤 당번</Link>
        </p>
      </section>
    </AdminShell>
  );
}
