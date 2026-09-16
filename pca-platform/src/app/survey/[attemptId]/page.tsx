import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { findAttempt } from "@/lib/attempts";
import { surveyItems, surveyDone, surveyApplies, type SurveyPhase } from "@/lib/survey";
import SurveyForm from "./survey-form";

export const metadata = { title: "추가 문항 — Careermetri" };
export const dynamic = "force-dynamic";

/**
 * 지역 정주와 만족도를 묻는 자리.
 *
 * 검사 문항과 화면을 나눈 것은 표를 나눈 것과 같은 이유다 — 응시자가
 * "이것도 점수에 들어가나" 싶으면 솔직하게 답하지 않는다. 그래서 무엇에
 * 쓰이는지 먼저 적는다.
 */
const COPY: Record<SurveyPhase, { title: string; body: string }> = {
  before: {
    title: "시작하기 전에 두 가지만",
    body:
      "지금 생각을 먼저 적어 두고, 검사가 끝난 뒤 같은 것을 한 번 더 묻습니다. " +
      "두 답을 비교해 학교가 프로그램을 어떻게 짤지 정합니다. " +
      "이 답은 검사 점수에 들어가지 않습니다.",
  },
  after: {
    title: "결과를 보셨으니 몇 가지만",
    body:
      "시작 전에 물었던 것과 같은 문항이 들어 있습니다. 달라진 만큼이 " +
      "이 진단이 한 일입니다. 이 답도 검사 점수에 들어가지 않습니다.",
  },
};

export default async function SurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { attemptId } = await params;
  const { phase: raw } = await searchParams;
  // 모르면 응시 전으로 본다. 뒤 문항을 먼저 띄우면 아직 결과를 안 본
  // 사람에게 "결과를 확인한 지금" 을 묻게 된다
  const phase: SurveyPhase = raw === "after" ? "after" : "before";

  const attempt = await findAttempt(attemptId, user.id);
  if (!attempt) redirect("/my");
  // 의뢰 기관이 없는 응시(개인 결제)에는 물을 것이 없다
  if (!(await surveyApplies(attemptId))) {
    redirect(phase === "before" ? `/test/${attemptId}` : `/report/${attemptId}`);
  }
  if (await surveyDone(attemptId, phase)) {
    redirect(phase === "before" ? `/test/${attemptId}` : `/report/${attemptId}`);
  }

  const items = await surveyItems(phase);
  const prior = await query<{ item_id: string; value: number }>(
    `SELECT item_id, value FROM survey_responses WHERE attempt_id = $1`,
    [attemptId],
  );
  const answered: Record<string, number> = {};
  for (const r of prior) answered[r.item_id] = r.value;

  return (
    <div className="center-wrap">
      <div className="panel" style={{ maxWidth: 680 }}>
        <h1>{COPY[phase].title}</h1>
        <p className="sub">{COPY[phase].body}</p>
        <SurveyForm
          attemptId={attemptId}
          phase={phase}
          items={items.map((i) => ({ id: i.id, code: i.code, kind: i.kind, text: i.text }))}
          answered={answered}
        />
      </div>
    </div>
  );
}
