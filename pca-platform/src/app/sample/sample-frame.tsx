"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 견본을 품는 창.
 *
 * 결과지 창(`ReportFrame`)과 같은 규칙이다: 높이를 못 박지 않고 안쪽이
 * 알려 주는 높이를 따른다. 다른 점은 주소 하나뿐이고, 그래서 그리는
 * 코드는 산 사람의 결과지와 똑같은 한 벌이다.
 */
export function SampleFrame({ lang }: { lang: "ko" | "en" }) {
  const [h, setH] = useState(1400);
  const ref = useRef<HTMLIFrameElement | null>(null);

  /* **받은 높이에 더하지 않는다.** 안쪽이 담긴 것의 높이를 보내고 바깥이
     거기에 조금씩 더하면, 안쪽 창이 커진 만큼 다시 올라가는 고리가 되어
     창이 끝없이 늘어난다(`ReportFrame` 에 같은 주석이 있다) */
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; height?: number } | null;
      if (d?.type !== "cm.report.height" || typeof d.height !== "number") return;
      const next = Math.max(240, Math.min(Math.ceil(d.height), 400000));
      setH((cur) => (Math.abs(cur - next) <= 2 ? cur : next));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <iframe
      ref={ref}
      src={`/me-v2/report-host.html?sample=${lang}&lang=${lang}`}
      title={lang === "en" ? "Sample report" : "견본 결과지"}
      className="rpframe"
      style={{ height: h, marginTop: 18 }}
    />
  );
}
