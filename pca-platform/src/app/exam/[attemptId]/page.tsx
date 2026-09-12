import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { checkAccess, loadQuestions, loadResponses, type ExamDenied } from "@/lib/exam";
import { isReleased } from "@/lib/report";
import ExamRunner from "./exam-runner";

export const metadata = { title: "검사 응시 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));

/** 들어올 수 없을 때. 이유마다 할 말이 다르다. */
function Denied({
  reason,
  opensAt,
  closesAt,
}: {
  reason: ExamDenied;
  opensAt?: string;
  closesAt?: string;
}) {
  const body: Record<ExamDenied, { title: string; text: string }> = {
    not_found: { title: "응시를 찾을 수 없습니다", text: "주소를 다시 확인해 주세요." },
    not_yours: { title: "응시를 찾을 수 없습니다", text: "주소를 다시 확인해 주세요." },
    not_open_yet: {
      title: "아직 시작 전입니다",
      text: opensAt ? `${fmt(opensAt)}부터 응시할 수 있습니다.` : "응시 시작 시각을 기다려 주세요.",
    },
    closed: {
      title: "응시 기간이 끝났습니다",
      text: closesAt
        ? `${fmt(closesAt)}에 마감됐습니다. 학과 담당자에게 문의하세요.`
        : "학과 담당자에게 문의하세요.",
    },
    no_questions: {
      title: "준비된 문항이 없습니다",
      text: "이 회차의 검사 도구에 문항이 등록돼 있지 않습니다. 학과 담당자에게 알려주세요.",
    },
  };
  const b = body[reason];

  return (
    <div className="panel">
      <h1>{b.title}</h1>
      <p>{b.text}</p>
      <Link className="act" href="/my" style={{ marginTop: 18 }}>
        내 검사로
      </Link>
    </div>
  );
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  if (!/^\d+$/.test(attemptId)) notFound();

  const access = await checkAccess(attemptId, user.id);

  // 남의 응시와 없는 응시는 같은 화면으로 돌려준다. 있는지 없는지도 알려주지 않는다.
  if (!access.ok && (access.reason === "not_found" || access.reason === "not_yours")) {
    notFound();
  }

  if (!access.ok) {
    return (
      <div className="exam-wrap">
        <Denied
          reason={access.reason}
          opensAt={access.attempt?.opens_at}
          closesAt={access.attempt?.closes_at}
        />
      </div>
    );
  }

  const a = access.attempt;

  /*
    제출이 끝난 응시는 여기서 완료 화면을 그린다.
    방금 제출한 사람과 나중에 다시 들어온 사람에게 같은 화면을 보여준다 —
    서버 액션이 끝나면 현재 라우트가 다시 그려지므로, 클라이언트에만 완료 화면을
    두면 제출하자마자 이 화면에 덮여 사라진다. 한 곳에서 그리는 편이 확실하고,
    새로고침하거나 나중에 다시 들어와도 같은 것을 보게 된다.
  */
  if (a.status === "submitted" || a.status === "scored") {
    // 결과지를 열 수 있는지는 결과지와 같은 규칙으로 판단한다 (lib/report.ts).
    const released = isReleased({
      status: a.status,
      release_mode: a.release_mode,
      released_at: a.released_at,
    });
    return (
      <div className="exam-wrap">
        <div className="panel">
          <h1>응답이 모두 제출되었습니다</h1>
          <p>
            {a.question_count}개 문항에 답하셨습니다.{" "}
            {released
              ? "결과지가 열려 있습니다."
              : a.release_mode === "instant"
                ? "채점이 끝나는 대로 결과지가 열립니다."
                : "결과는 학과 담당자가 확인한 뒤 공개됩니다."}{" "}
            제출한 응답은 고칠 수 없습니다.
          </p>
          <ul>
            {a.submitted_at ? (
              <li>
                <b>제출 시각</b> {fmt(a.submitted_at)}
              </li>
            ) : null}
            <li>
              <b>응시 회차</b> {a.session_name}
            </li>
            <li>
              <b>응답</b> {a.answered_count} / {a.question_count}
            </li>
          </ul>
          <div style={{ display: "flex", gap: 10 }}>
            {released ? (
              <Link className="act solid" href={`/my/report/${a.attempt_id}`}>
                결과지 보기
              </Link>
            ) : null}
            <Link className="act" href="/my">
              내 검사로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [questions, answers] = await Promise.all([
    loadQuestions(a.instrument_id, user.locale),
    loadResponses(a.attempt_id),
  ]);

  return (
    <div className="exam-wrap">
      <ExamRunner
        attemptId={a.attempt_id}
        sessionName={a.session_name}
        displayName={a.display_name}
        questions={questions}
        initialAnswers={answers}
        lastOrderNo={a.last_order_no}
        started={a.status === "in_progress"}
        closesAt={a.closes_at}
        releaseMode={a.release_mode}
      />
      <p className="exam-foot">
        응답은 고를 때마다 서버에 저장됩니다. 창을 닫아도 이어서 볼 수 있습니다.
      </p>
    </div>
  );
}
