"use client";

import { useEffect, useState } from "react";

/**
 * 영역 한 자리의 **상세 근거**를 접는다(규격 §14).
 *
 * 전에는 **좁은 화면에서만** 접었다. 그래서 넓은 화면에서는 여덟 축과
 * 고르신 항목 전부가 늘 펼쳐져 있었고, 그 목록이 영역 한 자리에서 가장
 * 큰 덩이가 되어 **읽는 사람이 자기 상태를 여덟 개의 판정으로 읽었다.**
 * 기본 보기는 다섯 줄이다: 영역명 · 현재 상태 한 줄 · 가장 강한 근거
 * 둘셋 · 부족한 것 하나 · 다음 행동 하나.
 *
 * **접는 것은 지우는 것이 아니다.** 담긴 자료는 그대로이고 보이는 차례만
 * 바뀐다. 상세를 열면 전체 목록과 축 여덟이 그대로 선다.
 *
 * **`<details>` 를 쓰지 않는다.** 종이로 뽑을 때 접힌 자리가 그대로
 * 사라졌다(인쇄 전에 전부 펴 놓아도). 그래서 열고 닫는 상태를 우리가
 * 들고, `@media print` 가 `[hidden]` 을 되돌려 편다.
 *
 * **서버가 내놓는 첫 모양은 펼친 쪽이다.** 자바스크립트가 꺼져 있어도
 * 내용이 다 보여야 하고, 종이로 뽑는 길도 그 모양을 읽는다. 접는 일은
 * 붙고 나서 한 번 일어난다.
 */
export default function Fold(
  { label, children }: { label: string; children: React.ReactNode },
) {
  const [open, setOpen] = useState(true);
  useEffect(() => { setOpen(false); }, []);
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
