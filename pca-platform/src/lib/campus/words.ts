/**
 * 기관 종류에 맞는 낱말. **파일을 읽지 않는 순수 함수만 둔다**: 브라우저에서
 * 도는 화면(담당자의 학생 추가 · CSV 올리기)도 같은 함수를 써야 하고, 등록부
 * 모듈은 파일을 읽어 그쪽에서 쓸 수 없다. 등록부가 이것을 다시 내보낸다.
 */
/**
 * 기관이면 문장 속 `학생 · 학과 · 학번 · 단과대학` 을 기관 낱말로 바꾼다.
 * 조사도 받침에 맞춰 바꾼다(`학과를` → `전공 계열을`, `학생이` → `참여자가`).
 * 낱말 앞에 한글이 붙어 있으면(`배재대학교` · `기계공학과`) 이름의 일부라
 * 바꾸지 않는다. 학교면 문장을 그대로 돌려준다. 화면 문장을 학교용 한 벌로 적어 두고
 * 기관 화면은 이 함수 하나로 고르게 하려는 것이다.
 */
export function campusSay(
  u: { org_kind?: "university" | "agency" } | null | undefined,
): (s: string) => string {
  if (u?.org_kind !== "agency") return (s) => s;
  const rules: [RegExp, string][] = [
    [/(?<![가-힣])학과 담당자/g, "기관 담당자"],
    [/(?<![가-힣])단과대학/g, "계열 구분"],
    [/(?<![가-힣])학번/g, "참여 번호"],
    [/(?<![가-힣])학교(와)/g, "기관과"], [/(?<![가-힣])학교(가)/g, "기관이"],
    [/(?<![가-힣])학교(를)/g, "기관을"], [/(?<![가-힣])학교(는)/g, "기관은"],
    [/(?<![가-힣])학교/g, "기관"],
    [/(?<![가-힣])학과(를)/g, "전공 계열을"], [/(?<![가-힣])학과(가)/g, "전공 계열이"],
    [/(?<![가-힣])학과(는)/g, "전공 계열은"], [/(?<![가-힣])학과(와)/g, "전공 계열과"],
    [/(?<![가-힣])학과/g, "전공 계열"],
    [/(?<![가-힣])학생(이)/g, "참여자가"], [/(?<![가-힣])학생(을)/g, "참여자를"],
    [/(?<![가-힣])학생(은)/g, "참여자는"], [/(?<![가-힣])학생(과)/g, "참여자와"],
    [/(?<![가-힣])학생/g, "참여자"],
  ];
  return (s) => rules.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

/**
 * **휴대전화 번호는 가운데를 가린다**(2026-11-02 대표 지시: 진흥원 명단 · CSV 에서 010-****-5678). 아이디가 전화번호인
 * 기관에서 담당자 화면 · 내려받는 파일에 번호 전체를 늘어놓지 않는다. 머리(`sjepa-`)가 붙어 있어도 번호 부분만 가린다.
 * 전화번호 꼴이 아니면 그대로 돌려준다
 */
export function maskPhone(v: string | null | undefined): string {
  const s = v ?? "";
  return s.replace(/(01\d)-?(\d{3,4})-?(\d{4})/, (_m, a: string, _b: string, c: string) => `${a}-****-${c}`);
}

/** 기관 종류에 맞는 낱말. 화면은 이 함수 하나로 고른다 */
export function campusWords(u: { org_kind?: "university" | "agency" } | null | undefined) {
  const agency = u?.org_kind === "agency";
  return {
    person: agency ? "참여자" : "학생",
    unit: agency ? "전공 계열" : "학과",
    group: agency ? "계열 구분" : "단과대학",
    id: agency ? "참여 번호" : "학번",
    staff: agency ? "기관 담당자" : "학과 담당자",
    org: agency ? "기관" : "학교",
  };
}

/**
 * **기관 담당자 화면의 낱말**(2026-11-03 대표 "AI스럽다" · 진흥원 관리자 점검). 학교 낱말을 기관 낱말로 바꾼 뒤(`campusSay`)
 * 담당자 화면만의 이름을 더 바꾼다: `전공 진단 집계` → `진단 집계`, `학생 관리` → `참여자 관리`, `전공 계열` → `분야`,
 * 머리의 `CareerMatri Campus` → `CareerMatri`. 학교면 그대로 돌려준다. 기관 종류(`org_kind`)만 보므로 새 기관에도 그대로 선다
 */
export function adminSay(base: (s: string) => string, agency: boolean): (s: string) => string {
  if (!agency) return base;
  const more: [RegExp, string][] = [
    [/전공 진단 집계/g, "진단 집계"],
    [/CareerMatri Campus/g, "CareerMatri"],
    [/학생 관리/g, "참여자 관리"],
    [/전공 계열/g, "분야"],
  ];
  return (s) => more.reduce((acc, [re, to]) => acc.replace(re, to), base(s));
}
