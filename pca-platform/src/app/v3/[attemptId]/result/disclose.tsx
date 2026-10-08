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
  { label, children }: { label: string; children: React.ReactNode },
) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rs-disc">
      <button type="button" className="rs-discbtn" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        {label}<i aria-hidden>{open ? "▴" : "▾"}</i>
      </button>
      <div hidden={!open}>{children}</div>
    </div>
  );
}
