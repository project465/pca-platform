/**
 * 현멘의 전제는 익명이다.
 * 신청자에게 보이는 것은 handle 과 속성(연차·회사 규모·직무 영역)뿐이고,
 * users.display_name 과 email 은 어떤 화면에도 나가지 않는다.
 *
 * 이 파일에 표시 규칙을 모아둔 이유는, 화면이 늘어날 때마다 각자
 * "여기선 이름 좀 보여줘도 되지 않나" 하고 판단하지 않게 하려는 것이다.
 */

export const COMPANY_SCALES = [
  "large",
  "midsize",
  "startup",
  "public",
  "research",
  "foreign",
] as const;
export type CompanyScale = (typeof COMPANY_SCALES)[number];

export const COMPANY_SCALE_LABEL: Record<CompanyScale, string> = {
  large: "대기업",
  midsize: "중견기업",
  startup: "스타트업",
  public: "공공기관",
  research: "정부출연연구기관",
  foreign: "외국계",
};

export function isCompanyScale(v: string): v is CompanyScale {
  return (COMPANY_SCALES as readonly string[]).includes(v);
}

export function companyScaleLabel(v: string): string {
  return isCompanyScale(v) ? COMPANY_SCALE_LABEL[v] : v;
}

/* ---------- 석·박사 축 ----------
   career peak 의 대상은 석·박사다. 학부 취업 서비스에서 쓰는 축(회사 규모)만으로는
   이 사람들이 고르는 기준을 담지 못한다. 학위와 진로 경로가 먼저다. */

export const DEGREES = ["master", "phd"] as const;
export type Degree = (typeof DEGREES)[number];
export const DEGREE_LABEL: Record<Degree, string> = {
  master: "석사",
  phd: "박사",
};

/** 석·박사의 진로가 실제로 갈라지는 갈래. 멘토를 고르는 1차 기준이다. */
export const CAREER_PATHS = [
  "industry_rnd",
  "industry_biz",
  "research_inst",
  "academia",
  "startup",
  "public_policy",
] as const;
export type CareerPath = (typeof CAREER_PATHS)[number];
export const CAREER_PATH_LABEL: Record<CareerPath, string> = {
  industry_rnd: "산업계 R&D",
  industry_biz: "산업계 비R&D",
  research_inst: "정부출연연구기관",
  academia: "대학·학계",
  startup: "창업·스타트업",
  public_policy: "공공·정책",
};

/**
 * 전공 계열. 지금은 이공계가 대상이고, 인문·경상으로 넓힐 때
 * 여기에 값이 늘어난다 (컬럼을 만들지 않는다 — 설계 원칙 2와 같은 태도).
 */
export const FIELD_TRACKS = ["stem", "humanities", "business"] as const;
export type FieldTrack = (typeof FIELD_TRACKS)[number];
export const FIELD_TRACK_LABEL: Record<FieldTrack, string> = {
  stem: "이공계",
  humanities: "인문사회",
  business: "경상",
};

/** 신청자가 지금 어느 단계인지. 멘토가 답의 높이를 맞추는 데 쓴다. */
export const APPLICANT_STAGES = [
  "ms_student",
  "phd_student",
  "phd_abd",
  "postdoc",
  "graduated",
] as const;
export type ApplicantStage = (typeof APPLICANT_STAGES)[number];
export const APPLICANT_STAGE_LABEL: Record<ApplicantStage, string> = {
  ms_student: "석사 재학",
  phd_student: "박사 재학",
  phd_abd: "박사 수료",
  postdoc: "박사후연구원",
  graduated: "졸업 · 구직 중",
};

function labelFrom<T extends string>(map: Record<T, string>, v: string): string {
  return (map as Record<string, string>)[v] ?? v;
}

export const degreeLabel = (v: string) => labelFrom(DEGREE_LABEL, v);
export const careerPathLabel = (v: string) => labelFrom(CAREER_PATH_LABEL, v);
export const fieldTrackLabel = (v: string) => labelFrom(FIELD_TRACK_LABEL, v);
export const applicantStageLabel = (v: string) => labelFrom(APPLICANT_STAGE_LABEL, v);

/**
 * 사람이 소리내 읽을 수 있어야 해서 혼동되는 글자(0/O, 1/I)는 뺐다.
 * 4자리면 32^4 ≈ 105만 가지다. 충돌하면 부르는 쪽에서 다시 뽑는다.
 *
 * node:crypto 가 아니라 웹 표준 crypto 를 쓴다. 이 파일은 라벨 때문에
 * 클라이언트 컴포넌트에서도 불러오므로, node: 전용 모듈이 들어오면 번들이 깨진다.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function makeHandle(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `M-${out}`;
}

/**
 * 카드·알림에 쓰는 한 줄 표기. 학위 → 진로 경로 → 연차 순서다.
 * 회사명과 실명은 여기에 들어올 수 없다.
 */
export function mentorTitle(m: {
  alias: string;
  years: number;
  degree: string;
  career_path: string;
}): string {
  return `${m.alias} · ${mentorFacets(m)}`;
}

/** 별명 없이 속성만. 별명을 이미 크게 띄운 자리(결과지 추천 줄 등)에서 쓴다. */
export function mentorFacets(m: {
  years: number;
  degree: string;
  career_path: string;
}): string {
  return `${degreeLabel(m.degree)} · ${careerPathLabel(m.career_path)} ${m.years}년차`;
}

/**
 * 멘토에게 보이는 신청자 표기. 신청자도 이름 전체를 넘기지 않는다.
 * 멘토가 사람을 가려서 받는 기준이 이름이 되면 안 되기 때문이다.
 */
export function applicantLabel(displayName: string): string {
  const name = displayName.trim();
  if (name.length <= 1) return `${name}○○`;
  return `${name[0]}${"○".repeat(name.length - 1)}`;
}
