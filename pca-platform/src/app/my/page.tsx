import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { requireRole } from "@/lib/session";
import { myAttempts } from "@/lib/report";

export const metadata = { title: "내 검사 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ready: "응시 전",
  in_progress: "응시 중",
  submitted: "채점 대기",
  scored: "채점 완료",
};

export default async function StudentHome() {
  const user = await requireRole(["student"]);
  const rows = await myAttempts(user.id, user.locale);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">단체 PCA</span>
        <div className="who">
          <span>{user.name} 님</span>
          <LogoutButton />
        </div>
      </header>
      <main className="main">
        <div className="page-head">
          <h1>내 검사</h1>
          {rows.length > 0 ? <span className="count">{rows.length}건</span> : null}
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <b>아직 응시할 검사가 없습니다</b>
            학과에서 회차를 열고 명단에 포함되면 여기에 표시됩니다.
          </div>
        ) : (
          <ul className="req-list">
            {rows.map((r) => (
              <li key={r.attempt_id} className="req">
                <div className="req-head">
                  <b>{r.session_name}</b>
                  <span className={`state ${r.released ? "ok" : ""}`}>
                    {r.released ? "결과 공개" : (STATUS_LABEL[r.status] ?? r.status)}
                  </span>
                </div>

                {r.can_take ? (
                  <div className="req-meta">
                    응시 기간 {r.window} · 문항 {r.question_count}개
                    {r.answered_count > 0 ? ` · ${r.answered_count}개 응답함` : ""}
                  </div>
                ) : null}

                {r.released && r.top_job_name ? (
                  <div className="req-meta">
                    가장 가까운 직무 <b>{r.top_job_name}</b> · {Number(r.top_score)}점
                  </div>
                ) : r.status === "scored" ? (
                  <div className="req-meta">채점은 끝났고 학과 담당자의 공개를 기다리는 중입니다.</div>
                ) : null}

                <div className="req-foot">
                  {r.released ? (
                    <Link className="act solid" href={`/my/report/${r.attempt_id}`}>
                      결과지 보기
                    </Link>
                  ) : null}
                  {r.can_take ? (
                    <Link className="act solid" href={`/exam/${r.attempt_id}`}>
                      {r.status === "in_progress" ? "이어서 응시하기" : "응시하기"}
                    </Link>
                  ) : null}
                  {r.status === "submitted" ? (
                    <span className="help">제출했습니다. 채점을 기다리는 중입니다.</span>
                  ) : null}
                  {!r.can_take && r.status === "ready" ? (
                    <span className="help">{r.window_note}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* 검사와 별개로 언제든 들어갈 수 있는 자리. 결과지가 없어도 멘토는 만날 수 있다. */}
        <section className="cross-link">
          <div>
            <b>현직자에게 직접 묻기</b>
            <p>
              석·박사 현직자에게 30분 화상 멘토링을 신청할 수 있습니다. 멘토는 익명이고,
              승낙되면 줌 링크가 자동으로 발송됩니다.
            </p>
          </div>
          <Link className="act" href="/mentoring">
            현멘 둘러보기
          </Link>
        </section>
      </main>
    </div>
  );
}
