/**
 * 학교 전용 진입이 **전용 제품이 되지 않았는가.**
 *
 * `/campus/{학교}` 가 하는 일은 하나다: 학교 학과 이름에서 CareerMatri 의
 * Major Core 로 가는 길을 여는 것. 그 뒤는 전부 공통이다. 그래서 이 검사가
 * 묻는 것은 `화면이 예쁜가` 가 아니라 **그 경계가 지켜지는가**다.
 *
 * 세는 것 일곱 묶음.
 *
 *   ① 등록부가 성립하는가      코드 중복 0 · 빈 칸 0 · 주소에 쓸 수 있는 코드
 *   ② Catalog 가 성립하는가     유효기간과 적어 둔 상태가 맞고 출처가 적혀 있다
 *   ③ Catalog 가 섞이지 않는가  코드 하나로 어느 해 구조인지 갈리고 이어받음이 닿는다
 *   ④ 매핑이 실제로 닿는가      Core 와 갈래가 등록부에 있고 단계가 셋뿐이다
 *   ⑤ 상태가 둘뿐인가          학생 화면에 안쪽 단계가 한 글자도 안 나간다
 *   ⑥ 학과 이름이 코드에 없는가  route 와 component 에 0건 · 쓰는 class 는 CSS 에 있다
 *   ⑦ 경계가 지켜지는가        채점에 안 들어가고 B2C 흐름과 섞이지 않는다
 *
 * **문구는 여기서 세지 않는다.** AI 티와 금지한 말은 `npm run v3:copy` 가
 * 세고, 그 목록에 학교 쪽 파일이 들어 있다. 같은 판정을 두 곳에서 하면
 * 어느 날 갈리고, 갈린 날 둘 다 못 믿는다.
 *
 *   npm run campus:check
 */
import { readFileSync } from "node:fs";
import { registry as coreRegistry } from "../src/lib/me-v3/core-registry";
import {
  allLeaves, campusRegistry, catalogStatusAt, catalogsOf, defaultCatalog,
  leavesOf, mappingStatusOf, provenanceOf, readinessOf, replacesOf,
  resolveCatalog, retiredCodeOf, statusOf, visible, wave1Of,
  type CampusUnit, type CampusUniversity, coreOf,
} from "../src/lib/campus/registry";
import { academicYear, admissionFrom } from "../src/lib/campus/year";

/**
 * **이 검사가 보는 것은 운영 등록부다.**
 *
 * 길을 밟아 보는 검사는 확인용 학교 fixture 를 들고 돈다
 * (`V3_CAMPUS_FIXTURE`). 그 값이 환경에 남아 있으면 여기가 확인용 학교까지
 * 세고, **지어낸 학교의 출처가 비어 있다**는 까닭으로 멀쩡한 등록부가
 * 걸린다. 재는 것이 다르므로 그 문을 닫고 본다.
 */
delete process.env.V3_CAMPUS_FIXTURE;

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

const read = (f: string): string => {
  try { return readFileSync(f, "utf8"); } catch { return ""; }
};

/** 주석을 걷어 낸다. **왜 그렇게 썼는지 적어 둔 글까지 세면** 기록을 지우게 된다 */
const body = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

/** 학교 쪽 화면과 길. 여기 없는 파일을 더하면 이 검사가 모른다 */
const SCREENS = [
  "src/app/campus/shell.tsx",
  "src/app/campus/actions.ts",
  "src/app/campus/campus.css",
  "src/app/campus/[universityCode]/page.tsx",
  "src/app/campus/[universityCode]/majors/page.tsx",
  "src/app/campus/[universityCode]/d/[department]/page.tsx",
];
const TSX = SCREENS.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

console.log("학교 전용 진입 — 학년도별 Catalog 와 경계\n");

const reg = campusRegistry();
const cores = coreRegistry().cores;
const unis = reg.universities;

/** 그 코드로 지금 서 있는 자리가 있는가 */
const findLeafSafe = (u: CampusUniversity, code: string) =>
  allLeaves(u).some((r) => r.leaf.code === code);

/** 그 학교의 모든 고르는 자리와 학부 코드 */
const codesOf = (u: CampusUniversity): string[] =>
  catalogsOf(u).flatMap((c) => c.colleges.flatMap((col) =>
    col.units.flatMap((x) => [x.code, ...(x.majors ?? []).map((m) => m.code)])));

/* ── ① 등록부가 성립하는가 ─────────────────────────────────────── */

ok("등록부가 학교를 적어도 하나 들고 있다", unis.length > 0);
ok("학교 코드가 겹치지 않는다",
  new Set(unis.map((u) => u.university_code)).size === unis.length);

