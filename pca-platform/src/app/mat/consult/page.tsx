import Link from "next/link";
import { matTitle } from "@/lib/mat/title";
import { requireUser } from "@/lib/session";
import { CONSULT_KEEPS, CONSULT_SENDS, consultOpen, consultsOf } from "@/lib/careerpeak-consult";
import { CONSULT_OPENS_KO } from "@/lib/mat/open-dates";

export const generateMetadata = () => matTitle("상담");

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
  const [open, sent] = [consultOpen(), await consultsOf(user.id).catch(() => [])];
  const from = CONSULT_OPENS_KO;
  return (
    <main>
      <h1 className="mt-h1">상담</h1>
      <p className="mt-lead">지원서 첨삭 · 모의면접은 커리어피크 상담사가 봐 드려요.</p>

      <section className="mt-diag" aria-label="상담 연결">
        <div className="mt-diag-k"><span>커리어피크 상담 연결</span><b>{open ? "열림" : `${from}부터`}</b></div>
        <p>{open ? "보낼 정리를 고르고 동의하면 신청돼요." : `${from}부터 신청할 수 있어요.`}</p>
        {open ? <Link href="/me/track/research#careerpeak">보낼 정리 고르기</Link> : <Link href="/mat/draft">문장 고치기 · 면접 연습</Link>}
      </section>

      <h2 className="mt-h2">보내는 것</h2>
      <ul className="mt-incl">{CONSULT_SENDS.map((s) => <li key={s}>{s}<span>동의 후</span></li>)}</ul>
      <h2 className="mt-h2">보내지 않는 것</h2>
      <ul className="mt-incl">{CONSULT_KEEPS.map((s) => <li key={s}>{s}<span>MAT에만</span></li>)}</ul>
      {/* 상담을 신청하면 이름 · 연락처 · 한 장 요약이 커리어피크 상담사에게 간다. `제휴사는 볼 수 없다` 는 사실과 다르다(MAT 시험 M4) */}
      <p className="mt-note">보낸 내용은 상담을 맡은 커리어피크 상담사만 봐요. 학교는 볼 수 없어요. 상담이 끝나고 1년 뒤 지워요.</p>

      <h2 className="mt-h2">보낸 신청</h2>
      {sent.length ? (
        <ul className="mt-incl">{sent.slice(0, 10).map((s, i) => <li key={i}>상담 신청<span>{s.sent_at.slice(0, 10)}</span></li>)}</ul>
      ) : <p className="mt-empty">아직 없어요.</p>}
    </main>
  );
}
