import LogoutButton from "@/components/logout-button";
import OrgNav from "@/components/org-nav";
import { requireRole } from "@/lib/session";
import { orgsOf } from "@/lib/org";
import { query } from "@/lib/db";

export const metadata = { title: "기수 · Careermetri" };

type Row = {
  id: number; name: string; description: string | null;
  starts_on: string | null; ends_on: string | null; members: number;
};

/**
 * 기수.
 *
 * **학과와 다른 축이다.** 같은 학과가 해마다 여러 기수를 돌리고, 한 기수에
 * 여러 학과가 섞이기도 한다. 회차(`test_sessions`)는 언제 열고 닫는가이고
 * 기수는 누구 묶음인가라, 둘을 한 표에 담으면 다시 쓸 수 없다.
 */
export default async function Cohorts() {
  const user = await requireRole(["org_admin", "instructor"]);
  const orgs = await orgsOf(user.id);
  const rows = orgs.length
    ? await query<Row>(
        `SELECT c.id, c.name, c.description, c.starts_on::text, c.ends_on::text,
                count(m.user_id)::int AS members
           FROM cohorts c LEFT JOIN cohort_members m ON m.cohort_id = c.id
          WHERE c.org_id = $1
          GROUP BY c.id ORDER BY c.starts_on DESC NULLS LAST, c.id DESC`,
        [orgs[0].id],
      )
    : [];

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Careermetri</span>
        <div className="who"><span>{user.name}</span><LogoutButton /></div>
      </header>
      <main className="main">
        <OrgNav current="/org/cohorts" />
        <h1 className="page-h1">기수</h1>
        <p className="page-sub">
          회차는 언제 열고 닫는가이고 기수는 누구 묶음인가입니다. 같은 학과가
          해마다 여러 기수를 돌릴 수 있습니다.
        </p>
        {rows.length === 0 ? (
          <p className="empty">아직 기수가 없습니다.</p>
        ) : (
          <table className="table">
            <thead><tr><th>이름</th><th>기간</th><th>인원</th><th>설명</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.starts_on ?? "—"} ~ {r.ends_on ?? "—"}</td>
                  <td>{r.members}</td>
                  <td>{r.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
