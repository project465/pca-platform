/**
 * 학생 응시 상태 CSV(규격 §17·§18).
 *
 * **개별 답변은 한 칸도 나가지 않는다.** 나가는 것은 계정 상태와 응시
 * 여부까지다. 결과 내용과 Evidence 는 본인 동의와 계약에 적힌 범위
 * 안에서만 열리고, 그 길은 여기가 아니다(규격 §23).
 *
 * 리마인드 대상은 **따로 만들지 않는다**: `?state=none` 으로 좁혀 부르면
 * 아직 안 친 학생만 나온다. 메일이나 문자를 여기서 보내지 않는다(그
 * 기능이 없는데 만들면 담당자가 보낸 줄로 읽는다).
 */
import { campusNames } from "@/lib/campus/labels";
import { campusViewer, campusQuery, campusQueryKo } from "@/lib/campus/viewer";
import { csvResponse, studentStatusCsv } from "@/lib/campus/export";
import type { StudentState } from "@/lib/campus/manage";

const STATES: StudentState[] = ["all", "none", "in_progress", "scored", "disabled"];

export async function GET(req: Request): Promise<Response> {
  /* **범위를 여기서 다시 정하지 않는다.** 묻는 자리가 하나여서 집계와
     명단과 이 파일이 늘 같은 학교를 본다 */
  const v = await campusViewer();
  if (!v.uni) {
    return new Response("학교 등록부에 연결된 기관이 아닙니다.", { status: 403 });
  }
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const q = campusQuery(sp);
  const want = String(sp.state ?? "all");
  const state = (STATES as string[]).includes(want)
    ? (want as StudentState) : "all";
  const name = campusNames(v.uni);
  const body = await studentStatusCsv(
    {
      universityCode: v.uni, q: sp.q, withDemo: sp.demo === "1",
      college: q.college ?? undefined, department: q.department ?? undefined,
      state,
    },
    name.dept,
    campusQueryKo(q, name),
  );
  return csvResponse(`careermatri-students-${state}-${today()}.csv`, body);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
