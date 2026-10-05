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

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; height?: number } | null;
      if (d?.type !== "cm.report.height" || typeof d.height !== "number") return;
      setH(Math.max(600, Math.min(d.height + 40, 400000)));
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
