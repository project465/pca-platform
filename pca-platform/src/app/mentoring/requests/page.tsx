import Link from "next/link";
import { requireUser } from "@/lib/session";
import { mentorTitle } from "@/lib/anon";
import { formatSlot, formatWhen } from "@/lib/notify";
import { inboxFor, mentorForUser, requestsByApplicant } from "@/lib/mentoring";
import MentoringShell from "@/components/mentoring-shell";
import RequestCards, { type MyRequest } from "./request-cards";

export const metadata = { title: "내 신청 — 현멘" };
export const dynamic = "force-dynamic";

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; paid?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const [rows, mine, inbox] = await Promise.all([
    requestsByApplicant(user.id),
    mentorForUser(user.id),
    inboxFor(user.id),
  ]);

  const cards: MyRequest[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    question: r.question,
    declineReason: r.decline_reason,
    startsAt: formatSlot(new Date(r.starts_at)),
    respondBy: formatSlot(new Date(r.respond_by)),
    mentorTitle: mentorTitle(r),
    handle: r.handle,
    minutes: r.session_minutes,
    joinUrl: r.join_url,
    passcode: r.passcode,
    provider: r.provider,
    hasReview: r.has_review,
    payStatus: r.pay_status,
    payAmount: r.pay_amount,
    payOrderId: r.pay_order_id,
    // 지난 일정은 취소할 것이 없다
    canCancel:
      ["requested", "accepted"].includes(r.status) && new Date(r.starts_at) > new Date(),
  }));

  return (
    <MentoringShell user={user} current="/mentoring/requests" isMentor={Boolean(mine)}>
      <div className="page-head">
        <h1>내 신청</h1>
        <span className="count">{rows.length}건</span>
        <div className="right">
          <Link className="act" href="/mentoring">
            멘토 둘러보기
          </Link>
        </div>
      </div>

      {sp.applied ? (
        <div className="notice ok" style={{ marginBottom: 18 }}>
          신청이 접수됐습니다. 멘토가 24시간 안에 응답합니다. 승낙되면 줌 링크가 자동으로 발송됩니다.
        </div>
      ) : null}

      {sp.paid ? (
        <div className="notice ok" style={{ marginBottom: 18 }}>
          결제가 끝났습니다. 멘토에게 신청이 전달됐습니다. 거절되거나 24시간 안에 응답이
          없으면 자동으로 취소되고 결제도 함께 취소됩니다.
        </div>
      ) : null}

      {inbox.length > 0 ? (
        <section style={{ marginBottom: 22 }}>
          <h2 className="sec-h first">알림</h2>
          <p className="help" style={{ marginBottom: 10 }}>
            이메일이 등록돼 있지 않은 계정이라 여기에 표시합니다. 최근 5건만 보여줍니다.
            이메일을 등록하면 메일로도 받습니다.
          </p>
          <ul className="inbox">
            {inbox.map((n) => (
              <li key={n.id}>
                <div className="inbox-head">
                  <b>{n.subject}</b>
                  <span className="mono muted">{n.created_at}</span>
                </div>
                <pre>{n.body}</pre>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rows.length === 0 ? (
        <div className="empty">
          <b>아직 신청한 멘토링이 없습니다</b>
          갤러리에서 멘토를 고르고 열린 시간대에 신청하세요.
        </div>
      ) : (
        <RequestCards rows={cards} />
      )}

      <p className="foot-note">표시 시각은 한국 시간({formatWhen(new Date())}) 기준입니다.</p>
    </MentoringShell>
  );
}
