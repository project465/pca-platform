/**
 * 담당자가 내려받는 자료(규격 §17·§18).
 *
 * **개별 응답은 한 칸도 나가지 않는다**(규격 §18·§23). 나가는 것은 계정
 * 상태와 응시 여부와 집계까지다. 결과 내용과 Evidence 는 본인 동의와
 * 계약에 적힌 범위 안에서만 열리고, 그 길은 여기가 아니다.
 *
 * **CSV 를 직접 만든다.** 엑셀을 내려면 의존성이 하나 더 붙고, 그 하나가
 * 운영 이미지의 크기와 취약점 표를 늘린다. 담당자가 열어 보는 자리는
 * 엑셀이고 엑셀은 CSV 를 그대로 연다.
 */
import { listStudents, type StudentFilter } from "@/lib/campus/manage";
import { campusV3, type CampusScope } from "@/lib/me-v3/campus";
import { MIN_CELL } from "@/lib/org";

/**
 * 한 칸을 CSV 로 적는다.
 *
 * **수식으로 읽히는 글자를 막는다.** `=` 나 `+` 로 시작하는 값은 엑셀이
 * 수식으로 읽어, 명단에 그런 이름이 하나 있으면 그 파일을 연 담당자의
 * 엑셀에서 무언가가 실행된다. 앞에 작은따옴표를 붙여 글자로 묶는다.
 */
function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: unknown[][]): string {
  /* **BOM 을 앞에 둔다.** 엑셀이 UTF-8 CSV 를 BOM 없이 열면 한글이 깨진다 */
  return `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}

export function csvResponse(name: string, body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}

const ATTEMPT_KO: Record<string, string> = {
  none: "미응시", in_progress: "진행중", scored: "완료",
};
const ACCOUNT_KO: Record<string, string> = {
  active: "사용 중", disabled: "멈춤", erased: "파기됨",
};

/**
 * 내려받은 자료가 **어느 조건으로 뽑힌 것인지** 스스로 말한다.
 *
 * 담당자는 같은 이름의 파일을 여러 번 내려받아 보고서에 붙인다. 조건이
 * 적혀 있지 않으면 **지난 학기 것을 이번 학기 표로 붙이는 날**이 온다.
 */
function head(title: string, scopeKo: string, uni: string): unknown[][] {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  return [
    [`CareerMatri · ${title}`],
    ["학교", uni], ["조건", scopeKo], ["뽑은 때", `${now} UTC`],
    ["담은 것", "계정 상태와 응시 여부와 집계입니다. 개별 답변은 들어 있지 않습니다."],
    [],
  ];
}

/**
 * 학생 응시 상태(규격 §18).
 *
 * **답한 내용은 없다.** 칸은 일곱이고 전부 담당자가 명단을 들고 확인하는
 * 값이다. 리마인드 대상은 같은 함수에 상태만 좁혀 부른다(규격 §17).
 */
export async function studentStatusCsv(
  f: StudentFilter, deptName: (c: string) => string, scopeKo: string,
): Promise<string> {
  const { rows } = await listStudents({ ...f, limit: 5000, offset: 0 });
  const title = f.state && f.state !== "all"
    ? `학생 응시 상태 (${STATE_KO[f.state] ?? f.state})`
    : "학생 응시 상태";
  const cols = ["학번", "이름", "아이디", "학과", "계정 상태", "응시 상태", "완료일"];
  const body = rows.map((r) => [
    r.student_id, r.name, r.login_id, deptName(r.department_code),
    ACCOUNT_KO[r.account] ?? r.account,
    ATTEMPT_KO[r.attempt] ?? r.attempt,
    r.completed_at ?? "",
  ]);
  return toCsv([
    ...head(title, scopeKo, f.universityCode),
    cols, ...body,
    [], [`줄 ${rows.length}개`],
  ]);
}

const STATE_KO: Record<string, string> = {
  none: "미응시", in_progress: "진행중", scored: "완료", disabled: "비활성",
};

/**
 * 학과별 집계(규격 §18).
 *
 * **5명 미만은 수를 내지 않는다.** 집계 함수가 이미 `null` 로 돌려주므로
 * 여기서 다시 가리지 않고 그대로 적는다: 가리는 자리가 둘이면 어느 날
 * 한쪽만 고쳐진다.
 */
export async function departmentCsv(
  scope: CampusScope, deptName: (c: string) => string,
  collegeName: (c: string) => string, scopeKo: string,
): Promise<string> {
  const v = await campusV3(scope);
  const uni = scope.universityCode ?? "";
  const note = (n: number | null) =>
    (n === null ? `${MIN_CELL}명 미만이라 수를 내지 않습니다` : "");
  /**
   * **빈 표를 까닭 없이 내보내지 않는다**(규격 §19·§21).
   *
   * 좁혀 본 범위에 든 학생이 다섯이 안 되면 집계가 아래 칸을 **아예
   * 만들지 않는다**(`too_few`). 그때 표만 비워서 내보내면 받은 담당자는
   * 내려받기가 깨진 줄로 읽고 다시 누른다. 왜 비었는지를 파일이 적는다.
   */
  const why = v.too_few
    ? [[`이 범위에 든 학생이 ${MIN_CELL}명이 안 되어 아래 칸을 만들지 `
        + `않았습니다. 좁히는 조건을 넓혀 보십시오.`], []]
    : [];
  return toCsv([
    ...head("학과별 집계", scopeKo, uni),
    ...why,
    ["대상자", v.target],
    ["검사를 시작한 학생", v.started],
    ["결과를 받은 학생", v.scored],
    ["완료율(%)", v.completion ?? ""],
    [],
    ["단과대학", "대상자", "시작", "완료", "완료율(%)", "비고"],
    ...v.college_rows.map((r) => [
      collegeName(r.code), r.target ?? "", r.started ?? "",
      r.scored ?? "", r.rate ?? "", note(r.started),
    ]),
    [],
    ["학과", "검사를 시작한 학생", "비고"],
    ...v.by_department.map((c) => [
      deptName(c.key), c.n ?? "", note(c.n),
    ]),
  ]);
}
