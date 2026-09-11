import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { contractsOf, orgsOf, sessionsOf } from "@/lib/org";

export const metadata = { title: "기관 담당자 — METRI" };

/**
 * 교수와 담당자가 같은 문으로 들어오지만 할 일이 다르다.
 *   담당자(org_admin) — 회차를 열고, 명단을 올리고, 공개를 승인한다
 *   교수(instructor)  — 진행 상황과 단체 리포트를 읽는다
 */
export default async function OrgHome() {
  const user = await requireRole(["org_admin", "instructor"]);
  const isAdmin = user.role === "org_admin";

  const orgs = await orgsOf(user.id);
  const orgIds = orgs.map((o) => o.id);
  const [sessions, contracts] = await Promise.all([sessionsOf(orgIds), contractsOf(orgIds)]);
  const seatsFree = contracts.reduce((a, c) => a + c.seatsFree, 0);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">METRI</span>
        <div className="who">
          <span>
            {user.name} · {ROLE_LABEL[user.role]}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="main">
        <h1 className="page-h1">
          {isAdmin ? "인재개발원 · 대학일자리플러스 담당자" : "학과 교수"}
        </h1>
        <p className="page-sub">
          {orgs.length > 0 ? orgs.map((o) => o.name).join(" · ") : "소속 기관이 없습니다."}
          {isAdmin
            ? " — 회차를 열고 명단을 올리면 학생이 바로 응시합니다. 결과지는 공개를 누르셔야 학생에게 보입니다."
            : " — 담당자가 연 회차의 진행 상황과 단체 리포트를 봅니다."}
        </p>

        <div className="statrow">
          <div className="stat">
            <span>열린 회차</span>
            <b>{sessions.length}</b>
          </div>
          <div className="stat">
            <span>남은 좌석</span>
            <b>{seatsFree}</b>
          </div>
          <div className="stat">
            <span>채점 완료</span>
            <b>{sessions.reduce((a, s) => a + s.scored, 0)}</b>
          </div>
        </div>

        {isAdmin && (
          <p className="page-note" style={{ marginTop: 18 }}>
            {contracts.length > 0 ? (
              <Link className="act solid" href="/org/sessions/new">
                회차 열기
              </Link>
            ) : (
              <span className="notice warn">
                활성 계약이 없어 회차를 열 수 없습니다. 운영사에 계약 등록을 요청하세요.
              </span>
            )}
          </p>
        )}

        {sessions.length === 0 ? (
          <div className="empty" style={{ marginTop: 24 }}>
            <b>아직 회차가 없습니다</b>
            {isAdmin ? "회차를 열고 명단을 올리면 여기에 진행 상황이 뜹니다." : "담당자가 회차를 열면 여기에 표시됩니다."}
          </div>
        ) : (
          <ul className="sesslist">
            {sessions.map((s) => (
              <li key={s.id}>
                <div className="sess-name">
                  <b>{s.name}</b>
                  <span>
                    {new Date(s.opensAt).toLocaleDateString("ko-KR")} –{" "}
                    {new Date(s.closesAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <div className="sess-prog">
                  <span className="sess-bar">
                    <span
                      style={{ width: s.enrolled ? `${(s.scored / s.enrolled) * 100}%` : "0%" }}
                    />
                  </span>
                  <span className="sess-num">
                    {s.scored} / {s.enrolled}
                  </span>
                </div>
                <span className={`sess-tag ${s.releasedAt ? "on" : ""}`}>
                  {s.releasedAt ? "공개됨" : "공개 전"}
                </span>
                <Link className="act small" href={`/org/sessions/${s.id}`}>
                  열기
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
