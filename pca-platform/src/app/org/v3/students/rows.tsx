"use client";

import { campusSay } from "@/lib/campus/words";
import { useActionState } from "react";
import {
  matAction, retakeAction, rotateAction, setStatusAction, type ManageState,
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
  { rows, deptNames, agency = false, matUntil = {}, matPool = null }: {
    rows: StudentRow[];
    /** 학생마다 MAT 이 열려 있는 마지막 날. 없으면 칸이 비어 있다 */
    matUntil?: Record<string, string>;
    /**
     * 줄마다 붙는 `MAT 열기` 가 쓰는 이용권. 지금 열 수 있는 것 가운데
     * 첫째다. 없으면 단추가 서지 않는다(여러 묶음 가운데 고르는 일은 위
     * 판의 한꺼번에 열기가 한다)
     */
    matPool?: { id: string; name: string } | null;
    /** 기관(진흥원 등)이면 학생 · 학번 · 학과를 기관 낱말로 적는다 */
    agency?: boolean;
    /**
     * 학과 코드 → 담당자가 읽는 이름.
     *
     * **함수를 받지 않는다.** 서버 컴포넌트의 함수를 그대로 받으면 Next 가
     * 직렬화하지 못해 이 쪽이 통째로 500 이 된다. 이름을 푸는 자리는 그대로
     * 등록부 하나이고(`campusNames`), 여기로 오는 것은 이 묶음에 쓸 이름뿐이다.
     */
    deptNames: Record<string, string>;
  },
) {
  const t = campusSay(agency ? { org_kind: "agency" } : null);
  const [state, run, pending] = useActionState(
    async (prev: ManageState, form: FormData): Promise<ManageState> => {
      const kind = String(form.get("kind") ?? "");
      if (kind === "rotate") return rotateAction(prev, form);
      if (kind === "retake") return retakeAction(prev, form);
      if (kind === "mat") return matAction(prev, form);
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
          <b>새 비밀번호 (이 화면에서만 보입니다)</b>
          <ul>
            {state.issued.map((x) => (
              <li key={x.login_id}>
                <span>{x.login_id}</span>
                <code>{x.password}</code>
              </li>
            ))}
          </ul>
          <small>{t("학생에게")} 전한 뒤 이 화면을 닫아 주세요. 다시 보려면 한 번 더 발급해야 합니다.</small>
        </div>
      ) : null}

      <div className="sf-tw">
        <table className="sf-table">
          <thead>
            <tr>
              <th scope="col">이름</th>
              <th scope="col">{t("학번")}</th>
              <th scope="col">{t("학과")}</th>
              <th scope="col">계정</th>
              <th scope="col">응시</th>
              <th scope="col">완료일</th>
              <th scope="col">MAT</th>
              <th scope="col">할 일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id}>
                <th scope="row" className="sf-strong">{r.name}</th>
                <td>{r.student_id}</td>
                <td>{deptNames[r.department_code] ?? r.department_code}</td>
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
                <td>{matUntil[r.user_id] ? `${matUntil[r.user_id]}까지` : "—"}</td>
                <td className="sf-rowacts">
                  <form action={run}>
                    <input type="hidden" name="kind" value="rotate" />
                    <input type="hidden" name="user_id" value={r.user_id} />
                    <button type="submit" className="sf-mini" disabled={pending}
                      onClick={(e) => {
                        if (!confirm(
                          `${r.name} ${t("학생")}의 비밀번호를 다시 냅니다.\n`
                          + "지금 쓰는 비밀번호는 바로 쓸 수 없게 됩니다.",
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
                  {/* 이미 열린 학생에게는 다시 세우지 않는다. 누르면 `이미 열려
                      있습니다` 만 돌아오는 단추는 고장으로 읽힌다 */}
                  {matPool && r.account === "active" && !matUntil[r.user_id] ? (
                    <form action={run}>
                      <input type="hidden" name="kind" value="mat" />
                      <input type="hidden" name="user_id" value={r.user_id} />
                      <input type="hidden" name="pool_id" value={matPool.id} />
                      <button type="submit" className="sf-mini" disabled={pending}
                        onClick={(e) => {
                          if (!confirm(
                            `${r.name} ${t("학생")}에게 ${matPool.name} 을 엽니다.\n`
                            + "학교가 산 인원에서 한 명이 줄고, 되돌릴 수 없습니다.",
                          )) e.preventDefault();
                        }}>MAT 열기</button>
                    </form>
                  ) : null}
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
