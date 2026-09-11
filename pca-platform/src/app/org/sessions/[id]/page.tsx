import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { canManage, canRead } from "@/lib/org";
import { query, queryOne } from "@/lib/db";
import RosterPanel from "./roster-panel";
import { release } from "../../actions";

export const metadata = { title: "회차 — METRI" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { id } = await params;
  if (!(await canRead(user.id, id))) notFound();
  const manage = await canManage(user.id, id);

  const s = await queryOne<{
    id: string;
    name: string;
    opens_at: string;
    closes_at: string;
    release_mode: string;
    released_at: string | null;
    seats_free: number;
  }>(
    `SELECT ts.id, ts.name, ts.opens_at, ts.closes_at, ts.release_mode, ts.released_at,
            (SELECT count(*)::int FROM seats se
              WHERE se.contract_id = ts.contract_id AND se.user_id IS NULL) AS seats_free
       FROM test_sessions ts WHERE ts.id = $1`,
    [id],
  );
  if (!s) notFound();

  const roster = await query<{
    name: string;
    ident: string;
    status: string;
    answered: number;
    total: number;
    flag: string | null;
  }>(
    `SELECT u.display_name AS name,
            COALESCE(u.login_id, u.email) AS ident,
            a.status,
            (SELECT count(*)::int FROM responses r WHERE r.attempt_id = a.id) AS answered,
            (SELECT count(*)::int FROM questions q WHERE q.instrument_id = ts.instrument_id) AS total,
            q.flag
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN test_sessions ts ON ts.id = a.session_id
       LEFT JOIN attempt_quality q ON q.attempt_id = a.id
      WHERE a.session_id = $1
      ORDER BY (a.status = 'scored') DESC, u.display_name`,
    [id],
  );

  const scored = roster.filter((r) => r.status === "scored").length;
  const label: Record<string, string> = {
    ready: "시작 전",
    in_progress: "응시 중",
    submitted: "제출됨",
    scored: "채점 완료",
  };

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/org">
          METRI
        </Link>
        <div className="who">
          <span>{user.name}</span>
        </div>
      </header>

      <main className="main">
        <h1 className="page-h1">{s.name}</h1>
        <p className="page-sub">
          {new Date(s.opens_at).toLocaleDateString("ko-KR")} –{" "}
          {new Date(s.closes_at).toLocaleDateString("ko-KR")} · 남은 좌석 {s.seats_free}
          {s.release_mode === "instant"
            ? " · 채점되는 대로 자동 공개"
            : s.released_at
              ? ` · ${new Date(s.released_at).toLocaleDateString("ko-KR")} 공개됨`
              : " · 공개 전"}
        </p>

        <div className="statrow">
          <div className="stat">
            <span>명단</span>
            <b>{roster.length}</b>
          </div>
          <div className="stat">
            <span>응시 중·제출</span>
            <b>{roster.filter((r) => r.status === "in_progress" || r.status === "submitted").length}</b>
          </div>
          <div className="stat">
            <span>채점 완료</span>
            <b>{scored}</b>
          </div>
          <div className="stat">
            <span>재확인 권고</span>
            <b>{roster.filter((r) => r.flag && r.flag !== "ok").length}</b>
          </div>
        </div>

        <div className="row" style={{ marginTop: 18, gap: 10 }}>
          <Link className="act solid" href={`/org/sessions/${s.id}/report`}>
            단체 리포트
          </Link>
          {manage && s.release_mode !== "instant" && !s.released_at && (
            <form action={release}>
              <input type="hidden" name="sessionId" value={s.id} />
              <button type="submit" className="act" disabled={scored === 0}>
                학생에게 결과 공개
              </button>
            </form>
          )}
        </div>
        {manage && s.release_mode !== "instant" && !s.released_at && (
          <p className="page-note">
            공개를 누르기 전까지 학생은 결과지를 볼 수 없습니다. 단체 리포트를 먼저 확인하세요.
          </p>
        )}

        {manage && <RosterPanel sessionId={s.id} seatsFree={s.seats_free} />}

        <h2 className="page-h2">명단과 진행</h2>
        {roster.length === 0 ? (
          <div className="empty">
            <b>명단이 비어 있습니다</b>
            위에 이름과 학번을 붙여 넣으면 계정이 한 번에 만들어집니다.
          </div>
        ) : (
          <div className="tablewrap">
            <table className="roster">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>학번·이메일</th>
                  <th>상태</th>
                  <th>진행</th>
                  <th>신뢰도</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.ident}>
                    <td>{r.name}</td>
                    <td className="mono">{r.ident}</td>
                    <td>{label[r.status] ?? r.status}</td>
                    <td className="mono">
                      {r.answered} / {r.total}
                    </td>
                    <td>
                      {r.flag === "invalid" ? (
                        <span className="flag bad">무효</span>
                      ) : r.flag === "check" ? (
                        <span className="flag warn">재확인</span>
                      ) : r.flag ? (
                        <span className="flag ok">정상</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
