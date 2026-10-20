"use client";

import { useState, useTransition } from "react";
import { saveAnswer } from "../actions";

type Item = { code: string; axis: string; text: string; example?: string };
type Section = { code: string; title: string; axes: { code: string; name: string }[]; items: Item[] };

export default function ItemBoard({
  attemptId, scale, sections, initial,
}: {
  attemptId: string;
  scale: { value: number; label: string }[];
  sections: Section[];
  initial: Record<string, number>;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initial);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [, start] = useTransition();
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const done = Object.keys(answers).length;

  function choose(code: string, value: number) {
    const before = answers[code];
    setAnswers((x) => ({ ...x, [code]: value }));
    setStatus((x) => ({ ...x, [code]: "저장 중…" }));
    start(async () => {
      const r = await saveAnswer(attemptId, code, value);
      if (r.ok) {
        setStatus((x) => ({ ...x, [code]: "저장됨" }));
      } else {
        /* 저장이 안 됐으면 고른 칸을 되돌린다: 화면과 서버가 갈리지 않게 */
        setAnswers((x) => {
          const y = { ...x };
          if (before === undefined) delete y[code]; else y[code] = before;
          return y;
        });
        setStatus((x) => ({ ...x, [code]: r.error ?? "저장 실패 · 다시 골라 주세요" }));
      }
    });
  }

  return (
    <div className="sj-section">
      <div className="sj-card" style={{ position: "sticky", top: 0, zIndex: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
          <span>진행</span><b data-testid="progress">{done} / {total}</b>
        </div>
        <div className="sj-progress"><i style={{ width: `${Math.round((done / total) * 100)}%` }} /></div>
      </div>
      {sections.map((s) => (
        <section key={s.code} className="sj-card sj-section">
          <h2>{s.title}</h2>
          <p className="small muted">{s.axes.map((a) => a.name).join(" · ")}</p>
          {s.items.map((it) => (
            <div key={it.code} className="sj-item" data-item={it.code}>
              <div className="q">{it.text}</div>
              {it.example ? <div className="ex">예: {it.example}</div> : null}
              <div className="sj-scale" role="group" aria-label={it.text}>
                {scale.map((o) => (
                  <button key={o.value} type="button" aria-pressed={answers[it.code] === o.value}
                    onClick={() => choose(it.code, o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="sj-saved" aria-live="polite">{status[it.code] ?? (answers[it.code] !== undefined ? "저장됨" : "")}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
