"use client";

import { useActionState } from "react";
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
  return (
    <>
      {me ? (
        <form className="form" action={action} style={{ marginBottom: 12 }}>
          {hidden}
          <input type="hidden" name="mode" value="link" />
          <button className="sf-btn big" style={{ width: "100%", height: "auto", minHeight: 48, whiteSpace: "normal", lineHeight: 1.4, padding: "10px 16px" }} type="submit" disabled={pending}>지금 로그인한 계정({me})과 잇기</button>
        </form>
      ) : null}
      <form className="form" action={action}>
        {hidden}
        <input type="hidden" name="mode" value="new" />
        <ConsentBlock items={items} labels={labels} />
        {state.message ? <p className="err">{state.message}</p> : null}
        <button className={me ? "sf-btn ghost big" : "sf-btn big"} style={{ width: "100%", height: "auto", minHeight: 48, whiteSpace: "normal", lineHeight: 1.4, padding: "10px 16px" }} type="submit" disabled={pending}>
          {me ? "새 계정으로 시작" : "동의하고 시작"}
        </button>
      </form>
      {!me ? (
        <form className="form" action={action} style={{ marginTop: 12 }}>
          {hidden}
          <input type="hidden" name="mode" value="link" />
          <button className="sf-btn ghost big" style={{ width: "100%", height: "auto", minHeight: 48, whiteSpace: "normal", lineHeight: 1.4, padding: "10px 16px" }} type="submit" disabled={pending}>이미 계정이 있어요 · 로그인하고 잇기</button>
        </form>
      ) : null}
    </>
  );
}
