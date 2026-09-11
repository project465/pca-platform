import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { canManage, canRead, rosterOf, ROSTER_PAGE } from "@/lib/org";
import { query, queryOne } from "@/lib/db";
import RosterPanel from "./roster-panel";
import ReissueButton from "./reissue-button";
import { release } from "../../actions";

export const metadata = { title: "회차 — METRI" };

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { id } = await params;
  const sp = await searchParams;
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

  const view = await rosterOf(id, {
    q: sp.q,
    status: sp.status,
    page: Number(sp.page) || 1,
  });

  const scored = view.counts.scored;
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
            <b>{view.counts.all}</b>
          </div>
          <div className="stat">
            <span>응시 중·제출</span>
            <b>{view.counts.inProgress}</b>
          </div>
          <div className="stat">
            <span>채점 완료</span>
            <b>{scored}</b>
          </div>
          <div className="stat">
            <span>재확인 권고</span>
            <b>{view.counts.flagged}</b>
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

        {view.counts.all > 0 && (
          <>
            {/* 자바스크립트 없이 도는 GET 폼. 주소에 남아 새로고침·공유가 된다 */}
            <form className="rosterfind" method="get">
              <input
                type="search"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="이름 또는 학번으로 찾기"
                maxLength={60}
                aria-label="명단 검색"
              />
              <select name="status" defaultValue={sp.status ?? "all"} aria-label="상태로 거르기">
                <option value="all">전체 {view.counts.all}</option>
                <option value="not_started">아직 시작 안 함 {view.counts.notStarted}</option>
                <option value="in_progress">응시 중·제출 {view.counts.inProgress}</option>
                <option value="scored">채점 완료 {view.counts.scored}</option>
                <option value="flagged">재확인 권고 {view.counts.flagged}</option>
              </select>
              <button type="submit" className="act">
                찾기
              </button>
              {(sp.q || (sp.status && sp.status !== "all")) && (
                <Link className="act" href={`/org/sessions/${s.id}`}>
                  지우기
                </Link>
              )}
              <span className="rosterfind-num">
                {view.matched === view.counts.all
                  ? `${view.counts.all}명`
                  : `${view.counts.all}명 중 ${view.matched}명`}
              </span>
            </form>
          </>
        )}

        {view.counts.all === 0 ? (
          <div className="empty">
            <b>명단이 비어 있습니다</b>
            위에 이름과 학번을 붙여 넣거나 엑셀을 올리면 계정이 한 번에 만들어집니다.
          </div>
        ) : view.rows.length === 0 ? (
          <div className="empty">
            <b>찾는 학생이 없습니다</b>
            검색어나 상태를 바꿔 보세요.
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
                  {manage && <th>비밀번호</th>}
                </tr>
              </thead>
              <tbody>
                {view.rows.map((r) => (
                  <tr key={r.userId}>
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
                    {manage && (
                      <td>
                        <ReissueButton sessionId={s.id} studentId={r.userId} name={r.name} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view.pages > 1 && (
          <nav className="pager">
            {Array.from({ length: view.pages }, (_, i) => i + 1).map((n) => {
              const qs = new URLSearchParams();
              if (sp.q) qs.set("q", sp.q);
              if (sp.status && sp.status !== "all") qs.set("status", sp.status);
              if (n > 1) qs.set("page", String(n));
              const href = qs.toString() ? `/org/sessions/${s.id}?${qs}` : `/org/sessions/${s.id}`;
              return (
                <Link key={n} href={href} className={n === view.page ? "on" : ""}>
                  {n}
                </Link>
              );
            })}
            <span className="pager-num">
              {(view.page - 1) * ROSTER_PAGE + 1}–{Math.min(view.page * ROSTER_PAGE, view.matched)} / {view.matched}
            </span>
          </nav>
        )}
      </main>
    </div>
  );
}
