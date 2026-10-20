import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireSejong } from "@/sejong/lib/session";
import { actionsDone, attemptOf, latestScored, renderStatus, setAction } from "@/sejong/lib/store";

export const dynamic = "force-dynamic";

const HORIZON: Record<string, string> = { D30: "30일 안에", D60: "60일 안에", D90: "90일 안에" };
const KIND: Record<string, string> = { evidence: "근거 남기기", growth: "채우기", region: "세종 탐색", apply: "지원" };

async function toggle(formData: FormData) {
  "use server";
  const a = await requireSejong("participant");
  const id = String(formData.get("attempt_id") ?? "");
  const code = String(formData.get("code") ?? "").slice(0, 40);
  const att = await attemptOf(id, a.userId);
  if (!att?.result?.actions.some((x) => x.code === code)) return;
  await setAction(id, code, String(formData.get("done")) === "1");
  revalidatePath("/sejong/plan");
}

export default async function PlanPage() {
  const a = await requireSejong("participant");
  const att = await latestScored(a.userId);
  if (!att?.result) {
    return (
      <div className="sj-card">
        <h1>실행 계획</h1>
        <p>진단을 제출하면 결과에 맞춘 30·60·90일 계획이 만들어집니다.</p>
        <Link className="sj-btn" href="/sejong/diagnosis">진단 시작</Link>
      </div>
    );
  }
  const done = await actionsDone(att.id);
  const pdf = await renderStatus(att.id);
  const acts = att.result.actions;
  return (
    <>
      <h1>개인별 취업 실행 계획</h1>
      <p className="lead">
        결과에서 바로 이어지는 할 일입니다. 먼저 이미 한 일을 근거로 남기고(30일), 희망 직무에서
        비어 있는 판단을 채우고(60일), 원 공고에 직접 지원합니다(90일). 플랫폼이 대신 지원하지 않습니다.
      </p>
      <p className="small muted">완료 {acts.filter((x) => done.has(x.code)).length} / {acts.length}</p>

      {(["D30", "D60", "D90"] as const).map((h) => (
        <section key={h} className="sj-section sj-card">
          <h2>{HORIZON[h]}</h2>
          {acts.filter((x) => x.horizon === h).map((x) => {
            const isDone = done.has(x.code);
            return (
              <form key={x.code} action={toggle} className="sj-step" style={{ marginBottom: 8 }}>
                <input type="hidden" name="attempt_id" value={att.id} />
                <input type="hidden" name="code" value={x.code} />
                <input type="hidden" name="done" value={isDone ? "0" : "1"} />
                <span className="n">{isDone ? "✓" : "·"}</span>
                <span>
                  <span className="sj-badge">{KIND[x.kind]}</span> {x.text}
                </span>
                <button className={`sj-btn small${isDone ? " ghost" : ""}`} type="submit">{isDone ? "되돌리기" : "했어요"}</button>
              </form>
            );
          })}
        </section>
      ))}

      <section className="sj-section sj-card">
        <h2>취업 전략 결과지</h2>
        <p className="small muted">
          진단 결과·경험 근거·세종 사업장·실행 계획을 한 문서로 묶습니다.
          {pdf.ok ? ` 지금까지 ${pdf.ok}번 만들었습니다.` : ""}
        </p>
        <div className="sj-actions">
          <Link className="sj-btn ghost" href="/sejong/report">미리보기</Link>
          <a className="sj-btn" href="/sejong/report/pdf">PDF 내려받기</a>
        </div>
      </section>
    </>
  );
}
