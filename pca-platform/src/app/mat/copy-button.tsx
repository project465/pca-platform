"use client";

import { useState } from "react";
import { sayOf, type MatUiLang } from "@/lib/mat/copy";
import { COPY_TEXT as C } from "./mat-text";

/**
 * MAT 지원서 화면의 복사 단추(작업공간 `me/track/copy-button.tsx` 와 같은 동작, 글자만 그 언어로).
 * 복사 권한이 막힌 브라우저(카카오톡 안 등)는 숨은 칸에 넣고 골라서 복사한다
 */
export function MatCopyButton({ text, label, lang = "ko" }: { text: string; label?: string; lang?: MatUiLang }) {
  const t = sayOf(lang);
  const [s, setS] = useState<"idle" | "ok" | "fail">("idle");
  const fallback = (): boolean => {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    document.body.removeChild(el);
    return ok;
  };
  const copy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); ok = true; }
    } catch { ok = false; }
    if (!ok) ok = fallback();
    setS(ok ? "ok" : "fail");
  };
  return (
    <>
      <button className="cm-btn" type="button" onClick={copy}>{label ?? t(C.copy)}</button>
      <span className="cm-none" role="status" aria-live="polite">
        {s === "ok" ? t(C.ok) : s === "fail" ? t(C.fail) : ""}
      </span>
    </>
  );
}
