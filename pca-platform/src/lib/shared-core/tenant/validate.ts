/**
 * `content/tenants/<CODE>.json` 한 벌을 프로필로 바꾼다. **순수 함수다**:
 * 같은 글자를 넣으면 같은 프로필이 나온다.
 *
 * **모르는 칸을 받지 않는다.** 칸 이름 하나를 틀리게 적으면(`region_code`)
 * 그 값이 조용히 버려지고 기관은 권역 없이 선다. 그래서 그 자리에서 거절한다.
 */
import { createHash } from "node:crypto";
import { TenantProfileError } from "./errors";
import type { TenantRefs } from "./refs";
import {
  TENANT_KINDS, TENANT_PROFILE_SCHEMA,
  type TenantKind, type TenantProfile, type TenantSourceKind,
} from "./types";

/** `organizations.code` 로 쓰이는 꼴. 지금 코드(`PCU` · `ZZTEST`)가 전부 이 안이다 */
export const TENANT_CODE = /^[A-Z][A-Z0-9_]{1,31}$/;
const COUNTRY = /^[A-Z]{2}$/;
const DATASET = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const TOP = ["schema_version", "code", "name", "kind", "country", "market",
  "majors", "content", "note"] as const;
const REQUIRED = ["schema_version", "code", "name", "kind", "country", "market",
  "majors", "content"] as const;
const MAJORS = ["cores"] as const;
const CONTENT = ["region_codes", "org_dataset"] as const;

type Obj = Record<string, unknown>;

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function only(o: Obj, allowed: readonly string[], file: string, at: string): void {
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k)) {
      throw new TenantProfileError("UNKNOWN_FIELD",
        `${file}: 모르는 칸입니다 — ${at}${k}`, { file, field: `${at}${k}` });
    }
  }
}

function need(o: Obj, keys: readonly string[], file: string, at: string): void {
  for (const k of keys) {
    if (!(k in o) || o[k] === undefined) {
      throw new TenantProfileError("MISSING_FIELD",
        `${file}: 필수 칸이 없습니다 — ${at}${k}`, { file, field: `${at}${k}` });
    }
  }
}

function text(v: unknown, file: string, field: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new TenantProfileError("INVALID_SCHEMA",
      `${file}: ${field} 는 비어 있지 않은 글자여야 합니다`, { file, field });
  }
  return v.trim();
}

function codeList(
  v: unknown, file: string, field: string, known: ReadonlySet<string>, sort: boolean,
): string[] {
  if (!Array.isArray(v)) {
    throw new TenantProfileError("INVALID_SCHEMA", `${file}: ${field} 는 목록이어야 합니다`, { file, field });
  }
  const seen = new Set<string>();
  for (const x of v) {
    const c = text(x, file, field);
    if (seen.has(c)) {
      throw new TenantProfileError("INVALID_SCHEMA",
        `${file}: ${field} 에 같은 값이 두 번 있습니다 — ${c}`, { file, field, value: c });
    }
    if (!known.has(c)) {
      throw new TenantProfileError("UNKNOWN_REFERENCE",
        `${file}: ${field} 가 등록되지 않은 값을 가리킵니다 — ${c}`, { file, field, value: c });
    }
    seen.add(c);
  }
  const out = [...seen];
  return sort ? out.sort() : out;
}

/** 두 원천이 같은 판정을 쓴다. 꼴과 참조만 보고 값을 짐작해 채우지 않는다 */
export function checkCommon(
  input: { code: unknown; name: unknown; kind: unknown; country: unknown; market: unknown },
  file: string, refs: TenantRefs,
): { code: string; name: string; kind: TenantKind; country: string; market: string } {
  const code = text(input.code, file, "code");
  if (!TENANT_CODE.test(code)) {
    throw new TenantProfileError("INVALID_CODE",
      `${file}: 기관 코드 꼴이 아닙니다 — ${code}`, { file, field: "code", value: code });
  }
  const kind = text(input.kind, file, "kind");
  if (!(TENANT_KINDS as readonly string[]).includes(kind)) {
    throw new TenantProfileError("INVALID_SCHEMA",
      `${file}: kind 는 ${TENANT_KINDS.join(" · ")} 가운데 하나입니다 — ${kind}`,
      { file, field: "kind", value: kind });
  }
  const country = text(input.country, file, "country");
  if (!COUNTRY.test(country)) {
    throw new TenantProfileError("INVALID_SCHEMA",
      `${file}: country 는 ISO 3166-1 두 글자입니다 — ${country}`, { file, field: "country", value: country });
  }
  const market = text(input.market, file, "market");
  if (!refs.markets.has(market)) {
    throw new TenantProfileError("UNKNOWN_REFERENCE",
      `${file}: market 이 markets.json 에 없습니다 — ${market}`, { file, field: "market", value: market });
  }
  return { code, name: text(input.name, file, "name"), kind: kind as TenantKind, country, market };
}

