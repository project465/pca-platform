import Link from "next/link";
import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";

export const metadata = { title: "기관 목록 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code: string;
  country: string;
  org_type: string;
  status: string;
  parent_id: string | null;
  member_count: string;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  university: "대학",
  department: "학과",
  company: "기업",
};

export default async function OrganizationsPage() {
  const user = await requireRole(["superadmin"]);

  const rows = await query<Row>(
    `SELECT o.id, o.code, o.country, o.org_type, o.status, o.parent_id,
            (SELECT count(*) FROM memberships m WHERE m.org_id = o.id)::text AS member_count,
            to_char(o.created_at, 'YYYY-MM-DD') AS created_at
       FROM organizations o
       LEFT JOIN organizations p ON p.id = o.parent_id
      ORDER BY o.country,
               COALESCE(p.code, o.code),      -- 대학 바로 아래에 그 대학의 학과가 붙는다
               o.parent_id NULLS FIRST,
               o.code`,
  );

  const ids = rows.map((r) => r.id);
  const parentIds = rows.map((r) => r.parent_id).filter((v): v is string => v !== null);
  const names = await namesOf("organizations", [...ids, ...parentIds], user.locale);

  return (
    <AdminShell user={user} current="/admin/organizations">
      <div className="page-head">
        <h1>기관</h1>
        <span className="count">{rows.length}곳</span>
        <div className="right">
          <Link className="act solid" href="/admin/organizations/new">
            기관 등록
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <b>등록된 기관이 없습니다</b>
          계약이 성사된 학과를 등록하면 여기에 표시됩니다. 대학을 먼저 만들고 그
          아래에 학과를 붙이는 순서를 권합니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>코드</th>
                <th>기관명</th>
                <th>유형</th>
                <th>국가</th>
                <th>소속 대학</th>
                <th style={{ textAlign: "right" }}>계정</th>
                <th>상태</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.code}</td>
                  <td>
                    <Link href={`/admin/organizations/${r.id}`}>
                      {names.get(r.id) ?? <span style={{ color: "var(--muted)" }}>이름 없음</span>}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`tag ${r.org_type === "university" ? "univ" : "dept"}`}
                    >
                      {TYPE_LABEL[r.org_type] ?? r.org_type}
                    </span>
                  </td>
                  <td className="mono">{r.country}</td>
                  <td>
                    {r.parent_id ? (
                      (names.get(r.parent_id) ?? "—")
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td className="num">{Number(r.member_count).toLocaleString("ko-KR")}</td>
                  <td>
                    <span className={`tag ${r.status}`}>
                      {r.status === "active" ? "정상" : r.status}
                    </span>
                  </td>
                  <td className="mono">{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
