"use client";

import { useActionState, useState } from "react";
import { APPLICANT_STAGE_LABEL } from "@/lib/anon";
import { applyAction, type ApplyState } from "./actions";
import PayLauncher from "./pay-launcher";

const initial: ApplyState = {};

export type SlotOption = { id: string; label: string };

/**
 * 신청 폼. 질문은 짧게 쓰도록 유도한다 — 30분 세션에서 답할 수 있는 분량이어야
 * 하고, 길게 쓰라고 하면 신청 자체를 포기한다.
 */
export default function ApplyForm({
  handle,
  slots,
  minutes,
  price,
  clientKey,
  dryRun,
}: {
  handle: string;
  slots: SlotOption[];
  minutes: number;
  /** 이 사람이 내야 하는 금액. 학과 계약 학생은 null */
  price: number | null;
  clientKey: string | null;
  dryRun: boolean;
}) {
  const [state, formAction, pending] = useActionState(applyAction, initial);
  const [question, setQuestion] = useState("");
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const err = state.errors ?? {};

  if (state.pay) {
    return <PayLauncher pay={state.pay} clientKey={clientKey} dryRun={dryRun} />;
  }

  if (slots.length === 0) {
    return (
      <div className="notice">
        지금 열린 시간대가 없습니다. 멘토가 시간대를 열면 여기에 표시됩니다.
      </div>
    );
  }

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="handle" value={handle} />

      <div className="field">
        <label>시간대 고르기</label>
        <div className="slots">
          {slots.map((s) => (
            <label key={s.id} className={`slot ${slotId === s.id ? "on" : ""}`}>
              <input
                type="radio"
                name="slotId"
                value={s.id}
                checked={slotId === s.id}
                onChange={() => setSlotId(s.id)}
              />
              {s.label}
            </label>
          ))}
        </div>
        <span className="help" style={err.slotId ? { color: "var(--gap)" } : undefined}>
          {err.slotId ?? `한 번에 ${minutes}분입니다. 한국 시간 기준입니다.`}
        </span>
      </div>

      <div className="field">
        <label htmlFor="applicantStage">지금 내 단계</label>
        <select id="applicantStage" name="applicantStage" defaultValue="phd_student">
          {Object.entries(APPLICANT_STAGE_LABEL).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <span className="help">
          석사 1학기와 박사 수료생에게 할 말이 다릅니다. 멘토가 답의 높이를 맞추는 데 씁니다.
        </span>
      </div>

      <div className="field">
        <label htmlFor="question">무엇을 묻고 싶은가</label>
        <textarea
          id="question"
          name="question"
          rows={5}
          maxLength={600}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            "세 줄이면 충분합니다.\n① 전공과 연구 주제  ② 고민(진로·이직·진학)  ③ 멘토에게 듣고 싶은 것"
          }
          aria-invalid={err.question ? true : undefined}
        />
        <span className="help" style={err.question ? { color: "var(--gap)" } : undefined}>
          {err.question ?? `${question.length}/600자 · 멘토는 이 질문만 보고 승낙을 판단합니다`}
        </span>
      </div>

      {state.message ? <div className="notice error">{state.message}</div> : null}

      <button className="act solid" type="submit" disabled={pending}>
        {pending
          ? "신청 중…"
          : price === null
            ? "이 시간대로 신청"
            : `${price.toLocaleString("ko-KR")}원 결제하고 신청`}
      </button>
      <span className="help">
        {price === null
          ? "학과 계약으로 무료입니다. "
          : "멘토가 거절하거나 24시간 안에 답하지 않으면 자동으로 취소되고 청구되지 않습니다. "}
        승낙되면 줌 회의가 자동으로 만들어지고 링크가 바로 발송됩니다.
      </span>
    </form>
  );
}
