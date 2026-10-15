/**
 * 학과별 집계 CSV(규격 §18).
 *
 * **5명 미만 칸은 수를 내지 않는다.** 가리는 자리를 여기 또 두지 않고
 * 집계 함수가 `null` 로 돌려준 것을 그대로 적는다: 가리는 자리가 둘이면
 * 어느 날 한쪽만 고쳐지고, 그날 내려받은 파일에서 네 명짜리 학과가
 * 드러난다.
 */
import { campusNames } from "@/lib/campus/labels";
import { campusViewer, campusQuery, campusQueryKo } from "@/lib/campus/viewer";
import { csvResponse, departmentCsv } from "@/lib/campus/export";

export async function GET(req: Request): Promise<Response> {
  const v = await campusViewer();
  if (!v.uni) {
    return new Response("학교 등록부에 연결된 기관이 아닙니다.", { status: 403 });
  }
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const q = campusQuery(sp);
  const name = campusNames(v.uni);
  const body = await departmentCsv(
    {
      orgIds: v.orgIds, universityCode: v.uni,
      withDemo: sp.demo === "1",
      from: q.from, to: q.to, college: q.college, department: q.department,
    },
    name.dept, name.college,
    campusQueryKo(q, name),
  );
  return csvResponse(
    `careermatri-departments-${new Date().toISOString().slice(0, 10)}.csv`, body);
}
