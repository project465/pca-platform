"use client";

import { useState } from "react";

export type ConsentItem = {
  id: string;
  title: string;
  required: boolean;
  /** 전문을 볼 수 있는 주소. 없으면 링크를 그리지 않는다 */
  href: string | null;
  /** 그 언어의 본문이 아직 없으면 true */
  pending: boolean;
};

export type ConsentLabels = {
  title: string;
  required: string;
  optional: string;
  view: string;
  agreeAll: string;
  pending: string;
  pendingShort: string;
};

/**
 * 동의 체크박스.
 *
 * **필수와 선택을 섞어 한 칸으로 묶지 않는다.** '모두 동의' 만 두면
 * 선택 항목까지 받게 되고, 그건 받은 동의가 아니다. 모두 동의는
 * 편의로 두고 칸은 따로 남긴다.
 *
 * **여기서 막는 것은 안내다.** 실제로 막는 것은 서버
 * (`consent.record()` 가 필수 항목이 빠지면 거절한다).
 */
export default function ConsentBlock({
  items, labels,
}: { items: ConsentItem[]; labels: ConsentLabels }) {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const all = items.length > 0 && items.every((i) => on[i.id]);

  const toggleAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    for (const i of items) next[i.id] = v;
    setOn(next);
  };

  if (!items.length) return null;

  return (
    <fieldset className="cnbox">
      <legend>{labels.title}</legend>

      <label className="cnrow cnall">
        <input type="checkbox" checked={all}
          onChange={(e) => toggleAll(e.target.checked)} />
        <span>{labels.agreeAll}</span>
      </label>

      {items.map((i) => (
        <label className="cnrow" key={i.id}>
          {/* 체크된 것만 서버로 간다. 서버는 받은 id 목록으로 판단한다 */}
          <input type="checkbox" name="consent" value={i.id}
            checked={!!on[i.id]} required={i.required}
            onChange={(e) => setOn((s) => ({ ...s, [i.id]: e.target.checked }))} />
          <span>
            <b className={i.required ? "cntag is-req" : "cntag"}>
              {i.required ? labels.required : labels.optional}
            </b>{" "}
            {i.title}
            {i.href ? (
              <>
                {" "}
                <a href={i.href} target="_blank" rel="noreferrer">
                  {i.pending ? `${labels.view} (${labels.pendingShort})` : labels.view}
                </a>
              </>
            ) : null}
          </span>
        </label>
      ))}

      {items.some((i) => i.pending) ? (
        <p className="cnnote">{labels.pending}</p>
      ) : null}
    </fieldset>
  );
}
