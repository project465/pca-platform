"use client";

import { useActionState } from "react";
import { addParticipant, type AddState } from "./actions";

export default function AddParticipant({ programs }: { programs: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState<AddState, FormData>(addParticipant, {});
  return (
    <form action={action} className="sj-form">
      <div className="sj-grid c3">
        <div className="sj-field"><label htmlFor="name">이름</label><input id="name" name="name" type="text" required /></div>
        <div className="sj-field"><label htmlFor="participant_no">참여번호</label>
          <input id="participant_no" name="participant_no" type="text" placeholder="예: SJ-A-021" required /></div>
        <div className="sj-field"><label htmlFor="program">사업</label>
          <select id="program" name="program">{programs.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select></div>
      </div>
      {state.error ? <p className="sj-error" role="alert">{state.error}</p> : null}
      {state.issued ? (
        <div className="sj-note" role="status">
          <b>{state.issued.name}</b> 계정을 만들었습니다. 아이디 <code>{state.issued.login}</code> · 임시 비밀번호 <code>{state.issued.password}</code>
          <br />이 비밀번호는 지금 한 번만 보입니다. 첫 로그인에서 바꾸게 됩니다.
        </div>
      ) : null}
      <div><button className="sj-btn" type="submit" disabled={pending}>{pending ? "만드는 중…" : "계정 발급"}</button></div>
    </form>
  );
}
