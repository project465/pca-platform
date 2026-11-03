"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { uploadForDraft, type UploadState } from "../../me/experience/actions";
import { sayOf, type MatUiLang } from "@/lib/mat/copy";
import { FILES_TEXT as F } from "../mat-text";

/**
 * 경험 파일 올리기(예상 화면 8번). 웹 작업공간과 **같은 서버 동작**(`uploadForDraft`)을 쓴다:
 * 원본을 두지 않고, 읽은 것은 저장되지 않은 초안이며, 학생이 열어 확인하고 저장해야 기록이 된다.
 * 동의 칸을 켜야 고르는 칸이 열린다(파일에는 이름 · 학번 · 생년월일이 찍혀 있다).
 */
export function MatFileDrop({ ready = true, consented, used, cap, pending, lang = "ko" }: {
  lang?: MatUiLang;
  /** 서비스 쪽에서 파일 읽기가 열려 있는가(키). 꺼져 있으면 동의 칸 · 고르는 칸을 막는다 */
  ready?: boolean;
  consented: boolean; used: number; cap: number; pending: { id: string; title: string }[];
}) {
  const t = sayOf(lang);
  const [state, act, busy] = useActionState<UploadState, FormData>(uploadForDraft, null);
  const [agree, setAgree] = useState(consented);
  const form = useRef<HTMLFormElement>(null);
  const left = Math.max(0, cap - (state?.used ?? used));
  const list = state?.ok ? state.drafts : pending;
  const on = ready && agree;
  return (
    <>
      {/* 동의 칸은 폼 **밖**에 둔다: 올린 뒤 폼이 다시 그려져도 체크가 풀리지 않는다(2026-11-02 운영 시험).
          서버로는 아래 숨은 칸이 간다 */}
      {ready && !consented ? (
        <label className="mt-agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>{t(F.agree)}</span>
        </label>
      ) : null}
      <form ref={form} action={act} className="mt-form">
        <input type="hidden" name="consent" value={agree ? "1" : ""} />
        <label className={`mt-drop${on ? "" : " is-off"}`} aria-disabled={!on}>
          <input type="file" name="file" hidden disabled={!on || busy}
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => { if (e.target.files?.length) form.current?.requestSubmit(); }} />
          <b>{!ready ? t(F.dropOff) : busy ? t(F.dropBusy) : agree ? t(F.dropPick) : t(F.dropAgree)}</b>
          <span>{ready ? t(F.dropKinds, { n: left }) : t(F.dropMemo)}</span>
        </label>
      </form>
      {state && !state.ok ? <p className="mt-alert" role="alert">{state.msg}</p> : null}
      {state?.ok ? <p className="mt-note" role="status">{state.msg}</p> : null}

      <h2 className="mt-h2">{t(F.pending)}</h2>
      {list.length ? (
        <div className="mt-list">
          {list.map((d) => (
            <Link key={d.id} href={`/me/experience/new?draft=${d.id}`} className="mt-row mt-row-link">
              <span className="mt-mark is-part" aria-hidden>?</span>
              <div className="mt-row-b"><p>{d.title}</p><small>{t(F.openCheck)}</small></div>
            </Link>
          ))}
        </div>
      ) : <p className="mt-empty">{t(F.noPending)}</p>}
    </>
  );
}
