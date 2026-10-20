import { notFound, redirect } from "next/navigation";
import { requireSejong } from "@/sejong/lib/session";
import { sejongContent } from "@/sejong/lib/content";
import { attemptOf, responsesOf } from "@/sejong/lib/store";
import { submitDiagnosis } from "../actions";
import ItemBoard from "./board";

export const dynamic = "force-dynamic";

export default async function DiagnosisRun({
  params, searchParams,
}: { params: Promise<{ attemptId: string }>; searchParams: Promise<{ e?: string }> }) {
  const a = await requireSejong("participant");
  const { attemptId } = await params;
  const att = await attemptOf(attemptId, a.userId);
  if (!att) notFound();
  if (att.status === "scored") redirect("/sejong/result");
  const { instrument, axisInfo } = sejongContent();
  const responses = await responsesOf(attemptId);
  const sp = await searchParams;

  return (
    <>
      <span className="sj-badge demo">DEMO · {instrument.instrument_version}</span>
      <h1 style={{ marginTop: 10 }}>직무 경험 진단</h1>
      <p className="lead">
        일·아르바이트·인턴·훈련·봉사 어디서든 <b>실제로 해 본 것</b>을 기준으로 고르세요.
        잘 보이려고 높게 고르면 결과가 쓸모없어집니다. 근거가 있어야 높은 칸이 섭니다.
      </p>
      {sp.e === "incomplete" ? <p className="sj-error">아직 고르지 않은 문항이 있습니다.</p> : null}
      <ItemBoard
        attemptId={attemptId}
        scale={instrument.scale}
        sections={instrument.sections.map((s) => ({
          code: s.code, title: s.title,
          axes: s.axes.map((x) => ({ code: x, name: axisInfo[x]?.name ?? x })),
          items: s.items,
        }))}
        initial={responses}
      />
      <form action={submitDiagnosis} className="sj-card sj-section">
        <input type="hidden" name="attempt_id" value={attemptId} />
        <h3>제출</h3>
        <p className="small muted">제출하면 결과가 굳습니다. 제출 뒤에 고친 경험 기록은 다음 진단에 반영됩니다.</p>
        <button className="sj-btn" type="submit">제출하고 결과 보기</button>
      </form>
    </>
  );
}
