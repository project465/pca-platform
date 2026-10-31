"use client";

import { useActionState, useRef, useState } from "react";
import { uploadResearch, type ResearchState } from "./actions";

/**
 * 논문 · 발표 자료 · 이력서 · 자기소개서 올리기.
 *
 * 고르면 바로 보낸다(경험 추가의 `FileDrop` 과 같다). 동의가 없으면 보내지 않는다.
 * 긴 논문은 읽는 데 시간이 걸리므로 기다리는 동안 그 사실을 적는다.
 */
export default function ResearchUpload({ consented, left }: {
  consented: boolean;
  /** 이번 달(또는 무료로) 남은 건수. 무한이면 null */
  left: string;
}) {
  const [state, act, busy] = useActionState<ResearchState, FormData>(uploadResearch, null);
  const [agree, setAgree] = useState(consented);
  const form = useRef<HTMLFormElement>(null);

  return (
    <div className="cm-panel is-one" id="upload">
      <div className="cm-pane">
        <p className="cm-none" style={{ marginBottom: 12 }}>
          논문(영어 포함) · 학위논문 · 발표 자료 · 연구 보고서 · 특허 · 이력서 · 자기소개서를 올리시면
          무엇을 했고 무엇이 나왔는지 한 장으로 정리하고, 맞는 공고를 찾습니다.
          PDF · docx · pptx · hwpx · txt, 7MB · 60쪽까지 · {left}
        </p>
        <form ref={form} action={act}>
          {!consented ? (
            <label className="cm-check">
              <input type="checkbox" name="consent" value="1" checked={agree}
                onChange={(e) => setAgree(e.target.checked)} />
              <span>
                파일 내용(파일에 적힌 이름·연락처 포함)이 Anthropic(미국)의 Claude로 보내져 읽히는 데
                동의합니다. 원본 파일은 읽은 뒤 바로 버리고 저장하지 않습니다. 가리고 싶은 정보는 가린 뒤
                올려 주세요.
              </span>
            </label>
          ) : null}
          <label className={`cm-drop${agree ? "" : " is-off"}`}>
            <input type="file" name="file" hidden disabled={!agree || busy}
              accept=".pdf,.docx,.pptx,.hwpx,.txt,.md,application/pdf"
              onChange={(e) => { if (e.target.files?.length) form.current?.requestSubmit(); }} />
            <b>{busy ? "읽는 중입니다. 긴 논문은 몇 분 걸릴 수 있습니다…"
              : agree ? "눌러서 파일을 고르세요" : "위 동의 칸을 켜면 열립니다"}</b>
            <span>영어 자료도 한국어로 정리합니다. 수치와 근거 위치는 자료에 적힌 그대로 옮깁니다.</span>
          </label>
        </form>
        {state && !state.ok ? <p className="cm-fail" role="alert">{state.msg}</p> : null}
        {state?.ok ? <p className="cm-none" role="status">{state.msg}</p> : null}
      </div>
    </div>
  );
}
