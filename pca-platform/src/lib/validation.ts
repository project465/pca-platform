import { z } from "zod";

/**
 * 비밀번호 규칙은 길이만 본다.
 * 특수문자 강제는 임시 비밀번호를 종이로 나눠주는 운영 방식과 잘 맞지 않고,
 * 실제 안전성에도 기여가 적다.
 */
export const passwordSchema = z
  .string()
  .min(10, "비밀번호는 10자 이상이어야 합니다.")
  .max(200, "비밀번호가 너무 깁니다.");

export const orgCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "코드는 2자 이상이어야 합니다.")
    .max(40, "코드가 너무 깁니다.")
    .regex(/^[A-Za-z0-9_-]+$/, "코드는 영문·숫자·하이픈·밑줄만 쓸 수 있습니다."),
  country: z
    .string()
    .trim()
    .length(2, "국가 코드는 2자리입니다.")
    .regex(/^[A-Za-z]{2}$/, "국가 코드는 영문 2자리입니다."),
  orgType: z.enum(["university", "department", "company"]),
  parentId: z.string().trim().optional(),
  nameKo: z.string().trim().min(1, "기관명을 입력하세요.").max(200),
  nameEn: z.string().trim().max(200).optional(),
});

/* ---------- 계약과 회차 ---------- */

export const contractCreateSchema = z.object({
  orgId: z.string().regex(/^\d+$/, "학과를 고르세요."),
  title: z.string().trim().min(2, "계약명을 입력하세요.").max(120),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "시작일을 고르세요."),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "종료일을 고르세요."),
  seatCount: z.coerce
    .number()
    .int("응시권 수는 정수로 입력하세요.")
    .min(1, "응시권은 1개 이상이어야 합니다.")
    .max(20000, "한 계약에 20,000개까지 넣을 수 있습니다."),
  memo: z.string().trim().max(500).optional(),
});

/**
 * 회차. 시작·종료는 datetime-local 로 받고 서비스 기준 시간대로 해석한다.
 * 학과 담당자가 자기 학과의 계약 안에서만 만들 수 있다 — 그 검사는 액션에서 한다.
 */
export const sessionCreateSchema = z.object({
  contractId: z.string().regex(/^\d+$/, "계약을 고르세요."),
  instrumentId: z.string().regex(/^\d+$/, "검사 도구를 고르세요."),
  name: z.string().trim().min(2, "회차 이름을 입력하세요.").max(120),
  opensAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "시작 일시를 고르세요."),
  closesAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "종료 일시를 고르세요."),
  releaseMode: z.enum(["manual", "instant"]),
});

/* ---------- 현멘 (현직자 멘토링) ---------- */

/**
 * 멘토 프로필. 별명에 실명·회사명이 들어가면 익명이 깨지므로 화면에서도 경고하고
 * 길이도 짧게 잡는다. 긴 자기소개는 bio 에 쓴다.
 */
export const mentorProfileSchema = z.object({
  alias: z
    .string()
    .trim()
    .min(2, "별명을 입력하세요.")
    .max(30, "별명은 30자까지입니다."),
  years: z.coerce
    .number()
    .int("연차는 정수로 입력하세요.")
    .min(0, "연차는 0 이상입니다.")
    .max(50, "연차는 50 이하입니다."),
  // 석·박사 전용 서비스이므로 학위와 진로 경로는 선택이 아니다
  degree: z.enum(["master", "phd"]),
  fieldTrack: z.enum(["stem", "humanities", "business"]),
  careerPath: z.enum([
    "industry_rnd",
    "industry_biz",
    "research_inst",
    "academia",
    "startup",
    "public_policy",
  ]),
  companyScale: z.enum(["large", "midsize", "startup", "public", "research", "foreign"]),
  region: z.string().trim().max(20).optional(),
  headline: z
    .string()
    .trim()
    .min(10, "한 줄 소개를 10자 이상 써 주세요.")
    .max(80, "한 줄 소개는 80자까지입니다."),
  bio: z.string().trim().max(1500).optional(),
  sessionMinutes: z.coerce.number().int().min(15).max(120),
  jobIds: z.array(z.string().regex(/^\d+$/)).min(1, "직무 영역을 하나 이상 고르세요."),
});

/**
 * 신청서. 코멘토의 '3줄' 방식을 따른다 — 길게 쓰게 하면 신청이 줄고,
 * 멘토도 30분 안에 답할 수 있는 질문이어야 한다.
 */
export const mentoringRequestSchema = z.object({
  slotId: z.string().regex(/^\d+$/, "시간대를 고르세요."),
  applicantStage: z.enum(["ms_student", "phd_student", "phd_abd", "postdoc", "graduated"]),
  question: z
    .string()
    .trim()
    .min(20, "무엇을 묻고 싶은지 20자 이상 적어 주세요.")
    .max(600, "600자 안으로 줄여 주세요. 30분 안에 답할 수 있는 질문이 좋습니다."),
});

/** 멘토가 시간대를 열 때. 로컬 시간 문자열(datetime-local)을 그대로 받는다. */
export const slotOpenSchema = z.object({
  startsAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "날짜와 시간을 고르세요."),
});

export const reviewSchema = z.object({
  requestId: z.string().regex(/^\d+$/),
  rating: z.coerce.number().int().min(1, "별점을 고르세요.").max(5),
  comment: z.string().trim().max(500).optional(),
});

/** 승인. 인증 근거를 비워둘 수 없다 (schema.sql 의 CHECK 와 같은 규칙). */
export const mentorApproveSchema = z.object({
  mentorId: z.string().regex(/^\d+$/),
  verifyNote: z
    .string()
    .trim()
    .min(5, "무엇으로 현직을 확인했는지 적어야 승인할 수 있습니다.")
    .max(300),
});

export type FieldErrors = Record<string, string>;

/** zod 오류를 필드명 → 첫 메시지 로 눌러서 폼에 그대로 붙일 수 있게 만든다. */
export function fieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
