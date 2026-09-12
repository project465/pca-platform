import Link from "next/link";
import { requireRole } from "@/lib/session";
import { inquiryList, KIND_LABEL, type InquiryKind } from "@/lib/inquiry";
import AdminShell from "@/components/admin-shell";
import AnswerForm from "./answer-form";

export const metadata = { title: "문의 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/**
 * 들어온 문의.
 *
 * 메일 주소만 열어두면 놓친 문의가 어디에 있는지 아무도 모른다.
 * 답한 것과 안 답한 것이 여기서 갈린다.
 */
export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const user = await requireRole(["superadmin"]);
  const showAll = (await searchParams).all === "1";
  const rows = await inquiryList(!showAll);
  const open = rows.filter((r) => r.status === "open").length;

  return (
    <AdminShell user={user} current="/admin/inquiries">
      <div className="page-head">
        <h1>문의</h1>
        <span className="count">답변 대기 {open}건</span>
        <div className="right">
          <Link className="act" href={showAll ? "/admin/inquiries" : "/admin/inquiries?all=1"}>
            {showAll ? "대기 중만 보기" : "처리한 것도 보기"}
          </Link>
        </div>
      </div>

      <p className="help" style={{ marginBottom: 18, maxWidth: "64ch" }}>
        답장은 적혀 있는 이메일로 직접 보내고, 여기서는 처리했다는 표시만 남깁니다.
        결제나 세션 문제는 먼저 봅니다.
      </p>

      {rows.length === 0 ? (
        <div className="empty">
          <b>{showAll ? "문의가 없습니다" : "답변을 기다리는 문의가 없습니다"}</b>
          <Link href="/mentoring/contact">문의 화면</Link>에서 로그인 없이도 남길 수 있습니다.
        </div>
      ) : (
        <ul className="req-list">
          {rows.map((r) => (
            <li key={r.id} className="req">
              <div className="req-head">
                <b>{KIND_LABEL[r.kind as InquiryKind] ?? r.kind}</b>
                <span className={`state ${r.status === "open" ? "wait" : ""}`}>
                  {r.status === "open" ? "답변 대기" : "답변함"}
                </span>
                <span className="mono muted">{r.created_at}</span>
              </div>
              <div className="req-meta">
                {r.name} · <a href={`mailto:${r.email}`}>{r.email}</a>
                {r.user_name ? ` · 회원 ${r.user_name}` : " · 비회원"}
                {r.from_path ? ` · ${r.from_path}` : ""}
              </div>

              <p className="req-q">{r.message}</p>

              {r.status === "open" ? (
                <div className="req-foot">
                  <AnswerForm inquiryId={r.id} />
                </div>
              ) : (
                <div className="req-meta">
                  {r.answered_at} 처리{r.memo ? ` · ${r.memo}` : ""}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
