import Link from "next/link";
import { requireRole } from "@/lib/session";
import { reportList } from "@/lib/noshow";
import { payoutSettings } from "@/lib/refund";
import AdminShell from "@/components/admin-shell";
import ResolveForm from "./resolve-form";

export const metadata = { title: "노쇼 신고 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function NoShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;
  const showAll = sp.all === "1";

  const [rows, settings] = await Promise.all([reportList(!showAll), payoutSettings()]);
  const open = rows.filter((r) => r.resolution === null).length;

  return (
    <AdminShell user={user} current="/admin/no-shows">
      <div className="page-head">
        <h1>노쇼 신고</h1>
        <span className="count">판정 대기 {open}건</span>
        <div className="right">
          <Link className="act" href={showAll ? "/admin/no-shows" : "/admin/no-shows?all=1"}>
            {showAll ? "대기 중만 보기" : "판정한 것도 보기"}
          </Link>
        </div>
      </div>

      <p className="help" style={{ marginBottom: 18, maxWidth: "64ch" }}>
        세션이 끝나고 {settings.hold_hours}시간 안에 들어온 신고입니다. 그동안 정산은 잡히지
        않습니다 — 돈이 나간 뒤에는 인정해도 되돌릴 곳이 없기 때문입니다.
        판정 대기 건은 이 화면에서만 멘토와 신청자의 실명이 보입니다.
      </p>

      {rows.length === 0 ? (
        <div className="empty">
          <b>{showAll ? "신고가 없습니다" : "판정을 기다리는 신고가 없습니다"}</b>
          신청자와 멘토 모두 자기 화면에서 신고할 수 있습니다.
        </div>
      ) : (
        <ul className="req-list">
          {rows.map((r) => (
            <li key={r.id} className="req">
              <div className="req-head">
                <b>{r.starts_at}</b>
                <span className={`state ${r.resolution ? "" : "wait"}`}>
                  {r.resolution === "accepted"
                    ? "인정"
                    : r.resolution === "rejected"
                      ? "기각"
                      : "판정 대기"}
                </span>
                <span className="mono muted">{r.handle}</span>
              </div>
              <div className="req-meta">
                {r.against === "mentor" ? "멘토가 안 나왔다는 신고" : "신청자가 안 나왔다는 신고"}
                {" · "}
                신고 {r.created_at} · {r.minutes}분
                {r.amount !== null ? ` · 결제 ${r.amount.toLocaleString("ko-KR")}원` : " · 무료"}
              </div>
              <div className="req-meta">
                멘토 {r.mentor_real_name}({r.alias}) · 신청자 {r.applicant_name} · 신고자{" "}
                {r.reporter_name}
              </div>

              <p className="req-q">{r.note}</p>

              {r.resolution ? (
                r.resolve_note ? (
                  <div className="notice" style={{ marginTop: 10 }}>
                    판정 메모: {r.resolve_note}
                  </div>
                ) : null
              ) : (
                <ResolveForm reportId={r.id} against={r.against} amount={r.amount} />
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
