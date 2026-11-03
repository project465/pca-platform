import { matTitle } from "@/lib/mat/title";
import { requireUser } from "@/lib/session";
import { settingsOf } from "@/lib/assistant/settings";
import { aiReady } from "@/lib/assistant/claude";
import { pushKeys } from "@/lib/push";
import { PushToggle } from "@/components/push-toggle";
import { changeConsent, changeDigest, changeFileConsent } from "@/app/me/track/actions";
import ConsentButton from "./consent-button";

export const generateMetadata = () => matTitle("설정");

/* 켜는 순간의 동의 창에 띄우는 고지(법적 고지라 내용은 `/me/track` 에 있던 그대로) */
const AI_NOTICE = "AI 분석을 켜면 붙여 넣은 공고와 메모가 Anthropic(미국)의 Claude로 보내져 읽힙니다.\n"
  + "이름과 연락처는 보내지 않습니다. 끄면 이 서비스 안에서만 읽고 밖으로 보내지 않습니다.\n\n동의하고 켤까요?";
const FILE_NOTICE = "파일 읽기를 켜면 올린 파일이 Anthropic(미국)의 Claude로 보내져 읽힙니다.\n"
  + "파일에 적힌 이름 · 학번 · 생년월일도 함께 보내집니다. 원본 파일은 읽은 뒤 바로 버립니다.\n\n동의하고 켤까요?";

/**
 * MAT 설정(2026-11-03 대표 "학생이 보는 MAT는 /mat 하나로"). `/me/track` 에 있던 AI 분석 · 파일 읽기 · 알림을 옮겼다.
 * **제목 · 상태 · 단추만** 둔다. 동의 문구는 켜는 순간의 창에서 보인다(`ConsentButton`).
 */
export default async function MatSettings() {
  const user = await requireUser();
  const set = await settingsOf(user.id);
  const pushKey = pushKeys()?.publicKey ?? null;
  const ready = aiReady();
  return (
    <main>
      <div className="mt-top"><span className="mt-week">MAT</span></div>
      <h1 className="mt-h1">설정</h1>

      <h2 className="mt-h2">AI</h2>
      <ul className="mt-incl">
        <li>AI 분석 {set.ai_consent_at ? "켜짐" : "꺼짐"}{ready ? "" : " · 준비 중"}
          <span><ConsentButton action={changeConsent} on={!!set.ai_consent_at}
            label={set.ai_consent_at ? "끄기" : "켜기"} notice={AI_NOTICE} /></span></li>
        <li>파일 읽기 {set.file_consent_at ? "켜짐" : "꺼짐"}
          <span><ConsentButton action={changeFileConsent} on={!!set.file_consent_at}
            label={set.file_consent_at ? "끄기" : "켜기"} notice={FILE_NOTICE} /></span></li>
      </ul>

      <h2 className="mt-h2">알림</h2>
      <ul className="mt-incl">
        <li>주간 메일 {set.email_digest ? "켜짐" : "꺼짐"}
          <span><ConsentButton action={changeDigest} on={!!set.email_digest}
            label={set.email_digest ? "끄기" : "켜기"} /></span></li>
        {pushKey ? <li>웹 알림<span><PushToggle publicKey={pushKey} /></span></li> : null}
      </ul>
    </main>
  );
}
