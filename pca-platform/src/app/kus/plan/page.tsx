import Link from "next/link";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import type { PlanItem } from "@/lib/kus/analysis";
import { KusCard, KusHead, KusShell } from "../shell";

export const dynamic = "force-dynamic";

/**
 * 30·60·90일 실행 계획. **때를 새로 정하지 않는다**: 결과 모델이 할 일마다
 * 정한 때(지금 · 다음 · 나중)를 30 · 60 · 90일로 옮기고, 탐방 쪽 할 일은
 * 기록의 상태에서만 더한다(`kusAnalysis().plan`). 빈 시기는 빈 채로 둔다.
 */
export default async function KusPlan() {
  const { user, me } = await requireKusStudent();
  const w = await kusWorkspace(user, me);
  const a = w.bundle?.analysis ?? null;
  const col = (t: string, xs: PlanItem[]) => (
    <KusCard title={t}>
      {xs.length ? <ol className="kus-steps">{xs.map((x) => (
        <li key={x.do}><b>{x.do}</b><small>다 했다고 볼 기준: {x.done}</small></li>))}</ol>
        : <p className="kus-muted">이때 따로 할 일은 없어요. 앞의 일을 마무리하는 시간으로 써 주세요.</p>}
    </KusCard>
  );
  return (
    <KusShell active="/kus/plan" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="실행 계획" title="30·60·90일 계획" lead="검사 결과와 기업탐방 기록에서 나온 할 일이에요." />
      {a ? (
        <>{col("30일 안에", a.plan.d30)}{col("60일 안에", a.plan.d60)}{col("90일 안에", a.plan.d90)}</>
      ) : (
        <KusCard><p className="kus-muted" style={{ marginTop: 0 }}>검사를 끝내면 계획을 볼 수 있어요.</p>
          <div className="kus-actions" style={{ marginTop: 16 }}><Link className="kus-btn" href="/kus/assessment">검사하러 가기</Link></div></KusCard>
      )}
    </KusShell>
  );
}
