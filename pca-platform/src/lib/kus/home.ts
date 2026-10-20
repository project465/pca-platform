/**
 * KUS 홈의 `지금 해야 할 일`. **상태에서만 나온다.**
 *
 * 홈이 문장을 짓지 않는다: 검사 상태 · 결과 모델의 첫 할 일 · 탐방 기록의
 * 상태 셋을 보고 차례를 정할 뿐이고, 할 일 문장은 결과지와 같은 함수가
 * 이미 지어 둔 것(`KusAnalysis.actions`)을 쓴다. 없는 할 일을 채우려고
 * 일반론을 적지 않는다.
 */
import type { KusAnalysis } from "./analysis";
import type { KusMode } from "./program";
import type { Visit, VisitProgram } from "./visits";
import { didSomething } from "./visits";

export type AttemptState =
  | { kind: "start" } | { kind: "resume"; attemptId: string; answered: number }
  | { kind: "result" | "retake"; attemptId: string };

export type Todo = { title: string; why: string; href: string; cta: string };

export function kusTodos(x: {
  mode: KusMode; st: AttemptState; analysis: KusAnalysis | null;
  visits: Visit[]; programs: VisitProgram[]; unsupported?: boolean;
}): Todo[] {
  const t: Todo[] = [];
  if (x.unsupported) {
    t.push({
      title: "기업탐방 기록부터 남겨요",
      why: "검사는 아직 없지만 탐방에서 본 직무와 해 본 활동은 지금 남길 수 있어요.",
      href: "/kus/visits/new", cta: "기록하기",
    });
  } else if (x.mode === "PREPARING") {
    t.push({
      title: "학과 검사를 준비하고 있어요",
      why: "열리면 바로 알려 드릴게요. 그동안 탐방 기록은 남길 수 있어요.",
      href: "/kus/assessment", cta: "검사 안내",
    });
  } else if (x.st.kind === "start") {
    t.push({ title: "전공 검사 시작하기", why: "30분쯤 걸려요. 중간에 나가도 이어서 할 수 있어요.", href: "/campus/kus/start", cta: "검사 시작" });
  } else if (x.st.kind === "resume") {
    t.push({ title: "검사 마저 끝내기", why: `${x.st.answered}문항까지 답했어요. 멈춘 곳부터 이어서 할 수 있어요.`, href: `/v3/${x.st.attemptId}`, cta: "이어하기" });
  }
  const a0 = x.analysis?.actions[0];
  if (a0) {
    t.push({ title: a0.domain ? `${a0.domain}에서 할 일` : "다음에 할 일", why: a0.do, href: "/kus/plan", cta: "실행 계획" });
  }
  const unlinked = x.visits.filter((v) => didSomething(v) && !v.experience_id);
  if (unlinked[0]) {
    t.push({
      title: `${unlinked[0].company_name}에서 해 본 활동을 경험으로 옮겨요`,
      why: "경험으로 옮겨야 다음 분석에 들어가요.",
      href: `/kus/visits/${unlinked[0].id}`, cta: "잇기",
    });
  }
  if (!x.visits.length && !x.unsupported) {
    const next = x.programs.find((p) => p.status !== "DONE");
    t.push({
      title: "기업탐방 기록 남기기",
      why: next
        ? `${next.company_name}${next.visit_date ? `(${next.visit_date})` : ""}에 다녀오면 그날 바로 적어 두세요.`
        : "다녀온 탐방이 있으면 직접 적을 수 있어요.",
      href: "/kus/visits/new", cta: "기록하기",
    });
  }
  if (x.analysis && (x.st.kind === "result" || x.st.kind === "retake")) {
    t.push({ title: "보고서 받기", why: "검사 결과와 탐방 기록을 PDF 한 부로 받을 수 있어요.", href: "/kus/report", cta: "보고서" });
  }
  return t.slice(0, 4);
}
