"use client";

import { useEffect } from "react";

/**
 * 적다 만 것을 들고 나가지 않게 막는다(규격 §4).
 *
 * **제품 전체 규칙이다.** 입력 폼이 있는 작업공간 쪽은 전부 이것을 세운다.
 * 손전화에서는 아래 띠(홈 · 검사 · 경험 · 더보기)가 폼 바로 아래에 붙어
 * 있어서, 저장 단추를 누르려다 한 칸 아래를 눌러 **적던 것을 통째로 잃는
 * 자리**가 된다. 넓은 화면의 왼쪽 띠도 같다.
 *
 * **막는 자리를 띠로 좁혔다.** 폼 안의 단추와 본문의 링크까지 전부
 * 가로채면 `이전` 을 누를 때도 물음이 뜨고, 그러면 묻는 창이 거드는 것이
 * 아니라 거치적거리는 것이 된다. 실수로 눌리는 자리는 띠다.
 *
 * **자동저장으로 풀지 않는다.** 경험 하나는 끝에서 한 번 저장한다(걸음마다
 * 저장하면 둘째에서 닫은 기록이 반쪽으로 남고 그 반쪽이 판정에 들어간다).
 * 그래서 여기서 할 수 있는 것은 저장이 아니라 **묻는 일**이다.
 *
 * 창을 닫거나 새로고침하는 길은 브라우저의 표준 물음(`beforeunload`)이
 * 맡는다. 앱 안의 이동은 그 물음이 울지 않아서 따로 받는다.
 */
const ASK = "적던 내용이 아직 저장되지 않았습니다. 이 화면을 떠날까요?";

/** 실수로 눌리는 자리. 띠의 링크들 */
const BARS = "nav.cm-tabs a, nav.cm-rail a, .cm-sheet a, header.cm-topbar a";

export default function UnsavedGuard() {
  useEffect(() => {
    const form = document.querySelector("form");
    if (!form) return;
    let dirty = false;

    const touch = () => { dirty = true; };
    const done = () => { dirty = false; };
    form.addEventListener("input", touch);
    form.addEventListener("change", touch);
    form.addEventListener("submit", done);

    const leaving = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      /* 옛 브라우저가 보는 자리. 문면은 브라우저가 정한다 */
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", leaving);

    const click = (e: MouseEvent) => {
      if (!dirty || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const t = e.target as Element | null;
      const a = t?.closest?.(BARS) as HTMLAnchorElement | null;
      if (!a) return;
      if (window.confirm(ASK)) { dirty = false; return; }
      e.preventDefault();
      e.stopPropagation();
    };
    /* **잡는 차례가 먼저다.** Next 의 링크가 제 처리기에서 쪽을 바꾸기
       전에 받아야 멈출 수 있다 */
    document.addEventListener("click", click, true);

    return () => {
      form.removeEventListener("input", touch);
      form.removeEventListener("change", touch);
      form.removeEventListener("submit", done);
      window.removeEventListener("beforeunload", leaving);
      document.removeEventListener("click", click, true);
    };
  }, []);
  return null;
}