export function regionList(v: unknown, file: string, refs: TenantRefs): string[] {
  return codeList(v, file, "content.region_codes", refs.regions, false);
}

export function coreList(v: unknown, file: string, refs: TenantRefs): string[] {
  return codeList(v, file, "majors.cores", refs.cores, true);
}

export function freezeProfile(p: TenantProfile): TenantProfile {
  Object.freeze(p.majors.cores); Object.freeze(p.majors.catalogs);
  Object.freeze(p.majors); Object.freeze(p.content.region_codes);
  Object.freeze(p.content); Object.freeze(p.source);
  return Object.freeze(p);
}

/**
 * 기관 파일 한 벌. `fileName` 은 `<CODE>.json` 이어야 한다: 파일 이름과 안의
 * 코드가 다르면 **어느 기관의 설정인지 두 답이 생긴다.**
 */
export function parseTenantFile(
  raw: string, fileName: string, relFile: string, refs: TenantRefs,
  sourceKind: TenantSourceKind = "tenant-file",
): TenantProfile {
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
  only(j, TOP, relFile, "");
  need(j, REQUIRED, relFile, "");
  if (j.schema_version !== TENANT_PROFILE_SCHEMA) {
    throw new TenantProfileError("UNSUPPORTED_SCHEMA_VERSION",
      `${relFile}: schema_version 은 ${TENANT_PROFILE_SCHEMA} 여야 합니다 — ${String(j.schema_version)}`,
      { file: relFile, field: "schema_version", value: String(j.schema_version) });
  }
  if (j.note !== undefined && typeof j.note !== "string") {
    throw new TenantProfileError("INVALID_SCHEMA", `${relFile}: note 는 글자여야 합니다`, { file: relFile, field: "note" });
  }
  const common = checkCommon(j as Parameters<typeof checkCommon>[0], relFile, refs);
  if (fileName !== `${common.code}.json`) {
    throw new TenantProfileError("CODE_MISMATCH",
      `${relFile}: 파일 이름과 code 가 다릅니다 — ${fileName} · ${common.code}`,
      { file: relFile, field: "code", value: common.code });
  }

  if (!isObj(j.majors)) {
    throw new TenantProfileError("INVALID_SCHEMA", `${relFile}: majors 는 객체여야 합니다`, { file: relFile, field: "majors" });
  }
  only(j.majors, MAJORS, relFile, "majors.");
  need(j.majors, MAJORS, relFile, "majors.");
  if (!isObj(j.content)) {
    throw new TenantProfileError("INVALID_SCHEMA", `${relFile}: content 는 객체여야 합니다`, { file: relFile, field: "content" });
  }
  only(j.content, CONTENT, relFile, "content.");
  need(j.content, CONTENT, relFile, "content.");
  const ds = j.content.org_dataset;
  if (ds !== null && (typeof ds !== "string" || !DATASET.test(ds))) {
    throw new TenantProfileError("INVALID_SCHEMA",
      `${relFile}: content.org_dataset 은 null 이거나 소문자 열쇠여야 합니다`,
      { file: relFile, field: "content.org_dataset" });
  }

  return freezeProfile({
    schema_version: TENANT_PROFILE_SCHEMA,
    ...common,
    majors: { cores: coreList(j.majors.cores, relFile, refs), catalogs: [] },
    content: { region_codes: regionList(j.content.region_codes, relFile, refs), org_dataset: ds as string | null },
    source: { kind: sourceKind, file: relFile, sha256: sha256(raw) },
  });
}
