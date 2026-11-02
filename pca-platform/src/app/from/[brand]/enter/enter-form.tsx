"use client";

import { useActionState, useState } from "react";
import ConsentBlock, { type ConsentItem, type ConsentLabels } from "../../../signup/consent-block";
import { enterAction, type EnterState } from "./actions";

/**
 * 제휴 링크 동의 폼. 단추가 셋 가운데 하나다.
 * - 이미 이어진 회원: `계속` 하나
 * - 로그인한 사람: `지금 계정(이름)과 잇기` 와 `새 계정으로 시작`
 * - 로그인하지 않은 사람: 동의 칸 + `동의하고 시작`, 그리고 `이미 계정이 있어요(로그인 후 잇기)`
 */
export default function EnterForm({
  partner, token, linked, me, items, labels,
}: {
  partner: string; token: string; linked: boolean; me: string | null;
  items: ConsentItem[]; labels: ConsentLabels;
}) {
  const [state, action, pending] = useActionState<EnterState, FormData>(enterAction, {});
  const [ready, setReady] = useState(false);
  const [linkOk, setLinkOk] = useState(false);
  const hidden = (<><input type="hidden" name="partner" value={partner} /><input type="hidden" name="t" value={token} /></>);

  if (linked) {
    return (
      <form className="form" action={action}>
        {hidden}
        <input type="hidden" name="mode" value="go" />
        {state.message ? <p className="err">{state.message}</p> : null}
        <button className="sf-btn big" style={{ width: "100%", height: "auto", minHeight: 48, whiteSpace: "normal", lineHeight: 1.4, padding: "10px 16px" }} type="submit" disabled={pending}>계속</button>
      </form>
    );
  }
  /* 단추는 동의 칸 **아래**에 두고, 필수 칸을 다 체크하기 전에는 누를 수 없다(2026-11-02 운영 시험:
     `잇기` 단추가 약관 칸보다 위에 있어 동의 전에 누를 수 있어 보였다). 막는 자리는 서버도 같다 */
  const BTN = { width: "100%", height: "auto", minHeight: 48, whiteSpace: "normal", lineHeight: 1.4, padding: "10px 16px" } as const;
  return (
    <>
      {me ? (
        <form className="form" action={action} style={{ marginBottom: 20 }}>
          {hidden}
          <input type="hidden" name="mode" value="link" />
          <label className="cnrow" style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "0 0 12px" }}>
            <input type="checkbox" name="link_ok" value="1" required checked={linkOk}
              onChange={(e) => setLinkOk(e.target.checked)} />
            <span><b className="cntag is-req">필수</b> 위에 적힌 넘겨받는 항목을 지금 로그인한 CareerMatri 계정({me})에 잇는 데 동의합니다.</span>
          </label>
          {state.message ? <p className="err">{state.message}</p> : null}
          <button className="sf-btn big" style={BTN} type="submit" disabled={pending || !linkOk}>지금 로그인한 계정({me})과 잇기</button>
        </form>
      ) : null}
      <form className="form" action={action}>
        {hidden}
        <input type="hidden" name="mode" value="new" />
        {me ? <p className="sub" style={{ margin: "0 0 8px" }}>다른 계정으로 쓰려면 새 계정으로 시작할 수 있어요.</p> : null}
        <ConsentBlock items={items} labels={labels} onReady={setReady} />
        {!me && state.message ? <p className="err">{state.message}</p> : null}
        <button className={me ? "sf-btn ghost big" : "sf-btn big"} style={BTN} type="submit" disabled={pending || !ready}>
          {me ? "약관에 동의하고 새 계정으로 시작" : "동의하고 시작"}
        </button>
      </form>
      {!me ? (
        <form className="form" action={action} style={{ marginTop: 12 }}>
          {hidden}
          <input type="hidden" name="mode" value="link" />
          <button className="sf-btn ghost big" style={BTN} type="submit" disabled={pending}>이미 계정이 있어요 · 로그인하고 잇기</button>
        </form>
      ) : null}
    </>
  );
}