{
  const noCat: string[] = [];
  const dupCollege: string[] = [];
  const dupCode: string[] = [];
  const badCode: string[] = [];
  const blank: string[] = [];
  const badKind: string[] = [];
  for (const u of unis) {
    if (!catalogsOf(u).length) noCat.push(u.university_code);
    /* 단과대학 코드는 **Catalog 안에서** 겹치지 않는다. Catalog 사이에는
       같은 코드가 서는 것이 맞다: 같은 단과대학이기 때문이다 */
    for (const c of catalogsOf(u)) {
      const cs = c.colleges.map((x) => x.code);
      if (new Set(cs).size !== cs.length) {
        dupCollege.push(`${u.university_code}/${c.catalog_code}`);
      }
    }
    /* 학부 코드와 고르는 자리의 코드는 **학교 하나에 한 이름 공간**이다.
       겹치면 주소 하나가 두 자리를 가리키고, 응시 줄에 적힌 코드로 어느
       해 구조인지 되읽을 수 없다 */
    const all = codesOf(u);
    const dups = all.filter((c, i) => all.indexOf(c) !== i);
    if (dups.length) dupCode.push(`${u.university_code}: ${[...new Set(dups)].join(" ")}`);
    for (const c of all) if (!/^[A-Z0-9_]+$/.test(c)) badCode.push(c);
    if (!u.university_name.trim()) blank.push(u.university_code);
    for (const cat of catalogsOf(u)) for (const col of cat.colleges) {
      if (!col.name.trim()) blank.push(`${cat.catalog_code}/${col.code}`);
      for (const x of col.units) {
        if (!x.name.trim()) blank.push(x.code);
        if (!["department", "faculty"].includes(x.kind)) badKind.push(x.code);
        for (const m of x.majors ?? []) {
          if (!m.name.trim()) blank.push(m.code);
          if (!["major", "track"].includes(m.kind)) badKind.push(m.code);
        }
      }
    }
  }
  ok("학교마다 Catalog 가 적어도 하나 있다", !noCat.length, noCat.join(" "));
  ok("한 Catalog 안에서 단과대학 코드가 겹치지 않는다", !dupCollege.length,
    dupCollege.join(" "));
  ok("학부와 전공 코드가 한 학교 안에서 겹치지 않는다", !dupCode.length,
    dupCode.join(" "));
  ok("코드를 주소에 그대로 쓸 수 있다", !badCode.length, badCode.join(" "));
  ok("이름에 빈 칸이 없다", !blank.length, blank.join(" "));
  /* 학부 아래에 학부를 두지 않는다. 두면 고르는 자리가 어디인지 흐려진다 */
  ok("계층이 넷을 넘지 않는다 — Catalog · 단과대학 · 학부와 학과 · 전공과 트랙",
    !badKind.length, badKind.join(" "));
}

/* ── ② Catalog 가 성립하는가 ──────────────────────────────────── */

{
  const dupCat: string[] = [];
  const dupYear: string[] = [];
  const badSrc: string[] = [];
  const lying: string[] = [];
  const silent: string[] = [];
  const badSpan: string[] = [];
  const drifted: string[] = [];
  const noLabel: string[] = [];
  const manyActive: string[] = [];
  for (const u of unis) {
    const cats = catalogsOf(u);
    if (new Set(cats.map((c) => c.catalog_code)).size !== cats.length) {
      dupCat.push(u.university_code);
    }
    if (new Set(cats.map((c) => c.catalog_year)).size !== cats.length) {
      dupYear.push(u.university_code);
    }
    /* **기본으로 설 Catalog 가 하나여야 한다.** 둘이면 어느 쪽이 서는지가
       정렬에 달리고, 그 자리는 학생이 가장 먼저 보는 목록이다 */
    if (cats.filter((c) => c.status === "ACTIVE").length > 1) {
      manyActive.push(u.university_code);
    }
    for (const c of cats) {
      const where = `${u.university_code}/${c.catalog_code}`;
      /* **주소를 받지 못했으면 `null` 이고 이름을 적는다.** 그럴듯한
         주소를 지어 넣으면 다음 사람이 그리로 가서 아무것도 못 본다 */
      const srcOk = c.source_url
        ? c.source_url.startsWith("http")
        : Boolean(c.source_name?.trim()) && c.verification !== "VERIFIED";
      if (!srcOk || !c.source_name?.trim()
        || !["VERIFIED", "OFFICIAL_PAGE_UNREACHABLE", "OWNER_DICTATED",
          "SECONDARY_EVIDENCE"].includes(c.verification)) badSrc.push(where);
      /* **확인하지 못한 것을 확인했다고 적지 않는다** */
      if (c.verification === "VERIFIED" ? !c.verified_at : Boolean(c.verified_at)) {
        lying.push(where);
      }
      if (c.verification !== "VERIFIED" && !c.verification_note?.trim()) {
        silent.push(where);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.effective_from)
        || (c.effective_to && !/^\d{4}-\d{2}-\d{2}$/.test(c.effective_to))
        || (c.effective_to && c.effective_to < c.effective_from)) {
        badSpan.push(where);
      }
      /* **적어 둔 상태가 유효기간과 어긋나면 걸린다.** 해가 바뀌면 그
         글자가 조용히 틀려지고, 틀려진 것을 아무도 모른다 */
      if (catalogStatusAt(c) !== c.status) {
        drifted.push(`${where}: ${c.status} ≠ ${catalogStatusAt(c)}`);
      }
      /* 학생이 읽는 이름이다. 영문 코드를 적어 두면 그대로 화면에 선다 */
      if (!c.label?.trim() || /^[A-Z0-9_]+$/.test(c.label)) noLabel.push(where);
    }
  }
  ok("Catalog 코드가 겹치지 않는다", !dupCat.length, dupCat.join(" "));
  ok("한 학교에 같은 학년도 Catalog 가 둘 있지 않다", !dupYear.length,
    dupYear.join(" "));
  ok("기본으로 설 Catalog 가 하나다", !manyActive.length, manyActive.join(" "));
  ok("Catalog 마다 출처와 확인 상태가 적혀 있다", !badSrc.length, badSrc.join(" "));
  ok("확인 날짜와 확인 상태가 서로 맞는다", !lying.length, lying.join(" "));
  ok("확인하지 못한 까닭이 적혀 있다", !silent.length, silent.join(" "));
  ok("유효기간이 날짜 꼴이고 앞뒤가 맞는다", !badSpan.length, badSpan.join(" "));
  ok("적어 둔 Catalog 상태가 유효기간에서 끌어낸 값과 같다", !drifted.length,
    drifted.join(" · "));
  ok("Catalog 이름이 학생이 읽는 말이다", !noLabel.length, noLabel.join(" "));
}

