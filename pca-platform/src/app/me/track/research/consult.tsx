"use client";

import { useActionState, useState } from "react";
import { requestCareerpeak, type ConsultState } from "./actions";

/**
 * 커리어피크 상담 신청 칸(2026-10-31 대표 결정). 서버가 열려 있다고 본 때만
 * 그려진다(`consultOpen`).
 *
 * **보내는 것과 보내지 않는 것을 단추 위에 적는다.** 동의 칸을 켜야 단추가
 * 열리고, 서버도 동의 값을 다시 본다. 보내는 한 장 요약은 그대로 펼쳐 보여
 * 준다: 무엇이 나가는지 본 다음에 동의한다.
 */
export default function CareerpeakConsult({ docs, preview, name, email, sends, keeps, consentText, sent }: {
  docs: { id: string; title: string }[];
  /** 정리마다 보낼 한 장 요약 */
  preview: Record<string, string>;
  name: string;
  email: string;
  sends: string[];
  keeps: string[];
  consentText: string;
  /** 오늘 이미 보낸 정리 */
  sent: string[];
}) {
  const [state, act, busy] = useActionState<ConsultState, FormData>(requestCareerpeak, null);
  const [doc, setDoc] = useState(docs[0]?.id ?? "");
  const [agree, setAgree] = useState(false);
  const already = sent.includes(doc);

  return (
    <div className="cm-panel is-one cm-cp" id="careerpeak">
      <div className="cm-pane">
        <p className="cm-kicker">커리어피크 상담 신청</p>
        <h3 style={{ marginTop: 4 }}>이 정리로 연구직 · R&amp;D 상담을 받아 보세요</h3>
        <p className="cm-none">
          커리어피크 상담가가 한 장 요약을 읽고, 맞는 연구직 · R&amp;D 자리와 지원 방향을 메일로 알려 드립니다.
          신청하지 않아도 다른 기능은 그대로 쓰실 수 있습니다.
        </p>

        <form action={act} style={{ marginTop: 14 }}>
          {docs.length > 1 ? (
            <label className="cm-field">
              <span>보낼 정리</span>
              <select className="cm-select" name="doc" value={doc} onChange={(e) => { setDoc(e.target.value); setAgree(false); }}>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </label>
          ) : <input type="hidden" name="doc" value={doc} />}

          <details className="cm-cp-sheet">
            <summary>보낼 한 장 요약 펼쳐 보기</summary>
            <pre>{preview[doc] ?? ""}</pre>
          </details>

          <div className="cm-cp-what">
            <div>
              <b>보내는 것</b>
              <ul>{sends.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <b>보내지 않는 것</b>
              <ul>{keeps.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          </div>

          <div className="cm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 14 }}>
            <label className="cm-field">
              <span>이름</span>
              <input className="cm-input" name="name" maxLength={60} defaultValue={name} autoComplete="name" />
            </label>
            <label className="cm-field">
              <span>답을 받을 메일</span>
              <input className="cm-input" name="email" type="email" required maxLength={200} defaultValue={email} autoComplete="email" />
            </label>
            <label className="cm-field">
              <span>전화번호 (적지 않아도 됩니다)</span>
              <input className="cm-input" name="phone" type="tel" maxLength={20} inputMode="tel" autoComplete="tel" placeholder="010-0000-0000" />
            </label>
          </div>

          <label className="cm-check">
            <input type="checkbox" name="consent" value="1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>{consentText}</span>
          </label>

          <div className="cm-acts">
            <button type="submit" className="cm-btn is-primary" disabled={!agree || busy || already || !doc}>
              {busy ? "보내는 중…" : already ? "오늘 신청했습니다" : "커리어피크 상담 신청"}
            </button>
          </div>
          {!agree && !already ? <p className="cm-none">동의 칸을 켜야 단추가 열립니다. 켜지 않으면 아무것도 보내지 않습니다.</p> : null}
        </form>
        {state && !state.ok ? <p className="cm-fail" role="alert">{state.msg}</p> : null}
        {state?.ok ? <p className="cm-none" role="status">{state.msg}</p> : null}
      </div>
    </div>
  );
}
