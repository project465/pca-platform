"use client";

import { useActionState } from "react";
import ConsentBlock, {
  type ConsentItem, type ConsentLabels,
} from "../consent-block";
import { createSocialAccount, type SocialState } from "./actions";

/**
 * 동의만 받는 폼.
 *
 * **같은 `ConsentBlock` 을 쓴다.** 소셜 쪽에 체크박스를 따로 그리면 두
 * 가입 길이 다른 동의를 받게 되고, 한쪽을 고친 날 다른 쪽이 뒤처진다.
 */
export default function SocialSignupForm({
  token, next, items, labels, submitLabel,
}: {
  token: string;
  next: string;
  items: ConsentItem[];
  labels: ConsentLabels;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<SocialState, FormData>(
    createSocialAccount, {},
  );

  return (
    <form className="form" action={action}>
      {/* 신원은 봉한 봉투 안에 있다. 화면이 고쳐 보낼 수 있는 값이 없다 */}
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="next" value={next} />

      <ConsentBlock items={items} labels={labels} />

      {state.message ? <p className="err">{state.message}</p> : null}

      <button className="btn-primary" type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
