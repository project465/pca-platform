import Link from "next/link";
import { Icon } from "@/components/sf/icon";
import { PrimaryActionHero, SectionHeader } from "@/app/me/ui";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { kusTodos } from "@/lib/kus/home";
import { MODE_NOTE, UNSUPPORTED_NOTE } from "@/lib/kus/analysis";
import { MODE_KO } from "@/lib/kus/program";
import { KusHead, KusNote, KusShell } from "./shell";

export const dynamic = "force-dynamic";

/**
 * KUS 학생 홈.
 *
 * **5초 안에 셋을 알아야 한다**: 검사가 어디까지 왔는가 · 지금 어떤
 * 상태인가 · 다음에 무엇을 하는가. 카드 넷은 그 셋과 기업탐방이고, 담긴
 * 값은 전부 그 사람의 실제 자료다. 자료가 없는 칸은 비어 있다고 적는다.
 *
 * **점수를 크게 세우지 않는다.** 카드의 수는 센 것(답한 문항 · 확인된
 * 판단 칸 · 기록 건수)이고 백분위나 적합도가 아니다.
 */
export default async function KusHome() {
  const { user, me } = await requireKusStudent();
  const w = await kusWorkspace(user, me);
  const a = w.bundle?.analysis ?? null;
  const todos = kusTodos({ mode: w.mode, st: w.st, analysis: a, visits: w.visits, programs: w.programs, unsupported: w.unsupported });
  const note = w.unsupported ? UNSUPPORTED_NOTE : MODE_NOTE[w.mode];
  const open = w.mode !== "PREPARING";

  const hero = w.st.kind === "resume"
    ? { tag: "검사 진행 중", title: `검사를 푸는 중이에요 · ${w.st.answered}문항 답함`, why: "멈춘 화면에서 이어집니다. 답은 문항마다 저장되어 있습니다.",
        href: `/v3/${w.st.attemptId}`, cta: "이어서 답하기" }
    : a
      ? { tag: a.status.badge, title: a.status.title, why: a.status.lead, href: "/kus/result", cta: "나의 분석 결과 보기" }
      : w.unsupported
        ? { tag: "검사 이용 불가", title: `${w.dept} 검사는 아직 열리지 않았어요`,
            why: "학과 전공 기준이 아직 없어 결과를 내지 않습니다. 다른 전공 검사로 대신 재지 않습니다. 계정과 기업탐방 기록은 지금 쓸 수 있습니다.",
            href: "/kus/visits/new", cta: "기업탐방 기록하기" }
      : open
        ? { tag: "검사 전", title: `${w.dept} 기준 전공 검사를 아직 시작하지 않았어요`, why: "검사를 끝내면 개인별 분석 · 실행 계획 · 보고서가 이 자리에 섭니다.",
            href: "/campus/kus/start", cta: "검사 시작하기" }
        : { tag: MODE_KO.PREPARING, title: `${w.dept} 검사는 아직 준비 중이에요`, why: "그동안 기업탐방 기록은 남길 수 있습니다. 검사가 열리면 이 자리에 시작 단추가 섭니다.",
            href: "/kus/visits", cta: "기업탐방 기록 보기" };

  const progress = w.st.kind === "resume" ? { v: "진행 중", s: `${w.st.answered}문항 답함 · 이어하기`, pill: "is-go" }
    : w.unsupported ? { v: "검사 이용 불가", s: "학과 전공 기준 준비 전", pill: "" }
    : w.st.kind === "start" ? { v: open ? "시작 전" : MODE_KO.PREPARING, s: open ? "학교 진입 검사는 PRO 로 엽니다" : "학과 검사 준비 중", pill: "" }
      : { v: "제출 완료", s: w.bundle ? `${w.bundle.answered}문항 · 결과 확정 ${w.bundle.resultAt ?? ""}` : "결과를 확인하세요", pill: "is-ok" };
  const did = w.visits.filter((v) => v.activities.some((x) => ["HANDS_ON", "TASK", "PRESENT"].includes(x))).length;

  return (
    <KusShell active="/kus" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker={`${w.college} · ${w.dept}`} title={`${w.name}님의 Career Workspace`}
        lead="검사 · 분석 결과 · 기업탐방 기록 · 실행 계획을 한 자리에서 봅니다." />
      {note ? <KusNote>{note}</KusNote> : null}

      <PrimaryActionHero tag={hero.tag} title={hero.title} why={hero.why}
        action={<Link className="cm-btn is-primary" href={hero.href}>{hero.cta}</Link>}
        more={a ? <Link className="cm-hero-more" href="/kus/plan">실행 계획</Link> : undefined} />

      <div className="kus-stats">
        <Link className="kus-stat" href="/kus/assessment">
          <span className="kus-stat-k"><Icon name="clipboard" />검사 진행</span>
          <span className="kus-stat-v">{progress.v}</span>
          <span className="kus-stat-s">{progress.s}</span>
        </Link>
        <Link className="kus-stat" href="/kus/result">
          <span className="kus-stat-k"><Icon name="chart" />나의 현재 상태</span>
          <span className="kus-stat-v">{a ? a.status.badge : "결과 전"}</span>
          <span className="kus-stat-s">{a ? `확인된 판단 ${a.status.counts.confirmed}칸 · 근거가 선 영역 ${a.status.counts.ready_domains}개` : "검사를 끝내면 섭니다"}</span>
        </Link>
        <Link className="kus-stat" href="/kus/visits">
          <span className="kus-stat-k"><Icon name="building" />기업탐방</span>
          <span className="kus-stat-v">기록 {w.visits.length}건</span>
          <span className="kus-stat-s">직접 해 본 활동 {did}건 · 등록된 탐방 {w.programs.length}곳</span>
        </Link>
        <Link className="kus-stat" href="/kus/report">
          <span className="kus-stat-k"><Icon name="doc" />보고서</span>
          <span className="kus-stat-v">{w.bundle ? "내려받기 가능" : "결과 전"}</span>
          <span className="kus-stat-s">{w.bundle ? "개인 리포트 PDF · 10쪽 안팎" : "검사를 끝내면 열립니다"}</span>
        </Link>
      </div>

      <div className="kus-cols">
        <section className="kus-panel">
          <SectionHeader icon="target" title="지금 해야 할 일" />
          {todos.length ? (
            <ol className="kus-todo">
              {todos.map((t) => (
                <li key={t.title}><div><b>{t.title}</b><small>{t.why}</small><Link href={t.href}>{t.cta} →</Link></div></li>
              ))}
            </ol>
          ) : <p className="cm-shsub">지금 남은 할 일이 없습니다.</p>}
        </section>

        <section className="kus-panel">
          <SectionHeader icon="chart" title="최근 분석 결과" moreHref={a ? "/kus/result" : undefined} moreLabel="전체 보기" />
          {a ? (
            <dl className="kus-kv">
              <dt>지금 상태</dt><dd><span className="kus-pill is-go">{a.status.badge}</span></dd>
              <dt>먼저 볼 영역</dt><dd>{a.major.rows.slice(0, 3).map((r) => r.name).join(" · ") || "—"}</dd>
              <dt>근거가 선 영역</dt><dd>{a.evidence.ready.map((g) => g.domain).join(" · ") || "아직 없음"}</dd>
              <dt>준비가 필요한 것</dt><dd>{a.gaps[0] ? `${a.gaps[0].domains} — ${a.gaps[0].title}` : "결과가 적은 빈자리가 없음"}</dd>
              <dt>응답 품질</dt><dd>{a.status.quality.text}</dd>
            </dl>
          ) : <p className="cm-shsub">아직 결과가 없습니다. 검사를 끝내면 이 자리에 섭니다.</p>}
        </section>
      </div>

      <section className="kus-panel">
        <SectionHeader icon="building" title="기업탐방 프로그램" moreHref="/kus/visits" moreLabel="기록 전체" />
        <p className="cm-shsub">
          탐방에서 본 직무와 이해한 것을 남기면 결과와 나란히 보고, 자기소개서·면접 초안으로 꺼내 씁니다.
          방문했다는 사실만으로 역량이 판정되지는 않습니다.
        </p>
        {w.programs.length ? (
          <div className="kus-scroll"><table className="kus-table">
            <thead><tr><th>탐방 기업</th><th>날짜</th><th>상태</th><th>확인</th></tr></thead>
            <tbody>{w.programs.map((p) => (
              <tr key={p.id}>
                <td><b>{p.company_name}</b>{p.is_test ? <> <span className="kus-pill is-test">테스트</span></> : null}{p.business_note ? <><br /><small>{p.business_note}</small></> : null}</td>
                <td>{p.visit_date ?? "미정"}</td>
                <td>{({ PLANNED: "예정", CONFIRMED: "확정", DONE: "완료", CANCELLED: "취소" } as const)[p.status]}</td>
                <td>{p.source_note ? "담당자 확인" : "확인 전"}</td>
              </tr>))}</tbody>
          </table></div>
        ) : <p className="cm-shsub">아직 등록된 탐방 기업이 없습니다. 담당자가 등록하면 이 자리에 섭니다.</p>}
        <div className="kus-actions" style={{ marginTop: 12 }}>
          <Link className="cm-btn is-primary" href="/kus/visits/new">탐방 기록하기</Link>
          <Link className="cm-btn" href="/kus/visits">내 기록 {w.visits.length}건</Link>
        </div>
      </section>

      <div className="kus-cols">
        <section className="kus-panel">
          <SectionHeader icon="target" title="개인별 실행 계획" moreHref="/kus/plan" moreLabel="30·60·90일 전체" />
          {a ? (
            <ol className="kus-todo">{a.plan.d30.slice(0, 3).map((x) => <li key={x.do}><div><b>30일 안에</b><small>{x.do}</small></div></li>)}</ol>
          ) : <p className="cm-shsub">검사 결과가 나오면 결과 모델이 정한 때에 맞춰 섭니다.</p>}
        </section>
        <section className="kus-panel">
          <SectionHeader icon="doc" title="보고서 다운로드" />
          {w.bundle ? (
            <>
              <p className="cm-shsub">검사 결과 · 탐방 기록 · 실행 계획을 묶은 개인 리포트입니다. 내려받을 때마다 지금 기록으로 다시 만듭니다.</p>
              <div className="kus-actions">
                <a className="cm-btn is-primary" href={`/kus/report/${w.bundle.attemptId}/pdf`}>PDF 내려받기</a>
                <a className="cm-btn" href={`/kus/report/${w.bundle.attemptId}`} target="_blank" rel="noreferrer">웹으로 보기</a>
              </div>
            </>
          ) : <p className="cm-shsub">검사를 끝내면 내려받을 수 있습니다.</p>}
        </section>
      </div>
    </KusShell>
  );
}
