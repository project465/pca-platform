/**
 * 기관 코드 하나 → 프로필 하나. **읽기만 한다**: 파일을 쓰지 않고, 캐시를
 * 두지 않고, DB 에 붙지 않는다. 그래서 같은 파일이면 몇 번을 불러도 같은
 * 값이 나오고, 파일을 고친 뒤에는 다음 호출이 고친 값을 읽는다.
 *
 * 원천은 둘이다. 학교 등록부(`campus-universities.json`)와 기관 파일
 * (`<contentDir>/tenants/<CODE>.json`). **같은 코드를 두 원천이 들면
 * 거절한다**: 어느 쪽이 그 기관의 설정인지 두 답이 생기고, 둘 가운데 하나를
 * 고르는 규칙을 여기 두면 그 규칙이 곧 숨은 설정 저장소가 된다.
 *
 * **아직 어디에도 연결하지 않는다.** 화면·인증·채점·PDF 가 이 파일을
 * 들여오지 않는 것을 `scripts/shared-core/tenant-boundary.test.ts` 가 센다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parseCampusRegistry } from "./campus";
import { TenantProfileError, isTenantProfileError } from "./errors";
import { loadRefs, type TenantRefs } from "./refs";
import { TENANT_CODE, parseTenantFile } from "./validate";
import type { TenantProfile, TenantProfileResult, TenantSourceOptions } from "./types";

type Sources = { contentDir: string; tenantsDir: string; campusRegistryFile: string };

function sourcesOf(opts: TenantSourceOptions = {}): Sources {
  const contentDir = opts.contentDir ?? process.env.CONTENT_DIR ?? "sites/pca-platform/content";
  return {
    contentDir,
    tenantsDir: opts.tenantsDir ?? join(contentDir, "tenants"),
    campusRegistryFile: opts.campusRegistryFile ?? join(contentDir, "campus-universities.json"),
  };
}

function rel(src: Sources, file: string): string {
  const r = relative(src.contentDir, file);
  return r.startsWith("..") ? basename(file) : r;
}

function readText(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch (e) {
    throw new TenantProfileError("SOURCE_UNREADABLE",
      `원천 파일을 읽지 못했습니다: ${file}`, { file, value: String(e).slice(0, 120) });
  }
}

function campusProfiles(src: Sources, refs: TenantRefs): TenantProfile[] {
  return parseCampusRegistry(readText(src.campusRegistryFile), rel(src, src.campusRegistryFile), refs);
}

/** 기관 파일 디렉터리가 없으면 빈 목록이다. 없는 것은 오류가 아니다 */
function tenantFiles(src: Sources): string[] {
  if (!existsSync(src.tenantsDir) || !statSync(src.tenantsDir).isDirectory()) return [];
  return readdirSync(src.tenantsDir).filter((f) => f.endsWith(".json")).sort();
}

function fileProfiles(src: Sources, refs: TenantRefs): TenantProfile[] {
  return tenantFiles(src).map((f) => {
    const full = join(src.tenantsDir, f);
    return parseTenantFile(readText(full), f, rel(src, full), refs);
  });
}

function merged(src: Sources): TenantProfile[] {
  const refs = loadRefs(src.contentDir);
  const all = [...campusProfiles(src, refs), ...fileProfiles(src, refs)];
  const seen = new Map<string, TenantProfile>();
  for (const p of all) {
    const prev = seen.get(p.code);
    if (prev) {
      throw new TenantProfileError("CODE_CONFLICT",
        `같은 기관 코드를 두 원천이 들고 있습니다 — ${p.code} (${prev.source.file} · ${p.source.file})`,
        { tenant: p.code, file: p.source.file });
    }
    seen.set(p.code, p);
  }
  return [...seen.values()].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

function checkCode(code: unknown): string {
  if (typeof code !== "string" || !TENANT_CODE.test(code)) {
    throw new TenantProfileError("INVALID_CODE",
      `기관 코드 꼴이 아닙니다 — ${String(code).slice(0, 40)}`, { value: String(code).slice(0, 40) });
  }
  return code;
}

/** 전 원천을 읽어 코드순으로. 원천 하나가 깨져 있으면 목록 전체를 거절한다 */
export function listTenantProfiles(opts?: TenantSourceOptions): TenantProfile[] {
  return merged(sourcesOf(opts));
}

/**
 * 코드 하나. 없으면 `TENANT_NOT_FOUND` 를 던진다.
 * **다른 기관의 파일이 깨져 있어도 거절한다**: 깨진 파일이 그 코드를 들고
 * 있는지 읽어 보기 전에는 알 수 없고, 모르는 채로 돌려주면 충돌을 놓친다.
 */
export function loadTenantProfile(code: string, opts?: TenantSourceOptions): TenantProfile {
  const c = checkCode(code);
  const hit = merged(sourcesOf(opts)).find((p) => p.code === c);
  if (!hit) {
    throw new TenantProfileError("TENANT_NOT_FOUND", `등록된 기관이 아닙니다 — ${c}`, { tenant: c });
  }
  return hit;
}

/** 던지지 않는 쪽. 프로필 오류만 결과로 돌려주고 그 밖의 오류는 그대로 던진다 */
export function findTenantProfile(code: string, opts?: TenantSourceOptions): TenantProfileResult {
  try {
    return { ok: true, profile: loadTenantProfile(code, opts) };
  } catch (e) {
    if (isTenantProfileError(e)) return { ok: false, error: e };
    throw e;
  }
}

/** 같은 프로필이면 같은 글자. 열쇠를 정렬해 적는다 */
export function canonicalProfileJson(p: TenantProfile): string {
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.keys(v as object).sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
    }
    return v;
  };
  return JSON.stringify(sortKeys(p));
}
