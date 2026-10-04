"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EvidencePayload } from "@/lib/me-v2/evidence";
import { saveEvidenceAction } from "./actions";

type Msg =
  | { type: "cm.evidence.hello" }
  | { type: "cm.evidence.ready" }
  | {
      type: "cm.evidence.done";
      saved: boolean;
      evidence: Record<string, unknown>;
      research: unknown[];
      target: Record<string, unknown>;
    };

/**
 * 승인된 경험 입력 화면을 그대로 띄우고, 끝나면 서버에 저장한다.
 *
 * **같은 출처끼리만 말을 섞는다.** 띄우는 쪽과 띄워지는 쪽이 둘 다 이
 * 플랫폼이 내준 주소라 출처가 같다. 출처를 안 보면 밖에서 끼워 넣은 창이
 * 남의 경험을 보내 올 수 있다.
 *
 * **경험을 주소에 담지 않는다.** 길이 제한에 걸리고, 브라우저 기록에
 * 캡스톤 서술이 남는다.
 */
export default function EvidenceFrame({
  attemptId, stage, inFlow, seed, nextHref, labels,
}: {
  attemptId: string;
  stage: string;
  inFlow: boolean;
  seed: EvidencePayload;
  nextHref: string;
  labels: { saving: string; retry: string };
}) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "retry">("idle");
  const src = `/me-v2/evidence-host.html?stage=${encodeURIComponent(stage)}` +
    `&flow=${inFlow ? "1" : "0"}`;

  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data as Msg | null;
      if (!m || typeof m !== "object" || !("type" in m)) return;

      if (m.type === "cm.evidence.hello") {
        /* 서버가 들고 있던 것을 건넨다. 들어올 때마다 지금 상태에서
           이어 적을 수 있어야 한다 */
        frame.current?.contentWindow?.postMessage(
          { type: "cm.evidence.seed", payload: seed }, window.location.origin,
        );
        return;
      }
      if (m.type === "cm.evidence.done") {
        if (!m.saved) { router.push(nextHref); return; }
        setState("saving");
        const r = await saveEvidenceAction(attemptId, {
          evidence: m.evidence, research: m.research, target: m.target,
        }).catch(() => ({ ok: false as const }));
        if (!r.ok) { setState("retry"); return; }
        setState("idle");
        router.push(nextHref);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [attemptId, nextHref, router, seed]);

  return (
    <>
      {state !== "idle" ? (
        <p className={`assave is-${state === "saving" ? "saving" : "retry"}`}
          role="status" aria-live="polite">
          {state === "saving" ? labels.saving : labels.retry}
        </p>
      ) : null}
      <iframe
        ref={frame}
        src={src}
        title="경험 적기"
        className="evframe"
      />
    </>
  );
}
