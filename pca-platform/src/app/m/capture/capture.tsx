"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { uploadForDraft, type UploadState } from "../../me/experience/actions";
import { Icon } from "@/components/sf/icon";

/**
 * 찍고 → 확인하고 → 보낸다. **찍자마자 보내지 않는다**: 웹의 끌어다 놓기와
 * 달리 휴대전화 사진은 흔들리거나 반쯤 잘린 채 찍히는 일이 많아, 한 번 보고
 * 보내게 한다.
 *
 * `capture="environment"` 는 휴대전화에서 뒤 카메라를 바로 연다. 스토어 앱
 * (Capacitor)으로 감싸도 같은 입력이 기기 카메라를 부른다.
 */
export function Capture({ consented, left, cap }: { consented: boolean; left: number; cap: number }) {
  const [state, act, busy] = useActionState<UploadState, FormData>(uploadForDraft, null);
  const [agree, setAgree] = useState(consented);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const remain = state ? Math.max(0, cap - state.used) : left;

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const ready = agree && !!file && !busy && remain > 0;

  return (
    <form action={act} style={{ display: "grid", gap: 16 }}>
      <label className="ma-shot">
        {url ? <img src={url} alt="찍은 서류 미리 보기" /> : null}
        {!url ? (
          <>
            <Icon name="doc" size={36} />
            <b>{file ? file.name : "서류를 화면 안에 맞춰 찍어 주세요"}</b>
            <small>수료증 · 성적증명서 · 자격증 · 상장 · PDF도 됩니다</small>
          </>
        ) : null}
        <input ref={input} type="file" name="file" accept="image/*,application/pdf"
          capture="environment" hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <span className="ma-note">이번 달 {remain}/{cap}회</span>
        <button type="button" className="ma-shutter" aria-label="카메라 열기"
          onClick={() => input.current?.click()}>
          <Icon name="doc" size={26} />
        </button>
        <span />
      </div>

      {!consented ? (
        <label className="ma-agree">
          <input type="checkbox" name="consent" value="1" checked={agree}
            onChange={(e) => setAgree(e.target.checked)} />
          <span>
            찍은 내용(이름·학번·생년월일 포함)이 Anthropic(미국)의 Claude로 보내져 읽히는 데
            동의합니다. 원본은 읽은 뒤 바로 버리고 저장하지 않습니다.
          </span>
        </label>
      ) : null}

      {state ? (
        <p className={`ma-msg ${state.ok ? "is-ok" : "is-bad"}`} role={state.ok ? "status" : "alert"}>
          {state.msg}
        </p>
      ) : null}
      {state?.ok && state.drafts.length ? (
        <div className="ma-list">
          {state.drafts.map((d) => (
            <Link key={d.id} href={`/me/experience/new?draft=${d.id}`} className="ma-row">
              <span className="ma-row-ic"><Icon name="layers" size={18} /></span>
              <span className="ma-row-body"><b>{d.title}</b><small>눌러서 확인하고 저장하기</small></span>
              <Icon name="chev" size={16} className="ma-row-chev" />
            </Link>
          ))}
        </div>
      ) : null}

      <button type="submit" className="ma-btn is-primary is-block" disabled={!ready}
        aria-disabled={!ready}>
        {busy ? "읽는 중…" : file ? "이 사진으로 초안 만들기" : "먼저 서류를 찍어 주세요"}
      </button>
      <p className="ma-note">가리고 싶은 정보는 가린 뒤 찍어 주세요. 초안은 저장 전에 직접 확인합니다.</p>
    </form>
  );
}
