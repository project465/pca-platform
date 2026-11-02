"use client";

import { campusSay } from "@/lib/campus/words";
import { startTransition, useActionState, useEffect, useRef } from "react";
import IssuedCard from "./issued";
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
  { leaves, agency = false, phone = false }: {
    leaves: { code: string; name: string; ready?: boolean }[]; prefix?: string;
    /** 아이디가 휴대전화 번호인 기관인가(`login_mode`) */
    phone?: boolean;
    /** 기관(진흥원 등)이면 학생 · 학번 · 학과를 기관 낱말로 적는다 */
    agency?: boolean;
  },
) {
  const t = campusSay(agency ? { org_kind: "agency" } : null);
  const [state, run, pending] = useActionState(addAction, EMPTY);
  /* **적은 값을 오류 때 지우지 않는다**(2026-11-01 시험: 제출하면 값이 사라졌다). `action` 으로
     넘기면 React 가 결과가 오면 폼을 비운다. 직접 보내고, **만들어졌을 때만** 비운다 */
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.issued?.length) form.current?.reset(); }, [state]);
  return (
    <details className="sf-fold">
      <summary>{t("학생 한 명 추가")}</summary>
      <form ref={form} className="sf-form"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => run(fd));
        }}>
        {state.err ? <p className="sf-note is-bad" role="alert">{state.err}</p> : null}
        {state.ok ? <p className="sf-note is-ok" role="status">{state.ok}</p> : null}
        {state.issued?.length ? <IssuedCard issued={state.issued} /> : null}
        <label className="sf-field">
          <span>{phone ? "휴대전화 번호" : t("학번")} <em>(아이디와 처음 비밀번호가 됩니다)</em></span>
          <input name="student_id" required inputMode={phone ? "tel" : undefined} placeholder={phone ? "010-1234-5678" : undefined} />
        </label>
        <label className="sf-field">
          <span>이름</span>
          <input name="name" required />
        </label>
        <label className="sf-field">
          <span>{t("학과")}</span>
          <select name="department_code" required defaultValue="">
            <option value="" disabled>고르세요</option>
            {/* **응시할 수 없는 학과는 고르는 순간 알린다**(2026-11-02 운영 시험: 담당자는 등록했는데 학생은 응시를 못 했다) */}
            {leaves.map((l) => <option key={l.code} value={l.code}>{l.name}{l.ready === false ? t(" · 아직 응시 준비 중") : ""}</option>)}
          </select>
        </label>
        <label className="sf-field">
          <span>메일 주소 <em>(없어도 됩니다)</em></span>
          <input name="email" type="email" />
        </label>
        {/* **아이디는 학번 · 전화번호다**(2026-11-02 대표 결정). 따로 적는 칸을 두지 않는다: 둘이 갈리면 학생이
            무엇으로 들어오는지 담당자도 모른다. 학생은 첫 로그인 때 비밀번호를 바꾼다 */}
        <button className="sf-btn" type="submit" disabled={pending}>
          {pending ? "만드는 중…" : "계정 만들기"}
        </button>
      </form>
    </details>
  );
}
