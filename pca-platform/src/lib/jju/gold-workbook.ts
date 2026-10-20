/**
 * 전주대 개인 리포트 Gold Master — **실행 워크북**(Track C).
 *
 * 프로젝트 제안 · 포트폴리오 정리표 · 자소서/면접 스튜디오 · 30/90/180일 계획.
 * 재료는 전부 결과 모델이 이미 들고 있는 것이다: 할 일마다 그 영역의 업무
 * 흐름(`material.workflow`) · 남길 결과물 · 견줄 대상, 그리고 학생이 고른 근거
 * 문구. **실적 · 수치 · 기간을 지어내지 않는다.** 학생이 채울 자리는 빈칸으로
 * 남기고, 근거가 없는 자리에서는 문장을 만들지 않는다.
 *
 * 30/90/180 일은 결과 모델의 때(`NOW` · `NEXT` · `LATER`)를 달력으로 옮긴
 * 것이다. 엔진이 날짜를 정한 것이 아니라는 사실을 종이가 함께 적는다.
 */
import { domainName, roleName } from "@/lib/me-v3/runtime/session";
import type { Action, ResultModel } from "@/lib/me-v3/result/model";
import { actionKo, evidenceStoryKo } from "@/lib/me-v3/result/text.ko";
import { withJosa } from "@/lib/me-v3/result/josa";
import type { Axis } from "@/lib/me-v3/scoring/types";
import { AXIS_DID_KO, AXIS_KO, askOf } from "@/lib/jju/gold";

export type Project = {
  domain: string; title: string; horizon: string; length: string; level: string;
  decide: string; method: string; outputs: string[]; verify: string[]; onFail: string;
  why: string;
};
export type PortfolioRow = { item: string; role: string; decided: string; verified: string; result: string; next: string; filled: boolean };
export type StudioCase = {
  domain: string;
  evidence: string;      // 고른 근거 문구(자기보고)
  competence: string;    // 판정된 축으로 쓴 역량 문장(근거 → 역량)
  forRole: string;       // 역할 맞춤 표현(학생이 수치를 채울 자리 포함)
  ask: string; answerShape: string[]; more: string;
};
export type PlanItem = { what: string; output: string; check: string; domain: string };
export type Workbook = {
  projects: Project[];
  portfolio: PortfolioRow[];
  studio: StudioCase[];
  questions: { q: string; from: string; need: string }[];
  plan: { label: string; days: string; items: PlanItem[] }[];
  course: string | null;
};

const H_DAYS: Record<string, [string, string, string]> = {
  NOW: ["30일", "지금 ~ 30일", "2~4주 · 과제 하나"],
  NEXT: ["90일", "31 ~ 90일", "6~10주 · 다음 과제나 팀 프로젝트"],
  LATER: ["180일", "91 ~ 180일", "한 학기 · 캡스톤이나 현장실습"],
};
const LEVEL = { NONE: "입문 · 해 본 적 없음에서 시작", ONCE_OR_TWICE: "기초 · 1~2회 해 본 것을 끝까지", SEVERAL: "심화 · 여러 번 해 본 것을 남길 결과물로" } as const;

