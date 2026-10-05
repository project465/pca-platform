"use client";

import { useActionState } from "react";
import { savePilotAction, type PilotState } from "./actions";
import type { PilotItem } from "@/lib/pilot";

/**
 * 열 문항 한 화면.
 *
 * **한 문항씩 넘기지 않는다.** 열 개는 한 화면에 들어가고, 넘기게 하면
 * 세 번째에서 닫는다. 척도와 자유입력이 섞여 있어 모양을 가른다.
 */
export function PilotForm({
  attemptId, items, labels,
}: {
  attemptId: string;
  items: PilotItem[];
  labels: { send: string; scale: string[]; skip: string };
}) {
  const [state, run, busy] = useActionState<PilotState, FormData>(savePilotAction, {});
  return (
    <form action={run} className="form" style={{ gap: 26 }}>
      <input type="hidden" name="attempt" value={attemptId} />
      {items.map((it) => (
        <div key={it.code} className="field">
          <label htmlFor={`pf-${it.code}`}>{it.orderNo}. {it.text}</label>
          {it.kind === "scale" ? (
            <div className="pfscale" role="group" aria-label={it.text}>
              {[1, 2, 3, 4, 5].map((v) => (
                <label key={v}>
                  <input type="radio" name={`v-${it.code}`} value={v} />
                  <span>{v}</span>
                  {labels.scale[v - 1]
                    ? <small>{labels.scale[v - 1]}</small>
                    : null}
                </label>
              ))}
            </div>
          ) : (
            <textarea id={`pf-${it.code}`} name={`t-${it.code}`} rows={2}
              maxLength={600} />
          )}
        </div>
      ))}
      <p className="sf-meta">{labels.skip}</p>
      <div>
        <button className="sf-btn accent" disabled={busy}>{labels.send}</button>
        {state.error ? (
          <span className="pxtbd" style={{ marginLeft: 10, display: "inline" }}>
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
