"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createSessionAction, releaseSessionAction, type LinkState } from "./actions";
import type { ExamSession } from "@/lib/org-links";

const initial: LinkState = {};

/** 오늘과 한 달 뒤 */
function defaults() {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return { start: iso(new Date()), end: iso(end) };
}

/** 결과 공개. 제출한 사람이 없으면 누를 것이 없다 */
function ReleaseButton({ sessionId, disabled }: { sessionId: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(releaseSessionAction, initial);
  return (
    <form action={formAction} style={{ display: "inline" }}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <button className="act small" disabled={pending || disabled}
              title={disabled ? "제출한 응시가 없습니다" : undefined}>
        {pending ? "공개 중…" : "결과 공개"}
      </button>
      {state.message ? (
        <span className="help" style={{ color: "var(--gap)", marginLeft: 8 }}>{state.message}</span>
      ) : null}
    </form>
  );
}

export default function SessionsPanel({
  orgId,
  sessions,
  instruments,
  canManage,
}: {
  orgId: string;
  sessions: ExamSession[];
  instruments: { id: string; label: string }[];
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(createSessionAction, initial);
  const [open, setOpen] = useState(false);
  const err = state.errors ?? {};
  const d = defaults();

  return (
    <section style={{ marginBottom: 32 }}>
      <div className="page-head">
        <h2 style={{ fontSize: 16 }}>회차</h2>
        <span className="count">{sessions.length}개</span>
        {canManage ? (
          <div className="right">
            <button type="button" className="act" onClick={() => setOpen((v) => !v)}>
              {open ? "닫기" : "회차 열기"}
            </button>
          </div>
        ) : null}
      </div>

      {state.ok ? <p className="notice ok" role="status">{state.ok}</p> : null}
      {state.message && !open ? <p className="notice error" role="alert">{state.message}</p> : null}

      {open ? (
        <form action={formAction} className="form" style={{ maxWidth: 520, marginBottom: 16 }}>
          <input type="hidden" name="orgId" value={orgId} />
          {state.message ? <p className="notice error full" role="alert">{state.message}</p> : null}

          <div className="field full">
            <label htmlFor="s-name">회차 이름</label>
            <input id="s-name" name="name" placeholder="2026-1학기 기계공학과 3학년" required />
            {err.name ? <span className="help" style={{ color: "var(--gap)" }}>{err.name}</span> : null}
          </div>

          <div className="field full">
            <label htmlFor="s-inst">검사지</label>
            <select id="s-inst" name="instrumentId" defaultValue="" required>
              <option value="" disabled>— 고르세요 —</option>
              {instruments.map((it) => (
                <option key={it.id} value={it.id}>{it.label}</option>
              ))}
            </select>
            {instruments.length === 0 ? (
              <span className="help">
                쓸 수 있는 검사지가 없습니다. 운영사가 문항을 넣고 공개해야 고를 수 있습니다.
              </span>
            ) : null}
            {err.instrumentId ? <span className="help" style={{ color: "var(--gap)" }}>{err.instrumentId}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="s-open">시작일</label>
            <input id="s-open" name="opensOn" type="date" defaultValue={d.start} required />
            {err.opensOn ? <span className="help" style={{ color: "var(--gap)" }}>{err.opensOn}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="s-close">종료일</label>
            <input id="s-close" name="closesOn" type="date" defaultValue={d.end} required />
            {err.closesOn ? <span className="help" style={{ color: "var(--gap)" }}>{err.closesOn}</span> : null}
          </div>

          <div className="actions full">
            <button className="act solid" disabled={pending || instruments.length === 0}>
              {pending ? "여는 중…" : "회차 열기"}
            </button>
          </div>
        </form>
      ) : null}

      {sessions.length === 0 ? (
        <div className="empty">
          <b>아직 연 회차가 없습니다</b>
          회차를 열어야 학생이 전용 링크로 들어와 검사를 볼 수 있습니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회차</th>
                <th>기간</th>
                <th style={{ textAlign: "right" }}>문항</th>
                <th style={{ textAlign: "right" }}>응시 시작</th>
                <th style={{ textAlign: "right" }}>제출</th>
                <th>결과</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="mono">{s.opens_at} — {s.closes_at}</td>
                  <td className="num">{Number(s.total).toLocaleString("ko-KR")}</td>
                  <td className="num">{Number(s.started).toLocaleString("ko-KR")}</td>
                  <td className="num">{Number(s.submitted).toLocaleString("ko-KR")}</td>
                  <td>
                    {s.released_at ? (
                      <span className="tag active">{s.released_at} 공개</span>
                    ) : canManage ? (
                      <ReleaseButton sessionId={s.id} disabled={Number(s.submitted) === 0} />
                    ) : (
                      <span className="tag">미공개</span>
                    )}
                  </td>
                  <td>
                    <Link className="act small" href={`/org/report/${s.id}`}>단체 리포트</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
