import LogoutButton from "@/components/logout-button";
import { requireRole } from "@/lib/session";
import { openSessionsFor } from "@/lib/exam";
import { startAction } from "./actions";

export const metadata = { title: "내 검사 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function StudentHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { error } = await searchParams;
  const sessions = await openSessionsFor(user.id);

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
        <div className="page-head"><h1>내 검사</h1></div>

        {error === "eligibility" ? (
          <p className="notice error" role="alert" style={{ marginBottom: 16 }}>
            지금은 이 회차에 응시할 수 없습니다. 기간이 지났거나 소속이 맞지 않습니다.
          </p>
        ) : null}

        {sessions.length === 0 ? (
          <div className="empty">
            <b>아직 응시할 검사가 없습니다</b>
            학과에서 회차를 열면 여기에 표시됩니다.
          </div>
        ) : (
          sessions.map((s) => {
            const total = Number(s.total);
            const doneAt = Number(s.last_order_no ?? 0);
            const submitted = s.status === "submitted" || s.status === "scored";
            const started = s.status === "in_progress";
            return (
              <div className="card" key={s.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 16 }}>{s.name}</b>
                  {submitted ? <span className="tag active">제출 완료</span> : null}
                  <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 13 }}>
                    {s.closes_at} 까지
                  </span>
                </div>
                <p className="help" style={{ color: "var(--muted)", fontSize: 13.5, margin: "6px 0 14px" }}>
                  문항 {total}개
                  {started && doneAt > 0 ? ` · ${doneAt}번까지 답하셨습니다` : ""}
                  {submitted ? " · 결과는 담당자 확인 후 공개됩니다" : ""}
                </p>
                <form action={startAction.bind(null, s.id)}>
                  <button className="act solid" disabled={total === 0}>
                    {submitted ? "응시 내용 보기" : started ? "이어서 응시하기" : "응시 시작"}
                  </button>
                  {total === 0 ? (
                    <span className="help" style={{ marginLeft: 10, color: "var(--muted)" }}>
                      문항이 아직 준비되지 않았습니다
                    </span>
                  ) : null}
                </form>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
