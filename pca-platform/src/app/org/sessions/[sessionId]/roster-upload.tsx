"use client";

import { useActionState, useState, useTransition } from "react";
import { CHUNK_SIZE, type IssueResult, type RosterEntry } from "@/lib/roster-types";
import { issueAction, previewRosterAction, type PreviewState } from "./actions";

const initial: PreviewState = {};

/**
 * 명단 올리기 → 확인 → 발급.
 *
 * 발급을 한 요청에 몰아넣지 않고 CHUNK_SIZE 명씩 끊어 부른다. 비밀번호 해싱이
 * 1건당 0.4초라 100명이면 40초인데, 그동안 화면이 멈춰 있으면 사람은 새로고침을
 * 누른다. 끊어서 부르면 어디까지 됐는지 보이고, 중간에 실패해도 그 지점을 안다.
 */
export default function RosterUpload({ sessionId }: { sessionId: string }) {
  const [preview, previewFormAction, previewing] = useActionState(previewRosterAction, initial);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<IssueResult[]>([]);
  const [issuedCount, setIssuedCount] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const entries = preview.entries ?? [];
  // 새로 만들 계정만 응시권을 쓴다. 이미 명단에 있는 사람은 세지 않는다.
  const needSeats = Math.max(0, entries.length - (preview.alreadyIn ?? 0));
  const shortSeats =
    typeof preview.freeSeats === "number" && needSeats > preview.freeSeats
      ? needSeats - preview.freeSeats
      : 0;
  const canIssue = entries.length > 0 && !finished && shortSeats === 0;

  function issueAll() {
    setFailure(null);
    setDone([]);
    setIssuedCount(0);

    startTransition(async () => {
      const acc: IssueResult[] = [];
      for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        const res = await issueAction({ sessionId, entries: chunk });
        if (res.message) {
          setFailure(`${i + 1}번째부터 멈췄습니다 — ${res.message}`);
          break;
        }
        acc.push(...(res.results ?? []));
        setDone([...acc]);
        setIssuedCount(acc.length);
      }
      setFinished(true);
    });
  }

  const created = done.filter((d) => d.tempPassword);

  return (
    <div className="roster-upload">
      <form action={previewFormAction} className="inline-form">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="file" name="file" accept=".xlsx,.csv,.tsv,.txt" required />
        <button className="act" type="submit" disabled={previewing || pending}>
          {previewing ? "읽는 중…" : "명단 읽기"}
        </button>
      </form>
      <p className="help" style={{ marginTop: 8 }}>
        엑셀(.xlsx) · CSV · TSV 를 읽습니다. 첫 줄에 <b>학번 · 이름 · 이메일</b> 머리글이 있으면
        그대로 알아봅니다. 이메일은 없어도 됩니다.
      </p>

      {preview.message ? <div className="notice error" style={{ marginTop: 12 }}>{preview.message}</div> : null}

      {preview.errors && preview.errors.length > 0 ? (
        <div className="notice error" style={{ marginTop: 12 }}>
          <b>읽지 못한 줄 {preview.errors.length}개</b>
          <ul style={{ margin: "6px 0 0 16px" }}>
            {preview.errors.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {preview.errors.length > 10 ? <li>… 외 {preview.errors.length - 10}개</li> : null}
          </ul>
        </div>
      ) : null}

      {entries.length > 0 ? (
        <div className="preview">
          <div className="preview-head">
            <b>{preview.fileName}</b>
            <span>
              읽은 사람 {entries.length}명
              {preview.alreadyIn ? ` · 이미 명단에 있는 사람 ${preview.alreadyIn}명` : ""}
              {typeof preview.freeSeats === "number" ? ` · 남은 응시권 ${preview.freeSeats}개` : ""}
            </span>
          </div>

          <div className="table-wrap" style={{ maxHeight: 260, overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>줄</th>
                  <th>학번</th>
                  <th>이름</th>
                  <th>이메일</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 200).map((e: RosterEntry) => (
                  <tr key={e.loginId}>
                    <td className="mono">{e.line}</td>
                    <td className="mono">{e.loginId}</td>
                    <td>{e.name}</td>
                    <td className="mono">{e.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length > 200 ? (
            <p className="help">앞 200명만 보여줍니다. 발급은 {entries.length}명 전부 진행합니다.</p>
          ) : null}

          {shortSeats > 0 ? (
            <div className="notice error" style={{ marginTop: 10 }}>
              응시권이 {shortSeats}개 모자랍니다. 남은 것은 {preview.freeSeats}개인데 새로 발급할
              계정은 {needSeats}명입니다. 운영사에 계약 좌석을 늘려달라고 요청하세요.
            </div>
          ) : null}

          <div className="req-foot">
            <button className="act solid" type="button" onClick={issueAll} disabled={!canIssue || pending}>
              {pending
                ? `발급 중… ${issuedCount}/${entries.length}`
                : finished
                  ? "발급 완료"
                  : `${entries.length}명 계정 발급`}
            </button>
            {pending ? (
              <span className="help">
                한 사람씩 비밀번호를 만드느라 시간이 걸립니다. 이 화면을 닫지 마세요.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {failure ? <div className="notice error" style={{ marginTop: 12 }}>{failure}</div> : null}

      {done.length > 0 ? (
        <div className="issued">
          <div className="preview-head">
            <b>발급 결과</b>
            <span>
              새 계정 {created.length}명 · 기존 계정 {done.length - created.length}명
            </span>
          </div>
          {created.length > 0 ? (
            <>
              <p className="help" style={{ marginBottom: 8 }}>
                임시 비밀번호는 <b>지금 이 화면에서만</b> 볼 수 있습니다. 저장해 두지 않습니다.
                인쇄하거나 옮겨 적어 학생에게 전달하세요. 학생은 첫 로그인에서 반드시 바꿉니다.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>학번</th>
                      <th>이름</th>
                      <th>임시 비밀번호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {created.map((d) => (
                      <tr key={d.loginId}>
                        <td className="mono">{d.loginId}</td>
                        <td>{d.name}</td>
                        <td className="mono" style={{ fontSize: 15, fontWeight: 700 }}>
                          {d.tempPassword}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="req-foot">
                <button className="act" type="button" onClick={() => window.print()}>
                  인쇄
                </button>
              </div>
            </>
          ) : (
            <p className="help">모두 이미 있던 계정입니다. 비밀번호는 바꾸지 않았습니다.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
