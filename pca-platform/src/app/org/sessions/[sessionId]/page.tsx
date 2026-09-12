import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canEditSession, canViewSession, orgNameOf, rosterOf, sessionDetail } from "@/lib/org";
import OrgShell from "@/components/org-shell";
import RosterUpload from "./roster-upload";
import ReleaseButton from "./release-button";

export const metadata = { title: "회차 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));

const STATUS_LABEL: Record<string, string> = {
  ready: "응시 전",
  in_progress: "응시 중",
  submitted: "제출",
  scored: "채점 완료",
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  if (!/^\d+$/.test(sessionId)) notFound();
  if (!(await canViewSession(user, sessionId))) notFound();
  const canEdit = await canEditSession(user, sessionId);

  const session = await sessionDetail(sessionId);
  if (!session) notFound();

  const [roster, orgName] = await Promise.all([
    rosterOf(sessionId),
    orgNameOf(session.org_id, user.locale),
  ]);

  const notLoggedIn = roster.filter((r) => r.last_login_at === null).length;
  const canRelease =
    canEdit &&
    session.release_mode === "manual" &&
    session.released_at === null &&
    session.scored > 0;

  return (
    <OrgShell user={user} orgName={orgName}>
      <div className="page-head">
        <h1>{session.name}</h1>
        <span className="count">{session.contract_title}</span>
        <div className="right">
          <Link className="act" href="/org">
            회차 목록
          </Link>
        </div>
      </div>

      <div className="stat-row">
        <div>
          <dt>명단</dt>
          <dd>{session.roster}명</dd>
        </div>
        <div>
          <dt>제출</dt>
          <dd>{session.submitted}명</dd>
        </div>
        <div>
          <dt>채점 완료</dt>
          <dd>{session.scored}명</dd>
        </div>
        <div>
          <dt>첫 로그인 전</dt>
          <dd className={notLoggedIn > 0 ? "warn" : ""}>{notLoggedIn}명</dd>
        </div>
      </div>

      <p className="help" style={{ margin: "10px 0 26px" }}>
        응시 기간 {fmt(session.opens_at)} ~ {fmt(session.closes_at)} ·{" "}
        {session.release_mode === "instant"
          ? "채점되는 대로 학생에게 공개됩니다."
          : session.released_at
            ? `${fmt(session.released_at)}에 결과를 공개했습니다.`
            : "결과는 아래 공개 버튼을 누르기 전까지 학생에게 보이지 않습니다."}
      </p>

      {canEdit ? (
        <>
          <h2 className="sec-h first">명단 올리기</h2>
          <div className="panel">
            <RosterUpload sessionId={sessionId} />
          </div>
        </>
      ) : (
        <div className="notice">
          명단 올리기와 결과 공개는 학과 담당자만 할 수 있습니다. 진행 상황은 아래에서 볼 수 있습니다.
        </div>
      )}

      {canRelease ? (
        <>
          <h2 className="sec-h">결과 공개</h2>
          <div className="panel">
            <ReleaseButton sessionId={sessionId} />
          </div>
        </>
      ) : null}

      <h2 className={`sec-h${canEdit ? "" : " first"}`}>명단 ({roster.length}명)</h2>
      {roster.length === 0 ? (
        <div className="empty">
          <b>아직 명단이 없습니다</b>
          {canEdit
            ? "위에서 엑셀이나 CSV 를 올리면 계정이 한꺼번에 발급됩니다."
            : "학과 담당자가 명단을 올리면 여기에 표시됩니다."}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>학번</th>
                <th>이름</th>
                <th>이메일</th>
                <th>상태</th>
                <th>첫 로그인</th>
                <th>제출</th>
                <th>결과지</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.attempt_id}>
                  <td className="mono">{r.login_id}</td>
                  <td>{r.display_name}</td>
                  <td className="mono">{r.email ?? "—"}</td>
                  <td>
                    <span className={`tag ${r.status === "scored" ? "active" : ""}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="mono">
                    {r.last_login_at ?? (
                      <span style={{ color: "var(--partial)" }}>안 함</span>
                    )}
                  </td>
                  <td className="mono">{r.submitted_at ?? "—"}</td>
                  <td>
                    {r.status === "scored" ? (
                      <Link href={`/my/report/${r.attempt_id}`}>보기</Link>
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
    </OrgShell>
  );
}
