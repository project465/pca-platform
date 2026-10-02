import Link from "next/link";
import { notFound } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { requireRole } from "@/lib/session";
import { attemptOf, answersOf, questionsOf } from "@/lib/exam";
import Exam from "./exam";

export const metadata = { title: "검사 응시 — 단체 PCA" };
export const dynamic = "force-dynamic";

export default async function TestPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireRole(["student"]);

  /* 남의 응시는 열리지 않는다. 조회에 user_id 가 함께 들어간다 */
  const attempt = await attemptOf(attemptId, user.id);
  if (!attempt) notFound();

  const questions = await questionsOf(attempt.instrumentId, user.locale);
  const answers = await answersOf(attempt.id);

  const done = attempt.status === "submitted" || attempt.status === "scored";

  /* 이어보기 — 지난번에 답한 다음 문항부터. 다 답했으면 마지막에 선다 */
  const nextIdx = questions.findIndex((q) => !answers[q.id]);
  const startAt = done ? 0 : nextIdx === -1 ? Math.max(0, questions.length - 1) : nextIdx;

  return (
    <div style={{ minHeight: "100vh", padding: "0 20px 60px" }}>
      <header className="topbar" style={{ margin: "0 -20px 0" }}>
        <span className="brand">단체 PCA</span>
        <div className="who">
          <span>{user.name} 님</span>
          <LogoutButton />
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {questions.length === 0 ? (
          <div className="panel" style={{ marginTop: 24 }}>
            <h1>아직 문항이 준비되지 않았습니다</h1>
            <p>이 회차에 연결된 검사지에 문항이 없습니다. 학과 담당자에게 알려 주세요.</p>
          </div>
        ) : done ? (
          <div className="panel" style={{ marginTop: 24 }}>
            <h1>응답이 모두 제출되었습니다</h1>
            <p>
              {questions.length}개 문항에 모두 답하셨습니다. 결과는 학과 담당자가 확인한 뒤
              공개되며, 공개되면 알려드립니다.
            </p>
            <ul>
              {attempt.submittedAt ? <li><b>제출 시각</b> {attempt.submittedAt}</li> : null}
              <li><b>응시 회차</b> {attempt.sessionName}</li>
            </ul>
            <Link className="act" href="/my">내 검사로 돌아가기</Link>
          </div>
        ) : (
          <Exam
            attemptId={attempt.id}
            questions={questions}
            initialAnswers={answers}
            startAt={startAt}
            sessionName={attempt.sessionName}
            studentName={user.name}
          />
        )}
      </div>
    </div>
  );
}
