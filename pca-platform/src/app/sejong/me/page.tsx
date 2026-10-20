import Link from "next/link";
import { requireSejong } from "@/sejong/lib/session";
import { latestAttempt, experienceRows, renderStatus, responsesOf } from "@/sejong/lib/store";
import { consentState } from "@/sejong/lib/access";
import { sejongContent, areaName } from "@/sejong/lib/content";
import { queryOne } from "@/lib/db";
import { setConsentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SejongMe() {
  const a = await requireSejong("participant");
  const { instrument } = sejongContent();
  const att = await latestAttempt(a.userId);
  const exps = await experienceRows(a.userId);
  const consent = await consentState(a.userId, a.orgId);
  const pdf = att?.status === "scored" ? await renderStatus(att.id) : null;
  const answered = att ? Object.keys(await responsesOf(att.id)).length : 0;
  const total = instrument.sections.reduce((n, s) => n + s.items.length, 0);
  const program = await queryOne<{ name: string }>(`SELECT name FROM sj_programs WHERE code = $1`, [a.programCode]);
  const counselor = await queryOne<{ display_name: string }>(
    `SELECT u.display_name FROM sj_counselor_assignments c JOIN users u ON u.id = c.counselor_user_id
      WHERE c.org_id = $1 AND c.participant_user_id = $2 AND c.active LIMIT 1`, [a.orgId, a.userId]);

  const scored = att?.status === "scored";
  const steps = [
    { n: 1, title: "희망 직무와 지역 고르기", done: Boolean(att), href: "/sejong/diagnosis", cta: att ? "다시 보기" : "시작" },
    { n: 2, title: `직무 경험 진단 (${answered}/${total})`, done: scored, href: att && !scored ? `/sejong/diagnosis/${att.id}` : "/sejong/diagnosis", cta: scored ? "완료" : att ? "이어하기" : "시작" },
    { n: 3, title: `경험 기록 (${exps.length}건)`, done: exps.length > 0, href: "/sejong/experience", cta: "기록하기" },
    { n: 4, title: "결과와 역량 분석", done: scored, href: "/sejong/result", cta: "보기" },
    { n: 5, title: "세종 사업장 탐색", done: false, href: "/sejong/explore", cta: "탐색" },
    { n: 6, title: "실행 계획과 결과지 PDF", done: Boolean(pdf && pdf.ok > 0), href: "/sejong/plan", cta: "열기" },
  ];
  const nowStep = steps.find((s) => !s.done)?.n ?? 6;

  return (
    <>
      <h1>{a.user.name}님의 대시보드</h1>
      <p className="lead">
        {program?.name ?? a.programCode} · 참여번호 {a.participantNo}
        {counselor ? ` · 담당 상담사 ${counselor.display_name}` : ""}
      </p>

      <div className="sj-grid c3 sj-section">
        <div className="sj-card sj-kpi"><b>{scored ? "완료" : att ? "진행 중" : "시작 전"}</b><span>진단 상태</span></div>
        <div className="sj-card sj-kpi"><b>{exps.length}건</b><span>기록한 경험</span></div>
        <div className="sj-card sj-kpi"><b>{pdf?.ok ? `${pdf.ok}회` : "아직"}</b><span>결과지 PDF 생성</span></div>
      </div>

      <section className="sj-section">
        <h2>다음 할 일</h2>
        <div className="sj-step-list">
          {steps.map((s) => (
            <div key={s.n} className={`sj-step${s.done ? " done" : ""}${s.n === nowStep ? " now" : ""}`}>
              <span className="n">{s.done ? "✓" : s.n}</span>
              <span>{s.title}</span>
              <Link className={`sj-btn small${s.n === nowStep ? "" : " ghost"}`} href={s.href}>{s.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {att?.profile?.job_areas?.length ? (
        <section className="sj-section sj-card">
          <h3>고른 희망 직무</h3>
          <div className="sj-choices">
            {att.profile.job_areas.map((c) => <span key={c} className="sj-badge brand">{areaName(c)}</span>)}
          </div>
        </section>
      ) : null}

      <section className="sj-section sj-card">
        <h2>상담사 결과 열람 동의</h2>
        <p className="small">
          동의하면 배정된 상담사가 내 진단 결과와 결과지를 볼 수 있습니다. 경험 기록의 메모 원문은 보지 않습니다.
          언제든 철회할 수 있고, 철회하면 바로 닫힙니다. 누가 언제 열었는지는 기록됩니다.
        </p>
        <p className="small">
          지금 상태: {consent.granted
            ? <span className="sj-badge ok">동의함</span>
            : <span className="sj-badge">동의하지 않음</span>}
          {consent.at ? <span className="muted small"> · {consent.at.slice(0, 16)}</span> : null}
        </p>
        <form action={setConsentAction} className="sj-actions">
          <input type="hidden" name="granted" value={consent.granted ? "0" : "1"} />
          <button className={`sj-btn small${consent.granted ? " ghost" : ""}`} type="submit">
            {consent.granted ? "동의 철회" : "상담사 열람에 동의"}
          </button>
        </form>
      </section>
    </>
  );
}
