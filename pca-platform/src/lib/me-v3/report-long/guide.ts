/**
 * 전공마다 직무 여덟의 일반 안내(`role-guide.v1`)를 읽는다.
 *
 * 파일은 `data/report-gm/role-guide/<CORE>.json` 에 있고, 경영은 먼저 만든
 * `data/report-gm/biz-role-guide.json` 을 함께 본다. 안내는 측정·채점에 쓰이지
 * 않고 04장이 직무를 설명할 때만 읽는다.
 *
 * 파일이 아직 없거나 쓰는 중이라 읽을 수 없으면 지어서 채우지 않는다. 그 Core 는
 * 직무팩 자료만으로 쪽을 줄여 세우고, 그 사실을 로그와 결과에 남긴다.
 * 캐시를 두지 않는다: 안내 파일이 작업 중에 새로 생기므로 부를 때마다 다시 읽는다.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { GuideState, RoleGuide } from "./types";

const DIR = "data/report-gm/role-guide";
const LEGACY: Record<string, string> = { BIZ_CORE_V1: "data/report-gm/biz-role-guide.json" };

function usable(r: unknown): r is RoleGuide {
  const g = r as Partial<RoleGuide> | null;
  return !!g && typeof g.summary === "string" && Array.isArray(g.process) && g.process.length > 0
    && Array.isArray(g.responsibilities) && !!g.practice && typeof g.practice === "object"
    && !!g.firstProject && Array.isArray(g.firstProject.steps);
}

export function loadGuide(core: string, roleCodes: string[], root = process.cwd(), lang = "ko"): GuideState {
  /* 영어판은 `role-guide/en/` 한 벌이다. 없으면 한국어로 내려가지 않고 없는 것으로 둔다:
     영어 책에 한국어 안내 쪽이 서는 것보다 그 쪽이 빠지는 편이 낫다 */
  const candidates = (lang === "ko"
    ? [path.join(DIR, `${core}.json`), LEGACY[core]]
    : [path.join(DIR, lang, `${core}.json`)]).filter(Boolean) as string[];
  const file = candidates.find((f) => existsSync(path.join(root, f))) ?? null;
  if (!file) {
    return { status: "MISSING", file: null, roles: {}, missingRoles: roleCodes, note: `${core} 직무 안내 파일이 없습니다` };
  }
  let body: { core?: string; roles?: Record<string, unknown> };
  try {
    body = JSON.parse(readFileSync(path.join(root, file), "utf8"));
  } catch (e) {
    return { status: "INVALID", file, roles: {}, missingRoles: roleCodes, note: `${file} 를 읽지 못했습니다: ${String((e as Error).message).slice(0, 120)}` };
  }
  if (body.core && body.core !== core) {
    return { status: "INVALID", file, roles: {}, missingRoles: roleCodes, note: `${file} 의 core 가 ${body.core} 입니다` };
  }
  const roles: Record<string, RoleGuide> = {};
  for (const code of roleCodes) {
    const r = body.roles?.[code];
    if (usable(r)) roles[code] = r;
  }
  const missingRoles = roleCodes.filter((c) => !roles[c]);
  const status = !Object.keys(roles).length ? "INVALID" : missingRoles.length ? "PARTIAL" : "OK";
  return {
    status, file, roles, missingRoles,
    note: missingRoles.length ? `${file} 에 직무 ${missingRoles.length}개의 안내가 없습니다` : null,
  };
}
