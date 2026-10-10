"use client";

import { useState } from "react";

/**
 * 결과 **본문 전체**를 여는 자리.
 *
 * 웹 결과지가 하는 일은 `무엇이 확인됐고 · 무엇이 비었고 · 지금 무엇을
 * 하면 되는가` 까지다(규격 §9). 그 아래에 있는 것은 그 셋의 근거이고,
 * 근거를 늘 펼쳐 두면 쪽이 열 뼘이 되어 **행동 화면이 문서로 바뀐다.**
 *
 * **종이에서는 펴진다.** 인쇄 규칙이 단추를 지우고 속을 드러낸다
 * (`.rs-open > [hidden] { display: block }`). 종이는 기록과 제출에 쓰는
 * 물건이라 접을 이유가 없고, 누를 사람도 없다.
 *
 * **`<details>` 를 쓰지 않는다.** 크로뮴은 접힌 `details` 의 속을
 * `display: none` 대신 `content-visibility: hidden` 으로 두는데, 그러면
 * 인쇄 규칙으로 펴 놓아도 종이에서 내용이 통째로 빠진다. 이 저장소에서
 * 실제로 여덟 축이 사라진 종이가 뽑혔다.
 */
export default function Detail(
  { label, note, children }: { label: string; note?: string; children: React.ReactNode },
) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rs-open${open ? " is-on" : ""}`}>
      <button type="button" className="rs-openbtn" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        <b>{open ? "자세한 내용 접기" : label}</b>
        {note && !open ? <small>{note}</small> : null}
        <i aria-hidden>{open ? "▴" : "▾"}</i>
      </button>
      <div hidden={!open}>{children}</div>
    </div>
  );
}
