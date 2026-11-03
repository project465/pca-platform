"use client";

import { useState } from "react";

/**
 * 글 한 덩이를 복사하는 단추.
 *
 * **복사 권한이 막힌 브라우저를 받친다.** 카카오톡 안 브라우저처럼
 * `navigator.clipboard` 가 없거나 거절되는 곳에서는 숨은 칸에 글을 넣고
 * 골라서 복사한다. 그것도 안 되면 그렇다고 적고 길게 눌러 복사하라고 한다.
 */
export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [s, setS] = useState<"idle" | "ok" | "fail">("idle");

  const fallback = (): boolean => {
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    document.body.removeChild(t);
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
      <button className="cm-btn" type="button" onClick={copy}>{label}</button>
      <span className="cm-none" role="status" aria-live="polite">
        {s === "ok" ? "복사했습니다. 대괄호 칸을 채워 쓰세요."
          : s === "fail" ? "복사하지 못했습니다. 글을 길게 눌러 직접 복사해 주세요." : ""}
      </span>
    </>
  );
}