{
  /**
   * **고르는 자리마다 여섯 칸이 전부 선다**(규격 §1).
   *
   * 자리마다 여섯 줄을 베껴 두지 않고 Catalog 가 기본값을 든다. 그래도
   * 자리마다 값이 전부 나오는지는 여기서 센다: 베끼지 않기로 한 것과
   * 값이 없는 것은 다른 일이다.
   */
  const missing: string[] = [];
  for (const u of unis) {
    for (const r of allLeaves(u)) {
      const p = provenanceOf(r.catalog, r.leaf);
      const gaps: string[] = [];
      if (!p.catalog_year) gaps.push("catalog_year");
      if (!p.effective_from) gaps.push("effective_from");
      if (p.effective_to === undefined) gaps.push("effective_to");
      if (p.source_url === undefined) gaps.push("source_url");
      if (p.verified_at === undefined) gaps.push("verified_at");
      if (!p.status) gaps.push("status");
      if (gaps.length) missing.push(`${r.leaf.code}: ${gaps.join(",")}`);
    }
  }
  const n = unis.reduce((a, u) => a + allLeaves(u).length, 0);
  ok(`고르는 자리마다 학년도와 유효기간과 출처가 선다 — 자리 ${n}개`,
    !missing.length, missing.slice(0, 6).join(" · "));
}


/* ── ②-2 기본 Catalog 가 날짜로 넘어가지 않는가 ───────────────── */

{
  /**
   * **기본값을 날짜가 정하면 학년도가 바뀌는 날 저절로 넘어간다**
   * (규격 작업 2). 그날 재학생이 자기 학과가 없는 목록을 보고, 이 학교가
   * 들어 있지 않은 줄로 읽는다. 재학생과 신입생은 **같은 날 둘 다 재학
   * 중**이라 하나의 `ACTIVE` 로 가를 수 없다.
   */
  const many: string[] = [];
  const none: string[] = [];
  for (const u of unis) {
    const n = catalogsOf(u).filter((c) => c.default_for_unknown).length;
    if (n > 1) many.push(u.university_code);
    if (n === 0) none.push(u.university_code);
  }
  ok("학교마다 기본 Catalog 가 하나다", !many.length && !none.length,
    [...many, ...none].join(" "));

  /* 고르는 코드가 시계를 읽지 않는다. 읽기 시작하면 위의 한 칸이 있으나
     마나가 된다 */
  const lib = body(read("src/lib/campus/registry.ts"));
  const at = lib.indexOf("export function defaultCatalog");
  const fn = at < 0 ? "" : lib.slice(at, lib.indexOf("\n}", at));
  ok("기본 Catalog 를 고르는 자리가 시계를 읽지 않는다",
    Boolean(fn) && !/new Date|Date\.now|catalogStatusAt/.test(fn), fn.slice(0, 80));

  /* 유효기간이 지나도 기본값이 그대로인가. **적어 둔 상태와 따로 간다** */
  for (const u of unis) {
    const before = defaultCatalog(u).catalog_code;
    const later = catalogsOf(u)
      .map((c) => catalogStatusAt(c, new Date("2030-06-01")));
    ok(`해가 바뀌어도 기본 Catalog 가 그대로다 — ${u.university_code}`,
      defaultCatalog(u).catalog_code === before
      && later.every((x) => x === "ACTIVE" || x === "RETIRED"),
      later.join(" "));
  }
}

/* ── ②-3 학생 유형마다 맞는 Catalog 를 고르는가 ───────────────── */

{
  /**
   * 다섯 벌을 세운다(규격 작업 2). **날짜를 넘기지 않는다**: 고르는 식이
   * 시계를 읽지 않으므로 같은 사람은 어느 날 열어도 같은 목록을 본다.
   */
  const u = unis.find((x) => catalogsOf(x).length >= 2);
  if (u) {
    const cur = defaultCatalog(u).catalog_code;
    const next = catalogsOf(u)
      .filter((c) => c.catalog_code !== cur)
      .sort((a, b) => a.catalog_year - b.catalog_year)[0];
    const people: { who: string; hint: Parameters<typeof resolveCatalog>[1];
      want: string }[] = [
      { who: "현재 재학생", hint: { admissionYear: defaultCatalog(u).catalog_year },
        want: cur },
      { who: "다음 학년도 입학 예정자",
        hint: { admissionYear: next.catalog_year }, want: next.catalog_code },
      { who: "다음 학년도 신입생",
        hint: { admissionYear: next.catalog_year }, want: next.catalog_code },
      { who: "편입생(앞 학년도 편제로 들어옴)",
        hint: { admissionYear: defaultCatalog(u).catalog_year - 1 }, want: cur },
      { who: "소속 정보가 불완전한 학생", hint: {}, want: cur },
      { who: "스스로 고쳐 고른 학생",
        hint: { year: next.catalog_year }, want: next.catalog_code },
    ];
    for (const p of people) {
      const got = resolveCatalog(u, p.hint).catalog_code;
      ok(`맞는 편제를 받는다 — ${p.who} → ${got}`, got === p.want,
        `${got} ≠ ${p.want}`);
    }
    /* 고쳐 고른 것이 끌어낸 값을 이긴다 */
    const both = resolveCatalog(u,
      { year: next.catalog_year, admissionYear: defaultCatalog(u).catalog_year });
    ok("스스로 고친 것이 끌어낸 값을 이긴다",
      both.catalog_code === next.catalog_code, both.catalog_code);
    /* 등록부에 없는 해는 **버린다**. 주소를 고쳐도 없는 편제가 서지 않는다 */
    ok("등록부에 없는 해는 기본 편제로 간다",
      resolveCatalog(u, { year: 1999 }).catalog_code === cur);
  }

  /* 학년도가 3월에 바뀐다 */
  ok("2월에 적힌 줄은 앞 학년도다",
    academicYear(new Date("2027-02-28")) === 2026
    && academicYear(new Date("2027-03-01")) === 2027);
  /* **`grade_year` 는 학년이고 입학년도가 아니다.** 끌어내는 식을 그대로 센다 */
  ok("올해 적힌 1학년은 올해 입학으로 읽는다", admissionFrom(1, 2027, 2027) === 2027);
  ok("올해 적힌 3학년은 두 해 전 입학으로 읽는다", admissionFrom(3, 2027, 2027) === 2025);
  ok("지난 학년도에 적힌 학년은 쓰지 않는다", admissionFrom(1, 2026, 2029) === null);
  ok("학년이 비어 있으면 쓰지 않는다",
    admissionFrom(null, 2027, 2027) === null && admissionFrom(0, 2027, 2027) === null);
}

