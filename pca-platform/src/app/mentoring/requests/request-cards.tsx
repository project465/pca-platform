"use client";

import { useActionState } from "react";
import { cancelAction, reviewAction, type RequestActionState } from "./actions";
import NoShowForm from "@/components/no-show-form";
import type { NoShowState } from "@/lib/noshow";

const initial: RequestActionState = {};

export type MyRequest = {
  id: string;
  status: string;
  question: string;
  declineReason: string | null;
  startsAt: string;
  respondBy: string;
  mentorTitle: string;
  handle: string;
  minutes: number;
  joinUrl: string | null;
  passcode: string | null;
  provider: string | null;
  hasReview: boolean;
  canCancel: boolean;
  /** 지금 취소하면 얼마가 돌아오는지. 무료 세션은 null */
  refundNotice: string | null;
  noShow: NoShowState | null;
  payStatus: string | null;
  payAmount: number | null;
  payOrderId: string | null;
};

const PAY_LABEL: Record<string, string> = {
  ready: "결제 대기",
  paid: "결제 완료",
  cancelled: "결제 취소됨",
  failed: "결제 실패",
};

const STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: "멘토 응답 대기", cls: "wait" },
  accepted: { label: "확정", cls: "ok" },
  declined: { label: "거절됨", cls: "no" },
  cancelled: { label: "취소됨", cls: "no" },
  no_show: { label: "노쇼 확인 중", cls: "wait" },
  expired: { label: "기한 초과로 닫힘", cls: "no" },
  completed: { label: "완료", cls: "done" },
};

function CancelButton({ id, refundNotice }: { id: string; refundNotice: string | null }) {
  const [state, action, pending] = useActionState(cancelAction, initial);
  return (
    <form
      action={action}
      className="inline-form"
      onSubmit={(e) => {
        // 되돌릴 수 없고 돈이 걸려 있다. 금액을 한 번 더 보여주고 받는다
        const ask = refundNotice
          ? `${refundNotice}\n취소하시겠습니까?`
          : "취소하시겠습니까?";
        if (!window.confirm(ask)) e.preventDefault();
      }}
    >
      <input type="hidden" name="requestId" value={id} />
      <button className="act" type="submit" disabled={pending}>
        {pending ? "취소 중…" : "취소"}
      </button>
      {refundNotice ? <span className="inline-note">{refundNotice}</span> : null}
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </form>
  );
}

function ReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reviewAction, initial);
  if (state.ok) return <div className="notice ok">{state.ok}</div>;

  return (
    <form action={action} className="review-form">
      <input type="hidden" name="requestId" value={id} />
      <div className="stars">
        {[5, 4, 3, 2, 1].map((n) => (
          <label key={n}>
            <input type="radio" name="rating" value={n} required />
            <span>{"★".repeat(n)}</span>
          </label>
        ))}
      </div>
      <input name="comment" maxLength={500} placeholder="한 줄 후기 (선택)" />
      <button className="act" type="submit" disabled={pending}>
        {pending ? "남기는 중…" : "후기 남기기"}
      </button>
      {state.message ? <span className="inline-err">{state.message}</span> : null}
      {state.errors?.rating ? <span className="inline-err">{state.errors.rating}</span> : null}
    </form>
  );
}

export default function RequestCards({ rows }: { rows: MyRequest[] }) {
  return (
    <ul className="req-list">
      {rows.map((r) => {
        const s = STATUS[r.status] ?? { label: r.status, cls: "" };
        return (
          <li key={r.id} className="req">
            <div className="req-head">
              <b>{r.startsAt}</b>
              <span className={`state ${s.cls}`}>{s.label}</span>
              <span className="mono muted">{r.handle}</span>
            </div>
            <div className="req-meta">
              {r.mentorTitle} · {r.minutes}분
              {r.status === "requested" ? ` · 응답 기한 ${r.respondBy}` : ""}
              {r.payAmount !== null
                ? ` · ${r.payAmount.toLocaleString("ko-KR")}원 ${PAY_LABEL[r.payStatus ?? ""] ?? ""}`
                : ""}
            </div>

            {r.payStatus === "ready" ? (
              <div className="notice" style={{ marginTop: 10 }}>
                아직 결제가 끝나지 않아 멘토에게 전달되지 않았습니다.{" "}
                <a href={`/mentoring/pay/resume?order=${encodeURIComponent(r.payOrderId ?? "")}`}>
                  결제 이어서 하기
                </a>
              </div>
            ) : null}

            <p className="req-q">{r.question}</p>

            {r.status === "accepted" && r.joinUrl ? (
              <div className="join">
                <a className="act solid" href={r.joinUrl} target="_blank" rel="noreferrer">
                  줌으로 참가
                </a>
                {r.passcode ? <span className="help">암호 {r.passcode}</span> : null}
                {r.provider === "dryrun" ? (
                  <span className="help" style={{ color: "var(--partial)" }}>
                    개발용 임시 링크입니다 (ZOOM_DRY_RUN)
                  </span>
                ) : null}
              </div>
            ) : null}

            {r.declineReason ? (
              <div className="notice" style={{ marginTop: 10 }}>
                멘토가 남긴 말: {r.declineReason}
              </div>
            ) : null}

            <div className="req-foot">
              {r.canCancel ? <CancelButton id={r.id} refundNotice={r.refundNotice} /> : null}
              {r.status === "completed" && !r.hasReview ? <ReviewForm id={r.id} /> : null}
              {r.status === "completed" && r.hasReview ? (
                <span className="help">후기를 남겼습니다.</span>
              ) : null}
            </div>

            {r.noShow?.canReport ? (
              <NoShowForm requestId={r.id} who="멘토" until={r.noShow.until} />
            ) : null}
            {r.noShow?.reported ? (
              <div className="notice" style={{ marginTop: 10 }}>
                {r.noShow.resolution === "accepted"
                  ? "노쇼가 인정됐습니다. 결제하신 금액은 전액 환불됩니다."
                  : r.noShow.resolution === "rejected"
                    ? "노쇼 신고가 기각됐습니다. 세션이 열린 것으로 처리됐습니다."
                    : "노쇼 신고를 접수했습니다. 운영사가 확인한 뒤 알려드립니다."}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
