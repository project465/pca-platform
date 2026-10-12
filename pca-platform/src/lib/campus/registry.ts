/**
 * 학교별 진입 등록부를 읽는 **유일한 자리.**
 *
 * `/campus/pcu` 는 배재대학교 전용 **검사**가 아니다. 학교 학과 이름에서
 * CareerMatri 의 Major Core 로 가는 **길**이고, 그 뒤는 전부 공통이다:
 * 같은 Assessment · 같은 Result · 같은 Experience · 같은 Current State.
 * 그래서 이 파일이 아는 것은 학교 이름과 단과대학과 학과 이름과 그 학과가
 * 어느 Core 로 가는가까지다. **문항도 채점도 결과도 모른다.**
 *
 * **학과 이름을 route 나 component 에 적지 않는다.** 처음에 학과 열 개를
 * 화면에 적어 두면 두 번째 학교를 붙이는 날 그 화면을 베끼게 되고, 베낀
 * 화면 가운데 하나는 반드시 뒤처진다(Major Core 등록부와 같은 까닭이다).
 *
 * **상태를 이 파일이 적지 않는다.** 학생에게 보이는 `검사 가능` 과
 * `준비 중` 은 그 학과가 가리키는 Core 의 **판매 상태**에서 끌어온다.
 * 등록부에 상태를 적어 두면 Core 가 열린 날 이 파일이 옛 상태를 들고
 * 있고, 그러면 `검사 가능` 이라고 적힌 학과에서 빈 검사가 열린다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_DIR, coresForMarket, registry as coreRegistry,
  type CoreEntry,
} from "@/lib/me-v3/core-registry";

/** 학생 화면에 서는 상태. **둘뿐이다** */
export type CampusStatus = "READY" | "PREPARING";

export type CampusDepartment = {
  code: string;
  name: string;
  /** 어느 Major Core 가 맡는가. 아직 정하지 않았으면 `null` 이다 */
  core_code: string | null;
  /** Core 안의 갈래(`SPEC_*`). 없으면 `null` */
  specialization: string | null;
  /**
   * 매핑을 누가 정했는가.
   *
   * `proposed` 는 우리가 학과 이름을 보고 제안한 자리이고, **그 상태로는
   * Core 가 열려도 검사가 열리지 않는다.** 매핑이 틀리면 그 학생이 남의
   * 전공 사전을 읽고 그 결과는 되돌릴 수 없다.
   */
  mapping_source: "owner" | "proposed";
  source: string;
  note?: string;
};

export type CampusCollege = {
  code: string;
  name: string;
  note?: string;
  departments: CampusDepartment[];
};

export type CampusUniversity = {
  university_code: string;
  university_name: string;
  market_code: string;
  entry_note: string;
  /** 학교 로고 파일. **없으면 `null` 이고 그리지 않는다** */
  brand_asset: string | null;
  brand_asset_note?: string;
  /** 먼저 보여 주는 권역. **사용자가 고른 지역을 바꾸지 않는다** */
  region_hint: string | null;
  region_cities: string[];
  region_note?: string;
  source: string;
  source_verified: boolean;
  source_gap?: string;
  colleges: CampusCollege[];
};

export type CampusRegistry = {
  schema_version: string;
  note: string;
  contract: Record<string, unknown>;
  universities: CampusUniversity[];
};

export function campusRegistry(dir = CONTENT_DIR): CampusRegistry {
  return JSON.parse(
    readFileSync(join(dir, "campus-universities.json"), "utf8"),
  ) as CampusRegistry;
}

export function universities(dir = CONTENT_DIR): CampusUniversity[] {
  return campusRegistry(dir).universities;
}

/**
 * 학교 하나. **주소로 넘긴 코드를 그대로 믿지 않는다**: 없으면 `null` 이고
 * 부르는 쪽이 404 를 낸다.
 */
export function university(code: string, dir = CONTENT_DIR): CampusUniversity | null {
  const want = code.trim().toUpperCase();
  return universities(dir).find((u) => u.university_code === want) ?? null;
}

/** 단과대학을 가리지 않고 학과를 줄로 펴서 돌려준다 */
export function departmentsOf(
  u: CampusUniversity,
): { college: CampusCollege; dept: CampusDepartment }[] {
  return u.colleges.flatMap((college) =>
    college.departments.map((dept) => ({ college, dept })));
}

export function findDepartment(
  u: CampusUniversity, deptCode: string,
): { college: CampusCollege; dept: CampusDepartment } | null {
  const want = deptCode.trim().toUpperCase();
  return departmentsOf(u).find((r) => r.dept.code === want) ?? null;
}

/** 그 학과가 가리키는 Core. 등록부에 없으면 `null` */
export function coreOf(dept: CampusDepartment, dir = CONTENT_DIR): CoreEntry | null {
  if (!dept.core_code) return null;
  return coreRegistry(dir).cores.find((c) => c.code === dept.core_code) ?? null;
}

/**
 * 학생에게 보이는 상태.
 *
 * 셋이 다 맞아야 `검사 가능` 이다: Core 가 정해져 있고 · 그 매핑을 학교가
 * 확인했고 · 그 Core 가 이 시장에서 지금 응시할 수 있는 상태다.
 * **안쪽 성숙도를 여기서 읽지 않는다**: 검토 전이라도 팔기로 한 Core 가
 * 있고 검토가 끝났어도 아직 켜지 않은 Core 가 있다.
 */
export function statusOf(
  u: CampusUniversity, dept: CampusDepartment, dir = CONTENT_DIR,
): CampusStatus {
  if (!dept.core_code) return "PREPARING";
  if (dept.mapping_source !== "owner") return "PREPARING";
  const open = coresForMarket(u.market_code, dir)
    .filter((c) => c.status === "building" || c.status === "live")
    .some((c) => c.code === dept.core_code);
  return open ? "READY" : "PREPARING";
}

/** 그 학과의 갈래 이름. 없으면 `null` */
export function specializationName(
  dept: CampusDepartment, dir = CONTENT_DIR,
): string | null {
  if (!dept.specialization) return null;
  const core = coreOf(dept, dir);
  return core?.specializations
    ?.find((s) => s.code === dept.specialization)?.name_ko ?? null;
}

/**
 * 검사·결과 뒤에도 들고 다니는 다섯 칸(규격 §12).
 *
 * **이 값이 채점을 바꾸지 않는다.** 쓰이는 자리는 routing 과 Campus
 * 집계와 학과 보고와 지역 표시뿐이다. 그래서 채점 쪽에 넘기지 않고
 * 응시 줄에만 적는다.
 */
export type CampusContext = {
  university_code: string;
  college_code: string;
  department_code: string;
  core_code: string;
  specialization: string | null;
};

export function contextOf(
  u: CampusUniversity, college: CampusCollege, dept: CampusDepartment,
): CampusContext | null {
  if (!dept.core_code) return null;
  return {
    university_code: u.university_code,
    college_code: college.code,
    department_code: dept.code,
    core_code: dept.core_code,
    specialization: dept.specialization,
  };
}
