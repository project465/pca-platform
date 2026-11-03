import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { settingsOf } from "@/lib/assistant/settings";
import { pendingFileDrafts, UPLOAD_MONTHLY_CAP, usedThisMonth } from "@/lib/assistant/upload";
import { MatFileDrop } from "./drop";
import { aiReady } from "@/lib/assistant/claude";
import { matMemoDraft } from "../actions";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { FILES_TEXT as F, TITLE_TEXT } from "../mat-text";

const ERR = { memo: F.errMemo, save: F.errSave } as const;

export const generateMetadata = () => matTitle(TITLE_TEXT.files);

/**
 * 경험 파일 올리기 · 확인(예상 화면 8 · 9번).
 *
 * - 8번: 파일을 올리면 읽어서 경험 초안으로 옮긴다. **학생이 확인하지 않은 것은 결과지 · 지원서 · 공고 비교에
 *   들어가지 않는다**(초안 상태는 계산에 쓰지 않는다)
 * - 9번: 확인할 초안 목록. 열면 경험 적기 화면에서 칸마다 고치고 저장한다(저장하면 할 일 · 겹치는 공고가 바로 바뀐다)
 * - 새 저장 공간 · DB 변경이 없다: 원본을 두지 않는 지금 방식 그대로다
 */
export default async function MatFiles({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const e = (await searchParams).e;
  /* 서비스 쪽에서 파일 읽기가 꺼져 있으면(키가 없다) 고르는 칸 · 동의 칸을 막고 메모 칸을 먼저 세운다 */
  const ready = aiReady();
  const [set, used, pending] = await Promise.all([
    settingsOf(user.id), usedThisMonth(user.id).catch(() => 0), pendingFileDrafts(user.id).catch(() => []),
  ]);
  const memo = (
    <form action={matMemoDraft} className="mt-form" id="memo">
      <label className="mt-field">
        <span>{t(F.memo)}</span>
        <textarea name="note" rows={5} required minLength={10} maxLength={4000}
          placeholder={t(F.memoHolder)} />
      </label>
      <button type="submit" className="mt-btn is-main is-block">{t(F.memoGo)}</button>
      <p className="mt-note">{ready && set.ai_consent_at ? t(F.memoAi) : t(F.memoLocal)}{t(F.memoSaved)}</p>
    </form>
  );
  return (
    <main>
      <h1 className="mt-h1">{t(F.title)}</h1>
      <p className="mt-lead">{ready ? t(F.leadReady) : t(F.leadOff)}</p>
      {e && e in ERR ? <p className="mt-alert" role="alert">{t(ERR[e as keyof typeof ERR])}</p> : null}
      {ready ? null : memo}
      <MatFileDrop ready={ready} consented={Boolean(set.file_consent_at)} used={used} cap={UPLOAD_MONTHLY_CAP} pending={pending} lang={lang} />
      {ready ? <><h2 className="mt-h2">{t(F.memoInstead)}</h2>{memo}</> : null}
    </main>
  );
}
