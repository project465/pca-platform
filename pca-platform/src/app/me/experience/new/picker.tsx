"use client";

import { useState } from "react";

/**
 * 기술영역을 고르면 그 영역의 산출물과 비교 대상이 뜬다.
 *
 * **전부 펼쳐 두지 않는다.** 열두 영역의 항목을 다 펼치면 쓸 일 없는 칸이
 * 이백 개 보이고 거기서 닫는다. 고른 영역의 것만 띄운다.
 */
export default function Picker({
  domains,
}: {
  domains: { code: string; name: string; artifacts: string[]; verify: string[] }[];
}) {
  const [on, setOn] = useState<string[]>([]);
  const picked = domains.filter((d) => on.includes(d.code));

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
        <div key={d.code} style={{ marginTop: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--sf-ink)", margin: "0 0 8px" }}>
            {d.name}에서 남긴 것
          </p>
          <div className="cm-pickset">
            {d.artifacts.map((a) => (
              <label className="cm-pick" key={a}>
                <input type="checkbox" name="artifact" value={a} />{a}
              </label>
            ))}
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--sf-ink)", margin: "12px 0 8px" }}>
            {d.name}에서 견준 것
          </p>
          <div className="cm-pickset">
            {d.verify.map((v) => (
              <label className="cm-pick" key={v}>
                <input type="checkbox" name="verification" value={v} />{v}
              </label>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
