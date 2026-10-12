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
 * **학과 구조를 한 시점의 목록으로 덮어쓰지 않는다.** 공식 자료 두 벌이
 * 서로 다른 구조를 적고 있으면 그것은 오류가 아니고 **개편 시점이 다른
 * Catalog** 다. 덮어쓰면 덮어쓴 그날부터 한쪽 학생이 자기 학과를 찾지
 * 못하고, 찾지 못한 그 사람은 이 학교가 들어 있지 않은 줄로 읽는다.
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

/**
 * Catalog 가 지금 어느 때인가. **학생 화면에 이 글자가 나가지 않는다.**
 *
 * `ACTIVE`   지금 재학생이 쓰는 구조
 * `FUTURE`   아직 시작하지 않은 구조
 * `RETIRED`  끝난 구조. 고르는 자리로 서지 않는다
 */
export type CatalogStatus = "ACTIVE" | "FUTURE" | "RETIRED";

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
  /** 그 Catalog 의 공식 자료에서 따로 확인하지 못하고 앞 Catalog 에서 옮겼다 */
  carried_over?: boolean;
  /** 앞 Catalog 의 어느 자리를 이어받았는가. 코드로 적는다 */
  replaces?: string[];
  note?: string;
  /** 학부면 그 아래의 전공이나 트랙 */
  majors?: CampusUnit[];
  /* ── 아래 여섯은 그 자리가 Catalog 의 기본값과 다를 때만 적는다 ── */
  catalog_year?: number;
  effective_from?: string;
  effective_to?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
  status?: CatalogStatus;
};

export type CampusCollege = {
  code: string; name: string; note?: string; units: CampusUnit[];
};

/** 학년도별 학과 구조 한 벌 */
export type CampusCatalog = {
  catalog_code: string;
  catalog_year: number;
  /** 학생이 읽는 이름. `현재 재학생` 처럼 적는다 */
  label: string;
  status: CatalogStatus;
  effective_from: string;
  effective_to: string | null;
  effective_note?: string;
  /** 어느 쪽에서 읽었는가. 주소를 받지 못했으면 `null` 이고 이름을 적는다 */
  source_url: string | null;
  source_name: string;
  /** 언제 그 쪽과 맞춰 봤는가. **확인하지 못했으면 비운다** */
  verified_at: string | null;
  verification: "VERIFIED" | "OFFICIAL_PAGE_UNREACHABLE" | "OWNER_DICTATED";
  verification_note?: string;
  colleges: CampusCollege[];
};

