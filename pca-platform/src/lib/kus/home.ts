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
  visits: Visit[]; programs: VisitProgram[];
}): Todo[] {
  const t: Todo[] = [];
  if (x.mode === "PREPARING") {
    t.push({
      title: "학과 검사가 열리기를 기다리기",
      why: "이 학과는 아직 검사가 준비 중입니다. 열리면 이 자리에 시작 단추가 섭니다. 그동안 탐방 기록은 남길 수 있습니다.",
      href: "/kus/assessment", cta: "검사 안내",
    });
  } else if (x.st.kind === "start") {
    t.push({ title: "전공 검사 시작하기", why: "검사를 끝내야 개인별 분석 · 실행 계획 · 보고서가 섭니다. 중간에 나가도 답이 저장됩니다.", href: "/campus/kus/start", cta: "검사 시작" });
  } else if (x.st.kind === "resume") {
    t.push({ title: "검사 이어서 끝내기", why: `지금까지 ${x.st.answered}문항에 답했습니다. 멈춘 화면에서 이어집니다.`, href: `/v3/${x.st.attemptId}`, cta: "이어하기" });
  }
  const a0 = x.analysis?.actions[0];
  if (a0) {
    t.push({ title: a0.domain ? `${a0.domain}: 다음 한 가지` : "다음 한 가지", why: a0.do, href: "/kus/plan", cta: "실행 계획" });
  }
  const unlinked = x.visits.filter((v) => didSomething(v) && !v.experience_id);
  if (unlinked[0]) {
    t.push({
      title: `${unlinked[0].company_name} 탐방에서 해 본 활동을 경험으로 잇기`,
      why: "직접 해 본 활동은 공통 경험 입력으로 옮겨야 판정에 들어갑니다. 탐방 기록만으로는 역량이 확인되지 않습니다.",
      href: `/kus/visits/${unlinked[0].id}`, cta: "잇기",
    });
  }
  if (!x.visits.length) {
    const next = x.programs.find((p) => p.status !== "DONE");
    t.push({
      title: "기업탐방 기록 남기기",
      why: next
        ? `${next.company_name}${next.visit_date ? ` (${next.visit_date})` : ""} 탐방을 다녀오면 그날 안에 본 직무와 이해한 것을 적어 둡니다.`
        : "탐방 기업이 아직 등록되지 않았습니다. 담당자가 등록하면 고를 수 있고, 그 전에도 직접 적어 둘 수 있습니다.",
      href: "/kus/visits/new", cta: "기록하기",
    });
  }
  if (x.analysis && (x.st.kind === "result" || x.st.kind === "retake")) {
    t.push({ title: "개인 보고서 내려받기", why: "검사 결과와 탐방 기록을 한 벌로 묶은 PDF 입니다.", href: "/kus/report", cta: "보고서" });
  }
  return t.slice(0, 4);
}