/* ── ③ Catalog 가 섞이지 않는가 ───────────────────────────────── */

{
  /**
   * **코드 앞머리가 Catalog 를 가른다**(규격 §1 · 계약의 `code_note`).
   *
   * 응시 줄에 적히는 것은 `department_code` 하나이고, 그 코드로 어느 해
   * 구조의 자리인지가 나와야 **DB 에 Catalog 칸을 더하지 않아도 된다.**
   * 앞머리가 Catalog 사이에 겹치면 그 되읽기가 깨진다.
   */
  const shared: string[] = [];
  for (const u of unis) {
    const seen = new Map<string, string>();
    for (const cat of catalogsOf(u)) {
      for (const r of leavesOf(cat)) {
        const pre = r.leaf.code.split("_")[0];
        const was = seen.get(pre);
        if (was && was !== cat.catalog_code) {
          shared.push(`${pre}: ${was} · ${cat.catalog_code}`);
        }
        seen.set(pre, cat.catalog_code);
      }
    }
  }
  ok("코드 앞머리가 Catalog 사이에 겹치지 않는다", !shared.length,
    [...new Set(shared)].join(" "));
}

{
  /**
   * **이어받음이 닿는가**(규격 §5).
   *
   * 학과 이름이 개편돼도 같은 Canonical Core 를 다시 쓴다. 어느 자리가
   * 어느 자리를 이어받았는지가 적혀 있어야 앞 학번과 뒤 학번의 결과를
   * 한 자 위에 놓을 수 있고, 그 줄이 끊기면 그 연결을 아무도 모른다.
   */
  const dangling: string[] = [];
  const wrongWay: string[] = [];
  const noteless: string[] = [];
  for (const u of unis) {
    for (const r of allLeaves(u)) {
      const want = r.leaf.replaces ?? [];
      const got = replacesOf(u, r.leaf);
      if (got.length !== want.length) {
        dangling.push(`${r.leaf.code}: ${want.filter((c) =>
          !got.some((g) => g.leaf.code === c)).join(" ")}`);
      }
      for (const g of got) {
        /* 이어받는 쪽이 더 늦은 해여야 한다 */
        if (g.catalog.catalog_year >= r.catalog.catalog_year) {
          wrongWay.push(`${r.leaf.code}←${g.leaf.code}`);
        }
        /* **Core 가 갈리면 까닭이 적혀 있어야 한다.** 이름이 바뀌었다고
           자를 새로 만들면 앞 학번과 뒤 학번을 견줄 수 없다 */
        if ((g.leaf.core_code ?? null) !== (r.leaf.core_code ?? null)
          && !r.leaf.note?.trim()) {
          noteless.push(`${r.leaf.code}←${g.leaf.code}`);
        }
      }
    }
  }
  ok("이어받는다고 적은 자리가 등록부에 있다", !dangling.length, dangling.join(" · "));
  ok("이어받는 쪽이 더 늦은 학년도다", !wrongWay.length, wrongWay.join(" "));
  ok("Core 가 갈리는 이어받음에 까닭이 적혀 있다", !noteless.length,
    noteless.join(" "));
}


/* ── ③-2 코드가 뜻을 바꾸지 않는가 ───────────────────────────── */

{
  /**
   * **한 번 쓴 코드가 다른 학과를 가리키면 안 된다**(규격 작업 2).
   *
   * 그렇게 두면 그 코드로 적힌 지난 응시 줄이 조용히 남의 학과 줄이
   * 되고, 담당자 화면과 집계가 **틀린 이름으로 맞게 생긴 숫자**를 낸다.
   * 그래서 뜻이 바뀌면 새 코드를 만들고 옛 코드는 내린다.
   */
  const reused: string[] = [];
  const thin: string[] = [];
  for (const u of unis) {
    const live = new Set(codesOf(u));
    for (const r of u.retired_codes ?? []) {
      if (live.has(r.code)) reused.push(`${u.university_code}:${r.code}`);
      if (!r.was?.trim() || !r.why?.trim() || !r.was_year) thin.push(r.code);
      /* 내린 코드를 다시 찾으면 자리가 아니라 **내린 기록**이 나와야 한다 */
      if (findLeafSafe(u, r.code)) reused.push(`${u.university_code}:${r.code}`);
      if (!retiredCodeOf(u, r.code)) thin.push(r.code);
    }
  }
  const n = unis.reduce((a, u) => a + (u.retired_codes?.length ?? 0), 0);
  ok(`내린 코드가 다시 서지 않는다 — 내린 코드 ${n}개`, !reused.length,
    [...new Set(reused)].join(" "));
  ok("내린 코드마다 무엇이었고 왜 내렸는지 적혀 있다", !thin.length,
    [...new Set(thin)].join(" "));
}

{
  /**
   * **공식 편제에 적혔다고 전부 고르는 자리가 되지 않는다**(규격 작업 1).
   *
   * 교육 지원 조직과 교양 조직을 응시 목록에 넣으면, 학생이 전공이 아닌
   * 것을 자기 전공으로 고른다. 뺀 자리는 **까닭과 함께** 적어 둔다.
   */
  for (const u of unis) {
    const out = u.excluded_units ?? [];
    ok(`뺀 조직에 까닭이 적혀 있다 — ${u.university_code} ${out.length}개`,
      out.length > 0 && out.every((x) => x.name?.trim() && x.why?.trim()),
      out.filter((x) => !x.why?.trim()).map((x) => x.name).join(" "));
    const names = new Set(allLeaves(u).map((r) => r.leaf.name));
    const slipped = out.filter((x) => names.has(x.name)).map((x) => x.name);
    ok("뺀 조직이 고르는 자리에 서지 않는다", !slipped.length, slipped.join(" "));
  }

  /* 대상이 다른 자리는 **표시해 두고 빼지 않는다**: 빼면 그 학부 학생이
     자기 전공을 찾지 못한다 */
  const tagged: Record<string, number> = {};
  for (const u of unis) {
    for (const r of allLeaves(u)) {
      const a = r.leaf.audience ?? r.unit.audience;
      if (a) tagged[a] = (tagged[a] ?? 0) + 1;
    }
  }
  ok(`대상이 다른 자리에 표시가 붙어 있다 — ${
    Object.entries(tagged).map(([k, v]) => `${k} ${v}`).join(" · ") || "0"}`,
    Object.keys(tagged).length > 0);
}

