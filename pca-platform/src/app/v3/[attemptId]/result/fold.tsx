"use client";

import { useEffect, useState } from "react";

/**
 * 좁은 화면에서만 접는다.
 *
 * **`<details>` 를 쓰지 않는다.** 종이로 뽑을 때 접힌 자리가 그대로
 * 사라졌다(인쇄 전에 전부 펴 놓아도). 여기서는 접는 것이 보조 기능이라
 * 열고 닫는 상태를 우리가 들고, 펼친 쪽을 기본으로 둔다.
 *
 * **서버에서는 늘 펼쳐 둔다.** 자바스크립트가 꺼져 있어도, PDF 로 뽑을
 * 때도 내용이 다 보여야 한다. 좁은 화면에서 접는 것은 읽는 차례를
 * 만들려는 것이지 내용을 숨기려는 것이 아니다.
 */
export default function Fold(
  { label, children }: { label: string; children: React.ReactNode },
) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 719px)");
    const sync = () => setOpen(!m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);
  return (
    <div className="rs-fold">
      <button type="button" className="rs-foldbtn" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        {label}<i aria-hidden>{open ? "▴" : "▾"}</i>
      </button>
      <div hidden={!open}>{children}</div>
    </div>
  );
}
