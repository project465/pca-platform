/**
 * CSV 등록 양식(2026-11-02 운영 시험: 머리글이 영어뿐이고 양식 파일이 없었다).
 *
 * 기관 설정(`login_mode`)에 맞춰 머리글을 짓는다: 학교는 `학번 · 이름 · 학과 코드`, 아이디가 전화번호인 기관은
 * `이름 · 휴대전화 번호 · 전공 계열 코드`. 예시 줄의 코드는 **그 기관 등록부의 실제 코드**다(남의 학교 코드를 보이지 않는다).
 * 학과 칸에는 코드 대신 이름을 적어도 받는다(`checkStudent`).
 */
import { campusViewer } from "@/lib/campus/viewer";
import { university } from "@/lib/campus/registry";
import { leafChoices } from "@/lib/campus/labels";
import { loginModeOf } from "@/lib/campus/students";
import { csvResponse, toCsv } from "@/lib/campus/export";

export async function GET(req: Request): Promise<Response> {
  const v = await campusViewer();
  const u = v.uni ? university(v.uni) : null;
  if (!u) return Response.redirect(new URL("/org/v3?e=scope", req.url), 303);
  const year = Number(new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 4));
  const ex = leafChoices(u.university_code, { uptoYear: year }).find((l) => l.ready) ?? leafChoices(u.university_code)[0];
  const code = ex?.code ?? "";
  const rows = loginModeOf(u) === "phone"
    ? [["이름", "휴대전화 번호", "전공 계열 코드", "메일"], ["홍길동", "010-1234-5678", code, ""]]
    : [["학번", "이름", "학과 코드", "메일"], ["20260001", "홍길동", code, ""]];
  return csvResponse(`careermatri-${u.university_code.toLowerCase()}-template.csv`, toCsv(rows));
}
