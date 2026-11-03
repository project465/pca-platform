/**
 * 학교 학생의 응시가 지금 어디에 있는가. **단추의 말은 이 값이 정한다.**
 *
 * 학교 쪽 쪽들이 상태를 보지 않고 늘 `검사 시작하기` 를 세웠다. 결과를
 * 받은 학생이 그 단추를 누르면 실제로는 지난 결과로 돌아가는데 단추는
 * 시작한다고 말했고, 푸는 중인 학생에게도 같은 말이 섰다. 적힌 말과 일어나는
 * 일이 다르면 읽는 사람은 자기가 무엇을 잘못 누른 줄 안다.
 *
 * - `start`  : 아직 응시가 없다 → 검사 시작
 * - `resume` : 푸는 중인 응시가 있다 → 이어하기 (그 응시로 바로 간다)
 * - `result` : 결과를 받았고 다시 열 권한이 없다 → 결과 보기
 * - `retake` : 결과를 받았고 담당자가 다시 열어 주었다 → 다시 검사 시작 +
 *              지난 결과 보기
 *
 * 다시 여는 권한은 **학교 이용권만** 센다(`startGate` 와 같은 자다): 학생이
 * 따로 산 개인 이용권으로 학교 응시가 하나 더 열리지 않는다.
 */
import { query, queryOne } from "@/lib/db";
import { findLeaf, pickRequired, university, type CampusContext } from "./registry";
import { v3Grants } from "@/lib/me-v3/runtime/session";
import { CAMPUS_GRANT_PRODUCT } from "./start-gate";

export type CampusAttemptState =
  | { kind: "start" }
  | { kind: "resume"; attemptId: string }
  | { kind: "result"; attemptId: string }
  | { kind: "retake"; attemptId: string };

/**
 * 두 학과 코드가 같은 학과인가. 학년도 판(PCU26_ · PCU27_)이나 대소문자가 달라도 이름 · 단과대학이 같으면 같다
 * (학과 쪽 `sameDept` 와 같은 자)
 */
export function sameDepartment(universityCode: string, a: string | null | undefined, b: string | null | undefined): boolean {
  const x = String(a ?? "").trim().toUpperCase(); const y = String(b ?? "").trim().toUpperCase();
  if (!x || !y) return false;
  if (x === y) return true;
  const u = university(universityCode);
  const fa = u ? findLeaf(u, x) : null; const fb = u ? findLeaf(u, y) : null;
  return !!fa && !!fb && fa.leaf.name === fb.leaf.name && fa.college.code === fb.college.code;
}

/**
 * 두 학과 자리가 **다른 학년도 구조**에 있는가. 다른 학년도 자리는 다른 학과로 치지 않는다: 그쪽을 눌러도 응시 줄은
 * 명단의 자리를 든다(규격 §1 · `campus:walk`). 다른 학과 검사는 명단과 같은 학년도 구조 안에서만 고른다
 */
export function otherCatalogYear(universityCode: string, a: string | null | undefined, b: string | null | undefined): boolean {
  const u = university(universityCode);
  const fa = u && a ? findLeaf(u, a) : null; const fb = u && b ? findLeaf(u, b) : null;
  return !!fa && !!fb && fa.catalog.catalog_year !== fb.catalog.catalog_year;
}

/**
 * 이번 응시가 잴 학과(2026-11-03 대표 결정 "다른 학과도 검사"). 학과 쪽에서 고른 학과(쿠키, 등록부로 다시 맞춘 값)가
 * 등록 학과와 다르면 고른 학과다. 고르지 않았거나 같은 학과이거나, 전공을 고르는 자리(자율전공) 학생이면 등록된 줄이다
 * (자율전공의 Core 는 부르는 쪽이 따로 고른 전공으로 바꾼다). 학교는 늘 등록된 줄의 학교다
 */
export function campusTargetOf(
  entry: CampusContext | null,
  mine: { ctx: CampusContext; row: { university_code: string; department_code: string } },
): CampusContext {
  if (!entry || pickRequired(mine.ctx) || entry.university_code !== mine.row.university_code) return mine.ctx;
  if (sameDepartment(mine.row.university_code, entry.department_code, mine.row.department_code)) return mine.ctx;
  if (otherCatalogYear(mine.row.university_code, entry.department_code, mine.row.department_code)) return mine.ctx;
  return {
    university_code: entry.university_code, college_code: entry.college_code,
    department_code: entry.department_code, core_code: entry.core_code, specialization: entry.specialization,
  };
}

/**
 * **학과마다 한 번이다**(2026-11-03 대표 결정 "다른 학과도 검사"). `department` 를 주면 그 학과로 낸 결과만 센다:
 * 등록 학과로 결과를 받은 학생도 다른 학과는 처음부터 시작할 수 있다. 주지 않으면 전과 같이 학교 응시 전체를 센다.
 * 푸는 중인 응시는 학과와 상관없이 하나다(이어보기가 먼저: `openAttempt`).
 */
export async function campusAttemptState(
  userId: string, department?: { universityCode: string; code: string; core?: string | null } | null,
): Promise<CampusAttemptState> {
  const open = await queryOne<{ id: string | null }>(
    `SELECT max(id)::text AS id FROM v3_attempts WHERE user_id = $1::bigint AND status = 'in_progress'`, [userId]);
  if (open?.id) return { kind: "resume", attemptId: open.id };
  const rows = await query<{ id: string; university_code: string | null; department_code: string | null; core_code: string }>(
    `SELECT id::text, university_code, department_code, core_code FROM v3_attempts
      WHERE user_id = $1::bigint AND status = 'scored' ORDER BY id DESC`, [userId]);
  const mine = department
    ? rows.filter((x) => x.university_code === department.universityCode
        && sameDepartment(department.universityCode, x.department_code, department.code)
        /* 전공을 고르는 자리(자율전공 · 계열 미정)는 응시 줄의 학과가 그 자리 그대로라, 고른 전공(Core)으로 가른다 */
        && (!department.core || x.core_code === department.core))
    : rows;
  const r = { last: mine[0]?.id ?? null };
  if (!r.last) return { kind: "start" };
  const granted = (await v3Grants(userId))
    .some((g) => g.product_code === CAMPUS_GRANT_PRODUCT);
  return granted
    ? { kind: "retake", attemptId: r.last }
    : { kind: "result", attemptId: r.last };
}

/** 단추와 그 아래 한 줄. **누르면 일어나는 일 그대로 적는다** */
export const CAMPUS_CTA_KO = {
  start: { label: "검사 시작하기", note: "문항마다 저장되어 창을 닫아도 보던 문항에서 이어집니다." },
  resume: { label: "이어하기", note: "마지막으로 답한 문항에서 이어집니다. 앞에 답한 것은 그대로 남아 있습니다." },
  result: { label: "결과 보기", note: "검사는 한 번 응시합니다. 다시 응시해야 할 사정이 있으면 학과 담당자에게 말씀해 주세요." },
  retake: { label: "다시 검사 시작하기", note: "지난 결과는 지워지지 않고 그대로 남습니다. 새로 응시한 결과는 따로 한 번 더 쌓입니다." },
} as const;
