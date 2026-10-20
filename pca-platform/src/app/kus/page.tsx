import Link from "next/link";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { kusTodos } from "@/lib/kus/home";
import { withJosa } from "@/lib/me-v3/result/josa";
import { MODE_NOTE, UNSUPPORTED_NOTE } from "@/lib/kus/analysis";
import { KusCard, KusHead, KusNote, KusShell } from "./shell";

export const dynamic = "force-dynamic";

const PROGRAM_KO = { PLANNED: "예정", CONFIRMED: "확정", DONE: "다녀옴", CANCELLED: "취소" } as const;

/**
 * KUS 학생 홈. 맨 위 한 장이 지금 할 한 가지를 들고, 그 아래는 눌러 들어가는 줄뿐이다.
 *
 * **점수를 크게 세우지 않는다.** 줄의 값은 센 것(답한 문항 · 기록 건수)과 상태 이름이고
 * 백분위나 적합도가 아니다. 자료가 없는 줄은 비어 있다고 적는다.
 */
export default async function KusHome() {
  const { user, me } = await requireKusStudent();
  const w = await kusWorkspace(user, me);
  const a = w.bundle?.analysis ?? null;
  const todos = kusTodos({ mode: w.mode, st: w.st, analysis: a, visits: w.visits, programs: w.programs, unsupported: w.unsupported });
  const note = w.unsupported ? UNSUPPORTED_NOTE : MODE_NOTE[w.mode];
  const open = w.mode !== "PREPARING";
  const name = w.name.replace(/^\[[^\]]*\]\s*/, "").trim() || w.name;

  const hero = w.st.kind === "resume"
    ? { title: "검사를 푸는 중이에요", lead: `${w.st.answered}문항까지 답했어요. 멈춘 곳부터 이어서 할 수 있어요.`,
        href: `/v3/${w.st.attemptId}`, cta: "이어서 답하기" }
    : a
      ? { title: a.status.title, lead: a.status.lead, href: "/kus/result", cta: "나의 분석 결과 보기" }
      : w.unsupported
        ? { title: `${withJosa(w.dept, "은는")} 아직 검사가 없어요`, lead: "기업탐방 기록은 지금 바로 남길 수 있어요.",
            href: "/kus/visits/new", cta: "기업탐방 기록하기" }
        : open
          ? { title: `${name}님, 전공 검사를 시작해 볼까요?`, lead: "30분쯤 걸려요. 중간에 나가도 이어서 할 수 있어요.",
              href: "/campus/kus/start", cta: "검사 시작하기" }
          : { title: `${w.dept} 검사를 준비하고 있어요`, lead: "그동안 기업탐방 기록은 남길 수 있어요.",
              href: "/kus/visits", cta: "기업탐방 기록 보기" };

  const progress = w.st.kind === "resume" ? `진행 중 · ${w.st.answered}문항`
    : w.unsupported ? "아직 없어요"
    : w.st.kind === "start" ? (open ? "시작 전" : "준비 중")
      : "제출 완료";
  const did = w.visits.filter((v) => v.activities.some((x) => ["HANDS_ON", "TASK", "PRESENT"].includes(x))).length;
  const nextTodos = todos.filter((t) => t.href !== hero.href);

  return (
    <KusShell active="/kus" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker={`${w.college} · ${w.dept}`} title={`${name}님의 진로 기록`} />
      {note ? <KusNote>{note}</KusNote> : null}

      <section className="kus-hero">
        {a ? <p className="kus-head-badge"><span className="kus-chip is-blue">{a.status.badge}</span></p> : null}
        <h2 className="kus-h1">{hero.title}</h2>
        <p className="kus-lead">{hero.lead}</p>
        <div className="kus-actions">
          <Link className="kus-btn" href={hero.href}>{hero.cta}</Link>
          {a ? <Link className="kus-btn is-sub" href="/kus/plan">실행 계획</Link> : null}
        </div>
      </section>

      <KusCard>
        <ul className="kus-rows">
          <li><Link className="kus-row" href="/kus/assessment"><span className="kus-row-main"><span className="kus-row-t">검사</span></span><span className="kus-row-v">{progress}</span></Link></li>
          <li><Link className="kus-row" href="/kus/result"><span className="kus-row-main"><span className="kus-row-t">분석 결과</span>
            {a ? <span className="kus-row-s">해 봤다고 답한 판단 {a.status.counts.confirmed}개 · 근거가 충분한 영역 {a.status.counts.ready_domains}개</span> : null}</span>
            <span className="kus-row-v">{a ? a.status.badge : "검사 후에 볼 수 있어요"}</span></Link></li>
          <li><Link className="kus-row" href="/kus/visits"><span className="kus-row-main"><span className="kus-row-t">기업탐방 기록</span>
            {w.visits.length ? <span className="kus-row-s">직접 해 본 활동 {did}건</span> : null}</span>
            <span className="kus-row-v">{w.visits.length}건</span></Link></li>
          <li><Link className="kus-row" href="/kus/report"><span className="kus-row-main"><span className="kus-row-t">보고서</span></span>
            <span className="kus-row-v">{w.bundle ? "받을 수 있어요" : "검사 후에 볼 수 있어요"}</span></Link></li>
        </ul>
      </KusCard>

      {nextTodos.length ? (
        <KusCard title="이것도 해 보세요">
          <ul className="kus-rows">
            {nextTodos.map((t) => (
              <li key={t.title}><Link className="kus-row" href={t.href}>
                <span className="kus-row-main"><span className="kus-row-t">{t.title}</span><span className="kus-row-s">{t.why}</span></span>
              </Link></li>
            ))}
          </ul>
        </KusCard>
      ) : null}

      <KusCard title="기업탐방" more={{ href: "/kus/visits", label: "내 기록" }}>
        {w.programs.length ? (
          <ul className="kus-rows">{w.programs.map((p) => (
            <li key={p.id}><div className="kus-row">
              <span className="kus-row-main">
                <span className="kus-row-t">{p.company_name}{p.is_test ? <> <span className="kus-chip is-red">테스트</span></> : null}</span>
                <span className="kus-row-s">{p.visit_date ?? "날짜 미정"}{p.business_note ? ` · ${p.business_note}` : ""}</span>
              </span>
              <span className="kus-row-v">{PROGRAM_KO[p.status]}</span>
            </div></li>))}</ul>
        ) : <p className="kus-muted">아직 등록된 탐방이 없어요. 담당자가 등록하면 여기에 보여요.</p>}
        <div className="kus-actions" style={{ marginTop: 16 }}>
          <Link className="kus-btn is-sub" href="/kus/visits/new">탐방 기록하기</Link>
        </div>
      </KusCard>

      {a && a.plan.d30.length ? (
        <KusCard title="30일 안에 할 일" more={{ href: "/kus/plan", label: "전체 계획" }}>
          <ol className="kus-steps">{a.plan.d30.slice(0, 2).map((x) => <li key={x.do}><b>{x.do}</b></li>)}</ol>
        </KusCard>
      ) : null}
    </KusShell>
  );
}
