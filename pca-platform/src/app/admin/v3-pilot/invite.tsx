"use client";

import { useActionState } from "react";
import { makeInvites, type InviteState } from "./actions";

const WAVE_LABEL = [
  "Wave 0 · 내부 확인", "Wave 1 · 첫 사용자", "Wave 2 · 추가", "Wave 3 · 최종",
];

/**
 * 초대 자리를 만드는 칸.
 *
 * **만든 링크를 이 자리에서만 보여 준다.** 새로 고치면 사라지고 다시 볼
 * 길이 없다. 그래서 만든 즉시 옮겨 적으라고 적어 둔다.
 */
export default function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(makeInvites, {});
  return (
    <>
      <form action={action} className="v3inv">
        <label>
          <span>wave</span>
          <select name="wave" defaultValue="1">
            {WAVE_LABEL.map((k, i) => <option key={i} value={i}>{k}</option>)}
          </select>
        </label>
        <label>
          <span>몇 자리</span>
          <input type="number" name="count" min={1} max={20} defaultValue={5} />
        </label>
        <label>
          <span>메모 (운영자만 봅니다)</span>
          <input type="text" name="note" maxLength={200} placeholder="예) 기계과 4학년" />
        </label>
        <button type="submit" className="act solid" disabled={pending}>
          {pending ? "만드는 중" : "초대 자리 만들기"}
        </button>
      </form>

      {state.error === "wave" ? <p className="warn">wave 를 다시 골라주십시오.</p> : null}
      {state.error === "count" ? <p className="warn">한 번에 1에서 20자리까지입니다.</p> : null}

      {state.links?.length ? (
        <>
          <p className="sub">
            아래 주소를 지금 옮겨 적으십시오. <b>새로 고치면 다시 볼 수 없습니다.</b>
            열쇠는 해시만 저장하므로 잃으면 그 자리를 버리고 새로 만듭니다.
          </p>
          <textarea className="v3links" readOnly rows={Math.min(12, state.links.length + 1)}
            value={state.links.map((l) => `${l.code}\t${l.url}`).join("\n")} />
        </>
      ) : null}
    </>
  );
}
