"use client";

import { useRef } from "react";
import { CONSENT } from "@/lib/mat/consent-text";

/**
 * AI 로 읽기 전에 묻는 창(시안 Consent). **'다음부터 묻지 않기' 는 꺼진 채로 연다**(2026-11-03 시안 고침):
 * 켜 두면 한 번 누른 동의가 앞으로의 모든 공고에 쓰인다. 끈 채로 시작하면 이번 한 번만 보낸다.
 *
 * 보이는 것은 무엇을 보내고 무엇을 보내지 않는가 두 줄과 단추 둘뿐이다(화면 문구 규칙 7).
 */
export function AiConsent({
  action, id, title, sub, label,
}: {
  action: (form: FormData) => Promise<void>;
  /** 다시 읽을 분석 번호 */
  id: string;
  /** 공고 이름 */
  title: string;
  /** 회사 · 직무 한 줄 */
  sub?: string | null;
  /** 창을 여는 단추 글자 */
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="mt-btn is-block" onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} className="mt-dialog" aria-labelledby="mt-consent-h">
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          {sub ? <p className="mt-meta">{sub}</p> : null}
          <h3 id="mt-consent-h">{CONSENT.title}</h3>
          <p className="mt-note">{CONSENT.lead(title)}</p>
          <dl className="mt-dl">
            <div><dt>{CONSENT.sees}</dt><dd>{CONSENT.seesBody}</dd></div>
            <div><dt>{CONSENT.notSent}</dt><dd>{CONSENT.notSentBody}</dd></div>
          </dl>
          <p className="mt-note">{CONSENT.where}</p>
          <label className="mt-consent">
            {/* 기본은 꺼짐. 켠 사람만 동의를 저장한다 */}
            <input type="checkbox" name="remember" value="1" defaultChecked={false} />
            <span>{CONSENT.remember}</span>
          </label>
          <button type="submit" className="mt-btn is-main is-block">{CONSENT.go}</button>
          <button type="button" className="mt-btn is-block" style={{ marginTop: 8 }} onClick={() => ref.current?.close()}>
            {CONSENT.cancel}
          </button>
        </form>
      </dialog>
    </>
  );
}
