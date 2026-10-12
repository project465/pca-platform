/**
 * 학교별 진입 등록부를 읽는 **유일한 자리.**
 *
 * `/campus/{학교}` 는 전용 검사가 아니다. 학교 학과 이름에서 CareerMatri
 * 의 Major Core 로 가는 **길**이고, 그 뒤는 전부 공통이다: 같은
 * Assessment · 같은 Result · 같은 Experience · 같은 Current State.
 *
 * **학교 학과 수만큼 Core 를 만들지 않는다.** 학교 이름은 여기 있고
 * 전공을 재는 자는 Major Core 등록부에 있다. 학교가 학과를 쪼개거나
 * 합쳐도 자는 그대로여야, 그 학교 학생과 다른 학교 학생의 결과를 견줄 수
 * 있다.
 *
 * **학과 이름을 route 나 component 에 적지 않는다.** 적어 두면 두 번째
 * 학교를 붙이는 날 그 화면을 베끼게 되고, 베낀 화면 가운데 하나는 반드시
 * 뒤처진다.
 *
 * **상태를 이 파일이 적지 않는다.** 매핑 단계도 학생이 보는 상태도 전부
 * 끌어온다. 적어 두면 Core 가 열린 날 등록부가 옛 상태를 들고 있고,
 * 둘이 갈리면 `검사 가능` 이라고 적힌 학과에서 빈 검사가 열린다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_DIR, coresForMarket, registry as coreRegistry,
  specializationAuthored, specializationOf, type CoreEntry,
} from "@/lib/me-v3/core-registry";

/** 학생 화면에 서는 상태. **둘뿐이다** */
export type CampusStatus = "READY" | "PREPARING";

/**
 * 안쪽 매핑 단계. **학생 화면에 이 글자가 나가지 않는다.**
 *
 * `EXACT`                     그 자리를 맡는 Core 가 있고 갈래가 더 필요 없다
 * `SPECIALIZATION_REQUIRED`   Core 는 있는데 그 학과가 읽을 갈래가 아직 없다
 * `CORE_REQUIRED`             그 자리를 맡는 Core 가 아직 없다
 */
export type MappingStatus =
  | "EXACT" | "SPECIALIZATION_REQUIRED" | "CORE_REQUIRED";

/** 학과이거나, 학부 아래의 전공이나 트랙 */
export type CampusUnit = {
  code: string;
  name: string;
  kind: "department" | "faculty" | "major" | "track";
  core_code?: string | null;
  specialization?: string | null;
  /** 갈래가 필요한데 아직 코드도 없는 자리 */
  specialization_required?: boolean;
  /** 전공을 고르는 자리. **Core 를 만들지 않는다** */
  routing_only?: boolean;
  /** 전공 목록을 아직 확인하지 못했다 */
  unverified_majors?: boolean;
  /** 일반 학부생이 고를 자리가 아니면 `false`. 적지 않으면 보인다 */
  student_visible?: boolean;
  note?: string;
  /** 학부면 그 아래의 전공이나 트랙 */
  majors?: CampusUnit[];
};

export type CampusCollege = {
  code: string; name: string; note?: string; units: CampusUnit[];
};