/* ── ④ 매핑이 실제로 닿는가 ────────────────────────────────────── */

{
  const missCore: string[] = [];
  const missSpec: string[] = [];
  const bothWays: string[] = [];
  const routed: string[] = [];
  for (const u of unis) {
    for (const { leaf } of allLeaves(u)) {
      /* 전공을 고르는 자리는 Core 를 들지 않는다(규격 §2) */
      if (leaf.routing_only && leaf.core_code) routed.push(leaf.code);
      /* 갈래가 적혔는데 `아직 필요하다` 도 함께 적힌 자리는 뜻이 둘이다 */
      if (leaf.specialization && leaf.specialization_required) {
        bothWays.push(leaf.code);
      }
      if (!leaf.core_code) continue;
      const core = cores.find((c) => c.code === leaf.core_code);
      if (!core) { missCore.push(`${leaf.code}→${leaf.core_code}`); continue; }
      if (!leaf.specialization) continue;
      if (!core.specializations?.some((s) => s.code === leaf.specialization)) {
        missSpec.push(`${leaf.code}→${leaf.specialization}`);
      }
    }
  }
  /* **적어 둔 Core 가 등록부에 없으면 그 학과는 빈 검사를 연다** */
  ok("적어 둔 Major Core 가 등록부에 있다", !missCore.length, missCore.join(" "));
  ok("적어 둔 갈래가 그 Core 의 갈래 목록에 있다", !missSpec.length, missSpec.join(" "));
  ok("갈래를 적은 자리에 `갈래 필요` 가 같이 적혀 있지 않다", !bothWays.length,
    bothWays.join(" "));
  ok("전공을 고르는 자리가 Core 를 들지 않는다", !routed.length, routed.join(" "));

  const states = new Set<string>();
  for (const u of unis) for (const { leaf } of allLeaves(u)) {
    states.add(mappingStatusOf(leaf));
  }
  ok("매핑 단계가 셋뿐이다",
    [...states].every((s) =>
      ["EXACT", "SPECIALIZATION_REQUIRED", "CORE_REQUIRED"].includes(s)),
    [...states].join(" "));
}

/* ── ⑤ 상태가 둘뿐인가 ─────────────────────────────────────────── */

{
  const states = new Set<string>();
  const wrong: string[] = [];
  for (const u of unis) {
    for (const r of allLeaves(u)) {
      const st = statusOf(u, r);
      states.add(st);
      /* `EXACT` 가 아닌 자리는 열리지 않는다. 매핑이 섰다는 것과 문항이
         써졌다는 것은 다른 일이고, 앞엣것만 보고 열면 빈 검사가 열린다 */
      if (st === "READY" && mappingStatusOf(r.leaf) !== "EXACT") wrong.push(r.leaf.code);
      if (st === "READY" && !visible(r.leaf)) wrong.push(r.leaf.code);
      /* 끝난 구조의 자리는 고를 사람이 없다 */
      if (st === "READY" && provenanceOf(r.catalog, r.leaf).status === "RETIRED") {
        wrong.push(r.leaf.code);
      }
    }
  }
  ok("상태가 `READY` 와 `PREPARING` 둘뿐이다",
    [...states].every((s) => s === "READY" || s === "PREPARING"),
    [...states].join(" "));
  ok("매핑이 덜 선 자리와 감춘 자리와 끝난 구조는 열리지 않는다", !wrong.length,
    wrong.join(" "));

  /* **안쪽 단계를 학생 화면에 적지 않는다**(규격 §7) */
  /* **값을 센다. 칸 이름은 세지 않는다.** `c.catalog_code` 는 React 의
     열쇠로 쓰이는 식별자이고 화면에 그려지는 글자가 아니다. 식별자까지
     세면 멀쩡한 화면이 걸리고, 거짓 경보를 내는 검사는 그 다음부터
     아무도 안 본다 */
  const inner = ["EXACT", "SPECIALIZATION_REQUIRED", "CORE_REQUIRED",
    "FOUNDATION", "READY_FOR_REVIEW", "VALIDATED",
    "ACTIVE", "FUTURE", "RETIRED", "OFFICIAL_PAGE_UNREACHABLE",
    "OWNER_DICTATED"];
  const leak = TSX.filter((f) => inner.some((w) => body(read(f)).includes(w)));
  ok("안쪽 매핑 단계와 Catalog 상태가 화면에 0건", !leak.length, leak.join(" "));

  /* Catalog 코드를 글자로 적어 둔 자리도 센다. 적어 두면 그대로 화면에
     서거나, 학교를 하나 더 붙이는 날 그 글자가 남는다 */
  const catCodes = unis.flatMap((u) => catalogsOf(u).map((c) => c.catalog_code));
  const hard: string[] = [];
  for (const f of TSX) {
    const src = body(read(f));
    for (const c of catCodes) if (src.includes(`"${c}"`)) hard.push(`${f}: ${c}`);
  }
  ok(`Catalog 코드를 화면에 적어 두지 않았다 — 코드 ${catCodes.length}개`,
    !hard.length, hard.join(" · "));
}


/* ── ⑤-2 어디까지 왔는가를 넷으로 가른다 ──────────────────────── */

