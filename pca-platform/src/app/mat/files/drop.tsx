"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { uploadForDraft, type UploadState } from "../../me/experience/actions";

/**
 * 경험 파일 올리기(예상 화면 8번). 웹 작업공간과 **같은 서버 동작**(`uploadForDraft`)을 쓴다:
 * 원본을 두지 않고, 읽은 것은 저장되지 않은 초안이며, 학생이 열어 확인하고 저장해야 기록이 된다.
 * 동의 칸을 켜야 고르는 칸이 열린다(파일에는 이름 · 학번 · 생년월일이 찍혀 있다).
 */
export function MatFileDrop({ consented, used, cap, pending }: {
  consented: boolean; used: number; cap: number; pending: { id: string; title: string }[];
}) {
  const [state, act, busy] = useActionState<UploadState, FormData>(uploadForDraft, null);
  const [agree, setAgree] = useState(consented);
  const form = useRef<HTMLFormElement>(null);
  const left = Math.max(0, cap - (state?.used ?? used));
  const list = state?.ok ? state.drafts : pending;
  return (
    <>
      <form ref={form} action={act} className="mt-form">
        {!consented ? (
          <label className="mt-agree">
            <input type="checkbox" name="consent" value="1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>파일 내용(이름 · 학번 · 생년월일 포함)을 Anthropic(미국)의 Claude가 읽는 데 동의해요. 원본은 저장하지 않아요.</span>
          </label>
        ) : null}
        <label className={`mt-drop${agree ? "" : " is-off"}`}>
          <input type="file" name="file" hidden disabled={!agree || busy}
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => { if (e.target.files?.length) form.current?.requestSubmit(); }} />
          <b>{busy ? "읽는 중 · 10~30초" : agree ? "파일 고르기" : "동의하면 열려요"}</b>
          <span>성적증명서 · 수료증 · 자격증 · 상장 · PDF · JPG · PNG · 이번 달 {left}번 남음</span>
        </label>
      </form>
      {state && !state.ok ? <p className="mt-alert" role="alert">{state.msg}</p> : null}
      {state?.ok ? <p className="mt-note" role="status">{state.msg}</p> : null}

      <h2 className="mt-h2">확인할 초안</h2>
      {list.length ? (
        <div className="mt-list">
          {list.map((d) => (
            <Link key={d.id} href={`/me/experience/new?draft=${d.id}`} className="mt-row mt-row-link">
              <span className="mt-mark is-part" aria-hidden>?</span>
              <div className="mt-row-b"><p>{d.title}</p><small>열어서 확인하고 저장</small></div>
            </Link>
          ))}
        </div>
      ) : <p className="mt-empty">확인할 초안이 없어요.</p>}
    </>
  );
}
