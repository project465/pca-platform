"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/actions";
import type { SiteContent } from "@/content";

const initial: ContactState = {};

/**
 * 문의 폼.
 *
 * 첫 화면에는 세 칸짜리(compact)를, 페이지 끝에는 전부 있는(full) 것을 둔다.
 * 처음 본 사람이 스크롤하지 않고도 남길 수 있어야 하고, 끝까지 읽은 사람은
 * 인원과 하고 싶은 말을 더 적을 수 있어야 하기 때문이다. 보내는 곳은 하나다.
 *
 * 두 폼이 한 페이지에 있으므로 id 가 겹치지 않게 앞에 이름을 붙인다.
 */
export default function InquiryForm({
  site,
  variant,
  idPrefix,
}: {
  site: SiteContent;
  variant: "compact" | "full";
  idPrefix: string;
}) {
  const [state, formAction, pending] = useActionState(submitContact, initial);
  const t = site.contact;
  const id = (n: string) => `${idPrefix}-${n}`;
  const compact = variant === "compact";

  if (state.ok) {
    return (
      <p className="notice ok" role="status" style={compact ? undefined : { maxWidth: 720 }}>
        <b>{t.success}</b>
        {t.successBody}
        {/* 접수번호는 플랫폼이 붙여 준다. 연결 전 배포에서는 없을 수 있다 */}
        {state.refCode ? (
          <>
            <br />
            <span className="mono">{state.refCode}</span>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <form action={formAction} className={compact ? "form compact" : "form"}>
      {state.error ? (
        <p className="notice err full" role="alert">
          {state.error}
        </p>
      ) : null}

      {compact ? null : (
        <div className="field full">
          <label htmlFor={id("plan")}>{site.pricing.planLabel}</label>
          <select id={id("plan")} name="plan" defaultValue="">
            <option value="">—</option>
            {site.pricing.plans.map((pl) => (
              <option key={pl.key} value={pl.key}>
                {pl.name} · {pl.who}
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset className="typepick full">
        <legend>{t.typeLabel}</legend>
        {t.types.map((ty, i) => (
          <label key={ty.value} htmlFor={id(`t-${ty.value}`)}>
            <input
              id={id(`t-${ty.value}`)}
              type="radio"
              name="kind"
              value={ty.value}
              defaultChecked={i === 0}
            />
            <span>{ty.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="field full">
        <label htmlFor={id("org")}>{t.fields.org}</label>
        <input id={id("org")} name="org" type="text" required maxLength={200} />
      </div>

      <div className={compact ? "field full" : "field"}>
        <label htmlFor={id("name")}>{t.fields.name}</label>
        <input id={id("name")} name="name" type="text" required maxLength={100} />
      </div>

      <div className={compact ? "field full" : "field"}>
        <label htmlFor={id("email")}>{t.fields.email}</label>
        <input
          id={id("email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={200}
        />
      </div>

      {compact ? null : (
        <>
          <div className="field">
            <label htmlFor={id("size")}>{t.fields.size}</label>
            <input id={id("size")} name="size" type="text" inputMode="numeric" maxLength={50} />
            <span className="hint">{t.fields.sizeHint}</span>
          </div>
          <div className="field full">
            <label htmlFor={id("message")}>{t.fields.message}</label>
            <textarea id={id("message")} name="message" maxLength={4000} />
            <span className="hint">{t.fields.messageHint}</span>
          </div>
        </>
      )}

      {/* 보내기 직전에 알린다. 다 보낸 뒤에 알리면 알린 것이 아니다 */}
      {t.privacyNote ? (
        <p className="privacy-note full">
          {/* 알리는 문장은 링크가 없어도 남긴다. 무엇을 받아 어디에 쓰는지
              보내기 전에 알리는 것이 본질이고, 전문 링크는 곁들이다 */}
          {t.privacyNote.text}
          {site.privacyUrl ? (
            <>
              {" "}
              <a href={site.privacyUrl} target="_blank" rel="noreferrer">
                {t.privacyNote.linkLabel}
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="full">
        <button className={`btn solid${compact ? " full-w" : " lg"}`} type="submit" disabled={pending}>
          {pending ? t.sending : compact ? t.quickSubmit : t.submit}
        </button>
        <ol className="afterlist">
          <li className="l">{t.afterLabel}</li>
          {t.after.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
      </div>
    </form>
  );
}
