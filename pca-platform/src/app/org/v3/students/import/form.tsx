"use client";

import { campusSay } from "@/lib/campus/words";
import Link from "next/link";
import { useActionState } from "react";
import { applyAction, previewAction, type ImportState } from "../actions";
import IssuedCard from "../issued";

const EMPTY: ImportState = {};

/**
 * CSV 등록(규격 §14). **올리고 → 미리 보고 → 적용한다.**
 *
 * 미리 보기에서는 **아무것도 쓰지 않는다.** 담당자가 쉰 줄짜리 명단을
 * 올렸을 때 그 가운데 어느 줄이 왜 거절되는지를 먼저 보여 주고, 고칠지
 * 그대로 적용할지는 사람이 정한다.
 *
 * **오류 줄에서 멈추지 않는다.** 한 줄이 틀렸다고 전부를 되돌리면 그
 * 파일을 몇 번이고 다시 올린다.
 */
export default function ImportForm({ agency = false, phone = false, example = "" }: {
  agency?: boolean;
  /** 아이디가 휴대전화 번호인 기관인가(`login_mode`) */
  phone?: boolean;
  /** 이 기관 등록부의 실제 학과 코드 하나(붙여 넣기 예시) */
  example?: string;
}) {
  /* 기관(진흥원 등)이면 학생 · 학번 · 학과를 기관 낱말로 적는다 */
  const t = campusSay(agency ? { org_kind: "agency" } : null);
  const [state, run, pending] = useActionState(
    async (prev: ImportState, form: FormData): Promise<ImportState> =>
      (String(form.get("step") ?? "") === "apply"
        ? applyAction(prev, form) : previewAction(prev, form)), EMPTY);

  const pre = state.preview;
  const ok = pre?.rows.filter((r) => r.ok) ?? [];
  const bad = pre?.rows.filter((r) => !r.ok) ?? [];
  const fresh = ok.filter((r) => !r.existing).length;

  return (
    <>
      {state.err ? <p className="sf-note is-bad" role="alert">{state.err}</p> : null}

      {/* ① 올리기 */}
      {!state.done ? (
        <form action={run} className="sf-form">
          <input type="hidden" name="step" value="preview" />
          <label className="sf-field">
            <span>CSV 파일</span>
            <input type="file" name="file" accept=".csv,text/csv" />
          </label>
          <label className="sf-field">
            <span>또는 내용을 붙여 넣기</span>
            <textarea name="csv" rows={5}
              placeholder={phone ? `이름,휴대전화 번호,전공 계열 코드\n홍길동,010-1234-5678,${example}` : `학번,이름,학과 코드\n20260001,홍길동,${example}`} />
          </label>
          <p className="sf-meta">
            <a href="/org/v3/students/import/template.csv">양식 파일 내려받기</a>{" · "}
            {phone
              ? "머리글은 이름 · 휴대전화 번호 · 전공 계열 코드입니다. 아이디와 처음 비밀번호는 휴대전화 번호(숫자만)가 됩니다."
              : `머리글은 ${t("학번")} · 이름 · ${t("학과")} 코드입니다. 아이디와 처음 비밀번호는 ${t("학번")}이 됩니다.`}
            {" "}{t("학과")} 칸에는 코드 대신 이름을 적어도 됩니다. 메일은 있으면 함께 읽습니다. 아래 표에서 코드를 찾을 수 있어요.
          </p>
          <button className="sf-btn" type="submit" disabled={pending}>
            {pending ? "읽는 중…" : "미리 보기"}
          </button>
        </form>
      ) : null}

      {/* ② 미리 보기 */}
      {pre && !state.done ? (
        <section className="sf-section">
          <div className="sf-section-h">
            <h2 className="sf-h2">미리 보기</h2>
            <span className="sf-meta">
              새로 만들 {fresh}명 · {t("학과만")} 맞출 {ok.length - fresh}명 · 거절 {bad.length}줄
            </span>
          </div>

          {bad.length ? (
            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th scope="col">줄</th><th scope="col">{t("학번")}</th>
                    <th scope="col">이름</th><th scope="col">거절한 까닭</th>
                  </tr>
                </thead>
                <tbody>
                  {bad.map((r) => (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>{r.input.student_id || "—"}</td>
                      <td>{r.input.name || "—"}</td>
                      <td>{r.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sf-note is-ok" role="status">거절된 줄이 없습니다.</p>
          )}

          <form action={run} className="sf-form">
            <input type="hidden" name="step" value="apply" />
            <input type="hidden" name="text" value={pre.text} />
            <p className="sf-meta">
              정상인 {ok.length}줄만 적용합니다. 거절된 줄은 건너뜁니다.
              {" "}이미 있는 {t("학생은")} <b>{t("학과만")} 맞추고 비밀번호는 그대로</b> 둡니다.
            </p>
            <button className="sf-btn" type="submit"
              disabled={pending || !ok.length}>
              {pending ? "적용하는 중…" : `${ok.length}줄 적용`}
            </button>
          </form>
        </section>
      ) : null}

      {/* ③ 적용 결과 */}
      {state.done ? (
        <section className="sf-section">
          <div className="sf-section-h">
            <h2 className="sf-h2">적용했습니다</h2>
            <span className="sf-meta">
              만듦 {state.done.created} · 고침 {state.done.updated} ·
              {" "}거절 {state.done.rejected.length}
            </span>
          </div>
          {state.issued?.length ? <IssuedCard issued={state.issued} /> : null}
          {state.done.rejected.length ? (
            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th scope="col">줄</th><th scope="col">{t("학번")}</th>
                    <th scope="col">거절한 까닭</th>
                  </tr>
                </thead>
                <tbody>
                  {state.done.rejected.map((r) => (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>{r.input.student_id || "—"}</td>
                      <td>{r.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p style={{ marginTop: 16 }}>
            <Link className="sf-btn ghost" href="/org/v3/students">{t("학생 목록으로")}</Link>
          </p>
        </section>
      ) : null}
    </>
  );
}
