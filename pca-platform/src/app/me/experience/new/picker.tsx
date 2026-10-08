"use client";

import { useState } from "react";

/**
 * 기술영역을 고르면 그 영역의 문제와 판단과 산출물과 검증이 뜬다.
 *
 * **전부 펼쳐 두지 않는다.** 열두 영역의 항목을 다 펼치면 쓸 일 없는 칸이
 * 이백 개 보이고 거기서 닫는다. 고른 영역의 것만 띄운다.
 *
 * **`직접 정한 것` 이 빠져 있었다.** 표에도 저장 함수에도 그 칸이 있는데
 * 고르는 자리가 없어서, 모든 경험이 그 칸을 빈 채로 쌓였다. 지원서에서
 * 읽히는 자리가 거기다.
 */
export default function Picker({
  domains,
}: {
  domains: {
    code: string; name: string;
    problems: string[]; decisions: string[];
    artifacts: string[]; verify: string[];
  }[];
}) {
  const [on, setOn] = useState<string[]>([]);
  const picked = domains.filter((d) => on.includes(d.code));

  const group = (
    label: string, name: string, items: string[], key: string,
  ) => items.length ? (
    <div className="cm-sub" key={key}>
      <p>{label}</p>
      <div className="cm-pickset">
        {items.map((x) => (
          <label className="cm-pick" key={x}>
            <input type="checkbox" name={name} value={x} />{x}
          </label>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="cm-pickset">
        {domains.map((d) => (
          <label className="cm-pick" key={d.code}>
            <input type="checkbox" name="td" value={d.code}
              checked={on.includes(d.code)}
              onChange={(e) => setOn((prev) => e.target.checked
                ? [...prev, d.code] : prev.filter((x) => x !== d.code))} />
            {d.name}
          </label>
        ))}
      </div>

      {picked.map((d) => (
        <section className="cm-subs" key={d.code}>
          <h4>{d.name}</h4>
          {group("어떤 문제였나", "problem", d.problems, `${d.code}-p`)}
          {group("무엇을 직접 정했나", "decision", d.decisions, `${d.code}-d`)}
          {group("무엇이 남았나", "artifact", d.artifacts, `${d.code}-a`)}
          {group("무엇과 견주어 확인했나", "verification", d.verify, `${d.code}-v`)}
        </section>
      ))}
    </>
  );
}
