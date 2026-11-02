/**
 * 담당자 화면과 내려받는 자료가 **같은 이름을 쓴다.**
 *
 * 집계와 명단이 내놓는 것은 코드이고 사람이 읽는 것은 이름이다. 읽는
 * 자리를 화면마다 두면 어느 날 CSV 의 학과 이름과 화면의 학과 이름이
 * 갈리고, 갈린 그 자료로 담당자가 보고서를 쓴다(설계 원칙 10).
 *
 * **등록부 하나에서 읽는다**(`campus-universities.json`).
 */
import {
  allLeaves, facultyOf, retiredCodeOf, statusOf, university, type CampusUniversity,
} from "@/lib/campus/registry";

/**
 * 학과 코드 → 담당자가 읽는 이름. **이름이 겹치면 교육과정 연도를 붙인다**(2026-11-01
 * 배재대 운영 시험: `간호학과` 가 PCU26_NURSING 과 PCU27_NURSING 두 줄로 나와 고를 수
 * 없었다). 코드는 학년도마다 다른 자리라 하나로 묶지 않는다: 학생 줄에 적힌 코드가
 * 그대로 읽혀야 한다. 겹치지 않는 이름은 그대로 둔다.
 */
function leafLabels(u: CampusUniversity): Map<string, string> {
  const base = new Map<string, { name: string; year: number }>();
  for (const r of allLeaves(u)) {
    if (base.has(r.leaf.code)) continue;
    const f = facultyOf(u, r.leaf.code);
    base.set(r.leaf.code, { name: f ? `${f.name} · ${r.leaf.name}` : r.leaf.name, year: r.catalog.catalog_year });
  }
  const count = new Map<string, number>();
  for (const v of base.values()) count.set(v.name, (count.get(v.name) ?? 0) + 1);
  return new Map([...base].map(([code, v]) =>
    [code, (count.get(v.name) ?? 0) > 1 ? `${v.name} (${v.year} 교육과정)` : v.name]));
}

export type CampusNames = {
  college: (code: string) => string;
  dept: (code: string) => string;
};

export function campusNames(universityCode: string | null): CampusNames {
  const u = universityCode ? university(universityCode) : null;
  if (!u) return { college: (k) => k, dept: (k) => k };
  /* **Catalog 를 가로질러 읽는다.** 응시 줄에 적힌 코드가 어느 해 구조의
     자리인지는 코드 앞머리가 들고 있고, 담당자가 보는 것은 이름이다 */
  const col = new Map(u.catalogs.flatMap((c) =>
    c.colleges.map((x) => [x.code, x.name] as [string, string])));
  /* **학부가 있으면 함께 적는다**(규격 §12). 같은 이름의 전공이 다른
     학부에 설 수 있고, 집계에서 그 둘이 한 줄로 보이면 안 된다 */
  const dep = leafLabels(u);
  return {
    college: (k: string) => col.get(k) ?? k,
    /* **내려놓은 코드를 학과 이름으로 읽지 않는다.** 그 코드가 무엇이었는지
       를 적는다: 날것으로 찍히면 읽는 사람이 등록부가 깨진 줄로 본다 */
    dept: (k: string) => {
      if (!k) return "(고르지 않음)";
      const live = dep.get(k);
      if (live) return live;
      const gone = retiredCodeOf(u, k);
      return gone ? `${gone.was} (지난 등록부 항목)` : k;
    },
  };
}

/**
 * 고르는 자리 목록. 화면의 학과 select 와 CSV 가 같은 목록을 쓴다.
 *
 * **지난 코드는 넣지 않는다**: 고르는 칸에 내려놓은 자리를 세우면 담당자가
 * 지금 없는 학과로 좁혀 보고 빈 표를 받는다.
 */
export function leafChoices(universityCode: string | null, opts?: {
  /**
   * 이 학년도까지의 교육과정만(학생을 새로 넣는 자리). 아직 오지 않은 학년도(예: 2026년에 2027 교육과정)의
   * 학과로 지금 학생을 넣지 않게 한다(2026-11-02 운영 시험: "경영학과 (2027 교육과정)" 학생이 생겼다).
   * 거르는 자리(명단 · 집계 조건)는 이미 넣은 학생을 찾아야 하므로 모두 보인다
   */
  uptoYear?: number;
}): {
  code: string; name: string; college: string;
  /** 지금 학생이 응시할 수 있는 학과인가(`statusOf`). 담당자 화면이 아니면 경고를 단다 */
  ready: boolean;
}[] {
  const u = universityCode ? university(universityCode) : null;
  if (!u) return [];
  const seen = new Set<string>();
  const label = leafLabels(u);
  const out: { code: string; name: string; college: string; ready: boolean }[] = [];
  for (const r of allLeaves(u)) {
    if (seen.has(r.leaf.code)) continue;
    if (opts?.uptoYear && r.catalog.catalog_year > opts.uptoYear) continue;
    seen.add(r.leaf.code);
    out.push({ code: r.leaf.code, name: label.get(r.leaf.code) ?? r.leaf.name, college: r.college.code, ready: statusOf(u, r) === "READY" });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** 단과대학 고르는 자리 */
export function collegeChoices(universityCode: string | null): {
  code: string; name: string;
}[] {
  const u = universityCode ? university(universityCode) : null;
  if (!u) return [];
  const seen = new Map<string, string>();
  for (const c of u.catalogs) {
    for (const x of c.colleges) if (!seen.has(x.code)) seen.set(x.code, x.name);
  }
  return [...seen].map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
