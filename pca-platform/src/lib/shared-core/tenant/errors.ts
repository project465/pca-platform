/**
 * 기관 프로필을 읽다 멈춘 까닭. **하나로 뭉개지 않는다**: 없는 기관과 깨진
 * 파일과 남의 코드를 든 파일은 고치는 사람이 다르다.
 */
export const TENANT_ERROR_CODES = [
  "TENANT_NOT_FOUND",
  "INVALID_CODE",
  "INVALID_JSON",
  "INVALID_SCHEMA",
  "MISSING_FIELD",
  "UNKNOWN_FIELD",
  "UNSUPPORTED_SCHEMA_VERSION",
  "CODE_MISMATCH",
  "CODE_CONFLICT",
  "UNKNOWN_REFERENCE",
  "SOURCE_UNREADABLE",
] as const;
export type TenantErrorCode = (typeof TENANT_ERROR_CODES)[number];

export class TenantProfileError extends Error {
  readonly code: TenantErrorCode;
  /** 어느 파일의 어느 칸인가. 개인정보를 담지 않는다 */
  readonly detail: { file?: string; field?: string; value?: string; tenant?: string };

  constructor(
    code: TenantErrorCode, message: string,
    detail: { file?: string; field?: string; value?: string; tenant?: string } = {},
  ) {
    super(`[${code}] ${message}`);
    this.name = "TenantProfileError";
    this.code = code;
    this.detail = detail;
  }
}

export function isTenantProfileError(e: unknown): e is TenantProfileError {
  return e instanceof TenantProfileError;
}
