import Link from "next/link";
import { SectionHeader } from "@/app/me/ui";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import type { PlanItem } from "@/lib/kus/analysis";
import { KusHead, KusShell } from "../shell";

export const dynamic = "force-dynamic";

/**
 * 30·60·90일 실행 계획. **때를 새로 정하지 않는다**: 결과 모델이 할 일마다
 * 정한 때(지금 · 다음 · 나중)를 30 · 60 · 90일로 옮기고, 탐방 쪽 할 일은
 * 기록의 상태에서만 더한다(`kusAnalysis().plan`).
 */
export default async function KusPlan() {
  const { user, me } = await requireKusStudent();
  const w = await kusWorkspace(user, me);
  const a = w.bundle?.analysis ?? null;
  const col = (t: string, xs: PlanItem[]) => (
    <div><h3>{t}</h3>{xs.length ? <ol>{xs.map((x) => (
      <li key={x.do}><span>{x.do}</span><small className="kus-done"><b>끝난 기준</b> {x.done}</small></li>))}</ol>
      : <p className="cm-shsub">이 시기에 따로 잡힌 할 일은 없습니다. 앞 칸의 할 일을 마무리하는 데 씁니다.</p>}</div>
  );
  return (
    <KusShell active="/kus/plan" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="개인별 실행 계획" title="30·60·90일 실행 계획"
        lead="검사 결과가 정한 차례와 기업탐방 기록의 상태에서 나온 할 일입니다. 일반론을 채워 넣지 않습니다." />
      {a ? (
        <>
          <div className="kus-plan">{col("30일", a.plan.d30)}{col("60일", a.plan.d60)}{col("90일", a.plan.d90)}</div>
          <section className="kus-panel">
            <SectionHeader icon="bolt" title="할 일 전체" />
            <ol className="kus-todo">{a.actions.map((x) => (
              <li key={x.do}><div><b>{({ NOW: "지금", NEXT: "다음", LATER: "나중" } as const)[x.horizon]}{x.domain ? ` · ${x.domain}` : ""}</b><small>{x.do}</small></div></li>))}</ol>
          </section>
        </>
      ) : (
        <section className="kus-panel"><p className="cm-shsub">검사를 끝내면 계획이 섭니다.</p>
          <div className="kus-actions"><Link className="cm-btn is-primary" href="/kus/assessment">검사로 가기</Link></div></section>
      )}
    </KusShell>
  );
}
