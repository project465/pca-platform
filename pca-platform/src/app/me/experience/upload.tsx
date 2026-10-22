"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { uploadForDraft, type UploadState } from "./actions";

/**
 * 파일을 끌어다 놓으면 경험 초안으로 옮긴다(MAT).
 *
 * **놓자마자 보낸다.** 고르고 나서 단추를 한 번 더 누르게 하면 놓은 사람이
 * 이미 보낸 줄 알고 기다린다. 다만 **동의가 없으면 보내지 않는다**: 동의
 * 칸을 켜야 놓는 자리가 열린다.
 *
 * **원본을 남기지 않는다는 것을 놓는 자리에 적는다.** 성적증명서를 올리는
 * 사람이 가장 먼저 묻는 것이 그것이다.
 */
export default function FileDrop({ consented, used, cap, pending }: {
  consented: boolean;
  used: number;
  cap: number;
  /** 전에 옮겨 두고 아직 적지 않은 초안 */
  pending: { id: string; title: string }[];
}) {
  const [state, act, busy] = useActionState<UploadState, FormData>(uploadForDraft, null);
  const [agree, setAgree] = useState(consented);
  const [over, setOver] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const left = Math.max(0, cap - (state?.used ?? used));
  const list = state?.ok ? state.drafts : pending;

  const send = (f: File) => {
    if (!agree || busy || !input.current || !form.current) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    input.current.files = dt.files;
    form.current.requestSubmit();
  };

  return (
    <div className="cm-panel is-one" id="upload">
      <div className="cm-pane">
        <p className="cm-sub-h" style={{ marginTop: 0 }}>파일로 옮기기</p>
        <p className="cm-none" style={{ marginBottom: 12 }}>
          성적증명서·수료증·자격증·상장을 올리시면 경험으로 적을 만한 것을 골라 아래 칸에
          옮겨 둡니다. PDF·JPG·PNG, 7MB·10쪽까지 · 이번 달 남은 횟수 {left}/{cap}
        </p>
        <form ref={form} action={act}>
          {!consented ? (
            <label className="cm-check">
              <input type="checkbox" name="consent" value="1" checked={agree}
                onChange={(e) => setAgree(e.target.checked)} />
              <span>
                파일 내용(파일에 적힌 이름·학번·생년월일 포함)이 Anthropic(미국)의 Claude로 보내져
                읽히는 데 동의합니다. 원본 파일은 읽은 뒤 바로 버리고 저장하지 않습니다.
                가리고 싶은 정보는 가린 뒤 올려 주세요.
              </span>
            </label>
          ) : null}
          <label
            className={`cm-drop${over ? " is-over" : ""}${agree ? "" : " is-off"}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) send(f);
            }}
          >
            <input ref={input} type="file" name="file" hidden disabled={!agree || busy}
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => { if (e.target.files?.length) form.current?.requestSubmit(); }} />
            <b>{busy ? "읽는 중입니다. 10~30초 걸립니다…"
              : agree ? "여기에 파일을 끌어다 놓거나 눌러서 고르세요" : "위 동의 칸을 켜면 열립니다"}</b>
            <span>읽은 결과는 저장되지 않은 초안입니다. 열어서 고치고 직접 저장하세요.</span>
          </label>
        </form>
        {state && !state.ok ? <p className="cm-fail" role="alert">{state.msg}</p> : null}
        {state?.ok ? <p className="cm-none" role="status">{state.msg}</p> : null}
        {list.length ? (
          <div className="cm-rows" style={{ marginTop: 12 }}>
            {list.map((d) => (
              <p className="cm-row" key={d.id}>
                <b><Link href={`/me/experience/new?draft=${d.id}`}>{d.title}</Link></b>
                <span>파일에서 옮긴 초안 · 열어서 저장하기</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
