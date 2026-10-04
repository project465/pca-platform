import LogoutButton from "@/components/logout-button";
import OrgNav from "@/components/org-nav";
import { requireRole } from "@/lib/session";
import { orgsOf } from "@/lib/org";
import { participants } from "@/lib/insights";

export const metadata = { title: "참여자 · Careermetri" };

const STATUS_KO: Record<string, string> = {
  not_started: "시작 전", ready: "시작 전", in_progress: "진행 중",
  submitted: "제출함", scored: "채점 끝",
};
const SEAT_KO: Record<string, string> = {
  available: "미배정", invited: "초대함", claimed: "받음",
  started: "응시 중", completed: "끝남", expired: "기간 지남", revoked: "거둠",
};

/**
 * 참여자 표.
 *
 * **결과지 내용은 한 줄도 없다.** 담당자가 여기서 보는 것은 프로그램을
 * 굴리는 데 필요한 상태뿐이다. 누가 무엇이라고 답했는지는 본인 것이다.
 */
export default async function Participants() {
  const user = await requireRole(["org_admin", "instructor"]);
  const orgs = await orgsOf(user.id);
  const rows = orgs.length ? await participants(Number(orgs[0].id)) : [];

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Careermetri</span>
        <div className="who"><span>{user.name}</span><LogoutButton /></div>
      </header>
      <main className="main">
        <OrgNav current="/org/participants" />
        <h1 className="page-h1">참여자</h1>
        <p className="page-sub">
          프로그램을 굴리는 데 필요한 상태만 보여 드립니다. 개인 결과지는
          본인에게만 열립니다.
        </p>
        {rows.length === 0 ? (
          <p className="empty">아직 참여자가 없습니다.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>이름</th><th>학번</th><th>기수</th>
                <th>좌석</th><th>응시</th><th>마지막 활동</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id}>
                  <td>{r.display_name}</td>
                  <td>{r.login_id ?? "—"}</td>
                  <td>{r.cohort ?? "—"}</td>
                  <td>{r.seat_status ? SEAT_KO[r.seat_status] ?? r.seat_status : "—"}</td>
                  <td>{STATUS_KO[r.assessment_status] ?? r.assessment_status}</td>
                  <td>{r.last_activity ? r.last_activity.slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
