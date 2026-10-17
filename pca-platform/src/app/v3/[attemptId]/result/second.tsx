"use client";

import { useState } from "react";

/**
 * 곁근거 하나를 접어 둔다. **기본은 접힘이다**(R17 §9).
 *
 * 전환 줄(`그리고 하나 더`)이 그대로 단추가 된다. 따로 테 두른 단추를
 * 세우면 이 절에 누르는 자리가 둘이 되고, 그 둘이 같은 무게로 서면 읽는
 * 사람이 무엇이 주된 길인지 한 번 더 고른다.
 *
 * **여는 경험을 접지 않는다.** 이 쪽에서 가장 먼저 자기를 알아보는
 * 자리라, 접어 두면 펴지 않은 사람이 자기가 이미 가진 것을 못 본다.
 *
 * **종이에서는 펴진다**: 인쇄 규칙이 단추를 지우고 속을 드러낸다
 * (`.rs-open > [hidden] { display: block !important }`).
 */
export default function SecondStory(
  { name, children }: { name: string; children: React.ReactNode },
) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rs-open rs-ev3-second">
      <button type="button" className="rs-openbtn rs-ev3-tr" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        <span>그리고 하나 더<b>{name}</b></span>
        <i aria-hidden>{open ? "닫기" : "열기"}</i>
      </button>
      <div hidden={!open}>{children}</div>
    </div>
  );
}
