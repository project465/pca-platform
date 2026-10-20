/**
 * 전주대 홈에 서는 **이 학생의 지금 상태와 다음 한 걸음.**
 *
 * 새로 판정하지 않는다. 학교 학생인지는 `campusStudentOf`, 응시가 어디까지
 * 왔는지는 `campusAttemptState` 가 이미 정하고(학교 진입 화면과 같은 자),
 * 여기서는 그 둘을 묶어 단추 하나와 링크 몇 개로 돌려준다. 단추의 말도 그쪽
 * 사전(`CAMPUS_CTA_KO`)을 쓴다: 두 화면이 같은 상태를 다른 말로 적지 않게.
 *
 * **검사를 시작할 수 없는 상태를 숨기지 않는다.** 학과·과정의 검사가 학생에게
 * 닫혀 있으면 그 사실을 적고 시작 단추를 세우지 않는다.
 */
import { queryOne } from "@/lib/db";
import { campusStudentOf } from "@/lib/campus/students";
import { CAMPUS_CTA_KO, campusAttemptState } from "@/lib/campus/attempt-state";
import { JJU_CODE, jjuUniversity, MODE_KO, tracksOf, type TrackMode } from "@/lib/jju/program";

export type JjuStudentStatus = {
  track: string; mode: TrackMode;
  state: "start" | "resume" | "result" | "retake" | "closed";
  headline: string; note: string;
  primary: { label: string; href: string } | null;
  more: { label: string; href: string }[];
  answered: number | null;
};

/** 전주대 홈의 말투(해요체). 단추 글자는 공통 사전을 그대로 쓴다 */
const NOTE = {
  start: "답할 때마다 저장돼서, 창을 닫아도 보던 데서 이어서 할 수 있어요.",
  resume: "마지막으로 답한 데서 이어서 하면 돼요. 앞에 답한 건 그대로 있어요.",
  result: "검사는 한 번만 봐요. 다시 봐야 할 사정이 있으면 학과 담당자에게 말해 주세요.",
  retake: "지난 결과는 그대로 남고, 새로 본 결과가 하나 더 쌓여요.",
} as const;

export async function jjuStudentStatus(userId: string): Promise<JjuStudentStatus | null> {
  const u = jjuUniversity();
  if (!u) return null;
  const mine = await campusStudentOf(userId, JJU_CODE);
  if (!mine) return null;
  const t = tracksOf(u).find((x) => x.code === mine.row.department_code);
  const mode: TrackMode = t?.mode ?? "PREPARING";
  const track = t?.short ?? mine.department_name;
  const st = await campusAttemptState(userId);
  if (st.kind === "start" && mode === "PREPARING") {
    return { track, mode, state: "closed", headline: `${track} 검사는 아직 열리지 않았어요`,
      note: `${MODE_KO.PREPARING} 이에요. 열리면 여기서 바로 시작할 수 있어요.`, primary: null, more: [], answered: null };
  }
  if (st.kind === "start") {
    return { track, mode, state: "start", headline: "아직 검사를 시작하지 않았어요",
      note: NOTE.start,
      primary: { label: CAMPUS_CTA_KO.start.label, href: `/campus/${JJU_CODE.toLowerCase()}/start` }, more: [], answered: 0 };
  }
  if (st.kind === "resume") {
    const n = await queryOne<{ n: string }>(
      `SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1::bigint`, [st.attemptId]);
    return { track, mode, state: "resume", headline: `검사하는 중이에요 · 답 ${n?.n ?? 0}개 저장됐어요`,
      note: NOTE.resume,
      primary: { label: CAMPUS_CTA_KO.resume.label, href: `/v3/${st.attemptId}` }, more: [], answered: Number(n?.n ?? 0) };
  }
  const id = st.attemptId;
  return {
    track, mode, state: st.kind, headline: "결과가 나왔어요",
    note: st.kind === "retake" ? NOTE.retake : NOTE.result,
    primary: { label: CAMPUS_CTA_KO.result.label, href: `/v3/${id}/result` },
    more: [
      { label: "전주대 리포트 보기", href: `/jju/report/${id}` },
      { label: "리포트 PDF 받기", href: `/jju/report/${id}/pdf` },
      { label: "결과지 PDF 받기", href: `/v3/${id}/result/pdf` },
      { label: "경험 추가하기", href: "/me/experience/new" },
    ],
    answered: null,
  };
}
