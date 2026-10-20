/**
 * 학교 등록부(`campus-universities.json`) 한 벌을 프로필 목록으로 바꾼다.
 * **순수 함수다**: 같은 글자를 넣으면 같은 목록이 나온다.
 *
 * **등록부를 다시 해석하지 않는다.** 학과·갈래·Catalog 를 고르는 규칙은
 * `src/lib/campus/registry.ts` 가 들고 있고, 여기서 꺼내는 것은 기관이
 * 누구인가와 어느 Core·Catalog·권역을 가리키는가까지다. 같은 판단을 두
 * 곳에서 하면 어느 날 갈린다.
 *
 * **fixture 를 붙이지 않는다.** `V3_CAMPUS_FIXTURE` 는 확인용 학교를 서버에
 * 덧붙이는 문이고 프로필의 원천이 아니다. 확인용 학교가 필요하면 부르는
 * 쪽이 그 파일을 `campusRegistryFile` 로 넘긴다.
 */
import { TenantProfileError } from "./errors";
import type { TenantRefs } from "./refs";
import { checkCommon, coreList, freezeProfile, regionList, sha256 } from "./validate";
import { TENANT_PROFILE_SCHEMA, type TenantProfile } from "./types";

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function need(o: Obj, keys: readonly string[], file: string, at: string): void {
  for (const k of keys) {
    if (o[k] === undefined || o[k] === null) {
      throw new TenantProfileError("MISSING_FIELD",
        `${file}: 필수 칸이 없습니다 — ${at}${k}`, { file, field: `${at}${k}` });
    }
  }
}

/** 단과대학 아래의 `units` 와 학부 아래의 `majors` 를 끝까지 내려가며 Core 를 모은다 */
function collectCores(units: unknown, out: Set<string>): void {
  if (!Array.isArray(units)) return;
  for (const u of units) {
    if (!isObj(u)) continue;
    const c = u.core_code;
    if (typeof c === "string" && c.trim()) out.add(c.trim());
    collectCores(u.units, out);
    collectCores(u.majors, out);
  }
}

function universityProfile(
  u: Obj, index: number, relFile: string, digest: string, refs: TenantRefs,
): TenantProfile {
  const at = `universities[${index}].`;
  need(u, ["university_code", "university_name", "market_code", "catalogs"], relFile, at);

  /* 학교 등록부에는 country 칸이 없다. 시장 코드가 나라 코드 꼴일 때만 그
   * 값을 쓰고, 아니면(`GLOBAL`) 짐작하지 않고 거절한다 */
  const market = u.market_code;
  if (typeof market !== "string" || !/^[A-Z]{2}$/.test(market.trim())) {
    throw new TenantProfileError("INVALID_SCHEMA",
      `${relFile}: ${at}market_code 로 나라를 정할 수 없습니다 — ${String(market)}`,
      { file: relFile, field: `${at}market_code`, value: String(market) });
  }
  const common = checkCommon(
    { code: u.university_code, name: u.university_name, kind: "university",
      country: market, market },
    relFile, refs,
  );

  if (!Array.isArray(u.catalogs) || u.catalogs.length === 0) {
    throw new TenantProfileError("INVALID_SCHEMA",
      `${relFile}: ${at}catalogs 는 비어 있지 않은 목록이어야 합니다`,
      { file: relFile, field: `${at}catalogs`, tenant: common.code });
  }
  const catalogs = new Set<string>();
  const cores = new Set<string>();
  u.catalogs.forEach((cat, i) => {
    if (!isObj(cat)) {
      throw new TenantProfileError("INVALID_SCHEMA",
        `${relFile}: ${at}catalogs[${i}] 는 객체여야 합니다`,
        { file: relFile, field: `${at}catalogs[${i}]`, tenant: common.code });
    }
    need(cat, ["catalog_code", "colleges"], relFile, `${at}catalogs[${i}].`);
    const code = String(cat.catalog_code).trim();
    if (!code || catalogs.has(code)) {
      throw new TenantProfileError("INVALID_SCHEMA",
        `${relFile}: ${at}catalogs 에 같은 catalog_code 가 두 번 있습니다 — ${code}`,
        { file: relFile, field: `${at}catalogs[${i}].catalog_code`, value: code, tenant: common.code });
    }
    catalogs.add(code);
    if (!Array.isArray(cat.colleges)) {
      throw new TenantProfileError("INVALID_SCHEMA",
        `${relFile}: ${at}catalogs[${i}].colleges 는 목록이어야 합니다`,
        { file: relFile, field: `${at}catalogs[${i}].colleges`, tenant: common.code });
    }
    for (const col of cat.colleges) if (isObj(col)) collectCores(col.units, cores);
  });

  /* region_hint 는 비어 있을 수 있다. 비면 권역 없이 선다 */
  const hint = u.region_hint;
  const regions = hint === undefined || hint === null ? [] : [hint];

  return freezeProfile({
    schema_version: TENANT_PROFILE_SCHEMA,
    ...common,
    majors: {
      cores: coreList([...cores], relFile, refs),
      catalogs: [...catalogs].sort(),
    },
    content: { region_codes: regionList(regions, relFile, refs), org_dataset: null },
    source: { kind: "campus-registry", file: relFile, sha256: digest },
  });
}

