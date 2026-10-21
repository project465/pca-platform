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
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch {
          /* 복사 권한이 없으면 글자를 직접 고르면 된다 */
        }
      }}
    >
      <Icon name={ok ? "check" : "clipboard"} size={15} />
      <span aria-live="polite">{ok ? done : label}</span>
    </button>
  );
}
