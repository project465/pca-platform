/**
 * 기관 프로필(SC-1)의 데이터 계약. **읽기 전용이다.**
 *
 * 프로필이 들고 있는 것은 기관이 **누구인가**와 **무엇을 가리키는가**까지다:
 * 식별자 · 표시명 · 유형 · 국가·시장 · 이어 쓸 수 있는 전공(Core)과 콘텐츠의
 * 참조 · 설정 스키마 판본. 설정을 **쓰는** 자리는 여기 없다.
 *
 * **새 기관 ID 를 만들지 않는다.** `code` 는 이미 있는 식별자 그대로다:
 * `organizations.code` = `campus-universities.json` 의 `university_code`
 * = `v3_attempts.university_code`. 숫자 id(`organizations.id`)는 DB 마다 다르므로
 * 프로필에 담지 않는다.
 */
import type { TenantProfileError } from "./errors";

/** 이 계약의 판본. 칸을 바꾸면 올린다 */
export const TENANT_PROFILE_SCHEMA = "cm-tenant-profile.1" as const;
export type TenantProfileSchema = typeof TENANT_PROFILE_SCHEMA;

export const TENANT_KINDS = ["university", "public_agency", "individual"] as const;
export type TenantKind = (typeof TENANT_KINDS)[number];

/** 프로필이 어디서 왔는가. 두 원천이 같은 코드를 들면 거절한다 */
export type TenantSourceKind = "campus-registry" | "tenant-file";

export type TenantProfile = {
  schema_version: TenantProfileSchema;
  /** 안정 식별자. `organizations.code` 와 같은 값이다 */
  code: string;
  /** 표시명 */
  name: string;
  kind: TenantKind;
  /** ISO 3166-1 alpha-2. `organizations.country`(CHAR(2)) 와 같은 꼴 */
  country: string;
  /** `content/markets.json` 의 시장 코드 */
  market: string;
  /** 이어 쓸 수 있는 전공의 **참조**. 값은 `major-cores.json` 의 코드다 */
  majors: {
    /** 정렬 · 중복 없음 */
    cores: string[];
    /** 학교 등록부의 Catalog 코드(학교만). 정렬 · 중복 없음 */
    catalogs: string[];
  };
  /** 콘텐츠 설정의 **참조** */
  content: {
    /** `region-layer.json` 의 권역 코드. **적힌 차례가 우선순위다** · 중복 없음 */
    region_codes: string[];
    /** 기관·기업 자료 묶음의 열쇠. 없으면 null */
    org_dataset: string | null;
  };
  /** 되짚을 자리. 같은 파일이면 같은 지문이다 */
  source: {
    kind: TenantSourceKind;
    /** 콘텐츠 디렉터리 기준 상대 경로 */
    file: string;
    /** 원본 파일 바이트의 sha256 */
    sha256: string;
  };
};

/** 읽는 자리를 바꾸는 선택. 기본은 운영과 같은 콘텐츠 디렉터리다 */
export type TenantSourceOptions = {
  /** 기본 `process.env.CONTENT_DIR ?? "sites/pca-platform/content"` */
  contentDir?: string;
  /** 기본 `<contentDir>/tenants` */
  tenantsDir?: string;
  /** 기본 `<contentDir>/campus-universities.json` */
  campusRegistryFile?: string;
};

export type TenantProfileResult =
  | { ok: true; profile: TenantProfile }
  | { ok: false; error: TenantProfileError };
