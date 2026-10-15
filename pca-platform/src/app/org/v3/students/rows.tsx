"use client";

import { useActionState } from "react";
import {
  retakeAction, rotateAction, setStatusAction, type ManageState,
} from "./actions";
import type { StudentRow } from "@/lib/campus/manage";

const EMPTY: ManageState = {};

const ATTEMPT_KO: Record<StudentRow["attempt"], string> = {
  none: "미응시", in_progress: "진행중", scored: "완료",
};

/**
 * 한 줄에 붙는 일 셋(규격 §25).
 *
 * **긴 표 하나로 끝내지 않는다.** 담당자가 이 화면에서 실제로 하는 일은
 * 비밀번호를 다시 내고, 계정을 끄고 켜고, 재응시를 열어 주는 셋이다.
 * 그 셋이 그 줄에 붙어 있어야 학생 한 명을 찾아 그 자리에서 끝낸다.
 *
 * **되돌릴 수 없는 일에는 다시 묻는다**(규격 §13). 비밀번호를 다시 내면
 * 학생이 들고 있던 열쇠가 그 자리에서 죽는다.
 */
export default function StudentRows(
  { rows, deptName }: { rows: StudentRow[]; deptName: (c: string) => string },
) {
  const [state, run, pending] = useActionState(
    async (prev: ManageState, form: FormData): Promise<ManageState> => {
      const kind = String(form.get("kind") ?? "");
      if (kind === "rotate") return rotateAction(prev, form);
      if (kind === "retake") return retakeAction(prev, form);
      return setStatusAction(prev, form);
    }, EMPTY);

  return (
    <>
      {state.err ? <p className="sf-note is-bad" role="alert">{state.err}</p> : null}
      {state.ok ? <p className="sf-note is-ok" role="status">{state.ok}</p> : null}
      {/* **한 번만 보여 주는 자리.** 이 화면을 벗어나면 다시 볼 수 없고,
          DB 에는 해시만 남는다 */}
      {state.issued?.length ? (
        <div className="sf-issued">
          <b>새 비밀번호 — 이 화면에서만 보입니다</b>
          <ul>
            {state.issued.map((x) => (
              <li key={x.login_id}>
                <span>{x.login_id}</span>
                <code>{x.password}</code>
              </li>
            ))}
          </ul>
          <small>학생에게 전한 뒤 이 화면을 닫아 주세요. 다시 보려면 한 번 더 발급해야 합니다.</small>
        </div>
      ) : null}

      <div className="sf-tw">
        <table className="sf-table">
          <thead>
            <tr>
              <th scope="col">이름</th>
              <th scope="col">학번</th>
              <th scope="col">학과</th>
              <th scope="col">계정</th>
              <th scope="col">응시</th>
              <th scope="col">완료일</th>
              <th scope="col">할 일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id}>
                <th scope="row" className="sf-strong">{r.name}</th>
                <td>{r.student_id}</td>
                <td>{deptName(r.department_code)}</td>
                <td>
                  <span className={`sf-pill${r.account === "active" ? "" : " is-off"}`}>
                    {r.account === "active" ? "사용 중"
                      : r.account === "erased" ? "파기됨" : "멈춤"}
                  </span>
                </td>
                <td>
                  <span className={`sf-pill is-${r.attempt}`}>{ATTEMPT_KO[r.attempt]}</span>
                </td>
                <td>{r.completed_at ?? "—"}</td>
                <td className="sf-rowacts">
                  <form action={run}>
                    <input type="hidden" name="kind" value="rotate" />
                    <input type="hidden" name="user_id" value={r.user_id} />
                    <button type="submit" className="sf-mini" disabled={pending}
                      onClick={(e) => {
                        if (!confirm(
                          `${r.name} 학생의 비밀번호를 다시 냅니다.\n`
                          + "지금 들고 있는 비밀번호는 그 자리에서 쓸 수 없게 됩니다.",
                        )) e.preventDefault();
                      }}>비밀번호 재발급</button>
                  </form>
                  <form action={run}>
                    <input type="hidden" name="kind" value="status" />
                    <input type="hidden" name="user_id" value={r.user_id} />
                    <input type="hidden" name="on" value={r.account === "active" ? "0" : "1"} />
                    <button type="submit" className="sf-mini" disabled={pending || r.account === "erased"}>
                      {r.account === "active" ? "계정 멈추기" : "다시 열기"}
                    </button>
                  </form>
                  {r.attempt === "scored" ? (
                    <form action={run}>
                      <input type="hidden" name="kind" value="retake" />
                      <input type="hidden" name="user_id" value={r.user_id} />
                      <button type="submit" className="sf-mini" disabled={pending}>
                        재응시 열기
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
