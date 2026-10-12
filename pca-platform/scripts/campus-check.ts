/**
 * 학교 전용 진입이 **전용 제품이 되지 않았는가.**
 *
 * `/campus/{학교}` 가 하는 일은 하나다: 학교 학과 이름에서 CareerMatri 의
 * Major Core 로 가는 길을 여는 것. 그 뒤는 전부 공통이다. 그래서 이 검사가
 * 묻는 것은 `화면이 예쁜가` 가 아니라 **그 경계가 지켜지는가**다.
 *
 * 세는 것 여섯 묶음.
 *
 *   ① 등록부가 성립하는가      코드 중복 0 · 빈 칸 0 · 주소에 쓸 수 있는 코드
 *   ② 어느 쪽의 어느 해인가     출처와 해와 확인 날짜가 적혀 있다
 *   ③ 매핑이 실제로 닿는가      Core 와 갈래가 등록부에 있고 단계가 셋뿐이다
 *   ④ 상태가 둘뿐인가          학생 화면에 안쪽 단계가 한 글자도 안 나간다
 *   ⑤ 학과 이름이 코드에 없는가  route 와 component 에 0건 · 쓰는 class 는 CSS 에 있다
 *   ⑥ 경계가 지켜지는가        채점에 안 들어가고 B2C 흐름과 섞이지 않는다
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
  campusRegistry, leavesOf, mappingStatusOf, statusOf, visible, wave1Of,
  type CampusUnit,
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
  const dupCode: string[] = [];
  const badCode: string[] = [];
  const blank: string[] = [];
  const badKind: string[] = [];
  for (const u of unis) {
    const cs = u.colleges.map((c) => c.code);
    if (new Set(cs).size !== cs.length) dupCollege.push(u.university_code);
    /* 학부 코드와 고르는 자리의 코드가 **한 이름 공간**이다: 겹치면
       주소 하나가 두 자리를 가리킨다 */
    const all = u.colleges.flatMap((c) =>
      c.units.flatMap((x) => [x.code, ...(x.majors ?? []).map((m) => m.code)]));
    const dups = all.filter((c, i) => all.indexOf(c) !== i);
    if (dups.length) dupCode.push(`${u.university_code}: ${dups.join(" ")}`);
    for (const c of all) if (!/^[A-Z0-9_]+$/.test(c)) badCode.push(c);
    if (!u.university_name.trim()) blank.push(u.university_code);
    for (const col of u.colleges) {
      if (!col.name.trim()) blank.push(`${u.university_code}/${col.code}`);
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
  ok("한 학교 안에서 단과대학 코드가 겹치지 않는다", !dupCollege.length,
    dupCollege.join(" "));
  ok("학부와 전공 코드가 한 학교 안에서 겹치지 않는다", !dupCode.length,
    dupCode.join(" "));
  ok("코드를 주소에 그대로 쓸 수 있다", !badCode.length, badCode.join(" "));
  ok("이름에 빈 칸이 없다", !blank.length, blank.join(" "));
  /* 학부 아래에 학부를 두지 않는다. 두면 고르는 자리가 어디인지 흐려진다 */
  ok("계층이 셋을 넘지 않는다 — 단과대학 · 학부와 학과 · 전공과 트랙",
    !badKind.length, badKind.join(" "));
}

/* ── ② 어느 쪽의 어느 해인가 ───────────────────────────────────── */

{
  const miss = unis.filter((u) =>
    !u.source_url?.startsWith("http") || !u.source_year
    || !["VERIFIED", "OFFICIAL_PAGE_UNREACHABLE", "OWNER_DICTATED"]
      .includes(u.verification));
  ok("학교마다 출처와 기준 연도와 확인 상태가 적혀 있다", !miss.length,
    miss.map((u) => u.university_code).join(" "));
  /* **확인하지 못한 것을 확인했다고 적지 않는다.** 날짜만 적어 두면 그
     줄이 언제 틀려졌는지 아무도 모른다 */
  const lying = unis.filter((u) =>
    u.verification === "VERIFIED" ? !u.verified_at : Boolean(u.verified_at));
  ok("확인 날짜와 확인 상태가 서로 맞는다", !lying.length,
    lying.map((u) => u.university_code).join(" "));
  const silent = unis.filter((u) =>
    u.verification !== "VERIFIED" && !u.verification_note?.trim());
  ok("확인하지 못한 까닭이 적혀 있다", !silent.length,
    silent.map((u) => u.university_code).join(" "));
}

/* ── ③ 매핑이 실제로 닿는가 ────────────────────────────────────── */

