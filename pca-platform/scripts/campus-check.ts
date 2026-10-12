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
  allLeaves, campusRegistry, catalogStatusAt, catalogsOf, leavesOf,
  mappingStatusOf, provenanceOf, replacesOf, statusOf, visible, wave1Of,
  type CampusUnit, type CampusUniversity,
} from "../src/lib/campus/registry";

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
        || !["VERIFIED", "OFFICIAL_PAGE_UNREACHABLE", "OWNER_DICTATED"]
          .includes(c.verification)) badSrc.push(where);
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
  const formKeys = [...act.matchAll(/form\.get\("([^"]+)"\)/g)].map((m) => m[1]);
  ok(`폼이 보내는 칸이 둘뿐이다 — ${formKeys.join(" ")}`,
    formKeys.length === 2 && formKeys.includes("u") && formKeys.includes("d"),
    formKeys.join(" "));
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
