"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/actions";
import type { SiteContent } from "@/content";

const initial: ContactState = {};

export default function Contact({ site }: { site: SiteContent }) {
  const [state, formAction, pending] = useActionState(submitContact, initial);
  const t = site.contact;

  return (
    <section className="contact" id="contact">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t.heading}</h2>
          <p className="lead">{t.lead}</p>
        </div>

        {state.ok ? (
          <p className="notice ok" style={{ maxWidth: 720 }} role="status">
            <b>{t.success}</b>
            {t.successBody}
          </p>
        ) : (
          <form action={formAction} className="form">
            {state.error ? (
              <p className="notice err full" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="field full">
              <label htmlFor="org">{t.fields.org}</label>
              <input id="org" name="org" type="text" required maxLength={200} />
            </div>

            <div className="field">
              <label htmlFor="name">{t.fields.name}</label>
              <input id="name" name="name" type="text" required maxLength={100} />
            </div>

            <div className="field">
              <label htmlFor="email">{t.fields.email}</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={200}
              />
            </div>

            <div className="field">
              <label htmlFor="size">{t.fields.size}</label>
              <input id="size" name="size" type="text" inputMode="numeric" maxLength={50} />
              <span className="hint">{t.fields.sizeHint}</span>
            </div>

            <div className="field full">
              <label htmlFor="message">{t.fields.message}</label>
              <textarea id="message" name="message" maxLength={4000} />
              <span className="hint">{t.fields.messageHint}</span>
            </div>

            <div className="full">
              <button className="btn solid lg" type="submit" disabled={pending}>
                {pending ? t.sending : t.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