{
  /**
   * **등록과 응시 가능을 한 칸에 담지 않는다**(규격 작업 3). 담으면
   * `등록했다` 가 `검사가 된다` 로 읽히고, 그 읽기를 믿은 학생이 빈
   * 검사를 만난다.
   *
   * 세는 것은 **열린 자리와 결과지까지 서는 자리가 같은 자리인가**다.
   * 한 방향씩 보면 둘 다 놓친다: 열렸는데 Core 파일이 모자란 자리는
   * **응시는 되고 결과가 안 나오고**, 파일은 다 섰는데 열린 자리는
   * **아직 쓰지 말라고 적어 둔 Core 를 학생이 받는다.**
   */
  const wrong: string[] = [];
  const tally: Record<string, number> = {};
  for (const u of unis) {
    for (const r of allLeaves(u)) {
      const st = readinessOf(u, r);
      tally[st] = (tally[st] ?? 0) + 1;
      const ready = statusOf(u, r) === "READY";
      if (ready !== (st === "RESULT_READY")) wrong.push(`${r.leaf.code}:${st}`);
      /* Core 가 없는 자리가 응시 가능으로 서면 그 학생이 빈 검사를 만난다 */
      if (st === "CATALOG_ONLY" && ready) wrong.push(`${r.leaf.code}:CORE 없음`);
    }
  }
  ok(`준비 상태와 학생 표시가 어긋나지 않는다 — ${
    Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(" · ")}`,
    !wrong.length, wrong.slice(0, 5).join(" "));

  /**
   * **아직 열지 않은 Core 를 가리키는 자리가 학생에게 서지 않는다.**
   *
   * 짓고 있는 Core 는 `status: "building"` 인 동안에도 `open_to_students`
   * 가 `false` 다. 그 둘을 한 칸으로 두면 문항을 쓰는 중에 그 학과 학생이
   * 빈 검사를 만난다. 막는 자리는 `sellableCores` 하나이고, 여기서는
   * **그 함수를 지나지 않는 길이 없는지**를 자리마다 센다.
   */
  const leaked: string[] = [];
  const closed: string[] = [];
  for (const u of unis) {
    for (const r of allLeaves(u)) {
      const c = coreOf(r.leaf);
      if (!c || c.open_to_students !== false) continue;
      closed.push(r.leaf.code);
      if (statusOf(u, r) === "READY") leaked.push(`${r.leaf.code}:${c.code}`);
    }
  }
  ok(`열지 않은 Core 의 자리가 검사 가능으로 서지 않는다 — 닫아 둔 자리 ${closed.length}`,
    !leaked.length, leaked.join(" "));

  /**
   * **이름이 비슷하다는 까닭만으로 다른 전공의 자를 붙이지 않는다**
   * (규격 작업 3). `확인 전` 이 적힌 자리는 Core 를 들지 않는다.
   */
  const guessed: string[] = [];
  for (const u of unis) {
    for (const { leaf } of allLeaves(u)) {
      if (leaf.core_code && /확인 전|확인하지 못|후보/.test(leaf.note ?? "")) {
        guessed.push(leaf.code);
      }
    }
  }
  ok("확인 전이라고 적은 자리가 Core 를 들지 않는다", !guessed.length,
    guessed.join(" "));
}

/* ── ⑥ 학과 이름이 코드에 없는가 ───────────────────────────────── */

{
  const names = new Set<string>();
  for (const u of unis) {
    names.add(u.university_name);
    names.add(u.university_code);
    for (const cat of catalogsOf(u)) {
      for (const c of cat.colleges) {
        names.add(c.name);
        for (const x of c.units) {
          names.add(x.name);
          for (const m of x.majors ?? []) names.add(m.name);
        }
      }
    }
  }
  const found: string[] = [];
  for (const f of TSX) {
    const src = body(read(f));
    for (const n of names) if (src.includes(n)) found.push(`${f}: ${n}`);
  }
  /* **route 나 component 에 학과 이름을 적지 않는다**(규격 §7) */
  ok(`학교·단과대학·학부·전공 이름이 화면에 0건 — 이름 ${names.size}개`,
    !found.length, found.join(" · "));

  /* Catalog 이름도 같은 규칙이다. `현재 재학생` 을 화면에 박아 두면 학교를
     하나 더 붙이는 날 그 글자가 남는다 */
  const labels = new Set(unis.flatMap((u) =>
    catalogsOf(u).map((c) => c.label)));
  const inCode: string[] = [];
  for (const f of TSX) {
    const src = body(read(f));
    for (const n of labels) if (src.includes(n)) inCode.push(`${f}: ${n}`);
  }
  ok(`Catalog 이름이 화면에 0건 — 이름 ${labels.size}개`, !inCode.length,
    inCode.join(" · "));
}

{
  /* **쓰는 이름이 CSS 에 있는지 본다.** 이 저장소에서 같은 탈이 여덟 번
     났다. CSS 는 모르는 class 를 조용히 넘기고, 그러면 쪽은 200 으로
     멀쩡히 뜨고 생김새만 없다 */
  const css = read("src/app/me/platform.css") + read("src/app/campus/campus.css");
  const used = new Set<string>();
  for (const f of TSX) {
    for (const m of read(f).matchAll(/\bcm-[a-z0-9-]+/g)) used.add(m[0]);
  }
  const miss = [...used].sort()
    .filter((n) => !new RegExp(`\\.${n}\\b`).test(css));
  ok(`쓰는 class 이름이 CSS 에 있다 — 이름 ${used.size}개`, !miss.length,
    miss.map((n) => `.${n}`).join(" "));

  const mine = [...read("src/app/campus/campus.css")
    .matchAll(/\.(cm-cmp-[a-z0-9-]+|cm-cmp)\b/g)].map((m) => m[1]);
  const plat = read("src/app/me/platform.css");
  const clash = [...new Set(mine)]
    .filter((n) => new RegExp(`\\.${n}\\b`).test(plat));
  ok("새로 지은 이름이 작업공간 CSS 와 겹치지 않는다", !clash.length,
    clash.join(" "));
}