{
  const missCore: string[] = [];
  const missSpec: string[] = [];
  const bothWays: string[] = [];
  const routed: string[] = [];
  for (const u of unis) {
    for (const { leaf } of leavesOf(u)) {
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
  /* **적어 둔 Core 가 등록부에 없으면 그 학과는 빈 검사를 연다.** 지시문의
     줄임말(`EE_CORE` · `CS_SOFTWARE_CORE`)과 등록부의 정식 코드는 다르다 */
  ok("적어 둔 Major Core 가 등록부에 있다", !missCore.length, missCore.join(" "));
  ok("적어 둔 갈래가 그 Core 의 갈래 목록에 있다", !missSpec.length, missSpec.join(" "));
  ok("갈래를 적은 자리에 `갈래 필요` 가 같이 적혀 있지 않다", !bothWays.length,
    bothWays.join(" "));
  ok("전공을 고르는 자리가 Core 를 들지 않는다", !routed.length, routed.join(" "));

  const states = new Set<string>();
  for (const u of unis) for (const { leaf } of leavesOf(u)) {
    states.add(mappingStatusOf(leaf));
  }
  ok("매핑 단계가 셋뿐이다",
    [...states].every((s) =>
      ["EXACT", "SPECIALIZATION_REQUIRED", "CORE_REQUIRED"].includes(s)),
    [...states].join(" "));
}

/* ── ④ 상태가 둘뿐인가 ─────────────────────────────────────────── */

{
  const states = new Set<string>();
  const wrong: string[] = [];
  for (const u of unis) {
    for (const { leaf } of leavesOf(u)) {
      const st = statusOf(u, leaf);
      states.add(st);
      /* `EXACT` 가 아닌 자리는 열리지 않는다. 매핑이 섰다는 것과 문항이
         써졌다는 것은 다른 일이고, 앞엣것만 보고 열면 빈 검사가 열린다 */
      if (st === "READY" && mappingStatusOf(leaf) !== "EXACT") wrong.push(leaf.code);
      if (st === "READY" && !visible(leaf)) wrong.push(leaf.code);
    }
  }
  ok("상태가 `READY` 와 `PREPARING` 둘뿐이다",
    [...states].every((s) => s === "READY" || s === "PREPARING"),
    [...states].join(" "));
  ok("매핑이 덜 선 자리와 감춘 자리는 열리지 않는다", !wrong.length, wrong.join(" "));

  /* **안쪽 단계를 학생 화면에 적지 않는다**(규격 §5) */
  const inner = ["EXACT", "SPECIALIZATION_REQUIRED", "CORE_REQUIRED",
    "FOUNDATION", "READY_FOR_REVIEW", "VALIDATED"];
  const leak = TSX.filter((f) => inner.some((w) => body(read(f)).includes(w)));
  ok("안쪽 매핑 단계와 성숙도가 화면에 0건", !leak.length, leak.join(" "));
}

/* ── ⑤ 학과 이름이 코드에 없는가 ───────────────────────────────── */

{
  const names = new Set<string>();
  for (const u of unis) {
    names.add(u.university_name);
    names.add(u.university_code);
    for (const c of u.colleges) {
      names.add(c.name);
      for (const x of c.units) {
        names.add(x.name);
        for (const m of x.majors ?? []) names.add(m.name);
      }
    }
  }
  const found: string[] = [];
  for (const f of TSX) {
    const src = body(read(f));
    for (const n of names) if (src.includes(n)) found.push(`${f}: ${n}`);
  }
  /* **route 나 component 에 학과 이름을 적지 않는다**(규격 §7). 적어 두면
     두 번째 학교를 붙이는 날 그 화면을 베끼게 되고, 베낀 화면 가운데
     하나는 반드시 뒤처진다 */
  ok(`학교·단과대학·학부·전공 이름이 화면에 0건 — 이름 ${names.size}개`,
    !found.length, found.join(" · "));
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

/* ── ⑥ 경계가 지켜지는가 ───────────────────────────────────────── */

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

  /**
   * **갈래가 채점을 복제하지 않는다**(규격 §7).
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
   * **고른 자리를 서버가 등록부와 맞춰 본다**(규격 §11).
   *
   * 폼이나 쿠키가 보낸 Core 와 단과대학을 그대로 적으면, 코드를 고쳐
   * 남의 학교 맥락을 자기 응시에 적을 수 있다. 그래서 폼이 보내는 것은
   * 학교와 자리 코드 둘뿐이고 나머지는 서버가 등록부에서 읽는다.
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

  /* **먼저 만들 학과가 등록부에 실제로 있는가.** 코드를 바꾼 날 이
     목록만 남으면 아무도 모른다 */
  for (const u of unis) {
    if (!u.wave1?.length) continue;
    const found = wave1Of(u);
    ok(`먼저 만들 학과가 전부 등록부에 있다 — ${u.university_code} ${found.length}개`,
      found.length === u.wave1.length,
      u.wave1.filter((c) => !found.some((r) => r.leaf.code === c)).join(" "));
  }
}

console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
for (const u of unis) {
  const rows = leavesOf(u);
  const n = (s: string) => rows.filter((r) => mappingStatusOf(r.leaf) === s).length;
  const units = u.colleges.reduce((a, c) => a + c.units.length, 0);
  const majors = rows.filter((r) => r.leaf.kind !== "department").length;
  console.log(`  ${u.university_code} — 단과대학 ${u.colleges.length}`
    + ` · 학부와 학과 ${units} · 전공과 트랙 ${majors}`
    + ` · 고르는 자리 ${rows.length}`);
  console.log(`         EXACT ${n("EXACT")}`
    + ` · 갈래 작성 필요 ${n("SPECIALIZATION_REQUIRED")}`
    + ` · Core 제작 필요 ${n("CORE_REQUIRED")}`
    + ` — 검사 가능 ${rows.filter((r) => statusOf(u, r.leaf) === "READY").length}`);
}
if (bad.length) process.exit(1);
