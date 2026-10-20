/**
 * SC-1 기관 프로필. **읽기 전용 · 미연결** (R36).
 * 계약은 `docs/shared-core/SC1_TENANT_PROFILE.md`.
 */
export {
  TENANT_PROFILE_SCHEMA, TENANT_KINDS,
  type TenantKind, type TenantProfile, type TenantProfileResult,
  type TenantSourceKind, type TenantSourceOptions, type TenantProfileSchema,
} from "./types";
export { TENANT_ERROR_CODES, TenantProfileError, isTenantProfileError, type TenantErrorCode } from "./errors";
export { TENANT_CODE } from "./validate";
export {
  listTenantProfiles, loadTenantProfile, findTenantProfile, canonicalProfileJson,
} from "./resolve";
