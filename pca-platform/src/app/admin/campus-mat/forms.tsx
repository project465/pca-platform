"use client";

import { useActionState } from "react";
import { closePoolAction, createPoolAction, type PoolState } from "./actions";

const EMPTY: PoolState = {};

export function NewPool({ schools, until }: {
  schools: { code: string; name: string }[];
  /** 기본으로 채울 마지막 날(오늘부터 1년) */
  until: string;
}) {
  const [state, run, pending] = useActionState(createPoolAction, EMPTY);
  return (
    <form className="sf-filters" action={run}>
      {state.err ? <p className="sf-note is-bad" role="alert">{state.err}</p> : null}
      {state.ok ? <p className="sf-note is-ok" role="status">{state.ok}</p> : null}
      <label className="sf-field">
        <span>학교</span>
        <select name="university" required defaultValue="">
          <option value="" disabled>학교를 고르세요</option>
          {schools.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
        </select>
      </label>
      <label className="sf-field">
        <span>이용권</span>
        <select name="product" defaultValue="CAMPUS_MAT_12M">
          <option value="CAMPUS_MAT_6M">MAT 6개월 (1인당 19,000원 계약)</option>
          <option value="CAMPUS_MAT_12M">MAT 1년 (1인당 29,000원 계약)</option>
        </select>
      </label>
      <label className="sf-field">
        <span>인원</span>
        <input type="number" name="seats" min={1} max={20000} required placeholder="예: 120" />
      </label>
      <label className="sf-field">
        <span>담당자가 열 수 있는 마지막 날</span>
        <input type="date" name="grant_until" required defaultValue={until} />
      </label>
      <label className="sf-field">
        <span>메모 (계약 번호 등)</span>
        <input type="text" name="memo" maxLength={300} />
      </label>
      <button type="submit" className="sf-btn accent" disabled={pending}>
        {pending ? "넣는 중…" : "인원 넣기"}
      </button>
    </form>
  );
}

export function ClosePool({ id }: { id: string }) {
  const [state, run, pending] = useActionState(closePoolAction, EMPTY);
  return (
    <form action={run}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="sf-mini" disabled={pending}
        onClick={(e) => {
          if (!confirm("이 묶음을 닫습니다. 담당자가 더는 학생에게 열 수 없습니다.\n이미 연 학생의 기간은 그대로입니다.")) e.preventDefault();
        }}>닫기</button>
      {state.err ? <small role="alert"> {state.err}</small> : null}
    </form>
  );
}
