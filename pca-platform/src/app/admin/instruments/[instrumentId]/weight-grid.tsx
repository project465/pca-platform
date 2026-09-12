"use client";

import { useActionState, useState } from "react";
import { saveWeightsAction, type WeightState } from "./actions";

const initial: WeightState = {};

export type Axis = { id: string; label: string };

/**
 * 지표 하나가 직무 하나에 얼마나 기여하는지. 0 이면 그 직무에 안 쓴다.
 * 값의 절대 크기는 의미가 없고 같은 직무 열 안에서의 비율만 쓰인다.
 */
export default function WeightGrid({
  instrumentId,
  indicators,
  jobs,
  values,
}: {
  instrumentId: string;
  indicators: Axis[];
  jobs: Axis[];
  values: Record<string, number>;
}) {
  const [state, action, pending] = useActionState(saveWeightsAction, initial);
  const [cells, setCells] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const n of indicators) for (const j of jobs) {
      const k = `${n.id}:${j.id}`;
      out[k] = String(values[k] ?? 0);
    }
    return out;
  });

  const fillAll = (v: string) => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(cells)) out[k] = v;
    setCells(out);
  };

  const columnSum = (jobId: string) =>
    indicators.reduce((a, n) => a + (Number(cells[`${n.id}:${jobId}`]) || 0), 0);

  return (
    <form action={action}>
      <input type="hidden" name="instrumentId" value={instrumentId} />

      <div className="grid-tools">
        <button className="act" type="button" onClick={() => fillAll("1")}>
          전부 1로
        </button>
        <button className="act" type="button" onClick={() => fillAll("0")}>
          전부 0으로
        </button>
        <span className="help">
          시작점을 잡는 용도입니다. 어느 지표가 어느 직무에 더 중요한지는 사람이 정해야 합니다.
        </span>
      </div>

      <div className="table-wrap">
        <table className="weights">
          <thead>
            <tr>
              <th className="corner">지표 \ 직무 영역</th>
              {jobs.map((j) => (
                <th key={j.id} title={j.label}>
                  {j.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {indicators.map((n) => (
              <tr key={n.id}>
                <th scope="row">{n.label}</th>
                {jobs.map((j) => {
                  const k = `${n.id}:${j.id}`;
                  const on = (Number(cells[k]) || 0) > 0;
                  return (
                    <td key={j.id} className={on ? "on" : ""}>
                      <input
                        name={`w:${k}`}
                        type="number"
                        min={0}
                        max={99}
                        step={1}
                        inputMode="numeric"
                        value={cells[k] ?? "0"}
                        aria-label={`${n.label} × ${j.label}`}
                        onChange={(e) => setCells({ ...cells, [k]: e.target.value })}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">합</th>
              {jobs.map((j) => {
                const s = columnSum(j.id);
                return (
                  <td key={j.id} className={s === 0 ? "zero" : ""}>
                    {s}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {state.message ? <div className="notice error" style={{ marginTop: 14 }}>{state.message}</div> : null}
      {state.ok ? <div className="notice ok" style={{ marginTop: 14 }}>{state.ok}</div> : null}

      <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
        <button className="act solid" type="submit" disabled={pending}>
          {pending ? "저장 중…" : "가중치 저장"}
        </button>
        <span className="help">합이 0인 직무는 결과지에 나오지 않습니다.</span>
      </div>
    </form>
  );
}
