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
  allLeaves, facultyOf, retiredCodeOf, university,
} from "@/lib/campus/registry";

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
  const dep = new Map(allLeaves(u).map((r) => {
    const f = facultyOf(u, r.leaf.code);
    return [r.leaf.code, f ? `${f.name} · ${r.leaf.name}` : r.leaf.name];
  }));
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
export function leafChoices(universityCode: string | null): {
  code: string; name: string; college: string;
}[] {
  const u = universityCode ? university(universityCode) : null;
  if (!u) return [];
  const seen = new Set<string>();
  const out: { code: string; name: string; college: string }[] = [];
  for (const r of allLeaves(u)) {
    if (seen.has(r.leaf.code)) continue;
    seen.add(r.leaf.code);
    const f = facultyOf(u, r.leaf.code);
    out.push({
      code: r.leaf.code,
      name: f ? `${f.name} · ${r.leaf.name}` : r.leaf.name,
      college: r.college.code,
    });
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