/* ── ⑦ 경계가 지켜지는가 ───────────────────────────────────────── */

{
  /**
   * **학교 맥락이 채점에 들어가지 않는다**(규격 §12).
   *
   * 문서에 적어 두는 것으로는 지켜지지 않는다. 채점과 결과 모듈에 그
   * 이름이 있는지 센다(계열 값이 채점에 안 들어가는 것을 검사로 막은
   * 것과 같다).
   */
  const cols = ["university_code", "college_code", "department_code",
    "specialization_code", "catalog_year", "catalog_code"];
  const files = [
    "src/lib/me-v3/scoring/engine.ts", "src/lib/me-v3/scoring/zone.ts",
    "src/lib/me-v3/scoring/axis.ts", "src/lib/me-v3/scoring/ownership.ts",
    "src/lib/me-v3/scoring/quality.ts", "src/lib/me-v3/scoring/normalize.ts",
    "src/lib/me-v3/result/model.ts", "src/lib/me-v3/result/build.ts",
  ];
  const leak: string[] = [];
  for (const f of files) {
    const src = body(read(f));
    for (const c of cols) if (src.includes(c)) leak.push(`${f}: ${c}`);
  }
  ok("채점과 결과 모듈에 학교 맥락과 Catalog 칸이 0건", !leak.length,
    leak.join(" · "));

  /**
   * **갈래가 채점을 복제하지 않는다**(규격 §7 전 회차).
   *
   * 갈래가 조정하는 것은 다섯 층뿐이다. 채점 모듈이 갈래 코드를 읽기
   * 시작하면 같은 Core 안에서 자가 갈리고, 그 순간 두 전공 학생의 결과를
   * 견줄 수 없다.
   */
  const specs = cores.flatMap((c) => (c.specializations ?? []).map((s) => s.code));
  const specLeak: string[] = [];
  for (const f of files) {
    const src = body(read(f));
    for (const s of specs) if (src.includes(s)) specLeak.push(`${f}: ${s}`);
  }
  ok(`채점과 결과 모듈에 갈래 코드가 0건 — 갈래 ${specs.length}개`,
    !specLeak.length, specLeak.join(" · "));

  const contract = coreRegistry().specialization_contract;
  ok("갈래가 무엇을 조정하고 무엇을 건드리지 않는지 적혀 있다",
    Boolean(contract?.adjusts?.length && contract?.never?.length));

  /* 반대 방향도 센다. 학교 쪽 화면이 채점을 직접 부르면 **같은 판단을
     UI 를 위해 새로 만드는 길**이 열린다 */
  const banned = ["me-v3/scoring/engine", "me-v3/scoring/zone",
    "me-v3/scoring/axis"];
  const calls: string[] = [];
  for (const f of TSX) {
    const src = body(read(f));
    for (const b of banned) if (src.includes(b)) calls.push(`${f}: ${b}`);
  }
  ok("학교 화면이 채점 모듈을 들여오지 않는다", !calls.length, calls.join(" · "));
}

