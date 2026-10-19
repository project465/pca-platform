"use client";

import { useState } from "react";

/**
 * 접어 두고 누르면 펴지는 자리. **기본은 접힘이다.**
 *
 * `Fold` 와 반대다. 저쪽은 좁은 화면에서만 접고 넓은 화면에서는 늘 펴
 * 두지만, 여기 들어가는 것은 결과를 읽는 데 필요하지 않은 단서다. 열두
 * 줄짜리 고지문이 결과 아래에 늘 펼쳐져 있으면 그 자리가 결과의 마지막
 * 인상이 된다.
 *
 * **종이에서는 펴진다.** 인쇄 규칙이 단추를 지우고 속을 드러낸다: 종이에는
 * 누를 사람이 없고, 단서는 종이에 남아야 한다.
 */
export default function Disclose(
  { label, printLabel, children }: {
    label: string;
    /**
     * **종이에서 이 묶음의 머리로 세울 말**(R35).
     *
     * 종이는 단추를 지우고 속을 펴는데, 단추의 이름이 그 묶음의 유일한
     * 머리인 자리가 있다. 그 자리는 종이에서 **머리 없이 목록만** 남아
     * 무엇을 적은 줄인지 읽히지 않았다(`경영 일반 쪽에서 지금 할 수 있는
     * 한 걸음`). 속에 제 머리가 있는 묶음은 넘기지 않는다: `전부 보기`
     * 같은 단추 말이 종이의 제목으로 서면 누를 수 없는 단추로 읽힌다.
     */
    printLabel?: string;
    children: React.ReactNode;
  },
) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rs-disc">
      {printLabel ? <p className="rs-discprint" aria-hidden>{printLabel}</p> : null}
      <button type="button" className="rs-discbtn" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        {label}<i aria-hidden>{open ? "▴" : "▾"}</i>
      </button>
      <div hidden={!open}>{children}</div>
    </div>
  );
}
