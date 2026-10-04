"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateAction } from "./actions";

/**
 * 결과지를 띄우는 창.
 *
 * **창 높이를 못 박지 않는다.** 등급마다 쪽 수가 달라서 고정하면 BASIC 에는
 * 빈자리가 남고 PRO 에는 안쪽 스크롤이 하나 더 생긴다. 안쪽이 자기 높이를
 * 알려 주고 이쪽이 맞춘다.
 */
export function ReportFrame({ attemptId }: { attemptId: string }) {
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
      src={`/me-v2/report-host.html?attempt=${encodeURIComponent(attemptId)}`}
      title="결과지"
      className="rpframe"
      style={{ height: h }}
    />
  );
}

/**
 * 결과지를 만드는 단추.
 *
 * **누르는 동안 무엇을 하고 있는지 적는다.** 결과지 한 장을 그리는 데 몇 초가
 * 걸리고, 그 사이에 아무 말이 없으면 다시 누른다. 다시 누르면 판본이 하나 더
 * 쌓인다.
 */
export function GenerateButton({
  attemptId, labels,
}: {
  attemptId: string;
  labels: { make: string; making: string; again: string; failed: string };
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "fail">("idle");
  const [why, setWhy] = useState<string>("");

  const run = async () => {
    setState("busy");
    const r = await generateAction(attemptId).catch(() => ({
      ok: false as const, reason: labels.failed,
    }));
    if (!r.ok) {
      setState("fail");
      setWhy(r.reason ?? labels.failed);
      return;
    }
    setState("idle");
    router.refresh();
  };

  return (
    <>
      <button type="button" className="sf-btn accent" disabled={state === "busy"}
        onClick={() => void run()}>
        {state === "busy" ? labels.making : state === "fail" ? labels.again : labels.make}
      </button>
      {state === "fail" ? (
        <p className="assave is-retry" role="status" aria-live="polite">{why}</p>
      ) : null}
    </>
  );
}