export type CampusUniversity = {
  university_code: string;
  university_name: string;
  market_code: string;
  entry_note: string;
  brand_asset: string | null;
  brand_asset_note?: string;
  /** 어느 쪽의 어느 해 구조인가 */
  source_url: string;
  source_year: number;
  /** 언제 그 쪽과 맞춰 봤는가. **확인하지 못했으면 비운다** */
  verified_at: string | null;
  verification: "VERIFIED" | "OFFICIAL_PAGE_UNREACHABLE" | "OWNER_DICTATED";
  verification_note?: string;
  open_questions?: string[];
  region_hint: string | null;
  region_cities: string[];
  region_note?: string;
  /** 먼저 만들 학과. 차례가 곧 만드는 차례다 */
  wave1?: string[];
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

/**
 * 고를 수 있는 자리 하나.
 *
 * 학부만 있고 전공이 없으면 그 학부가 고르는 자리이고, 전공이 있으면
 * **전공이 고르는 자리**다. 학부를 고르게 두면 그 학생이 어느 전공으로
 * 재어졌는지 아무도 모른다.
 */
export type CampusLeaf = {
  college: CampusCollege;
  /** 그 자리의 학부. 학과면 자기 자신이다 */
  unit: CampusUnit;
  leaf: CampusUnit;
};

export function leavesOf(u: CampusUniversity): CampusLeaf[] {
  return u.colleges.flatMap((college) =>
    college.units.flatMap((unit) =>
      (unit.majors?.length ? unit.majors : [unit])
        .map((leaf) => ({ college, unit, leaf }))));
}

export function findLeaf(u: CampusUniversity, code: string): CampusLeaf | null {
  const want = code.trim().toUpperCase();
  return leavesOf(u).find((r) => r.leaf.code === want) ?? null;
}

/** 그 자리가 가리키는 Core. 등록부에 없으면 `null` */
export function coreOf(leaf: CampusUnit, dir = CONTENT_DIR): CoreEntry | null {
  if (!leaf.core_code) return null;
  return coreRegistry(dir).cores.find((c) => c.code === leaf.core_code) ?? null;
}

/**
 * 매핑이 어디까지 왔는가. **적어 두지 않고 끌어온다.**
 *
 * 적어 두면 갈래를 쓴 날 이 파일을 같이 고쳐야 하고, 안 고치면 **작성된
 * 갈래를 가리키며 아직 필요하다고 적는다.**
 */
export function mappingStatusOf(
  leaf: CampusUnit, dir = CONTENT_DIR,
): MappingStatus {
  if (leaf.routing_only) return "CORE_REQUIRED";
  if (!leaf.core_code) return "CORE_REQUIRED";
  if (!coreOf(leaf, dir)) return "CORE_REQUIRED";
  if (leaf.specialization_required) return "SPECIALIZATION_REQUIRED";
  if (!leaf.specialization) return "EXACT";
  return specializationAuthored(leaf.core_code, leaf.specialization, dir)
    ? "EXACT" : "SPECIALIZATION_REQUIRED";
}

/**
 * 학생에게 보이는 상태.
 *
 * 넷이 다 맞아야 `검사 가능` 이다: 매핑이 `EXACT` 이고 · 학생이 고를
 * 자리이고 · 전공을 고르는 자리가 아니고 · 그 Core 가 이 시장에서 지금
 * 응시할 수 있다.
 *
 * **매핑이 섰다는 것과 문항이 써졌다는 것은 다른 일이다.** 앞엣것만 보고
 * 열면 그 학생이 빈 검사를 만난다.
 */
export function statusOf(
  u: CampusUniversity, leaf: CampusUnit, dir = CONTENT_DIR,
): CampusStatus {
  if (leaf.student_visible === false) return "PREPARING";
  if (leaf.routing_only) return "PREPARING";
  if (mappingStatusOf(leaf, dir) !== "EXACT") return "PREPARING";
  const open = coresForMarket(u.market_code, dir)
    .filter((c) => c.status === "building" || c.status === "live")
    .some((c) => c.code === leaf.core_code);
  return open ? "READY" : "PREPARING";
}

/** 학생 화면에 세우는 자리인가 */
export function visible(leaf: CampusUnit): boolean {
  return leaf.student_visible !== false;
}

/** 그 자리의 갈래 이름. 없으면 `null` */
export function specializationName(
  leaf: CampusUnit, dir = CONTENT_DIR,
): string | null {
  if (!leaf.core_code || !leaf.specialization) return null;
  return specializationOf(leaf.core_code, leaf.specialization, dir)?.name_ko ?? null;
}

/**
 * 검사·결과 뒤에도 들고 다니는 다섯 칸(규격 §12).
 *
 * **이 값이 채점을 바꾸지 않는다.** 쓰이는 자리는 routing 과 Campus
 * 집계와 학과 보고와 지역 표시뿐이다.
 *
 * **학부를 따로 담지 않는다.** `department_code` 가 고르는 자리의 코드이고,
 * 그 위의 학부는 등록부가 안다(`facultyOf`). 칸을 하나 더 두면 학교가
 * 학부를 바꾸는 날 이미 적힌 줄이 틀려진다.
 */
export type CampusContext = {
  university_code: string;
  college_code: string;
  department_code: string;
  core_code: string;
  specialization: string | null;
};

export function contextOf(u: CampusUniversity, found: CampusLeaf): CampusContext | null {
  if (!found.leaf.core_code) return null;
  return {
    university_code: u.university_code,
    college_code: found.college.code,
    department_code: found.leaf.code,
    core_code: found.leaf.core_code,
    specialization: found.leaf.specialization ?? null,
  };
}

/**
 * 그 자리가 속한 학부. 학과면 `null`.
 *
 * 집계가 `단과대학 → 학부 → 전공` 으로 굴러갈 수 있는 것이 이 함수
 * 하나다. **DB 에 칸을 더하지 않는다**: 적힌 줄은 고르는 자리의 코드이고,
 * 그 위는 등록부가 언제든 다시 읽는다.
 */
export function facultyOf(u: CampusUniversity, leafCode: string): CampusUnit | null {
  const found = findLeaf(u, leafCode);
  if (!found) return null;
  return found.unit.code === found.leaf.code ? null : found.unit;
}

/** 먼저 만들기로 한 학과. 차례가 곧 만드는 차례다 */
export function wave1Of(u: CampusUniversity): CampusLeaf[] {
  return (u.wave1 ?? [])
    .map((c) => findLeaf(u, c))
    .filter((r): r is CampusLeaf => r !== null);
}
