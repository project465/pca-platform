"use client";

import { campusSay } from "@/lib/campus/words";
import { useActionState } from "react";
import { addAction, type ManageState } from "./actions";

const EMPTY: ManageState = {};

/**
 * 학생 한 명 추가(규격 §3·§25).
 *
 * **접어 둔다.** 이 화면에서 자주 하는 일은 찾아보는 쪽이고 추가는 가끔
 * 이다. 펼쳐 두면 폼이 목록보다 먼저 읽힌다.
 *
 * **비밀번호는 한 번만 보여 준다.** DB 에는 해시만 남는다.
 */
export default function AddStudent(
  { leaves, prefix = "", agency = false }: {
    leaves: { code: string; name: string }[]; prefix?: string;
    /** 기관(진흥원 등)이면 학생 · 학번 · 학과를 기관 낱말로 적는다 */
    agency?: boolean;
  },
) {
  const t = campusSay(agency ? { org_kind: "agency" } : null);
  const [state, run, pending] = useActionState(addAction, EMPTY);
  return (
    <details className="sf-fold">
      <summary>{t("학생 한 명 추가")}</summary>
      <form action={run} className="sf-form">
        {state.err ? <p className="sf-note is-bad" role="alert">{state.err}</p> : null}
        {state.ok ? <p className="sf-note is-ok" role="status">{state.ok}</p> : null}
        {state.issued?.length ? (
          <div className="sf-issued">
            <b>새 비밀번호 — 이 화면에서만 보입니다</b>
            <ul>
              {state.issued.map((x) => (
                <li key={x.login_id}><span>{x.login_id}</span><code>{x.password}</code></li>
              ))}
            </ul>
          </div>
        ) : null}
        <label className="sf-field">
          <span>{t("학번")}</span>
          <input name="student_id" required />
        </label>
        <label className="sf-field">
          <span>이름</span>
          <input name="name" required />
        </label>
        <label className="sf-field">
          <span>{t("학과")}</span>
          <select name="department_code" required defaultValue="">
            <option value="" disabled>고르세요</option>
            {leaves.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>
        <label className="sf-field">
          <span>메일 주소 <em>(없어도 됩니다)</em></span>
          <input name="email" type="email" />
        </label>
        {/* **아이디를 비워 두면 학번이 아이디다**(학교 코드 머리가 붙는 학교는
            `ku-학번`). 학교가 학번을 아이디로 못 쓰게 하는 날에만 따로 적는다 */}
        <label className="sf-field">
          <span>로그인 아이디 <em>(비우면 {prefix ? `${prefix}${t("학번")}` : t("학번")})</em></span>
          <input name="login_id" />
        </label>
        <button className="sf-btn" type="submit" disabled={pending}>
          {pending ? "만드는 중…" : "계정 만들기"}
        </button>
      </form>
    </details>
  );
}
