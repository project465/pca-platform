"use client";

import { useActionState, useState } from "react";
import { contactAction, type ContactState } from "./actions";
import { INQUIRY_KINDS, KIND_HINT, KIND_LABEL, type InquiryKind } from "@/lib/inquiry-types";

const initial: ContactState = {};

export default function ContactForm({
  defaultName,
  defaultEmail,
  defaultKind,
}: {
  defaultName: string;
  defaultEmail: string;
  defaultKind: string;
}) {
  const [state, action, pending] = useActionState(contactAction, initial);
  const [kind, setKind] = useState(defaultKind);
  const v = state.values;

  if (state.ok) {
    return (
      <div className="notice ok">
        <b>{state.ok}</b>
        <br />
        보통 하루 안에 답합니다. 결제나 세션 문제는 먼저 봅니다.
      </div>
    );
  }

  return (
    <form action={action} className="form">
      <input type="hidden" name="fromPath" value="/mentoring/contact" />

      <div className="field">
        <label>무엇 때문에 연락하셨나요</label>
        <div className="kinds">
          {INQUIRY_KINDS.map((k) => (
            <label key={k} className={`kind ${kind === k ? "on" : ""}`}>
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
              />
              {KIND_LABEL[k]}
            </label>
          ))}
        </div>
        <span className="help">{KIND_HINT[kind as InquiryKind] ?? ""}</span>
      </div>

      <div className="field">
        <label htmlFor="name">이름</label>
        <input id="name" name="name" defaultValue={v?.name ?? defaultName} required />
      </div>

      <div className="field">
        <label htmlFor="email">답을 받으실 이메일</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={v?.email ?? defaultEmail}
          required
        />
        <span className="help">이 주소로만 답을 보냅니다. 다른 곳에 쓰지 않습니다.</span>
      </div>

      <div className="field">
        <label htmlFor="message">내용</label>
        <textarea
          id="message"
          name="message"
          rows={7}
          maxLength={4000}
          defaultValue={v?.message ?? ""}
          required
        />
      </div>

      {state.message ? <div className="notice error">{state.message}</div> : null}

      <button className="act solid" type="submit" disabled={pending}>
        {pending ? "보내는 중…" : "문의 남기기"}
      </button>
    </form>
  );
}
