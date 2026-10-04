import LogoutButton from "@/components/logout-button";
import OrgNav from "@/components/org-nav";
import { requireRole } from "@/lib/session";
import { orgsOf } from "@/lib/org";
import { careerDistribution, orgOverview, minCellFor } from "@/lib/insights";

export const metadata = { title: "집계 · Careermetri" };

/**
 * 기관이 보는 집계.
 *
 * **등수를 매기지 않는다.** "학생의 32% 가 CAE 에 적합" 이 아니라
 * "32명이 지금 CAE 를 먼저 살펴보고 있다" 로 적는다. 적합은 이 검사가
 * 만들 수 있는 값이 아니다.
 *
 * **5명 미만 칸은 숫자를 내지 않는다.** 감춘 칸을 0 으로 적지도 않는다.
 * 0 과 '적어서 안 보여 준다' 는 다른 말이다.
 */
export default async function Insights() {
  const user = await requireRole(["org_admin", "instructor"]);
  const orgs = await orgsOf(user.id);
  if (orgs.length === 0) {
    return <main className="main"><p className="empty">소속 기관이 없습니다.</p></main>;
  }
  const orgId = Number(orgs[0].id);
  const [ov, career, minCell] = await Promise.all([
    orgOverview(orgId), careerDistribution(orgId), minCellFor(orgId),
  ]);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Careermetri</span>
        <div className="who"><span>{user.name}</span><LogoutButton /></div>
      </header>
      <main className="main">
        <OrgNav current="/org/insights" />
        <h1 className="page-h1">집계</h1>
        <p className="page-sub">
          개인 결과지는 본인에게만 열립니다. 여기 있는 것은 사람 수뿐이고,
          {minCell}명 미만인 칸은 숫자를 내지 않습니다.
        </p>

        <section className="card">
          <h2>참여</h2>
          <dl className="stat-row">
            <div><dt>계약 좌석</dt><dd>{ov.seats}</dd></div>
            <div><dt>쓴 좌석</dt><dd>{ov.used}</dd></div>
            <div><dt>남은 좌석</dt><dd>{ov.remaining}</dd></div>
            <div><dt>초대함</dt><dd>{ov.invited}</dd></div>
            <div><dt>끝남</dt><dd>{ov.completed}</dd></div>
            <div>
              <dt>끝낸 비율</dt>
              <dd>{ov.completion_rate === null ? "—" : `${ov.completion_rate}%`}</dd>
            </div>
            <div><dt>기수</dt><dd>{ov.cohorts}</dd></div>
          </dl>
          {ov.completion_rate === null && (
            <p className="muted">
              아직 응시를 시작한 분이 없어 비율을 내지 않았습니다.
            </p>
          )}
        </section>

        <section className="card">
          <h2>지금 먼저 살펴보고 있는 직무</h2>
          <p className="muted">{career.note}</p>
          {career.cells.length === 0 ? (
            <p className="empty">아직 채점된 응시가 없습니다.</p>
          ) : (
            <table className="table">
              <thead><tr><th>직무</th><th>사람 수</th></tr></thead>
              <tbody>
                {career.cells.map((c) => (
                  <tr key={c.label}>
                    <td>{c.label}</td>
                    <td>
                      {"hidden" in c
                        ? <span className="muted">{career.min_cell}명 미만이라 내지 않습니다</span>
                        : c.n}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