/**
 * 이 어댑터가 읽는 법을 아는 등록부 판본.
 *
 * **모르는 판본을 짐작해 읽지 않는다.** 칸 이름이 바뀐 판본(`core_code` →
 * 다른 이름)을 옛 규칙으로 읽으면 Core 가 하나도 안 잡힌 프로필이 오류 없이
 * 선다(R37 에서 그 모양을 확인했다). 판본을 올리는 날 여기에 한 줄을 더하고
 * 그 판본의 읽는 법을 확인한다.
 *
 * `schema_version` 이 아예 없는 파일은 확인용 fixture(`campus-zztest.json`)
 * 꼴이라 받는다. 운영 등록부는 늘 판본을 든다.
 */
export const KNOWN_CAMPUS_SCHEMAS: readonly string[] = ["cm-campus-universities.5"];

/** 등록부 글자 한 벌 → 학교마다 프로필 하나. 같은 학교 코드가 두 번이면 거절한다 */
export function parseCampusRegistry(
  raw: string, relFile: string, refs: TenantRefs,
): TenantProfile[] {
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch (e) {
    throw new TenantProfileError("INVALID_JSON",
      `${relFile}: JSON 이 아닙니다`, { file: relFile, value: String(e).slice(0, 120) });
  }
  if (!isObj(j)) {
    throw new TenantProfileError("INVALID_SCHEMA", `${relFile}: 맨 위가 객체여야 합니다`, { file: relFile });
  }
  if (j.schema_version !== undefined && !KNOWN_CAMPUS_SCHEMAS.includes(String(j.schema_version))) {
    throw new TenantProfileError("UNSUPPORTED_SCHEMA_VERSION",
      `${relFile}: 읽는 법을 모르는 등록부 판본입니다 — ${String(j.schema_version)}`,
      { file: relFile, field: "schema_version", value: String(j.schema_version) });
  }
  if (!Array.isArray(j.universities)) {
    throw new TenantProfileError("MISSING_FIELD",
      `${relFile}: universities 목록이 없습니다`, { file: relFile, field: "universities" });
  }
  const digest = sha256(raw);
  const seen = new Set<string>();
  const out: TenantProfile[] = [];
  j.universities.forEach((u, i) => {
    if (!isObj(u)) {
      throw new TenantProfileError("INVALID_SCHEMA",
        `${relFile}: universities[${i}] 는 객체여야 합니다`, { file: relFile, field: `universities[${i}]` });
    }
    const p = universityProfile(u, i, relFile, digest, refs);
    if (seen.has(p.code)) {
      throw new TenantProfileError("CODE_CONFLICT",
        `${relFile}: 같은 학교 코드가 두 번 있습니다 — ${p.code}`,
        { file: relFile, field: `universities[${i}].university_code`, tenant: p.code });
    }
    seen.add(p.code);
    out.push(p);
  });
  return out.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}