{
  /**
   * **고른 자리를 서버가 등록부와 맞춰 본다**(규격 §11 전 회차).
   *
   * 폼이나 쿠키가 보낸 Core 와 단과대학을 그대로 적으면, 코드를 고쳐
   * 남의 학교 맥락을 자기 응시에 적을 수 있다. 그래서 폼이 보내는 것은
   * 학교와 자리 코드 둘뿐이고 나머지는 서버가 등록부에서 읽는다.
   *
   * **Catalog 도 폼이 보내지 않는다**: 코드 앞머리가 들고 있다.
   */
  const act = body(read("src/app/campus/actions.ts"));
  const ent = body(read("src/lib/campus/entry.ts"));
  /* **함수마다 따로 센다.** 파일 전체에서 세면 자리를 하나 더 두는 날
     멀쩡한 코드가 걸리고, 거짓 경보를 내는 검사는 그 다음부터 아무도 안
     본다. 재는 것은 `그 폼이 보내는 칸이 몇인가` 다 */
  const bodyOf = (name: string): string => {
    const at = act.indexOf(`function ${name}(`);
    if (at < 0) return "";
    const next = act.slice(at + 1).search(/\nexport async function /);
    return next < 0 ? act.slice(at) : act.slice(at, at + 1 + next);
  };
  const keysOf = (name: string) =>
    [...bodyOf(name).matchAll(/form\.get\("([^"]+)"\)/g)].map((m) => m[1]);
  const startKeys = keysOf("startFromCampus");
  ok(`검사 시작 폼이 보내는 칸이 둘뿐이다 — ${startKeys.join(" ")}`,
    startKeys.length === 2 && startKeys.includes("u") && startKeys.includes("d"),
    startKeys.join(" "));
  /* 학년도를 고쳐 고르는 폼도 둘뿐이다. **Catalog 코드를 보내지 않는다**:
     보내게 두면 등록부에 없는 자리를 가리키는 길이 생긴다 */
  const swapKeys = keysOf("rememberCatalog");
  ok(`학년도 정정 폼이 보내는 칸이 둘뿐이다 — ${swapKeys.join(" ")}`,
    swapKeys.length === 2 && swapKeys.includes("u") && swapKeys.includes("y"),
    swapKeys.join(" "));
  ok("학년도 정정이 등록부로 해를 맞춰 본다",
    bodyOf("rememberCatalog").includes("catalogByYear"));
  ok("시작 처리가 등록부로 자리를 맞춰 본다",
    act.includes("findLeaf") && act.includes("statusOf"));
  ok("쿠키를 읽을 때 등록부로 다시 맞춰 본다",
    ent.includes("findLeaf") && ent.includes("statusOf")
    && ent.includes("contextOf"));
  /* 쿠키에 Core 를 담으면 그 값을 고쳐 다른 전공으로 들어갈 수 있다 */
  ok("쿠키가 Core 를 담지 않는다", !/core_code/.test(
    ent.slice(ent.indexOf("setCampusEntry"), ent.indexOf("clearCampusEntry"))));
}

{
  /**
   * **일반 B2C 흐름과 섞지 않는다**(규격 §1 · §14 전 회차).
   */
  const b2c = ["/pricing", "/product", "/checkout", "/free", "/redeem", "/sample"];
  const found: string[] = [];
  for (const f of TSX) {
    const src = body(read(f));
    for (const r of b2c) if (src.includes(`"${r}`)) found.push(`${f}: ${r}`);
  }
  ok("학교 화면이 가격표와 결제를 가리키지 않는다", !found.length, found.join(" · "));

  /* **학교 로고를 그려 넣지 않는다**(규격 §4 전 회차) */
  const noAsset = unis.filter((u) => !u.brand_asset).map((u) => u.university_code);
  const drawn = TSX.filter((f) => /<svg|<img|<path/.test(body(read(f))));
  ok(`학교 로고를 그려 넣지 않았다 — asset 없는 학교 ${noAsset.length}개`,
    !drawn.length, drawn.join(" "));
}

{
  /* **칸을 더했으면 올리는 차례에 적혀 있어야 한다** */
  const chain = JSON.parse(read("deploy/db-chain.json")) as
    { base: string[]; upgrade: string[] };
  ok("학교 맥락 칸이 올리는 차례에 적혀 있다",
    chain.upgrade.includes("db/schema_campus_entry.sql"));

  /* **Catalog 를 담는 칸을 DB 에 더하지 않았다**(규격 §1). 코드 앞머리가
     들고 있으므로 칸이 필요하지 않고, 칸을 더하면 올리는 일이 한 번 늘고
     이미 적힌 줄이 비어 있는 상태로 남는다 */
  const sql = read("db/schema_campus_entry.sql");
  ok("응시 표에 Catalog 칸을 더하지 않았다",
    !/catalog/i.test(sql),
    (sql.match(/.*catalog.*/i) ?? []).join(" "));

  /* **5명 규칙을 새로 적지 않는다** */
  const agg = read("src/lib/me-v3/campus.ts");
  const through = /by_college:\s*colleges\.map\(\(r\) => cell\(/.test(agg)
    && /by_department:\s*depts\.map\(\(r\) => cell\(/.test(agg);
  ok("단과대학과 학과 집계가 5명 규칙을 지난다", through);
}

{
  /**
   * **먼저 만들 것이 Core 로 적혀 있는가**(규격 §8).
   *
   * 학과 이름으로 적으면 현행과 2027 가운데 한쪽만 적히고, 그러면 같은
   * Core 를 다시 쓰는 다른 쪽 학과가 목록에서 빠진다.
   */
  for (const u of unis) {
    if (!u.wave1?.length) continue;
    const rows = wave1Of(u);
    const noCore = rows.filter((r) => !r.core).map((r) => r.core_code);
    ok(`먼저 만들 Core 가 전부 등록부에 있다 — ${u.university_code} ${rows.length}개`,
      !noCore.length, noCore.join(" "));
    const unused = rows.filter((r) => !r.leaves.length).map((r) => r.core_code);
    ok("먼저 만들 Core 를 가리키는 자리가 적어도 하나 있다", !unused.length,
      unused.join(" "));
    /* **Catalog 를 가로질러 같은 Core 를 다시 쓴다**(규격 §5). 한 Core 가
       한 Catalog 의 자리만 열면 개편 뒤 학생이 그 Core 를 못 쓴다 */
    const oneSided = rows.filter((r) =>
      r.leaves.length > 0
      && new Set(r.leaves.map((x) => x.catalog.catalog_code)).size
        < Math.min(2, catalogsOf(u).length))
      .map((r) => r.core_code);
    ok("먼저 만들 Core 가 두 Catalog 의 자리를 함께 연다", !oneSided.length,
      oneSided.join(" "));
  }
}

console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
for (const u of unis) {
  console.log(`  ${u.university_code} — Catalog ${catalogsOf(u).length}벌`);
  for (const cat of catalogsOf(u)) {
    const rows = leavesOf(cat);
    const n = (s: string) =>
      rows.filter((r) => mappingStatusOf(r.leaf) === s).length;
    const units = cat.colleges.reduce((a, c) => a + c.units.length, 0);
    const majors = rows.filter((r) => r.leaf.kind !== "department").length;
    const carried = rows.filter((r) => r.leaf.carried_over).length;
    console.log(`    ${cat.catalog_code} ${cat.catalog_year} ${cat.status}`
      + ` — 단과대학 ${cat.colleges.length} · 학부와 학과 ${units}`
      + ` · 전공과 트랙 ${majors} · 고르는 자리 ${rows.length}`
      + ` · 옮겨 적은 자리 ${carried}`);
    const r = (k: string) =>
      rows.filter((x) => readinessOf(u, x) === k).length;
    console.log(`      등록만 ${r("CATALOG_ONLY")}`
      + ` · Core 연결 ${r("CORE_LINKED")}`
      + ` · 응시 가능 ${r("ASSESSMENT_READY")}`
      + ` · 결과지까지 ${r("RESULT_READY")}`);
    console.log(`      EXACT ${n("EXACT")}`
      + ` · 갈래 작성 필요 ${n("SPECIALIZATION_REQUIRED")}`
      + ` · Core 제작 필요 ${n("CORE_REQUIRED")}`
      + ` — 검사 가능 ${rows.filter((r) => statusOf(u, r) === "READY").length}`);
  }
  for (const r of wave1Of(u)) {
    const by = r.leaves.map((x) =>
      `${x.catalog.catalog_year} ${x.leaf.name}`).join(" · ");
    console.log(`    Wave1 ${r.core_code} — ${r.leaves.length}자리 ${by}`);
  }
}
if (bad.length) process.exit(1);
