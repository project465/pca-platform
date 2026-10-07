"use client";

import { useActionState } from "react";
import { savePilotAction, type PilotState } from "./actions";
import type { PilotItem } from "@/lib/pilot";

/**
 * 한 화면.
 *
 * **한 문항씩 넘기지 않는다.** 넘기게 하면 세 번째에서 닫는다. 고르는
 * 문항을 앞에 모아 두었고(`order_no`), 적는 칸은 뒤에 선다. 척도와
 * 자유입력이 섞여 있어 모양을 가른다.
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
      {/* **번호는 화면에서 다시 센다.** `order_no` 는 차례를 정하는 값이라
          가운데가 비어 있을 수 있고(문항을 빼면 그 자리가 빈다), 그 값을
          그대로 찍으면 10 다음에 14 가 나와 답하는 사람이 빠뜨린 줄을
          찾는다 */}
      {items.map((it, i) => (
        <div key={it.code} className="field">
          <label htmlFor={`pf-${it.code}`}>{i + 1}. {it.text}</label>
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
