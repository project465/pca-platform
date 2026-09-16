"use client";

import { useState, useTransition } from "react";
import { answerSurvey, finishSurvey } from "./actions";

type Item = { id: string; code: string; kind: string; text: string };

const SCALE = [
  { v: 1, label: "전혀 아니다" },
  { v: 2, label: "아니다" },
  { v: 3, label: "보통이다" },
  { v: 4, label: "그렇다" },
  { v: 5, label: "매우 그렇다" },
];

export default function SurveyForm({
  attemptId,
  phase,
  items,
  answered,
}: {
  attemptId: string;
  phase: "before" | "after";
  items: Item[];
  answered: Record<string, number>;
}) {
  const [picked, setPicked] = useState<Record<string, number>>(answered);
  const [missing, setMissing] = useState(false);
  const [pending, start] = useTransition();

  const left = items.filter((i) => !picked[i.id]).length;

  function choose(itemId: string, v: number) {
    // 화면을 먼저 움직이고 저장은 뒤따른다. 거절되면 되돌린다
    const before = picked[itemId];
    setPicked((p) => ({ ...p, [itemId]: v }));
    setMissing(false);
    start(async () => {
      const r = await answerSurvey(attemptId, itemId, v);
      if (!r.ok) {
        setPicked((p) => {
          const next = { ...p };
          if (before) next[itemId] = before;
          else delete next[itemId];
          return next;
        });
      }
    });
  }

  return (
    <div className="survey">
      <ol className="sv-list">
        {items.map((it, n) => (
          <li key={it.id}>
            <p className="sv-q">
              <span className="sv-n">{n + 1}</span>
              {it.text}
            </p>
            <div className="sv-scale" role="group" aria-label={it.text}>
              {SCALE.map((s) => (
                <label key={s.v} className={picked[it.id] === s.v ? "on" : undefined}>
                  <input
                    type="radio"
                    name={`item-${it.id}`}
                    id={`item-${it.id}-${s.v}`}
                    value={s.v}
                    checked={picked[it.id] === s.v}
                    onChange={() => choose(it.id, s.v)}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {missing && (
        <p className="notice warn" role="alert">
          아직 답하지 않은 문항이 {left}개 있습니다.
        </p>
      )}

      <button
        className="act solid"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await finishSurvey(attemptId, phase);
            if (r?.missing) setMissing(true);
          })
        }
      >
        {phase === "before" ? "검사 시작하기" : "결과지로 돌아가기"}
      </button>
      <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>
        {left > 0 ? `${left}개 남았습니다.` : "다 답하셨습니다."}
      </p>
    </div>
  );
}
