import { randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * 홈페이지에서 들어오는 단체 도입 신청.
 *
 * 소개 사이트(marketing/)는 이 플랫폼과 별개 앱이므로(설계 원칙 5) 폼을
 * 직접 DB 에 쓰지 않고 이 스키마를 통과하는 JSON 을 보낸다. 받는 곳은
 * `POST /api/applications` 하나다.
 *
 * 신청은 누구나 넣을 수 있지만 그것만으로는 아무 권한도 생기지 않는다.
 * organizations 행과 전용 링크는 운영자가 승인해야 만들어진다.
 */
export const applicationSchema = z.object({
  site: z.string().trim().min(1).max(20),
  country: z
    .string()
    .trim()
    .length(2, "국가 코드는 2자리입니다.")
    .regex(/^[A-Za-z]{2}$/),
  orgName: z.string().trim().min(1, "기관명을 입력하세요.").max(200),
  deptName: z.string().trim().max(200).optional(),
  contactName: z.string().trim().min(1, "담당자 이름을 입력하세요.").max(100),
  contactEmail: z.string().trim().email("이메일 형식이 아닙니다.").max(200),
  contactPhone: z.string().trim().max(50).optional(),
  /** 폼에서는 문자열로 오므로 숫자로 바꿔 받는다. 빈 칸이면 없는 값이다 */
  expectedSize: z.coerce.number().int().min(1).max(1_000_000).optional(),
  plan: z.string().trim().max(40).optional(),
  message: z.string().trim().max(4000).optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

/**
 * 접수번호. 신청자가 문의할 때 대는 번호이므로 사람이 읽고 부를 수 있어야 한다.
 * 혼동하기 쉬운 글자는 빼고, 연도를 앞에 두어 언제 것인지 바로 보이게 한다.
 */
const SAFE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newRefCode(now = new Date()): string {
  const bytes = randomBytes(6);
  let tail = "";
  for (let i = 0; i < 6; i++) tail += SAFE[bytes[i] % SAFE.length];
  return `PCA-${now.getUTCFullYear()}-${tail}`;
}

/**
 * 단체 전용 링크에 들어가는 값.
 *
 * 이 링크를 가진 사람은 그 단체 학생으로 들어올 수 있으므로 추측할 수 없어야
 * 한다. 32바이트면 무차별 대입으로 맞힐 수 없다.
 */
export function newLinkToken(): string {
  return randomBytes(24).toString("base64url");
}

/** 전용 링크의 완성된 주소. 메일이나 안내문에 그대로 붙일 수 있는 형태다 */
export function joinUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/join/${token}`;
}

/** 기관 코드 후보. 신청서의 기관명에서 만들고, 겹치면 뒤에 숫자를 붙인다 */
export function suggestOrgCode(orgName: string, deptName?: string | null): string {
  const raw = [orgName, deptName].filter(Boolean).join("-");
  const ascii = raw
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  // 한글만 적어 낸 경우 ascii 가 비므로 그때는 사람이 직접 정한다
  return ascii.slice(0, 30);
}

/**
 * 승인 화면이 받는 값.
 *
 * 신청서에 적힌 내용을 그대로 믿고 기관을 만들지 않는다. 운영자가 코드와
 * 기관 유형을 정하고, 계약 좌석 수를 확정한 다음에야 발급된다.
 */
export const approveSchema = z.object({
  /* 신청서의 country 는 "어느 나라 소개 사이트에서 왔는가" 일 뿐이다.
     글로벌판에는 나라가 하나로 정해지지 않으므로, 기관에 박히는 국가는
     운영자가 승인할 때 고른다 */
  country: z
    .string()
    .trim()
    .length(2, "국가 코드는 2자리입니다.")
    .regex(/^[A-Za-z]{2}$/, "국가 코드는 영문 2자리입니다."),
  code: z
    .string()
    .trim()
    .min(2, "코드는 2자 이상이어야 합니다.")
    .max(40, "코드가 너무 깁니다.")
    .regex(/^[A-Za-z0-9_-]+$/, "코드는 영문·숫자·하이픈·밑줄만 쓸 수 있습니다."),
  orgType: z.enum(["university", "department", "company"]),
  parentId: z.string().trim().optional(),
  nameKo: z.string().trim().min(1, "기관명을 입력하세요.").max(200),
  nameEn: z.string().trim().max(200).optional(),
  adminName: z.string().trim().min(1, "담당자 이름을 입력하세요.").max(100),
  adminEmail: z.string().trim().email("이메일 형식이 아닙니다.").max(200),
  contractTitle: z.string().trim().min(1, "계약 이름을 입력하세요.").max(200),
  startsOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식입니다."),
  endsOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식입니다."),
  seatCount: z.coerce
    .number()
    .int("좌석 수는 정수여야 합니다.")
    .min(1, "좌석은 1개 이상이어야 합니다.")
    .max(100_000, "좌석이 너무 많습니다."),
  linkLabel: z.string().trim().min(1, "링크 이름을 입력하세요.").max(200),

  /* 정산 방식. 선불은 응시권을 미리 사고, 건당은 나간 건수만큼 나중에
     청구한다. 대학 산학협력단·지역 일자리경제진흥원·고용노동부 위탁사업이
     건당을 쓴다 */
  billing: z.enum(["prepaid", "per_use"]).default("prepaid"),
  /* 건당 단가. 원 단위 정수로만 받는다 — 소수점은 청구서에서 어긋난다 */
  unitPrice: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)]).optional(),
  /* 건당 상한. 비우면 무제한 */
  useCap: z.union([z.literal(""), z.coerce.number().int().min(1).max(1_000_000)]).optional(),
})
  .refine((v) => v.billing !== "per_use" || (typeof v.unitPrice === "number" && v.unitPrice > 0), {
    path: ["unitPrice"],
    message: "건당 계약은 단가를 적어야 합니다.",
  });

/** 비밀번호 설정·재설정 링크. 승인 메일과 화면이 같은 것을 쓰게 한다 */
export function resetUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/password/reset/${token}`;
}
