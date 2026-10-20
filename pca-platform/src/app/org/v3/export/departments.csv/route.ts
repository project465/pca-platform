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
import { auditExport } from "@/lib/campus/export-audit";

export async function GET(req: Request): Promise<Response> {
  const v = await campusViewer();
  if (!v.uni) {
    /* **날글자를 내려받게 하지 않는다**(규격 §21). 내려받기 링크를 누른
       사람에게 글자 한 줄이 든 빈 쪽이 뜨면 그것이 고장으로 읽힌다.
       보던 화면으로 돌려보내고 거기서 까닭을 적는다 */
    return Response.redirect(new URL("/org/v3?e=scope", req.url), 303);
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
  await auditExport(v, "campus.export.departments", q, { demo: sp.demo === "1" });
  return csvResponse(
    `careermatri-departments-${new Date().toISOString().slice(0, 10)}.csv`, body);
}
