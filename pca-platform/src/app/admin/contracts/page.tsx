import Link from "next/link";
import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";

export const metadata = { title: "계약·응시권 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  org_id: string;
  org_code: string;
  title: string;
  starts_on: string;
  ends_on: string;
  seat_count: number;
  assigned: number;
  consumed: number;
  status: string;
  session_count: number;
};

export default async function ContractsPage() {
  const user = await requireRole(["superadmin"]);

  const rows = await query<Row>(
    `SELECT c.id, c.org_id, o.code AS org_code, c.title,
            to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on,
            to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on,
            c.seat_count, c.status,
            (SELECT count(*) FROM seats s WHERE s.contract_id = c.id AND s.user_id IS NOT NULL)::int AS assigned,
            (SELECT count(*) FROM seats s WHERE s.contract_id = c.id AND s.consumed_at IS NOT NULL)::int AS consumed,
            (SELECT count(*) FROM test_sessions t WHERE t.contract_id = c.id)::int AS session_count
       FROM contracts c
       JOIN organizations o ON o.id = c.org_id
      ORDER BY c.created_at DESC`,
  );
  const names = await namesOf("organizations", rows.map((r) => r.org_id), user.locale);

  const total = rows.reduce((a, r) => a + r.seat_count, 0);
  const assigned = rows.reduce((a, r) => a + r.assigned, 0);

  return (
    <AdminShell user={user} current="/admin/contracts">
      <div className="page-head">
        <h1>계약·응시권</h1>
        <span className="count">
          {rows.length}건 · 응시권 {total.toLocaleString("ko-KR")}개 중 {assigned.toLocaleString("ko-KR")}개 배정
        </span>
        <div className="right">
          <Link className="act solid" href="/admin/contracts/new">
            계약 등록
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <b>등록된 계약이 없습니다</b>
          계약을 등록하면 응시권이 그 수만큼 만들어지고, 학과가 회차를 열 수 있게 됩니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>학과</th>
                <th>계약</th>
                <th>기간</th>
                <th style={{ textAlign: "right" }}>응시권</th>
                <th style={{ textAlign: "right" }}>배정</th>
                <th style={{ textAlign: "right" }}>소진</th>
                <th style={{ textAlign: "right" }}>회차</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {names.get(r.org_id) ?? r.org_code}
                    <span className="sub mono">{r.org_code}</span>
                  </td>
                  <td>{r.title}</td>
                  <td className="mono">
                    {r.starts_on}
                    <span className="sub">~ {r.ends_on}</span>
                  </td>
                  <td className="num">{r.seat_count.toLocaleString("ko-KR")}</td>
                  <td className="num">{r.assigned.toLocaleString("ko-KR")}</td>
                  <td className="num">{r.consumed.toLocaleString("ko-KR")}</td>
                  <td className="num">{r.session_count}</td>
                  <td>
                    <span className={`tag ${r.status === "active" ? "active" : ""}`}>
                      {r.status === "active" ? "정상" : r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
