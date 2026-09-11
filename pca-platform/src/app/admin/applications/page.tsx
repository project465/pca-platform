import Link from "next/link";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";

export const metadata = { title: "도입 신청 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  ref_code: string;
  site: string;
  country: string;
  org_name: string;
  dept_name: string | null;
  contact_name: string;
  contact_email: string;
  expected_size: string | null;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  received: "접수",
  approved: "승인",
  rejected: "반려",
};

export default async function ApplicationsPage() {
  const user = await requireRole(["superadmin"]);

  const rows = await query<Row>(
    `SELECT id, ref_code, site, country, org_name, dept_name,
            contact_name, contact_email, expected_size::text AS expected_size, status,
            to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
       FROM org_applications
      ORDER BY (status = 'received') DESC, created_at DESC`,
  );

  const open = rows.filter((r) => r.status === "received").length;

  return (
    <AdminShell user={user} current="/admin/applications">
      <div className="page-head">
        <h1>도입 신청</h1>
        <span className="count">처리할 것 {open}건</span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <b>들어온 신청이 없습니다</b>
          소개 사이트의 도입 신청 폼으로 들어오는 단체가 여기에 쌓입니다.
          승인하면 그 자리에서 기관·담당자 계정·전용 링크가 함께 만들어집니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>접수번호</th>
                <th>기관</th>
                <th>담당자</th>
                <th style={{ textAlign: "right" }}>예상 인원</th>
                <th>출처</th>
                <th>상태</th>
                <th>접수일</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.ref_code}</td>
                  <td>
                    {r.org_name}
                    {r.dept_name ? (
                      <span style={{ color: "var(--muted)" }}> · {r.dept_name}</span>
                    ) : null}
                  </td>
                  <td>
                    {r.contact_name}
                    <span style={{ color: "var(--muted)" }}> · {r.contact_email}</span>
                  </td>
                  <td className="num">
                    {r.expected_size ? Number(r.expected_size).toLocaleString("ko-KR") : "—"}
                  </td>
                  <td className="mono">
                    {r.site} / {r.country}
                  </td>
                  <td>
                    <span className={`tag ${r.status}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="mono">{r.created_at}</td>
                  <td>
                    <Link className="act" href={`/admin/applications/${r.id}`}>
                      {r.status === "received" ? "검토" : "보기"}
                    </Link>
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
