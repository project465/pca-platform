"use client";

import { useEffect } from "react";

/**
 * 서비스 워커를 붙인다(`public/sw.js`). 쪽을 그리는 데 끼어들지 않게
 * 다 뜬 뒤에 붙이고, 실패해도 아무것도 하지 않는다: 붙지 않으면 그냥
 * 설치형이 아닌 웹으로 쓰일 뿐이다.
 */
export function PwaRegister(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const go = () => { navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined); };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  }, []);
  return null;
}
