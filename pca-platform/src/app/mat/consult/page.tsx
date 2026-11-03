import Link from "next/link";
import { matTitle } from "@/lib/mat/title";
import { requireUser } from "@/lib/session";
import { CONSULT_KEEPS, CONSULT_SENDS, consultOpen, consultsOf } from "@/lib/careerpeak-consult";
import { openDay } from "@/lib/mat/open-dates";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { CONSULT_TEXT as C, TITLE_TEXT } from "../mat-text";

export const generateMetadata = () => matTitle(TITLE_TEXT.consult);

/* 보내는 것 · 보내지 않는 것의 영어(차례는 `CONSULT_SENDS` · `CONSULT_KEEPS` 와 같다) */
const SENDS_EN = ["One-page summary (title · summary · method · key results · skills for companies · fitting roles)", "Name", "Email address", "Phone number (if you gave one)"];
const KEEPS_EN = ["Original files you uploaded", "Application sentence outline · interview questions", "Test scores and result"];

/**
 * MAT 상담(예상 화면 5번). **지원서 첨삭 · 모의면접 상담은 커리어피크로**(2026-11-01 대표 결정).
 *
 * - 보내는 것 · 보내지 않는 것을 먼저 적는다(동의 전에 읽게). 보내기는 지금 쓰는 동의 화면에서 한다:
 *   보낼 정리를 고르고 동의해야 보낸다(`/me/track/research`, 상담 메일 · 동의 기록 · 하루 한 번 제한이 거기 있다)
 * - 상담 연결이 열리기 전에는 연다는 날을 그대로 적는다
 * - 학교 · 제휴사는 이 기록을 볼 수 없다
 */
export default async function MatConsult() {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const en = lang === "en";
  const [open, sent] = [consultOpen(), await consultsOf(user.id).catch(() => [])];
  const from = openDay("consult", lang);
  const sends = en && SENDS_EN.length === CONSULT_SENDS.length ? SENDS_EN : CONSULT_SENDS;
  const keeps = en && KEEPS_EN.length === CONSULT_KEEPS.length ? KEEPS_EN : CONSULT_KEEPS;
  return (
    <main>
      <h1 className="mt-h1">{t(C.title)}</h1>
      <p className="mt-lead">{t(C.lead)}</p>
      {en ? <p className="mt-note">{t(C.koOnly)}</p> : null}

      <section className="mt-diag" aria-label={t(C.aria)}>
        <div className="mt-diag-k"><span>{t(C.k)}</span><b>{open ? t(C.open) : t(C.from, { date: from })}</b></div>
        <p>{open ? t(C.openBody) : t(C.fromBody, { date: from })}</p>
        {open ? <Link href="/me/track/research#careerpeak">{t(C.pick)}</Link> : <Link href="/mat/draft">{t(C.tools)}</Link>}
      </section>

      <h2 className="mt-h2">{t(C.sends)}</h2>
      <ul className="mt-incl">{sends.map((s) => <li key={s}>{s}<span>{t(C.afterOk)}</span></li>)}</ul>
      <h2 className="mt-h2">{t(C.keeps)}</h2>
      <ul className="mt-incl">{keeps.map((s) => <li key={s}>{s}<span>{t(C.matOnly)}</span></li>)}</ul>
      {/* 상담을 신청하면 이름 · 연락처 · 한 장 요약이 커리어피크 상담사에게 간다. `제휴사는 볼 수 없다` 는 사실과 다르다(MAT 시험 M4) */}
      <p className="mt-note">{t(C.note)}</p>

      {sent.length ? (<>
        <h2 className="mt-h2">{t(C.sent)}</h2>
        <ul className="mt-incl">{sent.slice(0, 10).map((s, i) => <li key={i}>{t(C.sentRow)}<span>{s.sent_at.slice(0, 10)}</span></li>)}</ul>
      </>) : null}
    </main>
  );
}
