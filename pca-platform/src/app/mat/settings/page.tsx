import { matTitle } from "@/lib/mat/title";
import { requireUser } from "@/lib/session";
import { settingsOf } from "@/lib/assistant/settings";
import { aiReady } from "@/lib/assistant/claude";
import { pushKeys } from "@/lib/push";
import { PushToggle } from "@/components/push-toggle";
import { changeConsent, changeDigest, changeFileConsent } from "@/app/me/track/actions";
import ConsentButton from "./consent-button";
import LangSwitch from "@/components/lang-switch";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { SETTINGS_TEXT as S, TITLE_TEXT } from "../mat-text";

export const generateMetadata = () => matTitle(TITLE_TEXT.settings);

/* 켜는 순간의 동의 창에 띄우는 고지(법적 고지라 내용은 `/me/track` 에 있던 그대로). 글은 `mat-text.ts` SETTINGS_TEXT */

/**
 * MAT 설정(2026-11-03 대표 "학생이 보는 MAT는 /mat 하나로"). `/me/track` 에 있던 AI 분석 · 파일 읽기 · 알림을 옮겼다.
 * **제목 · 상태 · 단추만** 둔다. 동의 문구는 켜는 순간의 창에서 보인다(`ConsentButton`).
 */
export default async function MatSettings() {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const set = await settingsOf(user.id);
  const onOff = (v: unknown) => (v ? t(S.on) : t(S.off));
  const btn = (v: unknown) => (v ? t(S.turnOff) : t(S.turnOn));
  const pushKey = pushKeys()?.publicKey ?? null;
  const ready = aiReady();
  return (
    <main>
      <div className="mt-top"><span className="mt-week">MAT</span></div>
      <h1 className="mt-h1">{t(S.title)}</h1>

      <h2 className="mt-h2">{t(S.lang)}</h2>
      <ul className="mt-incl"><li>{t(S.lang)}<span><LangSwitch current={lang} /></span></li></ul>

      <h2 className="mt-h2">AI</h2>
      <ul className="mt-incl">
        <li>{t(S.ai)} {onOff(set.ai_consent_at)}{ready ? "" : t(S.notReady)}
          <span><ConsentButton action={changeConsent} on={!!set.ai_consent_at}
            label={btn(set.ai_consent_at)} notice={t(S.aiNotice)} /></span></li>
        <li>{t(S.file)} {onOff(set.file_consent_at)}
          <span><ConsentButton action={changeFileConsent} on={!!set.file_consent_at}
            label={btn(set.file_consent_at)} notice={t(S.fileNotice)} /></span></li>
      </ul>

      <h2 className="mt-h2">{t(S.alerts)}</h2>
      <ul className="mt-incl">
        <li>{t(S.digest)} {onOff(set.email_digest)}
          <span><ConsentButton action={changeDigest} on={!!set.email_digest}
            label={btn(set.email_digest)} /></span></li>
        {pushKey ? <li>{t(S.push)}<span><PushToggle publicKey={pushKey} /></span></li> : null}
      </ul>
    </main>
  );
}
