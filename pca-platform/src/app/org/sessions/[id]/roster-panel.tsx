"use client";

import { useActionState, useState } from "react";
import { uploadRoster, type RosterState } from "../../actions";

/**
 * 명단 붙여넣기.
 *
 * 임시 비밀번호는 만든 직후 한 번만 보여준다. 저장하지 않으므로 이 화면을
 * 닫으면 다시 볼 수 없고 재발급만 된다 — 평문을 DB 에 남기지 않기 위해서다.
 * 담당자가 그 사실을 모르면 낭패를 보므로 화면에 그대로 적는다.
 */
export default function RosterPanel({
  sessionId,
  seatsFree,
}: {
  sessionId: string;
  seatsFree: number;
}) {
  const [state, action, pending] = useActionState<RosterState, FormData>(uploadRoster, {});
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const r = state.result;

  return (
    <section className="roster-panel">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="page-h2" style={{ margin: 0 }}>
          명단 올리기
        </h2>
        <button type="button" className="act small" onClick={() => setOpen(!open)}>
          {open ? "닫기" : "붙여넣기"}
        </button>
      </div>

      {open && (
        <form action={action} className="roster-form">
          <input type="hidden" name="sessionId" value={sessionId} />

          <label className="field">
            <span>엑셀 파일 (.xlsx) 또는 CSV</span>
            <input
              type="file"
              name="file"
              accept=".xlsx,.xlsm,.csv,.tsv,.txt"
              onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
            />
            <span className="help">
              첫 줄의 머리글에서 <b>이름</b>과 <b>학번·이메일</b> 칸을 찾습니다. 열 순서는
              맞추지 않으셔도 되고, 다른 칸이 섞여 있어도 됩니다.
            </span>
          </label>

          <label className="field">
            <span>또는 붙여넣기 — 한 줄에 한 명</span>
            <textarea
              name="roster"
              rows={6}
              placeholder={"홍길동, 2021001234\n김이박, student@univ.ac.kr"}
            />
            <span className="help">
              남은 좌석 {seatsFree}개. 이미 있는 계정은 다시 만들지 않고 이 회차에만 붙입니다.
            </span>
          </label>

          <button type="submit" className="act solid" disabled={pending}>
            {pending ? "만드는 중…" : file ? `${file} 올리기` : "계정 만들기"}
          </button>
        </form>
      )}

      {state.error && (
        <p className="notice warn" role="alert">
          {state.error}
        </p>
      )}

      {r && (
        <div className="roster-result">
          <p className="notice">
            새 계정 {r.created.length}개 · 기존 계정 {r.reused}개 · 건너뜀 {r.skipped.length}개
            {r.columns && (
              <>
                {" "}
                — <b>{r.columns.name}</b> 칸을 이름으로, <b>{r.columns.ident}</b> 칸을 학번으로
                읽었습니다.
              </>
            )}
          </p>

          {r.created.length > 0 && (
            <>
              <p className="page-note">
                <b>임시 비밀번호는 지금 한 번만 보입니다.</b> 저장하지 않으므로 이 화면을 닫으면
                다시 볼 수 없고 재발급만 됩니다. 복사해서 학생에게 전달하세요.
              </p>
              <div className="tablewrap">
                <table className="roster">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>아이디</th>
                      <th>임시 비밀번호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.created.map((c) => (
                      <tr key={c.loginId}>
                        <td>{c.name}</td>
                        <td className="mono">{c.loginId}</td>
                        <td className="mono">{c.tempPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {r.skipped.length > 0 && (
            <ul className="skiplist">
              {r.skipped.map((s, i) => (
                <li key={i}>
                  <code>{s.line}</code> — {s.why}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
