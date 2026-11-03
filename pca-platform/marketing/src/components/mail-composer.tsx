"use client";

import { useState } from "react";
import type { SiteContent } from "@/content/model";

type Form = SiteContent["contact"]["form"];
import { Icon } from "./icons";

/**
 * 문의를 메일로 보내도록 돕는 폼.
 *
 * **이 사이트에는 문의를 받는 서버가 없다.** 앞 판은 서버 파일
 * (`.inquiries/contact.jsonl`)에 줄을 쌓고 화면에 `접수되었습니다` 를
 * 적었는데, 그 파일을 읽는 사람도 알림도 없었다. 보낸 사람은 접수된 줄
 * 알고 기다리고 우리는 모른다. 받지 않은 것을 받았다고 적는 화면이다.
 *
 * 그래서 이 폼은 **아무것도 저장하지도 보내지도 않는다.** 적은 내용으로
 * 메일 앱을 열어 주고(`mailto:`), 메일 앱이 없는 사람을 위해 내용을 복사해
 * 준다. 보내기는 그 사람이 메일 앱에서 직접 누르고, 화면도 그렇게 적는다.
 */
/* 원고 전체를 넘기지 않는다: 브라우저로 가는 묶음에는 이 폼의 문구와 받는 주소만 실린다 */
export default function MailComposer({ form: f, to }: { form: Form; to: string }) {
  const [type, setType] = useState(f.types[0]);
  const [status, setStatus] = useState<"" | "opened" | "copied" | "need">("");

  function compose(form: HTMLFormElement) {
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    const org = get("org");
    const name = get("name");
    const message = get("message");
    if (!org && !message) return null;
    const lines = [
      f.bodyIntro,
      "",
      `${f.fields.type}: ${type}`,
      org && `${f.fields.org}: ${org}`,
      name && `${f.fields.name}: ${name}`,
      get("reply") && `${f.fields.reply}: ${get("reply")}`,
      get("size") && `${f.fields.size}: ${get("size")}`,
      "",
      message && `${f.fields.message}:`,
      message,
    ].filter((x): x is string => typeof x === "string");
    const subject = `${f.subject} ${type}${org ? ` · ${org}` : ""}`;
    return { subject, body: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const m = compose(e.currentTarget);
    if (!m) return setStatus("need");
    window.location.href =
      `mailto:${to}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
    setStatus("opened");
  }

  async function onCopy(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form) return;
    const m = compose(form);
    if (!m) return setStatus("need");
    const text = `${to}\n${m.subject}\n\n${m.body}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* 복사 권한이 없는 브라우저. 숨은 칸에 담아 고르게 한다 */
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setStatus("copied");
  }

  return (
    <form className="composer" onSubmit={onSubmit} noValidate>
      <div className="composer-head">
        <h2>{f.title}</h2>
        <p>{f.lead}</p>
      </div>

      <fieldset className="chips" aria-label={f.fields.type}>
        <legend>{f.fields.type}</legend>
        {f.types.map((t) => (
          <label key={t} className={t === type ? "is-on" : undefined}>
            <input type="radio" name="type" value={t} checked={t === type} onChange={() => setType(t)} />
            {t}
          </label>
        ))}
      </fieldset>

      <div className="field-row">
        <label className="field">
          <span>{f.fields.org}</span>
          <input name="org" placeholder={f.fields.orgHint} autoComplete="organization" />
        </label>
        <label className="field">
          <span>{f.fields.name}</span>
          <input name="name" placeholder={f.fields.nameHint} autoComplete="name" />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>{f.fields.reply}</span>
          <input name="reply" placeholder={f.fields.replyHint} autoComplete="email" />
        </label>
        <label className="field">
          <span>{f.fields.size}</span>
          <input name="size" placeholder={f.fields.sizeHint} />
        </label>
      </div>
      <label className="field">
        <span>{f.fields.message}</span>
        <textarea name="message" rows={5} placeholder={f.fields.messageHint} />
      </label>

      <div className="composer-acts">
        <button type="submit" className="btn btn-primary">
          <Icon name="mail" size={18} />
          {f.send}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCopy}>
          <Icon name="clipboard" size={18} />
          {f.copy}
        </button>
      </div>

      <p className="composer-honest">
        <Icon name="shield" size={16} />
        {f.honest}
      </p>

      <p className={`composer-status${status ? " is-on" : ""}${status === "need" ? " is-warn" : ""}`} role="status" aria-live="polite">
        {status === "opened" && f.opened}
        {status === "copied" && f.copiedAll}
        {status === "need" && f.needOrg}
      </p>
    </form>
  );
}