export function buildWorkbook(
  m: ResultModel, core: string, opts: { roles: string[]; course: { name: string; topics: string[] } | null },
): Workbook {
  const nm = (td: string) => domainName(core, td);
  const byCode = new Map(m.domains.map((d) => [d.code, d]));

  /* 프로젝트: 영역을 든 할 일에서, 영역마다 하나 */
  const seen = new Set<string>();
  const acts = m.actions.filter((a): a is Action & { domain: string } => !!a.domain)
    .filter((a) => (seen.has(a.domain) ? false : (seen.add(a.domain), true))).slice(0, 3);
  const projects: Project[] = acts.map((a) => {
    const d = byCode.get(a.domain);
    const w = a.material.workflow;
    const t = actionKo(a, nm(a.domain), m.stage);
    const [, , length] = H_DAYS[a.horizon] ?? H_DAYS.NEXT;
    return {
      domain: nm(a.domain), horizon: (H_DAYS[a.horizon] ?? H_DAYS.NEXT)[0],
      title: `${nm(a.domain)}: ${w?.decide ? `${withJosa(w.decide, "을를")} 직접 정하는 과제` : "작은 과제 하나를 끝까지"}`,
      length, level: d?.experience ? LEVEL[d.experience] : "수준 답 없음 · 짧은 과제부터",
      decide: w?.decide ?? "", method: w?.method ?? "", outputs: a.material.artifacts.slice(0, 3),
      verify: a.material.verify_targets.slice(0, 3), onFail: w?.on_fail ?? "",
      why: t.do,
    };
  });

  /* 포트폴리오: 학생이 고른 결과물·견준 대상으로 먼저 채우고 나머지는 빈칸 */
  const portfolio: PortfolioRow[] = [];
  for (const d of m.domains) {
    d.artifacts.slice(0, 2).forEach((art, i) => {
      /* 같은 영역의 둘째 결과물에 첫째의 판단을 되풀이하지 않는다: 고른 것이 하나뿐이면 비운다 */
      const decided = d.decided[i] ?? "", verified = d.verifications[i] ?? "";
      portfolio.push({ item: art, role: nm(d.code), decided, verified, result: "", next: verified ? "" : "무엇과 견줬는지", filled: true });
    });
    if (portfolio.length >= 3) break;
  }
  for (const p of projects) {
    if (portfolio.length >= 3) break;
    portfolio.push({ item: `(만들 것) ${p.outputs[0] ?? "결과물"}`, role: p.domain, decided: "", verified: "", result: "", next: p.verify[0] ? `${withJosa(p.verify[0], "과와")} 견주기` : "", filled: false });
  }
  while (portfolio.length < 3) portfolio.push({ item: "", role: "", decided: "", verified: "", result: "", next: "", filled: false });

  /* 자소서·면접 스튜디오: 근거가 확인된 영역에서만 문장을 만든다 */
  const role0 = opts.roles[0] ? roleName(core, opts.roles[0]) : "";
  const evid = m.domains.filter((d) => d.confirmed.length || d.owned.length).slice(0, 2);
  const studio: StudioCase[] = evid.map((d) => {
    const conf: Axis[] = [...new Set([...d.owned, ...d.confirmed])];
    const st = evidenceStoryKo(core, d.code, { did: d.did[0], decided: d.decided[0], artifacts: d.artifacts, verifications: d.verifications }, "lead", nm(d.code));
    const pick = d.decided[0] ?? d.did[0] ?? d.axes.flatMap((a) => a.picks)[0] ?? "";
    return {
      domain: nm(d.code),
      evidence: pick ? `“${pick}”` : "(고른 근거 문구 없음)",
      competence: `${nm(d.code)} 과제에서 ${conf.slice(0, 2).map((a) => `${AXIS_DID_KO[a]} 경험`).join("과 ")}이 있어요.`,
      forRole: role0
        ? `${role0}에 지원한다면: “[${nm(d.code)} 과제 이름]에서 ${withJosa(conf.map((a) => AXIS_KO[a]).slice(0, 2).join("과 "), "을를")} 맡아 [결과물]을 만들었고, [무엇]과 견주어 [수치·결과]를 확인했어요.”`
        : `“[${nm(d.code)} 과제 이름]에서 ${withJosa(conf.map((a) => AXIS_KO[a]).slice(0, 2).join("과 "), "을를")} 맡아 [결과물]을 만들었어요.”`,
      ask: st.interview, answerShape: ["상황: 어떤 과제였나", "판단: 무엇을 직접 정했나", "근거: 무엇과 견줬나", "결과: 무엇이 남았나(수치는 본인이)"],
      more: d.verifications.length ? "결과 수치와 날짜를 직접 적어 두기" : "무엇과 견줘 확인했는지 하나 확보하기",
    };
  });

  /* 예상 질문: 확인된 축은 깊게, 빈자리는 `추가 확보할 근거` 로 */
  const questions: Workbook["questions"] = [];
  for (const d of evid) for (const a of [...new Set([...d.owned, ...d.confirmed])].slice(0, 2)) {
    questions.push({ q: `${nm(d.code)} 과제에서 ${askOf(a)}?`, from: "확인된 판단", need: "이미 고른 근거로 답할 수 있음" });
  }
  for (const g of m.gaps.slice(0, 4)) if (g.axis) {
    questions.push({ q: `${nm(g.domain)}에서 ${askOf(g.axis)}?`, from: "빈자리", need: `아직 답할 근거 없음 · ${AXIS_KO[g.axis]} 경험 하나 확보` });
  }

  /* 30/90/180 */
  const plan = (["NOW", "NEXT", "LATER"] as const).map((hz) => ({
    label: H_DAYS[hz][0], days: H_DAYS[hz][1],
    items: m.actions.filter((a) => a.horizon === hz).slice(0, 3).map((a) => ({
      what: actionKo(a, a.domain ? nm(a.domain) : "", m.stage).do,
      output: a.material.artifacts[0] ?? a.material.workflow?.output ?? "정리한 기록",
      check: a.material.verify_targets[0] ? `${withJosa(a.material.verify_targets[0], "과와")} 견줘 차이를 적었다` : "남긴 결과물을 다른 사람이 읽을 수 있다",
      domain: a.domain ? nm(a.domain) : "",
    })),
  }));

  return { projects, portfolio, studio, questions: questions.slice(0, 6), plan,
    course: opts.course ? `${opts.course.name}(${opts.course.topics.join(" · ")})` : null };
}
