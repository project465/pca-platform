/**
 * 학교 전용 진입이 **전용 제품이 되지 않았는가.**
 *
 * `/campus/{학교}` 가 하는 일은 하나다: 학교 학과 이름에서 CareerMatri 의
 * Major Core 로 가는 길을 여는 것. 그 뒤는 전부 공통이다. 그래서 이 검사가
 * 묻는 것은 `화면이 예쁜가` 가 아니라 **그 경계가 지켜지는가**다.
 *
 * 세는 것 다섯 묶음.
 *
 *   ① 등록부가 성립하는가      코드 중복 0 · 빈 칸 0 · 주소에 쓸 수 있는 코드
 *   ② 매핑이 실제로 닿는가      Core 와 갈래가 등록부에 있다
 *   ③ 상태가 둘뿐인가          제안 매핑은 열리지 않고 안쪽 성숙도가 안 나간다
 *   ④ 학과 이름이 코드에 없는가  route 와 component 에 0건 · 쓰는 class 는 CSS 에 있다
 *   ⑤ 경계가 지켜지는가        채점에 안 들어가고 B2C 흐름과 섞이지 않는다
 *
 * **문구는 여기서 세지 않는다.** AI 티와 금지한 말은 `npm run v3:copy` 가
 * 세고, 그 목록에 학교 쪽 네 파일이 들어 있다. 같은 판정을 두 곳에서 하면
 * 어느 날 갈리고, 갈린 날 둘 다 못 믿는다.
 *
 *   npm run campus:check
 */
