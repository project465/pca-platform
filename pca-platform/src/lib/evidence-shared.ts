/**
 * 서버와 화면이 함께 쓰는 순수 규칙.
 *
 * evidence.ts 는 db 를 불러오므로 클라이언트 컴포넌트가 가져올 수 없다.
 * 자격증에 학점을 묻지 않는다는 규칙은 양쪽에서 같아야 하므로 여기 둔다.
 */
const NO_GRADE = new Set(["CERT", "AWARD", "SOFTWARE", "SELF"]);

export function takesGrade(sourceCode: string): boolean {
  return !NO_GRADE.has(sourceCode);
}
