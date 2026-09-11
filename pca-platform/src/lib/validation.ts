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

/**
 * 개인 회원가입.
 *
 * 기관 계정은 관리자가 발급하지만 개인은 스스로 만든다(2026-09-10 결정).
 * 결제 화면에서 로그인을 요구하면 처음 온 사람이 거기서 막히므로,
 * 가입과 결제가 한 줄로 이어져야 한다.
 */
export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("이메일 형식이 아닙니다.").max(190),
  name: z.string().trim().min(1, "이름을 적어 주세요.").max(60),
  password: passwordSchema,
});
