"use client";

import { useState } from "react";
import { Icon } from "./icons";

/** 고를 수 있는 글자 옆에 붙는 복사 단추. 글자는 그대로 남아 직접 골라도 된다 */
export default function CopyText({ value, label, done }: { value: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        let done = false;
        try {
          await navigator.clipboard.writeText(value);
          done = true;
        } catch {
          /* 복사 권한이 없는 브라우저(카카오톡 안 브라우저 등). 메일 쓰기 칸과 같이
             숨은 칸에 담아 복사한다. 전에는 여기서 아무 일도 없어 단추가 죽은 것처럼 보였다 */
          const ta = document.createElement("textarea");
          ta.value = value;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { done = document.execCommand("copy"); } catch { done = false; }
          ta.remove();
        }
        if (done) {
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        }
      }}
    >
      <Icon name={ok ? "check" : "clipboard"} size={15} />
      <span aria-live="polite">{ok ? done : label}</span>
    </button>
  );
}
