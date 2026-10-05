/**
 * 전자상거래법 제10조 표시.
 *
 * 상호 · 대표자 · 주소 · 전화 · 이메일 · 사업자등록번호 · 통신판매업
 * 신고번호를 적어야 결제를 받을 수 있다. **값을 지어내지 않는다.**
 * 비어 있으면 비어 있다고 화면에 적고, `launch:check` 가 그것으로 런칭을
 * 막는다.
 *
 * **빈칸은 눈에 안 띄고, 눈에 안 띄면 그대로 런칭된다.** 그래서 비었을 때
 * 조용히 그 줄을 지우지 않고 '확인 필요' 로 그린다(소개 사이트 푸터가
 * 쓰는 것과 같은 규칙이다).
 *
 * 환경변수로 받는 까닭은 **배포본마다 다른 사실**이기 때문이다. 코드에
 * 적으면 법인이 바뀌는 날 배포를 해야 하고, DB 에 두면 운영 화면에서
 * 고칠 수 있게 되는데 그 값은 운영자가 고칠 것이 아니다.
 */
export type BusinessField = { key: string; label: { ko: string; en: string }; value: string | null };

const FIELDS: { key: string; env: string; ko: string; en: string }[] = [
  { key: "name", env: "BUSINESS_NAME", ko: "상호", en: "Legal name" },
  { key: "ceo", env: "BUSINESS_CEO", ko: "대표자", en: "Representative" },
  { key: "address", env: "BUSINESS_ADDRESS", ko: "주소", en: "Address" },
  { key: "phone", env: "BUSINESS_PHONE", ko: "전화", en: "Phone" },
  { key: "email", env: "SUPPORT_EMAIL", ko: "이메일", en: "Email" },
  { key: "reg", env: "BUSINESS_REG_NO", ko: "사업자등록번호", en: "Business registration" },
  {
    key: "mailorder", env: "BUSINESS_MAILORDER_NO",
    ko: "통신판매업 신고번호", en: "Mail-order registration",
  },
];

export type BusinessInfo = {
  fields: BusinessField[];
  /** 아직 비어 있는 칸의 이름 */
  missing: string[];
  /** 일곱 칸이 다 찼는가. **결제를 받을 수 있는 조건이다** */
  complete: boolean;
};

export function businessInfo(): BusinessInfo {
  const fields = FIELDS.map((f) => ({
    key: f.key,
    label: { ko: f.ko, en: f.en },
    value: (process.env[f.env] ?? "").trim() || null,
  }));
  const missing = fields.filter((f) => !f.value).map((f) => f.key);
  return { fields, missing, complete: missing.length === 0 };
}

/**
 * 직업정보제공사업 신고번호.
 *
 * 보유한 것은 이 하나다(J1700020220007호). 유료직업소개사업 등록은 없어서
 * **알선 · 취업추천서 · 이력서 발송 대행을 하지 않는다**(CLAUDE.md 법적
 * 범위). 번호를 화면에 적는 것은 그 범위를 밝히는 일이다.
 */
export function jobInfoLicense(): string | null {
  return (process.env.JOBINFO_LICENSE_NO ?? "J1700020220007").trim() || null;
}