import { readFileSync } from "node:fs";
import { registry as coreRegistry } from "../src/lib/me-v3/core-registry";
import {
  campusRegistry, departmentsOf, statusOf,
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

console.log("학교 전용 진입 — 등록부와 경계\n");

const reg = campusRegistry();
const cores = coreRegistry().cores;
const unis = reg.universities;

/* ── ① 등록부가 성립하는가 ─────────────────────────────────────── */

ok("등록부가 학교를 적어도 하나 들고 있다", unis.length > 0);
ok("학교 코드가 겹치지 않는다",
  new Set(unis.map((u) => u.university_code)).size === unis.length);

{
  const dupCollege: string[] = [];
  const dupDept: string[] = [];
  const badCode: string[] = [];
  const blank: string[] = [];
  for (const u of unis) {
    const cs = u.colleges.map((c) => c.code);
    if (new Set(cs).size !== cs.length) dupCollege.push(u.university_code);
    const ds = departmentsOf(u).map((r) => r.dept.code);
    if (new Set(ds).size !== ds.length) dupDept.push(u.university_code);
    for (const d of ds) if (!/^[A-Z0-9_]+$/.test(d)) badCode.push(d);
    if (!u.university_name.trim() || !u.source.trim()) blank.push(u.university_code);
    for (const { college, dept } of departmentsOf(u)) {
      if (!college.name.trim()) blank.push(`${u.university_code}/${college.code}`);
      if (!dept.name.trim() || !dept.source.trim()) {
        blank.push(`${u.university_code}/${dept.code}`);
      }
    }
  }
  ok("한 학교 안에서 단과대학 코드가 겹치지 않는다", !dupCollege.length,
    dupCollege.join(" "));
  /* 학과 코드가 주소의 한 칸이다. 겹치면 **다른 학과가 같은 쪽을 연다** */
  ok("한 학교 안에서 학과 코드가 겹치지 않는다", !dupDept.length, dupDept.join(" "));
  ok("학과 코드를 주소에 그대로 쓸 수 있다", !badCode.length, badCode.join(" "));
  ok("이름과 출처에 빈 칸이 없다", !blank.length, blank.join(" "));
}

/* ── ② 매핑이 실제로 닿는가 ────────────────────────────────────── */

{
  const missCore: string[] = [];
  const missSpec: string[] = [];
  const badSrc: string[] = [];
  for (const u of unis) {
    for (const { dept } of departmentsOf(u)) {
      if (!["owner", "proposed"].includes(dept.mapping_source)) {
        badSrc.push(dept.code);
      }
      if (!dept.core_code) continue;
      const core = cores.find((c) => c.code === dept.core_code);
      if (!core) { missCore.push(`${dept.code}→${dept.core_code}`); continue; }
      if (!dept.specialization) continue;
      if (!core.specializations?.some((s) => s.code === dept.specialization)) {
        missSpec.push(`${dept.code}→${dept.specialization}`);
      }
    }
  }
  /* **적어 둔 Core 가 등록부에 없으면 그 학과는 빈 검사를 연다.** 지시문의
     줄임말(`EE_CORE` · `CS_SOFTWARE_CORE`)과 등록부의 정식 코드는 다르다 */
  ok("적어 둔 Major Core 가 등록부에 있다", !missCore.length, missCore.join(" "));
  ok("적어 둔 갈래가 그 Core 의 갈래 목록에 있다", !missSpec.length, missSpec.join(" "));
  ok("매핑 출처가 `owner` 나 `proposed` 다", !badSrc.length, badSrc.join(" "));
}

/* ── ③ 상태가 둘뿐인가 ─────────────────────────────────────────── */

{
  const states = new Set<string>();
  const wrong: string[] = [];
  for (const u of unis) {
    for (const { dept } of departmentsOf(u)) {
      const st = statusOf(u, dept);
      states.add(st);
      /* **제안 매핑은 Core 가 열려도 검사가 열리지 않는다.** 매핑이 틀리면
         그 학생이 남의 전공 사전을 읽고 그 결과는 되돌릴 수 없다 */
      if (dept.mapping_source === "proposed" && st === "READY") wrong.push(dept.code);
      if (!dept.core_code && st === "READY") wrong.push(dept.code);
    }
  }
  ok("상태가 `READY` 와 `PREPARING` 둘뿐이다",
    [...states].every((s) => s === "READY" || s === "PREPARING"),
    [...states].join(" "));
  ok("제안 매핑과 Core 가 없는 학과는 열리지 않는다", !wrong.length, wrong.join(" "));

  /* **안쪽 성숙도를 학생 화면에 적지 않는다**(규격 §6) */
  const inner = ["FOUNDATION", "READY_FOR_REVIEW", "VALIDATED"];
  const leak = TSX.filter((f) => inner.some((w) => body(read(f)).includes(w)));
  ok("안쪽 성숙도 글자가 화면에 0건", !leak.length, leak.join(" "));
}

/* ── ④ 학과 이름이 코드에 없는가 ───────────────────────────────── */

{
  const names = new Set<string>();
  for (const u of unis) {
    names.add(u.university_name);
    names.add(u.university_code);
    for (const c of u.colleges) names.add(c.name);
    for (const { dept } of departmentsOf(u)) names.add(dept.name);
  }
  const found: string[] = [];
  for (const f of TSX) {
    const src = body(read(f));
    for (const n of names) if (src.includes(n)) found.push(`${f}: ${n}`);
  }
  /* **route 나 component 에 학과 이름을 적지 않는다**(규격 §7). 적어 두면
     두 번째 학교를 붙이는 날 그 화면을 베끼게 되고, 베낀 화면 가운데
     하나는 반드시 뒤처진다 */
  ok("학교·단과대학·학과 이름과 학교 코드가 화면에 0건", !found.length,
    found.join(" · "));
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

  /* **새 이름이 이미 쓰이는 이름과 겹치지 않는다.** 겹치면 저쪽 규칙이
     조용히 끼어든다 */
  const mine = [...read("src/app/campus/campus.css")
    .matchAll(/\.(cm-cmp-[a-z0-9-]+|cm-cmp)\b/g)].map((m) => m[1]);
  const plat = read("src/app/me/platform.css");
  const clash = [...new Set(mine)]
    .filter((n) => new RegExp(`\\.${n}\\b`).test(plat));
  ok("새로 지은 이름이 작업공간 CSS 와 겹치지 않는다", !clash.length,
    clash.join(" "));
}

/* ── ⑤ 경계가 지켜지는가 ───────────────────────────────────────── */

{
  /**
   * **학교 맥락이 채점에 들어가지 않는다**(규격 §12).
   *
   * 문서에 적어 두는 것으로는 지켜지지 않는다. 채점과 결과 모듈에 그
   * 이름이 있는지 센다(계열 값이 채점에 안 들어가는 것을 검사로 막은
   * 것과 같다).
   */
  const cols = ["university_code", "college_code", "department_code",
    "specialization_code"];
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
  ok("채점과 결과 모듈에 학교 맥락 칸이 0건", !leak.length, leak.join(" · "));

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
   * **일반 B2C 흐름과 섞지 않는다**(규격 §1 · §14).
   *
   * 학교로 들어온 학생에게 가격표와 결제를 가리키면, 학교가 연 길이
   * 개인 판매 화면으로 끝난다.
   */
  const b2c = ["/pricing", "/product", "/checkout", "/free", "/redeem", "/sample"];
  const found: string[] = [];
  for (const f of TSX) {
    const src = body(read(f));
    for (const r of b2c) if (src.includes(`"${r}`)) found.push(`${f}: ${r}`);
  }
  ok("학교 화면이 가격표와 결제를 가리키지 않는다", !found.length, found.join(" · "));

  /* **학교 로고를 그려 넣지 않는다**(규격 §4). 정식 asset 이 없으면
     서는 것은 공식 CareerMatri 상표와 학교 이름 글자뿐이다 */
  const noAsset = unis.filter((u) => !u.brand_asset).map((u) => u.university_code);
  const drawn = TSX.filter((f) => /<svg|<img|<path/.test(body(read(f))));
  ok(`학교 로고를 그려 넣지 않았다 — asset 없는 학교 ${noAsset.length}개`,
    !drawn.length, drawn.join(" "));
}

{
  /* **칸을 더했으면 올리는 차례에 적혀 있어야 한다.** 이 저장소에서
     `career_profiles` 가 그 목록에서 빠져 운영에 선 적이 없었다 */
  const chain = JSON.parse(read("deploy/db-chain.json")) as
    { base: string[]; upgrade: string[] };
  ok("학교 맥락 칸이 올리는 차례에 적혀 있다",
    chain.upgrade.includes("db/schema_campus_entry.sql"));

  /* **5명 규칙을 새로 적지 않는다.** 단과대학과 학과 칸도 기존 `cell()` 을
     지나야 한다. 지나지 않으면 네 명짜리 학과에서 사람이 좁혀진다 */
  const agg = read("src/lib/me-v3/campus.ts");
  const through = /by_college:\s*colleges\.map\(\(r\) => cell\(/.test(agg)
    && /by_department:\s*depts\.map\(\(r\) => cell\(/.test(agg);
  ok("단과대학과 학과 집계가 5명 규칙을 지난다", through);
}

console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
{
  const ready = unis.flatMap((u) =>
    departmentsOf(u).filter((r) => statusOf(u, r.dept) === "READY"));
  const all = unis.flatMap((u) => departmentsOf(u));
  console.log(`  학교 ${unis.length}개 · 단과대학 `
    + `${unis.reduce((n, u) => n + u.colleges.length, 0)}개 · 학과 ${all.length}개`
    + ` — 검사 가능 ${ready.length} · 준비 중 ${all.length - ready.length}`);
}
if (bad.length) process.exit(1);
