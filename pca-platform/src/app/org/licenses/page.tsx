import LogoutButton from "@/components/logout-button";
import OrgNav from "@/components/org-nav";
import { requireRole } from "@/lib/session";
import { orgsOf } from "@/lib/org";
import { query } from "@/lib/db";

export const metadata = { title: "좌석 · Careermetri" };

type Row = {
  contract_id: number; title: string; ends_on: string;
  allowed_report_levels: string[];
  available: number; invited: number; claimed: number;
  started: number; completed: number; revoked: number; expired: number;
};

/**
 * 좌석.
 *
 * **초대를 쓴 좌석으로 세지 않는다.** 초대만 보내 놓고 아무도 안 들어온 날,
 * 쓴 좌석 숫자가 틀리면 기관이 돈을 더 냈다고 생각한다. 쓴 것은 응시를
 * 시작한 것부터다.
 */
export default async function Licenses() {
  const user = await requireRole(["org_admin", "instructor"]);
  const orgs = await orgsOf(user.id);
  const rows = orgs.length
    ? await query<Row>(
        `SELECT c.id AS contract_id, c.title, c.ends_on::text, c.allowed_report_levels,
                count(*) FILTER (WHERE s.status='available')::int AS available,
                count(*) FILTER (WHERE s.status='invited')::int   AS invited,
                count(*) FILTER (WHERE s.status='claimed')::int   AS claimed,
                count(*) FILTER (WHERE s.status='started')::int   AS started,
                count(*) FILTER (WHERE s.status='completed')::int AS completed,
                count(*) FILTER (WHERE s.status='revoked')::int   AS revoked,
                count(*) FILTER (WHERE s.status='expired')::int   AS expired
           FROM contracts c LEFT JOIN seats s ON s.contract_id = c.id
          WHERE c.org_id = $1
          GROUP BY c.id, c.title, c.ends_on, c.allowed_report_levels
          ORDER BY c.ends_on DESC`,
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
        <OrgNav current="/org/licenses" />
        <h1 className="page-h1">좌석</h1>
        <p className="page-sub">
          쓴 좌석은 응시를 시작한 것부터 셉니다. 초대만 보낸 것은 아직 쓴
          것이 아닙니다.
        </p>
        {rows.length === 0 ? (
          <p className="empty">계약이 없습니다.</p>
        ) : (
          rows.map((r) => {
            const used = r.started + r.completed;
            const total = r.available + r.invited + r.claimed + used + r.revoked + r.expired;
            return (
              <section key={r.contract_id} className="card">
                <h2>{r.title}</h2>
                <p className="muted">
                  {r.ends_on} 까지 ·{" "}
                  {r.allowed_report_levels.length
                    ? r.allowed_report_levels.join(" · ")
                    : "등급 미지정"}
                </p>
                <dl className="stat-row">
                  <div><dt>계약</dt><dd>{total}</dd></div>
                  <div><dt>쓴 것</dt><dd>{used}</dd></div>
                  <div><dt>남은 것</dt><dd>{total - used - r.revoked - r.expired}</dd></div>
                  <div><dt>초대함</dt><dd>{r.invited}</dd></div>
                  <div><dt>받음</dt><dd>{r.claimed}</dd></div>
                  <div><dt>끝남</dt><dd>{r.completed}</dd></div>
                  <div><dt>거둠</dt><dd>{r.revoked}</dd></div>
                </dl>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
