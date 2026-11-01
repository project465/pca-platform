/**
 * 기관 유형 코드 → 화면 이름. **한 곳에서 읽는다**(2026-11-01 시험: 세종일자리 · 전주대가
 * `public_institution` 영문 코드 그대로 보였다). 목록 · 상세가 같은 표를 쓴다. 모르는 코드는
 * 코드 대신 `기타` 로 적는다.
 */
export const ORG_TYPE_KO: Record<string, string> = {
  university: "대학",
  department: "학과",
  company: "기업",
  school: "학교",
  public: "공공기관",
  public_institution: "공공기관",
  agency: "공공기관",
  미지정: "미지정",
};

export function orgTypeKo(code: string | null | undefined): string {
  if (!code) return "—";
  return ORG_TYPE_KO[code] ?? "기타";
}