export type CampusUniversity = {
  university_code: string;
  university_name: string;
  market_code: string;
  entry_note: string;
  brand_asset: string | null;
  brand_asset_note?: string;
  open_questions?: string[];
  region_hint: string | null;
  region_cities: string[];
  region_note?: string;
  /** 먼저 만들 **Core**. 차례가 곧 만드는 차례다 */
  wave1?: string[];
  wave1_note?: string;
  catalogs: CampusCatalog[];
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

/* ── Catalog ─────────────────────────────────────────────────────── */

export function catalogsOf(u: CampusUniversity): CampusCatalog[] {
  return u.catalogs ?? [];
}

export function catalogByCode(
  u: CampusUniversity, code: string,
): CampusCatalog | null {
  return catalogsOf(u).find((c) => c.catalog_code === code) ?? null;
}

export function catalogByYear(
  u: CampusUniversity, year: number,
): CampusCatalog | null {
  return catalogsOf(u).find((c) => c.catalog_year === year) ?? null;
}

const yearOf = (d: string): number => Number(d.slice(0, 4));

/**
 * 유효기간으로 끌어낸 상태.
 *
 * 적어 둔 `status` 와 이 값이 어긋나면 `campus:check` 가 걸린다.
 * **적어 둔 값만 믿지 않는 까닭**은 해가 바뀌면 그 글자가 조용히
 * 틀려지기 때문이다: 2027 이 시작되는 날 `FUTURE` 라고 적힌 줄은 거짓이
 * 되고, 거짓이 된 것을 아무도 모른다.
 */
export function catalogStatusAt(
  cat: CampusCatalog, today = new Date(),
): CatalogStatus {
  const now = today.toISOString().slice(0, 10);
  if (cat.effective_from > now) return "FUTURE";
  if (cat.effective_to && cat.effective_to < now) return "RETIRED";
  return "ACTIVE";
}

/**
 * 기본으로 서는 Catalog. **지금 재학생 구조다**(규격 §2).
 *
 * 쓰는 사람이 압도적으로 재학생이라, 모르면 그쪽이다. 아직 시작하지 않은
 * 구조를 기본으로 두면 지금 다니는 학생이 자기 학과를 못 찾는다.
 */
export function defaultCatalog(u: CampusUniversity): CampusCatalog {
  const cats = catalogsOf(u);
  const active = cats.filter((c) => c.status === "ACTIVE")
    .sort((a, b) => b.catalog_year - a.catalog_year);
  if (active.length) return active[0];
  const future = cats.filter((c) => c.status === "FUTURE")
    .sort((a, b) => a.catalog_year - b.catalog_year);
  return future[0] ?? cats[0];
}

/**
 * 이 사람에게 맞는 Catalog(규격 §4).
 *
 * **고르는 걸음을 하나 더 만들지 않는다.** 들고 있는 값으로 판별되면 그대로
 * 쓰고, 모르면 재학생 구조로 간다. 학생에게 묻는 것은 `현재 소속 학과` 하나다.
 *
 *   `year`          주소로 넘어온 학년도. 학과를 못 찾은 사람이 쓰는 되돌림
 *   `admissionYear` 시스템이 이미 들고 있는 입학년도(기수 시작일)
 */
export function resolveCatalog(
  u: CampusUniversity,
  hint: { year?: number | null; admissionYear?: number | null } = {},
): CampusCatalog {
  if (hint.year) {
    const asked = catalogByYear(u, hint.year);
    if (asked) return asked;
  }
  if (hint.admissionYear) {
    const y = hint.admissionYear;
    /* 입학년도가 그 Catalog 의 유효 구간에 드는 것 가운데 가장 늦은 해 */
    const fit = catalogsOf(u)
      .filter((c) => yearOf(c.effective_from) <= y
        && (!c.effective_to || y <= yearOf(c.effective_to)))
      .sort((a, b) => b.catalog_year - a.catalog_year);
    if (fit.length) return fit[0];
  }
  return defaultCatalog(u);
}

/**
 * 고르는 자리마다 서는 여섯 칸(규격 §1).
 *
 * **자리마다 여섯 줄을 베껴 두지 않는다.** Catalog 가 기본값을 들고 그
 * 자리가 다를 때만 자리에 적는다. 베껴 두면 Catalog 를 고친 날 아흔 줄
 * 가운데 몇이 옛 값으로 남고, 남은 그 줄이 틀렸다는 것을 아무도 모른다.
 */
export type CampusProvenance = {
  catalog_code: string;
  catalog_year: number;
  label: string;
  effective_from: string;
  effective_to: string | null;
  status: CatalogStatus;
  source_url: string | null;
  source_name: string;
  verified_at: string | null;
  verification: CampusCatalog["verification"];
  /** 그 Catalog 에서 확인하지 못하고 앞 Catalog 에서 옮긴 자리인가 */
  carried_over: boolean;
};

export function provenanceOf(
  cat: CampusCatalog, leaf: CampusUnit,
): CampusProvenance {
  return {
    catalog_code: cat.catalog_code,
    catalog_year: leaf.catalog_year ?? cat.catalog_year,
    label: cat.label,
    effective_from: leaf.effective_from ?? cat.effective_from,
    effective_to: leaf.effective_to ?? cat.effective_to,
    status: leaf.status ?? cat.status,
    source_url: leaf.source_url ?? cat.source_url,
    source_name: cat.source_name,
    verified_at: leaf.verified_at ?? cat.verified_at,
    verification: cat.verification,
    carried_over: leaf.carried_over === true,
  };
}

/* ── 고르는 자리 ─────────────────────────────────────────────────── */

/**
 * 고를 수 있는 자리 하나.
 *
 * 학부만 있고 전공이 없으면 그 학부가 고르는 자리이고, 전공이 있으면
 * **전공이 고르는 자리**다. 학부를 고르게 두면 그 학생이 어느 전공으로
 * 재어졌는지 아무도 모른다.
 */
export type CampusLeaf = {
  catalog: CampusCatalog;
  college: CampusCollege;
  /** 그 자리의 학부. 학과면 자기 자신이다 */
  unit: CampusUnit;
  leaf: CampusUnit;
};

export function leavesOf(cat: CampusCatalog): CampusLeaf[] {
  return cat.colleges.flatMap((college) =>
    college.units.flatMap((unit) =>
      (unit.majors?.length ? unit.majors : [unit])
        .map((leaf) => ({ catalog: cat, college, unit, leaf }))));
}

/** 학교의 모든 Catalog 를 걸친 자리. **집계와 이름 되읽기가 쓴다** */
export function allLeaves(u: CampusUniversity): CampusLeaf[] {
  return catalogsOf(u).flatMap(leavesOf);
}

/**
 * 코드 하나로 자리를 찾는다. **Catalog 를 가로질러 찾는다.**
 *
 * 코드 앞머리가 학년도를 들고 있어서(`PCU26_` · `PCU27_`) 코드 하나로 어느
 * Catalog 의 자리인지가 그대로 나온다. 그래서 응시 줄에 적힌
 * `department_code` 를 다시 읽을 때 **DB 에 Catalog 칸이 필요하지 않다.**
 */
export function findLeaf(u: CampusUniversity, code: string): CampusLeaf | null {
  const want = code.trim().toUpperCase();
  return allLeaves(u).find((r) => r.leaf.code === want) ?? null;
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
 * 다섯이 다 맞아야 `검사 가능` 이다: 끝난 Catalog 가 아니고 · 매핑이
 * `EXACT` 이고 · 학생이 고를 자리이고 · 전공을 고르는 자리가 아니고 ·
 * 그 Core 가 이 시장에서 지금 응시할 수 있다.
 *
 * **매핑이 섰다는 것과 문항이 써졌다는 것은 다른 일이다.** 앞엣것만 보고
 * 열면 그 학생이 빈 검사를 만난다.
 *
 * **아직 시작하지 않은 Catalog 는 막지 않는다.** 2027 구조로 들어온
 * 사람에게 `아직 때가 아니다` 를 내놓으면 그 사람이 할 수 있는 일이 없고,
 * 재는 자는 Catalog 가 아니라 Core 가 들고 있어 결과가 달라지지도 않는다.
 */
export function statusOf(
  u: CampusUniversity, row: CampusLeaf, dir = CONTENT_DIR,
): CampusStatus {
  const prov = provenanceOf(row.catalog, row.leaf);
  if (prov.status === "RETIRED") return "PREPARING";
  if (row.leaf.student_visible === false) return "PREPARING";
  if (row.leaf.routing_only) return "PREPARING";
  if (mappingStatusOf(row.leaf, dir) !== "EXACT") return "PREPARING";
  const open = coresForMarket(u.market_code, dir)
    .filter((c) => c.status === "building" || c.status === "live")
    .some((c) => c.code === row.leaf.core_code);
  return open ? "READY" : "PREPARING";
}

/** 학생 화면에 세우는 자리인가 */
export function visible(leaf: CampusUnit): boolean {
  return leaf.student_visible !== false;
}

/**
 * 학생 목록에 칸으로 서는 자리인가.
 *
 * 끝난 구조의 자리와 감춘 자리는 서지 않는다. **판단을 화면이 하지
 * 않는다**: Catalog 상태 글자를 화면이 들면 그 글자가 손님 화면으로
 * 새는 길이 생기고, 같은 판단이 쪽마다 복사된다.
 */
export function offered(row: CampusLeaf): boolean {
  return provenanceOf(row.catalog, row.leaf).status !== "RETIRED"
    && visible(row.leaf);
}

/**
 * 이 Catalog 말고 학생이 되돌려 볼 수 있는 Catalog.
 *
 * 끝난 구조는 내놓지 않는다: 고를 사람이 없다.
 */
export function otherCatalogs(
  u: CampusUniversity, cat: CampusCatalog,
): CampusCatalog[] {
  return catalogsOf(u).filter((c) =>
    c.catalog_code !== cat.catalog_code && c.status !== "RETIRED");
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
 * **학부와 Catalog 를 따로 담지 않는다.** `department_code` 가 고르는
 * 자리의 코드이고, 그 위의 학부와 어느 해 구조인지는 등록부가 안다
 * (`facultyOf` · `findLeaf`). 칸을 더 두면 학교가 학부를 바꾸는 날 이미
 * 적힌 줄이 틀려지고, DB 를 고치는 일이 한 번 더 늘어난다.
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

/**
 * 그 자리가 이어받은 앞 Catalog 의 자리들(규격 §5).
 *
 * 학과 이름이 개편돼도 **같은 Core 를 다시 쓴다.** 어느 자리가 어느 자리를
 * 이어받았는지가 적혀 있어야, 앞 학번과 뒤 학번의 결과를 한 자 위에
 * 놓을 수 있다.
 */
export function replacesOf(u: CampusUniversity, leaf: CampusUnit): CampusLeaf[] {
  return (leaf.replaces ?? [])
    .map((c) => findLeaf(u, c))
    .filter((r): r is CampusLeaf => r !== null);
}

/**
 * 먼저 만들기로 한 **Core** 와 그 Core 가 여는 자리들.
 *
 * **학과 이름으로 적지 않는다**(규격 §8). 현행과 2027 의 이름이 달라도
 * 같은 Core 를 다시 쓰므로, `EE_CORE_V1` 하나를 쓰면 전기공학과와
 * 전기전자공학과와 AI융합전자전공이 함께 열린다.
 */
export type Wave1Row = {
  core_code: string;
  core: CoreEntry | null;
  leaves: CampusLeaf[];
};

export function wave1Of(u: CampusUniversity, dir = CONTENT_DIR): Wave1Row[] {
  const cores = coreRegistry(dir).cores;
  const rows = allLeaves(u);
  return (u.wave1 ?? []).map((code) => ({
    core_code: code,
    core: cores.find((c) => c.code === code) ?? null,
    leaves: rows.filter((r) => r.leaf.core_code === code),
  }));
}
